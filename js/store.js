/* S.D. Computronix — in-memory store, seed, business logic. Global: window.Store
   Real-world data (562 stores, 484 technicians, store-specific incentive slabs,
   zone/region hierarchy) is loaded from window.SDCData (js/data.js, generated
   from the ZOB Report + Payout Slab xlsx). A small set of "demo" employees/sites
   with rich seeded attendance/GPS trails is kept so the live map, camera clock-in
   and payroll demos stay lively. */
(function () {
  'use strict';

  const LS_KEY = 'sdc_hrms_v3';           // bumped: schema change (real data + new modules)
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
    const demoEmployees = [
      { id: 'emp_001', code: 'SDC001', name: 'Rahul Verma',  phone: '+91 98200 11001', email: 'rahul.v@sdc.in',  role: 'field-employee', status: 'active',  siteId: 'site_mum', joiningDate: '2025-11-04', aadhaarMasked: 'XXXX-XXXX-4321', panMasked: 'ABXXX7845N', bankVerified: true, baseSalary: 18000, avatarHue: 210, travelEligible: true,  travelAmount: 2000, demo: true },
      { id: 'emp_002', code: 'SDC002', name: 'Priya Nair',   phone: '+91 98200 11002', email: 'priya.n@sdc.in',  role: 'field-employee', status: 'active',  siteId: 'site_mum', joiningDate: '2025-08-12', aadhaarMasked: 'XXXX-XXXX-7712', panMasked: 'CDXXX2210K', bankVerified: true, baseSalary: 16000, avatarHue: 340, travelEligible: false, travelAmount: 1500, demo: true },
      { id: 'emp_003', code: 'SDC003', name: 'Amit Sharma',  phone: '+91 98110 22003', email: 'amit.s@sdc.in',   role: 'field-employee', status: 'active',  siteId: 'site_del', joiningDate: '2025-06-01', aadhaarMasked: 'XXXX-XXXX-9021', panMasked: 'EFXXX9083P', bankVerified: true, baseSalary: 15000, avatarHue: 25,  travelEligible: true,  travelAmount: 2500, demo: true },
      { id: 'emp_004', code: 'SDC004', name: 'Sneha Iyer',   phone: '+91 98400 33004', email: 'sneha.i@sdc.in',  role: 'field-employee', status: 'active',  siteId: 'site_blr', joiningDate: '2026-01-20', aadhaarMasked: 'XXXX-XXXX-5580', panMasked: 'GHXXX4432L', bankVerified: true, baseSalary: 14000, avatarHue: 165, travelEligible: false, travelAmount: 1000, demo: true },
      { id: 'emp_005', code: 'SDC005', name: 'Vikram Singh', phone: '+91 98110 44005', email: 'vikram.s@sdc.in', role: 'field-employee', status: 'active',  siteId: 'site_del', joiningDate: '2025-09-18', aadhaarMasked: 'XXXX-XXXX-1197', panMasked: 'IJXXX7719Q', bankVerified: true, baseSalary: 15000, avatarHue: 265, travelEligible: true,  travelAmount: 2000, demo: true },
      { id: 'emp_006', code: 'SDC006', name: 'Kavya Reddy',  phone: '+91 98860 55006', email: 'kavya.r@sdc.in',  role: 'field-employee', status: 'active',  siteId: 'site_pun', joiningDate: '2025-12-02', aadhaarMasked: 'XXXX-XXXX-2263', panMasked: 'KLXXX3390M', bankVerified: true, baseSalary: 17000, avatarHue: 300, travelEligible: false, travelAmount: 1500, demo: true },
      // Pending onboarding
      { id: 'emp_007', code: 'SDC007', name: 'Arjun Mehta',  phone: '+91 98330 66007', email: 'arjun.m@sdc.in',  role: 'field-employee', status: 'pending', siteId: 'site_mum', joiningDate: '', aadhaarMasked: 'XXXX-XXXX-8842', panMasked: 'MNXXX5501Z', bankVerified: true, baseSalary: 15000, avatarHue: 130, travelEligible: false, travelAmount: 0, submittedAt: iso(TODAY), demo: true },
      // Admin & managers (role picker)
      { id: 'usr_admin', code: 'ADM01', name: 'Neha Kapoor',  phone: '+91 98111 00001', email: 'neha.k@sdc.in',  role: 'super-admin', status: 'active', siteId: null, joiningDate: '2024-01-10', avatarHue: 220, baseSalary: 0 },
      { id: 'usr_hr',    code: 'HR001', name: 'Rohit Sinha',  phone: '+91 98111 00002', email: 'rohit.s@sdc.in', role: 'hr-manager',  status: 'active', siteId: null, joiningDate: '2024-05-14', avatarHue: 190, baseSalary: 0 },
      { id: 'usr_sm',    code: 'SM001', name: 'Ananya Rao',   phone: '+91 98111 00003', email: 'ananya.r@sdc.in',role: 'site-manager', status: 'active', siteId: 'site_mum', joiningDate: '2024-03-22', avatarHue: 40, baseSalary: 0 },
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

    const employees = demoEmployees.concat(realEmployees);

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
    const today = dateKey(TODAY);
    empIds.forEach((eid, i) => {
      const emp = employees.find((e) => e.id === eid);
      const site = siteById[emp.siteId];
      const inFence = eid !== 'emp_005';
      const jitterLat = inFence ? (Math.random() - 0.5) * 0.0008 : 0.008;
      const jitterLng = inFence ? (Math.random() - 0.5) * 0.0008 : 0.011;
      const dt = new Date(2026, 6, 15, 10, 4 + i);
      attendance.push({ id: uid('att'), employeeId: eid, date: today, type: 'clock-in', timestamp: iso(dt), latitude: site.lat + (Math.random() - 0.5) * 0.0004, longitude: site.lng + (Math.random() - 0.5) * 0.0004, insideGeofence: true, photoUrl: null });
      [12, 14].forEach((hh) => {
        const t = new Date(2026, 6, 15, hh, Math.floor(Math.random() * 20));
        attendance.push({ id: uid('att'), employeeId: eid, date: today, type: '2hr-check', timestamp: iso(t), latitude: site.lat + jitterLat + (Math.random() - 0.5) * 0.0006, longitude: site.lng + jitterLng + (Math.random() - 0.5) * 0.0006, insideGeofence: eid !== 'emp_005', photoUrl: null });
      });
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

    const regularisations = [
      { id: uid('reg'), employeeId: 'emp_002', date: '2026-07-07', reason: 'Client visit ran late', details: 'Was at Croma Andheri assisting a customer beyond shift end. Missed clock-out.', status: 'pending', decidedBy: null, decidedAt: null, auditTrail: [{ at: iso(new Date(2026,6,8,9,20)), by: 'emp_002', action: 'submitted' }] },
      { id: uid('reg'), employeeId: 'emp_003', date: '2026-07-04', reason: 'Network issue at site',  details: 'Mobile network down during clock-in window.', status: 'approved', decidedBy: 'usr_hr', decidedAt: iso(new Date(2026,6,5,11,10)), auditTrail: [{ at: iso(new Date(2026,6,5,8,10)), by: 'emp_003', action: 'submitted' }, { at: iso(new Date(2026,6,5,11,10)), by: 'usr_hr', action: 'approved' }] },
    ];

    const notifications = [
      { id: uid('ntf'), employeeId: 'emp_001', type: 'payroll',      message: 'Payroll for June credited: ₹18,000',            read: false, timestamp: iso(new Date(2026,6,1,10,0)) },
      { id: uid('ntf'), employeeId: 'emp_001', type: 'geofence',     message: 'Reminder: 2-hour location check due at 14:00',  read: false, timestamp: iso(new Date(2026,6,15,13,55)) },
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

    return {
      sites, employees, attendance, salesRecords,
      slabs, slabTemplates,
      regularisations, notifications, kudos, devEvents, devAbsences,
      hierarchy: { zones: D.zones || [], regions: D.regions || [], businessManagers: D.businessManagers || [], clusterManagers: D.clusterManagers || [], defaultSlabId: D.defaultSlabId || null },
      payrolls: [],
      incentiveUploads: [],
      config: { workingDays: 30, pfPct: 0.12, esicPct: 0.0075, pt: 200, defaultTravelAllowance: 1500 },
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
      if (s) { state = JSON.parse(s); buildIndexes(); return; }
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
  // calcIncentive(sales, emp?) — emp makes it store-specific; without emp, legacy global.
  function calcIncentive(sales, emp) {
    if (emp) {
      const { template } = resolveSlab(emp);
      if (template) {
        if (template.kind === 'none' || !template.tiers?.length) return { payout: 0, slab: { id: template.id, label: template.label || 'No incentive' }, template };
        const { payout } = payoutFromTiers(template.tiers, sales);
        return { payout, slab: { id: template.id, label: template.label }, template };
      }
    }
    // legacy global bands
    const slabs = getSlabs();
    for (const s of slabs) {
      const hi = s.maxSales == null ? Infinity : s.maxSales;
      if (sales >= s.minSales && sales <= hi) return { payout: s.payout, slab: s };
    }
    const top = slabs[slabs.length - 1];
    return { payout: top.payout, slab: top };
  }

  // Rich detail for the mobile progress UI — normalised tiers + next-tier hint.
  function incentiveDetail(emp, month) {
    const sales = getSales(emp.id, month)?.totalSales || 0;
    const { source, template } = resolveSlab(emp);
    const fmtAmt = (n) => (n >= 100000 ? '₹' + (n / 100000).toFixed(n % 100000 ? 1 : 0) + 'L' : n >= 1000 ? '₹' + Math.round(n / 1000) + 'k' : '₹' + n);
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
      const { payout } = payoutFromTiers(template.tiers, sales);
      const base = current ? current.from : 0;
      const span = next ? next.from - base : Math.max(1, sales - base);
      return {
        mode: 'template', source, raw: template.raw, label: template.label, sales, payout,
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
      mode: 'global', source: 'global', raw: 'Company default bands', label: inc.slab.label, sales, payout: inc.payout, tiers,
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
    const { payout: incentive, slab } = calcIncentive(sales, emp);
    const travelAllowance = emp.travelEligible ? (emp.travelAmount || state.config.defaultTravelAllowance) : 0;
    const netPay = emp.baseSalary - absenceDeduction - (pf + esic + pt) + incentive + travelAllowance;
    return {
      employeeId: empId, month, workingDays, presentDays, absentDays,
      base: emp.baseSalary, absenceDeduction,
      statutory: { pf, esic, pt, total: pf + esic + pt },
      sales, incentive, incentiveSlab: slab, travelAllowance,
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
  function invalidate() { state._eidx = null; state._sidx = null; }
  function updateEmployee(id, patch) {
    const e = getEmployee(id); if (!e) return;
    Object.assign(e, patch);
    persist(); emit();
  }
  function addEmployee(emp) {
    const full = { id: uid('emp'), code: 'SDC' + (100 + state.employees.length), status: 'pending', role: 'field-employee', baseSalary: 15000, avatarHue: Math.floor(Math.random() * 360), travelEligible: false, travelAmount: 0, submittedAt: iso(new Date()), ...emp };
    state.employees.push(full);
    invalidate(); persist(); emit();
    return full;
  }
  function approveEmployee(id, siteId) {
    const e = getEmployee(id); if (!e) return;
    e.status = 'active'; e.siteId = siteId || e.siteId || 'site_mum';
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
    e.rejectionReason = reason || '';
    e.rejectedAt = iso(new Date());
    state.notifications.push({ id: uid('ntf'), employeeId: id, type: 'onboarding', message: reason ? `Your application needs attention: ${reason}` : 'Your onboarding application was not approved.', read: false, timestamp: iso(new Date()) });
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
  function addRegularisation(req) {
    const full = { id: uid('reg'), status: 'pending', decidedBy: null, decidedAt: null, auditTrail: [{ at: iso(new Date()), by: req.employeeId, action: 'submitted' }], ...req };
    state.regularisations.push(full);
    state.notifications.push({ id: uid('ntf'), employeeId: req.employeeId, type: 'regularisation', message: `Regularisation for ${req.date} submitted.`, read: false, timestamp: iso(new Date()) });
    persist(); emit();
    return full;
  }
  function decideRegularisation(id, decision, by) {
    const r = state.regularisations.find((x) => x.id === id); if (!r) return;
    r.status = decision; r.decidedBy = by; r.decidedAt = iso(new Date());
    r.auditTrail.push({ at: iso(new Date()), by, action: decision });
    state.notifications.push({ id: uid('ntf'), employeeId: r.employeeId, type: 'regularisation', message: `Your regularisation for ${r.date} was ${decision}.`, read: false, timestamp: iso(new Date()) });
    persist(); emit();
  }
  // legacy global slab CRUD (kept)
  function upsertSlab(slab) {
    if (slab.id) { const i = state.slabs.findIndex((s) => s.id === slab.id); if (i >= 0) state.slabs[i] = slab; }
    else state.slabs.push({ ...slab, id: uid('slab') });
    persist(); emit();
  }
  function deleteSlab(id) { state.slabs = state.slabs.filter((s) => s.id !== id); persist(); emit(); }

  // store-specific slab template CRUD + assignment
  function upsertSlabTemplate(tpl) {
    if (tpl.id && state.slabTemplates.some((t) => t.id === tpl.id)) {
      const i = state.slabTemplates.findIndex((t) => t.id === tpl.id);
      state.slabTemplates[i] = { ...state.slabTemplates[i], ...tpl };
    } else {
      state.slabTemplates.push({ ...tpl, id: tpl.id || uid('tpl') });
    }
    persist(); emit();
  }
  function deleteSlabTemplate(id) {
    state.slabTemplates = state.slabTemplates.filter((t) => t.id !== id);
    state.sites.forEach((s) => { if (s.slabId === id) s.slabId = state.hierarchy.defaultSlabId; });
    state.employees.forEach((e) => { if (e.slabId === id) e.slabId = null; });
    persist(); emit();
  }
  function assignSiteSlab(siteId, tplId) { const s = getSite(siteId); if (s) { s.slabId = tplId; persist(); emit(); } }
  function assignRegionSlab(region, tplId) { state.sites.forEach((s) => { if (s.region === region) s.slabId = tplId; }); persist(); emit(); }
  function assignEmployeeSlab(empId, tplId) { const e = getEmployee(empId); if (e) { e.slabId = tplId || null; persist(); emit(); } }

  function upsertSite(site) {
    if (site.id && state.sites.some((s) => s.id === site.id)) { const i = state.sites.findIndex((s) => s.id === site.id); state.sites[i] = site; }
    else state.sites.push({ ...site, id: site.id || uid('site') });
    invalidate(); persist(); emit();
  }
  function deleteSite(id) { state.sites = state.sites.filter((s) => s.id !== id); invalidate(); persist(); emit(); }
  function updateSales(empId, month, totalSales) {
    let rec = getSales(empId, month);
    if (!rec) { rec = { id: uid('sal'), employeeId: empId, month, totalSales }; state.salesRecords.push(rec); salesIndex[empId + '|' + month] = rec; }
    else rec.totalSales = totalSales;
    persist(); emit();
  }
  function markNotificationRead(id) { const n = state.notifications.find((x) => x.id === id); if (n) { n.read = true; persist(); emit(); } }
  function markAllRead(empId) { state.notifications.filter((n) => n.employeeId === empId).forEach((n) => (n.read = true)); persist(); emit(); }

  // ---------- employee / site incentives ----------
  function updateEmployeeIncentives(empId, incentives) {
    const e = getEmployee(empId); if (!e) return;
    e.incentives = incentives || [];
    persist(); emit();
  }
  function updateSiteIncentives(siteId, incentives) {
    const s = getSite(siteId); if (!s) return;
    s.incentives = incentives || [];
    invalidate(); persist(); emit();
  }
  const getEmployeeIncentives = (empId) => (getEmployee(empId)?.incentives || []);
  const getSiteIncentives = (siteId) => (getSite(siteId)?.incentives || []);

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
    if (!emp || !emp.siteId) return { inside: false, distance: null, site: null };
    const site = getSite(emp.siteId);
    if (!site) return { inside: false, distance: null, site: null };
    const distance = haversine(lat, lng, site.lat, site.lng);
    return { inside: distance <= site.radius, distance, site };
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
    // selectors
    getEmployees, getUsers, getEmployee, getSites, getSite, getSlabs, getSlabTemplates, getSlabTemplate,
    getSales, getAttendance, getRegularisations, getNotifications, getPayrollRun, getLivePositions,
    getHierarchy, getKudos, getDevEvents, isDevAbsent, getTargets, incentiveDetail, resolveSlab, isPresentToday,
    getEmployeeIncentives, getSiteIncentives, getIncentiveUploads, findEmployeeByPhone,
    get state() { return state; },
    // logic
    calcIncentive, computePayslip, runPayroll, countAttendance, checkGeofence, haversine,
    // mutations
    updateEmployee, addEmployee, approveEmployee, rejectEmployee, addAttendance,
    addRegularisation, decideRegularisation, upsertSlab, deleteSlab,
    upsertSlabTemplate, deleteSlabTemplate, assignSiteSlab, assignRegionSlab, assignEmployeeSlab,
    upsertSite, deleteSite, updateSales, markNotificationRead, markAllRead, updateConfig,
    sendKudos, triggerDevMode, clearDevMode,
    updateEmployeeIncentives, updateSiteIncentives, addIncentiveUpload,
    // meta
    subscribe, reset,
  };
})();
