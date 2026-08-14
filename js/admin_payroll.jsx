/* Payroll: month view, payslip modal, CSV export */
const PAYROLL_STATE_LABEL = { draft: 'Draft / Preview', reviewed: 'Reviewed', approved: 'Approved', processed: 'Processed', paid: 'Paid', locked: 'Locked' };

/* One button at a time — the state machine only ever advances one step, so
   there is never a choice of "which stage next", just "advance, or don't".
   HR can move a run into Reviewed; everything after that is Admin-only, and
   the button for a step HR can't take is hidden (not just disabled) with an
   explanatory line instead, matching the read-only convention used
   everywhere else money-adjacent is gated. */
function PayrollStateBar({ month, run, user }) {
  const toast = useToast();
  const status = run ? run.status : null;
  const idx = status ? Store.PAYROLL_STATES.indexOf(status) : -1;
  const next = Store.PAYROLL_STATES[idx + 1];
  const isAdminActor = isSuperAdmin(user);
  const nextNeedsAdmin = next && ['approved', 'processed', 'paid', 'locked'].includes(next);
  const canAdvance = next && (nextNeedsAdmin ? isAdminActor : can(user, 'payroll.review'));

  const advance = () => {
    const res = Store.transitionPayroll(month, next, user);
    if (res && res.error) { toast(res.error, 'error'); return; }
    toast(`${fmtMonth(month)} payroll moved to ${PAYROLL_STATE_LABEL[next]}`, 'success');
  };

  return (
    <Card bodyClass="p-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {Store.PAYROLL_STATES.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 text-[11.5px] font-semibold px-2 py-1 rounded-md ${
                i === idx ? 'bg-brand-700 text-white' : i < idx ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'}`}>
                {i < idx ? <Icon name="check-circle" className="w-3.5 h-3.5"/> : i === idx ? <Icon name="clock" className="w-3.5 h-3.5"/> : <span className="w-3.5 h-3.5 rounded-full border border-current inline-block"/>}
                {PAYROLL_STATE_LABEL[s]}
              </div>
              {i < Store.PAYROLL_STATES.length - 1 && <div className={`w-6 h-px ${i < idx ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`}/>}
            </React.Fragment>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {isPeriodLockedNote(status)}
          {next && canAdvance && (
            <Btn size="sm" variant={nextNeedsAdmin ? 'success' : 'primary'} onClick={advance}>
              <Icon name="chevron-right" className="w-3.5 h-3.5"/>Move to {PAYROLL_STATE_LABEL[next]}
            </Btn>
          )}
          {next && !canAdvance && (
            <span className="text-[11px] text-slate-400 italic">
              {nextNeedsAdmin ? `Only Admin can move to ${PAYROLL_STATE_LABEL[next]}` : 'HR/Admin required to review'}
            </span>
          )}
          {!next && <Badge tone="slate"><Icon name="lock" className="w-3 h-3"/>Fully locked</Badge>}
        </div>
      </div>
      {run && (
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
          {run.history.map((h, i) => (
            <span key={i}>{PAYROLL_STATE_LABEL[h.status]} · {h.by || 'system'} · {fmtDateTime(h.at)}</span>
          ))}
        </div>
      )}
    </Card>
  );
}
function isPeriodLockedNote(status) {
  if (!['processed', 'paid', 'locked'].includes(status)) return null;
  return (
    <span className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
      <Icon name="lock" className="w-3.5 h-3.5"/>Salary and attendance regularisation are frozen for this period.
    </span>
  );
}

