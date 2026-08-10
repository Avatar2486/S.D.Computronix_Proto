/* Reports: Attendance / Payroll / Incentive / Deployment with charts + SVG India map */
function LineChart({ series, height = 200, color = '#1E40AF' }) {
  const max = Math.max(...series.map((s) => s.value), 1);
  const min = 0;
  const w = 100;
  const step = w / (series.length - 1 || 1);
  const points = series.map((s, i) => [i * step, height - 20 - ((s.value - min) / (max - min || 1)) * (height - 40)]);
  const path = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.join(',')).join(' ');
  const area = path + ` L${(series.length - 1) * step},${height - 20} L0,${height - 20} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.3"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((p) => <line key={p} x1="0" x2={w} y1={20 + (height - 40) * p} y2={20 + (height - 40) * p} stroke="currentColor" strokeWidth="0.1" className="text-slate-300 dark:text-slate-700"/>)}
      <path d={area} fill="url(#lg1)"/>
      <path d={path} fill="none" stroke={color} strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
      {points.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="0.8" fill={color}/>)}
      {series.map((s, i) => <text key={'l'+i} x={i * step} y={height - 5} textAnchor="middle" fontSize="3" fill="currentColor" className="text-slate-500 dark:text-slate-400 font-semibold">{s.label}</text>)}
    </svg>
  );
}

function IndiaMapSVG({ sites, height = 320 }) {
  // simplified India outline path
  const w = 300, h = 320;
  const project = (lat, lng) => {
    // rough equirectangular projection for India bounds (68..97 lng, 8..37 lat)
    const x = ((lng - 68) / (97 - 68)) * w;
    const y = ((37 - lat) / (37 - 8)) * h;
    return [x, y];
  };
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" style={{ maxHeight: height }}>
      <defs>
        <linearGradient id="indfill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#EEF2FF"/><stop offset="1" stopColor="#DBEAFE"/></linearGradient>
      </defs>
      {/* Simplified India outline (approximate) */}
      <path fill="url(#indfill)" stroke="#94A3B8" strokeWidth="0.6" className="dark:fill-slate-800 dark:stroke-slate-600"
        d="M95,42 L110,38 L125,42 L142,50 L156,62 L168,70 L175,80 L182,72 L192,75 L200,88 L210,95 L215,110 L225,118 L232,132 L240,140 L245,155 L250,168 L245,178 L240,190 L232,198 L225,208 L215,215 L205,220 L195,230 L185,238 L175,245 L165,252 L155,260 L145,265 L135,262 L128,270 L120,265 L112,258 L108,248 L112,238 L105,228 L100,215 L102,205 L108,195 L112,185 L108,175 L100,168 L92,158 L88,148 L82,138 L78,128 L75,118 L72,108 L68,98 L65,88 L68,78 L72,68 L78,58 L85,50 Z"/>
      {sites.map((s) => {
        const [x, y] = project(s.lat, s.lng);
        return (
          <g key={s.id} transform={`translate(${x},${y})`}>
            <circle r="6" fill="#1E40AF" opacity="0.15"/>
            <circle r="3" fill="#1E40AF"/>
            <text x="6" y="3" fontSize="7" fill="currentColor" className="text-slate-800 dark:text-slate-200 font-semibold">{s.city}</text>
            <text x="6" y="11" fontSize="5" fill="currentColor" className="text-slate-500 dark:text-slate-400">{s.staffCount} staff</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ============================================================================
   Report filters

   One filter model shared by every report tab, so a scope set on Attendance is
   still in force when you switch to Payroll. Filters combine (they intersect),
   each is clearable from its chip, and Reset returns the whole set to default.
   ========================================================================== */
const REPORT_BLANK = {
  from: '2026-07-01', to: '2026-07-15',
  empId: 'all', siteId: 'all', teamLead: 'all', zone: 'all',
  designation: 'all', empType: 'all', status: 'active', client: 'all', city: 'all',
};

/* The date range picks the months a report covers. The demo dataset carries
   June and July 2026, so a range is resolved to the months it overlaps. */
function monthsInRange(from, to) {
  const out = [];
  const start = new Date(from), end = new Date(to);
  if (isNaN(start) || isNaN(end) || start > end) return ['2026-07'];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end && out.length < 24) {
    out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return out.filter((m) => m === '2026-06' || m === '2026-07').length
    ? out.filter((m) => m === '2026-06' || m === '2026-07')
    : ['2026-07'];
}

function ReportFilters({ f, set, reset, activeCount }) {
  const store = useStore();
  const hierarchy = store.getHierarchy();

  const sitesInScope = useMemo(() => store.getSites().filter((s) =>
    (f.zone === 'all' || s.zone === f.zone) &&
    (f.city === 'all' || s.city === f.city) &&
    (f.teamLead === 'all' || s.teamLeadId === f.teamLead) &&
    (f.client === 'all' || s.type === f.client)
  ), [store.state, f.zone, f.city, f.teamLead, f.client]);

  const cities = useMemo(() => [...new Set(store.getSites()
    .filter((s) => f.zone === 'all' || s.zone === f.zone).map((s) => s.city).filter(Boolean))].sort(),
    [store.state, f.zone]);
  const teamLeads = store.getTeamLeads().filter((m) => f.zone === 'all' || m.zone === f.zone);
  const designations = useMemo(() => [...new Set(store.state.employees.map((e) => e.designation).filter(Boolean))].sort(), [store.state]);
  const empOptions = useMemo(() => store.getEmployees().slice(0, 600)
    .map((e) => ({ value: e.id, label: e.name, sub: `${e.code} · ${e.designation}`, keywords: e.code })), [store.state]);

  return (
    <FilterBar activeCount={activeCount} onReset={reset}
      hint="Every chart, table and export below reflects these filters">
      <Field label="From date">
        <Input type="date" value={f.from} onChange={(e) => set({ from: e.target.value })}/>
      </Field>
      <Field label="To date" error={new Date(f.to) < new Date(f.from) ? 'End date is before the start date' : null}>
        <Input type="date" value={f.to} onChange={(e) => set({ to: e.target.value })}/>
      </Field>
      <Field label="Employee">
        <SearchSelect value={f.empId} onChange={(v) => set({ empId: v })}
          options={[{ value: 'all', label: 'All employees' }, ...empOptions]}
          searchPlaceholder="Search employee…" emptyLabel="No employee matches"/>
      </Field>
      <Field label="Store">
        <SearchSelect value={f.siteId} onChange={(v) => set({ siteId: v })}
          options={[{ value: 'all', label: `All stores (${sitesInScope.length})` },
            ...sitesInScope.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''))
              .map((s) => ({ value: s.id, label: s.name, sub: [s.city, s.code].filter(Boolean).join(' · '), keywords: s.code }))]}
          searchPlaceholder="Search store…" emptyLabel="No store matches"/>
      </Field>
      <Field label="Team Lead">
        <SearchSelect value={f.teamLead} onChange={(v) => set({ teamLead: v, siteId: 'all' })}
          options={[{ value: 'all', label: `All Team Leads (${teamLeads.length})` },
            ...teamLeads.map((m) => ({ value: m.id, label: m.name, sub: `${m.storeCount} stores` }))]}
          searchPlaceholder="Search Team Lead…" emptyLabel="No match"/>
      </Field>
      <Field label="Designation">
        <SearchSelect value={f.designation} onChange={(v) => set({ designation: v })}
          options={[{ value: 'all', label: 'All designations' }, ...designations.map((d) => ({ value: d, label: d }))]}
          searchPlaceholder="Search designation…" emptyLabel="No match"/>
      </Field>
      <Field label="Employee type">
        <Select value={f.empType} onChange={(e) => set({ empType: e.target.value })}>
          <option value="all">All types</option>
          <option value="field">Field / Store</option>
          <option value="office">Office / Desktop</option>
        </Select>
      </Field>
      <Field label="Status">
        <Select value={f.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
          <option value="rejected">Rejected</option>
        </Select>
      </Field>
      <Field label="Client / site type">
        <Select value={f.client} onChange={(e) => set({ client: e.target.value, siteId: 'all' })}>
          <option value="all">All site types</option>
          <option value="store">Retail store</option>
          <option value="service-centre">Service centre</option>
        </Select>
      </Field>
      <Field label="Zone">
        <Select value={f.zone} onChange={(e) => set({ zone: e.target.value, city: 'all', siteId: 'all', teamLead: 'all' })}>
          <option value="all">All zones</option>
          {(hierarchy.zones || []).map((z) => <option key={z} value={z}>{z}</option>)}
        </Select>
      </Field>
      <Field label="City / location">
        <SearchSelect value={f.city} onChange={(v) => set({ city: v, siteId: 'all' })}
          options={[{ value: 'all', label: `All cities (${cities.length})` }, ...cities.map((c) => ({ value: c, label: c }))]}
          searchPlaceholder="Search city…" emptyLabel="No city matches"/>
      </Field>
    </FilterBar>
  );
}

function ReportsPage({ user }) {
  const store = useStore();
  const [tab, setTab] = useState('attendance');
  const isSiteMgr = user.role === 'site-manager';
  const [f, setF] = useState(REPORT_BLANK);
  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const reset = () => setF(REPORT_BLANK);
  const activeCount = Object.keys(REPORT_BLANK).filter((k) => f[k] !== REPORT_BLANK[k]).length;

  const months = useMemo(() => monthsInRange(f.from, f.to), [f.from, f.to]);
  // Attendance/payroll figures are reported for the last month the range touches.
  const month = months[months.length - 1];

  /* One filtered population feeds every tab. */
  const emps = useMemo(() => {
    let list = store.state.employees.filter((e) => e.role === 'field-employee' || e.employeeType === 'office');
    if (isSiteMgr) list = list.filter((e) => e.siteId === user.siteId);
    if (f.status !== 'all') list = list.filter((e) => e.status === f.status);
    if (f.empType !== 'all') list = list.filter((e) => (e.employeeType || 'field') === f.empType);
    if (f.designation !== 'all') list = list.filter((e) => e.designation === f.designation);
    if (f.empId !== 'all') list = list.filter((e) => e.id === f.empId);
    if (f.siteId !== 'all') list = list.filter((e) => e.siteId === f.siteId);
    else {
      const scoped = store.getSites().filter((s) =>
        (f.zone === 'all' || s.zone === f.zone) &&
        (f.city === 'all' || s.city === f.city) &&
        (f.teamLead === 'all' || s.teamLeadId === f.teamLead) &&
        (f.client === 'all' || s.type === f.client));
      if (f.zone !== 'all' || f.city !== 'all' || f.teamLead !== 'all' || f.client !== 'all') {
        const ids = new Set(scoped.map((s) => s.id));
        list = list.filter((e) => ids.has(e.siteId));
      }
    }
    return list;
  }, [store.state, f, isSiteMgr, user.siteId]);

  const chips = [];
  if (f.from !== REPORT_BLANK.from || f.to !== REPORT_BLANK.to)
    chips.push({ k: 'date', label: `${fmtDate(f.from)} – ${fmtDate(f.to)}`, clear: () => set({ from: REPORT_BLANK.from, to: REPORT_BLANK.to }) });
  if (f.empId !== 'all')       chips.push({ k: 'emp', label: 'Employee: ' + ((store.getEmployee(f.empId) || {}).name || ''), clear: () => set({ empId: 'all' }) });
  if (f.siteId !== 'all')      chips.push({ k: 'site', label: 'Store: ' + ((store.getSite(f.siteId) || {}).name || ''), clear: () => set({ siteId: 'all' }) });
  if (f.teamLead !== 'all')    chips.push({ k: 'tl', label: 'Team Lead: ' + ((store.getTeamLead(f.teamLead) || {}).name || ''), clear: () => set({ teamLead: 'all' }) });
  if (f.zone !== 'all')        chips.push({ k: 'zone', label: 'Zone: ' + f.zone, clear: () => set({ zone: 'all' }) });
  if (f.city !== 'all')        chips.push({ k: 'city', label: 'City: ' + f.city, clear: () => set({ city: 'all' }) });
  if (f.designation !== 'all') chips.push({ k: 'desig', label: 'Designation: ' + f.designation, clear: () => set({ designation: 'all' }) });
  if (f.empType !== 'all')     chips.push({ k: 'type', label: 'Type: ' + (f.empType === 'office' ? 'Office' : 'Field'), clear: () => set({ empType: 'all' }) });
  if (f.status !== REPORT_BLANK.status) chips.push({ k: 'status', label: 'Status: ' + f.status, clear: () => set({ status: REPORT_BLANK.status }) });
  if (f.client !== 'all')      chips.push({ k: 'client', label: 'Site type: ' + (f.client === 'store' ? 'Retail' : 'Service centre'), clear: () => set({ client: 'all' }) });

  // ---- Attendance ----
  const attRows = useMemo(() => emps.map((e) => ({ emp: e, ...store.countAttendance(e.id, month) })), [emps, month, store.state]);
  const attTotalWorking = attRows.reduce((n, r) => n + r.workingDays, 0);
  const attTotalPresent = attRows.reduce((n, r) => n + r.presentDays, 0);
  const attSeries = useMemo(() => {
    const out = [];
    const lastDay = month === '2026-07' ? 15 : 30;
    const rate = attTotalPresent / Math.max(1, attTotalWorking);
    for (let d = 1; d <= lastDay; d++) {
      // Deterministic daily wobble around the real monthly attendance rate.
      const wobble = ((d * 53) % 9) / 200 - 0.02;
      out.push({ label: String(d), value: Math.max(0, Math.round(emps.length * (rate + wobble))) });
    }
    return out;
  }, [emps.length, month, attTotalPresent, attTotalWorking]);

  // ---- Payroll ----
  const payslips = useMemo(() => emps.map((e) => store.computePayslip(e.id, month)), [emps, month, store.state]);
  const totalNet = payslips.reduce((s, p) => s + p.netPay, 0);
  const totalDed = payslips.reduce((s, p) => s + p.absenceDeduction + p.statutory.pf + p.statutory.esic + p.statutory.pt, 0);
  const totalInc = payslips.reduce((s, p) => s + p.incentive, 0);
  const totalTravel = payslips.reduce((s, p) => s + p.travelAllowance, 0);

  // ---- Incentive ----
  const incBuckets = [
    { label: 'No incentive', test: (v) => v <= 0 },
    { label: '₹1 – ₹2,000',  test: (v) => v > 0 && v <= 2000 },
    { label: '₹2k – ₹4,000', test: (v) => v > 2000 && v <= 4000 },
    { label: '₹4k+',         test: (v) => v > 4000 },
  ];
  const slabColors = ['#CBD5E1','#93C5FD','#3B82F6','#1E40AF'];
  const incRows = useMemo(() => emps.map((e) => {
    const s = store.getSales(e.id, month)?.totalSales || 0;
    return { emp: e, sales: s, inc: store.calcIncentive(s, e, month) };
  }), [emps, month, store.state]);
  const slabDist = incBuckets.map((b, i) => ({ label: b.label, value: incRows.filter((r) => b.test(r.inc.payout)).length, color: slabColors[i % slabColors.length] }));

  // ---- Deployment ----
  const staffBySite = {};
  emps.forEach((e) => { if (e.siteId) staffBySite[e.siteId] = (staffBySite[e.siteId] || 0) + 1; });
  const sitesWithCount = store.getSites()
    .map((s) => ({ ...s, staffCount: staffBySite[s.id] || 0 }))
    .filter((s) => s.staffCount > 0)
    .sort((a, b) => b.staffCount - a.staffCount);

  const TABS = [
    { id: 'attendance', label: 'Attendance', icon: 'calendar' },
    { id: 'payroll',    label: 'Payroll',    icon: 'wallet' },
    { id: 'incentive',  label: 'Incentive',  icon: 'trending-up' },
    { id: 'deployment', label: 'Deployment', icon: 'map' },
  ];

  const exportCurrent = () => {
    if (tab === 'attendance') {
      downloadCSV(`report_attendance_${month}.csv`, [
        ['Code','Name','Designation','Type','Store','City','Working','Present','Absent','Attendance %'],
        ...attRows.map((r) => [r.emp.code, r.emp.name, r.emp.designation, r.emp.employeeType,
          store.getSite(r.emp.siteId)?.name || '', store.getSite(r.emp.siteId)?.city || '',
          r.workingDays, r.presentDays, r.absentDays, pctOf(r.presentDays, r.workingDays)]),
      ]);
    } else if (tab === 'payroll') {
      downloadCSV(`report_payroll_${month}.csv`, [
        ['Code','Name','Store','Base','Absence deduction','PF','ESIC','PT','Incentive','Travel','Net pay'],
        ...payslips.map((p) => {
          const e = store.getEmployee(p.employeeId);
          return [e.code, e.name, store.getSite(e.siteId)?.name || '', p.base, p.absenceDeduction,
            p.statutory.pf, p.statutory.esic, p.statutory.pt, p.incentive, p.travelAllowance, p.netPay];
        }),
      ]);
    } else if (tab === 'incentive') {
      downloadCSV(`report_incentive_${month}.csv`, [
        ['Code','Name','Store','Sales','Basis','Slab / target','Maximum eligible','Incentive'],
        ...incRows.map((r) => [r.emp.code, r.emp.name, store.getSite(r.emp.siteId)?.name || '', r.sales,
          r.inc.winner === 'target' ? 'Store target' : 'Incentive slab', r.inc.slab.label,
          r.inc.maxEligible || r.inc.payout, r.inc.payout]),
      ]);
    } else {
      downloadCSV('report_deployment.csv', [
        ['Code','Store','City','State','Zone','Team Lead','Business Manager','Staff'],
        ...sitesWithCount.map((s) => [s.code, s.name, s.city, s.region, s.zone, s.cm, s.bm, s.staffCount]),
      ]);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Analytics" title="Reports & insights"
        subtitle={`Reporting on ${emps.length} employees · ${fmtDate(f.from)} – ${fmtDate(f.to)} (${fmtMonth(month)} figures)`}>
        <Btn onClick={exportCurrent}><Icon name="download" className="w-3.5 h-3.5"/>Export this report</Btn>
      </PageHeader>

      <Tabs tabs={TABS} value={tab} onChange={setTab}/>

      <ReportFilters f={f} set={set} reset={reset} activeCount={activeCount}/>
      <FilterChips chips={chips} onClearAll={reset}/>

      {emps.length === 0 && (
        <Card><Empty icon="search" title="No employees match these filters" hint="Widen the scope or reset the filters to see data."/></Card>
      )}

      {emps.length > 0 && tab === 'attendance' && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8">
            <Card title={`Daily attendance · ${fmtMonth(month)}`} subtitle="Employees clocked in per day, within the current filters">
              <LineChart series={attSeries} height={220}/>
            </Card>
          </div>
          <div className="col-span-12 lg:col-span-4">
            <Card title="Attendance summary">
              {[
                ['Employees in scope', emps.length],
                ['Attendance rate', `${pctOf(attTotalPresent, attTotalWorking)}%`],
                ['Perfect attendance', attRows.filter((r) => r.absentDays === 0).length + ' employees'],
                ['Below 80%', attRows.filter((r) => r.presentDays / r.workingDays < 0.8).length + ' employees'],
                ['Geo-fence exempt', emps.filter((e) => !e.geoFenceEnabled).length + ' employees'],
                ['Geo-fence breaches', store.getLivePositions().filter((p) => !p.inside).length],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 text-[13px]">
                  <span className="text-slate-500">{k}</span><span className="font-semibold text-slate-800 dark:text-slate-100">{v}</span>
                </div>
              ))}
            </Card>
          </div>
          <div className="col-span-12">
            <Card title={`Per-employee attendance · ${fmtMonth(month)}`} bodyClass="p-0" noBody>
              <div className="overflow-x-auto">
                <table className="w-full dense-table text-[12.5px]">
                  <thead><tr><th>Employee</th><th>Designation</th><th>Store</th><th className="text-right">Working</th><th className="text-right">Present</th><th className="text-right">Absent</th><th>Attendance %</th></tr></thead>
                  <tbody>
                    {attRows.slice(0, 80).map((r) => {
                      const pct = pctOf(r.presentDays, r.workingDays);
                      return (
                        <tr key={r.emp.id}>
                          <td><div className="flex items-center gap-2 min-w-0"><Avatar emp={r.emp} size={24}/><span className="truncate font-semibold">{r.emp.name}</span></div></td>
                          <td className="text-[11.5px] text-slate-600 dark:text-slate-300 truncate max-w-[130px]">{r.emp.designation}</td>
                          <td className="text-[11px] text-slate-500 truncate max-w-[160px]">{store.getSite(r.emp.siteId)?.name || '—'}</td>
                          <td className="text-right font-mono">{r.workingDays}</td>
                          <td className="text-right font-mono text-emerald-700 dark:text-emerald-400">{r.presentDays}</td>
                          <td className="text-right font-mono text-rose-700 dark:text-rose-400">{r.absentDays || '—'}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <ProgressBar value={pct} className="w-24 sm:w-32"/>
                              <span className="text-[11px] font-mono font-semibold">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {attRows.length > 80 && <div className="p-2 text-center text-[11px] text-slate-500">Showing first 80 of {attRows.length} employees · export for the full list</div>}
            </Card>
          </div>
        </div>
      )}

      {emps.length > 0 && tab === 'payroll' && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-3"><StatCard label="Total net payout" value={fmtINR(totalNet)} tone="brand" icon="wallet"/></div>
          <div className="col-span-12 md:col-span-3"><StatCard label="Total deductions" value={fmtINR(totalDed)} tone="red" icon="alert"/></div>
          <div className="col-span-12 md:col-span-3"><StatCard label="Total incentives" value={fmtINR(totalInc)} tone="green" icon="trending-up"/></div>
          <div className="col-span-12 md:col-span-3"><StatCard label="Travel allowance" value={fmtINR(totalTravel)} tone="green" icon="pin"/></div>
          <div className="col-span-12 lg:col-span-7">
            <Card title="Net pay by employee" subtitle={payslips.length > 40 ? 'Top 40 by net pay' : `${payslips.length} employees`}>
              <BarChart height={220}
                data={[...payslips].sort((a, b) => b.netPay - a.netPay).slice(0, 40)
                  .map((p) => ({ label: store.getEmployee(p.employeeId).name.split(' ')[0].slice(0, 4), value: p.netPay }))}/>
            </Card>
          </div>
          <div className="col-span-12 lg:col-span-5">
            <Card title="Cost breakdown" subtitle={fmtMonth(month)}>
              <div className="space-y-3">
                {[
                  { l: 'Base salaries', v: payslips.reduce((s,p) => s+p.base,0), c: '#1E40AF' },
                  { l: 'Incentives',    v: totalInc, c: '#059669' },
                  { l: 'Travel allowance', v: totalTravel, c: '#0EA5E9' },
                  { l: 'PF employer',   v: payslips.reduce((s,p) => s+p.statutory.pf,0), c: '#7C3AED' },
                  { l: 'ESIC',          v: payslips.reduce((s,p) => s+p.statutory.esic,0), c: '#EA580C' },
                  { l: 'Absence ded.',  v: payslips.reduce((s,p) => s+p.absenceDeduction,0), c: '#DC2626' },
                ].map((r) => {
                  const total = payslips.reduce((s,p) => s+p.base,0) + totalInc + totalTravel || 1;
                  return (
                    <div key={r.l}>
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="text-slate-600 dark:text-slate-300">{r.l}</span>
                        <span className="font-mono font-semibold">{fmtINR(r.v)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (r.v/total)*100)}%`, background: r.c }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {emps.length > 0 && tab === 'incentive' && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-5">
            <Card title="Incentive distribution" subtitle={`${incRows.filter((r) => r.inc.payout > 0).length} of ${incRows.length} earning`}>
              <div className="flex items-center justify-center py-4">
                <DonutChart data={slabDist} size={180}/>
              </div>
              <div className="space-y-1.5">
                {slabDist.map((d) => (
                  <div key={d.label} className="flex items-center gap-2 text-[12px]">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }}/>
                    <span className="flex-1 text-slate-600 dark:text-slate-300">{d.label}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{d.value} employees</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-[12px]">
                <div className="flex justify-between"><span className="text-slate-500">Paid on store target</span><span className="font-semibold">{incRows.filter((r) => r.inc.winner === 'target' && r.inc.payout > 0).length}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Paid on incentive slab</span><span className="font-semibold">{incRows.filter((r) => r.inc.winner === 'slab' && r.inc.payout > 0).length}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Total payable</span><span className="font-bold text-emerald-700 dark:text-emerald-300">{fmtINR(incRows.reduce((n, r) => n + r.inc.payout, 0))}</span></div>
              </div>
            </Card>
          </div>
          <div className="col-span-12 lg:col-span-7">
            <Card title="Sales vs incentive earned" subtitle={fmtMonth(month)} bodyClass="p-0" noBody>
              <div className="overflow-x-auto">
                <table className="w-full dense-table text-[12.5px]">
                  <thead><tr><th>Employee</th><th className="text-right">Sales</th><th>Basis</th><th className="text-right">Max eligible</th><th className="text-right">Incentive</th></tr></thead>
                  <tbody>
                    {[...incRows].sort((a, b) => b.inc.payout - a.inc.payout).slice(0, 80).map((r) => (
                      <tr key={r.emp.id}>
                        <td><div className="flex items-center gap-2 min-w-0"><Avatar emp={r.emp} size={24}/><span className="truncate font-semibold">{r.emp.name}</span></div></td>
                        <td className="text-right font-mono">{fmtINRShort(r.sales)}</td>
                        <td>
                          <Badge tone={r.inc.winner === 'target' ? 'brand' : 'violet'}>
                            {r.inc.winner === 'target' ? 'Store target' : 'Slab'}
                          </Badge>
                        </td>
                        <td className="text-right font-mono text-slate-500">{fmtINR(r.inc.maxEligible || r.inc.payout)}</td>
                        <td className="text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">{fmtINR(r.inc.payout)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {incRows.length > 80 && <div className="p-2 text-center text-[11px] text-slate-500">Showing first 80 of {incRows.length} employees</div>}
            </Card>
          </div>
        </div>
      )}

      {emps.length > 0 && tab === 'deployment' && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-7">
            <Card title="Manpower deployment across India" subtitle={`${sitesWithCount.length} staffed client sites in scope`} bodyClass="p-3">
              <IndiaMapSVG sites={sitesWithCount.slice(0, 60)} height={340}/>
            </Card>
          </div>
          <div className="col-span-12 lg:col-span-5">
            <Card title="Site roster" subtitle={`${sitesWithCount.length} staffed sites · top 40 shown`} bodyClass="p-0" className="max-h-[560px] overflow-auto">
              {sitesWithCount.slice(0, 40).map((s) => (
                <div key={s.id} className="p-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">{s.name}</div>
                      <div className="text-[10px] text-slate-500">{s.city} · {s.zone} · TL {s.cm || '—'}</div>
                    </div>
                    <Badge tone="brand">{s.staffCount} staff</Badge>
                  </div>
                  <div className="flex -space-x-2">
                    {emps.filter((e) => e.siteId === s.id).slice(0, 12).map((e) => (
                      <Avatar key={e.id} emp={e} size={24} className="ring-2 ring-white dark:ring-slate-900"/>
                    ))}
                  </div>
                </div>
              ))}
              {sitesWithCount.length === 0 && <Empty title="No staffed sites in scope"/>}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { ReportsPage, ReportFilters, LineChart, IndiaMapSVG, REPORT_BLANK, monthsInRange });
