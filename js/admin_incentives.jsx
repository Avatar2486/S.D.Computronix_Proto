/* ============================================================================
   Incentives — the dedicated dashboard for variable pay.

   The business rule this screen exists to make visible (spec §15):

        Store target × incentive %          Incentive slab + threshold rules
                     │                                     │
                     └──────────────┬──────────────────────┘
                                    ▼
                       MAXIMUM ELIGIBLE INCENTIVE
                                    ▼
                  Final incentive (capped at the monthly ceiling)

   Both branches are computed for every employee and shown side by side, with
   the winning branch marked, so an admin can see *why* someone is paid what
   they are paid — not just the total.
   ========================================================================== */

const INCENTIVE_MONTHS = [
  { id: '2026-07', label: 'July 2026' },
  { id: '2026-06', label: 'June 2026' },
];

/* One row = one employee for the selected month, with both branches resolved. */
function useIncentiveRows(user, month, f) {
  const store = useStore();
  const isSiteMgr = roleOf(user) === 'site-manager';

  return useMemo(() => {
    let emps = store.getEmployees({ status: 'active' });
    if (isSiteMgr) emps = emps.filter((e) => e.siteId === user.siteId);

    const rows = emps.map((emp) => {
      const site = store.getSite(emp.siteId);
      const sales = store.getSales(emp.id, month)?.totalSales || 0;
      const inc = store.calcIncentive(sales, emp, month);
      const bd = inc.breakdown || {};
      const target = bd.target || null;
      const slabBranch = bd.slabBranch != null ? bd.slabBranch : inc.payout;
      const targetBranch = bd.targetBranch || 0;
      return {
        emp, site, sales,
        target,
        targetAmount: target ? target.amount : null,
        achieved: target ? target.achieved : null,
        achievedPct: target ? target.achievedPct : null,
        incentivePct: target ? target.pct : null,
        slabLabel: inc.template ? (inc.template.label || '—') : (inc.slab ? inc.slab.label : '—'),
        slabBranch, targetBranch,
        winner: inc.winner,
        maxEligible: inc.maxEligible != null ? inc.maxEligible : inc.payout,
        payout: inc.payout,
        capped: !!inc.capped,
        status: inc.payout > 0 ? 'earning' : (target && !target.met ? 'target-missed' : 'none'),
      };
    });

    return rows.filter((r) => {
      if (f.q) {
        const ql = f.q.trim().toLowerCase();
        if (!(`${r.emp.name} ${r.emp.code} ${r.emp.designation} ${r.site ? r.site.name + ' ' + r.site.city : ''}`.toLowerCase().includes(ql))) return false;
      }
      if (f.siteId !== 'all' && r.emp.siteId !== f.siteId) return false;
      if (f.teamLead !== 'all' && (!r.site || r.site.teamLeadId !== f.teamLead)) return false;
      if (f.zone !== 'all' && (!r.site || r.site.zone !== f.zone)) return false;
      if (f.designation !== 'all' && r.emp.designation !== f.designation) return false;
      if (f.empId !== 'all' && r.emp.id !== f.empId) return false;
      if (f.status !== 'all' && r.status !== f.status) return false;
      if (f.basis !== 'all' && r.winner !== f.basis) return false;
      return true;
    }).sort((a, b) => b.payout - a.payout);
  }, [store.state, month, f, isSiteMgr, user.siteId]);
}

