/* Mobile home screen: today's status, next 2hr check, incentive progress */
function MobileHome({ emp, setTab }) {
  const store = useStore();
  const today = '2026-07-15';
  const marks = store.getAttendance({ employeeId: emp.id, date: today });
  const clockIn = marks.find((m) => m.type === 'clock-in');
  const clockOut = marks.find((m) => m.type === 'clock-out');
  const checks = marks.filter((m) => m.type === '2hr-check');
  const site = store.getSite(emp.siteId);
  const july = '2026-07';
  const sales = store.getSales(emp.id, july)?.totalSales || 0;
  const inc = store.calcIncentive(sales);
  const slabs = store.getSlabs();
  const currentIdx = slabs.findIndex((s) => s.id === inc.slab.id);
  const nextSlab = slabs[currentIdx + 1];

  // next 2hr check countdown (fake at 14:00)
  const nextCheck = new Date('2026-07-15T14:00:00+05:30');
  const now = new Date('2026-07-15T12:30:00+05:30');
  const minsToNext = Math.round((nextCheck - now) / 60000);

  return (
    <div className="px-4 space-y-3">
      {/* Status hero */}
      <div className={`rounded-2xl p-4 ${clockIn ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-gradient-to-br from-brand-600 to-brand-800'} text-white relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white blur-2xl"/>
        </div>
        <div className="relative">
          <div className="text-[10px] uppercase tracking-wider font-bold opacity-80">Today · Wed, 15 Jul</div>
          <div className="text-xl font-bold mt-0.5">{clockIn ? 'On shift' : 'Not clocked in'}</div>
          <div className="text-[11px] opacity-80 mt-1">{site?.name}</div>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1">
              <div className="text-[10px] opacity-70">Clock-in</div>
              <div className="text-[13px] font-bold font-mono">{clockIn ? fmtTime(clockIn.timestamp) : '—'}</div>
            </div>
            <div className="w-px h-8 bg-white/30"/>
            <div className="flex-1">
              <div className="text-[10px] opacity-70">Next 2-hr check</div>
              <div className="text-[13px] font-bold font-mono">{minsToNext > 0 ? `in ${minsToNext} min` : 'Due now'}</div>
            </div>
            <div className="w-px h-8 bg-white/30"/>
            <div className="flex-1">
              <div className="text-[10px] opacity-70">Checks done</div>
              <div className="text-[13px] font-bold font-mono">{checks.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Big action */}
      <button onClick={() => setTab('attendance')} className="w-full py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card flex items-center gap-3 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/80">
        <div className="w-11 h-11 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center">
          <Icon name="camera" className="w-5 h-5"/>
        </div>
        <div className="flex-1 text-left">
          <div className="text-[13px] font-bold text-slate-800 dark:text-white">{clockIn && !clockOut ? 'Complete 2-hour check' : clockOut ? 'Shift complete' : 'Clock in with live photo'}</div>
          <div className="text-[11px] text-slate-500">Geo-fenced · location auto-captured</div>
        </div>
        <Icon name="chevron-right" className="w-4 h-4 text-slate-400"/>
      </button>

      {/* Incentive progress */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Incentive · July</div>
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{fmtINR(inc.payout)}</div>
          </div>
          <Badge tone="brand">{inc.slab.label}</Badge>
        </div>
        {nextSlab ? (
          <div>
            <div className="flex justify-between text-[11px] text-slate-500 mb-1">
              <span>Sales: <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{fmtINR(sales)}</span></span>
              <span>Next: <span className="font-mono font-semibold text-brand-700 dark:text-brand-300">{fmtINR(nextSlab.payout)}</span></span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-brand-600" style={{ width: `${Math.min(100, ((sales - inc.slab.minSales) / (nextSlab.minSales - inc.slab.minSales)) * 100)}%` }}/>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {fmtINR(nextSlab.minSales - sales)} more sales to reach {nextSlab.label}
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">🏆 You're on the top slab this month!</div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: 'Present', v: '14', s: 'this month', c: 'text-emerald-600' },
          { l: 'Absent', v: '0', s: 'this month', c: 'text-slate-700 dark:text-slate-200' },
          { l: 'Sales', v: '₹2.4L', s: 'this month', c: 'text-brand-700 dark:text-brand-300' },
        ].map((s) => (
          <div key={s.l} className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5">
            <div className="text-[9px] uppercase text-slate-500 font-bold">{s.l}</div>
            <div className={`text-[15px] font-bold ${s.c}`}>{s.v}</div>
            <div className="text-[9px] text-slate-400">{s.s}</div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">Today's timeline</div>
        {marks.length === 0 && <div className="text-[11px] text-slate-400">No activity yet — clock in to start.</div>}
        {marks.map((m) => (
          <div key={m.id} className="flex items-center gap-2 py-1.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${m.insideGeofence ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
              <Icon name={m.type === 'clock-in' ? 'check' : m.type === '2hr-check' ? 'target' : 'x'} className="w-3 h-3"/>
            </div>
            <div className="flex-1 text-[11px] text-slate-700 dark:text-slate-200 capitalize">{m.type.replace('-', ' ')}</div>
            <div className="text-[11px] font-mono text-slate-500">{fmtTime(m.timestamp)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { MobileHome });
