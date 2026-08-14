/* Mobile home: today's status, targets, store-specific incentive, kudos */
function MobileHome({ emp, setTab }) {
  const store = useStore();
  const today = '2026-07-15';
  const july = '2026-07';
  const marks = store.getAttendance({ employeeId: emp.id, date: today });
  const clockIn = marks.find((m) => m.type === 'clock-in');
  const clockOut = marks.find((m) => m.type === 'clock-out');
  const site = store.getSite(emp.siteId);
  const sales = store.getSales(emp.id, july)?.totalSales || 0;
  const detail = store.incentiveDetail(emp, july);
  const targets = store.getTargets(emp.id, july);
  const kudos = store.getKudos(emp.id);
  const payJul = store.computePayslip(emp.id, july);

  // Hours on shift so far, against the store's published shift window. Clamped
  // at zero: a late clock-in (or one written in by an approved regularisation
  // after the old fixed reference time) used to produce a negative duration.
  const shiftEnd = site && site.shiftEnd ? site.shiftEnd : '19:00';
  const onShiftFor = clockIn && !clockOut
    ? Math.max(0, (Store.TODAY - new Date(clockIn.timestamp)) / 3600000)
    : null;

  const fmtShort = (n) => (n >= 100000 ? '₹' + (n / 100000).toFixed(n % 100000 ? 1 : 0) + 'L' : n >= 1000 ? '₹' + Math.round(n / 1000) + 'k' : '₹' + n);

  return (
    <div className="px-4 space-y-3">
      {/* Status hero */}
      <div className={`rounded-2xl p-4 ${clockIn ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-gradient-to-br from-brand-600 to-brand-800'} text-white relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-20"><div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white blur-2xl"/></div>
        <div className="relative">
          <div className="text-[10px] uppercase tracking-wider font-bold opacity-80">Today · Wed, 15 Jul</div>
          <div className="text-xl font-bold mt-0.5">{clockIn ? 'On shift' : 'Not clocked in'}</div>
          <div className="text-[11px] opacity-80 mt-1">{site?.name}</div>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1"><div className="text-[10px] opacity-70">Clock-in</div><div className="text-[13px] font-bold font-mono">{clockIn ? fmtTime(clockIn.timestamp) : '—'}</div></div>
            <div className="w-px h-8 bg-white/30"/>
            <div className="flex-1"><div className="text-[10px] opacity-70">Clock-out</div><div className="text-[13px] font-bold font-mono">{clockOut ? fmtTime(clockOut.timestamp) : `by ${shiftEnd}`}</div></div>
            <div className="w-px h-8 bg-white/30"/>
            <div className="flex-1"><div className="text-[10px] opacity-70">On shift</div><div className="text-[13px] font-bold font-mono">{onShiftFor != null ? `${onShiftFor.toFixed(1)}h` : clockOut ? 'Done' : '—'}</div></div>
          </div>
        </div>
      </div>

      {/* Big action */}
      <button onClick={() => setTab('attendance')} className="w-full py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card flex items-center gap-3 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/80">
        <div className="w-11 h-11 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center"><Icon name="camera" className="w-5 h-5"/></div>
        <div className="flex-1 text-left">
          <div className="text-[13px] font-bold text-slate-800 dark:text-white">{clockIn && !clockOut ? 'Clock out with live photo' : clockOut ? 'Shift complete' : 'Clock in with live photo'}</div>
          <div className="text-[11px] text-slate-500">
            {emp.geoFenceEnabled === false ? 'Location auto-captured · no geo-fence' : 'Geo-fenced · location auto-captured'}
          </div>
        </div>
        <Icon name="chevron-right" className="w-4 h-4 text-slate-400"/>
      </button>

      {/* Target tracking */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Sales targets</div>
          <Badge tone={targets.onTrack ? 'green' : 'amber'}>{targets.onTrack ? 'On track' : 'Push harder'}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Weekly target', target: targets.weeklyTarget, ach: targets.weeklyAchieved, pct: targets.weeklyPct },
            { label: 'Monthly target', target: targets.monthlyTarget, ach: targets.monthlyAchieved, pct: targets.monthlyPct },
          ].map((t) => (
            <div key={t.label} className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2.5">
              <div className="text-[10px] uppercase text-slate-500 font-bold">{t.label}</div>
              <div className="text-[15px] font-bold text-slate-800 dark:text-white mt-0.5">{fmtShort(t.ach)} <span className="text-[10px] font-normal text-slate-400">/ {fmtShort(t.target)}</span></div>
              <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-1.5"><div className={`h-full rounded-full ${t.pct >= 100 ? 'bg-emerald-500' : 'bg-brand-600'}`} style={{ width: `${Math.min(100, t.pct)}%` }}/></div>
              <div className="text-[10px] text-slate-500 mt-1">{t.pct}% achieved</div>
            </div>
          ))}
        </div>
      </div>

      {/* Store-specific incentive progress */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
        <div className="flex items-center justify-between mb-1.5">
          <div><div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Incentive · July</div><div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{fmtINR(detail.payout)}</div></div>
          <Badge tone="brand">{site?.name || 'Store slab'}</Badge>
        </div>
        <div className="text-[10px] text-slate-500 mb-2">Your store slab: <span className="font-semibold text-slate-600 dark:text-slate-300">{detail.raw || detail.label}</span></div>
        {detail.next ? (
          <div>
            <div className="flex justify-between text-[11px] text-slate-500 mb-1">
              <span>Sales: <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{fmtINR(detail.sales)}</span></span>
              <span>Next: <span className="font-mono font-semibold text-brand-700 dark:text-brand-300">{detail.next.fromLabel} → {detail.next.payoutText}</span></span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-brand-600" style={{ width: `${detail.progress}%` }}/></div>
            <div className="text-[10px] text-slate-500 mt-1">{fmtINR(detail.next.remaining)} more sales to reach the next tier</div>
          </div>
        ) : (
          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">🏆 You've reached the top tier of your store slab this month!</div>
        )}
      </div>

      {/* Quick stats (real) */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: 'Present', v: String(payJul.presentDays), s: 'this month', c: 'text-emerald-600' },
          { l: 'Absent', v: String(payJul.absentDays), s: 'this month', c: payJul.absentDays > 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200' },
          { l: 'Sales', v: fmtShort(sales), s: 'this month', c: 'text-brand-700 dark:text-brand-300' },
        ].map((s) => (
          <div key={s.l} className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5">
            <div className="text-[9px] uppercase text-slate-500 font-bold">{s.l}</div>
            <div className={`text-[15px] font-bold ${s.c}`}>{s.v}</div>
            <div className="text-[9px] text-slate-400">{s.s}</div>
          </div>
        ))}
      </div>

      {/* Appreciation feed */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Appreciation</div>
          {kudos.length > 0 && <Badge tone="violet"><Icon name="sparkle" className="w-3 h-3"/>{kudos.length}</Badge>}
        </div>
        {kudos.length === 0 && <div className="text-[11px] text-slate-400 py-2">No kudos yet — keep up the great work!</div>}
        {kudos.slice(0, 3).map((k) => (
          <div key={k.id} className="flex gap-2.5 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
            <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0"><Icon name="sparkle" className="w-4 h-4"/></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap"><Badge tone="violet">{k.badge}</Badge><span className="text-[9px] text-slate-400">{fmtDate(k.at)}</span></div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">"{k.message}"</div>
              <div className="text-[9px] text-slate-400 mt-0.5">— {k.fromName}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Today's timeline */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">Today's timeline</div>
        {marks.length === 0 && <div className="text-[11px] text-slate-400">No activity yet — clock in to start.</div>}
        {marks.map((m) => (
          <div key={m.id} className="flex items-center gap-2 py-1.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${m.insideGeofence ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}><Icon name={m.type === 'clock-in' ? 'check' : 'x'} className="w-3 h-3"/></div>
            <div className="flex-1 text-[11px] text-slate-700 dark:text-slate-200 capitalize">{m.type.replace('-', ' ')}</div>
            <div className="text-[11px] font-mono text-slate-500">{fmtTime(m.timestamp)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { MobileHome });
