/* Payroll: run for month, payslip modal, CSV export */
function PayslipModal({ payslip, emp, onClose }) {
  if (!payslip || !emp) return null;
  const site = Store.getSite(emp.siteId);
  return (
    <Modal open onClose={onClose} title={`Payslip · ${fmtMonth(payslip.month)}`} wide
      footer={<>
        <Btn onClick={() => window.print()}><Icon name="print" className="w-3.5 h-3.5"/>Print / Save PDF</Btn>
        <Btn onClick={() => downloadCSV(`payslip_${emp.code}_${payslip.month}.csv`, [
          ['Field','Value'],
          ['Employee', emp.name], ['Code', emp.code], ['Month', payslip.month],
          ['Working days', payslip.workingDays], ['Present', payslip.presentDays], ['Absent', payslip.absentDays],
          ['Base', payslip.base], ['Absence deduction', payslip.absenceDeduction],
          ['PF', payslip.statutory.pf], ['ESIC', payslip.statutory.esic], ['PT', payslip.statutory.pt],
          ['Sales', payslip.sales], ['Incentive', payslip.incentive],
          ['Net pay', payslip.netPay],
        ])}><Icon name="download" className="w-3.5 h-3.5"/>Export CSV</Btn>
        <Btn variant="primary" onClick={onClose}>Close</Btn>
      </>}>
      <div className="print-area bg-white text-slate-900 p-6 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <BrandLogo size={32}/>
          <div className="text-right text-[11px] text-slate-500">
            <div className="font-semibold text-slate-700 text-[12px]">Payslip · {fmtMonth(payslip.month)}</div>
            <div>S.D. Computronix Pvt. Ltd.</div>
            <div>Mumbai · CIN: U72900MH2014PTC258912</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4 text-[12px]">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Employee</div>
            <div className="font-bold text-slate-900 text-[14px]">{emp.name}</div>
            <div className="text-slate-500 font-mono text-[11px]">{emp.code} · {emp.email}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Site & bank</div>
            <div className="font-semibold text-slate-800">{site?.name}</div>
            <div className="text-slate-500 text-[11px]">Salary credited via NEFT · Bank verified ✓</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4 text-[12px]">
          <div className="p-2.5 border border-slate-200 rounded bg-slate-50">
            <div className="text-[10px] uppercase text-slate-500 font-bold">Working days</div>
            <div className="text-lg font-bold text-slate-800">{payslip.workingDays}</div>
          </div>
          <div className="p-2.5 border border-emerald-200 rounded bg-emerald-50">
            <div className="text-[10px] uppercase text-emerald-700 font-bold">Present</div>
            <div className="text-lg font-bold text-emerald-700">{payslip.presentDays}</div>
          </div>
          <div className="p-2.5 border border-rose-200 rounded bg-rose-50">
            <div className="text-[10px] uppercase text-rose-700 font-bold">Absent</div>
            <div className="text-lg font-bold text-rose-700">{payslip.absentDays}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-5">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-bold mb-2">Earnings</div>
            <table className="w-full text-[12px]">
              <tbody>
                <tr className="border-b border-slate-200"><td className="py-1.5">Basic salary</td><td className="text-right font-mono font-semibold">{fmtINR(payslip.base)}</td></tr>
                <tr className="border-b border-slate-200"><td className="py-1.5">Incentive ({payslip.incentiveSlab.label})</td><td className="text-right font-mono font-semibold text-emerald-700">+ {fmtINR(payslip.incentive)}</td></tr>
                <tr className="font-bold"><td className="py-1.5">Gross earnings</td><td className="text-right font-mono">{fmtINR(payslip.base + payslip.incentive)}</td></tr>
              </tbody>
            </table>
            <div className="text-[10px] text-slate-500 mt-1">Sales achieved: {fmtINR(payslip.sales)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-bold mb-2">Deductions</div>
            <table className="w-full text-[12px]">
              <tbody>
                <tr className="border-b border-slate-200"><td className="py-1.5">Absence deduction ({payslip.absentDays} × ₹{Math.round(payslip.base/payslip.workingDays)})</td><td className="text-right font-mono font-semibold text-rose-700">− {fmtINR(payslip.absenceDeduction)}</td></tr>
                <tr className="border-b border-slate-200"><td className="py-1.5">PF (12%)</td><td className="text-right font-mono">− {fmtINR(payslip.statutory.pf)}</td></tr>
                <tr className="border-b border-slate-200"><td className="py-1.5">ESIC (0.75%)</td><td className="text-right font-mono">− {fmtINR(payslip.statutory.esic)}</td></tr>
                <tr className="border-b border-slate-200"><td className="py-1.5">Professional tax</td><td className="text-right font-mono">− {fmtINR(payslip.statutory.pt)}</td></tr>
                <tr className="font-bold"><td className="py-1.5">Total deductions</td><td className="text-right font-mono">− {fmtINR(payslip.absenceDeduction + payslip.statutory.pf + payslip.statutory.esic + payslip.statutory.pt)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 p-3 rounded-lg bg-brand-700 text-white flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-brand-100 font-bold">Net pay credited</div>
            <div className="text-[10px] text-brand-200">Bank transfer via NEFT — processed on 1st of month</div>
          </div>
          <div className="text-2xl font-black font-mono">{fmtINR(payslip.netPay)}</div>
        </div>

        <div className="text-[10px] text-slate-500 mt-4 border-t border-slate-200 pt-2 text-center">This is a computer-generated payslip and does not require a signature.</div>
      </div>
    </Modal>
  );
}

function PayrollPage({ user }) {
  const store = useStore();
  const toast = useToast();
  const [month, setMonth] = useState('2026-07');
  const [selected, setSelected] = useState(null);
  const [running, setRunning] = useState(false);
  const emps = store.getEmployees({ status: 'active' });
  const run = store.getPayrollRun(month);
  const payslips = emps.map((e) => store.computePayslip(e.id, month));

  const totals = payslips.reduce((s, p) => ({
    base: s.base + p.base,
    ded: s.ded + p.absenceDeduction + p.statutory.pf + p.statutory.esic + p.statutory.pt,
    inc: s.inc + p.incentive,
    net: s.net + p.netPay,
  }), { base: 0, ded: 0, inc: 0, net: 0 });

  const doRun = () => {
    setRunning(true);
    setTimeout(() => {
      Store.runPayroll(month);
      setRunning(false);
      toast(`Payroll processed for ${payslips.length} employees · Net payout ${fmtINR(totals.net)}`, 'success', 4500);
    }, 900);
  };

  const exportAll = () => {
    downloadCSV(`payroll_${month}.csv`, [
      ['Code','Name','Site','Working','Present','Absent','Base','Absence Ded','PF','ESIC','PT','Sales','Incentive','Net Pay'],
      ...payslips.map((p) => {
        const e = store.getEmployee(p.employeeId);
        return [e.code, e.name, store.getSite(e.siteId)?.name || '', p.workingDays, p.presentDays, p.absentDays, p.base, p.absenceDeduction, p.statutory.pf, p.statutory.esic, p.statutory.pt, p.sales, p.incentive, p.netPay];
      }),
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Compensation</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">Payroll processing</div>
          <div className="text-[12px] text-slate-500 mt-0.5">Absence deduction: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">₹{Math.round(15000/store.state.config.workingDays)}/day</span> · Base ₹15,000 ÷ {store.state.config.workingDays} working days</div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={month} onChange={(e) => setMonth(e.target.value)} className="!w-auto">
            <option value="2026-07">July 2026</option>
            <option value="2026-06">June 2026</option>
          </Select>
          <Btn onClick={exportAll}><Icon name="download" className="w-3.5 h-3.5"/>Export payout report</Btn>
          <Btn variant="primary" onClick={doRun} disabled={running}>
            {running ? <><Icon name="refresh" className="w-3.5 h-3.5 animate-spin"/>Processing…</> : <><Icon name="send" className="w-3.5 h-3.5"/>{run ? 'Re-run' : 'Run'} payroll</>}
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Gross base" value={fmtINR(totals.base)} icon="wallet" tone="slate"/>
        <StatCard label="Deductions" value={fmtINR(totals.ded)} icon="alert" tone="red"/>
        <StatCard label="Incentives" value={fmtINR(totals.inc)} icon="trending-up" tone="green"/>
        <StatCard label="Net payout" value={fmtINR(totals.net)} icon="check-circle" tone="brand"/>
      </div>

      <Card title={`Payslip preview · ${fmtMonth(month)}`} subtitle={run ? `Processed ${fmtDateTime(run.processedAt)}` : 'Not yet processed'} bodyClass="p-0"
        right={run ? <Badge tone="green"><Icon name="check-circle" className="w-3 h-3"/>Processed</Badge> : <Badge tone="amber">Preview</Badge>}>
        <table className="w-full dense-table">
          <thead><tr><th>Employee</th><th>Site</th><th className="text-right">Days</th><th className="text-right">Base</th><th className="text-right">Absence Ded.</th><th className="text-right">Statutory</th><th className="text-right">Sales</th><th className="text-right">Incentive</th><th className="text-right">Net Pay</th><th></th></tr></thead>
          <tbody>
            {payslips.map((p) => {
              const e = store.getEmployee(p.employeeId);
              const highlight = p.absentDays > 0;
              return (
                <tr key={p.employeeId} className={highlight ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                  <td>
                    <div className="flex items-center gap-2"><Avatar emp={e} size={26}/><div><div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">{e.name}</div><div className="text-[10px] text-slate-500 font-mono">{e.code}</div></div></div>
                  </td>
                  <td className="text-[11px] text-slate-500">{store.getSite(e.siteId)?.city}</td>
                  <td className="text-right font-mono text-[11px]"><span className="text-emerald-600">{p.presentDays}</span>/<span className="text-slate-400">{p.workingDays}</span> {p.absentDays > 0 && <span className="text-rose-600 ml-1">-{p.absentDays}</span>}</td>
                  <td className="text-right font-mono">{fmtINR(p.base)}</td>
                  <td className="text-right font-mono text-rose-700 dark:text-rose-400">{p.absenceDeduction > 0 ? '−'+fmtINR(p.absenceDeduction) : '—'}</td>
                  <td className="text-right font-mono text-slate-500">−{fmtINR(p.statutory.pf + p.statutory.esic + p.statutory.pt)}</td>
                  <td className="text-right font-mono text-[11px] text-slate-500">{fmtINR(p.sales)}</td>
                  <td className="text-right font-mono text-emerald-700 dark:text-emerald-400">+{fmtINR(p.incentive)}</td>
                  <td className="text-right font-mono font-bold text-slate-900 dark:text-white">{fmtINR(p.netPay)}</td>
                  <td><Btn size="xs" onClick={() => setSelected(p)}>View</Btn></td>
                </tr>
              );
            })}
            <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
              <td colSpan={3}>Totals</td>
              <td className="text-right font-mono">{fmtINR(totals.base)}</td>
              <td className="text-right font-mono text-rose-700">−{fmtINR(payslips.reduce((s,p) => s+p.absenceDeduction,0))}</td>
              <td className="text-right font-mono">−{fmtINR(payslips.reduce((s,p) => s+p.statutory.pf+p.statutory.esic+p.statutory.pt,0))}</td>
              <td></td>
              <td className="text-right font-mono text-emerald-700">+{fmtINR(totals.inc)}</td>
              <td className="text-right font-mono text-brand-700 dark:text-brand-300">{fmtINR(totals.net)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </Card>

      {selected && <PayslipModal payslip={selected} emp={store.getEmployee(selected.employeeId)} onClose={() => setSelected(null)}/>}
    </div>
  );
}

Object.assign(window, { PayrollPage, PayslipModal });
