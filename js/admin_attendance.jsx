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
  const isSiteMgr = roleOf(user) === 'site-manager';
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

/* ============================================================================
   The attendance log — one square per day, per employee
   ----------------------------------------------------------------------------
   Reading a month as a strip of coloured days is how attendance is actually
   scanned: you are looking for the one cell that is the wrong colour. Clicking
   that cell opens the day itself — shift, location, the two clock stamps, and
   what is missing — with Regularize offered right there, because that is the
   moment you know you need it.
   ========================================================================== */
const DAY_TONE = {
  'on-time':    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  late:         'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  incomplete:   'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  absent:       'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  'weekly-off': 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
  upcoming:     'bg-slate-50 text-slate-300 dark:bg-slate-800/50 dark:text-slate-600',
  // Imported roster: monthly totals only, no per-day clock stamps to show.
  'no-data':    'bg-slate-50 text-slate-300 dark:bg-slate-800/50 dark:text-slate-600 border border-dashed border-slate-300 dark:border-slate-700',
};

function DayCell({ day, onOpen }) {
  const n = Number(day.date.slice(-2));
  const pending = day.regularisation && day.regularisation.status === 'pending';
  const label = STATUS_TONES[day.status] ? STATUS_TONES[day.status][1] : day.status;
  return (
    <button onClick={() => onOpen(day)} disabled={day.isFuture}
      title={`${fmtDate(day.date, { year: true })} · ${label}${day.inTime ? ' · in ' + fmtHHMM(day.inTime) : ''}${day.outTime ? ' · out ' + fmtHHMM(day.outTime) : ''}`}
      className={`relative w-6 h-6 rounded text-[9.5px] font-bold flex items-center justify-center transition ${DAY_TONE[day.status]} ${day.isFuture ? 'cursor-default' : 'hover:ring-2 hover:ring-brand-400'}`}>
      {n}
      {pending && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-violet-500"/>}
      {day.regularisation && day.regularisation.status === 'approved' && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-brand-500"/>}
    </button>
  );
}

function DayLogLegend() {
  return (
    <div className="flex items-center gap-3 flex-wrap text-[10.5px] text-slate-500">
      {['on-time', 'late', 'incomplete', 'absent', 'weekly-off', 'no-data'].map((s) => (
        <span key={s} className="flex items-center gap-1">
          <span className={`w-3 h-3 rounded ${DAY_TONE[s]}`}/>{STATUS_TONES[s][1]}
        </span>
      ))}
      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-500"/>Regularisation raised</span>
    </div>
  );
}

/* One day, opened from its cell. */
function DayLogModal({ day, emp, user, onClose, onRegularize }) {
  const store = useStore();
  const shift = day.shift;
  const reg = day.regularisation;
  /* HR and Admin correct anyone's log; an employee corrects their own. A Team
     Lead can look but not act — corrections are an HR decision. */
  const mayRaise = can(user, 'attendance.decide') || user.id === emp.id;

  const row = (icon, k, v, tone) => (
    <div className="flex items-center gap-2.5 px-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <Icon name={icon} className="w-3.5 h-3.5 text-slate-400 shrink-0"/>
      <span className="text-[11.5px] text-slate-500 flex-1">{k}</span>
      <span className={`text-[12px] font-semibold font-mono ${tone || 'text-slate-800 dark:text-slate-100'}`}>{v}</span>
    </div>
  );

  return (
    <Modal open onClose={onClose} size="sm" bodyClass="p-0" icon="calendar"
      title={fmtDate(day.date, { year: true })}
      subtitle={`${emp.name} · ${shift.name} (${fmtHHMM(shift.start)} – ${fmtHHMM(shift.end)})`}
      footer={<>
        <Btn onClick={onClose}>Close</Btn>
        {mayRaise && day.regularisable && !reg && (
          <Btn variant="primary" onClick={() => onRegularize(day)}>
            <Icon name="edit" className="w-3.5 h-3.5"/>Regularize
          </Btn>
        )}
      </>}>
      <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <StatusBadge status={day.status}/>
        <span className="text-[11px] text-slate-500 truncate">{shift.location}</span>
      </div>

      <div>
        {row('sign-in', 'Clock in', day.inTime ? fmtHHMM(day.inTime) : 'MISSING', day.inTime ? '' : 'text-rose-600')}
        {row('sign-out', 'Clock out', day.outTime ? fmtHHMM(day.outTime) : 'MISSING', day.outTime ? '' : 'text-rose-600')}
        {row('clock', 'Gross hours', day.grossMinutes ? fmtDuration(day.grossMinutes) : '—')}
        {day.marks.some((m) => m.insideGeofence === false) && row('alert', 'Geo-fence', 'Outside', 'text-rose-600')}
        {day.marks.some((m) => m.regularised) && row('history', 'Source', 'Regularised', 'text-violet-600')}
      </div>

      {reg && (
        <div className="m-3 p-2.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">Regularisation</span>
            <StatusBadge status={reg.status}/>
          </div>
          <div className="text-[11.5px] text-slate-600 dark:text-slate-300 mt-1">{reg.reason}</div>
          {(reg.entries || []).map((e, i) => (
            <div key={i} className="text-[11px] font-mono text-slate-500 mt-0.5">
              Requested: {e.in ? fmtHHMM(e.in) : '—'} → {e.out ? fmtHHMM(e.out) : '—'}
            </div>
          ))}
        </div>
      )}

      {!day.regularisable && !reg && (
        <div className="p-3 text-[11.5px] text-slate-400 italic">
          {day.weekend ? 'Weekly off — nothing to correct.'
            : day.isFuture ? 'This day has not happened yet.'
            : !day.hasMarks ? 'No clock log exists for this month — this employee’s attendance is imported as a monthly total.'
            : 'Both clock stamps are present and on time.'}
        </div>
      )}
    </Modal>
  );
}

/* ---------------- Regularization request ----------------
   The employee states the times they want the log to read, not just that it is
   wrong — so approving the request is a data change the rest of the app can
   see, rather than a note attached to a bad day. */
function RegularizationRequestModal({ emp, day, user, onClose, onSubmitted }) {
  const store = useStore();
  const toast = useToast();
  const shift = day.shift;
  const month = day.date.slice(0, 7);
  const balance = store.getRegularisationBalance(emp.id, month);

  const [type, setType] = useState('adjust');
  const [entries, setEntries] = useState(() => [{
    in: day.inTime || '', out: day.outTime || '', location: shift.location || '',
  }]);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [showBalance, setShowBalance] = useState(false);

  const setEntry = (i, patch) => setEntries((list) => list.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const addLog = () => setEntries((list) => list.concat([{ in: '', out: '', location: shift.location || '' }]));
  const dropLog = (i) => setEntries((list) => list.filter((_, j) => j !== i));

  const noTimes = type === 'adjust' && !entries.some((e) => e.in || e.out);
  const blocked = balance.remaining <= 0;

  const submit = () => {
    if (blocked) { toast(`No requests left for ${fmtMonth(month)}`, 'error'); return; }
    if (!reason.trim()) { toast('Add a reason for the correction', 'warn'); return; }
    if (noTimes) { toast('Set at least one clock time, or switch to Others', 'warn'); return; }
    const res = Store.addRegularisation({
      employeeId: emp.id, date: day.date, type,
      shift: { start: shift.start, end: shift.end, name: shift.name, location: shift.location },
      entries: type === 'adjust' ? entries.filter((e) => e.in || e.out) : [],
      reason: reason.trim(), details: note.trim(),
    });
    if (res && res.error) { toast(res.error, 'error'); return; }
    toast(`Regularisation requested for ${fmtDate(day.date)} — pending HR approval`, 'success');
    onSubmitted && onSubmitted(res);
    onClose();
  };

  return (
    <Modal open onClose={onClose} size="md" icon="edit"
      title="Request Attendance Regularization" subtitle={emp.name}
      footer={<>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={submit} disabled={blocked}>Request</Btn>
      </>}>
      <div className="space-y-4">
        {/* Date + shift, so the times below have a frame of reference */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[10.5px] uppercase tracking-wide font-bold text-slate-500">Selected date</div>
            <div className="text-[14px] font-bold text-slate-900 dark:text-white">{fmtDate(day.date, { year: true })}</div>
          </div>
          <div className="text-right">
            <div className="text-[10.5px] uppercase tracking-wide font-bold text-slate-500">Shift timings</div>
            <div className="text-[14px] font-bold text-slate-900 dark:text-white">{fmtHHMM(shift.start)} – {fmtHHMM(shift.end)}</div>
          </div>
        </div>

        {/* Request type — "Others" covers everything that is not a clock time */}
        <div className="space-y-2">
          {Store.REG_TYPES.map((t) => (
            <label key={t.id} className="flex items-start gap-2.5 cursor-pointer">
              <input type="radio" name="regtype" checked={type === t.id} onChange={() => setType(t.id)}
                className="accent-brand-700 w-4 h-4 mt-0.5 shrink-0"/>
              <div className="min-w-0">
                <div className={`text-[12.5px] ${type === t.id ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>{t.label}</div>
                {type === t.id && <div className="text-[11px] text-slate-500 mt-0.5">{t.hint}</div>}
              </div>
            </label>
          ))}
        </div>

        {/* Monthly allowance, stated before the form is filled in */}
        <div className={`flex items-center gap-2 text-[11.5px] px-2.5 py-1.5 rounded-md ${
          blocked ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'}`}>
          <Icon name="info" className="w-3.5 h-3.5 shrink-0"/>
          <span>Remaining balance: <span className="font-bold">{balance.remaining} request{balance.remaining === 1 ? '' : 's'}</span></span>
          <button onClick={() => setShowBalance((v) => !v)} className="text-brand-700 dark:text-brand-300 font-semibold hover:underline ml-auto">
            {showBalance ? 'Hide details' : 'View Details'}
          </button>
        </div>
        {showBalance && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 text-[11.5px]">
            {[
              ['Month', fmtMonth(month)],
              ['Monthly limit', `${balance.limit} requests`],
              ['Used so far', `${balance.used} request${balance.used === 1 ? '' : 's'}`],
              ['Remaining', `${balance.remaining}`],
            ].map(([k, v]) => (
              <div key={k} className="px-3 py-1.5 flex justify-between">
                <span className="text-slate-500">{k}</span><span className="font-semibold text-slate-800 dark:text-slate-100">{v}</span>
              </div>
            ))}
          </div>
        )}

        {type === 'adjust' && (
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">Attendance Adjustment</div>
              <Btn size="xs" onClick={addLog}><Icon name="plus" className="w-3 h-3"/>Add Log</Btn>
            </div>
            <div className="text-[11px] text-slate-500 mb-2">{shift.location}</div>
            <div className="space-y-2">
              {entries.map((e, i) => (
                <div key={i} className="flex items-center gap-2 flex-wrap">
                  <Icon name="sign-in" className="w-3.5 h-3.5 text-emerald-600 shrink-0"/>
                  {e.in
                    ? <TimeInput value={e.in} onChange={(v) => setEntry(i, { in: v })} className="w-[110px]"/>
                    : <button onClick={() => setEntry(i, { in: shift.start })}
                        className="h-8 px-3 rounded-md bg-rose-500 text-white text-[11px] font-bold tracking-wide">MISSING</button>}
                  <Icon name="sign-out" className="w-3.5 h-3.5 text-rose-500 shrink-0"/>
                  {e.out
                    ? <TimeInput value={e.out} onChange={(v) => setEntry(i, { out: v })} className="w-[110px]"/>
                    : <button onClick={() => setEntry(i, { out: shift.end })}
                        className="h-8 px-3 rounded-md bg-rose-500 text-white text-[11px] font-bold tracking-wide">MISSING</button>}
                  {entries.length > 1 && (
                    <button onClick={() => dropLog(i)} className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-600 text-slate-400 hover:text-rose-600 hover:border-rose-400 flex items-center justify-center shrink-0" aria-label="Remove log">
                      <Icon name="x" className="w-3.5 h-3.5"/>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5">
              A red MISSING box means no stamp was recorded — click it to fill in the shift time, then adjust.
            </div>
          </div>
        )}

        <Field label="Reason">
          <Input value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder={type === 'adjust' ? 'Missed clock-out, network issue…' : 'On duty at a client site, work from home…'}/>
        </Field>
        <Field label="Note">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Enter note"/>
        </Field>
      </div>
    </Modal>
  );
}

/* ---------------- Monthly ---------------- */
function AttendanceMonthly({ employees, month, user }) {
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

  /* The day strip is per employee and only for the visible page — building it
     for all 490 people would mean 15,000 day lookups on every render. */
  const [openDay, setOpenDay] = useState(null);   // { day, emp }
  const [regFor, setRegFor] = useState(null);     // { day, emp }
  const logs = useMemo(
    () => Object.fromEntries(shown.map((r) => [r.emp.id, store.getAttendanceMonth(r.emp.id, month)])),
    [shown.map((r) => r.emp.id).join(','), month, store.state]
  );

  return (
    <>
    <Card noBody
      title={`Monthly attendance · ${fmtMonth(month)}`}
      subtitle={`${rows.length} employees · sorted by lowest attendance first · click any day to open its log`}
      right={<Btn size="xs" onClick={() => downloadCSV(`attendance_${month}.csv`, [
        ['Code','Name','Designation','Type','Store','Working days','Present','Absent','Attendance %'],
        ...rows.map((r) => [r.emp.code, r.emp.name, r.emp.designation, r.emp.employeeType === 'office' ? 'Office' : 'Field',
          store.getSite(r.emp.siteId)?.name || '', r.workingDays, r.presentDays, r.absentDays, pctOf(r.presentDays, r.workingDays)]),
      ])}><Icon name="download" className="w-3 h-3"/>Export</Btn>}>
      <div className="overflow-x-auto">
        <table className="w-full dense-table text-[12.5px]">
          <thead>
            <tr><th>Employee</th><th className="hidden lg:table-cell">Store</th><th className="text-right">Present</th><th className="text-right">Absent</th><th>Attendance</th><th>Log</th></tr>
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
                  <td className="hidden lg:table-cell text-[11.5px] text-slate-600 dark:text-slate-300 truncate max-w-[170px]">{store.getSite(r.emp.siteId)?.name || '—'}</td>
                  <td className="text-right font-mono text-emerald-700 dark:text-emerald-400">{r.presentDays}<span className="text-slate-400">/{r.workingDays}</span></td>
                  <td className="text-right font-mono text-rose-700 dark:text-rose-400">{r.absentDays || '—'}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <ProgressBar value={pct} className="w-16 sm:w-24"/>
                      <span className={`text-[11px] font-mono font-semibold ${pct >= 95 ? 'text-emerald-600' : pct >= 80 ? 'text-slate-600 dark:text-slate-300' : 'text-rose-600'}`}>{pct}%</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-[3px] flex-wrap max-w-[260px] xl:max-w-none">
                      {(logs[r.emp.id] || []).map((d) => (
                        <DayCell key={d.date} day={d} onOpen={(day) => setOpenDay({ day, emp: r.emp })}/>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6}><Empty title="No employees in scope"/></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800"><DayLogLegend/></div>
      <Pagination page={page} pages={pages} total={rows.length} per={PER} onPage={setPage} unit="employees"/>
    </Card>

    {openDay && (
      <DayLogModal day={openDay.day} emp={openDay.emp} user={user}
        onClose={() => setOpenDay(null)}
        onRegularize={(day) => { setRegFor({ day, emp: openDay.emp }); setOpenDay(null); }}/>
    )}
    {regFor && (
      <RegularizationRequestModal emp={regFor.emp} day={regFor.day} user={user} onClose={() => setRegFor(null)}/>
    )}
    </>
  );
}


/* ============================================================================
   Regularization — the correction queue
   ----------------------------------------------------------------------------
   Deciding a correction rewrites somebody's attendance, and attendance drives
   pay. That makes it an HR/Admin decision: a Team Lead can see their store's
   requests but cannot approve one. `attendance.decide` is the single gate.
   ========================================================================== */
function AttendanceRegularization({ user }) {
  const store = useStore();
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState(null);
  const [raiseFor, setRaiseFor] = useState(null);   // { emp, day }
  const [pickEmp, setPickEmp] = useState(false);
  const isSiteMgr = roleOf(user) === 'site-manager';
  const canDecide = can(user, 'attendance.decide');

  let list = store.getRegularisations();
  if (isSiteMgr) list = list.filter((r) => store.getEmployee(r.employeeId)?.siteId === user.siteId);
  const scoped = list;
  if (status !== 'all') list = list.filter((r) => r.status === status);
  if (type !== 'all') list = list.filter((r) => (r.type || 'adjust') === type);
  if (q) {
    const ql = q.trim().toLowerCase();
    list = list.filter((r) => {
      const e = store.getEmployee(r.employeeId);
      return `${e ? e.name : ''} ${e ? e.code : ''} ${r.reason || ''} ${r.date}`.toLowerCase().includes(ql);
    });
  }
  list = [...list].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const decide = (r, decision) => {
    if (!canDecide) { toast('Only HR and Admin can decide a regularisation', 'error'); return; }
    Store.decideRegularisation(r.id, decision, user.id);
    toast(decision === 'approved'
      ? `Approved — the attendance log and the affected payslip are updated`
      : 'Rejected — the attendance log is unchanged', decision === 'approved' ? 'success' : 'warn');
    setDetail(null);
  };

  const STATUS_TABS = ['pending', 'approved', 'rejected', 'all'].map((t) => ({
    id: t,
    label: t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1),
    badge: t === 'all' ? 0 : scoped.filter((r) => r.status === t).length,
  }));

  const exportCSV = () => downloadCSV(`regularisations_${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Date', 'Employee', 'Code', 'Store', 'Type', 'Requested in', 'Requested out', 'Reason', 'Details', 'Status', 'Decided by', 'Decided at'],
    ...list.map((r) => {
      const e = store.getEmployee(r.employeeId) || {};
      const first = (r.entries || [])[0] || {};
      const by = r.decidedBy ? (store.getEmployee(r.decidedBy) || {}).name || r.decidedBy : '';
      return [r.date, e.name || '', e.code || '', (store.getSite(e.siteId) || {}).name || '',
        r.type === 'other' ? 'Others' : 'Time adjustment',
        first.in || '', first.out || '', r.reason || '', r.details || '', r.status, by,
        r.decidedAt ? fmtDateTime(r.decidedAt) : ''];
    }),
  ]);

  /* Print writes the visible register into a hidden print-area block, so the
     browser's own "Save as PDF" produces the record without a PDF library. */
  const printRegister = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Pending" value={scoped.filter((r) => r.status === 'pending').length} icon="clock" tone="amber"/>
        <StatCard label="Approved" value={scoped.filter((r) => r.status === 'approved').length} icon="check-circle" tone="green"/>
        <StatCard label="Rejected" value={scoped.filter((r) => r.status === 'rejected').length} icon="x" tone="red"/>
        <StatCard label="Time corrections" value={scoped.filter((r) => (r.type || 'adjust') === 'adjust').length}
          sub={`${scoped.filter((r) => r.type === 'other').length} other requests`} icon="edit" tone="brand"/>
      </div>

      {!canDecide && (
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
          <Icon name="lock" className="w-4 h-4 text-slate-400 shrink-0 mt-px"/>
          <div className="text-[12px] text-slate-600 dark:text-slate-300">
            You can review your store's requests, but approving or rejecting an attendance correction is
            reserved for <span className="font-semibold">HR and Admin</span> — a correction changes pay.
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Tabs tabs={STATUS_TABS} value={status} onChange={setStatus} variant="pill"/>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <Icon name="search" className="w-3.5 h-3.5 text-slate-400"/>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, code or reason…"
              className="bg-transparent text-[12px] outline-none w-32 sm:w-44 dark:text-slate-100"/>
          </div>
          <Select value={type} onChange={(e) => setType(e.target.value)} className="!w-auto">
            <option value="all">All request types</option>
            <option value="adjust">Time adjustment</option>
            <option value="other">Others</option>
          </Select>
          {canDecide && (
            <Btn size="sm" variant="primary" onClick={() => setPickEmp(true)}>
              <Icon name="plus" className="w-3.5 h-3.5"/>Raise request
            </Btn>
          )}
          <Btn size="sm" onClick={printRegister}><Icon name="print" className="w-3.5 h-3.5"/>Print / Save PDF</Btn>
          <Btn size="sm" onClick={exportCSV}><Icon name="download" className="w-3.5 h-3.5"/>Export CSV</Btn>
        </div>
      </div>

      <Card noBody>
        <div className="overflow-x-auto">
          <table className="w-full dense-table text-[12.5px]">
            <thead><tr>
              <th>Employee</th><th>Date</th><th>Type</th><th>Requested times</th>
              <th className="hidden lg:table-cell">Reason</th><th>Status</th><th className="text-right">Actions</th>
            </tr></thead>
            <tbody>
              {list.map((r) => {
                const emp = store.getEmployee(r.employeeId);
                const first = (r.entries || [])[0];
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
                    <td><Badge tone={r.type === 'other' ? 'violet' : 'brand'}>{r.type === 'other' ? 'Others' : 'Time'}</Badge></td>
                    <td className="font-mono text-[11.5px] whitespace-nowrap">
                      {first
                        ? <span className="inline-flex items-center gap-1">
                            <Icon name="sign-in" className="w-3 h-3 text-emerald-600"/>{first.in ? fmtHHMM(first.in) : '—'}
                            <Icon name="sign-out" className="w-3 h-3 text-rose-500 ml-1"/>{first.out ? fmtHHMM(first.out) : '—'}
                          </span>
                        : <span className="text-slate-400">No time change</span>}
                    </td>
                    <td className="hidden lg:table-cell max-w-[220px] truncate" title={r.reason}>{r.reason}</td>
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
              {list.length === 0 && <tr><td colSpan={7}><Empty icon="check-circle" title="Nothing here" hint="No requests match this filter."/></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Printable register — hidden on screen, this is what Print emits. */}
      <div className="hidden print:block print-area">
        <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>Attendance Regularisation Register</h1>
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 12 }}>
          S.D. Computronix Pvt. Ltd. · {list.length} record{list.length === 1 ? '' : 's'} · {status === 'all' ? 'all statuses' : status} · generated {fmtDateTime(new Date().toISOString())}
        </div>
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Date', 'Employee', 'Code', 'Type', 'In', 'Out', 'Reason', 'Status', 'Decided by'].map((h) => (
                <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid #94A3B8', padding: '4px 6px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const e = store.getEmployee(r.employeeId) || {};
              const first = (r.entries || [])[0] || {};
              return (
                <tr key={r.id}>
                  <td style={{ borderBottom: '1px solid #E2E8F0', padding: '4px 6px' }}>{fmtDate(r.date, { year: true })}</td>
                  <td style={{ borderBottom: '1px solid #E2E8F0', padding: '4px 6px' }}>{e.name}</td>
                  <td style={{ borderBottom: '1px solid #E2E8F0', padding: '4px 6px' }}>{e.code}</td>
                  <td style={{ borderBottom: '1px solid #E2E8F0', padding: '4px 6px' }}>{r.type === 'other' ? 'Others' : 'Time'}</td>
                  <td style={{ borderBottom: '1px solid #E2E8F0', padding: '4px 6px' }}>{first.in ? fmtHHMM(first.in) : '—'}</td>
                  <td style={{ borderBottom: '1px solid #E2E8F0', padding: '4px 6px' }}>{first.out ? fmtHHMM(first.out) : '—'}</td>
                  <td style={{ borderBottom: '1px solid #E2E8F0', padding: '4px 6px' }}>{r.reason}</td>
                  <td style={{ borderBottom: '1px solid #E2E8F0', padding: '4px 6px' }}>{r.status}</td>
                  <td style={{ borderBottom: '1px solid #E2E8F0', padding: '4px 6px' }}>
                    {r.decidedBy ? (store.getEmployee(r.decidedBy) || {}).name || r.decidedBy : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ fontSize: 10, color: '#64748B', marginTop: 14 }}>
          This is a computer-generated document and does not require a physical signature unless otherwise specified by the company.
        </div>
      </div>

      {detail && (() => {
        const emp = store.getEmployee(detail.employeeId);
        const shift = detail.shift || store.getShift(emp);
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

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date"><div className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{fmtDate(detail.date, { year: true })}</div></Field>
                <Field label="Shift timings"><div className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{fmtHHMM(shift.start)} – {fmtHHMM(shift.end)}</div></Field>
              </div>

              <Field label="Request type">
                <Badge tone={detail.type === 'other' ? 'violet' : 'brand'}>
                  {detail.type === 'other' ? 'Others — no time change' : 'Add/update time entries'}
                </Badge>
              </Field>

              {(detail.entries || []).length > 0 && (
                <Field label="Requested time entries">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                    {detail.entries.map((e, i) => (
                      <div key={i} className="px-3 py-2 flex items-center gap-3 text-[12.5px] font-mono">
                        <Icon name="sign-in" className="w-3.5 h-3.5 text-emerald-600"/>
                        <span className={e.in ? 'font-semibold' : 'text-rose-500'}>{e.in ? fmtHHMM(e.in) : 'MISSING'}</span>
                        <Icon name="sign-out" className="w-3.5 h-3.5 text-rose-500 ml-2"/>
                        <span className={e.out ? 'font-semibold' : 'text-rose-500'}>{e.out ? fmtHHMM(e.out) : 'MISSING'}</span>
                        <span className="ml-auto text-[11px] text-slate-400 font-sans truncate">{e.location}</span>
                      </div>
                    ))}
                  </div>
                </Field>
              )}

              <Field label="Reason"><div className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{detail.reason}</div></Field>
              <Field label="Note"><div className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">{detail.details || '—'}</div></Field>
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

      {/* Raising on someone's behalf: pick the person, then the day. */}
      {pickEmp && (
        <RaiseRegularizationPicker user={user} onClose={() => setPickEmp(false)}
          onPick={(emp, day) => { setPickEmp(false); setRaiseFor({ emp, day }); }}/>
      )}
      {raiseFor && (
        <RegularizationRequestModal emp={raiseFor.emp} day={raiseFor.day} user={user}
          onClose={() => setRaiseFor(null)}/>
      )}
    </div>
  );
}

/* Choose whose day to correct. HR raise these on behalf of employees who could
   not — a dead phone is exactly the case that needs a correction. */
function RaiseRegularizationPicker({ user, onClose, onPick }) {
  const store = useStore();
  const [empId, setEmpId] = useState('');
  const [date, setDate] = useState(Store.TODAY.toISOString().slice(0, 10));
  const emp = empId ? store.getEmployee(empId) : null;
  const day = emp ? store.getDayLog(emp.id, date) : null;

  return (
    <Modal open onClose={onClose} size="sm" icon="plus"
      title="Raise a regularisation" subtitle="On behalf of an employee"
      footer={<>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" disabled={!emp} onClick={() => onPick(emp, day)}>Continue</Btn>
      </>}>
      <div className="space-y-3">
        <Field label="Employee"><EmployeePicker value={empId} onChange={setEmpId}/></Field>
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)}/></Field>
        {day && (
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-[12px] flex items-center gap-2">
            <StatusBadge status={day.status}/>
            <span className="font-mono text-slate-600 dark:text-slate-300">
              {day.inTime ? fmtHHMM(day.inTime) : 'MISSING'} → {day.outTime ? fmtHHMM(day.outTime) : 'MISSING'}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ---------------- Page shell ---------------- */
function AttendancePage({ user, navArg }) {
  const store = useStore();
  const [tab, setTab] = useState('overview');
  const [month, setMonth] = useState('2026-07');
  const scope = useAttendanceScope(user);

  /* Deep link: "Decide" on the dashboard lands here already on the correction
     queue rather than on the Overview a click away from it. */
  useEffect(() => {
    if (navArg && navArg.tab) setTab(navArg.tab);
  }, [navArg && navArg._n]);

  const pendingRegs = store.getRegularisations({ status: 'pending' }).length;
  const TABS = [
    { id: 'overview',       label: 'Overview',       icon: 'chart' },
    { id: 'daily',          label: 'Daily',          icon: 'clock' },
    { id: 'monthly',        label: 'Monthly log',    icon: 'calendar' },
    { id: 'regularization', label: 'Regularization', icon: 'edit', badge: pendingRegs },
  ];

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="People" title="Attendance"
        subtitle="Clock-in and clock-out records, the monthly day log, and attendance corrections.">
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
      {tab === 'monthly'        && <AttendanceMonthly employees={scope.employees} month={month} user={user}/>}
      {tab === 'regularization' && <AttendanceRegularization user={user}/>}
    </div>
  );
}

Object.assign(window, {
  AttendancePage, AttendanceOverview, AttendanceDaily, AttendanceMonthly,
  AttendanceRegularization, AttendanceFilters, useAttendanceScope,
  DayCell, DayLogLegend, DayLogModal, RegularizationRequestModal, RaiseRegularizationPicker,
  DAY_TONE,
});
