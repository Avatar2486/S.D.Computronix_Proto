/* Mobile payslips list + detail */
function MobilePayslips({ emp }) {
  const store = useStore();
  const months = ['2026-07', '2026-06'];
  const [open, setOpen] = useState(null);
  return (
    <div className="px-4 space-y-3">
      <div className="rounded-xl bg-gradient-to-br from-brand-700 to-brand-900 p-4 text-white">
        <div className="text-[10px] uppercase tracking-wider font-bold opacity-80">YTD earnings</div>
        <div className="text-2xl font-bold mt-0.5">{fmtINR(months.reduce((s, m) => s + (store.computePayslip(emp.id, m)?.netPay || 0), 0))}</div>
        <div className="text-[11px] opacity-80 mt-1">Across {months.length} months · Bank verified ✓</div>
      </div>

      {months.map((m) => {
        const p = store.computePayslip(emp.id, m);
        return (
          <button key={m} onClick={() => setOpen(p)} className="w-full text-left rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/70">
            <div className="w-11 h-11 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center">
              <Icon name="wallet" className="w-5 h-5"/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-slate-800 dark:text-white">{fmtMonth(m)}</div>
              <div className="text-[11px] text-slate-500">{p.presentDays}/{p.workingDays} days · Incentive {fmtINR(p.incentive)}</div>
            </div>
            <div className="text-right">
              <div className="text-[14px] font-bold text-slate-900 dark:text-white font-mono">{fmtINR(p.netPay)}</div>
              <div className="text-[10px] text-emerald-600 font-semibold">Credited</div>
            </div>
          </button>
        );
      })}

      {open && <MobilePayslipDetail emp={emp} payslip={open} onClose={() => setOpen(null)}/>}
    </div>
  );
}

function MobilePayslipDetail({ emp, payslip, onClose }) {
  return (
    <div className="absolute inset-0 z-30 bg-white dark:bg-slate-900 anim-in flex flex-col">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><Icon name="chevron-left" className="w-5 h-5"/></button>
        <div className="flex-1">
          <div className="text-[13px] font-bold text-slate-900 dark:text-white">Payslip · {fmtMonth(payslip.month)}</div>
          <div className="text-[10px] text-slate-500">S.D. Computronix Pvt. Ltd.</div>
        </div>
        <button onClick={() => window.print()} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><Icon name="print" className="w-4 h-4"/></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
            <div className="text-[9px] uppercase text-slate-500 font-bold">Days</div>
            <div className="text-sm font-bold text-slate-800 dark:text-white">{payslip.workingDays}</div>
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
            <div className="text-[9px] uppercase text-emerald-700 dark:text-emerald-300 font-bold">Present</div>
            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{payslip.presentDays}</div>
          </div>
          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20">
            <div className="text-[9px] uppercase text-rose-700 dark:text-rose-300 font-bold">Absent</div>
            <div className="text-sm font-bold text-rose-700 dark:text-rose-300">{payslip.absentDays}</div>
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 text-[10px] uppercase font-bold text-slate-500">Earnings</div>
          <div className="p-3 space-y-1.5 text-[12px]">
            <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">Base salary</span><span className="font-mono font-semibold">{fmtINR(payslip.base)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">Incentive · {payslip.incentiveSlab.label}</span><span className="font-mono font-semibold text-emerald-700">+{fmtINR(payslip.incentive)}</span></div>
            {payslip.travelAllowance > 0 && <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">Travel allowance</span><span className="font-mono font-semibold text-emerald-700">+{fmtINR(payslip.travelAllowance)}</span></div>}
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 text-[10px] uppercase font-bold text-slate-500">Deductions</div>
          <div className="p-3 space-y-1.5 text-[12px]">
            <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">Absence ({payslip.absentDays} days × ₹{Math.round(payslip.base/payslip.workingDays)})</span><span className="font-mono font-semibold text-rose-700">−{fmtINR(payslip.absenceDeduction)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">PF (12%)</span><span className="font-mono">−{fmtINR(payslip.statutory.pf)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">ESIC</span><span className="font-mono">−{fmtINR(payslip.statutory.esic)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">Professional tax</span><span className="font-mono">−{fmtINR(payslip.statutory.pt)}</span></div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-brand-700 text-white flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wide font-bold opacity-80">Net credited</div>
            <div className="text-[10px] opacity-70">NEFT · 01 Aug 2026</div>
          </div>
          <div className="text-2xl font-black font-mono">{fmtINR(payslip.netPay)}</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MobilePayslips, MobilePayslipDetail });
