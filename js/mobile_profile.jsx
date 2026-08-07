/* Mobile profile: personal info, documents, incentive detail */
function MobileProfile({ emp: empProp, onLogout, onTour, onOpenDocs }) {
  const store = useStore();
  /* Read the live record so document uploads reflect immediately. */
  const emp = store.getEmployee(empProp.id) || empProp;
  const site = store.getSite(emp.siteId);
  const docs = getEmpDocs(emp);
  const pendingDocs = docsPendingCount(emp);
  const july = '2026-07';
  const sales = store.getSales(emp.id, july)?.totalSales || 0;
  const detail = store.incentiveDetail(emp, july);

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

      {/* Incentive tracker — store-specific slab */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500">Store incentive slab · July</div>
          <div className="text-[13px] font-bold text-emerald-700 dark:text-emerald-400">{fmtINR(detail.payout)}</div>
        </div>
        <div className="text-[10px] text-slate-500 mb-2">{site?.name} · <span className="font-semibold text-slate-600 dark:text-slate-300">{detail.raw || detail.label}</span></div>
        <div className="space-y-2">
          {detail.tiers.length === 0 && <div className="text-[11px] text-slate-400">This store has no incentive slab configured.</div>}
          {detail.tiers.map((t, i) => (
            <div key={i} className={`p-2 rounded-lg border ${t.active ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : t.reached ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-800' : 'border-slate-200 dark:border-slate-700'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${t.active ? 'bg-brand-700 text-white' : t.reached ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700'}`}>
                  {t.reached ? <Icon name="check" className="w-3 h-3"/> : <span className="text-[10px] font-bold">₹</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-slate-800 dark:text-white">Cross {t.fromLabel} sales</div>
                  <div className="text-[10px] text-slate-500">{t.active ? 'Current tier' : t.reached ? 'Achieved' : 'Locked'}</div>
                </div>
                <div className={`text-[12px] font-bold ${t.active ? 'text-brand-700 dark:text-brand-300' : t.reached ? 'text-emerald-700' : 'text-slate-400'}`}>{t.payoutText}</div>
              </div>
            </div>
          ))}
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

      {/* Onboarding documents — tap through to sample previews + upload */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500">Onboarding documents</div>
          {pendingDocs > 0
            ? <Badge tone="red">{pendingDocs} pending</Badge>
            : <Badge tone="green">All submitted</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {MOBILE_DOC_LIST.map((d) => {
            const st = docs[d.k].status;
            return (
              <button key={d.k} onClick={() => onOpenDocs && onOpenDocs()}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-left hover:border-brand-400 hover:bg-brand-50/40 dark:hover:bg-brand-900/10 transition">
                <Icon name="file" className={`w-4 h-4 shrink-0 ${st === 'verified' ? 'text-emerald-600' : st === 'uploaded' ? 'text-amber-600' : 'text-slate-400'}`}/>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-slate-800 dark:text-white truncate">{d.label}</div>
                  <div className={`text-[9px] ${st === 'verified' ? 'text-emerald-600' : st === 'uploaded' ? 'text-amber-600' : 'text-slate-400'}`}>
                    {st === 'verified' ? 'Verified ✓' : st === 'uploaded' ? 'In review' : d.required ? 'Required' : 'Optional'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={() => onOpenDocs && onOpenDocs()}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-[12px] font-semibold transition">
          <Icon name="upload" className="w-3.5 h-3.5"/>Manage documents &amp; view samples
        </button>
      </div>

      {/* Account actions */}
      <div className="space-y-2 pt-1">
        <button onClick={() => onTour && onTour()} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-[13px] hover:bg-slate-50 dark:hover:bg-slate-700">
          <Icon name="sparkle" className="w-4 h-4 text-brand-700 dark:text-brand-300"/>Replay app tour
        </button>
        <button onClick={() => onLogout && onLogout()} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-semibold text-[13px] hover:bg-rose-100 dark:hover:bg-rose-900/30">
          <Icon name="logout" className="w-4 h-4"/>Sign out
        </button>
      </div>

      <div className="text-[10px] text-center text-slate-400 py-4">S.D. Computronix HRMS · v1.0 (demo)</div>
    </div>
  );
}

Object.assign(window, { MobileProfile });