function PayslipModal({ payslip, emp, onClose }) {
  const [showCalc, setShowCalc] = useState(false);
  if (!payslip || !emp) return null;
  const site = Store.getSite(emp.siteId);
  return (
    <>
    <Modal open onClose={onClose} size="xl" icon="wallet"
      title={`Payslip · ${fmtMonth(payslip.month)}`} subtitle={`${emp.name} · ${emp.code}`}
      footer={<>
        {/* Same authoritative calculation the Incentives dashboard shows, plus
            the audit trail of who last touched the rule/slab/target behind it
            — the one place this payslip's incentive line can be fully traced. */}
        <Btn onClick={() => setShowCalc(true)}><Icon name="trending-up" className="w-3.5 h-3.5"/>View incentive calculation</Btn>
        <Btn onClick={() => window.print()}><Icon name="print" className="w-3.5 h-3.5"/>Print / Save PDF</Btn>
        <Btn onClick={() => downloadCSV(`payslip_${emp.code}_${payslip.month}.csv`, [
          ['Field','Value'],
          ['Employee', emp.name], ['Code', emp.code], ['Month', payslip.month],
          ['Working days', payslip.workingDays], ['Present', payslip.presentDays], ['Absent', payslip.absentDays],
          ['Base', payslip.base], ['Absence deduction', payslip.absenceDeduction],
          ['PF', payslip.statutory.pfApplicable ? payslip.statutory.pf : 'Not applicable'], ['ESIC', payslip.statutory.esic], ['PT', payslip.statutory.pt],
          ['TDS', payslip.statutory.tdsApplicable ? payslip.statutory.tds : 'Not applicable'],
          ['Sales', payslip.sales], ['Incentive', payslip.incentive], ['Travel allowance', payslip.travelAllowance],
          ['Net pay', payslip.netPay], ['Payroll status', payslip.payrollStatus],
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
                {/* Which of the two calculations was paid */}
                {payslip.incentive > 0 && (
                  <tr className="border-b border-slate-100">
                    <td className="py-1 pl-4 text-[11px] text-slate-500">
                      ↳ Paid on the {payslip.incentiveWinner === 'target' ? 'store target' : 'incentive slab'} — the higher of the two eligible amounts
                    </td>
                    <td className="text-right font-mono text-[11px] text-slate-500">{fmtINR(payslip.incentiveMaxEligible)}</td>
                  </tr>
                )}
                {/* Threshold rules that fired this month, itemised under the incentive line */}
                {payslip.incentiveWinner === 'slab' && (payslip.incentiveBreakdown?.applied || []).map((r, i) => (
                  <tr key={r.id || i} className="border-b border-slate-100">
                    <td className="py-1 pl-4 text-[11px] text-slate-500">
                      ↳ {r.scope === 'store' ? 'Store rule' : 'Employee rule'} · {+r.minSales > 0 ? `above ${fmtINR(+r.minSales)}` : 'no minimum'} · {r.type === 'pct' ? r.value + '%' : fmtINR(+r.value)}
                    </td>
                    <td className="text-right font-mono text-[11px] text-slate-500">{fmtINR(r.amount)}</td>
                  </tr>
                ))}
                {payslip.travelAllowance > 0 && <tr className="border-b border-slate-200"><td className="py-1.5">Travel allowance</td><td className="text-right font-mono font-semibold text-emerald-700">+ {fmtINR(payslip.travelAllowance)}</td></tr>}
                <tr className="font-bold"><td className="py-1.5">Gross earnings</td><td className="text-right font-mono">{fmtINR(payslip.base + payslip.incentive + payslip.travelAllowance)}</td></tr>
              </tbody>
            </table>
            <div className="text-[10px] text-slate-500 mt-1">Sales achieved: {fmtINR(payslip.sales)}</div>
            {payslip.incentiveCapped && (
              <div className="text-[10px] text-amber-700 mt-1">Incentive capped at the ₹20,000 monthly ceiling.</div>
            )}
            {(payslip.incentiveBreakdown?.pending || []).length > 0 && (
              <div className="text-[10px] text-slate-400 mt-0.5">
                {payslip.incentiveBreakdown.pending.length} rule{payslip.incentiveBreakdown.pending.length !== 1 ? 's' : ''} not triggered — sales below threshold.
              </div>
            )}
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-bold mb-2">Deductions</div>
            <table className="w-full text-[12px]">
              <tbody>
                <tr className="border-b border-slate-200"><td className="py-1.5">Absence deduction ({payslip.absentDays} × ₹{Math.round(payslip.base/payslip.workingDays)})</td><td className="text-right font-mono font-semibold text-rose-700">− {fmtINR(payslip.absenceDeduction)}</td></tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5">PF (12%){!payslip.statutory.pfApplicable && <span className="text-slate-400"> · not applicable</span>}</td>
                  <td className="text-right font-mono">{payslip.statutory.pfApplicable ? `− ${fmtINR(payslip.statutory.pf)}` : '—'}</td>
                </tr>
                <tr className="border-b border-slate-200"><td className="py-1.5">ESIC (0.75%)</td><td className="text-right font-mono">− {fmtINR(payslip.statutory.esic)}</td></tr>
                <tr className="border-b border-slate-200"><td className="py-1.5">Professional tax</td><td className="text-right font-mono">− {fmtINR(payslip.statutory.pt)}</td></tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5">TDS{!payslip.statutory.tdsApplicable && <span className="text-slate-400"> · not applicable</span>}</td>
                  <td className="text-right font-mono">{payslip.statutory.tdsApplicable ? `− ${fmtINR(payslip.statutory.tds)}` : '—'}</td>
                </tr>
                <tr className="font-bold"><td className="py-1.5">Total deductions</td><td className="text-right font-mono">− {fmtINR(payslip.absenceDeduction + payslip.statutory.total)}</td></tr>
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
    {showCalc && <IncentiveCalcDrawer empId={emp.id} month={payslip.month} onClose={() => setShowCalc(false)}/>}
    </>
  );
}

function PayrollPage({ user, navArg }) {
  const store = useStore();
  const [month, setMonth] = useState('2026-06');
  const [selected, setSelected] = useState(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  /* Payroll is three stacked blocks rather than tabs, so a sidebar sub-item
     scrolls to its block instead of switching a tab. */
  const blockRefs = { run: useRef(null), travel: useRef(null), incentive: useRef(null) };
  useEffect(() => {
    if (!navArg) return;
    if (navArg.search) { setQ(navArg.search); setPage(0); }
    if (navArg.tab && blockRefs[navArg.tab] && blockRefs[navArg.tab].current) {
      blockRefs[navArg.tab].current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [navArg && navArg._n]);
  const emps = store.getEmployees({ status: 'active' });
  const run = store.getPayrollRun(month);
  const payslips = useMemo(() => emps.map((e) => store.computePayslip(e.id, month)), [store.state, month]);

  const totals = payslips.reduce((s, p) => ({
    base: s.base + p.base,
    ded: s.ded + p.absenceDeduction + p.statutory.total,
    inc: s.inc + p.incentive,
    travel: s.travel + p.travelAllowance,
    net: s.net + p.netPay,
  }), { base: 0, ded: 0, inc: 0, travel: 0, net: 0 });

  // filter + paginate the (large) payslip preview
  const filtered = useMemo(() => {
    if (!q) return payslips;
    const ql = q.toLowerCase();
    return payslips.filter((p) => { const e = store.getEmployee(p.employeeId); return e.name.toLowerCase().includes(ql) || e.code.toLowerCase().includes(ql); });
  }, [payslips, q]);
  const PER = 25;
  const pages = Math.ceil(filtered.length / PER) || 1;
  const pageSlips = filtered.slice(page * PER, page * PER + PER);

  const exportAll = () => {
    downloadCSV(`payroll_${month}_${run ? run.status : 'preview'}.csv`, [
      ['Code','Name','Site','Zone','Working','Present','Absent','Base','Absence Ded','PF','ESIC','PT','TDS','Sales','Incentive','Travel','Net Pay','Payroll Status'],
      ...payslips.map((p) => {
        const e = store.getEmployee(p.employeeId); const st = store.getSite(e.siteId);
        return [e.code, e.name, st?.name || '', st?.zone || '', p.workingDays, p.presentDays, p.absentDays, p.base, p.absenceDeduction,
          p.statutory.pfApplicable ? p.statutory.pf : 'N/A', p.statutory.esic, p.statutory.pt, p.statutory.tdsApplicable ? p.statutory.tds : 'N/A',
          p.sales, p.incentive, p.travelAllowance, p.netPay, p.payrollStatus];
      }),
    ]);
  };

  const eligible = emps.filter((e) => e.travelEligible);
  const topTravel = [...payslips].filter((p) => p.travelAllowance > 0).sort((a, b) => b.travelAllowance - a.travelAllowance).slice(0, 5);
  const topIncentive = [...payslips].filter((p) => p.incentive > 0).sort((a, b) => b.incentive - a.incentive).slice(0, 5);
  const onTarget = payslips.filter((p) => p.incentiveWinner === 'target' && p.incentive > 0).length;
  const cappedCount = payslips.filter((p) => p.incentiveCapped).length;

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Compensation" title="Payroll processing"
        subtitle={`${emps.length} employees · pro-rated over ${store.state.config.workingDays} working days · incentive is the higher of store target and slab`}>
        <Select value={month} onChange={(e) => setMonth(e.target.value)} className="!w-auto">
          <option value="2026-06">June 2026</option>
          <option value="2026-07">July 2026</option>
        </Select>
        <Btn onClick={exportAll}><Icon name="download" className="w-3.5 h-3.5"/>Export payout report</Btn>
      </PageHeader>

      <PayrollStateBar month={month} run={run} user={user}/>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Gross base" value={fmtINR(totals.base)} icon="wallet" tone="slate"/>
        <StatCard label="Deductions" value={fmtINR(totals.ded)} icon="alert" tone="red"/>
        <StatCard label="Incentives" value={fmtINR(totals.inc)} icon="trending-up" tone="green"/>
        <StatCard label="Travel allow." value={fmtINR(totals.travel)} icon="pin" tone="green"/>
        <StatCard label="Net payout" value={fmtINR(totals.net)} icon="check-circle" tone="brand"/>
      </div>

      {/* ---- Main payroll container ---- */}
      <div ref={blockRefs.run} className="scroll-mt-4"/>
      <Card title={`Payslip preview · ${fmtMonth(month)}`} subtitle={run ? `${PAYROLL_STATE_LABEL[run.status]} · ${run.count} payslips` : `${filtered.length} employees · not yet started`} bodyClass="p-0" noBody
        right={<div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"><Icon name="search" className="w-3.5 h-3.5 text-slate-400"/><input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search…" className="bg-transparent text-[12px] outline-none w-24 sm:w-32 dark:text-slate-100"/></div>
          <StatusBadge status={run ? run.status : 'draft'} label={run ? PAYROLL_STATE_LABEL[run.status] : 'Not started'}/>
        </div>}>
        <div className="overflow-x-auto">
          <table className="w-full dense-table">
            <thead><tr><th>Employee</th><th>Site</th><th className="text-right">Days</th><th className="text-right">Base</th><th className="text-right">Absence Ded.</th><th className="text-right">Statutory</th><th className="text-right">Sales</th><th className="text-right">Incentive</th><th className="text-right">Travel</th><th className="text-right">Net Pay</th><th></th></tr></thead>
            <tbody>
              {pageSlips.map((p) => {
                const e = store.getEmployee(p.employeeId);
                const highlight = p.absentDays > 0;
                return (
                  <tr key={p.employeeId} className={highlight ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                    <td>
                      <div className="flex items-center gap-2 min-w-0"><Avatar emp={e} size={26}/><div className="min-w-0"><div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">{e.name}</div><div className="text-[10px] text-slate-500 font-mono">{e.code} · {e.designation}</div></div></div>
                    </td>
                    <td className="text-[11px] text-slate-500">{store.getSite(e.siteId)?.city || '—'}</td>
                    <td className="text-right font-mono text-[11px]"><span className="text-emerald-600">{p.presentDays}</span>/<span className="text-slate-400">{p.workingDays}</span> {p.absentDays > 0 && <span className="text-rose-600 ml-1">-{p.absentDays}</span>}</td>
                    <td className="text-right font-mono">{fmtINR(p.base)}</td>
                    <td className="text-right font-mono text-rose-700 dark:text-rose-400">{p.absenceDeduction > 0 ? '−'+fmtINR(p.absenceDeduction) : '—'}</td>
                    <td className="text-right font-mono text-slate-500">−{fmtINR(p.statutory.total)}</td>
                    <td className="text-right font-mono text-[11px] text-slate-500">{fmtINR(p.sales)}</td>
                    <td className="text-right font-mono text-emerald-700 dark:text-emerald-400">{p.incentive > 0 ? '+'+fmtINR(p.incentive) : '—'}</td>
                    <td className="text-right font-mono text-[11px] text-emerald-700 dark:text-emerald-400">{p.travelAllowance > 0 ? '+'+fmtINR(p.travelAllowance) : '—'}</td>
                    <td className="text-right font-mono font-bold text-slate-900 dark:text-white">{fmtINR(p.netPay)}</td>
                    <td><Btn size="xs" onClick={() => setSelected(p)}>View</Btn></td>
                  </tr>
                );
              })}
              <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                <td colSpan={3}>Totals · all {payslips.length}</td>
                <td className="text-right font-mono">{fmtINR(totals.base)}</td>
                <td className="text-right font-mono text-rose-700">−{fmtINR(payslips.reduce((s,p) => s+p.absenceDeduction,0))}</td>
                <td className="text-right font-mono">−{fmtINR(payslips.reduce((s,p) => s+p.statutory.total,0))}</td>
                <td></td>
                <td className="text-right font-mono text-emerald-700">+{fmtINR(totals.inc)}</td>
                <td className="text-right font-mono text-emerald-700">+{fmtINR(totals.travel)}</td>
                <td className="text-right font-mono text-brand-700 dark:text-brand-300">{fmtINR(totals.net)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={pages} total={filtered.length} per={PER} onPage={setPage} unit="payslips"/>
      </Card>

      {/* ---- Two dedicated containers below the payroll run ----
           Travel allowance and Incentive are separate lines of pay with separate
           owners, so they get their own cards rather than a column in the run. */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* 1 · Travel allowance */}
        <div ref={blockRefs.travel} className="scroll-mt-4">
        <Card noBody
          title="Travel allowance" subtitle="Fixed commute allowance · toggled per employee in their profile"
          right={<Badge tone="green">{eligible.length} eligible</Badge>}>
          <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 border-b border-slate-200 dark:border-slate-800">
            {[
              ['Eligible staff', `${eligible.length} of ${emps.length}`, 'pin', 'emerald'],
              ['Total this month', fmtINR(totals.travel), 'wallet', 'brand'],
              ['Average / eligible', fmtINR(Math.round(totals.travel / Math.max(1, eligible.length))), 'chart', 'violet'],
              ['Share of payout', `${pctOf(totals.travel, totals.net)}%`, 'layers', 'slate'],
            ].map(([k, v, icon, tone]) => (
              <div key={k} className="flex items-center gap-2 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  tone === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600'
                  : tone === 'brand' ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700'
                  : tone === 'violet' ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  <Icon name={icon} className="w-4 h-4"/>
                </div>
                <div className="min-w-0">
                  <div className="text-slate-500 text-[10px] uppercase font-semibold truncate">{k}</div>
                  <div className="font-bold text-slate-800 dark:text-white text-[13px]">{v}</div>
                </div>
              </div>
            ))}
          </div>
          {eligible.length === 0 ? (
            <Empty icon="pin" title="No one is eligible" hint="Enable travel allowance from an employee's Settings tab."/>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full dense-table text-[12.5px]">
                <thead><tr><th>Employee</th><th>Store</th><th className="text-right">Allowance</th><th/></tr></thead>
                <tbody>
                  {topTravel.map((p) => {
                    const e = store.getEmployee(p.employeeId);
                    return (
                      <tr key={p.employeeId}>
                        <td>
                          <div className="flex items-center gap-2 min-w-0"><Avatar emp={e} size={24}/>
                            <div className="min-w-0"><div className="font-semibold truncate">{e.name}</div><div className="text-[10px] text-slate-500">{e.designation}</div></div>
                          </div>
                        </td>
                        <td className="text-[11px] text-slate-500 truncate max-w-[150px]">{store.getSite(e.siteId)?.name || '—'}</td>
                        <td className="text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">+{fmtINR(p.travelAllowance)}</td>
                        {/* Same payslip the main register opens — the allowance
                            only makes sense next to the rest of the pay. */}
                        <td className="text-right"><Btn size="xs" onClick={() => setSelected(p)}>View</Btn></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Top {topTravel.length} of {eligible.length} eligible employees</span>
                <Btn size="xs" onClick={() => downloadCSV(`travel_allowance_${month}.csv`, [
                  ['Code','Name','Designation','Store','Travel allowance'],
                  ...payslips.filter((p) => p.travelAllowance > 0).map((p) => {
                    const e = store.getEmployee(p.employeeId);
                    return [e.code, e.name, e.designation, store.getSite(e.siteId)?.name || '', p.travelAllowance];
                  }),
                ])}><Icon name="download" className="w-3 h-3"/>Export</Btn>
              </div>
            </>
          )}
        </Card>
        </div>

        {/* 2 · Incentive */}
        <div ref={blockRefs.incentive} className="scroll-mt-4">
        <Card noBody
          title="Incentive" subtitle="Higher of the store-target and slab calculations, per employee"
          right={<Badge tone="green">{payslips.filter((p) => p.incentive > 0).length} earning</Badge>}>
          <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 border-b border-slate-200 dark:border-slate-800">
            {[
              ['Total this month', fmtINR(totals.inc), 'trending-up', 'emerald'],
              ['Paid on target', String(onTarget), 'target', 'brand'],
              ['Paid on slab', String(payslips.filter((p) => p.incentive > 0).length - onTarget), 'layers', 'violet'],
              ['Hit the cap', String(cappedCount), 'alert', cappedCount ? 'amber' : 'slate'],
            ].map(([k, v, icon, tone]) => (
              <div key={k} className="flex items-center gap-2 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  tone === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600'
                  : tone === 'brand' ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700'
                  : tone === 'violet' ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700'
                  : tone === 'amber' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  <Icon name={icon} className="w-4 h-4"/>
                </div>
                <div className="min-w-0">
                  <div className="text-slate-500 text-[10px] uppercase font-semibold truncate">{k}</div>
                  <div className="font-bold text-slate-800 dark:text-white text-[13px]">{v}</div>
                </div>
              </div>
            ))}
          </div>
          {topIncentive.length === 0 ? (
            <Empty icon="trending-up" title="No incentive earned this month" hint="Set a store target or an incentive slab to start payouts."/>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full dense-table text-[12.5px]">
                <thead><tr><th>Employee</th><th className="text-right">Sales</th><th>Basis</th><th className="text-right">Incentive</th><th/></tr></thead>
                <tbody>
                  {topIncentive.map((p) => {
                    const e = store.getEmployee(p.employeeId);
                    return (
                      <tr key={p.employeeId}>
                        <td>
                          <div className="flex items-center gap-2 min-w-0"><Avatar emp={e} size={24}/>
                            <div className="min-w-0"><div className="font-semibold truncate">{e.name}</div><div className="text-[10px] text-slate-500 truncate">{store.getSite(e.siteId)?.city || '—'}</div></div>
                          </div>
                        </td>
                        <td className="text-right font-mono text-[11px] text-slate-500">{fmtINRShort(p.sales)}</td>
                        <td>
                          <Badge tone={p.incentiveWinner === 'target' ? 'brand' : 'violet'}>
                            {p.incentiveWinner === 'target' ? 'Store target' : 'Slab'}
                          </Badge>
                        </td>
                        <td className="text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">+{fmtINR(p.incentive)}</td>
                        <td className="text-right"><Btn size="xs" onClick={() => setSelected(p)}>View</Btn></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] gap-2 flex-wrap">
                <span className="text-slate-500">Top {topIncentive.length} earners · full detail on the Incentives page</span>
                <Btn size="xs" onClick={() => downloadCSV(`incentives_payroll_${month}.csv`, [
                  ['Code','Name','Store','Sales','Slab / target basis','Maximum eligible','Incentive paid','Capped'],
                  ...payslips.filter((p) => p.incentive > 0).map((p) => {
                    const e = store.getEmployee(p.employeeId);
                    return [e.code, e.name, store.getSite(e.siteId)?.name || '', p.sales,
                      p.incentiveWinner === 'target' ? 'Store target' : 'Incentive slab',
                      p.incentiveMaxEligible, p.incentive, p.incentiveCapped ? 'Yes' : 'No'];
                  }),
                ])}><Icon name="download" className="w-3 h-3"/>Export</Btn>
              </div>
            </>
          )}
        </Card>
        </div>
      </div>

      {selected && <PayslipModal payslip={selected} emp={store.getEmployee(selected.employeeId)} onClose={() => setSelected(null)}/>}
    </div>
  );
}

Object.assign(window, { PayrollPage, PayslipModal });
