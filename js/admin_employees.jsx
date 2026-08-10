/* Employees list + detail drawer */
function EmployeeDetailDrawer({ emp: empProp, onClose }) {
  const store = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  if (!empProp) return null;
  /* Always read the live record so edits, incentive changes and travel-allowance
     toggles are reflected without reopening the drawer. */
  const emp = store.getEmployee(empProp.id) || empProp;
  const site = store.getSite(emp.siteId);
  const july = '2026-07';
  const payslip = store.computePayslip(emp.id, july);
  const sales = store.getSales(emp.id, july);
  const inc = store.calcIncentive(sales?.totalSales || 0, emp);
  const slabInfo = store.resolveSlab(emp);
  const recentAtt = store.getAttendance({ employeeId: emp.id }).slice(-8).reverse();
  const sites = store.getSites();
  /* 562 stores — searchable, never a scroll-forever <select>. */
  const siteOptions = useMemo(() => [
    { value: '', label: '— Unassigned —' },
    ...sites.map((s) => ({ value: s.id, label: s.name, sub: [s.city, s.region, s.code].filter(Boolean).join(' · '), keywords: s.code })),
  ], [store.state]);

  const startEdit = () => {
    setDraft({
      name: emp.name || '', code: emp.code || '', phone: emp.phone || '', email: emp.email || '',
      role: emp.role || 'field-employee', status: emp.status || 'active', siteId: emp.siteId || '',
      joiningDate: emp.joiningDate || '', baseSalary: emp.baseSalary || 0,
      aadhaarMasked: emp.aadhaarMasked || '', panMasked: emp.panMasked || '',
      bankVerified: !!emp.bankVerified,
    });
    setEditing(true);
  };
  const setD = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const saveEdit = () => {
    if (!draft.name.trim()) { toast('Employee name is required', 'error'); return; }
    if (!draft.code.trim()) { toast('Employee ID is required', 'error'); return; }
    const clash = store.getEmployees().find((x) => x.id !== emp.id && (x.code || '').toLowerCase() === draft.code.trim().toLowerCase());
    if (clash) { toast(`Employee ID ${draft.code} already belongs to ${clash.name}`, 'error'); return; }
    Store.updateEmployee(emp.id, {
      ...draft,
      name: draft.name.trim(),
      code: draft.code.trim(),
      baseSalary: +draft.baseSalary || 0,
      siteId: draft.siteId || null,
    });
    toast('Employee details updated', 'success');
    setEditing(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex anim-in">
      <div className="flex-1 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="w-[520px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full overflow-y-auto shadow-pop">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar emp={emp} size={54}/>
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{emp.name}</div>
              <div className="text-[12px] text-slate-500">{emp.code} · {site?.name}</div>
              <div className="flex gap-1.5 mt-1.5">
                <Badge tone={emp.status === 'active' ? 'green' : 'amber'}>{emp.status}</Badge>
                <Badge tone="brand">{ROLE_LABEL[emp.role]}</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!editing && <Btn size="xs" onClick={startEdit}><Icon name="edit" className="w-3 h-3"/>Edit</Btn>}
            <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><Icon name="x"/></button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Employee details — read-only summary or editable form */}
          {!editing ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Employee code', emp.code, 'file'],
                ['Phone', emp.phone, 'phone'],
                ['Email', emp.email, 'mail'],
                ['Joined', fmtDate(emp.joiningDate, { year: true }), 'calendar'],
                ['Aadhaar', emp.aadhaarMasked, 'shield'],
                ['PAN', emp.panMasked, 'shield'],
                ['Base salary', fmtINR(emp.baseSalary), 'wallet'],
                ['Bank', emp.bankVerified ? 'Verified ✓' : 'Not verified', 'wallet'],
                ['Zone / Region', site ? `${site.zone || '—'} · ${site.region || '—'}` : '—', 'map'],
                ['Store slab', inc.slab.label + ` (${slabInfo.source})`, 'trending-up'],
              ].map(([k, v, i]) => (
                <div key={k} className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2.5">
                  <Icon name={i} className="w-3.5 h-3.5 text-slate-400"/>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{k}</div>
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">{v}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-brand-200 dark:border-brand-800 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-gradient-to-r from-brand-50 to-white dark:from-brand-900/20 dark:to-slate-900 border-b border-brand-100 dark:border-brand-800">
                <div className="text-[12px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Icon name="edit" className="w-3.5 h-3.5 text-brand-600"/>Edit employee details
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Changes apply immediately across payroll, live map and reports</div>
              </div>
              <div className="p-3 grid grid-cols-2 gap-3">
                <Field label="Full name"><Input value={draft.name} onChange={(e) => setD({ name: e.target.value })}/></Field>
                <Field label="Employee ID"><Input value={draft.code} onChange={(e) => setD({ code: e.target.value })} placeholder="SDC001"/></Field>
                <Field label="Phone"><Input value={draft.phone} onChange={(e) => setD({ phone: e.target.value })} placeholder="+91 98xxx xxxxx"/></Field>
                <Field label="Email"><Input value={draft.email} onChange={(e) => setD({ email: e.target.value })} placeholder="you@sdc.in"/></Field>
                <Field label="Assigned store" className="col-span-2">
                  <SearchSelect value={draft.siteId || ''} onChange={(v) => setD({ siteId: v })}
                    options={siteOptions} placeholder="— Unassigned —" searchPlaceholder="Search store, code or city…"
                    emptyLabel="No store matches"/>
                </Field>
                <Field label="Role">
                  <Select value={draft.role} onChange={(e) => setD({ role: e.target.value })}>
                    {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={draft.status} onChange={(e) => setD({ status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                    <option value="rejected">Rejected</option>
                  </Select>
                </Field>
                <Field label="Joining date"><Input type="date" value={draft.joiningDate || ''} onChange={(e) => setD({ joiningDate: e.target.value })}/></Field>
                <Field label="Base salary (₹ / month)"><Input type="number" min="0" step="500" value={draft.baseSalary} onChange={(e) => setD({ baseSalary: e.target.value })}/></Field>
                <Field label="Aadhaar (masked)"><Input value={draft.aadhaarMasked} onChange={(e) => setD({ aadhaarMasked: e.target.value })} placeholder="XXXX-XXXX-4321"/></Field>
                <Field label="PAN (masked)"><Input value={draft.panMasked} onChange={(e) => setD({ panMasked: e.target.value })} placeholder="ABXXX7845N"/></Field>
                <label className="col-span-2 flex items-center gap-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input type="checkbox" checked={draft.bankVerified} onChange={(e) => setD({ bankVerified: e.target.checked })} className="accent-brand-700 w-4 h-4"/>
                  Bank account verified (penny-drop)
                </label>
              </div>
              <div className="px-3 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end gap-2">
                <Btn size="sm" onClick={() => setEditing(false)}>Cancel</Btn>
                <Btn size="sm" variant="primary" onClick={saveEdit}><Icon name="check" className="w-3 h-3"/>Save changes</Btn>
              </div>
            </div>
          )}

          {/* Reporting line — Technician → Store Manager → Team Lead → Business Manager */}
          <Card title="Reporting line" bodyClass="p-3"
            right={emp.isStoreManager ? <Badge tone="violet">Store Manager</Badge> : <Badge tone="slate">Technician</Badge>}>
            <div className="space-y-0">
              <div className="flex gap-2.5">
                <div className="flex flex-col items-center">
                  <Avatar emp={emp} size={22}/>
                  <div className="w-px flex-1 min-h-[14px] bg-slate-200 dark:bg-slate-700"/>
                </div>
                <div className="pb-2.5 min-w-0">
                  <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">{emp.name}</div>
                  <div className="text-[10px] text-slate-500">{emp.isStoreManager ? 'Store Manager' : 'Technician'} · {site ? site.name : 'Unassigned'}</div>
                </div>
              </div>
              {store.getReportingChain(emp.id).map((node, i, arr) => (
                <div key={node.level} className="flex gap-2.5">
                  <div className="flex flex-col items-center">
                    <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 ${
                      node.level === 'store-manager' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                      : node.level === 'team-lead' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                    }`}>
                      <Icon name={node.level === 'business-manager' ? 'building' : 'user'} className="w-3 h-3"/>
                    </div>
                    {i < arr.length - 1 && <div className="w-px flex-1 min-h-[14px] bg-slate-200 dark:bg-slate-700"/>}
                  </div>
                  <div className="pb-2.5 min-w-0">
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">{node.name}</div>
                    <div className="text-[10px] text-slate-500">{node.label}{node.meta ? ' · ' + node.meta : ''}</div>
                  </div>
                </div>
              ))}
              {store.getReportingChain(emp.id).length === 0 && (
                <div className="text-[11px] text-slate-400 italic pl-8">No reporting line — this employee has no store assigned.</div>
              )}
            </div>
          </Card>

          <Card title="July snapshot" bodyClass="p-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/50">
                <div className="text-[10px] uppercase text-slate-500 font-semibold">Present</div>
                <div className="text-lg font-bold text-emerald-600">{payslip.presentDays}<span className="text-[10px] text-slate-400 font-normal">/{payslip.workingDays}</span></div>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/50">
                <div className="text-[10px] uppercase text-slate-500 font-semibold">Sales</div>
                <div className="text-lg font-bold text-slate-800 dark:text-white">{fmtINR(sales?.totalSales || 0)}</div>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/50">
                <div className="text-[10px] uppercase text-slate-500 font-semibold">Incentive</div>
                <div className="text-lg font-bold text-brand-700 dark:text-brand-300">{fmtINR(inc.payout)}</div>
              </div>
            </div>
          </Card>

          <Card title="Recent attendance" bodyClass="p-0">
            <div className="max-h-56 overflow-auto">
              {recentAtt.map((a) => (
                <div key={a.id} className="p-2.5 flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${a.insideGeofence ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30'}`}>
                    <Icon name={a.type === 'clock-in' ? 'check' : a.type === 'clock-out' ? 'x' : 'target'} className="w-3 h-3"/>
                  </div>
                  <div className="flex-1 text-[12px] text-slate-700 dark:text-slate-200 font-mono">{a.type} · {fmtDateTime(a.timestamp)}</div>
                  {!a.insideGeofence && <Badge tone="red">Out</Badge>}
                </div>
              ))}
              {recentAtt.length === 0 && <Empty title="No attendance yet"/>}
            </div>
          </Card>

          {/* Travel allowance */}
          <Card title="Travel allowance" bodyClass="p-3"
            right={<Badge tone={emp.travelEligible ? 'green' : 'slate'}>{emp.travelEligible ? 'Eligible' : 'Not eligible'}</Badge>}>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input type="checkbox" checked={!!emp.travelEligible} onChange={(e) => { Store.updateEmployee(emp.id, { travelEligible: e.target.checked, travelAmount: emp.travelAmount || 1500 }); toast(e.target.checked ? 'Travel allowance enabled' : 'Travel allowance disabled', 'success'); }} className="accent-brand-700 w-4 h-4"/>
                Eligible for travel allowance
              </label>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Fixed amount</span>
                <Input type="number" value={emp.travelAmount || 0} disabled={!emp.travelEligible} onChange={(e) => Store.updateEmployee(emp.id, { travelAmount: +e.target.value })} className="!w-24"/>
              </div>
            </div>
          </Card>

          {/* Employee incentives */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-brand-50 to-white dark:from-brand-900/20 dark:to-slate-900 border-b border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-[12px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Icon name="trending-up" className="w-3.5 h-3.5 text-brand-600"/>Incentives
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Employee-specific incentive overrides (supplements store slab)</div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300">
                {(emp.incentives || []).length} rule{(emp.incentives || []).length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="p-3">
              <IncentiveEditor
                incentives={emp.incentives || []}
                onChange={(inc) => { Store.updateEmployeeIncentives(emp.id, inc); toast('Incentives updated', 'success'); }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Btn variant="danger" size="sm" onClick={() => { Store.updateEmployee(emp.id, { status: emp.status === 'active' ? 'inactive' : 'active' }); onClose(); }}>
              {emp.status === 'active' ? 'Deactivate' : 'Activate'}
            </Btn>
            <Btn size="sm" className="ml-auto" onClick={onClose}>Close</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ---- Filter popover: keeps six rarely-changed filters off the main bar ---- */
function FilterPopover({ count, onClear, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className={`h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md border text-[12px] font-semibold transition ${
          count > 0
            ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-200 dark:border-brand-600'
            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}>
        <Icon name="sliders" className="w-3.5 h-3.5"/>Filters
        {count > 0 && <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand-700 text-white text-[10px] font-bold flex items-center justify-center">{count}</span>}
        <Icon name={open ? 'chevron-up' : 'chevron-down'} className="w-3 h-3"/>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)}/>
          <div className="absolute right-0 top-9 z-30 w-[320px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-pop p-3 space-y-2.5 anim-in">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Refine by</div>
              {count > 0 && <button onClick={onClear} className="text-[11px] font-semibold text-rose-600 hover:underline">Clear all</button>}
            </div>
            {children}
          </div>
        </>
      )}
    </div>
  );
}

function EmployeesPage({ user }) {
  const store = useStore();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [openWizard, setOpenWizard] = useState(false);
  const [page, setPage] = useState(0);
  const isSiteMgr = user.role === 'site-manager';
  const hierarchy = store.getHierarchy();

  const BLANK = { zone: 'all', region: 'all', city: 'all', siteId: 'all', teamLead: 'all', bm: 'all', level: 'all', status: 'all' };
  const [f, setF] = useState(BLANK);
  /* Clearing an upstream filter must clear everything downstream of it, or the
     list silently keeps a narrower scope than the chips suggest. */
  const setFilter = (patch) => {
    setF((prev) => {
      const next = { ...prev, ...patch };
      if (patch.zone !== undefined) Object.assign(next, { region: 'all', city: 'all', siteId: 'all', teamLead: 'all' });
      if (patch.region !== undefined) Object.assign(next, { city: 'all', siteId: 'all', teamLead: 'all' });
      if (patch.city !== undefined) Object.assign(next, { siteId: 'all' });
      if (patch.teamLead !== undefined) Object.assign(next, { siteId: 'all' });
      return next;
    });
    setPage(0);
  };

  const allSites = store.getSites();
  const siteById = useMemo(() => Object.fromEntries(allSites.map((s) => [s.id, s])), [store.state]);

  /* Cascading option lists — each level is derived from the sites still in scope,
     so you can never pick a combination that yields zero results. */
  const sitesInScope = useMemo(() => allSites.filter((s) =>
    (f.zone === 'all' || s.zone === f.zone) &&
    (f.region === 'all' || s.region === f.region) &&
    (f.city === 'all' || s.city === f.city) &&
    (f.teamLead === 'all' || s.teamLeadId === f.teamLead) &&
    (f.bm === 'all' || s.bmId === f.bm)
  ), [f.zone, f.region, f.city, f.teamLead, f.bm, store.state]);

  const regionOpts = useMemo(() => [...new Set(allSites.filter((s) => f.zone === 'all' || s.zone === f.zone).map((s) => s.region).filter(Boolean))].sort(), [f.zone, store.state]);
  const cityOpts = useMemo(() => [...new Set(allSites.filter((s) => (f.zone === 'all' || s.zone === f.zone) && (f.region === 'all' || s.region === f.region)).map((s) => s.city).filter(Boolean))].sort(), [f.zone, f.region, store.state]);
  const storeOpts = useMemo(() => sitesInScope.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')), [sitesInScope]);
  const teamLeadOpts = useMemo(() => store.getTeamLeads().filter((m) =>
    (f.zone === 'all' || m.zone === f.zone) && (f.region === 'all' || m.region === f.region)), [f.zone, f.region, store.state]);
  const bmOpts = useMemo(() => store.getBusinessManagers().filter((m) => f.zone === 'all' || m.zone === f.zone), [f.zone, store.state]);

  let list = store.getEmployees();
  if (isSiteMgr) list = list.filter((e) => e.siteId === user.siteId);
  if (f.status !== 'all') list = list.filter((e) => e.status === f.status);
  if (f.level === 'store-manager') list = list.filter((e) => !!e.isStoreManager);
  if (f.level === 'technician') list = list.filter((e) => e.role === 'field-employee' && !e.isStoreManager);
  if (f.siteId !== 'all') list = list.filter((e) => e.siteId === f.siteId);
  else if (f.zone !== 'all' || f.region !== 'all' || f.city !== 'all' || f.teamLead !== 'all' || f.bm !== 'all') {
    const ids = new Set(sitesInScope.map((s) => s.id));
    list = list.filter((e) => ids.has(e.siteId));
  }
  if (q) {
    const ql = q.trim().toLowerCase();
    const qDigits = ql.replace(/\D/g, '');
    list = list.filter((e) => {
      const site = siteById[e.siteId];
      return (e.name || '').toLowerCase().includes(ql)
        || (e.code || '').toLowerCase().includes(ql)
        || (e.email || '').toLowerCase().includes(ql)
        || (qDigits.length >= 4 && (e.phone || '').replace(/\D/g, '').includes(qDigits))
        || (site && ((site.name || '').toLowerCase().includes(ql) || (site.city || '').toLowerCase().includes(ql)));
    });
  }
  const PER = 25;
  const pages = Math.ceil(list.length / PER) || 1;
  const pageList = list.slice(page * PER, page * PER + PER);

  /* Removable chips — one per active filter, so the current scope is always visible. */
  const chips = [];
  if (f.zone !== 'all')     chips.push({ k: 'zone',     label: 'Zone: ' + f.zone,   clear: () => setFilter({ zone: 'all' }) });
  if (f.region !== 'all')   chips.push({ k: 'region',   label: 'State: ' + f.region, clear: () => setFilter({ region: 'all' }) });
  if (f.city !== 'all')     chips.push({ k: 'city',     label: 'City: ' + f.city,   clear: () => setFilter({ city: 'all' }) });
  if (f.siteId !== 'all')   chips.push({ k: 'site',     label: 'Store: ' + ((siteById[f.siteId] || {}).name || f.siteId), clear: () => setFilter({ siteId: 'all' }) });
  if (f.teamLead !== 'all') chips.push({ k: 'tl',       label: 'Team Lead: ' + ((store.getTeamLead(f.teamLead) || {}).name || ''), clear: () => setFilter({ teamLead: 'all' }) });
  if (f.bm !== 'all')       chips.push({ k: 'bm',       label: 'Business Mgr: ' + ((store.getBusinessManager(f.bm) || {}).name || ''), clear: () => setFilter({ bm: 'all' }) });
  if (f.level !== 'all')    chips.push({ k: 'level',    label: 'Level: ' + (f.level === 'store-manager' ? 'Store Manager' : 'Technician'), clear: () => setFilter({ level: 'all' }) });
  if (f.status !== 'all')   chips.push({ k: 'status',   label: 'Status: ' + f.status, clear: () => setFilter({ status: 'all' }) });
  const popoverCount = ['zone', 'region', 'city', 'siteId', 'teamLead', 'bm'].filter((k) => f[k] !== 'all').length;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Directory</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">Employees</div>
          <div className="text-[12px] text-slate-500 mt-0.5">{list.length} of {store.getEmployees().length} field staff</div>
        </div>
        <div className="flex items-center gap-2">
          {!isSiteMgr && <Btn variant="primary" onClick={() => setOpenWizard(true)}><Icon name="plus" className="w-3.5 h-3.5"/>Add employee</Btn>}
          <Btn onClick={() => downloadCSV('employees.csv', [
            ['Code','Name','Level','Phone','Email','Store','City','State','Zone','Store Manager','Team Lead','Business Manager','Status','Aadhaar','PAN','Base'],
            ...list.map((e) => {
              const s = siteById[e.siteId] || {};
              const mgr = s.managerId ? store.getEmployee(s.managerId) : null;
              return [e.code, e.name, e.isStoreManager ? 'Store Manager' : 'Technician', e.phone, e.email,
                s.name || '', s.city || '', s.region || '', s.zone || '',
                mgr ? mgr.name : '', s.cm || '', s.bm || '',
                e.status, e.aadhaarMasked, e.panMasked, e.baseSalary];
            }),
          ])}><Icon name="download" className="w-3.5 h-3.5"/>Export CSV</Btn>
        </div>
      </div>

      <Card noBody>
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-[240px] h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <Icon name="search" className="w-3.5 h-3.5 text-slate-400"/>
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search name, code, email, phone or store…" className="flex-1 bg-transparent text-[13px] outline-none dark:text-slate-100"/>
              {q && <button onClick={() => { setQ(''); setPage(0); }} className="text-slate-400 hover:text-slate-600"><Icon name="x" className="w-3.5 h-3.5"/></button>}
            </div>

            {/* Level — segmented, because it is the filter people flip most often */}
            <div className="inline-flex rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
              {[['all', 'All'], ['technician', 'Technicians'], ['store-manager', 'Store Managers']].map(([v, label]) => (
                <button key={v} onClick={() => setFilter({ level: v })}
                  className={`h-8 px-2.5 text-[12px] font-semibold transition border-r last:border-r-0 border-slate-200 dark:border-slate-700 ${
                    f.level === v ? 'bg-brand-700 text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}>{label}</button>
              ))}
            </div>

            <Select value={f.status} onChange={(e) => setFilter({ status: e.target.value })} className="!w-auto">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
              <option value="rejected">Rejected</option>
            </Select>

            {!isSiteMgr && (
              <FilterPopover count={popoverCount} onClear={() => { setF({ ...BLANK, level: f.level, status: f.status }); setPage(0); }}>
                <Field label="Zone">
                  <Select value={f.zone} onChange={(e) => setFilter({ zone: e.target.value })}>
                    <option value="all">All zones</option>
                    {(hierarchy.zones || []).map((z) => <option key={z} value={z}>{z}</option>)}
                  </Select>
                </Field>
                <Field label="State">
                  <SearchSelect value={f.region} onChange={(v) => setFilter({ region: v })}
                    options={[{ value: 'all', label: `All states${f.zone !== 'all' ? ` in ${f.zone}` : ''}` }, ...regionOpts.map((r) => ({ value: r, label: r }))]}
                    searchPlaceholder="Search state…" emptyLabel="No state matches"/>
                </Field>
                <Field label="City">
                  <SearchSelect value={f.city} onChange={(v) => setFilter({ city: v })}
                    options={[{ value: 'all', label: `All cities (${cityOpts.length})` }, ...cityOpts.map((c) => ({ value: c, label: c }))]}
                    searchPlaceholder="Search city…" emptyLabel="No city matches"/>
                </Field>
                <Field label="Team Lead">
                  <SearchSelect value={f.teamLead} onChange={(v) => setFilter({ teamLead: v })}
                    options={[{ value: 'all', label: `All Team Leads (${teamLeadOpts.length})` },
                      ...teamLeadOpts.map((m) => ({ value: m.id, label: m.name, sub: [m.region, `${m.storeCount} stores`].filter(Boolean).join(' · ') }))]}
                    searchPlaceholder="Search Team Lead by name…" emptyLabel="No Team Lead matches"/>
                </Field>
                <Field label="Business Manager">
                  <SearchSelect value={f.bm} onChange={(v) => setFilter({ bm: v })}
                    options={[{ value: 'all', label: `All Business Managers (${bmOpts.length})` },
                      ...bmOpts.map((m) => ({ value: m.id, label: m.name, sub: [m.zone ? m.zone + ' zone' : null, `${m.storeCount} stores`].filter(Boolean).join(' · ') }))]}
                    searchPlaceholder="Search Business Manager by name…" emptyLabel="No Business Manager matches"/>
                </Field>
                <Field label="Store" hint={`${storeOpts.length} store${storeOpts.length !== 1 ? 's' : ''} in current scope`}>
                  <SearchSelect value={f.siteId} onChange={(v) => setFilter({ siteId: v })}
                    options={[{ value: 'all', label: 'All stores' },
                      ...storeOpts.map((s) => ({ value: s.id, label: s.name, sub: [s.city, s.code].filter(Boolean).join(' · '), keywords: s.code }))]}
                    searchPlaceholder="Search store, code or city…" emptyLabel="No store matches"/>
                </Field>
              </FilterPopover>
            )}
          </div>

          {/* Active filter chips */}
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {chips.map((c) => (
                <button key={c.k} onClick={c.clear}
                  className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 text-[11px] font-semibold text-brand-800 dark:text-brand-200 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition">
                  {c.label}<Icon name="x" className="w-3 h-3"/>
                </button>
              ))}
              <button onClick={() => { setF(BLANK); setQ(''); setPage(0); }} className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 underline ml-1">Clear all</button>
            </div>
          )}
        </div>
        <table className="w-full dense-table text-[13px]">
          <thead>
            <tr>
              <th>Employee</th><th>Code</th><th>Store</th><th>Team Lead</th><th>Aadhaar</th><th>PAN</th><th>Bank</th><th>Status</th><th>Salary</th><th></th>
            </tr>
          </thead>
          <tbody>
            {pageList.map((e) => {
              const site = siteById[e.siteId];
              return (
                <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => setSelected(e)}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Avatar emp={e} size={30}/>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <span className="truncate">{e.name}</span>
                          {e.isStoreManager && <Badge tone="violet">Store Mgr</Badge>}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{e.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-[12px] text-slate-600 dark:text-slate-300">{e.code}</td>
                  <td>{site
                    ? <div className="max-w-[170px]"><div className="text-[12px] text-slate-700 dark:text-slate-200 truncate">{site.name}</div><div className="text-[10px] text-slate-500">{site.city} · {site.region}</div></div>
                    : <span className="text-slate-400">—</span>}</td>
                  <td className="text-[12px] text-slate-600 dark:text-slate-300 max-w-[130px] truncate">{site && site.cm ? site.cm : '—'}</td>
                  <td className="font-mono text-[11px] text-slate-500">{e.aadhaarMasked}</td>
                  <td className="font-mono text-[11px] text-slate-500">{e.panMasked}</td>
                  <td>{e.bankVerified ? <Badge tone="green"><Icon name="check" className="w-3 h-3"/>Verified</Badge> : <Badge tone="slate">—</Badge>}</td>
                  <td>
                    {e.status === 'active' && <Badge tone="green">Active</Badge>}
                    {e.status === 'pending' && <Badge tone="amber">Pending</Badge>}
                    {e.status === 'inactive' && <Badge tone="slate">Inactive</Badge>}
                    {e.status === 'rejected' && <Badge tone="red">Rejected</Badge>}
                  </td>
                  <td className="font-semibold text-slate-800 dark:text-slate-100">{fmtINR(e.baseSalary)}</td>
                  <td><Icon name="chevron-right" className="w-4 h-4 text-slate-400"/></td>
                </tr>
              );
            })}
            {list.length === 0 && <tr><td colSpan={10}><Empty title="No employees match filters" hint="Try clearing a filter chip above."/></td></tr>}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 dark:border-slate-800 text-[12px]">
            <span className="text-slate-500">Showing {page * PER + 1}–{Math.min((page + 1) * PER, list.length)} of {list.length}</span>
            <div className="flex items-center gap-2">
              <Btn size="xs" disabled={page === 0} onClick={() => setPage(page - 1)}><Icon name="chevron-left" className="w-3 h-3"/>Prev</Btn>
              <span className="font-mono">{page + 1} / {pages}</span>
              <Btn size="xs" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next<Icon name="chevron-right" className="w-3 h-3"/></Btn>
            </div>
          </div>
        )}
      </Card>

      {selected && <EmployeeDetailDrawer emp={selected} onClose={() => setSelected(null)}/>}
      <OnboardingWizard open={openWizard} onClose={() => setOpenWizard(false)}/>
    </div>
  );
}

Object.assign(window, { EmployeesPage, EmployeeDetailDrawer, FilterPopover });
