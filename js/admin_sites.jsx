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

function IncentiveEditor({ incentives, onChange }) {
  const rows = incentives || [];
  const addRow = () => onChange([...rows, { id: 'inc_' + Math.random().toString(36).slice(2, 8), minSales: '', type: 'pct', value: '' }]);
  const updateRow = (id, patch) => onChange(rows.map((r) => r.id === id ? { ...r, ...patch } : r));
  const removeRow = (id) => onChange(rows.filter((r) => r.id !== id));

  return (
    <div>
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        {rows.length > 0 && (
          <div className="grid grid-cols-[1.1fr_1fr_1fr_auto] gap-2 px-3 py-1.5 text-[10px] uppercase font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
            <div>Sales from (₹)</div><div>Incentive Type</div><div>Value</div><div/>
          </div>
        )}
        {rows.map((row) => (
          <div key={row.id} className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
            <div className="grid grid-cols-[1.1fr_1fr_1fr_auto] gap-2 items-center">
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
              <button onClick={() => removeRow(row.id)} className="w-7 h-7 flex items-center justify-center rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition">
                <Icon name="trash" className="w-3.5 h-3.5"/>
              </button>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <Icon name="info" className="w-3 h-3 shrink-0 text-slate-400"/>{incentiveRuleText(row)}
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="px-3 py-3 text-[11px] text-slate-500 italic">No incentives defined — click "Add Incentive" to begin.</div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mt-2">
        <button onClick={addRow} className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300 hover:text-brand-800 dark:hover:text-brand-200 transition">
          <Icon name="plus" className="w-3.5 h-3.5"/>Add Incentive
        </button>
        {rows.length > 1 && (
          <span className="text-[10px] text-slate-400">Each rule is independent — every rule that clears its threshold pays.</span>
        )}
      </div>
    </div>
  );
}

function SitesPage({ user }) {
  const store = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');
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

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Deployments</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">Client stores & geo-fences</div>
          <div className="text-[12px] text-slate-500 mt-0.5">{sites.length} stores · {(hierarchy.zones || []).length} zones · {(hierarchy.regions || []).length} states · {teamLeads.length} Team Leads · {(hierarchy.businessManagers || []).length} Business Managers</div>
        </div>
        <div className="flex items-center gap-2">
          <Btn onClick={() => downloadCSV('stores.csv', [
            ['Code','Store','City','State','Zone','Store Manager','Team Lead','Business Manager','Slab','Active staff'],
            ...filtered.map((s) => [s.code, s.name, s.city, s.region, s.zone, (store.getEmployee(s.managerId) || {}).name || '—', s.cm, s.bm, tplById[s.slabId]?.label || '—', staffBySite[s.id] || 0]),
          ])}><Icon name="download" className="w-3.5 h-3.5"/>Export</Btn>
          <Btn variant="primary" onClick={() => setEditing({ id: null, code: '', name: '', type: 'store', lat: 19.108, lng: 72.826, radius: 150, shiftStart: '10:00', shiftEnd: '19:00', city: '', region: '', zone: '', bmId: '', teamLeadId: '', managerId: '', slabId: hierarchy.defaultSlabId, incentives: [] })}><Icon name="plus" className="w-3.5 h-3.5"/>Add store</Btn>
        </div>
      </div>

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
                <td><Btn size="xs" onClick={() => setEditing(s)}><Icon name="edit" className="w-3 h-3"/></Btn></td>
              </tr>
              );
            })}
            {shown.length === 0 && <tr><td colSpan={9}><Empty title="No stores match filters"/></td></tr>}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 dark:border-slate-800 text-[12px]">
            <span className="text-slate-500">Showing {page * PER + 1}–{Math.min((page + 1) * PER, filtered.length)} of {filtered.length} stores</span>
            <div className="flex items-center gap-2">
              <Btn size="xs" disabled={page === 0} onClick={() => setPage(page - 1)}><Icon name="chevron-left" className="w-3 h-3"/>Prev</Btn>
              <span className="font-mono">{page + 1} / {pages}</span>
              <Btn size="xs" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next<Icon name="chevron-right" className="w-3 h-3"/></Btn>
            </div>
          </div>
        )}
      </Card>

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? 'Edit store' : 'New client store'} wide
          footer={<><Btn onClick={() => setEditing(null)}>Cancel</Btn>{editing.id && <Btn variant="danger" onClick={() => { if (confirm('Delete store?')) { Store.deleteSite(editing.id); toast('Store removed', 'warn'); setEditing(null); } }}>Delete</Btn>}<Btn variant="primary" onClick={save}>Save store</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
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
            <Field label="Store Manager" className="col-span-2"
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
            <div className="col-span-2 -mt-1 flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
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
            <Field label="Incentive slab" className="col-span-2">
              <SearchSelect value={editing.slabId || ''} onChange={(v) => setEditing({ ...editing, slabId: v })}
                placeholder="Company default" searchPlaceholder="Search slab…" emptyLabel="No slab matches"
                options={[{ value: '', label: 'Company default' },
                  ...templates.map((t) => ({ value: t.id, label: t.label, sub: t.raw || '', keywords: t.raw }))]}/>
            </Field>
            <Field label="Latitude"><Input type="number" step="0.0001" value={editing.lat} onChange={(e) => setEditing({ ...editing, lat: +e.target.value })}/></Field>
            <Field label="Longitude"><Input type="number" step="0.0001" value={editing.lng} onChange={(e) => setEditing({ ...editing, lng: +e.target.value })}/></Field>
            <Field label="Geo-fence radius (m)" className="col-span-2">
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
          <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <SiteMapPicker lat={editing.lat} lng={editing.lng} radius={editing.radius} onChange={(lat, lng) => setEditing({ ...editing, lat, lng })}/>
          </div>
        </Modal>
      )}
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

Object.assign(window, { SitesPage, SiteMapPicker, IncentiveEditor, incentiveRuleText });
