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
function IncentiveEditor({ incentives, onChange, sales }) {
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
                    type="number" min="0" step="1000"
                    value={row.minSales == null ? '' : row.minSales}
                    onChange={(e) => updateRow(row.id, { minSales: e.target.value })}
                    className="w-full h-8 pl-6 pr-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/30"
                    placeholder="50000"
                  />
                </div>
                <select
                  value={row.type}
                  onChange={(e) => updateRow(row.id, { type: e.target.value })}
                  className="h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/30"
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
                    min="0"
                    step={row.type === 'pct' ? '0.1' : '1'}
                    value={row.value}
                    onChange={(e) => updateRow(row.id, { value: e.target.value })}
                    className="w-full h-8 pl-6 pr-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/30"
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
                <button onClick={() => removeRow(row.id)} className="w-7 h-7 flex items-center justify-center rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition justify-self-end">
                  <Icon name="trash" className="w-3.5 h-3.5"/>
                </button>
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
          <div className="px-3 py-3 text-[11px] text-slate-500 italic">No incentives defined — click "Add Incentive" to begin.</div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
        <button onClick={addRow} className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300 hover:text-brand-800 dark:hover:text-brand-200 transition">
          <Icon name="plus" className="w-3.5 h-3.5"/>Add Incentive
        </button>
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

function StoreTargetModal({ site, period, onClose }) {
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
    Store.upsertStoreTarget(draft);
    toast(`Target saved for ${site.name} · ${fmtMonth(draft.period)}`, 'success');
    onClose();
  };
  const remove = async () => {
    const ok = await confirm({ title: 'Delete this target?', body: `${site.name} will have no target for ${fmtMonth(draft.period)}, and the target-based incentive will not apply.`, confirmLabel: 'Delete target', destructive: true });
    if (!ok) return;
    Store.deleteStoreTarget(draft.id);
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
function StoreTargetPanel({ site, onOpenTarget }) {
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
        <Btn size="sm" variant={s.target ? 'default' : 'primary'} onClick={() => onOpenTarget(period)}>
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

      {editing && <StoreTargetModal site={editing} period={period} onClose={() => setEditing(null)}/>}
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
  const [q, setQ] = useState('');
  // A store picked from global search arrives with its name in the filter.
  useEffect(() => { if (navArg && navArg.search) { setQ(navArg.search); setTab('stores'); } }, [navArg && navArg._n]);
  const [zone, setZone] = useState('all');
  const [region, setRegion] = useState('all');
  const [teamLead, setTeamLead] = useState('all');
  const [page, setPage] = useState(0);

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

  const filtered = sites.filter((s) => {
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

  const save = () => { Store.upsertSite(editing); toast('Site saved', 'success'); setEditing(null); };

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
  ];

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Operations" title="Client sites"
        subtitle={`${sites.length} stores · ${(hierarchy.zones || []).length} zones · ${(hierarchy.regions || []).length} states · ${teamLeads.length} Team Leads · ${(hierarchy.businessManagers || []).length} Business Managers`}>
        {tab === 'stores' && <>
          <Btn onClick={() => downloadCSV('stores.csv', [
            ['Code','Store','City','State','Zone','Store Manager','Team Lead','Business Manager','Slab','Active staff'],
            ...filtered.map((s) => [s.code, s.name, s.city, s.region, s.zone, (store.getEmployee(s.managerId) || {}).name || '—', s.cm, s.bm, tplById[s.slabId]?.label || '—', staffBySite[s.id] || 0]),
          ])}><Icon name="download" className="w-3.5 h-3.5"/>Export</Btn>
          {can(user, 'site.view') && isSuperAdmin(user) && (
            <Btn variant="primary" onClick={() => setEditing({ id: null, code: '', name: '', type: 'store', lat: 19.108, lng: 72.826, radius: 150, shiftStart: '10:00', shiftEnd: '19:00', city: '', region: '', zone: '', bmId: '', teamLeadId: '', managerId: '', slabId: hierarchy.defaultSlabId, incentives: [] })}>
              <Icon name="plus" className="w-3.5 h-3.5"/>Add store
            </Btn>
          )}
        </>}
      </PageHeader>

      <Tabs tabs={TABS} value={tab} onChange={setTab}/>

      {tab === 'targets' && <StoreTargetsTab user={user}/>}

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
        </div>
        <table className="w-full dense-table text-[13px]">
          <thead><tr><th>Store</th><th>City</th><th>State / Zone</th><th>Store Manager</th><th>Team Lead</th><th>Business Mgr</th><th>Incentive slab</th><th className="text-right">Staff</th><th></th></tr></thead>
          <tbody>
            {shown.map((s) => {
              const mgr = s.managerId ? store.getEmployee(s.managerId) : null;
              return (
              <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td>
                  <div className="font-semibold text-slate-800 dark:text-slate-100">{s.name}</div>
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
                    <Btn size="xs" title="Store target" onClick={() => setTargetFor({ site: s, period: '2026-07' })}><Icon name="target" className="w-3 h-3"/></Btn>
                    <Btn size="xs" title="Edit store" onClick={() => setEditing(s)}><Icon name="edit" className="w-3 h-3"/></Btn>
                  </div>
                </td>
              </tr>
              );
            })}
            {shown.length === 0 && <tr><td colSpan={9}><Empty title="No stores match filters"/></td></tr>}
          </tbody>
        </table>
        <Pagination page={page} pages={pages} total={filtered.length} per={PER} onPage={setPage} unit="stores"/>
      </Card>
      </>}

      {editing && (
        <Modal open onClose={() => setEditing(null)} size="xl" icon="building"
          title={editing.id ? 'Edit store' : 'New client store'} subtitle={editing.id ? `${editing.code} · ${editing.city}` : 'Add a client location and its geo-fence'}
          footer={<><Btn onClick={() => setEditing(null)}>Cancel</Btn>
            {editing.id && <Btn variant="danger" onClick={async () => {
              const ok = await confirm({ title: `Delete ${editing.name}?`, body: 'Staff posted here keep their records but lose their store assignment, and any targets set for this store are removed.', confirmLabel: 'Delete store', destructive: true });
              if (!ok) return;
              Store.deleteSite(editing.id); toast('Store removed', 'warn'); setEditing(null);
            }}>Delete</Btn>}
            <Btn variant="primary" onClick={save}><Icon name="check" className="w-3.5 h-3.5"/>Save store</Btn></>}>
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
            <Field label="Incentive slab" className="sm:col-span-2">
              <SearchSelect value={editing.slabId || ''} onChange={(v) => setEditing({ ...editing, slabId: v })}
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
                <div className="text-[10px] text-slate-500 mt-0.5">Store-level incentive definitions applied to staff at this location</div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300">
                {(editing.incentives || []).length} rule{(editing.incentives || []).length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="p-3">
              <IncentiveEditor
                incentives={editing.incentives || []}
                onChange={(inc) => setEditing({ ...editing, incentives: inc })}
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
                <div className="text-[10px] text-slate-500 mt-0.5">Sales target and applicable incentive % for this location</div>
              </div>
              <Badge tone="slate">{store.getStoreTargets(editing.id).length} period{store.getStoreTargets(editing.id).length === 1 ? '' : 's'}</Badge>
            </div>
            <StoreTargetPanel site={editing} onOpenTarget={(period) => setTargetFor({ site: editing, period })}/>
          </div>

          <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <SiteMapPicker lat={editing.lat} lng={editing.lng} radius={editing.radius} onChange={(lat, lng) => setEditing({ ...editing, lat, lng })}/>
          </div>
        </Modal>
      )}

      {targetFor && <StoreTargetModal site={targetFor.site} period={targetFor.period} onClose={() => setTargetFor(null)}/>}
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
  StoreTargetModal, StoreTargetPanel, StoreTargetsTab, TARGET_PERIODS,
});