/* Detail modal — the full derivation for one employee. */
function IncentiveBreakdownModal({ row, month, onClose }) {
  const store = useStore();
  const { emp, site, sales, target, slabBranch, targetBranch, winner, maxEligible, payout, capped } = row;
  const detail = store.incentiveDetail(emp, month);
  const bd = store.calcIncentive(sales, emp, month).breakdown || {};

  const Branch = ({ title, subtitle, amount, active, children }) => (
    <div className={`rounded-xl border-2 p-3 ${active
      ? 'border-emerald-400 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-900/20'
      : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{title}</div>
          <div className="text-[10.5px] text-slate-500">{subtitle}</div>
        </div>
        {active && <Badge tone="green"><Icon name="check" className="w-3 h-3"/>Higher</Badge>}
      </div>
      <div className={`text-xl font-bold mt-1.5 ${active ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'}`}>{fmtINR(amount)}</div>
      <div className="mt-2 space-y-1 text-[11px]">{children}</div>
    </div>
  );

  return (
    <Modal open onClose={onClose} size="lg" icon="trending-up"
      title={`Incentive breakdown — ${emp.name}`}
      subtitle={`${emp.designation} · ${site ? site.name : 'Unassigned'} · ${fmtMonth(month)}`}
      footer={<Btn variant="primary" onClick={onClose}>Close</Btn>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            ['Sales achieved', fmtINR(sales)],
            ['Store target', target ? fmtINR(target.amount) : 'None set'],
            ['Store achievement', target ? `${target.achievedPct}%` : '—'],
            ['Final incentive', fmtINR(payout)],
          ].map(([k, v]) => (
            <div key={k} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500">{k}</div>
              <div className="text-[15px] font-bold text-slate-800 dark:text-slate-100">{v}</div>
            </div>
          ))}
        </div>

        {/* The two branches, side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Branch title="A · Store target × incentive %"
            subtitle={target ? `${target.pct}% of own sales once the store clears its target` : 'No target set for this store'}
            amount={targetBranch} active={winner === 'target' && targetBranch > 0}>
            {target ? (
              <>
                <div className="flex justify-between"><span className="text-slate-500">Store target</span><span className="font-mono font-semibold">{fmtINR(target.amount)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Store achieved</span><span className="font-mono font-semibold">{fmtINR(target.achieved)}</span></div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target met?</span>
                  <span className={`font-semibold ${target.met ? 'text-emerald-600' : 'text-amber-600'}`}>{target.met ? 'Yes' : `No — ${target.achievedPct}%`}</span>
                </div>
                <div className="flex justify-between"><span className="text-slate-500">Employee sales</span><span className="font-mono font-semibold">{fmtINR(target.empSales)}</span></div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1 mt-1">
                  <span className="text-slate-500">{target.pct}% of employee sales</span>
                  <span className="font-mono font-bold">{fmtINR(targetBranch)}</span>
                </div>
                <div className="text-[10px] text-slate-400">Max eligible at exactly target: {fmtINR(target.maxEligible)}</div>
              </>
            ) : (
              <div className="text-slate-400 italic">Set a target on this store to enable the target-based branch.</div>
            )}
          </Branch>

          <Branch title="B · Incentive slab + rules"
            subtitle={row.slabLabel}
            amount={slabBranch} active={winner === 'slab' && slabBranch > 0}>
            <div className="flex justify-between">
              <span className="text-slate-500">Slab tier payout <span className="text-[9.5px] text-slate-400">(max tier reached — never summed)</span></span>
              <span className="font-mono font-semibold">{fmtINR(bd.slab || 0)}</span>
            </div>
            {(bd.applied.length > 0 || bd.pending.length > 0) && (
              <div className="text-[9.5px] uppercase tracking-wide text-slate-400 font-bold pt-1">
                Threshold rules (additive, independent of slab)
              </div>
            )}
            {(bd.applied || []).map((r, i) => (
              <div key={r.id || i} className="flex justify-between">
                <span className="text-slate-500 truncate pr-2">
                  {r.scope === 'store' ? 'Store rule' : 'Employee rule'} · {r.type === 'pct' ? r.value + '%' : fmtINR(+r.value)}
                  {+r.minSales > 0 ? ` above ${fmtINRShort(+r.minSales)}` : ''}
                </span>
                <span className="font-mono font-semibold shrink-0">{fmtINR(r.amount)}</span>
              </div>
            ))}
            {(bd.pending || []).map((r, i) => (
              <div key={'p' + (r.id || i)} className="flex justify-between opacity-60">
                <span className="text-slate-500 truncate pr-2">
                  Not triggered · needs {fmtINRShort(r.minSales)}
                </span>
                <span className="font-mono shrink-0">—</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1 mt-1">
              <span className="text-slate-500">Branch total</span>
              <span className="font-mono font-bold">{fmtINR(slabBranch)}</span>
            </div>
          </Branch>
        </div>

        {/* Resolution */}
        <div className="rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 p-3">
          <div className="flex items-center gap-2 text-[12px] font-bold text-brand-900 dark:text-brand-100">
            <Icon name="award" className="w-4 h-4"/>Resolution
          </div>
          <div className="mt-2 space-y-1 text-[12px]">
            <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">Higher of A ({fmtINR(targetBranch)}) and B ({fmtINR(slabBranch)})</span><span className="font-mono font-bold">{fmtINR(maxEligible)}</span></div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-300">Monthly ceiling</span>
              <span className="font-mono">{fmtINR(Store.RULE_CAP)}</span>
            </div>
            {capped && <div className="text-[11px] text-amber-700 dark:text-amber-300">Capped at the monthly ceiling — {fmtINR(maxEligible - payout)} not payable.</div>}
            <div className="flex justify-between border-t border-brand-200 dark:border-brand-800 pt-1.5 mt-1.5">
              <span className="font-bold text-slate-800 dark:text-slate-100">Final incentive</span>
              <span className="font-mono font-bold text-lg text-emerald-700 dark:text-emerald-300">{fmtINR(payout)}</span>
            </div>
          </div>
        </div>

        {/* Audit trail — who last touched the rule/slab/target behind this figure */}
        {(() => {
          const audit = [
            ...store.getIncentiveAudit({ empId: emp.id }),
            ...(site ? store.getIncentiveAudit({ siteId: site.id }) : []),
          ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 5);
          if (!audit.length) return null;
          return (
            <Card title="Recent configuration changes" bodyClass="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {audit.map((a) => (
                  <div key={a.id} className="px-3 py-2 flex items-center justify-between text-[11.5px]">
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{a.action.replace(/\./g, ' ')}</span>
                      <span className="text-slate-400"> · {a.by}</span>
                    </div>
                    <span className="font-mono text-slate-400">{fmtDateTime(a.at)}</span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })()}

        {/* Slab tier ladder for context */}
        {detail.tiers && detail.tiers.length > 0 && (
          <Card title="Slab tiers" subtitle={detail.raw || detail.label} bodyClass="p-3">
            <div className="space-y-1.5">
              {detail.tiers.map((t, i) => (
                <div key={i} className={`flex items-center gap-2 text-[12px] px-2 py-1 rounded ${t.active ? 'bg-brand-50 dark:bg-brand-900/30 font-semibold' : ''}`}>
                  <Icon name={t.reached ? 'check-circle' : 'clock'} className={`w-3.5 h-3.5 shrink-0 ${t.reached ? 'text-emerald-600' : 'text-slate-300'}`}/>
                  <span className="text-slate-600 dark:text-slate-300">From {t.fromLabel}</span>
                  <span className="ml-auto text-slate-800 dark:text-slate-100">{t.payoutText}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </Modal>
  );
}

/* ---------------- Dashboard tab ---------------- */
function IncentiveDashboard({ user, month, setMonth }) {
  const store = useStore();
  const [detail, setDetail] = useState(null);
  const [editEmp, setEditEmp] = useState(null);
  const [page, setPage] = useState(0);
  const PER = 25;

  const BLANK = { q: '', zone: 'all', siteId: 'all', teamLead: 'all', designation: 'all', empId: 'all', status: 'all', basis: 'all' };
  const [f, setF] = useState(BLANK);
  const set = (patch) => setF((p) => ({ ...p, ...patch }));

  const rows = useIncentiveRows(user, month, f);
  useEffect(() => { setPage(0); }, [f, month]);

  const hierarchy = store.getHierarchy();
  const sitesInScope = useMemo(() => store.getSites().filter((s) =>
    (f.zone === 'all' || s.zone === f.zone) && (f.teamLead === 'all' || s.teamLeadId === f.teamLead)
  ), [store.state, f.zone, f.teamLead]);
  const teamLeads = store.getTeamLeads().filter((m) => f.zone === 'all' || m.zone === f.zone);
  const designations = useMemo(() => [...new Set(store.getEmployees({ status: 'active' }).map((e) => e.designation).filter(Boolean))].sort(), [store.state]);
  const empOptions = useMemo(() => store.getEmployees({ status: 'active' }).slice(0, 600)
    .map((e) => ({ value: e.id, label: e.name, sub: `${e.code} · ${e.designation}`, keywords: e.code })), [store.state]);

  const totals = rows.reduce((a, r) => ({
    payout: a.payout + r.payout,
    maxEligible: a.maxEligible + r.maxEligible,
    sales: a.sales + r.sales,
    targetWins: a.targetWins + (r.winner === 'target' && r.payout > 0 ? 1 : 0),
    earning: a.earning + (r.payout > 0 ? 1 : 0),
  }), { payout: 0, maxEligible: 0, sales: 0, targetWins: 0, earning: 0 });

  const activeCount = Object.keys(BLANK).filter((k) => f[k] !== BLANK[k]).length;
  const chips = [];
  if (f.zone !== 'all')        chips.push({ k: 'zone', label: 'Zone: ' + f.zone, clear: () => set({ zone: 'all', siteId: 'all', teamLead: 'all' }) });
  if (f.teamLead !== 'all')    chips.push({ k: 'tl', label: 'Team Lead: ' + ((store.getTeamLead(f.teamLead) || {}).name || ''), clear: () => set({ teamLead: 'all' }) });
  if (f.siteId !== 'all')      chips.push({ k: 'store', label: 'Store: ' + ((store.getSite(f.siteId) || {}).name || ''), clear: () => set({ siteId: 'all' }) });
  if (f.designation !== 'all') chips.push({ k: 'desig', label: 'Designation: ' + f.designation, clear: () => set({ designation: 'all' }) });
  if (f.empId !== 'all')       chips.push({ k: 'emp', label: 'Employee: ' + ((store.getEmployee(f.empId) || {}).name || ''), clear: () => set({ empId: 'all' }) });
  if (f.status !== 'all')      chips.push({ k: 'status', label: 'Status: ' + f.status, clear: () => set({ status: 'all' }) });
  if (f.basis !== 'all')       chips.push({ k: 'basis', label: 'Basis: ' + (f.basis === 'target' ? 'Store target' : 'Slab'), clear: () => set({ basis: 'all' }) });
  if (f.q)                     chips.push({ k: 'q', label: `Search: ${f.q}`, clear: () => set({ q: '' }) });

  const pages = Math.ceil(rows.length / PER) || 1;
  const shown = rows.slice(page * PER, page * PER + PER);

  const exportCSV = () => downloadCSV(`incentives_${month}.csv`, [
    ['Code','Employee','Designation','Store','Team Lead','Sales','Store target','Target achieved','Achievement %',
     'Incentive %','Incentive slab','Slab incentive','Target incentive','Maximum eligible','Final incentive','Basis'],
    ...rows.map((r) => [r.emp.code, r.emp.name, r.emp.designation, r.site ? r.site.name : '', r.site ? r.site.cm : '',
      r.sales, r.targetAmount != null ? r.targetAmount : '', r.achieved != null ? r.achieved : '',
      r.achievedPct != null ? r.achievedPct : '', r.incentivePct != null ? r.incentivePct : '',
      r.slabLabel, r.slabBranch, r.targetBranch, r.maxEligible, r.payout,
      r.winner === 'target' ? 'Store target' : 'Incentive slab']),
  ]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Employees" value={rows.length} sub="In current filter" icon="users" tone="brand"/>
        <StatCard label="Earning" value={totals.earning} sub={`${pctOf(totals.earning, rows.length)}% of scope`} icon="check-circle" tone="green"/>
        <StatCard label="Total sales" value={fmtINRShort(totals.sales)} sub={fmtMonth(month)} icon="chart" tone="slate"/>
        <StatCard label="Max eligible" value={fmtINR(totals.maxEligible)} sub="Before the monthly cap" icon="layers" tone="amber"/>
        <StatCard label="Final incentive" value={fmtINR(totals.payout)} sub="Payable this month" icon="wallet" tone="green"/>
        <StatCard label="Paid on target" value={totals.targetWins} sub={`${rows.length - totals.targetWins} on slab`} icon="target" tone="brand"/>
      </div>

      <FilterBar activeCount={activeCount} onReset={() => setF(BLANK)}
        hint="Filters combine — every figure above and below reflects them">
        <Field label="Search">
          <Input value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="Name, code or store…"/>
        </Field>
        <Field label="Period">
          <Select value={month} onChange={(e) => setMonth(e.target.value)}>
            {INCENTIVE_MONTHS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </Select>
        </Field>
        <Field label="Employee">
          <SearchSelect value={f.empId} onChange={(v) => set({ empId: v })}
            options={[{ value: 'all', label: 'All employees' }, ...empOptions]}
            searchPlaceholder="Search employee…" emptyLabel="No employee matches"/>
        </Field>
        <Field label="Store">
          <SearchSelect value={f.siteId} onChange={(v) => set({ siteId: v })}
            options={[{ value: 'all', label: `All stores (${sitesInScope.length})` },
              ...sitesInScope.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .map((s) => ({ value: s.id, label: s.name, sub: [s.city, s.code].filter(Boolean).join(' · '), keywords: s.code }))]}
            searchPlaceholder="Search store…" emptyLabel="No store matches"/>
        </Field>
        <Field label="Team Lead">
          <SearchSelect value={f.teamLead} onChange={(v) => set({ teamLead: v, siteId: 'all' })}
            options={[{ value: 'all', label: `All Team Leads (${teamLeads.length})` },
              ...teamLeads.map((m) => ({ value: m.id, label: m.name, sub: `${m.storeCount} stores` }))]}
            searchPlaceholder="Search Team Lead…" emptyLabel="No match"/>
        </Field>
        <Field label="Zone">
          <Select value={f.zone} onChange={(e) => set({ zone: e.target.value, siteId: 'all', teamLead: 'all' })}>
            <option value="all">All zones</option>
            {(hierarchy.zones || []).map((z) => <option key={z} value={z}>{z}</option>)}
          </Select>
        </Field>
        <Field label="Designation">
          <SearchSelect value={f.designation} onChange={(v) => set({ designation: v })}
            options={[{ value: 'all', label: 'All designations' }, ...designations.map((d) => ({ value: d, label: d }))]}
            searchPlaceholder="Search designation…" emptyLabel="No match"/>
        </Field>
        <Field label="Incentive status">
          <Select value={f.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="all">All statuses</option>
            <option value="earning">Earning</option>
            <option value="target-missed">Target missed</option>
            <option value="none">No incentive</option>
          </Select>
        </Field>
        <Field label="Paid on">
          <Select value={f.basis} onChange={(e) => set({ basis: e.target.value })}>
            <option value="all">Either basis</option>
            <option value="target">Store target</option>
            <option value="slab">Incentive slab</option>
          </Select>
        </Field>
      </FilterBar>

      <FilterChips chips={chips} onClearAll={() => setF(BLANK)}/>

      <Card noBody
        title={`Incentive register · ${fmtMonth(month)}`}
        subtitle={`${rows.length} employees · higher of store target and incentive slab is paid`}
        right={<Btn size="xs" onClick={exportCSV}><Icon name="download" className="w-3 h-3"/>Export</Btn>}>
        <div className="overflow-x-auto">
          <table className="w-full dense-table text-[12.5px]">
            <thead>
              <tr>
                <th>Employee</th><th>Store</th>
                <th className="text-right">Store target</th>
                <th className="text-right">Achieved</th>
                <th>Achievement</th>
                <th className="text-right">Incentive %</th>
                <th className="hidden xl:table-cell">Slab</th>
                <th className="text-right">Slab earns</th>
                <th className="text-right">Target earns</th>
                <th className="text-right">Max eligible</th>
                <th className="text-right">Final</th>
                <th/>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => setDetail(r)}>
                  <td>
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar emp={r.emp} size={26}/>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">{r.emp.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{r.emp.code} · {r.emp.designation}</div>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[160px]">
                    {r.site
                      ? <div><div className="text-[11.5px] text-slate-700 dark:text-slate-200 truncate">{r.site.name}</div><div className="text-[10px] text-slate-500 truncate">{r.site.city}</div></div>
                      : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="text-right font-mono">{r.targetAmount != null ? fmtINRShort(r.targetAmount) : <span className="text-slate-400">—</span>}</td>
                  <td className="text-right font-mono">{r.achieved != null ? fmtINRShort(r.achieved) : <span className="text-slate-400">—</span>}</td>
                  <td>
                    {r.achievedPct != null ? (
                      <div className="flex items-center gap-1.5">
                        <ProgressBar value={r.achievedPct} className="w-14 sm:w-20"/>
                        <span className={`text-[10.5px] font-mono font-semibold ${r.target.met ? 'text-emerald-600' : 'text-amber-600'}`}>{r.achievedPct}%</span>
                      </div>
                    ) : <span className="text-[11px] text-slate-400 italic">No target</span>}
                  </td>
                  <td className="text-right font-mono">{r.incentivePct != null ? r.incentivePct + '%' : '—'}</td>
                  <td className="hidden xl:table-cell max-w-[150px]">
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate block" title={r.slabLabel}>{r.slabLabel}</span>
                  </td>
                  <td className={`text-right font-mono ${r.winner === 'slab' && r.payout > 0 ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>
                    {fmtINR(r.slabBranch)}
                  </td>
                  <td className={`text-right font-mono ${r.winner === 'target' && r.payout > 0 ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>
                    {r.target ? fmtINR(r.targetBranch) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="text-right font-mono font-semibold text-slate-800 dark:text-slate-100">{fmtINR(r.maxEligible)}</td>
                  <td className="text-right">
                    <div className="font-mono font-bold text-brand-700 dark:text-brand-300">{fmtINR(r.payout)}</div>
                    {r.payout > 0 && (
                      <div className="text-[9.5px] text-slate-400">{r.winner === 'target' ? 'on target' : 'on slab'}{r.capped ? ' · capped' : ''}</div>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Btn size="xs" onClick={() => setDetail(r)} title="Breakdown"><Icon name="eye" className="w-3 h-3"/></Btn>
                      {can(user, 'incentive.edit') && (
                        <Btn size="xs" onClick={() => setEditEmp(r.emp)} title="Edit rules"><Icon name="edit" className="w-3 h-3"/></Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={12}><Empty title="No employees match these filters" hint="Clear a chip above to widen the scope."/></td></tr>}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                  <td colSpan={7}>Totals · {rows.length} employees</td>
                  <td className="text-right font-mono">{fmtINR(rows.reduce((n, r) => n + r.slabBranch, 0))}</td>
                  <td className="text-right font-mono">{fmtINR(rows.reduce((n, r) => n + r.targetBranch, 0))}</td>
                  <td className="text-right font-mono">{fmtINR(totals.maxEligible)}</td>
                  <td className="text-right font-mono text-brand-700 dark:text-brand-300">{fmtINR(totals.payout)}</td>
                  <td/>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <Pagination page={page} pages={pages} total={rows.length} per={PER} onPage={setPage} unit="employees"/>
      </Card>

      {detail && <IncentiveBreakdownModal row={detail} month={month} onClose={() => setDetail(null)}/>}
      {editEmp && <EmpIncentiveEditModal emp={editEmp} month={month} onClose={() => setEditEmp(null)} user={user}/>}
    </div>
  );
}

/* ---------------- Store view ---------------- */
function IncentiveByStore({ user, month }) {
  const store = useStore();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(null);
  const PER = 20;

  const rows = useMemo(() => {
    const staffBySite = {};
    store.getEmployees({ status: 'active' }).forEach((e) => { (staffBySite[e.siteId] = staffBySite[e.siteId] || []).push(e); });
    return Object.keys(staffBySite).map((siteId) => {
      const site = store.getSite(siteId);
      if (!site) return null;
      const staff = staffBySite[siteId];
      const summary = store.getStoreTargetSummary(siteId, month);
      const payout = staff.reduce((n, e) => n + store.calcIncentive(store.getSales(e.id, month)?.totalSales || 0, e, month).payout, 0);
      return { site, staff: staff.length, ...summary, payout };
    }).filter(Boolean)
      .filter((r) => !q || `${r.site.name} ${r.site.code} ${r.site.city} ${r.site.cm}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.payout - a.payout);
  }, [store.state, month, q]);

  useEffect(() => { setPage(0); }, [q, month]);
  const pages = Math.ceil(rows.length / PER) || 1;
  const shown = rows.slice(page * PER, page * PER + PER);

  return (
    <div className="space-y-4">
      <Card noBody
        title={`Incentive by store · ${fmtMonth(month)}`}
        subtitle={`${rows.length} staffed stores · sorted by incentive paid`}
        right={
          <div className="flex items-center gap-1.5 h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <Icon name="search" className="w-3.5 h-3.5 text-slate-400"/>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search store…" className="bg-transparent text-[12px] outline-none w-32 dark:text-slate-100"/>
          </div>
        }>
        <div className="overflow-x-auto">
          <table className="w-full dense-table text-[12.5px]">
            <thead>
              <tr>
                <th>Store</th><th className="hidden lg:table-cell">Team Lead</th><th className="text-right">Staff</th>
                <th className="text-right">Target</th><th className="text-right">Achieved</th><th>Achievement</th>
                <th className="text-right">Incentive %</th><th className="text-right">Incentive paid</th><th/>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.site.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td>
                    <div className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[200px]">{r.site.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{r.site.code} · {r.site.city}</div>
                  </td>
                  <td className="hidden lg:table-cell text-slate-600 dark:text-slate-300 truncate max-w-[130px]">{r.site.cm || '—'}</td>
                  <td className="text-right"><Badge tone="brand">{r.staff}</Badge></td>
                  <td className="text-right font-mono">{r.target ? fmtINRShort(r.target.amount) : <span className="text-slate-400">—</span>}</td>
                  <td className="text-right font-mono">{fmtINRShort(r.achieved)}</td>
                  <td>
                    {r.achievedPct != null ? (
                      <div className="flex items-center gap-1.5">
                        <ProgressBar value={r.achievedPct} className="w-16 sm:w-24"/>
                        <span className={`text-[10.5px] font-mono font-semibold ${r.met ? 'text-emerald-600' : 'text-amber-600'}`}>{r.achievedPct}%</span>
                      </div>
                    ) : <span className="text-[11px] text-slate-400 italic">No target</span>}
                  </td>
                  <td className="text-right font-mono">{r.target ? r.target.incentivePct + '%' : '—'}</td>
                  <td className="text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">{fmtINR(r.payout)}</td>
                  <td>
                    <div className="flex justify-end">
                      <Btn size="xs" disabled={!can(user, 'target.edit')} onClick={() => setEditing(r.site)}>
                        <Icon name="target" className="w-3 h-3"/>{r.target ? 'Edit' : 'Set'} target
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9}><Empty title="No staffed stores match"/></td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={pages} total={rows.length} per={PER} onPage={setPage} unit="stores"/>
      </Card>

      {editing && <StoreTargetModal site={editing} period={month} onClose={() => setEditing(null)}/>}
    </div>
  );
}

/* ---------------- Page shell ---------------- */
function IncentivesPage({ user, navArg }) {
  const [tab, setTab] = useState('dashboard');
  const [month, setMonth] = useState('2026-07');

  const TABS = [
    { id: 'dashboard', label: 'Dashboard',     icon: 'chart' },
    { id: 'stores',    label: 'By store',      icon: 'building' },
    ...(can(user, 'incentive.edit') ? [{ id: 'config', label: 'Configuration', icon: 'settings' }] : []),
  ];

  // Opened from a sidebar sub-item: go straight to that tab.
  useEffect(() => {
    if (navArg && navArg.tab && TABS.some((t) => t.id === navArg.tab)) setTab(navArg.tab);
  }, [navArg && navArg._n]);

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Compensation" title="Incentives"
        subtitle="Store target versus incentive slab, compared per employee — the higher eligible amount is paid.">
        {tab !== 'config' && (
          <Select value={month} onChange={(e) => setMonth(e.target.value)} className="!w-auto">
            {INCENTIVE_MONTHS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </Select>
        )}
      </PageHeader>

      <Tabs tabs={TABS} value={tab} onChange={setTab}/>

      {tab === 'dashboard' && <IncentiveDashboard user={user} month={month} setMonth={setMonth}/>}
      {tab === 'stores'    && <IncentiveByStore user={user} month={month}/>}
      {tab === 'config'    && <IncentiveConfigPanel user={user}/>}
    </div>
  );
}

Object.assign(window, {
  IncentivesPage, IncentiveDashboard, IncentiveByStore, IncentiveBreakdownModal,
  useIncentiveRows, INCENTIVE_MONTHS,
});
