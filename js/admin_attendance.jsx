/* ============================================================================
   Attendance — a first-class section rather than a KPI on the dashboard.

     Overview        · org-level health for the month
     Daily           · one day, every employee, with the marks they made
     Monthly         · per-employee present/absent grid for the month
     Regularization  · the correction queue (no longer a separate nav item)

   There is no 2-hour selfie check anywhere: attendance is clock-in and
   clock-out only, and a missed mark is fixed through Regularization.
   ========================================================================== */

const ATT_MONTHS = [
  { id: '2026-07', label: 'July 2026' },
  { id: '2026-06', label: 'June 2026' },
];

/* Shared scope filter for every attendance tab, so switching tabs keeps the
   population you were looking at. */
function useAttendanceScope(user) {
  const store = useStore();
  const isSiteMgr = user.role === 'site-manager';
  const BLANK = { zone: 'all', siteId: 'all', teamLead: 'all', empType: 'all', designation: 'all', q: '' };
  const [f, setF] = useState(BLANK);
  const set = (patch) => setF((p) => ({ ...p, ...patch }));

  const sites = store.getSites();
  const sitesInScope = useMemo(() => sites.filter((s) =>
    (f.zone === 'all' || s.zone === f.zone) &&
    (f.teamLead === 'all' || s.teamLeadId === f.teamLead)
  ), [f.zone, f.teamLead, store.state]);

  const employees = useMemo(() => {
    let list = store.getEmployees({ status: 'active' });
    if (isSiteMgr) list = list.filter((e) => e.siteId === user.siteId);
    if (f.empType !== 'all') list = list.filter((e) => (e.employeeType || 'field') === f.empType);
    if (f.designation !== 'all') list = list.filter((e) => e.designation === f.designation);
    if (f.siteId !== 'all') list = list.filter((e) => e.siteId === f.siteId);
    else if (f.zone !== 'all' || f.teamLead !== 'all') {
      const ids = new Set(sitesInScope.map((s) => s.id));
      list = list.filter((e) => ids.has(e.siteId));
    }
    if (f.q) {
      const ql = f.q.trim().toLowerCase();
      list = list.filter((e) => (e.name || '').toLowerCase().includes(ql) || (e.code || '').toLowerCase().includes(ql));
    }
    return list;
  }, [store.state, f, isSiteMgr, user.siteId]);

  const activeCount = ['zone', 'siteId', 'teamLead', 'empType', 'designation'].filter((k) => f[k] !== 'all').length + (f.q ? 1 : 0);
  return { f, set, reset: () => setF(BLANK), employees, sitesInScope, activeCount, isSiteMgr };
}

function AttendanceFilters({ scope }) {
  const store = useStore();
  const { f, set, reset, activeCount, sitesInScope } = scope;
  const hierarchy = store.getHierarchy();
  const designations = useMemo(() => [...new Set(store.getEmployees({ status: 'active' }).map((e) => e.designation).filter(Boolean))].sort(), [store.state]);
  const teamLeads = store.getTeamLeads().filter((m) => f.zone === 'all' || m.zone === f.zone);

  return (
    <FilterBar activeCount={activeCount} onReset={reset} hint="Filters apply to every attendance tab">
      <Field label="Search">
        <Input value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="Name or code…"/>
      </Field>
      <Field label="Zone">
        <Select value={f.zone} onChange={(e) => set({ zone: e.target.value, siteId: 'all', teamLead: 'all' })}>
          <option value="all">All zones</option>
          {(hierarchy.zones || []).map((z) => <option key={z} value={z}>{z}</option>)}
        </Select>
      </Field>
      <Field label="Team Lead">
        <SearchSelect value={f.teamLead} onChange={(v) => set({ teamLead: v, siteId: 'all' })}
          options={[{ value: 'all', label: `All Team Leads (${teamLeads.length})` },
            ...teamLeads.map((m) => ({ value: m.id, label: m.name, sub: `${m.storeCount} stores` }))]}
          searchPlaceholder="Search Team Lead…" emptyLabel="No match"/>
      </Field>
      <Field label="Store">
        <SearchSelect value={f.siteId} onChange={(v) => set({ siteId: v })}
          options={[{ value: 'all', label: `All stores (${sitesInScope.length})` },
            ...sitesInScope.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''))
              .map((s) => ({ value: s.id, label: s.name, sub: [s.city, s.code].filter(Boolean).join(' · '), keywords: s.code }))]}
          searchPlaceholder="Search store…" emptyLabel="No store matches"/>
      </Field>
      <Field label="Employee type">
        <Select value={f.empType} onChange={(e) => set({ empType: e.target.value })}>
          <option value="all">All types</option>
          <option value="field">Field / Store</option>
          <option value="office">Office / Desktop</option>
        </Select>
      </Field>
      <Field label="Designation">
        <SearchSelect value={f.designation} onChange={(v) => set({ designation: v })}
          options={[{ value: 'all', label: 'All designations' }, ...designations.map((d) => ({ value: d, label: d }))]}
          searchPlaceholder="Search designation…" emptyLabel="No match"/>
      </Field>
    </FilterBar>
  );
}

