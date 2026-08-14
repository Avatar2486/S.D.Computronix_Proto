/* S.D. Computronix — in-memory store, seed, business logic. Global: window.Store
   Real-world data (562 stores, 484 technicians, store-specific incentive slabs,
   zone/region hierarchy) is loaded from window.SDCData (js/data.js, generated
   from the ZOB Report + Payout Slab xlsx). A small set of "demo" employees/sites
   with rich seeded attendance/GPS trails is kept so the live map, camera clock-in
   and payroll demos stay lively. */
(function () {
  'use strict';

  const LS_KEY = 'sdc_hrms_v6';           // bumped: single Admin role, timed regularisation, bank-change limit
  const TODAY = new Date('2026-07-15T10:30:00+05:30'); // demo "today" (mid-month)
  const D = window.SDCData || { sites: [], employees: [], slabTemplates: [], zones: [], regions: [], businessManagers: [], clusterManagers: [], defaultSlabId: null, meta: {} };

  // ---------- utilities ----------
  const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 8);
  const iso = (d) => new Date(d).toISOString();
  const dateKey = (d) => new Date(d).toISOString().slice(0, 10);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  /* ---------- roles ----------
     There is one administrative role, `admin`, and any number of people can
     hold it — the old Super Admin / Admin split is gone. Records written by
     earlier builds still say 'super-admin', so every read path funnels through
     `canonicalRole` and the legacy value is upgraded on load. */
  const LEGACY_ROLE_MAP = { 'super-admin': 'admin' };
  const canonicalRole = (role) => LEGACY_ROLE_MAP[role] || role || 'field-employee';
  const isAdminRole = (role) => canonicalRole(role) === 'admin';

  /* ---------- action-layer permission guard ----------
     The UI hides buttons an actor may not press, but a hidden button is not
     enforcement — this is the one place every mutation that touches incentive
     rules, slabs or targets checks the ACTOR (not just what the caller passed
     in), so the same rule holds from a click, a keyboard shortcut or a direct
     console call. `can`/`roleOf` live in utils.jsx, which loads after this
     file; every real call happens after user interaction (i.e. after the
     whole page has loaded), so the lazy reference below resolves fine — it
     only needs a defensive fallback for the narrow window before that. */
  function actorAllowed(actor, action) {
    if (typeof can !== 'function') return true; // utils.jsx not yet loaded
    return can(actor, action);
  }
  function guarded(actor, action, fn) {
    if (!actorAllowed(actor, action)) return { error: `Not permitted to ${action}.` };
    return fn();
  }

  /* ---------- reference data ----------

     Two structurally different kinds of staff share one employee record:

       FIELD  — technicians and store managers posted to a client store. They
                clock in against a geo-fence, earn sales incentives, and their
                pay is pro-rated on attendance.
       OFFICE — HR, Admin and other desk staff. No geo-fence, no store, no
                sales incentive; fixed monthly pay.

     `employeeType` drives onboarding requirements, attendance rules and payroll,
     so it is set on every record (defaulting to 'field' for legacy rows). */
  const EMPLOYEE_TYPES = [
    { id: 'field',  label: 'Field / Store Employee', geoFenceDefault: true,  needsStore: true  },
    { id: 'office', label: 'Office / Desktop Employee', geoFenceDefault: false, needsStore: false },
  ];

  /* Career ladders, ordered lowest → highest. "Upgrade designation" walks a
     person up their own ladder; the UI also allows any designation to be picked
     outright for lateral moves. */
  const DESIGNATION_LADDERS = {
    field: ['Trainee Technician', 'Technician', 'Senior Technician', 'Team Lead', 'Area Manager', 'Business Manager'],
    office: ['Executive', 'Senior Executive', 'Assistant Manager', 'Manager', 'Senior Manager', 'Head of Department'],
  };
  const ALL_DESIGNATIONS = [...new Set([...DESIGNATION_LADDERS.field, ...DESIGNATION_LADDERS.office])];

  /* The employee lifecycle the UI renders as a progress rail. `stage` is derived
     from status + document/onboarding state rather than stored, so a record can
     never drift out of sync with the data that actually gates each step. */
  const LIFECYCLE_STAGES = [
    { id: 'new',        label: 'New Employee' },
    { id: 'registered', label: 'Registration' },
    { id: 'documents',  label: 'Documents' },
    { id: 'approval',   label: 'Approval' },
    { id: 'onboarding', label: 'Onboarding' },
    { id: 'active',     label: 'Active' },
  ];

  const REQUIRED_DOC_KEYS = ['aadhaar', 'pan', 'bank', 'photo'];

  const BLANK_ADDRESS = {
    line1: '', line2: '', line3: '', landmark: '',
    city: '', district: '', state: '', country: 'India', pincode: '',
  };

  /* Bank details are the one field a fraudster wants to change, so they are
     self-service only three times; after that the employee has to go to Admin,
     who can still edit the record directly. */
  const BANK_UPDATE_LIMIT = 3;

  /* Attendance corrections are rationed the way every HRMS rations them, so the
     feature cannot be used to paper over habitual absence. */
  const REG_MONTHLY_LIMIT = 3;

  /* A regularisation is either a time correction (the common case — the
     employee has the log, it is just wrong or missing) or a catch-all request
     for everything that is not a clock time. */
  const REG_TYPES = [
    { id: 'adjust', label: 'Add/update time entries to adjust attendance logs.',
      hint: 'Click a time stamp box you would like to adjust and change the time.' },
    { id: 'other', label: 'Others — raise a request that is not a time correction.',
      hint: 'On-duty, work from home, field visit or anything else that needs approval without changing a clock time.' },
  ];

  const DEFAULT_SHIFT = { start: '10:00', end: '19:00', name: 'General Shift' };

  /* Fill in every field the newer UI reads so a record seeded before those
     fields existed still renders. Called on seed and on load, which is what
     lets an older persisted state upgrade in place instead of being wiped. */
  function normaliseEmployee(e) {
    const role = canonicalRole(e.role);
    const isOffice = e.employeeType ? e.employeeType === 'office' : role !== 'field-employee';
    const type = e.employeeType || (isOffice ? 'office' : 'field');
    return {
      ...e,
      role,
      employeeType: type,
      // How many times the employee has changed their own bank details.
      bankUpdateCount: e.bankUpdateCount || 0,
      salaryHistory: e.salaryHistory || [],
      // Office staff sit at a desk — a geo-fence would only generate false alerts.
      geoFenceEnabled: e.geoFenceEnabled != null ? !!e.geoFenceEnabled : type === 'field',
      designation: e.designation || (type === 'office' ? 'Executive' : e.isStoreManager ? 'Team Lead' : 'Technician'),
      designationHistory: e.designationHistory || [],
      // 'approved' is the right default for everyone already active in the system.
      approvalStatus: e.approvalStatus || (e.status === 'pending' ? 'pending-approval' : e.status === 'rejected' ? 'rejected' : 'approved'),
      address: { ...BLANK_ADDRESS, ...(e.address || {}) },
      education: e.education || [],
      photoUrl: e.photoUrl || null,
    };
  }

  // ---------- seed ----------
  function seed() {
    // ----- demo sites (rich GPS/attendance) -----
    const demoSites = [
      { id: 'site_mum', code: 'DMUM', name: 'Croma – Juhu, Mumbai',        type: 'store',           lat: 19.108, lng: 72.826, radius: 150, shiftStart: '10:00', shiftEnd: '19:00', city: 'Mumbai',    region: 'Maharashtra', zone: 'West',  bm: 'Vishal Chandekar', cm: 'Reshma Shaikh', slabId: 'demo_slab_mum', demo: true },
      { id: 'site_del', code: 'DDEL', name: 'Croma – Connaught Place, Delhi', type: 'store',        lat: 28.632, lng: 77.219, radius: 150, shiftStart: '10:00', shiftEnd: '19:00', city: 'Delhi',     region: 'Delhi',       zone: 'North', bm: 'Amit Kumar',       cm: 'Rakesh Yadav',  slabId: 'demo_slab_del', demo: true },
      { id: 'site_blr', code: 'DBLR', name: 'Croma – MG Road, Bengaluru',  type: 'store',           lat: 12.975, lng: 77.606, radius: 150, shiftStart: '10:00', shiftEnd: '19:00', city: 'Bengaluru', region: 'Karnataka',   zone: 'South', bm: 'Suresh Rao',       cm: 'Kiran Kumar',   slabId: 'demo_slab_blr', demo: true },
      { id: 'site_pun', code: 'DPUN', name: 'SDC Service Centre – Pune',   type: 'service-centre',  lat: 18.520, lng: 73.856, radius: 120, shiftStart: '09:30', shiftEnd: '18:30', city: 'Pune',      region: 'Maharashtra', zone: 'West',  bm: 'Vishal Chandekar', cm: 'Deepak Punjabi', slabId: 'demo_slab_pun', demo: true },
    ];

    // ----- real sites from xlsx -----
    const realSites = (D.sites || []).map((s) => ({
      id: s.id, code: s.code, name: s.name, type: s.type,
      lat: s.lat, lng: s.lng, radius: s.radius, shiftStart: s.shiftStart, shiftEnd: s.shiftEnd,
      city: s.city, region: s.region, zone: s.zone, bm: s.bm, cm: s.cm,
      slabId: s.slabId, netValue: s.netValue,
    }));
    const sites = demoSites.concat(realSites);

    // ----- demo employees (kept for lively demo) -----
    const addr = (line1, city, district, state, pincode) => ({
      line1, line2: '', line3: '', landmark: '', city, district, state, country: 'India', pincode,
    });
    const demoEmployees = [
      { id: 'emp_001', code: 'SDC001', name: 'Rahul Verma',  phone: '+91 98200 11001', email: 'rahul.v@sdc.in',  role: 'field-employee', status: 'active',  siteId: 'site_mum', joiningDate: '2025-11-04', aadhaarMasked: 'XXXX-XXXX-4321', panMasked: 'ABXXX7845N', bankVerified: true, baseSalary: 18000, avatarHue: 210, travelEligible: true,  travelAmount: 2000, demo: true, designation: 'Senior Technician', address: addr('12 Sunrise Apartments, JVLR', 'Mumbai', 'Mumbai Suburban', 'Maharashtra', '400059') },
      { id: 'emp_002', code: 'SDC002', name: 'Priya Nair',   phone: '+91 98200 11002', email: 'priya.n@sdc.in',  role: 'field-employee', status: 'active',  siteId: 'site_mum', joiningDate: '2025-08-12', aadhaarMasked: 'XXXX-XXXX-7712', panMasked: 'CDXXX2210K', bankVerified: true, baseSalary: 16000, avatarHue: 340, travelEligible: false, travelAmount: 1500, demo: true, designation: 'Technician', address: addr('7B Green Meadows, Andheri West', 'Mumbai', 'Mumbai Suburban', 'Maharashtra', '400053') },
      { id: 'emp_003', code: 'SDC003', name: 'Amit Sharma',  phone: '+91 98110 22003', email: 'amit.s@sdc.in',   role: 'field-employee', status: 'active',  siteId: 'site_del', joiningDate: '2025-06-01', aadhaarMasked: 'XXXX-XXXX-9021', panMasked: 'EFXXX9083P', bankVerified: true, baseSalary: 15000, avatarHue: 25,  travelEligible: true,  travelAmount: 2500, demo: true, designation: 'Technician', address: addr('221 Karol Bagh', 'Delhi', 'Central Delhi', 'Delhi', '110005') },
      { id: 'emp_004', code: 'SDC004', name: 'Sneha Iyer',   phone: '+91 98400 33004', email: 'sneha.i@sdc.in',  role: 'field-employee', status: 'active',  siteId: 'site_blr', joiningDate: '2026-01-20', aadhaarMasked: 'XXXX-XXXX-5580', panMasked: 'GHXXX4432L', bankVerified: true, baseSalary: 14000, avatarHue: 165, travelEligible: false, travelAmount: 1000, demo: true, designation: 'Trainee Technician', address: addr('44 Indiranagar 100ft Road', 'Bengaluru', 'Bengaluru Urban', 'Karnataka', '560038') },
      { id: 'emp_005', code: 'SDC005', name: 'Vikram Singh', phone: '+91 98110 44005', email: 'vikram.s@sdc.in', role: 'field-employee', status: 'active',  siteId: 'site_del', joiningDate: '2025-09-18', aadhaarMasked: 'XXXX-XXXX-1197', panMasked: 'IJXXX7719Q', bankVerified: true, baseSalary: 15000, avatarHue: 265, travelEligible: true,  travelAmount: 2000, demo: true, designation: 'Technician', address: addr('9 Lajpat Nagar II', 'Delhi', 'South Delhi', 'Delhi', '110024') },
      { id: 'emp_006', code: 'SDC006', name: 'Kavya Reddy',  phone: '+91 98860 55006', email: 'kavya.r@sdc.in',  role: 'field-employee', status: 'active',  siteId: 'site_pun', joiningDate: '2025-12-02', aadhaarMasked: 'XXXX-XXXX-2263', panMasked: 'KLXXX3390M', bankVerified: true, baseSalary: 17000, avatarHue: 300, travelEligible: false, travelAmount: 1500, demo: true, designation: 'Senior Technician', address: addr('301 Kalyani Nagar', 'Pune', 'Pune', 'Maharashtra', '411006') },
      // Pending onboarding
      { id: 'emp_007', code: 'SDC007', name: 'Arjun Mehta',  phone: '+91 98330 66007', email: 'arjun.m@sdc.in',  role: 'field-employee', status: 'pending', siteId: 'site_mum', joiningDate: '', aadhaarMasked: 'XXXX-XXXX-8842', panMasked: 'MNXXX5501Z', bankVerified: true, baseSalary: 15000, avatarHue: 130, travelEligible: false, travelAmount: 0, submittedAt: iso(TODAY), demo: true, designation: 'Technician', approvalStatus: 'pending-approval', submittedBy: 'usr_hr' },
      /* Admin & managers (role picker) — office staff: no store, no geo-fence.
         Two people hold the Admin role: it is a permission level, not a seat,
         so an organisation can have as many admins as it needs. */
      { id: 'usr_admin',  code: 'ADM01', name: 'Neha Kapoor',   phone: '+91 98111 00001', email: 'neha.k@sdc.in',  role: 'admin',      status: 'active', siteId: null, joiningDate: '2024-01-10', avatarHue: 220, baseSalary: 0, employeeType: 'office', designation: 'Head of Department' },
      { id: 'usr_admin2', code: 'ADM02', name: 'Karthik Menon', phone: '+91 98111 00004', email: 'karthik.m@sdc.in', role: 'admin',    status: 'active', siteId: null, joiningDate: '2024-08-05', avatarHue: 265, baseSalary: 0, employeeType: 'office', designation: 'Senior Manager' },
      { id: 'usr_hr',    code: 'HR001', name: 'Rohit Sinha',  phone: '+91 98111 00002', email: 'rohit.s@sdc.in', role: 'hr-manager',  status: 'active', siteId: null, joiningDate: '2024-05-14', avatarHue: 190, baseSalary: 0, employeeType: 'office', designation: 'Manager' },
      { id: 'usr_sm',    code: 'SM001', name: 'Ananya Rao',   phone: '+91 98111 00003', email: 'ananya.r@sdc.in',role: 'site-manager', status: 'active', siteId: 'site_mum', joiningDate: '2024-03-22', avatarHue: 40, baseSalary: 0, employeeType: 'office', designation: 'Assistant Manager' },
    ];

    // ----- real employees from xlsx -----
    const realEmployees = (D.employees || []).map((e) => ({
      id: e.id, code: e.code, name: e.name, phone: e.phone, email: e.email,
      role: 'field-employee', status: 'active', siteId: e.siteId,
      joiningDate: e.joiningDate,
      aadhaarMasked: 'XXXX-XXXX-' + String(1000 + (e.avatarHue * 7 % 9000)).slice(-4),
      panMasked: (e.code.slice(-2) + 'XXX' + String(1000 + (e.avatarHue * 13 % 9000)).slice(-4)),
      bankVerified: true, baseSalary: e.baseSalary, avatarHue: e.avatarHue,
      slabId: e.slabId, travelEligible: !!e.travelEligible, travelAmount: e.travelAmount || 0,
      presentJun: e.presentJun, presentJul: e.presentJul, presentToday: e.presentToday !== false,
      salesJun: e.salesJun, salesJul: e.salesJul, monthlyTarget: Math.round((e.salesJul * 1.15) / 5000) * 5000,
    }));

    const employees = demoEmployees.concat(realEmployees).map(normaliseEmployee);

    // ---- attendance (only demo employees get rich per-mark records) ----
    const attendancePlan = {
      emp_001: { present: 30, absent: 0,  sales: 245000 },
      emp_002: { present: 28, absent: 2,  sales: 145000 },
      emp_003: { present: 29, absent: 1,  sales: 78000 },
      emp_004: { present: 30, absent: 0,  sales: 42000 },
      emp_005: { present: 27, absent: 3,  sales: 110000 },
      emp_006: { present: 30, absent: 0,  sales: 95000 },
    };
    const attendance = [];
    const prevMonthDays = 30;
    const empIds = Object.keys(attendancePlan);
    const siteById = Object.fromEntries(sites.map((s) => [s.id, s]));
    empIds.forEach((eid) => {
      const plan = attendancePlan[eid];
      const absentDays = new Set();
      while (absentDays.size < plan.absent) absentDays.add(2 + Math.floor(Math.random() * 26));
      const site = siteById[employees.find((e) => e.id === eid).siteId];
      for (let d = 1; d <= prevMonthDays; d++) {
        if (absentDays.has(d)) continue;
        const dt = new Date(2026, 5, d, 10, 3 + Math.floor(Math.random() * 20));
        const dtOut = new Date(2026, 5, d, 19, 0 + Math.floor(Math.random() * 20));
        attendance.push({ id: uid('att'), employeeId: eid, date: dateKey(dt), type: 'clock-in', timestamp: iso(dt), latitude: site.lat, longitude: site.lng, insideGeofence: true, photoUrl: null });
        attendance.push({ id: uid('att'), employeeId: eid, date: dateKey(dt), type: 'clock-out', timestamp: iso(dtOut), latitude: site.lat, longitude: site.lng, insideGeofence: true, photoUrl: null });
      }
    });
    empIds.forEach((eid) => {
      const site = siteById[employees.find((e) => e.id === eid).siteId];
      for (let d = 1; d <= 14; d++) {
        if (eid === 'emp_002' && d === 7) continue;
        if (eid === 'emp_005' && (d === 3 || d === 9)) continue;
        const dt = new Date(2026, 6, d, 10, 5);
        const dtOut = new Date(2026, 6, d, 19, 2);
        attendance.push({ id: uid('att'), employeeId: eid, date: dateKey(dt), type: 'clock-in', timestamp: iso(dt), latitude: site.lat, longitude: site.lng, insideGeofence: true, photoUrl: null });
        attendance.push({ id: uid('att'), employeeId: eid, date: dateKey(dt), type: 'clock-out', timestamp: iso(dtOut), latitude: site.lat, longitude: site.lng, insideGeofence: true, photoUrl: null });
      }
    });
    /* Today's live marks. One employee (emp_005) sits outside their fence so the
       live map and breach alerts have something real to show. */
    const today = dateKey(TODAY);
    empIds.forEach((eid, i) => {
      const emp = employees.find((e) => e.id === eid);
      const site = siteById[emp.siteId];
      const inFence = eid !== 'emp_005';
      const jitterLat = inFence ? (Math.random() - 0.5) * 0.0008 : 0.008;
      const jitterLng = inFence ? (Math.random() - 0.5) * 0.0008 : 0.011;
      const dt = new Date(2026, 6, 15, 10, 4 + i);
      attendance.push({ id: uid('att'), employeeId: eid, date: today, type: 'clock-in', timestamp: iso(dt),
        latitude: site.lat + jitterLat + (Math.random() - 0.5) * 0.0004,
        longitude: site.lng + jitterLng + (Math.random() - 0.5) * 0.0004,
        insideGeofence: inFence, photoUrl: null });
    });

    // ---- sales records: demo employees + all real employees (Jun & Jul) ----
    const salesRecords = [];
    empIds.forEach((eid) => {
      salesRecords.push({ id: uid('sal'), employeeId: eid, month: '2026-06', totalSales: attendancePlan[eid].sales });
      salesRecords.push({ id: uid('sal'), employeeId: eid, month: '2026-07', totalSales: attendancePlan[eid].sales });
    });
    realEmployees.forEach((e) => {
      salesRecords.push({ id: uid('sal'), employeeId: e.id, month: '2026-06', totalSales: e.salesJun });
      salesRecords.push({ id: uid('sal'), employeeId: e.id, month: '2026-07', totalSales: e.salesJul });
    });

    // ---- store-specific incentive slab templates (from xlsx) + demo templates ----
    const demoTemplates = [
      { id: 'demo_slab_mum', raw: '50k - 10%, Above 50k - 15%', kind: 'pct', label: '₹50k→10% · Above→15%', tiers: [{ from: 50000, type: 'pct', value: 10 }, { from: 50001, type: 'pct', value: 15 }] },
      { id: 'demo_slab_del', raw: '30k - 5%, 50k - 10%, 90k - 15%', kind: 'pct', label: '₹30k→5% · ₹50k→10% · ₹90k→15%', tiers: [{ from: 30000, type: 'pct', value: 5 }, { from: 50000, type: 'pct', value: 10 }, { from: 90000, type: 'pct', value: 15 }] },
      { id: 'demo_slab_blr', raw: '50k & above - ₹2000, 1L & above - ₹5000', kind: 'flat', label: '₹50k→₹2000 · ₹1L→₹5000', tiers: [{ from: 50000, type: 'flat', value: 2000 }, { from: 100000, type: 'flat', value: 5000 }] },
      { id: 'demo_slab_pun', raw: '30k - 5%, 50k - 10%', kind: 'pct', label: '₹30k→5% · ₹50k→10%', tiers: [{ from: 30000, type: 'pct', value: 5 }, { from: 50000, type: 'pct', value: 10 }] },
    ];
    const slabTemplates = demoTemplates.concat(D.slabTemplates || []);

    // ---- legacy global slabs (fallback / company default) ----
    const slabs = [
      { id: 'slab_1', minSales: 0,        maxSales: 50000,   payout: 500,  label: 'Entry slab' },
      { id: 'slab_2', minSales: 50001,    maxSales: 100000,  payout: 1200, label: 'Standard' },
      { id: 'slab_3', minSales: 100001,   maxSales: 200000,  payout: 2500, label: 'High performer' },
      { id: 'slab_4', minSales: 200001,   maxSales: null,    payout: 4500, label: 'Top performer' },
    ];

    /* Each request carries the exact times the employee is asking the log to
       read, so an approval is a data change rather than a note on a file. */
    const regularisations = [
      { id: uid('reg'), employeeId: 'emp_002', date: '2026-07-07', type: 'adjust',
        shift: { start: '10:00', end: '19:00', name: 'Flexible Shift', location: 'Croma – Juhu, Mumbai' },
        entries: [{ in: '10:04', out: '19:35', location: 'Croma – Juhu, Mumbai' }],
        reason: 'Client visit ran late', details: 'Was at Croma Andheri assisting a customer beyond shift end. Missed clock-out.',
        status: 'pending', decidedBy: null, decidedAt: null,
        auditTrail: [{ at: iso(new Date(2026,6,8,9,20)), by: 'emp_002', action: 'submitted' }] },
      { id: uid('reg'), employeeId: 'emp_003', date: '2026-07-04', type: 'adjust',
        shift: { start: '10:00', end: '19:00', name: 'Flexible Shift', location: 'Croma – Connaught Place, Delhi' },
        entries: [{ in: '10:00', out: '19:05', location: 'Croma – Connaught Place, Delhi' }],
        reason: 'Network issue at site', details: 'Mobile network down during clock-in window.',
        status: 'approved', decidedBy: 'usr_hr', decidedAt: iso(new Date(2026,6,5,11,10)),
        auditTrail: [{ at: iso(new Date(2026,6,5,8,10)), by: 'emp_003', action: 'submitted' }, { at: iso(new Date(2026,6,5,11,10)), by: 'usr_hr', action: 'approved' }] },
      { id: uid('reg'), employeeId: 'emp_001', date: '2026-07-10', type: 'other',
        shift: { start: '10:00', end: '19:00', name: 'Flexible Shift', location: 'Croma – Juhu, Mumbai' },
        entries: [],
        reason: 'On duty — customer site visit', details: 'Full day at a client premises in Thane; no store clock-in possible.',
        status: 'pending', decidedBy: null, decidedAt: null,
        auditTrail: [{ at: iso(new Date(2026,6,11,10,5)), by: 'emp_001', action: 'submitted' }] },
    ];

    const notifications = [
      { id: uid('ntf'), employeeId: 'emp_001', type: 'payroll',      message: 'Payroll for June credited: ₹18,000',            read: false, timestamp: iso(new Date(2026,6,1,10,0)) },
      { id: uid('ntf'), employeeId: 'emp_001', type: 'attendance',   message: 'Clock-out reminder — your shift ends at 19:00',  read: false, timestamp: iso(new Date(2026,6,15,18,45)) },
      { id: uid('ntf'), employeeId: 'emp_001', type: 'appreciation', message: 'You received Kudos from your Site Manager: "Excellent customer handling!"', read: false, timestamp: iso(new Date(2026,6,14,18,0)) },
      { id: uid('ntf'), employeeId: 'emp_001', type: 'security',     message: '⚠ Developer Mode was detected on your device. Please disable it — repeated detections mark you absent.', read: false, timestamp: iso(new Date(2026,6,15,9,10)) },
      { id: uid('ntf'), employeeId: 'emp_002', type: 'regularisation', message: 'Your regularisation for 07-Jul is pending review.', read: false, timestamp: iso(new Date(2026,6,8,9,20)) },
    ];

    // ---- appreciation / kudos ----
    const kudos = [
      { id: uid('kud'), fromId: 'usr_sm', fromName: 'Ananya Rao', toId: 'emp_001', badge: 'Customer Star', message: 'Excellent customer handling on the Juhu floor this week — keep it up!', at: iso(new Date(2026,6,14,18,0)) },
      { id: uid('kud'), fromId: 'usr_hr', fromName: 'Rohit Sinha', toId: 'emp_001', badge: 'Perfect Attendance', message: 'Zero absences in June. Reliability like yours sets the standard.', at: iso(new Date(2026,6,2,11,0)) },
    ];

    // ---- developer-mode fraud events (Rahul flagged once today) ----
    const devEvents = [
      { id: uid('dev'), employeeId: 'emp_001', date: today, at: iso(new Date(2026,6,15,9,10)) },
    ];
    const devAbsences = {}; // key `${empId}|${date}` -> true

    /* ---- store targets ----
       One target per store per period. `amount` is the sales the store must do
       in that month; `incentivePct` is the share of achieved sales paid out to
       the staff posted there once the store clears its target. Achievement is
       always computed from live sales records, never stored. */
    const storeTargets = [
      { id: uid('tgt'), siteId: 'site_mum', period: '2026-07', amount: 400000, incentivePct: 4, note: 'Festive quarter push' },
      { id: uid('tgt'), siteId: 'site_mum', period: '2026-06', amount: 380000, incentivePct: 4, note: '' },
      { id: uid('tgt'), siteId: 'site_del', period: '2026-07', amount: 200000, incentivePct: 5, note: '' },
      { id: uid('tgt'), siteId: 'site_del', period: '2026-06', amount: 190000, incentivePct: 5, note: '' },
      { id: uid('tgt'), siteId: 'site_blr', period: '2026-07', amount: 60000,  incentivePct: 6, note: 'New store ramp-up' },
      { id: uid('tgt'), siteId: 'site_pun', period: '2026-07', amount: 120000, incentivePct: 3, note: '' },
    ];

    // ---- company policies / HR document library ----
    const policyDoc = (title, category, summary, version, updated) => ({
      id: slugId('pol', title), title, category, summary, version,
      fileName: title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-v' + version + '.pdf',
      active: true, updatedAt: iso(updated), updatedBy: 'Neha Kapoor', acknowledgeRequired: true,
      body: summary,
    });
    const policies = [
      policyDoc('Company Policy Handbook', 'Policy', 'Company-wide operating principles, working hours, dress code and escalation paths for all S.D. Computronix staff.', '3.1', new Date(2026, 3, 12)),
      policyDoc('Employee Handbook', 'Handbook', 'Everything a new joiner needs in their first 30 days — org structure, tools, benefits, and who to ask for what.', '2.4', new Date(2026, 1, 8)),
      policyDoc('Code of Conduct', 'Policy', 'Expected professional behaviour with customers and colleagues, conflict-of-interest rules, and the anti-harassment policy.', '2.0', new Date(2025, 10, 20)),
      policyDoc('Attendance Policy', 'Policy', 'Shift timings, geo-fenced clock-in rules, late-mark treatment, and how attendance regularisation requests are decided.', '4.0', new Date(2026, 5, 2)),
      policyDoc('Leave Policy', 'Policy', 'Casual, sick and earned leave entitlements, carry-forward limits, and the approval chain for each leave type.', '2.2', new Date(2026, 2, 15)),
      policyDoc('Salary & Payroll Policy', 'Payroll', 'Pay cycle, pro-rating for absence, statutory deductions (PF, ESIC, PT), incentive settlement and payslip access.', '3.0', new Date(2026, 4, 1)),
      policyDoc('IT & Asset Policy', 'IT', 'Issued device handling, acceptable use, software installation rules, and the return process on exit.', '1.6', new Date(2025, 8, 30)),
      policyDoc('Information Security Policy', 'Security', 'Customer data handling, password standards, device developer-mode prohibition, and incident reporting.', '2.1', new Date(2026, 0, 18)),
    ];

    return {
      sites, employees, attendance, salesRecords,
      slabs, slabTemplates, storeTargets, policies,
      regularisations, notifications, kudos, devEvents, devAbsences,
      hierarchy: buildHierarchy(sites, employees),
      payrolls: [],
      incentiveUploads: [],
      incentiveAudit: [],
      config: { workingDays: 30, pfPct: 0.12, esicPct: 0.0075, pt: 200, defaultTravelAllowance: 1500 },
    };
  }

  /* ---------- people hierarchy ----------
     Four levels, matching how the client actually runs the field force:

        Technician  →  Store Manager  →  Team Lead  →  Business Manager

     Team Leads are the 52 "Cluster Managers" in the ZOB data (each covers ~11
     stores); Business Managers are the 14 zone/state-level owners. Both are
     REFERENCE DATA, not employees — they carry stable ids so stores and filters
     can point at them, but they never enter field headcount or a payroll run.

     Store Managers are different: they are real technicians who also run their
     store, so `site.managerId` points at an employee id and that employee keeps
     `role: 'field-employee'` (they still clock in, still get paid, still appear
     in headcount) plus an `isStoreManager` flag. */

  const slugId = (prefix, name) => prefix + '_' + String(name || '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

  function buildHierarchy(sites, employees) {
    const bms = (D.businessManagers || []).map((m) => ({ ...m, id: slugId('bm', m.name), level: 'business-manager' }));
    const tls = (D.clusterManagers || []).map((m) => ({ ...m, id: slugId('tl', m.name), level: 'team-lead' }));

    // Any manager named on a store but missing from the master lists (the demo
    // sites use invented names) still needs an id, or its store would be orphaned.
    const bmByName = new Map(bms.map((m) => [m.name, m]));
    const tlByName = new Map(tls.map((m) => [m.name, m]));
    sites.forEach((s) => {
      if (s.bm && !bmByName.has(s.bm)) {
        const m = { id: slugId('bm', s.bm), name: s.bm, zone: s.zone, regions: [s.region], stores: 0, level: 'business-manager' };
        bms.push(m); bmByName.set(s.bm, m);
      }
      if (s.cm && !tlByName.has(s.cm)) {
        const m = { id: slugId('tl', s.cm), name: s.cm, zone: s.zone, region: s.region, stores: 0, level: 'team-lead' };
        tls.push(m); tlByName.set(s.cm, m);
      }
    });

    // Link each store to its Team Lead / Business Manager by id, and promote the
    // longest-tenured technician at the store to Store Manager.
    const staffBySite = {};
    employees.forEach((e) => {
      if (e.role !== 'field-employee' || e.status !== 'active') return;
      (staffBySite[e.siteId] = staffBySite[e.siteId] || []).push(e);
    });
    sites.forEach((s) => {
      s.bmId = s.bm ? (bmByName.get(s.bm) || {}).id || null : null;
      s.teamLeadId = s.cm ? (tlByName.get(s.cm) || {}).id || null : null;
      if (!s.managerId) {
        const staff = staffBySite[s.id] || [];
        // Earliest joiningDate wins; blank dates sort last so they are never picked over a dated peer.
        const lead = staff.slice().sort((a, b) => String(a.joiningDate || '9999').localeCompare(String(b.joiningDate || '9999')))[0];
        if (lead) { s.managerId = lead.id; lead.isStoreManager = true; }
      }
    });

    // Recount stores per manager from the actual links rather than trusting the sheet.
    const countBy = (key) => sites.reduce((m, s) => { if (s[key]) m[s[key]] = (m[s[key]] || 0) + 1; return m; }, {});
    const bmCounts = countBy('bmId'), tlCounts = countBy('teamLeadId');
    bms.forEach((m) => { m.storeCount = bmCounts[m.id] || 0; });
    tls.forEach((m) => { m.storeCount = tlCounts[m.id] || 0; });

    return {
      zones: D.zones || [],
      regions: D.regions || [],
      businessManagers: bms,
      clusterManagers: tls,   // kept under the old key so existing callers keep working
      teamLeads: tls,
      defaultSlabId: D.defaultSlabId || null,
    };
  }

  // ---------- persistence ----------
  let state;
  let salesIndex = null;
  function buildIndexes() {
    salesIndex = {};
    state.salesRecords.forEach((r) => { salesIndex[r.employeeId + '|' + r.month] = r; });
  }
  function load() {
    try {
      const s = localStorage.getItem(LS_KEY);
      if (s) {
        state = JSON.parse(s);
        // Persisted state can predate fields the current UI reads; top it up
        // rather than discarding the user's edits.
        state.employees = (state.employees || []).map(normaliseEmployee);
        state.storeTargets = state.storeTargets || [];
        state.policies = state.policies || [];
        state.incentiveAudit = state.incentiveAudit || [];
        buildIndexes();
        return;
      }
    } catch (e) { /* ignore */ }
    state = seed();
    buildIndexes();
    persist();
  }
  function persist() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* memory-only (dataset too large for LS) */ }
  }
  function reset() { state = seed(); buildIndexes(); persist(); emit(); }

  // ---------- pub/sub ----------
  const subs = new Set();
  function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
  function emit() { subs.forEach((fn) => { try { fn(); } catch (e) {} }); }

  // ---------- selectors ----------
  const getEmployees = (filter) => {
    let list = state.employees.filter((e) => e.role === 'field-employee');
    if (filter?.siteId) list = list.filter((e) => e.siteId === filter.siteId);
    if (filter?.status) list = list.filter((e) => e.status === filter.status);
    if (filter?.zone)   list = list.filter((e) => getSite(e.siteId)?.zone === filter.zone);
    if (filter?.region) list = list.filter((e) => getSite(e.siteId)?.region === filter.region);
    return list;
  };
  const getUsers = () => state.employees.filter((e) => e.role !== 'field-employee');
  const empIndex = () => { if (!state._eidx) { Object.defineProperty(state, '_eidx', { value: {}, enumerable: false, writable: true }); state.employees.forEach((e) => state._eidx[e.id] = e); } return state._eidx; };
  const getEmployee = (id) => { const ix = empIndex(); return ix[id] || state.employees.find((e) => e.id === id); };
  const getSites = () => state.sites;
  const siteIndex = () => { if (!state._sidx) { Object.defineProperty(state, '_sidx', { value: {}, enumerable: false, writable: true }); state.sites.forEach((s) => state._sidx[s.id] = s); } return state._sidx; };
  const getSite = (id) => { const ix = siteIndex(); return ix[id] || state.sites.find((s) => s.id === id); };
  const getSlabs = () => [...state.slabs].sort((a, b) => a.minSales - b.minSales);
  const getSlabTemplates = () => state.slabTemplates;
  const getSlabTemplate = (id) => state.slabTemplates.find((t) => t.id === id) || null;
  const getSales = (empId, month) => { if (!salesIndex) buildIndexes(); return salesIndex[empId + '|' + month]; };
  const getHierarchy = () => state.hierarchy;

  // ---------- hierarchy lookups ----------
  const getTeamLeads = () => (state.hierarchy.teamLeads || state.hierarchy.clusterManagers || []);
  const getBusinessManagers = () => (state.hierarchy.businessManagers || []);
  const getTeamLead = (id) => getTeamLeads().find((m) => m.id === id) || null;
  const getBusinessManager = (id) => getBusinessManagers().find((m) => m.id === id) || null;
  const getStoreManager = (siteId) => { const s = getSite(siteId); return s && s.managerId ? getEmployee(s.managerId) : null; };
  const getSitesForTeamLead = (id) => getSites().filter((s) => s.teamLeadId === id);
  const getSitesForBusinessManager = (id) => getSites().filter((s) => s.bmId === id);

  /* Full reporting line for one employee, top-down, skipping levels that do not
     apply (a Store Manager does not report to themselves). */
  function getReportingChain(empId) {
    const emp = getEmployee(empId); if (!emp) return [];
    const site = getSite(emp.siteId); if (!site) return [];
    const chain = [];
    const mgr = site.managerId ? getEmployee(site.managerId) : null;
    if (mgr && mgr.id !== emp.id) chain.push({ level: 'store-manager', label: 'Store Manager', id: mgr.id, name: mgr.name, meta: site.name });
    const tl = getTeamLead(site.teamLeadId);
    if (tl) chain.push({ level: 'team-lead', label: 'Team Lead', id: tl.id, name: tl.name, meta: (tl.storeCount || 0) + ' stores' });
    const bm = getBusinessManager(site.bmId);
    if (bm) chain.push({ level: 'business-manager', label: 'Business Manager', id: bm.id, name: bm.name, meta: bm.zone ? bm.zone + ' zone' : '' });
    return chain;
  }

  function setSiteManager(siteId, empId) {
    const s = getSite(siteId); if (!s) return;
    if (s.managerId) { const prev = getEmployee(s.managerId); if (prev) delete prev.isStoreManager; }
    s.managerId = empId || null;
    if (empId) { const e = getEmployee(empId); if (e) e.isStoreManager = true; }
    invalidate(); persist(); emit();
  }
  const getAttendance = (filter) => {
    let list = state.attendance;
    if (filter?.employeeId) list = list.filter((a) => a.employeeId === filter.employeeId);
    if (filter?.date) list = list.filter((a) => a.date === filter.date);
    if (filter?.month) list = list.filter((a) => a.date.startsWith(filter.month));
    return list.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };
  const getRegularisations = (filter) => {
    let list = state.regularisations;
    if (filter?.employeeId) list = list.filter((r) => r.employeeId === filter.employeeId);
    if (filter?.status) list = list.filter((r) => r.status === filter.status);
    return list;
  };
  const getNotifications = (empId) => state.notifications.filter((n) => n.employeeId === empId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // ---------- store-specific incentive engine ----------
  // Resolve the slab that governs an employee: their own assigned template, else
  // their store's template, else the company (legacy global) slab table.
  function resolveSlab(emp) {
    if (!emp) return { source: 'global', template: null };
    if (emp.slabId) { const t = getSlabTemplate(emp.slabId); if (t) return { source: 'employee', template: t }; }
    const site = getSite(emp.siteId);
    if (site?.slabId) { const t = getSlabTemplate(site.slabId); if (t) return { source: 'site', template: t }; }
    return { source: 'global', template: null };
  }
  function payoutFromTiers(tiers, sales) {
    if (!tiers || !tiers.length) return { payout: 0, tier: null };
    const sorted = [...tiers].sort((a, b) => a.from - b.from);
    let tier = null;
    for (const t of sorted) if (sales >= t.from) tier = t;
    if (!tier) return { payout: 0, tier: null };
    const raw = tier.type === 'pct' ? Math.round((sales * tier.value) / 100) : tier.value;
    return { payout: clamp(raw, 0, 20000), tier };
  }
  /* Threshold incentive rules (employee- and store-level).

     Unlike slab tiers — where only the highest tier you reach pays — these rules
     are INDEPENDENT: every rule whose sales threshold is cleared pays out, and
     they sum. So "10% once ₹50k is crossed" and "₹2,000 once ₹40k is crossed"
     can both fire on the same month.

     Rule shape: { id, minSales, type: 'pct'|'flat', value } */
  const RULE_CAP = 20000;
  function ruleAmount(rule, sales) {
    const val = +rule.value || 0;
    return rule.type === 'pct' ? Math.round((sales * val) / 100) : Math.round(val);
  }
  function evalIncentiveRules(rules, sales, scope) {
    const applied = [], pending = [];
    (rules || []).forEach((r) => {
      if (!r || (!r.value && r.value !== 0)) return;
      const minSales = +r.minSales || 0;
      if (sales >= minSales) applied.push({ ...r, scope, minSales, amount: ruleAmount(r, sales) });
      else pending.push({ ...r, scope, minSales, amount: ruleAmount(r, minSales), remaining: minSales - sales });
    });
    return { total: applied.reduce((n, r) => n + r.amount, 0), applied, pending };
  }

  /* ---------- store targets ----------
     A store carries at most one target per period (YYYY-MM). Achievement is
     always summed live from the sales records of the staff posted there, so a
     transfer or a corrected sales figure is reflected immediately. */
  const getStoreTargets = (siteId) => (state.storeTargets || []).filter((t) => !siteId || t.siteId === siteId);
  const getStoreTarget = (siteId, period) =>
    (state.storeTargets || []).find((t) => t.siteId === siteId && t.period === period) || null;

  /* Achievement is read once per employee during a payroll run, i.e. hundreds of
     times per render across 562 stores. Cache it per site|period and drop the
     cache on any mutation. */
  let achieveCache = {};
  function getStoreAchievement(siteId, period) {
    const key = siteId + '|' + period;
    if (achieveCache[key] != null) return achieveCache[key];
    let total = 0;
    for (const e of state.employees) {
      if (e.siteId !== siteId || e.status !== 'active') continue;
      total += getSales(e.id, period)?.totalSales || 0;
    }
    achieveCache[key] = total;
    return total;
  }

  /* The store-target branch of the incentive calculation.

     The store must clear its target before anything pays; once it does, each
     employee posted there earns `incentivePct` of their OWN sales. `maxEligible`
     is what the rule pays at exactly target — the figure the UI quotes when an
     admin types a percentage against a target. */
  function storeTargetIncentive(emp, period) {
    const site = emp && emp.siteId ? getSite(emp.siteId) : null;
    if (!site) return null;
    const target = getStoreTarget(site.id, period);
    if (!target || !(+target.amount > 0)) return null;
    const amount = +target.amount;
    const pct = +target.incentivePct || 0;
    const achieved = getStoreAchievement(site.id, period);
    const achievedPct = Math.round((achieved / amount) * 100);
    const empSales = getSales(emp.id, period)?.totalSales || 0;
    const met = achieved >= amount;
    return {
      targetId: target.id, period, siteId: site.id, siteName: site.name,
      amount, pct, achieved, achievedPct, met, empSales,
      payout: met ? Math.round((empSales * pct) / 100) : 0,
      maxEligible: Math.round((amount * pct) / 100),
    };
  }

  /* calcIncentive(sales, emp?, month?) — emp makes it store-specific.

     Two independent branches can pay an employee, and the business rule is that
     the HIGHER of the two wins (they are not added together):

       A. Store target × incentive percentage
       B. Incentive slab tiers + the employee/store threshold rules

     Whichever branch yields more is the "maximum eligible" incentive; the final
     payout is that figure clamped to the monthly ceiling. */
  function calcIncentive(sales, emp, month) {
    if (emp) {
      const { template } = resolveSlab(emp);
      const site = getSite(emp.siteId);
      const empRules  = evalIncentiveRules(emp.incentives, sales, 'employee');
      const siteRules = evalIncentiveRules(site && site.incentives, sales, 'store');
      const rules = {
        total: empRules.total + siteRules.total,
        applied: empRules.applied.concat(siteRules.applied),
        pending: empRules.pending.concat(siteRules.pending),
      };
      const hasTemplate = template && template.kind !== 'none' && template.tiers && template.tiers.length;
      const slabPayout = hasTemplate ? payoutFromTiers(template.tiers, sales).payout : 0;
      const slabBranch = slabPayout + rules.total;
      const target = month ? storeTargetIncentive(emp, month) : null;
      const targetBranch = target ? target.payout : 0;

      if (template || target || rules.applied.length || rules.pending.length) {
        const raw = Math.max(slabBranch, targetBranch);
        const winner = targetBranch > slabBranch ? 'target' : 'slab';
        const label = winner === 'target'
          ? `Store target · ${target.pct}% of sales`
          : (template ? (template.label || 'No incentive') : 'Threshold rules');
        return {
          payout: clamp(raw, 0, RULE_CAP),
          slab: { id: template ? template.id : null, label },
          template: template || null,
          winner,
          maxEligible: raw,
          breakdown: {
            slab: slabPayout, rules: rules.total, slabBranch,
            applied: rules.applied, pending: rules.pending,
            target, targetBranch,
          },
          capped: raw > RULE_CAP,
        };
      }
    }
    // legacy global bands
    const slabs = getSlabs();
    for (const s of slabs) {
      const hi = s.maxSales == null ? Infinity : s.maxSales;
      if (sales >= s.minSales && sales <= hi) return { payout: s.payout, slab: s, winner: 'slab', maxEligible: s.payout };
    }
    const top = slabs[slabs.length - 1];
    return { payout: top.payout, slab: top, winner: 'slab', maxEligible: top.payout };
  }

  // Rich detail for the mobile progress UI — normalised tiers + next-tier hint.
  function incentiveDetail(emp, month) {
    const sales = getSales(emp.id, month)?.totalSales || 0;
    const { source, template } = resolveSlab(emp);
    const fmtAmt = (n) => (n >= 100000 ? '₹' + (n / 100000).toFixed(n % 100000 ? 1 : 0) + 'L' : n >= 1000 ? '₹' + Math.round(n / 1000) + 'k' : '₹' + n);

    /* Independent threshold rules ride alongside whichever branch runs below,
       so the mobile app can show "unlocked" and "still locked" rules. */
    const full = calcIncentive(sales, emp, month);
    const bd = full.breakdown || { rules: 0, applied: [], pending: [] };
    const decorate = (r) => ({
      ...r,
      minLabel: fmtAmt(r.minSales),
      amountLabel: fmtAmt(r.amount),
      typeLabel: r.type === 'pct' ? r.value + '% of sales' : fmtAmt(+r.value || 0) + ' flat',
      remainingLabel: r.remaining != null ? fmtAmt(r.remaining) : null,
    });
    const rules = {
      total: bd.rules,
      applied: (bd.applied || []).map(decorate),
      pending: (bd.pending || []).map(decorate),
    };

    if (template && template.kind !== 'none' && template.tiers?.length) {
      const sorted = [...template.tiers].sort((a, b) => a.from - b.from);
      let current = null, next = null;
      for (let i = 0; i < sorted.length; i++) {
        if (sales >= sorted[i].from) current = sorted[i];
        else { next = sorted[i]; break; }
      }
      const tiers = sorted.map((t) => ({
        from: t.from, fromLabel: fmtAmt(t.from),
        payoutText: t.type === 'pct' ? t.value + '% of sales' : fmtAmt(t.value),
        reached: sales >= t.from, active: current && t.from === current.from,
      }));
      const slabPayout = payoutFromTiers(template.tiers, sales).payout;
      const base = current ? current.from : 0;
      const span = next ? next.from - base : Math.max(1, sales - base);
      return {
        mode: 'template', source, raw: template.raw, label: template.label, sales,
        payout: full.payout, slabPayout, rules, capped: full.capped,
        winner: full.winner, target: (full.breakdown || {}).target || null,
        tiers, next: next ? { fromLabel: fmtAmt(next.from), remaining: Math.max(0, next.from - sales), payoutText: next.type === 'pct' ? next.value + '%' : fmtAmt(next.value) } : null,
        progress: Math.max(0, Math.min(100, ((sales - base) / span) * 100)),
      };
    }
    // global fallback
    const slabs = getSlabs();
    const inc = calcIncentive(sales);
    const idx = slabs.findIndex((s) => s.id === inc.slab.id);
    const next = slabs[idx + 1];
    const tiers = slabs.map((s) => ({ from: s.minSales, fromLabel: fmtAmt(s.minSales), payoutText: fmtAmt(s.payout), reached: sales >= s.minSales, active: s.id === inc.slab.id }));
    const base = inc.slab.minSales || 0;
    const span = next ? next.minSales - base : Math.max(1, sales - base);
    return {
      mode: 'global', source: 'global', raw: 'Company default bands', label: inc.slab.label, sales,
      payout: full.payout, slabPayout: inc.payout, rules, capped: full.capped, tiers,
      winner: full.winner, target: (full.breakdown || {}).target || null,
      next: next ? { fromLabel: fmtAmt(next.minSales), remaining: Math.max(0, next.minSales - sales), payoutText: fmtAmt(next.payout) } : null,
      progress: Math.max(0, Math.min(100, ((sales - base) / span) * 100)),
    };
  }

  // ---------- targets ----------
  function getTargets(empId, month) {
    const emp = getEmployee(empId);
    const sales = getSales(empId, month)?.totalSales || 0;
    const monthly = emp?.monthlyTarget || Math.max(60000, Math.round((sales * 1.15) / 5000) * 5000);
    const weekly = Math.round(monthly / 4 / 1000) * 1000;
    // fraction of month elapsed for July demo (15/31); full for past months
    const elapsed = month === '2026-07' ? 15 / 31 : 1;
    const weekAchieved = Math.round(sales / 4);
    return {
      monthlyTarget: monthly, monthlyAchieved: sales, monthlyPct: Math.min(100, Math.round((sales / monthly) * 100)),
      weeklyTarget: weekly, weeklyAchieved: weekAchieved, weeklyPct: Math.min(100, Math.round((weekAchieved / weekly) * 100)),
      onTrack: sales >= monthly * elapsed,
    };
  }

  // ---------- attendance counting ----------
  function isPresentToday(emp) {
    const today = dateKey(TODAY);
    if (state.devAbsences[emp.id + '|' + today]) return false;
    const rec = state.attendance.find((a) => a.employeeId === emp.id && a.type === 'clock-in' && a.date === today);
    if (rec) return true;
    if (emp.presentToday !== undefined) return !!emp.presentToday;
    return true;
  }

  function countAttendance(empId, month /* YYYY-MM */) {
    const workingDays = state.config.workingDays;
    const emp = getEmployee(empId);
    const attMonth = state.attendance.filter((a) => a.employeeId === empId && a.type === 'clock-in' && a.date.startsWith(month));
    let presentDays;
    if (attMonth.length > 0) {
      const uniqDays = new Set(attMonth.map((a) => a.date));
      const approvedRegs = state.regularisations.filter((r) => r.employeeId === empId && r.status === 'approved' && r.date.startsWith(month));
      approvedRegs.forEach((r) => uniqDays.add(r.date));
      presentDays = uniqDays.size;
    } else if (emp && month === '2026-06' && emp.presentJun != null) {
      presentDays = emp.presentJun;
    } else if (emp && month === '2026-07' && emp.presentJul != null) {
      presentDays = emp.presentJul;
    } else {
      presentDays = workingDays; // safe default
    }
    presentDays = Math.min(presentDays, workingDays);
    const absentDays = Math.max(0, workingDays - presentDays);
    return { presentDays, absentDays, workingDays };
  }

  function computePayslip(empId, month) {
    const emp = getEmployee(empId);
    if (!emp) return null;
    const { presentDays, absentDays, workingDays } = countAttendance(empId, month);
    const dailyRate = emp.baseSalary / workingDays;
    const absenceDeduction = Math.round(absentDays * dailyRate);
    const pf = Math.round(state.config.pfPct * emp.baseSalary);
    const esic = Math.round(state.config.esicPct * emp.baseSalary);
    const pt = state.config.pt;
    const sales = getSales(empId, month)?.totalSales || 0;
    /* Office staff carry no store and no sales, so no incentive branch applies —
       skipping the call also keeps a payroll run over 490 people cheap. */
    const incResult = emp.employeeType === 'office'
      ? { payout: 0, slab: { id: null, label: 'Not applicable' }, winner: 'slab', maxEligible: 0 }
      : calcIncentive(sales, emp, month);
    const incentive = incResult.payout;
    const travelAllowance = emp.travelEligible ? (emp.travelAmount || state.config.defaultTravelAllowance) : 0;
    const netPay = emp.baseSalary - absenceDeduction - (pf + esic + pt) + incentive + travelAllowance;
    return {
      employeeId: empId, month, workingDays, presentDays, absentDays,
      base: emp.baseSalary, absenceDeduction,
      statutory: { pf, esic, pt, total: pf + esic + pt },
      sales, incentive, incentiveSlab: incResult.slab, travelAllowance,
      incentiveBreakdown: incResult.breakdown || null, incentiveCapped: !!incResult.capped,
      incentiveWinner: incResult.winner || 'slab', incentiveMaxEligible: incResult.maxEligible || 0,
      netPay,
    };
  }

  function runPayroll(month) {
    const emps = getEmployees({ status: 'active' });
    const payslips = emps.map((e) => computePayslip(e.id, month));
    const run = { id: uid('run'), month, processedAt: iso(new Date()), status: 'processed', count: payslips.length };
    state.payrolls = state.payrolls.filter((r) => r.month !== month).concat([run]);
    persist(); emit();
    return run;
  }
  const getPayrollRun = (month) => state.payrolls.find((r) => r.month === month);

  // ---------- mutations ----------
  function invalidate() { state._eidx = null; state._sidx = null; achieveCache = {}; }
  function updateEmployee(id, patch) {
    const e = getEmployee(id); if (!e) return;
    Object.assign(e, patch);
    // Sales, store assignment and status all feed store-target achievement.
    achieveCache = {};
    persist(); emit();
  }
  function addEmployee(emp) {
    const full = normaliseEmployee({
      id: uid('emp'), code: 'SDC' + (100 + state.employees.length), status: 'pending',
      role: 'field-employee', baseSalary: 15000, avatarHue: Math.floor(Math.random() * 360),
      travelEligible: false, travelAmount: 0, submittedAt: iso(new Date()), ...emp,
    });
    state.employees.push(full);
    invalidate(); persist(); emit();
    return full;
  }
  function approveEmployee(id, siteId) {
    const e = getEmployee(id); if (!e) return;
    e.status = 'active'; e.approvalStatus = 'approved';
    // Office staff legitimately have no store; only default one for field staff.
    if (e.employeeType !== 'office') e.siteId = siteId || e.siteId || 'site_mum';
    else if (siteId) e.siteId = siteId;
    e.joiningDate = e.joiningDate || dateKey(new Date());
    e.rejectionReason = null;
    e.approvedAt = iso(new Date());
    // Approving the applicant clears the document review queue too — nothing else
    // in the system moves a doc from 'uploaded' to 'verified'.
    if (e.documents) {
      Object.keys(e.documents).forEach((k) => {
        if (e.documents[k] && e.documents[k].status === 'uploaded') {
          e.documents[k] = { ...e.documents[k], status: 'verified', verifiedAt: iso(new Date()) };
        }
      });
    }
    state.notifications.push({ id: uid('ntf'), employeeId: id, type: 'onboarding', message: 'Your onboarding was approved. Welcome to S.D. Computronix!', read: false, timestamp: iso(new Date()) });
    persist(); emit();
  }
  function rejectEmployee(id, reason) {
    const e = getEmployee(id); if (!e) return;
    e.status = 'rejected';
    e.approvalStatus = 'rejected';
    e.rejectionReason = reason || '';
    e.rejectedAt = iso(new Date());
    state.notifications.push({ id: uid('ntf'), employeeId: id, type: 'onboarding', message: reason ? `Your application needs attention: ${reason}` : 'Your onboarding application was not approved.', read: false, timestamp: iso(new Date()) });
    persist(); emit();
  }

  /* ---------- approval workflow ----------

     An Admin creates an employee → the record is approved on the spot.
     Anyone else creates one → it enters the queue as 'pending-approval' and a
     an Admin has to clear it. `roleCanSelfApprove` is the single place that
     decision is made, so the wizard, the quick-add form and the document
     uploader all behave identically. */
  const roleCanSelfApprove = (role) => isAdminRole(role);

  function submitForApproval(id, byUserId) {
    const e = getEmployee(id); if (!e) return;
    e.approvalStatus = 'pending-approval';
    e.status = 'pending';
    e.submittedAt = iso(new Date());
    e.submittedBy = byUserId || null;
    persist(); emit();
  }

  /* ---------- document locking ----------
     Identity proofs are write-once. Once Aadhaar or PAN has been verified the
     document is the company's record of who this person is, and letting the
     holder swap the file afterwards would defeat the verification entirely —
     so Replace disappears and a correction has to go through Admin. Bank and
     address proofs stay replaceable because they legitimately change. */
  const LOCKED_DOC_KEYS = ['aadhaar', 'pan'];
  function isDocumentLocked(emp, docKey) {
    if (!LOCKED_DOC_KEYS.includes(docKey)) return false;
    const docs = (emp && emp.documents) || {};
    const rec = docs[docKey];
    if (rec) return rec.status === 'verified';
    // Legacy records carry only the masked KYC value, which means verified.
    if (docKey === 'aadhaar') return !!(emp && emp.aadhaarMasked);
    if (docKey === 'pan') return !!(emp && emp.panMasked);
    return false;
  }

  /* ---------- bank details ----------
     Three self-service changes, then the employee is sent to Admin. Admins
     bypass the counter because they are the escalation path. */
  function bankUpdatesLeft(emp) {
    return Math.max(0, BANK_UPDATE_LIMIT - ((emp && emp.bankUpdateCount) || 0));
  }
  function updateBankDetails(empId, patch, byUser) {
    const e = getEmployee(empId);
    if (!e) return { ok: false, reason: 'Employee not found', remaining: 0 };
    const byAdmin = !!byUser && isAdminRole(byUser.role);
    const remaining = bankUpdatesLeft(e);
    if (!byAdmin && remaining <= 0) {
      return { ok: false, remaining: 0,
        reason: `Bank details can be changed ${BANK_UPDATE_LIMIT} times. Please contact Admin to change them again.` };
    }
    Object.assign(e, patch);
    if (!byAdmin) e.bankUpdateCount = ((e.bankUpdateCount || 0) + 1);
    e.bankUpdatedAt = iso(new Date());
    persist(); emit();
    return { ok: true, remaining: byAdmin ? remaining : bankUpdatesLeft(e), byAdmin };
  }

  /* ---------- salary ----------
     HR and Admin may set pay; every change is stamped so the payroll figure can
     always be traced back to who approved it. */
  function setSalary(empId, amount, byUserId, note) {
    const e = getEmployee(empId); if (!e) return null;
    const from = +e.baseSalary || 0;
    const to = Math.max(0, Math.round(+amount || 0));
    if (from === to) return null;
    e.salaryHistory = (e.salaryHistory || []).concat([{
      from, to, at: iso(new Date()), by: byUserId || null, note: note || '',
    }]);
    e.baseSalary = to;
    state.notifications.push({ id: uid('ntf'), employeeId: empId, type: 'payroll',
      message: `Your monthly salary was revised to ₹${to.toLocaleString('en-IN')}.`,
      read: false, timestamp: iso(new Date()) });
    persist(); emit();
    return e.salaryHistory[e.salaryHistory.length - 1];
  }

  /* Document approval mirrors employee approval: an upload by a non-Admin lands
     as 'uploaded' (pending) and needs review; an Admin's upload is verified
     immediately. */
  function setDocumentStatus(empId, docKey, status, by) {
    const e = getEmployee(empId); if (!e) return;
    const docs = { ...(e.documents || {}) };
    if (!docs[docKey]) docs[docKey] = { status: 'missing' };
    docs[docKey] = {
      ...docs[docKey], status,
      [status === 'verified' ? 'verifiedAt' : 'reviewedAt']: iso(new Date()),
      reviewedBy: by || null,
    };
    e.documents = docs;
    persist(); emit();
  }

  /* ---------- designation ----------
     Every change is appended to designationHistory so an employee's progression
     (Technician → Senior Technician → Team Lead) stays auditable. */
  function updateDesignation(empId, designation, byUserId, note) {
    const e = getEmployee(empId); if (!e || !designation) return;
    const from = e.designation || null;
    if (from === designation) return;
    e.designationHistory = (e.designationHistory || []).concat([{
      from, to: designation, at: iso(new Date()), by: byUserId || null, note: note || '',
    }]);
    e.designation = designation;
    state.notifications.push({ id: uid('ntf'), employeeId: empId, type: 'designation',
      message: from ? `Your designation was updated: ${from} → ${designation}` : `Your designation was set to ${designation}`,
      read: false, timestamp: iso(new Date()) });
    persist(); emit();
  }

  const setGeoFence = (empId, enabled) => updateEmployee(empId, { geoFenceEnabled: !!enabled });

  /* ---------- email validation ----------
     Stands in for the address-verification API: syntax, disposable-domain and
     uniqueness checks, returning the same shape a real call would. */
  const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const DISPOSABLE_DOMAINS = ['mailinator.com', 'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'yopmail.com', 'trashmail.com'];
  function validateEmail(email, excludeEmpId) {
    const value = String(email || '').trim();
    if (!value) return { valid: false, reason: 'Email address is required' };
    if (!EMAIL_RE.test(value)) return { valid: false, reason: 'That does not look like a valid email address' };
    const domain = value.split('@')[1].toLowerCase();
    if (DISPOSABLE_DOMAINS.includes(domain)) return { valid: false, reason: 'Disposable email domains are not accepted' };
    const clash = state.employees.find((e) => e.id !== excludeEmpId && (e.email || '').toLowerCase() === value.toLowerCase());
    if (clash) return { valid: false, reason: `Already used by ${clash.name} (${clash.code})`, duplicateOf: clash.id };
    return { valid: true, reason: 'Address is valid and not already in use', domain };
  }

  /* ---------- store targets ---------- */
  function upsertStoreTarget(target, actor) {
    return guarded(actor, 'target.edit', () => {
      if (!state.storeTargets) state.storeTargets = [];
      const before = target.id ? (state.storeTargets.find((t) => t.id === target.id) || null) : null;
      const next = {
        ...target,
        amount: +target.amount || 0,
        incentivePct: +target.incentivePct || 0,
      };
      const i = state.storeTargets.findIndex((t) => next.id
        ? t.id === next.id
        : (t.siteId === next.siteId && t.period === next.period));
      let saved;
      if (i >= 0) { state.storeTargets[i] = { ...state.storeTargets[i], ...next }; saved = state.storeTargets[i]; }
      else { saved = { ...next, id: next.id || uid('tgt') }; state.storeTargets.push(saved); }
      logIncentiveAudit({ actor, action: before ? 'target.updated' : 'target.created', targetType: 'target', targetId: saved.id, before, after: saved });
      achieveCache = {}; persist(); emit();
      return saved;
    });
  }
  function deleteStoreTarget(id, actor) {
    return guarded(actor, 'target.edit', () => {
      const before = (state.storeTargets || []).find((t) => t.id === id) || null;
      state.storeTargets = (state.storeTargets || []).filter((t) => t.id !== id);
      if (before) logIncentiveAudit({ actor, action: 'target.deleted', targetType: 'target', targetId: id, before, after: null });
      achieveCache = {}; persist(); emit();
    });
  }
  /* Everything a target card needs: the target, what the store actually did, and
     what that means in rupees for the staff posted there. */
  function getStoreTargetSummary(siteId, period) {
    const target = getStoreTarget(siteId, period);
    const achieved = getStoreAchievement(siteId, period);
    const staff = getEmployees({ siteId, status: 'active' });
    if (!target) return { target: null, achieved, staffCount: staff.length, achievedPct: null, incentiveGenerated: 0 };
    const amount = +target.amount || 0;
    const incentiveGenerated = staff.reduce((n, e) => n + (storeTargetIncentive(e, period) || { payout: 0 }).payout, 0);
    return {
      target, achieved, staffCount: staff.length,
      achievedPct: amount > 0 ? Math.round((achieved / amount) * 100) : null,
      met: amount > 0 && achieved >= amount,
      incentiveGenerated,
      maxEligible: Math.round((amount * (+target.incentivePct || 0)) / 100),
    };
  }

  /* ---------- company policies / HR documents ---------- */
  const getPolicies = (opts) => (state.policies || [])
    .filter((p) => (opts && opts.activeOnly ? p.active : true))
    .slice()
    .sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.title || '').localeCompare(b.title || ''));
  function upsertPolicy(policy, byName) {
    if (!state.policies) state.policies = [];
    const next = { ...policy, updatedAt: iso(new Date()), updatedBy: byName || policy.updatedBy || 'Admin' };
    const i = state.policies.findIndex((p) => p.id === next.id);
    if (i >= 0) state.policies[i] = { ...state.policies[i], ...next };
    else state.policies.push({ ...next, id: next.id || uid('pol'), active: next.active !== false });
    persist(); emit();
  }
  function deletePolicy(id) { state.policies = (state.policies || []).filter((p) => p.id !== id); persist(); emit(); }
  function togglePolicy(id, active) {
    const p = (state.policies || []).find((x) => x.id === id); if (!p) return;
    p.active = active != null ? !!active : !p.active;
    p.updatedAt = iso(new Date());
    persist(); emit();
  }

  // Mobile sign-in: match on the employee's phone, ignoring +91 / spaces / dashes.
  const digitsOf = (s) => String(s || '').replace(/\D/g, '');
  function findEmployeeByPhone(phone) {
    const raw = String(phone || '').trim();
    if (!raw) return null;
    const d = digitsOf(raw);
    // Only treat the input as a phone number when there are enough digits;
    // an employee code like "SDC001" must still fall through to the code match.
    if (d.length >= 6) {
      const last10 = d.slice(-10);
      const byPhone = state.employees.find((e) => digitsOf(e.phone).slice(-10) === last10);
      if (byPhone) return byPhone;
    }
    return state.employees.find((e) => (e.code || '').toLowerCase() === raw.toLowerCase()) || null;
  }
  function addAttendance(rec) {
    const full = { id: uid('att'), timestamp: iso(new Date()), date: dateKey(new Date()), ...rec };
    state.attendance.push(full);
    persist(); emit();
    return full;
  }
  /* ---------- shifts and the day log ----------

     A regularisation is only meaningful against a shift: "10:11 in, missing
     out" means nothing until you know the shift ran 10:00–19:00. The shift
     comes off the assigned store, falling back to the company default for
     office staff and anyone unassigned. */
  function getShift(emp) {
    const site = emp && emp.siteId ? getSite(emp.siteId) : null;
    if (site && site.shiftStart && site.shiftEnd) {
      return { start: site.shiftStart, end: site.shiftEnd, name: 'Flexible Shift', location: site.name, siteId: site.id };
    }
    return { ...DEFAULT_SHIFT, location: 'Head office', siteId: null };
  }

  const HHMM = (ts) => {
    if (!ts) return null;
    const d = new Date(ts);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };
  // 'HH:MM' on a given YYYY-MM-DD, as a full ISO timestamp.
  function stampAt(date, hhmm) {
    const [h, m] = String(hhmm || '00:00').split(':').map(Number);
    const d = new Date(date + 'T00:00:00');
    d.setHours(h || 0, m || 0, 0, 0);
    return iso(d);
  }
  const minutesOf = (hhmm) => {
    const [h, m] = String(hhmm || '0:0').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  /* One row of the attendance log: what the employee's day actually looks like.
     `status` is what the grid colours the cell by, and `missing` is what makes
     the Regularize action worth offering. */
  function getDayLog(empId, date, opts) {
    const emp = getEmployee(empId);
    const shift = getShift(emp);
    const marks = state.attendance
      .filter((a) => a.employeeId === empId && a.date === date)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    /* The imported roster carries monthly present/absent totals but no
       individual clock stamps. Showing those days as "absent" would contradict
       the 95% the same person's monthly row reports, so a month with no marks
       at all reads as "no data" and is not offered for correction — there is
       no log to correct. `hasMarks` is passed in by the month builder so this
       costs one scan per month rather than one per day. */
    const hasMarks = opts && opts.hasMarks !== undefined
      ? opts.hasMarks
      : state.attendance.some((a) => a.employeeId === empId && a.date.startsWith(date.slice(0, 7)));
    const inMark = marks.find((m) => m.type === 'clock-in') || null;
    const outMark = [...marks].reverse().find((m) => m.type === 'clock-out') || null;
    const reg = state.regularisations.find((r) => r.employeeId === empId && r.date === date);

    const inTime = inMark ? HHMM(inMark.timestamp) : null;
    const outTime = outMark ? HHMM(outMark.timestamp) : null;
    const grossMinutes = inTime && outTime ? Math.max(0, minutesOf(outTime) - minutesOf(inTime)) : 0;
    const isFuture = date > dateKey(TODAY);
    const weekend = [0].includes(new Date(date + 'T00:00:00').getDay());

    let status;
    if (isFuture) status = 'upcoming';
    else if (weekend) status = 'weekly-off';
    else if (inTime && outTime) status = minutesOf(inTime) > minutesOf(shift.start) + 15 ? 'late' : 'on-time';
    else if (inTime || outTime) status = 'incomplete';
    else if (!hasMarks) status = 'no-data';
    else status = 'absent';

    const correctable = !isFuture && !weekend && hasMarks;
    return {
      date, empId, shift, marks, inMark, outMark, inTime, outTime,
      grossMinutes, status, weekend, isFuture, hasMarks,
      missing: correctable && (!inTime || !outTime),
      regularisation: reg || null,
      // Only a day that actually went wrong, on a log that actually exists.
      regularisable: correctable && (!inTime || !outTime || status === 'late'),
    };
  }

  function getAttendanceMonth(empId, month /* YYYY-MM */) {
    const [y, m] = month.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    const hasMarks = state.attendance.some((a) => a.employeeId === empId && a.date.startsWith(month));
    const out = [];
    for (let d = 1; d <= days; d++) {
      out.push(getDayLog(empId, `${month}-${String(d).padStart(2, '0')}`, { hasMarks }));
    }
    return out;
  }

  /* ---------- regularisation ----------

     A request carries the time entries the employee wants the log to read, so
     approving it is a data change rather than a note on a file. Requests are
     rationed per calendar month; the balance is shown before the form is
     filled in, the way every HRMS does it. */
  function getRegularisationBalance(empId, month) {
    const used = state.regularisations.filter((r) =>
      r.employeeId === empId && r.status !== 'rejected' && String(r.date || '').startsWith(month)).length;
    return { used, limit: REG_MONTHLY_LIMIT, remaining: Math.max(0, REG_MONTHLY_LIMIT - used), month };
  }

  function addRegularisation(req) {
    const month = String(req.date || '').slice(0, 7);
    const balance = getRegularisationBalance(req.employeeId, month);
    if (balance.remaining <= 0) {
      return { error: `No requests left for ${month} — the monthly limit is ${REG_MONTHLY_LIMIT}.` };
    }
    const full = {
      id: uid('reg'),
      type: req.type || 'adjust',
      entries: (req.entries || []).map((e) => ({ in: e.in || '', out: e.out || '', location: e.location || '' })),
      shift: req.shift || null,
      status: 'pending', decidedBy: null, decidedAt: null,
      auditTrail: [{ at: iso(new Date()), by: req.employeeId, action: 'submitted' }],
      ...req,
    };
    state.regularisations.push(full);
    state.notifications.push({ id: uid('ntf'), employeeId: req.employeeId, type: 'regularisation', message: `Regularisation for ${req.date} submitted.`, read: false, timestamp: iso(new Date()) });
    persist(); emit();
    return full;
  }

  /* Approving a time correction writes the requested times into the attendance
     log. Without this the request would be paperwork: the day would still read
     "missing" everywhere else in the app. */
  function applyRegularisation(r) {
    if (!r || r.type === 'other') return;
    const emp = getEmployee(r.employeeId); if (!emp) return;
    const geo = emp.siteId ? getSite(emp.siteId) : null;
    (r.entries || []).forEach((entry) => {
      [['in', 'clock-in'], ['out', 'clock-out']].forEach(([field, type]) => {
        if (!entry[field]) return;
        const ts = stampAt(r.date, entry[field]);
        const existing = state.attendance.find((a) => a.employeeId === r.employeeId && a.date === r.date && a.type === type);
        if (existing) {
          existing.timestamp = ts;
          existing.regularised = true;
        } else {
          state.attendance.push({
            id: uid('att'), employeeId: r.employeeId, type, date: r.date, timestamp: ts,
            latitude: geo ? geo.lat : 0, longitude: geo ? geo.lng : 0,
            insideGeofence: true, regularised: true, source: 'regularisation',
          });
        }
      });
    });
  }

  function decideRegularisation(id, decision, by) {
    const r = state.regularisations.find((x) => x.id === id); if (!r) return;
    r.status = decision; r.decidedBy = by; r.decidedAt = iso(new Date());
    r.auditTrail.push({ at: iso(new Date()), by, action: decision });
    if (decision === 'approved') applyRegularisation(r);
    state.notifications.push({ id: uid('ntf'), employeeId: r.employeeId, type: 'regularisation', message: `Your regularisation for ${r.date} was ${decision}.`, read: false, timestamp: iso(new Date()) });
    persist(); emit();
  }
  // legacy global slab CRUD (kept)
  function upsertSlab(slab, actor) {
    return guarded(actor, 'incentive.edit', () => {
      const before = slab.id ? (state.slabs.find((s) => s.id === slab.id) || null) : null;
      if (slab.id) { const i = state.slabs.findIndex((s) => s.id === slab.id); if (i >= 0) state.slabs[i] = slab; }
      else state.slabs.push({ ...slab, id: uid('slab') });
      logIncentiveAudit({ actor, action: before ? 'slab.updated' : 'slab.created', targetType: 'slab', targetId: slab.id, before, after: slab });
      persist(); emit();
    });
  }
  function deleteSlab(id, actor) {
    return guarded(actor, 'incentive.edit', () => {
      state.slabs = state.slabs.filter((s) => s.id !== id);
      persist(); emit();
    });
  }

  // store-specific slab template CRUD + assignment
  function upsertSlabTemplate(tpl, actor) {
    return guarded(actor, 'incentive.edit', () => {
      const before = tpl.id ? (state.slabTemplates.find((t) => t.id === tpl.id) || null) : null;
      let saved;
      if (tpl.id && state.slabTemplates.some((t) => t.id === tpl.id)) {
        const i = state.slabTemplates.findIndex((t) => t.id === tpl.id);
        state.slabTemplates[i] = { ...state.slabTemplates[i], ...tpl };
        saved = state.slabTemplates[i];
      } else {
        saved = { ...tpl, id: tpl.id || uid('tpl') };
        state.slabTemplates.push(saved);
      }
      logIncentiveAudit({ actor, action: before ? 'template.updated' : 'template.created', targetType: 'slab', targetId: saved.id, before, after: saved });
      persist(); emit();
      return saved;
    });
  }
  function deleteSlabTemplate(id, actor) {
    return guarded(actor, 'incentive.edit', () => {
      state.slabTemplates = state.slabTemplates.filter((t) => t.id !== id);
      state.sites.forEach((s) => { if (s.slabId === id) s.slabId = state.hierarchy.defaultSlabId; });
      state.employees.forEach((e) => { if (e.slabId === id) e.slabId = null; });
      persist(); emit();
    });
  }
  function assignSiteSlab(siteId, tplId, actor) {
    return guarded(actor, 'incentive.edit', () => {
      const s = getSite(siteId); if (s) { const before = s.slabId; s.slabId = tplId; logIncentiveAudit({ actor, action: 'slab.assigned', targetType: 'slab', targetId: siteId, before, after: tplId }); persist(); emit(); }
    });
  }
  function assignRegionSlab(region, tplId, actor) {
    return guarded(actor, 'incentive.edit', () => {
      state.sites.forEach((s) => { if (s.region === region) s.slabId = tplId; });
      logIncentiveAudit({ actor, action: 'slab.assigned', targetType: 'slab', targetId: region, before: null, after: tplId });
      persist(); emit();
    });
  }
  function assignEmployeeSlab(empId, tplId, actor) {
    return guarded(actor, 'incentive.edit', () => {
      const e = getEmployee(empId); if (e) { const before = e.slabId; e.slabId = tplId || null; logIncentiveAudit({ actor, action: 'slab.assigned', targetType: 'slab', targetId: empId, before, after: e.slabId }); persist(); emit(); }
    });
  }

  function upsertSite(site, actor) {
    // Manager ids are the source of truth; keep the legacy name fields in step so
    // the store table, search and CSV export keep showing readable names.
    const tl = getTeamLead(site.teamLeadId);
    const bm = getBusinessManager(site.bmId);
    const next = { ...site, cm: tl ? tl.name : (site.teamLeadId ? site.cm : ''), bm: bm ? bm.name : (site.bmId ? site.bm : '') };
    if (next.managerId) { const e = getEmployee(next.managerId); if (e) e.isStoreManager = true; }

    /* Incentive slab assignment rides along on the same form as the rest of the
       store record, but it is still an incentive edit — an actor without
       `incentive.edit` (HR, Team Lead) cannot change it here either, even
       though they may be allowed to save the store's other fields. Rather than
       reject the whole save, silently hold the incentive-affecting fields at
       their previous value so the rest of the edit still goes through. */
    const existing = next.id ? state.sites.find((s) => s.id === next.id) : null;
    if (!actorAllowed(actor, 'incentive.edit')) {
      next.slabId = existing ? existing.slabId : next.slabId;
      next.incentives = existing ? existing.incentives : next.incentives;
    }

    if (existing) { const i = state.sites.findIndex((s) => s.id === next.id); state.sites[i] = next; }
    else state.sites.push({ ...next, id: next.id || uid('site') });
    invalidate(); persist(); emit();
  }
  function deleteSite(id) { state.sites = state.sites.filter((s) => s.id !== id); invalidate(); persist(); emit(); }
  function updateSales(empId, month, totalSales) {
    let rec = getSales(empId, month);
    if (!rec) { rec = { id: uid('sal'), employeeId: empId, month, totalSales }; state.salesRecords.push(rec); salesIndex[empId + '|' + month] = rec; }
    else rec.totalSales = totalSales;
    achieveCache = {};
    persist(); emit();
  }
  function markNotificationRead(id) { const n = state.notifications.find((x) => x.id === id); if (n) { n.read = true; persist(); emit(); } }
  function markAllRead(empId) { state.notifications.filter((n) => n.employeeId === empId).forEach((n) => (n.read = true)); persist(); emit(); }

  // ---------- employee / site incentives ----------
  function updateEmployeeIncentives(empId, incentives, actor) {
    return guarded(actor, 'incentive.edit', () => {
      const e = getEmployee(empId); if (!e) return { error: 'Employee not found.' };
      const before = e.incentives || [];
      e.incentives = incentives || [];
      logIncentiveAudit({ actor, action: 'rule.updated', targetType: 'rule', targetId: empId, before, after: e.incentives });
      persist(); emit();
    });
  }
  function updateSiteIncentives(siteId, incentives, actor) {
    return guarded(actor, 'incentive.edit', () => {
      const s = getSite(siteId); if (!s) return { error: 'Store not found.' };
      const before = s.incentives || [];
      s.incentives = incentives || [];
      logIncentiveAudit({ actor, action: 'rule.updated', targetType: 'rule', targetId: siteId, before, after: s.incentives });
      invalidate(); persist(); emit();
    });
  }
  const getEmployeeIncentives = (empId) => (getEmployee(empId)?.incentives || []);
  const getSiteIncentives = (siteId) => (getSite(siteId)?.incentives || []);

  // ---------- incentive change audit trail ----------
  // Every slab/rule/target mutation above logs here, so the calculation drawer
  // can show real "who changed what, when" history rather than a raw diff.
  function logIncentiveAudit(entry) {
    if (!state.incentiveAudit) state.incentiveAudit = [];
    state.incentiveAudit.unshift({
      id: uid('iaud'), at: iso(new Date()),
      by: entry.actor ? (entry.actor.name || entry.actor.id) : 'system',
      byId: entry.actor ? entry.actor.id : null,
      action: entry.action, targetType: entry.targetType, targetId: entry.targetId,
      before: entry.before, after: entry.after,
    });
    // persisted alongside the mutation's own persist() call, not here — avoids a double write
  }
  function getIncentiveAudit(filter) {
    let list = state.incentiveAudit || [];
    if (filter?.empId) list = list.filter((a) => a.targetId === filter.empId);
    if (filter?.siteId) list = list.filter((a) => a.targetId === filter.siteId);
    return list;
  }

  // ---------- incentive bulk upload history ----------
  function addIncentiveUpload(upload) {
    if (!state.incentiveUploads) state.incentiveUploads = [];
    state.incentiveUploads.unshift({ id: uid('iup'), uploadedAt: iso(new Date()), ...upload });
    persist(); emit();
  }
  const getIncentiveUploads = () => (state.incentiveUploads || []);
  function updateConfig(patch) { Object.assign(state.config, patch); persist(); emit(); }

  // ---------- appreciation / kudos ----------
  const getKudos = (empId) => state.kudos.filter((k) => k.toId === empId).sort((a, b) => new Date(b.at) - new Date(a.at));
  function sendKudos({ fromId, toId, badge, message }) {
    const from = getEmployee(fromId);
    const k = { id: uid('kud'), fromId, fromName: from?.name || 'Manager', toId, badge: badge || 'Kudos', message, at: iso(new Date()) };
    state.kudos.push(k);
    state.notifications.push({ id: uid('ntf'), employeeId: toId, type: 'appreciation', message: `You received Kudos${badge ? ' · ' + badge : ''}: "${message}"`, read: false, timestamp: iso(new Date()) });
    persist(); emit();
    return k;
  }

  // ---------- developer-mode fraud detection ----------
  const getDevEvents = (empId, date) => state.devEvents.filter((d) => (!empId || d.employeeId === empId) && (!date || d.date === date));
  const isDevAbsent = (empId, date) => !!state.devAbsences[empId + '|' + (date || dateKey(TODAY))];
  // Simulate a Developer-Mode detection. Twice in a day => auto-mark absent for that day.
  function triggerDevMode(empId, date) {
    const d = date || dateKey(TODAY);
    const emp = getEmployee(empId);
    state.devEvents.push({ id: uid('dev'), employeeId: empId, date: d, at: iso(new Date()) });
    const count = state.devEvents.filter((x) => x.employeeId === empId && x.date === d).length;
    let autoAbsent = false;
    if (count >= 2 && !state.devAbsences[empId + '|' + d]) {
      state.devAbsences[empId + '|' + d] = true;
      autoAbsent = true;
      state.notifications.push({ id: uid('ntf'), employeeId: empId, type: 'security', message: `Developer Mode detected twice today — you have been auto-marked ABSENT for ${d} pending review.`, read: false, timestamp: iso(new Date()) });
    } else {
      state.notifications.push({ id: uid('ntf'), employeeId: empId, type: 'security', message: `⚠ Developer Mode detected on ${emp?.name || 'device'}. One more detection today will mark you absent.`, read: false, timestamp: iso(new Date()) });
    }
    persist(); emit();
    return { count, autoAbsent };
  }
  function clearDevMode(empId, date) {
    const d = date || dateKey(TODAY);
    state.devEvents = state.devEvents.filter((x) => !(x.employeeId === empId && x.date === d));
    delete state.devAbsences[empId + '|' + d];
    persist(); emit();
  }

  // ---------- geo-fence ----------
  function checkGeofence(empId, lat, lng) {
    const emp = getEmployee(empId);
    if (!emp) return { inside: false, distance: null, site: null, enforced: false };
    /* Geo-fencing off — office staff, or switched off for this person — means
       every position counts as inside. This is checked before the site lookup:
       office employees legitimately have no store, and a missing store must not
       be treated as "outside the fence" and block their clock-in. */
    if (emp.geoFenceEnabled === false) {
      return { inside: true, distance: 0, site: emp.siteId ? getSite(emp.siteId) : null, enforced: false };
    }
    const site = emp.siteId ? getSite(emp.siteId) : null;
    if (!site) return { inside: false, distance: null, site: null, enforced: false };
    const distance = haversine(lat, lng, site.lat, site.lng);
    return { inside: distance <= site.radius, distance, site, enforced: true };
  }

  /* ---------- employee lifecycle ----------
     Derived, never stored: New → Registration → Documents → Approval →
     Onboarding → Active. Each step is gated by data that already exists, so the
     rail can't claim a stage the record hasn't actually reached. */
  function getLifecycle(emp) {
    if (!emp) return { stage: 'new', index: 0, stages: LIFECYCLE_STAGES, label: 'New Employee' };
    const docs = emp.documents || {};
    const docsDone = REQUIRED_DOC_KEYS.every((k) => docs[k] && docs[k].status && docs[k].status !== 'missing');
    const kycDone = !!(emp.aadhaarMasked && emp.panMasked && emp.bankVerified);
    let stage;
    if (emp.status === 'active' && emp.joiningDate) stage = 'active';
    else if (emp.approvalStatus === 'approved') stage = 'onboarding';
    else if (emp.approvalStatus === 'pending-approval' || emp.approvalStatus === 'rejected') stage = 'approval';
    else if (docsDone || kycDone) stage = 'documents';
    else if (emp.name && (emp.phone || emp.email)) stage = 'registered';
    else stage = 'new';
    const index = LIFECYCLE_STAGES.findIndex((s) => s.id === stage);
    return { stage, index, stages: LIFECYCLE_STAGES, label: LIFECYCLE_STAGES[index].label, docsDone, kycDone };
  }

  /* "New" employees are those who joined recently or have not finished the
     lifecycle — the population the Employees ▸ New tab is about. */
  const NEW_JOINER_DAYS = 90;
  function isNewJoiner(emp) {
    if (!emp) return false;
    if (emp.status !== 'active') return emp.status === 'pending';
    if (!emp.joiningDate) return true;
    const days = (TODAY - new Date(emp.joiningDate)) / 86400000;
    return days >= 0 && days <= NEW_JOINER_DAYS;
  }

  // Live positions — only employees with a today attendance record carry live GPS
  // (i.e. those actually clocked in). O(n) via a today index. Keeps the map light.
  function getLivePositions() {
    const today = dateKey(TODAY);
    const byEmp = {};
    for (const a of state.attendance) {
      if (a.date !== today) continue;
      (byEmp[a.employeeId] = byEmp[a.employeeId] || []).push(a);
    }
    const out = [];
    Object.keys(byEmp).forEach((eid) => {
      const emp = getEmployee(eid);
      if (!emp || emp.status !== 'active' || emp.role !== 'field-employee') return;
      const site = getSite(emp.siteId); if (!site) return;
      const marks = byEmp[eid].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      const last = marks[marks.length - 1];
      out.push({ emp, site, lat: last.latitude, lng: last.longitude, inside: last.insideGeofence, last });
    });
    return out;
  }

  // ---------- init ----------
  load();

  window.Store = {
    TODAY,
    // reference data
    EMPLOYEE_TYPES, DESIGNATION_LADDERS, ALL_DESIGNATIONS, LIFECYCLE_STAGES, REQUIRED_DOC_KEYS, BLANK_ADDRESS,
    REG_TYPES, REG_MONTHLY_LIMIT, BANK_UPDATE_LIMIT, LOCKED_DOC_KEYS, DEFAULT_SHIFT,
    canonicalRole, isAdminRole,
    // selectors
    getEmployees, getUsers, getEmployee, getSites, getSite, getSlabs, getSlabTemplates, getSlabTemplate,
    getSales, getAttendance, getRegularisations, getNotifications, getPayrollRun, getLivePositions,
    getHierarchy, getKudos, getDevEvents, isDevAbsent, getTargets, incentiveDetail, resolveSlab, isPresentToday,
    getEmployeeIncentives, getSiteIncentives, getIncentiveUploads, findEmployeeByPhone,
    getLifecycle, isNewJoiner,
    // attendance log / regularisation
    getShift, getDayLog, getAttendanceMonth, getRegularisationBalance, HHMM, minutesOf,
    // document + bank + salary rules
    isDocumentLocked, bankUpdatesLeft, updateBankDetails, setSalary,
    // hierarchy
    getTeamLeads, getBusinessManagers, getTeamLead, getBusinessManager, getStoreManager,
    getSitesForTeamLead, getSitesForBusinessManager, getReportingChain, setSiteManager,
    get state() { return state; },
    // logic
    calcIncentive, computePayslip, runPayroll, countAttendance, checkGeofence, haversine,
    evalIncentiveRules, ruleAmount, RULE_CAP,
    storeTargetIncentive, validateEmail, roleCanSelfApprove,
    // store targets
    getStoreTargets, getStoreTarget, getStoreAchievement, getStoreTargetSummary,
    upsertStoreTarget, deleteStoreTarget,
    // policies
    getPolicies, upsertPolicy, deletePolicy, togglePolicy,
    // mutations
    updateEmployee, addEmployee, approveEmployee, rejectEmployee, addAttendance,
    submitForApproval, setDocumentStatus, updateDesignation, setGeoFence,
    addRegularisation, decideRegularisation, upsertSlab, deleteSlab,
    upsertSlabTemplate, deleteSlabTemplate, assignSiteSlab, assignRegionSlab, assignEmployeeSlab,
    upsertSite, deleteSite, updateSales, markNotificationRead, markAllRead, updateConfig,
    sendKudos, triggerDevMode, clearDevMode,
    updateEmployeeIncentives, updateSiteIncentives, addIncentiveUpload,
    getIncentiveAudit,
    // meta
    subscribe, reset,
  };
})();
