/* Mobile profile: personal info, documents, incentive detail */
function MobileProfile({ emp }) {
  const store = useStore();
  const site = store.getSite(emp.siteId);
  const july = '2026-07';
  const sales = store.getSales(emp.id, july)?.totalSales || 0;
  const inc = store.calcIncentive(sales);
  const slabs = store.getSlabs();

  return (
    <div className="px-4 space-y-3">
      {/* Profile hero */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
        <Avatar emp={emp} size={56}/>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold text-slate-900 dark:text-white">{emp.name}</div>
          <div className="text-[11px] text-slate-500 font-mono">{emp.code} · {ROLE_LABEL[emp.role]}</div>
          <div className="flex gap-1.5 mt-1">
            <Badge tone="green">Active</Badge>
            <Badge tone="brand">{site?.city}</Badge>
          </div>
        </div>
      </div>

      {/* Incentive tracker */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
        <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500 mb-2">Incentive slabs · July</div>
        <div className="space-y-2">
          {slabs.map((s) => {
            const active = s.id === inc.slab.id;
            const reached = sales >= s.minSales;
            return (
              <div key={s.id} className={`p-2 rounded-lg border ${active ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : reached ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-800' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${active ? 'bg-brand-700 text-white' : reached ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700'}`}>
                    {reached ? <Icon name="check" className="w-3 h-3"/> : <span className="text-[10px] font-bold">₹</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-white">{s.label}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{fmtINR(s.minSales)} – {s.maxSales == null ? '∞' : fmtINR(s.maxSales)}</div>
                  </div>
                  <div className={`text-[13px] font-bold font-mono ${active ? 'text-brand-700 dark:text-brand-300' : reached ? 'text-emerald-700' : 'text-slate-400'}`}>{fmtINR(s.payout)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info list */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
        {[
          ['Phone', emp.phone, 'phone'],
          ['Email', emp.email, 'mail'],
          ['Assigned site', site?.name, 'building'],
          ['Shift', `${site?.shiftStart} – ${site?.shiftEnd}`, 'clock'],
          ['Aadhaar', emp.aadhaarMasked, 'shield'],
          ['PAN', emp.panMasked, 'file'],
          ['Bank', emp.bankVerified ? 'Verified ✓ via penny-drop' : '—', 'wallet'],
          ['Joined', fmtDate(emp.joiningDate, { year: true }), 'calendar'],
        ].map(([k, v, i]) => (
          <div key={k} className="p-3 flex items-center gap-2.5">
            <Icon name={i} className="w-4 h-4 text-slate-400"/>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wide">{k}</div>
              <div className="text-[12px] font-semibold text-slate-800 dark:text-white truncate">{v}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Documents */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
        <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500 mb-2">Documents</div>
        <div className="grid grid-cols-2 gap-2">
          {['Aadhaar card', 'PAN card', 'Photograph', 'Offer letter'].map((d) => (
            <div key={d} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <Icon name="file" className="w-4 h-4 text-brand-700"/>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-slate-800 dark:text-white truncate">{d}</div>
                <div className="text-[9px] text-emerald-600">Verified ✓</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-center text-slate-400 py-4">S.D. Computronix HRMS · v1.0 (demo)</div>
    </div>
  );
}

Object.assign(window, { MobileProfile });
