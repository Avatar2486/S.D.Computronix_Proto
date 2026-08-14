/* Team Lead's mobile-only experience.

   A Team Lead is a mobile-only seat (spec §1): no Web/Split desktop path, and
   — per the permission table — no individual pay/incentive figure for anyone,
   not even themselves, and only operational (never KYC/pay) data about their
   direct reports. These two screens replace Payslips/Gigs on the tab bar with
   a Home that carries no money figure and a scoped Team roster that mirrors
   the already-correct desktop scoping in admin_employees.jsx (`e.siteId ===
   user.siteId && e.role === 'field-employee' && e.status === 'active' &&
   e.approvalStatus === 'approved'`) instead of the old emp_001 hard-code. */

const TEAM_TODAY = '2026-07-15';

function useTeamRoster(user) {
  const store = useStore();
  return useMemo(() => store.state.employees.filter((e) =>
    e.siteId === user.siteId &&
    e.role === 'field-employee' &&
    e.status === 'active' &&
    e.approvalStatus === 'approved'
  ), [store.state, user.siteId]);
}

function MobileTeamHome({ user, emp, setTab }) {
  const store = useStore();
  const site = store.getSite(emp.siteId);
  const roster = useTeamRoster(user);

  // The Team Lead's own clock status — operational, not a pay figure, so this
  // stays on Home the same way it would for any employee.
  const marks = store.getAttendance({ employeeId: emp.id, date: TEAM_TODAY });
  const clockIn = marks.find((m) => m.type === 'clock-in');
  const clockOut = marks.find((m) => m.type === 'clock-out');

  const today = useMemo(() => roster.map((e) => ({ emp: e, log: store.getDayLog(e.id, TEAM_TODAY) })), [roster, store.state]);
  const counts = today.reduce((acc, r) => {
    const k = r.log.status === 'on-time' || r.log.status === 'late' || r.log.status === 'incomplete' ? 'present' : r.log.status === 'absent' ? 'absent' : 'other';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, { present: 0, absent: 0, other: 0 });

  return (
    <div className="px-4 space-y-3">
      <div className={`rounded-2xl p-4 ${clockIn ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-gradient-to-br from-brand-600 to-brand-800'} text-white relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-20"><div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white blur-2xl"/></div>
        <div className="relative">
          <div className="text-[10px] uppercase tracking-wider font-bold opacity-80">Today · Wed, 15 Jul</div>
          <div className="text-xl font-bold mt-0.5">{clockIn ? 'On shift' : 'Not clocked in'}</div>
          <div className="text-[11px] opacity-80 mt-1">{site?.name} <span className="font-mono opacity-70">({site?.code})</span></div>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1"><div className="text-[10px] opacity-70">Clock-in</div><div className="text-[13px] font-bold font-mono">{clockIn ? fmtTime(clockIn.timestamp) : '—'}</div></div>
            <div className="w-px h-8 bg-white/30"/>
            <div className="flex-1"><div className="text-[10px] opacity-70">Clock-out</div><div className="text-[13px] font-bold font-mono">{clockOut ? fmtTime(clockOut.timestamp) : '—'}</div></div>
          </div>
        </div>
      </div>

      <button onClick={() => setTab('attendance')} className="w-full py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card flex items-center gap-3 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/80">
        <div className="w-11 h-11 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center"><Icon name="camera" className="w-5 h-5"/></div>
        <div className="flex-1 text-left">
          <div className="text-[13px] font-bold text-slate-800 dark:text-white">{clockIn && !clockOut ? 'Clock out with live photo' : clockOut ? 'Shift complete' : 'Clock in with live photo'}</div>
          <div className="text-[11px] text-slate-500">Geo-fenced · location auto-captured</div>
        </div>
        <Icon name="chevron-right" className="w-4 h-4 text-slate-400"/>
      </button>

      {/* Team snapshot — operational counts only, never an individual figure. */}
      <button onClick={() => setTab('team')} className="w-full text-left rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 hover:border-brand-400 transition">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Team today · {roster.length} at {site?.code}</div>
          <Icon name="chevron-right" className="w-4 h-4 text-slate-300"/>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: 'Present', v: counts.present, c: 'text-emerald-600' },
            { l: 'Absent', v: counts.absent, c: counts.absent > 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200' },
            { l: 'Other', v: counts.other, c: 'text-slate-500' },
          ].map((s) => (
            <div key={s.l} className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2.5">
              <div className="text-[9px] uppercase text-slate-500 font-bold">{s.l}</div>
              <div className={`text-[15px] font-bold ${s.c}`}>{s.v}</div>
            </div>
          ))}
        </div>
      </button>

      <div className="text-[10px] text-center text-slate-400 py-2">
        Team Lead view · operational data only — individual pay, incentive and KYC details are not shown here.
      </div>
    </div>
  );
}

function MobileTeamRoster({ user, emp }) {
  const store = useStore();
  const [q, setQ] = useState('');
  const site = store.getSite(user.siteId);
  const roster = useTeamRoster(user);

  const rows = useMemo(() => roster
    .map((e) => ({ emp: e, log: store.getDayLog(e.id, TEAM_TODAY) }))
    .filter(({ emp: e }) => !q || `${e.name} ${e.code} ${e.designation}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.emp.name.localeCompare(b.emp.name)),
    [roster, store.state, q]);

  return (
    <div className="px-4 space-y-3">
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Your team</div>
        <div className="text-[14px] font-bold text-slate-900 dark:text-white mt-0.5">{site?.name} <span className="text-[11px] font-mono font-normal text-slate-500">({site?.code})</span></div>
        <div className="text-[11px] text-slate-500 mt-0.5">{roster.length} direct report{roster.length !== 1 ? 's' : ''} · operational data only</div>
      </div>

      <div className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <Icon name="search" className="w-3.5 h-3.5 text-slate-400"/>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, code or designation…"
          className="flex-1 min-w-0 bg-transparent text-[12px] outline-none dark:text-slate-100"/>
      </div>

      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
        {rows.map(({ emp: e, log }) => (
          <div key={e.id} className="p-3 flex items-center gap-2.5">
            <EmployeeIdentity emp={e} subtitle="designation" className="flex-1 min-w-0"/>
            <StatusBadge status={log.status}/>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="p-8 text-center text-[11px] text-slate-500">
            {q ? 'Nobody on your team matches that search.' : 'No one is posted to your store yet.'}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { MobileTeamHome, MobileTeamRoster });