/* ---------------- Overview ---------------- */
function AttendanceOverview({ scope, month, employees }) {
  const store = useStore();
  const counts = useMemo(() => employees.map((e) => ({ emp: e, ...store.countAttendance(e.id, month) })), [employees, month, store.state]);
  const totalWorking = counts.reduce((n, c) => n + c.workingDays, 0);
  const totalPresent = counts.reduce((n, c) => n + c.presentDays, 0);
  const perfect = counts.filter((c) => c.absentDays === 0).length;
  const atRisk = counts.filter((c) => c.presentDays / c.workingDays < 0.8);
  const presentToday = employees.filter((e) => store.isPresentToday(e)).length;
  const breaches = store.getLivePositions().filter((p) => !p.inside);
  const geoOff = employees.filter((e) => !e.geoFenceEnabled).length;

  // Daily present count across the month, computed from real clock-in marks.
  const days = useMemo(() => {
    const out = [];
    const [y, m] = month.split('-').map(Number);
    const lastDay = month === '2026-07' ? 15 : new Date(y, m, 0).getDate();
    const ids = new Set(employees.map((e) => e.id));
    const byDate = {};
    store.getAttendance({ month }).forEach((a) => {
      if (a.type !== 'clock-in' || !ids.has(a.employeeId)) return;
      (byDate[a.date] = byDate[a.date] || new Set()).add(a.employeeId);
    });
    for (let d = 1; d <= lastDay; d++) {
      const key = `${month}-${String(d).padStart(2, '0')}`;
      /* Only the six demo employees carry per-mark records; the 484 imported
         technicians carry monthly totals instead. Fall back to their monthly
         attendance rate so the curve reflects the whole workforce. */
      const recorded = byDate[key] ? byDate[key].size : 0;
      const modelled = Math.round((totalPresent / Math.max(1, totalWorking)) * (employees.length - 6));
      out.push({ label: String(d), value: recorded + Math.max(0, modelled) });
    }
    return out;
  }, [employees, month, store.state]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="In scope" value={employees.length} sub="Active employees" icon="users" tone="brand"/>
        <StatCard label="Present today" value={presentToday} sub={`${pctOf(presentToday, employees.length)}% of scope`} icon="check-circle" tone="green"/>
        <StatCard label="Absent today" value={employees.length - presentToday} sub="Regularisable" icon="calendar" tone="amber"/>
        <StatCard label="Attendance rate" value={`${pctOf(totalPresent, totalWorking)}%`} sub={fmtMonth(month)} icon="chart" tone="brand"/>
        <StatCard label="Perfect attendance" value={perfect} sub="Zero absences" icon="award" tone="green"/>
        <StatCard label="Out of geo-fence" value={breaches.length} sub={geoOff > 0 ? `${geoOff} exempt` : 'All enforced'} icon="alert" tone={breaches.length ? 'red' : 'slate'}/>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8">
          <Card title={`Daily attendance · ${fmtMonth(month)}`} subtitle="Employees clocked in per day">
            <BarChart data={days} height={200}/>
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <Card title="Month summary">
            {[
              ['Working days', store.state.config.workingDays],
              ['Total present days', totalPresent.toLocaleString('en-IN')],
              ['Total absent days', (totalWorking - totalPresent).toLocaleString('en-IN')],
              ['Perfect attendance', `${perfect} employees`],
              ['Below 80% attendance', `${atRisk.length} employees`],
              ['Geo-fence exempt', `${geoOff} employees`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 text-[13px]">
                <span className="text-slate-500">{k}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{v}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <Card title="Attention needed" subtitle="Employees below 80% attendance this month" bodyClass="p-0"
        right={<Badge tone={atRisk.length ? 'amber' : 'green'}>{atRisk.length}</Badge>}>
        {atRisk.length === 0
          ? <Empty icon="check-circle" title="Everyone is above 80%" hint="No attendance concerns in the current scope."/>
          : (
            <div className="overflow-x-auto">
              <table className="w-full dense-table text-[12.5px]">
                <thead><tr><th>Employee</th><th>Store</th><th className="text-right">Present</th><th className="text-right">Absent</th><th>Attendance</th></tr></thead>
                <tbody>
                  {atRisk.slice(0, 30).map((c) => (
                    <tr key={c.emp.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Avatar emp={c.emp} size={24}/>
                          <div className="min-w-0"><div className="font-semibold truncate">{c.emp.name}</div><div className="text-[10px] text-slate-500">{c.emp.designation}</div></div>
                        </div>
                      </td>
                      <td className="text-[11px] text-slate-500 truncate max-w-[180px]">{store.getSite(c.emp.siteId)?.name || '—'}</td>
                      <td className="text-right font-mono text-emerald-700">{c.presentDays}</td>
                      <td className="text-right font-mono text-rose-700">{c.absentDays}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <ProgressBar value={pctOf(c.presentDays, c.workingDays)} className="w-24"/>
                          <span className="text-[11px] font-mono font-semibold">{pctOf(c.presentDays, c.workingDays)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {atRisk.length > 30 && <div className="p-2 text-center text-[11px] text-slate-500">Showing 30 of {atRisk.length}</div>}
            </div>
          )}
      </Card>
    </div>
  );
}

/* ---------------- Daily ---------------- */
function AttendanceDaily({ employees }) {
  const store = useStore();
  const [date, setDate] = useState('2026-07-15');
  const [page, setPage] = useState(0);
  const PER = 25;

  const rows = useMemo(() => {
    const marks = store.getAttendance({ date });
    const byEmp = {};
    marks.forEach((m) => { (byEmp[m.employeeId] = byEmp[m.employeeId] || []).push(m); });
    return employees.map((e) => {
      const list = (byEmp[e.id] || []).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      const inMark = list.find((m) => m.type === 'clock-in');
      const outMark = list.find((m) => m.type === 'clock-out');
      /* Imported technicians have no per-mark records; their monthly figures
         imply presence, so treat isPresentToday as the fallback for today. */
      const present = inMark ? true : (date === '2026-07-15' ? store.isPresentToday(e) : false);
      const hours = inMark && outMark ? (new Date(outMark.timestamp) - new Date(inMark.timestamp)) / 3600000 : null;
      return { emp: e, inMark, outMark, present, hours, breach: list.some((m) => m.insideGeofence === false) };
    });
  }, [employees, date, store.state]);

  useEffect(() => { setPage(0); }, [date, employees.length]);
  const present = rows.filter((r) => r.present).length;
  const pages = Math.ceil(rows.length / PER) || 1;
  const shown = rows.slice(page * PER, page * PER + PER);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Present" value={present} sub={`${pctOf(present, rows.length)}% of ${rows.length}`} icon="check-circle" tone="green"/>
        <StatCard label="Absent" value={rows.length - present} icon="x" tone="red"/>
        <StatCard label="Clocked out" value={rows.filter((r) => r.outMark).length} sub="Completed shifts" icon="clock" tone="brand"/>
        <StatCard label="Fence breaches" value={rows.filter((r) => r.breach).length} icon="alert" tone={rows.some((r) => r.breach) ? 'red' : 'slate'}/>
      </div>

      <Card noBody
        title="Daily attendance register" subtitle={fmtDate(date, { year: true })}
        right={
          <div className="flex items-center gap-2">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="!w-auto !h-7"/>
            <Btn size="xs" onClick={() => downloadCSV(`attendance_${date}.csv`, [
              ['Code','Name','Designation','Store','Status','Clock in','Clock out','Hours','Inside fence'],
              ...rows.map((r) => [r.emp.code, r.emp.name, r.emp.designation, store.getSite(r.emp.siteId)?.name || '',
                r.present ? 'Present' : 'Absent',
                r.inMark ? fmtTime(r.inMark.timestamp) : '', r.outMark ? fmtTime(r.outMark.timestamp) : '',
                r.hours ? r.hours.toFixed(1) : '', r.breach ? 'No' : 'Yes']),
            ])}><Icon name="download" className="w-3 h-3"/>Export</Btn>
          </div>
        }>
        <div className="overflow-x-auto">
          <table className="w-full dense-table text-[12.5px]">
            <thead>
              <tr><th>Employee</th><th>Store</th><th>Status</th><th>Clock in</th><th>Clock out</th><th className="text-right">Hours</th><th>Geo-fence</th></tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.emp.id} className={r.present ? '' : 'bg-rose-50/40 dark:bg-rose-950/10'}>
                  <td>
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar emp={r.emp} size={26}/>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">{r.emp.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{r.emp.code} · {r.emp.designation}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-[11.5px] text-slate-600 dark:text-slate-300 truncate max-w-[170px]">{store.getSite(r.emp.siteId)?.name || '—'}</td>
                  <td><StatusBadge status={r.present ? 'active' : 'inactive'} label={r.present ? 'Present' : 'Absent'}/></td>
                  <td className="font-mono text-[11.5px]">{r.inMark ? fmtTime(r.inMark.timestamp) : <span className="text-slate-400">—</span>}</td>
                  <td className="font-mono text-[11.5px]">{r.outMark ? fmtTime(r.outMark.timestamp) : <span className="text-slate-400">—</span>}</td>
                  <td className="text-right font-mono text-[11.5px]">{r.hours != null ? r.hours.toFixed(1) + 'h' : '—'}</td>
                  <td>
                    {!r.emp.geoFenceEnabled ? <Badge tone="slate">Exempt</Badge>
                      : r.breach ? <Badge tone="red">Outside</Badge>
                      : r.inMark ? <Badge tone="green">Inside</Badge>
                      : <span className="text-slate-400 text-[11px]">—</span>}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7}><Empty title="No employees in scope"/></td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={pages} total={rows.length} per={PER} onPage={setPage} unit="employees"/>
      </Card>
    </div>
  );
}

/* ---------------- Monthly ---------------- */
function AttendanceMonthly({ employees, month }) {
  const store = useStore();
  const [page, setPage] = useState(0);
  const PER = 25;
  const rows = useMemo(
    () => employees.map((e) => ({ emp: e, ...store.countAttendance(e.id, month) }))
      .sort((a, b) => a.presentDays / a.workingDays - b.presentDays / b.workingDays),
    [employees, month, store.state]
  );
  useEffect(() => { setPage(0); }, [month, employees.length]);
  const pages = Math.ceil(rows.length / PER) || 1;
  const shown = rows.slice(page * PER, page * PER + PER);

  return (
    <Card noBody
      title={`Monthly attendance · ${fmtMonth(month)}`}
      subtitle={`${rows.length} employees · sorted by lowest attendance first`}
      right={<Btn size="xs" onClick={() => downloadCSV(`attendance_${month}.csv`, [
        ['Code','Name','Designation','Type','Store','Working days','Present','Absent','Attendance %'],
        ...rows.map((r) => [r.emp.code, r.emp.name, r.emp.designation, r.emp.employeeType === 'office' ? 'Office' : 'Field',
          store.getSite(r.emp.siteId)?.name || '', r.workingDays, r.presentDays, r.absentDays, pctOf(r.presentDays, r.workingDays)]),
      ])}><Icon name="download" className="w-3 h-3"/>Export</Btn>}>
      <div className="overflow-x-auto">
        <table className="w-full dense-table text-[12.5px]">
          <thead>
            <tr><th>Employee</th><th>Store</th><th className="text-right">Working</th><th className="text-right">Present</th><th className="text-right">Absent</th><th>Attendance</th></tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const pct = pctOf(r.presentDays, r.workingDays);
              return (
                <tr key={r.emp.id}>
                  <td>
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar emp={r.emp} size={26}/>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">{r.emp.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{r.emp.code} · {r.emp.designation}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-[11.5px] text-slate-600 dark:text-slate-300 truncate max-w-[170px]">{store.getSite(r.emp.siteId)?.name || '—'}</td>
                  <td className="text-right font-mono">{r.workingDays}</td>
                  <td className="text-right font-mono text-emerald-700 dark:text-emerald-400">{r.presentDays}</td>
                  <td className="text-right font-mono text-rose-700 dark:text-rose-400">{r.absentDays || '—'}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <ProgressBar value={pct} className="w-24 sm:w-32"/>
                      <span className={`text-[11px] font-mono font-semibold ${pct >= 95 ? 'text-emerald-600' : pct >= 80 ? 'text-slate-600 dark:text-slate-300' : 'text-rose-600'}`}>{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6}><Empty title="No employees in scope"/></td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={pages} total={rows.length} per={PER} onPage={setPage} unit="employees"/>
    </Card>
  );
}

/* ---------------- Regularization ----------------
   Lives inside Attendance, not as its own nav item. */
function AttendanceRegularization({ user }) {
  const store = useStore();
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const [detail, setDetail] = useState(null);
  const isSiteMgr = user.role === 'site-manager';
  const canDecide = can(user, 'attendance.decide');

  let list = store.getRegularisations();
  if (isSiteMgr) list = list.filter((r) => store.getEmployee(r.employeeId)?.siteId === user.siteId);
  const scoped = list;
  if (status !== 'all') list = list.filter((r) => r.status === status);

  const decide = (r, decision) => {
    Store.decideRegularisation(r.id, decision, user.id);
    toast(`Regularisation ${decision} — the affected payslip recomputes automatically`, decision === 'approved' ? 'success' : 'warn');
    setDetail(null);
  };

  const STATUS_TABS = ['pending', 'approved', 'rejected', 'all'].map((t) => ({
    id: t,
    label: t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1),
    badge: t === 'all' ? 0 : scoped.filter((r) => r.status === t).length,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Pending" value={scoped.filter((r) => r.status === 'pending').length} icon="clock" tone="amber"/>
        <StatCard label="Approved" value={scoped.filter((r) => r.status === 'approved').length} icon="check-circle" tone="green"/>
        <StatCard label="Rejected" value={scoped.filter((r) => r.status === 'rejected').length} icon="x" tone="red"/>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Tabs tabs={STATUS_TABS} value={status} onChange={setStatus} variant="pill"/>
        <div className="text-[11.5px] text-slate-500">
          Employees raise these from the mobile app · approvals recompute the affected payslip.
        </div>
      </div>

      <Card noBody>
        <div className="overflow-x-auto">
          <table className="w-full dense-table text-[12.5px]">
            <thead><tr><th>Employee</th><th>Date</th><th>Reason</th><th className="hidden md:table-cell">Submitted</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {list.map((r) => {
                const emp = store.getEmployee(r.employeeId);
                return (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td>
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar emp={emp} size={26}/>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">{emp?.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{store.getSite(emp?.siteId)?.name || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-[11.5px]">{fmtDate(r.date, { year: true })}</td>
                    <td className="max-w-[240px] truncate" title={r.reason}>{r.reason}</td>
                    <td className="hidden md:table-cell text-[11px] text-slate-500">{fmtDateTime(r.auditTrail?.[0]?.at)}</td>
                    <td><StatusBadge status={r.status}/></td>
                    <td>
                      <div className="flex gap-1.5 justify-end">
                        <Btn size="xs" onClick={() => setDetail(r)}>View</Btn>
                        {r.status === 'pending' && canDecide && (
                          <>
                            <Btn size="xs" variant="success" onClick={() => decide(r, 'approved')}>Approve</Btn>
                            <Btn size="xs" variant="danger" onClick={() => decide(r, 'rejected')}>Reject</Btn>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={6}><Empty icon="check-circle" title="Nothing here" hint="No requests match this filter."/></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {detail && (() => {
        const emp = store.getEmployee(detail.employeeId);
        return (
          <Modal open onClose={() => setDetail(null)} size="md" icon="calendar"
            title="Regularisation request" subtitle={`${emp?.name} · ${fmtDate(detail.date, { year: true })}`}
            footer={detail.status === 'pending' && canDecide ? (
              <>
                <Btn onClick={() => setDetail(null)}>Cancel</Btn>
                <Btn variant="danger" onClick={() => decide(detail, 'rejected')}>Reject</Btn>
                <Btn variant="success" onClick={() => decide(detail, 'approved')}>Approve</Btn>
              </>
            ) : <Btn variant="primary" onClick={() => setDetail(null)}>Close</Btn>}>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <Avatar emp={emp} size={40}/>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white truncate">{emp?.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {emp?.designation} · {store.getSite(emp?.siteId)?.name || 'Unassigned'}
                  </div>
                </div>
                <div className="ml-auto"><StatusBadge status={detail.status}/></div>
              </div>
              <Field label="Date"><div className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{fmtDate(detail.date, { year: true })}</div></Field>
              <Field label="Reason"><div className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{detail.reason}</div></Field>
              <Field label="Details"><div className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">{detail.details || '—'}</div></Field>
              <Field label="Audit trail">
                <div className="space-y-1.5 text-[12px]">
                  {(detail.auditTrail || []).map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0"/>
                      <div className="text-slate-600 dark:text-slate-300">
                        {fmtDateTime(a.at)} — <span className="capitalize font-semibold">{a.action}</span> by{' '}
                        <span className="font-mono text-[11px]">{(store.getEmployee(a.by) || {}).name || a.by}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Field>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

/* ---------------- Page shell ---------------- */
function AttendancePage({ user }) {
  const store = useStore();
  const [tab, setTab] = useState('overview');
  const [month, setMonth] = useState('2026-07');
  const scope = useAttendanceScope(user);

  const pendingRegs = store.getRegularisations({ status: 'pending' }).length;
  const TABS = [
    { id: 'overview',       label: 'Overview',       icon: 'chart' },
    { id: 'daily',          label: 'Daily',          icon: 'clock' },
    { id: 'monthly',        label: 'Monthly',        icon: 'calendar' },
    { id: 'regularization', label: 'Regularization', icon: 'edit', badge: pendingRegs },
  ];

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="People" title="Attendance"
        subtitle="Clock-in and clock-out records, monthly rollups, and attendance corrections.">
        {tab !== 'regularization' && (
          <Select value={month} onChange={(e) => setMonth(e.target.value)} className="!w-auto">
            {ATT_MONTHS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </Select>
        )}
      </PageHeader>

      <Tabs tabs={TABS} value={tab} onChange={setTab}/>

      {tab !== 'regularization' && <AttendanceFilters scope={scope}/>}

      {tab === 'overview'       && <AttendanceOverview scope={scope} month={month} employees={scope.employees}/>}
      {tab === 'daily'          && <AttendanceDaily employees={scope.employees}/>}
      {tab === 'monthly'        && <AttendanceMonthly employees={scope.employees} month={month}/>}
      {tab === 'regularization' && <AttendanceRegularization user={user}/>}
    </div>
  );
}

Object.assign(window, {
  AttendancePage, AttendanceOverview, AttendanceDaily, AttendanceMonthly,
  AttendanceRegularization, AttendanceFilters, useAttendanceScope,
});
