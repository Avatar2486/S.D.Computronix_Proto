/* Mobile "Gig Work / External Services" tab — future Urban-Company-style
   integration placeholder shown to the client (coming soon). */
function MobileGigs({ emp }) {
  const categories = [
    { icon: 'settings', label: 'Appliance Repair', color: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40' },
    { icon: 'monitor',  label: 'Device Setup',     color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40' },
    { icon: 'shield',   label: 'AMC Visits',       color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40' },
    { icon: 'wallet',   label: 'Paid Installs',    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40' },
  ];
  return (
    <div className="px-4 space-y-3">
      {/* Hero */}
      <div className="rounded-2xl p-4 bg-gradient-to-br from-violet-600 to-brand-800 text-white relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/20 blur-2xl"/>
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wide">Coming soon</div>
          <div className="text-xl font-bold mt-2">Gig Work & External Services</div>
          <div className="text-[12px] opacity-90 mt-1 leading-relaxed">Earn extra between shifts. We're building an Urban-Company-style marketplace so you can pick up nearby service jobs and get paid per task.</div>
        </div>
      </div>

      {/* Category grid (disabled) */}
      <div className="grid grid-cols-2 gap-2">
        {categories.map((c) => (
          <div key={c.label} className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 opacity-70">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.color}`}><Icon name={c.icon} className="w-5 h-5"/></div>
            <div className="text-[12px] font-bold text-slate-800 dark:text-white mt-2">{c.label}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Not yet available</div>
          </div>
        ))}
      </div>

      {/* Earnings teaser */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">How it will work</div>
        {[
          ['Accept nearby jobs', 'Get matched to service requests around your store.'],
          ['Complete & verify', 'Geo-stamped proof of work, same as attendance.'],
          ['Instant payout', 'Per-task earnings added to your monthly payslip.'],
        ].map(([t, s], i) => (
          <div key={t} className="flex items-start gap-2.5 py-1.5">
            <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center text-[11px] font-bold shrink-0">{i + 1}</div>
            <div><div className="text-[12px] font-semibold text-slate-800 dark:text-white">{t}</div><div className="text-[11px] text-slate-500">{s}</div></div>
          </div>
        ))}
      </div>

      <button disabled className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-semibold text-[13px] cursor-not-allowed flex items-center justify-center gap-2">
        <Icon name="external" className="w-4 h-4"/>Notify me when it launches
      </button>
      <div className="text-[10px] text-center text-slate-400 pb-2">Planned integration · roadmap Q4 2026</div>
    </div>
  );
}

Object.assign(window, { MobileGigs });
