/* One incentive calculation, explained the same way everywhere.

   `admin_incentives.jsx` already builds the two-branch (target vs slab)
   breakdown correctly (`useIncentiveRows`, `IncentiveBreakdownModal`) — this
   file does not duplicate that math. It adds a drop-in-anywhere entry point
   that needs only an employee id and a month (no filtered-rows context), so
   Payroll, Employee Detail and the mobile app can all open the exact same
   drawer the Incentives dashboard uses, plus a compact badge for places that
   only have room for one line. */

/* Same per-employee shape `useIncentiveRows` builds, standalone. Keeping this
   in one place means a future change to what a "row" contains only has to
   happen here and in useIncentiveRows, not at every call site. */
function buildIncentiveRow(store, emp, month) {
  const site = store.getSite(emp.siteId);
  const sales = store.getSales(emp.id, month)?.totalSales || 0;
  const inc = store.calcIncentive(sales, emp, month);
  const bd = inc.breakdown || {};
  const target = bd.target || null;
  return {
    emp, site, sales, target,
    targetAmount: target ? target.amount : null,
    achieved: target ? target.achieved : null,
    achievedPct: target ? target.achievedPct : null,
    incentivePct: target ? target.pct : null,
    slabLabel: inc.template ? (inc.template.label || '—') : (inc.slab ? inc.slab.label : '—'),
    slabBranch: bd.slabBranch != null ? bd.slabBranch : inc.payout,
    targetBranch: bd.targetBranch || 0,
    winner: inc.winner,
    maxEligible: inc.maxEligible != null ? inc.maxEligible : inc.payout,
    payout: inc.payout,
    capped: !!inc.capped,
    status: inc.payout > 0 ? 'earning' : (target && !target.met ? 'target-missed' : 'none'),
  };
}

/* `IncentiveBreakdownModal` (admin_incentives.jsx) is the drawer — this is
   just the thin, context-free way to open it from anywhere. */
function IncentiveCalcDrawer({ empId, month, onClose }) {
  const store = useStore();
  const emp = store.getEmployee(empId);
  if (!emp) return null;
  const row = buildIncentiveRow(store, emp, month);
  return <IncentiveBreakdownModal row={row} month={month} onClose={onClose}/>;
}

/* One line: which branch won, and what it paid — for places that only have
   room for a badge (mobile Home/Profile, a payroll table row). Never shows a
   figure to a viewer who lacks incentive.view; that gate is the caller's job,
   same as every other money control in the app. */
function IncentiveWinnerBadge({ detail, className = '' }) {
  if (!detail) return null;
  const winner = detail.winner === 'target' ? 'Store target' : 'Slab';
  const tone = detail.payout > 0 ? 'green' : 'slate';
  return (
    <Badge tone={tone} className={className}>
      {winner}{detail.capped ? ' · capped' : ''} · {fmtINR(detail.payout)}
    </Badge>
  );
}

Object.assign(window, { buildIncentiveRow, IncentiveCalcDrawer, IncentiveWinnerBadge });
