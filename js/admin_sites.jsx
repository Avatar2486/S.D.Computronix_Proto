/* Client-location (store) management — real hierarchy (zone/region/BM/CM),
   store-specific incentive slab, geo-fence, filter + pagination + map picker. */

/* ---- Shared incentive row editor — used in Sites and Employees pages ----

   Each row is an INDEPENDENT rule: "once monthly sales cross <Sales from>,
   pay <value>". Rules do not override one another the way slab tiers do —
   every rule that clears its threshold pays, and they add up. */

/* Plain-English preview of a single rule, e.g.
   "Pays 10% of sales once monthly sales cross ₹50,000". */
function incentiveRuleText(row) {
  const min = +row.minSales || 0;
  const val = +row.value || 0;
  if (!val) return 'Set a value to activate this rule';
  const pay = row.type === 'pct' ? val + '% of sales' : fmtINR(val);
  return min > 0
    ? `Pays ${pay} once monthly sales cross ${fmtINR(min)}`
    : `Pays ${pay} from the first rupee of sales`;
}

/* `sales` is the figure the rule will actually be applied to (the employee's or
   store's sales for the period). Passing it turns every row into a live rupee
   readout, so nobody has to work out what "10%" is worth. */
function IncentiveEditor({ incentives, onChange, sales, readOnly = false }) {
  const rows = incentives || [];
  const addRow = () => onChange([...rows, { id: 'inc_' + Math.random().toString(36).slice(2, 8), minSales: '', type: 'pct', value: '' }]);
  const updateRow = (id, patch) => onChange(rows.map((r) => r.id === id ? { ...r, ...patch } : r));
  const removeRow = (id) => onChange(rows.filter((r) => r.id !== id));

  // Base the preview on the rule's own threshold when no live sales are known —
  // "what this pays the moment it triggers" is still a real, useful number.
  const baseFor = (row) => (+sales || 0) || (+row.minSales || 0);
  const amountFor = (row) => row.type === 'pct'
    ? Math.round((baseFor(row) * (+row.value || 0)) / 100)
    : Math.round(+row.value || 0);
  const total = rows.reduce((n, r) => n + (r.value === '' || r.value == null ? 0 : amountFor(r)), 0);

  return (
    <div>
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        {rows.length > 0 && (
          <div className="hidden sm:grid grid-cols-[1.1fr_1fr_1fr_1.1fr_auto] gap-2 px-3 py-1.5 text-[10px] uppercase font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
            <div>Sales from (₹)</div><div>Incentive Type</div><div>Value</div><div>Actual amount</div><div/>
          </div>
        )}
        {rows.map((row) => {
          const hasValue = row.value !== '' && row.value != null;
          return (
            <div key={row.id} className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <div className="grid grid-cols-2 sm:grid-cols-[1.1fr_1fr_1fr_1.1fr_auto] gap-2 items-center">
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 select-none">₹</span>
                  <input
                    type="number" min="0" step="1000" disabled={readOnly}
                    value={row.minSales == null ? '' : row.minSales}
                    onChange={(e) => updateRow(row.id, { minSales: e.target.value })}
                    className="w-full h-8 pl-6 pr-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="50000"
                  />
                </div>
                <select
                  value={row.type} disabled={readOnly}
                  onChange={(e) => updateRow(row.id, { type: e.target.value })}
                  className="h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="pct">Percentage (%)</option>
                  <option value="flat">Fixed Amount (₹)</option>
                </select>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 select-none">
                    {row.type === 'pct' ? '%' : '₹'}
                  </span>
                  <input
                    type="number"
                    min="0" disabled={readOnly}
                    step={row.type === 'pct' ? '0.1' : '1'}
                    value={row.value}
                    onChange={(e) => updateRow(row.id, { value: e.target.value })}
                    className="w-full h-8 pl-6 pr-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder={row.type === 'pct' ? '10' : '2000'}
                  />
                </div>
                {/* Live rupee value of whatever was just typed */}
                <div className={`h-8 px-2 flex items-center rounded-md border ${hasValue
                  ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'}`}>
                  <span className={`text-[12.5px] font-bold ${hasValue ? 'text-emerald-800 dark:text-emerald-200' : 'text-slate-400'}`}>
                    {hasValue ? fmtINR(amountFor(row)) : '—'}
                  </span>
                </div>
                {!readOnly && (
                  <button onClick={() => removeRow(row.id)} className="w-7 h-7 flex items-center justify-center rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition justify-self-end">
                    <Icon name="trash" className="w-3.5 h-3.5"/>
                  </button>
                )}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                <Icon name="info" className="w-3 h-3 shrink-0 text-slate-400"/>
                {incentiveRuleText(row)}
                {hasValue && row.type === 'pct' && (
                  <span className="text-slate-400"> · {row.value}% of {fmtINR(baseFor(row))}{+sales ? ' (actual sales)' : ' (at threshold)'} = <span className="font-semibold text-emerald-700 dark:text-emerald-300">{fmtINR(amountFor(row))}</span></span>
                )}
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="px-3 py-3 text-[11px] text-slate-500 italic">
            {readOnly ? 'No incentives defined.' : 'No incentives defined — click "Add Incentive" to begin.'}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
        {readOnly ? (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <Icon name="lock" className="w-3.5 h-3.5"/>Read-only — Admin only
          </span>
        ) : (
          <button onClick={addRow} className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300 hover:text-brand-800 dark:hover:text-brand-200 transition">
            <Icon name="plus" className="w-3.5 h-3.5"/>Add Incentive
          </button>
        )}
        {rows.length > 0 && (
          <span className="text-[11px] text-slate-500">
            Combined rule value: <span className="font-bold text-emerald-700 dark:text-emerald-300">{fmtINR(total)}</span>
            {rows.length > 1 && <span className="text-slate-400"> · each rule is independent and they add up</span>}
          </span>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   Store targets

   One target per store per period: an amount to hit and the percentage of sales
   paid out to the staff there once it is hit. The editor quotes the resulting
   rupees the moment a percentage is typed, and the card shows live achievement
   against the store's real sales.
   ========================================================================== */
const TARGET_PERIODS = [
  { id: '2026-07', label: 'July 2026' },
  { id: '2026-06', label: 'June 2026' },
  { id: '2026-08', label: 'August 2026' },
  { id: '2026-09', label: 'September 2026' },
];

function StoreTargetModal({ site, period, onClose, user }) {
  const store = useStore();
  const toast = useToast();
  const { confirm, ConfirmUI } = useConfirm();
  const existing = store.getStoreTarget(site.id, period);
  const [draft, setDraft] = useState(() => ({
    id: existing ? existing.id : null,
    siteId: site.id,
    period: existing ? existing.period : period,
    amount: existing ? existing.amount : 200000,
    incentivePct: existing ? existing.incentivePct : 5,
    note: existing ? existing.note || '' : '',
  }));
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const staff = store.getEmployees({ siteId: site.id, status: 'active' });
  const achieved = store.getStoreAchievement(site.id, draft.period);
  const achievedPct = pctOf(achieved, +draft.amount || 0);
  const atTarget = Math.round(((+draft.amount || 0) * (+draft.incentivePct || 0)) / 100);
  const atAchieved = Math.round((achieved * (+draft.incentivePct || 0)) / 100);

  const save = () => {
    if (!(+draft.amount > 0)) { toast('Enter a target amount greater than zero', 'error'); return; }
    const res = Store.upsertStoreTarget(draft, user);
    if (res && res.error) { toast(res.error, 'error'); return; }
    toast(`Target saved for ${site.name} · ${fmtMonth(draft.period)}`, 'success');
    onClose();
  };
  const remove = async () => {
    const ok = await confirm({ title: 'Delete this target?', body: `${site.name} will have no target for ${fmtMonth(draft.period)}, and the target-based incentive will not apply.`, confirmLabel: 'Delete target', destructive: true });
    if (!ok) return;
    const res = Store.deleteStoreTarget(draft.id, user);
    if (res && res.error) { toast(res.error, 'error'); return; }
    toast('Target removed', 'warn');
    onClose();
  };

  return (
    <>
      <Modal open onClose={onClose} size="lg" icon="target"
        title={existing ? 'Edit store target' : 'Set store target'}
        subtitle={`${site.name} · ${site.city}`}
        footer={<>
          <Btn onClick={onClose}>Cancel</Btn>
          {existing && <Btn variant="danger" onClick={remove}><Icon name="trash" className="w-3.5 h-3.5"/>Delete</Btn>}
          <Btn variant="primary" onClick={save}><Icon name="check" className="w-3.5 h-3.5"/>Save target</Btn>
        </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <Field label="Target period">
              <Select value={draft.period} onChange={(e) => set({ period: e.target.value })}>
                {TARGET_PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </Select>
            </Field>
            <Field label="Target amount (₹)">
              <Input type="number" min="0" step="10000" value={draft.amount} onChange={(e) => set({ amount: e.target.value })}/>
            </Field>
            <Field label="Applicable incentive (%)" hint="Of each employee's own sales">
              <Input type="number" min="0" max="100" step="0.5" value={draft.incentivePct} onChange={(e) => set({ incentivePct: e.target.value })}/>
            </Field>
          </div>

          {/* The rupee figure, spelled out — never make the user compute it */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <IncentiveAmount base={draft.amount} type="pct" value={draft.incentivePct} baseLabel="Target"/>
            <div className="rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 px-3 py-2">
              <div className="text-[10px] uppercase font-bold tracking-wide text-brand-700 dark:text-brand-300">At current achievement</div>
              <div className="text-lg font-bold text-brand-800 dark:text-brand-200 leading-tight">{fmtINR(atAchieved)}</div>
              <div className="text-[10px] text-brand-700/80 dark:text-brand-300/80">
                {draft.incentivePct || 0}% of {fmtINR(achieved)} achieved so far
              </div>
            </div>
          </div>

          {/* Live achievement */}
          <Card title="Current achievement" bodyClass="p-3"
            right={<Badge tone={achievedPct >= 100 ? 'green' : achievedPct >= 70 ? 'brand' : 'amber'}>{achievedPct}%</Badge>}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
              {[
                ['Target', fmtINR(+draft.amount || 0)],
                ['Achieved', fmtINR(achieved)],
                ['Gap', achieved >= (+draft.amount || 0) ? 'Met ✓' : fmtINR((+draft.amount || 0) - achieved)],
                ['Assigned staff', `${staff.length}`],
              ].map(([k, v]) => (
                <div key={k} className="p-2 rounded bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-[10px] uppercase text-slate-500 font-semibold">{k}</div>
                  <div className="text-[14px] font-bold text-slate-800 dark:text-slate-100">{v}</div>
                </div>
              ))}
            </div>
            <ProgressBar value={achievedPct} height={8}/>
            <div className="text-[11px] text-slate-500 mt-1.5">
              The target incentive pays only once the store clears its target. Each employee then earns{' '}
              <span className="font-semibold">{draft.incentivePct || 0}%</span> of their own sales, compared against their
              incentive slab — whichever is higher is paid.
            </div>
          </Card>

          {/* Employees the target applies to */}
          <Card title={`Applicable employees (${staff.length})`} bodyClass="p-0">
            {staff.length === 0 ? (
              <Empty title="No staff posted to this store" hint="Assign employees to the store to make the target payable."/>
            ) : (
              <div className="max-h-52 overflow-auto">
                <table className="w-full dense-table text-[12px]">
                  <thead><tr><th>Employee</th><th>Designation</th><th className="text-right">Sales</th><th className="text-right">Would earn</th></tr></thead>
                  <tbody>
                    {staff.map((e) => {
                      const s = store.getSales(e.id, draft.period)?.totalSales || 0;
                      return (
                        <tr key={e.id}>
                          <td>
                            <div className="flex items-center gap-2"><Avatar emp={e} size={22}/><span className="font-semibold truncate">{e.name}</span></div>
                          </td>
                          <td className="text-slate-600 dark:text-slate-300 truncate max-w-[120px]">{e.designation}</td>
                          <td className="text-right font-mono">{fmtINR(s)}</td>
                          <td className="text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            {achieved >= (+draft.amount || 0) ? fmtINR(Math.round((s * (+draft.incentivePct || 0)) / 100)) : <span className="text-slate-400 font-normal">Target not met</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Field label="Note"><Input value={draft.note} onChange={(e) => set({ note: e.target.value })} placeholder="Festive quarter push, new store ramp-up…"/></Field>
        </div>
      </Modal>
      {ConfirmUI}
    </>
  );
}

/* Compact target panel embedded in the store edit modal. */
function StoreTargetPanel({ site, onOpenTarget, canEdit = true }) {
  const store = useStore();
  const [period, setPeriod] = useState('2026-07');
  if (!site || !site.id) {
    return (
      <div className="p-3 text-[11.5px] text-slate-500 italic">
        Save the store first — targets are set against a saved store.
      </div>
    );
  }
  const s = store.getStoreTargetSummary(site.id, period);
  return (
    <div className="p-3 space-y-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="!w-auto">
          {TARGET_PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </Select>
        <Btn size="sm" variant={s.target ? 'default' : 'primary'} disabled={!canEdit}
          title={canEdit ? undefined : 'Admin only'} onClick={() => onOpenTarget(period)}>
          <Icon name={s.target ? 'edit' : 'plus'} className="w-3.5 h-3.5"/>{s.target ? 'Edit target' : 'Add target'}
        </Btn>
      </div>
      {!s.target ? (
        <div className="text-[11.5px] text-slate-500 italic">No target set for {fmtMonth(period)}.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ['Target', fmtINR(s.target.amount)],
              ['Achieved', fmtINR(s.achieved)],
              ['Incentive %', s.target.incentivePct + '%'],
              ['Incentive generated', fmtINR(s.incentiveGenerated)],
            ].map(([k, v]) => (
              <div key={k} className="p-2 rounded bg-slate-50 dark:bg-slate-800/50">
                <div className="text-[9.5px] uppercase text-slate-500 font-semibold">{k}</div>
                <div className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{v}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <ProgressBar value={s.achievedPct} className="flex-1"/>
            <Badge tone={s.met ? 'green' : s.achievedPct >= 70 ? 'brand' : 'amber'}>{s.achievedPct}%</Badge>
          </div>
        </>
      )}
    </div>
  );
}

/* Store Targets tab on the Client Sites page — every store, one period. */
function StoreTargetsTab({ user }) {
  const store = useStore();
  const [period, setPeriod] = useState('2026-07');
  const [q, setQ] = useState('');
  const [zone, setZone] = useState('all');
  const [only, setOnly] = useState('all'); // all | with | without | met | missed
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(null);
  const PER = 20;
  const canEdit = can(user, 'target.edit');
  const hierarchy = store.getHierarchy();

  const staffBySite = useMemo(() => {
    const m = {}; store.getEmployees({ status: 'active' }).forEach((e) => { m[e.siteId] = (m[e.siteId] || 0) + 1; }); return m;
  }, [store.state]);

  /* Only stores with staff can generate a target incentive, so they lead the
     list; 562 stores with nobody posted would otherwise bury the real ones. */
  const rows = useMemo(() => store.getSites()
    .filter((s) => zone === 'all' || s.zone === zone)
    .filter((s) => !q || `${s.name} ${s.code} ${s.city} ${s.cm}`.toLowerCase().includes(q.toLowerCase()))
    .map((s) => ({ site: s, staff: staffBySite[s.id] || 0, ...store.getStoreTargetSummary(s.id, period) }))
    .filter((r) => {
      if (only === 'with') return !!r.target;
      if (only === 'without') return !r.target;
      if (only === 'met') return r.target && r.met;
      if (only === 'missed') return r.target && !r.met;
      return true;
    })
    .sort((a, b) => (b.target ? 1 : 0) - (a.target ? 1 : 0) || b.staff - a.staff),
    [store.state, period, q, zone, only]);

  useEffect(() => { setPage(0); }, [period, q, zone, only]);
  const pages = Math.ceil(rows.length / PER) || 1;
  const shown = rows.slice(page * PER, page * PER + PER);

  const withTarget = rows.filter((r) => r.target);
  const totals = withTarget.reduce((a, r) => ({
    target: a.target + r.target.amount, achieved: a.achieved + r.achieved, incentive: a.incentive + r.incentiveGenerated,
  }), { target: 0, achieved: 0, incentive: 0 });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Stores with a target" value={withTarget.length} sub={`of ${rows.length} in scope`} icon="target" tone="brand"/>
        <StatCard label="Combined target" value={fmtINRShort(totals.target)} sub={fmtMonth(period)} icon="chart" tone="slate"/>
        <StatCard label="Combined achieved" value={fmtINRShort(totals.achieved)} sub={`${pctOf(totals.achieved, totals.target)}% of target`} icon="trending-up" tone={totals.achieved >= totals.target ? 'green' : 'amber'}/>
        <StatCard label="Incentive generated" value={fmtINR(totals.incentive)} sub="Across met targets" icon="wallet" tone="green"/>
      </div>

      <Card noBody>
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-[200px] h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <Icon name="search" className="w-3.5 h-3.5 text-slate-400"/>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search store, code, city or Team Lead…" className="flex-1 min-w-0 bg-transparent text-[13px] outline-none dark:text-slate-100"/>
          </div>
          <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="!w-auto">
            {TARGET_PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </Select>
          <Select value={zone} onChange={(e) => setZone(e.target.value)} className="!w-auto">
            <option value="all">All zones</option>
            {(hierarchy.zones || []).map((z) => <option key={z} value={z}>{z}</option>)}
          </Select>
          <Select value={only} onChange={(e) => setOnly(e.target.value)} className="!w-auto">
            <option value="all">All stores</option>
            <option value="with">With a target</option>
            <option value="without">Without a target</option>
            <option value="met">Target met</option>
            <option value="missed">Target missed</option>
          </Select>
          <Btn size="sm" onClick={() => downloadCSV(`store_targets_${period}.csv`, [
            ['Code','Store','City','Zone','Team Lead','Staff','Target','Achieved','Achievement %','Incentive %','Incentive generated'],
            ...rows.map((r) => [r.site.code, r.site.name, r.site.city, r.site.zone, r.site.cm, r.staff,
              r.target ? r.target.amount : '', r.achieved, r.achievedPct != null ? r.achievedPct : '',
              r.target ? r.target.incentivePct : '', r.incentiveGenerated]),
          ])}><Icon name="download" className="w-3.5 h-3.5"/>Export</Btn>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full dense-table text-[12.5px]">
            <thead>
              <tr>
                <th>Store</th><th className="hidden lg:table-cell">Team Lead</th><th className="text-right">Staff</th>
                <th className="text-right">Target</th><th className="text-right">Achieved</th><th>Achievement</th>
                <th className="text-right">Incentive %</th><th className="text-right">Incentive</th><th/>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.site.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td>
                    <div className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[200px]">{r.site.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{r.site.code} · {r.site.city} · {r.site.zone}</div>
                  </td>
                  <td className="hidden lg:table-cell text-slate-600 dark:text-slate-300 truncate max-w-[130px]">{r.site.cm || '—'}</td>
                  <td className="text-right"><Badge tone={r.staff ? 'brand' : 'slate'}>{r.staff}</Badge></td>
                  <td className="text-right font-mono">{r.target ? fmtINR(r.target.amount) : <span className="text-slate-400">—</span>}</td>
                  <td className="text-right font-mono">{fmtINR(r.achieved)}</td>
                  <td>
                    {r.target ? (
                      <div className="flex items-center gap-2">
                        <ProgressBar value={r.achievedPct} className="w-20 sm:w-28"/>
                        <span className={`text-[11px] font-mono font-semibold ${r.met ? 'text-emerald-600' : 'text-amber-600'}`}>{r.achievedPct}%</span>
                      </div>
                    ) : <span className="text-[11px] text-slate-400 italic">No target set</span>}
                  </td>
                  <td className="text-right font-mono">{r.target ? r.target.incentivePct + '%' : '—'}</td>
                  <td className="text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {r.target ? fmtINR(r.incentiveGenerated) : '—'}
                  </td>
                  <td>
                    <div className="flex justify-end">
                      <Btn size="xs" disabled={!canEdit} onClick={() => setEditing(r.site)}>
                        <Icon name={r.target ? 'edit' : 'plus'} className="w-3 h-3"/>{r.target ? 'Edit' : 'Set'}
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9}><Empty title="No stores match" hint="Try a different zone or filter."/></td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={pages} total={rows.length} per={PER} onPage={setPage} unit="stores"/>
      </Card>

      {editing && <StoreTargetModal site={editing} period={period} onClose={() => setEditing(null)} user={user}/>}
    </div>
  );
}

/* ============================================================================
   Store Target bulk upload — CSV columns: Store Code, Target Amount, Period
   (YYYY-MM), optional Incentive %. Same preview-then-confirm shape as the
   incentive bulk upload: parsing never writes anything, valid/invalid/
   duplicate/locked rows are all shown before a single explicit commit, and
   every commit leaves a real upload record.
   ========================================================================== */
function StoreTargetBulkUploadTab({ user }) {
  const store = useStore();
  const toast = useToast();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  const uploads = store.getStoreTargetUploads();

  const downloadSample = () => downloadCSV('store_target_upload_sample.csv', [
    ['Store Code', 'Target Amount', 'Period', 'Incentive %'],
    ['DMUM', '250000', '2026-08', '5'],
    ['DDEL', '180000', '2026-08', '4'],
    ['DBLR', '150000', '2026-08', '6'],
  ]);

  const parseCSV = (text, fileName) => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) { toast('File is empty or has no data rows', 'error'); return; }
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const codeCol = header.findIndex((h) => h.includes('store code') || h === 'code');
    const amountCol = header.findIndex((h) => h.includes('target amount') || h.includes('amount'));
    const periodCol = header.findIndex((h) => h.includes('period') || h.includes('effective'));
    const pctCol = header.findIndex((h) => h.includes('incentive'));
    if (codeCol < 0 || amountCol < 0 || periodCol < 0) {
      toast('Invalid CSV format — required columns: Store Code, Target Amount, Period', 'error');
      return;
    }
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      if (cols.every((c) => !c)) continue;
      rows.push({ storeCode: cols[codeCol], amount: cols[amountCol], period: cols[periodCol], incentivePct: pctCol >= 0 ? cols[pctCol] : '' });
    }
    const result = Store.previewStoreTargetUpload(rows);
    setPreview({ ...result, fileName });
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast('Only CSV files are supported', 'error'); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => { parseCSV(e.target.result, file.name); setUploading(false); };
    reader.onerror = () => { toast('Failed to read file', 'error'); setUploading(false); };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!preview || !preview.valid.length) return;
    const res = Store.commitStoreTargetUpload(preview.valid, user, { fileName: preview.fileName });
    if (res && res.error) { toast(res.error, 'error'); return; }
    toast(`Import applied — ${res.count} target${res.count === 1 ? '' : 's'} set${res.failedCount ? `, ${res.failedCount} refused` : ''}`, res.failedCount ? 'warn' : 'success');
    setPreview(null);
  };

  if (preview) {
    const rejected = [...preview.invalid, ...preview.duplicates];
    return (
      <Card noBody title={`Review import — ${preview.fileName}`}
        subtitle={`${preview.valid.length} valid row${preview.valid.length === 1 ? '' : 's'} · ${rejected.length} rejected · nothing is saved until you confirm`}
        right={<div className="flex gap-2"><Btn size="sm" onClick={() => setPreview(null)}>Cancel</Btn><Btn size="sm" variant="primary" disabled={!preview.valid.length} onClick={confirmImport}><Icon name="check" className="w-3.5 h-3.5"/>Confirm import</Btn></div>}>
        <div className="p-3 space-y-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Will be applied ({preview.valid.length})</div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full dense-table text-[12px]">
                <thead><tr><th>Store</th><th>Period</th><th className="text-right">Target</th><th className="text-right">Incentive %</th><th></th></tr></thead>
                <tbody>
                  {preview.valid.map((r, i) => (
                    <tr key={i}>
                      <td>{r.storeName} <span className="font-mono text-slate-400">({r.storeCode})</span></td>
                      <td className="font-mono">{r.period}</td>
                      <td className="text-right font-mono">{fmtINR(r.amount)}</td>
                      <td className="text-right font-mono">{r.incentivePct}%</td>
                      <td>{r.replaces && <Badge tone="amber">Replaces existing</Badge>}</td>
                    </tr>
                  ))}
                  {preview.valid.length === 0 && <tr><td colSpan={5}><Empty title="No valid rows to apply"/></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          {rejected.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-rose-500 mb-1.5">Rejected ({rejected.length})</div>
              <div className="rounded-lg border border-rose-200 dark:border-rose-900 overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full dense-table text-[12px]">
                  <thead><tr><th>Row</th><th>Store Code</th><th>Reason</th></tr></thead>
                  <tbody>
                    {rejected.map((e, i) => (
                      <tr key={i}><td className="font-mono">{e.row}</td><td className="font-mono text-slate-500">{e.storeCode || '—'}</td><td className="text-rose-600 dark:text-rose-400">{e.reason}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          <Card title="Upload Store Targets" subtitle="Bulk-set sales targets across stores from a CSV file">
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Required CSV Columns</div>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                    {['Store Code', 'Target Amount', 'Period', 'Incentive %'].map((col) => (
                      <div key={col} className="text-[11px] font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/20 rounded px-2 py-1 text-center">{col}</div>
                    ))}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 space-y-1">
                    <div><span className="font-semibold">Store Code</span> is the stable key — matched exactly, never by name. <span className="font-semibold">Period</span> is YYYY-MM. <span className="font-semibold">Incentive %</span> is optional — keeps the store's existing rate (default 5%) if left blank.</div>
                    <div>One row per store/period. A row for a store/period that already has a target replaces it; a locked payroll period is rejected.</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <Icon name="file" className="w-5 h-5 text-emerald-600 shrink-0"/>
                <div className="flex-1">
                  <div className="text-[12px] font-semibold text-emerald-900 dark:text-emerald-100">Download Sample Template</div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300">Pre-filled with example data to guide your upload</div>
                </div>
                <Btn size="sm" onClick={downloadSample}><Icon name="download" className="w-3.5 h-3.5"/>Sample CSV</Btn>
              </div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                  dragOver ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-brand-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; }}/>
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Icon name="refresh" className="w-8 h-8 text-brand-500 animate-spin"/>
                    <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Processing file…</div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
                      <Icon name="file" className="w-6 h-6 text-brand-600"/>
                    </div>
                    <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                      {dragOver ? 'Drop to upload' : 'Drag & drop CSV here, or click to browse'}
                    </div>
                    <div className="text-[11px] text-slate-400">Accepts .csv files only</div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-5">
          <Card title="Upload Rules" subtitle="How the bulk upload works">
            <div className="space-y-3 text-[12px] text-slate-600 dark:text-slate-300">
              {[
                ['building', 'Store Code matching', 'Stores are matched by Store Code, never by name — an unrecognised or inactive code is rejected.'],
                ['eye', 'Preview first', 'Nothing is saved until you review the parsed rows and confirm.'],
                ['layers', 'Duplicate prevention', 'A Store Code + Period repeated within the same file is rejected as a duplicate, not silently overwritten twice.'],
                ['lock', 'Locked periods blocked', 'A row for a period whose payroll has already been processed is rejected.'],
                ['shield', 'Admin only', 'Store targets, like incentives, are Admin-only. HR sees the read-only view.'],
              ].map(([icon, title, desc]) => (
                <div key={title} className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                    <Icon name={icon} className="w-3.5 h-3.5 text-brand-600"/>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-700 dark:text-slate-200">{title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card noBody title="Upload History" subtitle="All previous store target bulk upload records">
        <div className="overflow-x-auto">
        <table className="w-full dense-table text-[13px]">
          <thead><tr><th>File Name</th><th>Uploaded By</th><th>Date &amp; Time</th><th className="text-right">Applied</th><th className="text-right">Failed</th></tr></thead>
          <tbody>
            {uploads.map((u) => (
              <tr key={u.id}>
                <td><Icon name="file" className="w-3.5 h-3.5 text-slate-400 mr-1.5 inline"/>{u.fileName}</td>
                <td className="text-[12px] text-slate-600 dark:text-slate-300">{u.uploadedBy}</td>
                <td className="text-[12px] text-slate-500 font-mono">{fmtDateTime(u.uploadedAt)}</td>
                <td className="text-right font-mono font-semibold text-emerald-600">{u.count}</td>
                <td className="text-right font-mono font-semibold text-rose-600">{u.failedCount || 0}</td>
              </tr>
            ))}
            {uploads.length === 0 && <tr><td colSpan={5}><Empty title="No uploads yet"/></td></tr>}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}

function SitesPage({ user, navArg }) {
  const store = useStore();
  const toast = useToast();
  const { confirm, ConfirmUI } = useConfirm();
  const [tab, setTab] = useState('stores');
  const [editing, setEditing] = useState(null);
  const [targetFor, setTargetFor] = useState(null); // { site, period }
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [q, setQ] = useState('');
  /* A store picked from global search arrives with its name in the filter; a
     sidebar sub-item arrives with the tab it wants opened. */
  useEffect(() => {
    if (!navArg) return;
    if (navArg.search) { setQ(navArg.search); setTab('stores'); }
    else if (navArg.tab) setTab(navArg.tab);
  }, [navArg && navArg._n]);
  const [zone, setZone] = useState('all');
  const [region, setRegion] = useState('all');
  const [teamLead, setTeamLead] = useState('all');
  const [page, setPage] = useState(0);
  const [showInactive, setShowInactive] = useState(false);

  const sites = store.getSites();
  const hierarchy = store.getHierarchy();
  const templates = store.getSlabTemplates();
  const teamLeads = store.getTeamLeads();
  const tplById = useMemo(() => Object.fromEntries(templates.map((t) => [t.id, t])), [store.state]);
  const staffBySite = useMemo(() => {
    const m = {}; store.getEmployees({ status: 'active' }).forEach((e) => { m[e.siteId] = (m[e.siteId] || 0) + 1; }); return m;
  }, [store.state]);
  // Cities already on record — offered as a picker, but a new one can still be typed.
  const cityOptions = useMemo(
    () => [...new Set(sites.map((s) => s.city).filter(Boolean))].sort().map((c) => ({ value: c, label: c })),
    [store.state]
  );
  // Team Lead picker narrows with the zone/region filters so it stays usable at 54 leads.
  const teamLeadsInScope = teamLeads.filter((m) =>
    (zone === 'all' || m.zone === zone) && (region === 'all' || m.region === region));

  const activeCount = sites.filter((s) => s.active !== false).length;
  const filtered = sites.filter((s) => {
    if (!showInactive && s.active === false) return false;
    if (zone !== 'all' && s.zone !== zone) return false;
    if (region !== 'all' && s.region !== region) return false;
    if (teamLead !== 'all' && s.teamLeadId !== teamLead) return false;
    if (q) {
      const ql = q.toLowerCase();
      const mgr = s.managerId ? (store.getEmployee(s.managerId) || {}).name || '' : '';
      if (!((s.name || '').toLowerCase().includes(ql) || (s.code || '').toLowerCase().includes(ql) || (s.city || '').toLowerCase().includes(ql) || (s.cm || '').toLowerCase().includes(ql) || (s.bm || '').toLowerCase().includes(ql) || mgr.toLowerCase().includes(ql))) return false;
    }
    return true;
  });
  const PER = 20;
  const pages = Math.ceil(filtered.length / PER) || 1;
  const shown = filtered.slice(page * PER, page * PER + PER);
  const regionsForZone = (hierarchy.regions || []).filter((r) => zone === 'all' || r.zone === zone);

  const canEditIncentive = can(user, 'incentive.edit');
  const canEditTarget = can(user, 'target.edit');
  const canEditSite = can(user, 'site.edit');
  const closeEditor = () => { setEditing(null); setDeactivating(false); setDeactivateReason(''); };
  const save = () => {
    const res = Store.upsertSite(editing, user);
    if (res && res.error) { toast(res.error, 'error'); return; }
    toast('Site saved', 'success'); closeEditor();
  };
  const confirmDeactivate = () => {
    const res = Store.setSiteActive(editing.id, false, deactivateReason.trim(), user);
    if (res && res.error) { toast(res.error, 'error'); return; }
    toast('Store deactivated', 'warn'); closeEditor();
  };

  /* Manager pickers for the edit modal, scoped to the store being edited so the
     lists stay short: Team Leads within the chosen zone/state, Business Managers
     within the zone, and Store Managers from that store's own technicians. */
  const teamLeadOptions = useMemo(() => {
    if (!editing) return [];
    const inScope = teamLeads.filter((m) => (!editing.zone || m.zone === editing.zone) && (!editing.region || m.region === editing.region));
    const list = inScope.length ? inScope : teamLeads;
    // Never hide the currently-assigned lead, even if the store's zone was changed.
    return editing.teamLeadId && !list.some((m) => m.id === editing.teamLeadId)
      ? [store.getTeamLead(editing.teamLeadId)].filter(Boolean).concat(list) : list;
  }, [editing && editing.zone, editing && editing.region, editing && editing.teamLeadId, store.state]);

  const bmOptions = useMemo(() => {
    if (!editing) return [];
    const inScope = store.getBusinessManagers().filter((m) => !editing.zone || m.zone === editing.zone);
    const list = inScope.length ? inScope : store.getBusinessManagers();
    return editing.bmId && !list.some((m) => m.id === editing.bmId)
      ? [store.getBusinessManager(editing.bmId)].filter(Boolean).concat(list) : list;
  }, [editing && editing.zone, editing && editing.bmId, store.state]);

  const storeStaff = useMemo(
    () => (editing && editing.id ? store.getEmployees({ siteId: editing.id, status: 'active' }) : []),
    [editing && editing.id, store.state]
  );

  const TABS = [
    { id: 'stores',  label: 'Stores & geo-fences', icon: 'building' },
    { id: 'targets', label: 'Store Targets',       icon: 'target' },
    ...(canEditTarget ? [{ id: 'targets-bulk', label: 'Bulk upload targets', icon: 'upload' }] : []),
  ];

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Operations" title="Client sites"
        subtitle={`${activeCount} active of ${sites.length} stores · ${(hierarchy.zones || []).length} zones · ${(hierarchy.regions || []).length} states · ${teamLeads.length} Team Leads · ${(hierarchy.businessManagers || []).length} Business Managers`}>
        {tab === 'stores' && <>
          <Btn onClick={() => downloadCSV('stores.csv', [
            ['Code','Store','Status','City','State','Zone','Store Manager','Team Lead','Business Manager','Slab','Active staff'],
            ...filtered.map((s) => [s.code, s.name, s.active === false ? 'Inactive' : 'Active', s.city, s.region, s.zone, (store.getEmployee(s.managerId) || {}).name || '—', s.cm, s.bm, tplById[s.slabId]?.label || '—', staffBySite[s.id] || 0]),
          ])}><Icon name="download" className="w-3.5 h-3.5"/>Export</Btn>
          {canEditSite && (
            <Btn variant="primary" onClick={() => setEditing({ id: null, code: '', name: '', type: 'store', lat: 19.108, lng: 72.826, radius: 150, shiftStart: '10:00', shiftEnd: '19:00', city: '', region: '', zone: '', bmId: '', teamLeadId: '', managerId: '', slabId: hierarchy.defaultSlabId, incentives: [], active: true })}>
              <Icon name="plus" className="w-3.5 h-3.5"/>Add store
            </Btn>
          )}
        </>}
      </PageHeader>

      <Tabs tabs={TABS} value={tab} onChange={setTab}/>

      {tab === 'targets' && <StoreTargetsTab user={user}/>}
      {tab === 'targets-bulk' && <StoreTargetBulkUploadTab user={user}/>}

      {tab === 'stores' && <>
      {/* Zone summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {(hierarchy.zones || []).map((z) => {
          const zs = sites.filter((s) => s.zone === z);
          return (
            <button key={z} onClick={() => { setZone(zone === z ? 'all' : z); setRegion('all'); setPage(0); }}
              className={`text-left rounded-lg border p-3 ${zone === z ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{z} zone</div>
              <div className="text-lg font-bold text-slate-800 dark:text-white">{zs.length} <span className="text-[11px] font-normal text-slate-400">stores</span></div>
              <div className="text-[10px] text-slate-500">{new Set(zs.map((s) => s.region)).size} regions</div>
            </button>
          );
        })}
      </div>

      <Card noBody>
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 flex-1 min-w-[220px] h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <Icon name="search" className="w-3.5 h-3.5 text-slate-400"/>
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search store, code, city, manager…" className="flex-1 bg-transparent text-[13px] outline-none dark:text-slate-100"/>
          </div>
          <Select value={zone} onChange={(e) => { setZone(e.target.value); setRegion('all'); setPage(0); }} className="!w-auto">
            <option value="all">All zones</option>
            {(hierarchy.zones || []).map((z) => <option key={z} value={z}>{z}</option>)}
          </Select>
          <SearchSelect value={region} onChange={(v) => { setRegion(v); setTeamLead('all'); setPage(0); }} className="!w-[170px]"
            options={[{ value: 'all', label: 'All states' }, ...regionsForZone.map((r) => ({ value: r.name, label: r.name }))]}
            searchPlaceholder="Search state…" emptyLabel="No state matches"/>
          <SearchSelect value={teamLead} onChange={(v) => { setTeamLead(v); setPage(0); }} className="!w-[200px]"
            options={[{ value: 'all', label: 'All Team Leads' },
              ...teamLeadsInScope.map((m) => ({ value: m.id, label: m.name, sub: [m.region, `${m.storeCount} stores`].filter(Boolean).join(' · ') }))]}
            searchPlaceholder="Search Team Lead by name…" emptyLabel="No Team Lead matches"/>
          <label className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer whitespace-nowrap">
            <input type="checkbox" checked={showInactive} onChange={(e) => { setShowInactive(e.target.checked); setPage(0); }} className="accent-brand-700 w-4 h-4"/>
            Show inactive ({sites.length - activeCount})
          </label>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full dense-table text-[13px]">
          <thead><tr><th>Store</th><th>City</th><th>State / Zone</th><th>Store Manager</th><th>Team Lead</th><th>Business Mgr</th><th>Incentive slab</th><th className="text-right">Staff</th><th></th></tr></thead>
          <tbody>
            {shown.map((s) => {
              const mgr = s.managerId ? store.getEmployee(s.managerId) : null;
              return (
              <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td>
                  <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    {s.name}{s.active === false && <Badge tone="slate">Inactive</Badge>}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">{s.code} · {s.type === 'store' ? 'Retail' : 'Service'}</div>
                </td>
                <td className="text-[12px] text-slate-600 dark:text-slate-300">{s.city}</td>
                <td><div className="text-[12px] text-slate-700 dark:text-slate-200">{s.region}</div><div className="text-[10px] text-slate-400">{s.zone}</div></td>
                <td>
                  {mgr
                    ? <div className="flex items-center gap-1.5"><Avatar emp={mgr} size={20}/><span className="text-[12px] text-slate-700 dark:text-slate-200 truncate max-w-[110px]">{mgr.name}</span></div>
                    : <span className="text-[11px] text-slate-400 italic">Unassigned</span>}
                </td>
                <td className="text-[12px] text-slate-600 dark:text-slate-300">{s.cm || '—'}</td>
                <td className="text-[12px] text-slate-600 dark:text-slate-300">{s.bm || '—'}</td>
                <td className="max-w-[180px]"><span className="text-[11px] text-slate-600 dark:text-slate-300 truncate block" title={tplById[s.slabId]?.raw}>{tplById[s.slabId]?.label || '—'}</span></td>
                <td className="text-right"><Badge tone="brand">{staffBySite[s.id] || 0}</Badge></td>
                <td>
                  <div className="flex justify-end gap-1">
                    <Btn size="xs" title={canEditTarget ? 'Store target' : 'Store target — Admin only'} disabled={!canEditTarget} onClick={() => setTargetFor({ site: s, period: '2026-07' })}><Icon name="target" className="w-3 h-3"/></Btn>
                    <Btn size="xs" title={canEditSite ? 'Edit store' : 'Edit store — Admin/HR only'} disabled={!canEditSite} onClick={() => setEditing(s)}><Icon name="edit" className="w-3 h-3"/></Btn>
                  </div>
                </td>
              </tr>
              );
            })}
            {shown.length === 0 && <tr><td colSpan={9}><Empty title="No stores match filters"/></td></tr>}
          </tbody>
        </table>
        </div>
        <Pagination page={page} pages={pages} total={filtered.length} per={PER} onPage={setPage} unit="stores"/>
      </Card>
      </>}

      {editing && (
        <Modal open onClose={closeEditor} size="xl" icon="building"
          title={editing.id ? 'Edit store' : 'New client store'} subtitle={editing.id ? `${editing.code} · ${editing.city}` : 'Add a client location and its geo-fence'}
          footer={<><Btn onClick={closeEditor}>Cancel</Btn>
            {editing.id && canEditSite && (editing.active === false ? (
              <Btn variant="success" onClick={() => {
                const res = Store.setSiteActive(editing.id, true, '', user);
                if (res && res.error) { toast(res.error, 'error'); return; }
                toast('Store reactivated', 'success'); closeEditor();
              }}><Icon name="check-circle" className="w-3.5 h-3.5"/>Reactivate</Btn>
            ) : !deactivating && (
              <Btn variant="danger" onClick={() => setDeactivating(true)}><Icon name="alert" className="w-3.5 h-3.5"/>Deactivate</Btn>
            ))}
            {editing.id && isSuperAdmin(user) && (staffBySite[editing.id] || 0) === 0 && (
              <Btn variant="danger" title="Hard delete — only possible with zero staff posted here" onClick={async () => {
                const ok = await confirm({ title: `Permanently delete ${editing.name}?`, body: 'This removes the store record outright, including its target history. Prefer Deactivate unless this store was created in error.', confirmLabel: 'Delete permanently', destructive: true });
                if (!ok) return;
                const res = Store.deleteSite(editing.id, user);
                if (res && res.error) { toast(res.error, 'error'); return; }
                toast('Store removed', 'warn'); closeEditor();
              }}>Delete permanently</Btn>
            )}
            <Btn variant="primary" onClick={save}><Icon name="check" className="w-3.5 h-3.5"/>Save store</Btn></>}>
          {deactivating && (
            <div className="mb-3 p-3 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 space-y-2">
              <div className="text-[12.5px] font-bold text-rose-800 dark:text-rose-200">Deactivate {editing.name}?</div>
              <div className="text-[11.5px] text-rose-700 dark:text-rose-300">
                Removed from active pickers and new assignments; staff already posted here keep their records, and the store's history (targets, attendance) stays intact and reachable via "Show inactive".
              </div>
              <Field label="Reason"><Input value={deactivateReason} onChange={(e) => setDeactivateReason(e.target.value)} placeholder="Store closed, lease ended, duplicate record…"/></Field>
              <div className="flex justify-end gap-2">
                <Btn size="xs" onClick={() => setDeactivating(false)}>Cancel</Btn>
                <Btn size="xs" variant="danger" onClick={confirmDeactivate}>Confirm deactivation</Btn>
              </div>
            </div>
          )}
          {editing.active === false && (editing.deactivationHistory || []).length > 0 && (
            <div className="mb-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11.5px] text-slate-600 dark:text-slate-300">
              <div className="font-bold text-slate-700 dark:text-slate-200 mb-1">Deactivation history</div>
              {editing.deactivationHistory.slice().reverse().map((h, i) => (
                <div key={i}>{h.action} · {h.by || 'system'} · {fmtDateTime(h.at)}{h.reason ? ` · "${h.reason}"` : ''}</div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Store code"><Input value={editing.code || ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="A001"/></Field>
            <Field label="Store name"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Mumbai-Juhu"/></Field>
            <Field label="City">
              <SearchSelect value={editing.city || ''} onChange={(v) => setEditing({ ...editing, city: v })} allowCustom
                options={cityOptions} placeholder="Select or type a city…" searchPlaceholder="Search city…"
                emptyLabel="No city on record — type to add"/>
            </Field>
            <Field label="Type"><Select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}><option value="store">Retail store</option><option value="service-centre">Service centre</option></Select></Field>
            <Field label="Zone"><Select value={editing.zone || ''} onChange={(e) => setEditing({ ...editing, zone: e.target.value })}><option value="">—</option>{(hierarchy.zones || []).map((z) => <option key={z} value={z}>{z}</option>)}</Select></Field>
            <Field label="Region"><Select value={editing.region || ''} onChange={(e) => setEditing({ ...editing, region: e.target.value })}><option value="">—</option>{(hierarchy.regions || []).filter((r) => !editing.zone || r.zone === editing.zone).map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}</Select></Field>
            <Field label="Store Manager" className="sm:col-span-2"
              hint={editing.id ? 'Picked from technicians posted to this store — they keep clocking in and being paid as field staff.' : 'Save the store first, then assign staff to it before naming a Store Manager.'}>
              <SearchSelect value={editing.managerId || ''} disabled={!editing.id || storeStaff.length === 0}
                onChange={(v) => setEditing({ ...editing, managerId: v })}
                placeholder={storeStaff.length === 0 ? '— No staff posted to this store yet —' : '— Unassigned —'}
                searchPlaceholder="Search staff by name or code…" emptyLabel="No staff matches"
                options={[{ value: '', label: storeStaff.length === 0 ? '— No staff posted to this store yet —' : '— Unassigned —' },
                  ...storeStaff.map((e) => ({ value: e.id, label: e.name, sub: e.code, keywords: e.code }))]}/>
            </Field>
            <Field label="Team Lead" hint={`Covers multiple stores · ${teamLeadOptions.length} available${editing.zone || editing.region ? ' in scope' : ''}`}>
              <SearchSelect value={editing.teamLeadId || ''} onChange={(v) => setEditing({ ...editing, teamLeadId: v })}
                placeholder="— Unassigned —" searchPlaceholder="Search Team Lead by name…" emptyLabel="No Team Lead matches"
                options={[{ value: '', label: '— Unassigned —' },
                  ...teamLeadOptions.map((m) => ({ value: m.id, label: m.name, sub: [m.region, `${m.storeCount} stores`].filter(Boolean).join(' · ') }))]}/>
            </Field>
            <Field label="Business Manager" hint={`Zone / multi-state owner · ${bmOptions.length} available${editing.zone ? ' in zone' : ''}`}>
              <SearchSelect value={editing.bmId || ''} onChange={(v) => setEditing({ ...editing, bmId: v })}
                placeholder="— Unassigned —" searchPlaceholder="Search Business Manager by name…" emptyLabel="No Business Manager matches"
                options={[{ value: '', label: '— Unassigned —' },
                  ...bmOptions.map((m) => ({ value: m.id, label: m.name, sub: [m.zone ? m.zone + ' zone' : null, `${m.storeCount} stores`].filter(Boolean).join(' · ') }))]}/>
            </Field>
            <div className="sm:col-span-2 -mt-1 flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <Icon name="users" className="w-4 h-4 text-slate-400 shrink-0 mt-px"/>
              <div className="text-[11px] text-slate-600 dark:text-slate-300">
                Reporting line for staff at this store:{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  Technician → {editing.managerId && store.getEmployee(editing.managerId) ? store.getEmployee(editing.managerId).name : 'Store Manager'}
                  {' → '}{(store.getTeamLead(editing.teamLeadId) || {}).name || 'Team Lead'}
                  {' → '}{(store.getBusinessManager(editing.bmId) || {}).name || 'Business Manager'}
                </span>
              </div>
            </div>
            <Field label="Incentive slab" className="sm:col-span-2"
              hint={!canEditIncentive ? 'Read-only — incentive slab assignment is Admin only.' : undefined}>
              <SearchSelect value={editing.slabId || ''} onChange={(v) => setEditing({ ...editing, slabId: v })}
                disabled={!canEditIncentive}
                placeholder="Company default" searchPlaceholder="Search slab…" emptyLabel="No slab matches"
                options={[{ value: '', label: 'Company default' },
                  ...templates.map((t) => ({ value: t.id, label: t.label, sub: t.raw || '', keywords: t.raw }))]}/>
            </Field>
            <Field label="Latitude"><Input type="number" step="0.0001" value={editing.lat} onChange={(e) => setEditing({ ...editing, lat: +e.target.value })}/></Field>
            <Field label="Longitude"><Input type="number" step="0.0001" value={editing.lng} onChange={(e) => setEditing({ ...editing, lng: +e.target.value })}/></Field>
            <Field label="Geo-fence radius (m)" className="sm:col-span-2">
              <Input type="range" min="50" max="500" value={editing.radius} onChange={(e) => setEditing({ ...editing, radius: +e.target.value })} className="!h-6"/>
              <div className="text-[12px] font-mono font-semibold text-brand-700 mt-1">{editing.radius}m</div>
            </Field>
            <Field label="Shift start"><Input type="time" value={editing.shiftStart} onChange={(e) => setEditing({ ...editing, shiftStart: e.target.value })}/></Field>
            <Field label="Shift end"><Input type="time" value={editing.shiftEnd} onChange={(e) => setEditing({ ...editing, shiftEnd: e.target.value })}/></Field>
          </div>
          {/* Incentives section */}
          <div className="mt-4 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-brand-50 to-white dark:from-brand-900/20 dark:to-slate-900 border-b border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-[12px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Icon name="trending-up" className="w-3.5 h-3.5 text-brand-600"/>Incentives
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Store-level incentive definitions applied to staff at this location
                  {!canEditIncentive && <span className="text-amber-600 dark:text-amber-400"> · Read-only — Admin only</span>}
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300">
                {(editing.incentives || []).length} rule{(editing.incentives || []).length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="p-3">
              <IncentiveEditor
                incentives={editing.incentives || []}
                onChange={(inc) => setEditing({ ...editing, incentives: inc })}
                readOnly={!canEditIncentive}
              />
            </div>
          </div>

          {/* Store target — set per period right where the store is configured */}
          <div className="mt-4 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-900 border-b border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-[12px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Icon name="target" className="w-3.5 h-3.5 text-emerald-600"/>Store target
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Sales target and applicable incentive % for this location
                  {!canEditTarget && <span className="text-amber-600 dark:text-amber-400"> · Read-only — Admin only</span>}
                </div>
              </div>
              <Badge tone="slate">{store.getStoreTargets(editing.id).length} period{store.getStoreTargets(editing.id).length === 1 ? '' : 's'}</Badge>
            </div>
            <StoreTargetPanel site={editing} onOpenTarget={(period) => setTargetFor({ site: editing, period })} canEdit={canEditTarget}/>
          </div>

          <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <SiteMapPicker lat={editing.lat} lng={editing.lng} radius={editing.radius} onChange={(lat, lng) => setEditing({ ...editing, lat, lng })}/>
          </div>
        </Modal>
      )}

      {targetFor && <StoreTargetModal site={targetFor.site} period={targetFor.period} onClose={() => setTargetFor(null)} user={user}/>}
      {ConfirmUI}
    </div>
  );
}

function SiteMapPicker({ lat, lng, radius, onChange }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const m = L.map(ref.current).setView([lat, lng], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd' }).addTo(m);
    const marker = L.marker([lat, lng], { draggable: true }).addTo(m);
    const circle = L.circle([lat, lng], { radius, color: '#1E40AF', fillOpacity: 0.1 }).addTo(m);
    marker.on('drag', (e) => { const p = e.target.getLatLng(); circle.setLatLng(p); onChange(p.lat, p.lng); });
    m.on('click', (e) => { marker.setLatLng(e.latlng); circle.setLatLng(e.latlng); onChange(e.latlng.lat, e.latlng.lng); });
    mapRef.current = m; markerRef.current = marker; circleRef.current = circle;
    setTimeout(() => m.invalidateSize(), 100);
  }, []);
  useEffect(() => { if (circleRef.current) circleRef.current.setRadius(radius); }, [radius]);
  useEffect(() => {
    if (markerRef.current) { markerRef.current.setLatLng([lat, lng]); circleRef.current.setLatLng([lat, lng]); mapRef.current.setView([lat, lng]); }
  }, [lat, lng]);
  return <div ref={ref} style={{ height: 260 }}/>;
}

Object.assign(window, {
  SitesPage, SiteMapPicker, IncentiveEditor, incentiveRuleText,
  StoreTargetModal, StoreTargetPanel, StoreTargetsTab, StoreTargetBulkUploadTab, TARGET_PERIODS,
});
