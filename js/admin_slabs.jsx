/* Incentive configuration — no longer a top-level tab.

   "Incentive Slabs" used to sit in the main navigation beside Incentives, which
   duplicated the same subject. This file now exports IncentiveConfigPanel, which
   the Incentives page mounts under its Configuration tab:

     Employee rules · Bulk upload · Upload history · Slab template library

   The panel keeps its own sub-tabs; the page owns the heading. */

/* ---- helpers ---- */
function fmtIncentiveType(type) {
  return type === 'pct' ? 'Percentage (%)' : 'Fixed Amount (₹)';
}
function fmtIncentiveValue(row) {
  if (!row) return '—';
  return row.type === 'pct' ? row.value + '%' : fmtINR(+row.value);
}
/* Threshold a rule must clear before it pays; 0 / blank means "from rupee one". */
function fmtIncentiveThreshold(row) {
  if (!row) return '—';
  const min = +row.minSales || 0;
  return min > 0 ? fmtINR(min) : 'No minimum';
}

/* ---- Slab template editor (kept for advanced/compat) ---- */
function tierText(t) {
  const fl = t.from >= 100000 ? '₹' + (t.from / 100000).toFixed(t.from % 100000 ? 1 : 0) + 'L' : t.from >= 1000 ? '₹' + Math.round(t.from / 1000) + 'k' : '₹' + t.from;
  return `${fl}+ → ${t.type === 'pct' ? t.value + '% of sales' : fmtINR(t.value) + ' flat'}`;
}

function SlabTemplateEditor({ tpl, onClose, user }) {
  const toast = useToast();
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(tpl)));
  const setTier = (i, patch) => setDraft((d) => ({ ...d, tiers: d.tiers.map((t, idx) => idx === i ? { ...t, ...patch } : t) }));
  const addTier = () => setDraft((d) => ({ ...d, tiers: [...(d.tiers || []), { from: 50000, type: 'pct', value: 10 }] }));
  const delTier = (i) => setDraft((d) => ({ ...d, tiers: d.tiers.filter((_, idx) => idx !== i) }));
  const save = () => {
    const tiers = (draft.tiers || []).map((t) => ({ from: +t.from || 0, type: t.type, value: +t.value || 0 })).sort((a, b) => a.from - b.from);
    const kind = tiers.length === 0 ? 'none' : (tiers.every((t) => t.type === 'pct') ? 'pct' : tiers.every((t) => t.type === 'flat') ? 'flat' : 'mixed');
    // The store layer is the real gate — even if this dialog were somehow
    // reached without incentive.edit, the save is refused here, not just hidden.
    const res = Store.upsertSlabTemplate({ ...draft, tiers, kind }, user);
    if (res && res.error) { toast(res.error, 'error'); return; }
    toast('Slab template saved — payroll recomputed live', 'success');
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={draft.id && Store.getSlabTemplate(draft.id) ? 'Edit slab template' : 'New slab template'} wide
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={save}>Save template</Btn></>}>
      <div className="space-y-3">
        <Field label="Template name / label"><Input value={draft.label || ''} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="e.g. ₹50k→10% · Above→15%"/></Field>
        <Field label="Original slab text (from client sheet)" hint="Free-text as provided by the client — kept for reference."><Input value={draft.raw || ''} onChange={(e) => setDraft({ ...draft, raw: e.target.value })}/></Field>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Slab tiers</div>
            <Btn size="xs" onClick={addTier}><Icon name="plus" className="w-3 h-3"/>Add tier</Btn>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-2 py-1.5 text-[10px] uppercase font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/50">
              <div>Sales from (₹)</div><div>Type</div><div>Value</div><div></div>
            </div>
            {(draft.tiers || []).map((t, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-2 py-1.5 items-center">
                <Input type="number" value={t.from} onChange={(e) => setTier(i, { from: e.target.value })}/>
                <Select value={t.type} onChange={(e) => setTier(i, { type: e.target.value })}><option value="pct">% of sales</option><option value="flat">Flat ₹</option></Select>
                <Input type="number" value={t.value} onChange={(e) => setTier(i, { value: e.target.value })}/>
                <Btn size="xs" variant="danger" onClick={() => delTier(i)}><Icon name="trash" className="w-3 h-3"/></Btn>
              </div>
            ))}
            {(draft.tiers || []).length === 0 && <div className="p-3 text-center text-[11px] text-slate-500">No tiers — this template pays no incentive.</div>}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">Preview: {(draft.tiers || []).length ? (draft.tiers || []).slice().sort((a,b)=>a.from-b.from).map(tierText).join('  ·  ') : 'No incentive'}</div>
        </div>
      </div>
    </Modal>
  );
}

/* ---- Incentive edit modal for a single employee row ---- */
function EmpIncentiveEditModal({ emp, month = '2026-07', onClose, user }) {
  const store = useStore();
  const toast = useToast();
  const [incentives, setIncentives] = useState(() => (emp.incentives || []).map((r) => ({ ...r, id: r.id || 'inc_' + Math.random().toString(36).slice(2, 8) })));
  const sales = store.getSales(emp.id, month)?.totalSales || 0;
  const target = store.storeTargetIncentive(emp, month);
  const save = () => {
    const res = Store.updateEmployeeIncentives(emp.id, incentives, user);
    if (res && res.error) { toast(res.error, 'error'); return; }
    toast('Incentives saved for ' + emp.name, 'success');
    onClose();
  };
  return (
    <Modal open onClose={onClose} size="lg" icon="trending-up"
      title={`Incentives — ${emp.name}`} subtitle={`${emp.designation} · ${fmtMonth(month)} sales ${fmtINR(sales)}`}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={save}><Icon name="check" className="w-3.5 h-3.5"/>Save</Btn></>}>
      <div className="space-y-3">
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800">
          <Icon name="info" className="w-4 h-4 text-brand-600 shrink-0 mt-px"/>
          <div className="text-[12px] text-brand-900 dark:text-brand-100">
            These rules add to the store slab. The total is then compared against the store-target incentive
            {target ? ` (${fmtINR(target.payout)} at present)` : ''} — whichever is higher is what the employee is paid.
          </div>
        </div>
        {/* Amounts are quoted against the employee's real sales for the month. */}
        <IncentiveEditor incentives={incentives} onChange={setIncentives} sales={sales}/>
      </div>
    </Modal>
  );
}

/* ---- Error log modal ---- */
function UploadErrorModal({ upload, onClose }) {
  if (!upload) return null;
  const errors = upload.errors || [];
  const csv = 'Row,Employee ID,Employee Name,Error\n' + errors.map((e) => `${e.row},${e.empId || ''},${e.empName || ''},${e.reason}`).join('\n');
  const download = () => {
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'error_log_' + upload.fileName.replace(/\s/g,'_') + '.csv';
    a.click();
  };
  return (
    <Modal open onClose={onClose} title={'Error Log — ' + upload.fileName} wide
      footer={<><Btn onClick={onClose}>Close</Btn><Btn variant="primary" onClick={download}><Icon name="download" className="w-3.5 h-3.5"/>Download CSV</Btn></>}>
      {errors.length === 0
        ? <Empty title="No errors found in this upload."/>
        : (
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full dense-table text-[12px]">
              <thead><tr><th>Row</th><th>Employee ID</th><th>Name</th><th>Reason</th></tr></thead>
              <tbody>
                {errors.map((e, i) => (
                  <tr key={i}>
                    <td className="font-mono">{e.row}</td>
                    <td className="font-mono text-slate-500">{e.empId || '—'}</td>
                    <td>{e.empName || '—'}</td>
                    <td className="text-rose-600 dark:text-rose-400">{e.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </Modal>
  );
}

/* ======================== IncentiveConfigPanel ======================== */
function IncentiveConfigPanel({ user }) {
  const store = useStore();
  const toast = useToast();
  const { confirm, ConfirmUI } = useConfirm();
  const [tab, setTab] = useState('employees');
  const [editEmp, setEditEmp] = useState(null);
  const [editTpl, setEditTpl] = useState(null);
  const [viewError, setViewError] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);

  /* ---- Employee tab state ---- */
  const [q, setQ] = useState('');
  const [locFilter, setLocFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(0);

  /* ---- Upload tab state ---- */
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null); // { byEmp, errors, total, success, fileName } — nothing is written until confirmed
  const fileInputRef = useRef(null);

  // Routed through the central matrix, not an inline role list — this used to
  // bypass PERMISSIONS entirely, which was the one place the old HR
  // incentive.edit grant could still be exercised even after other buttons
  // were hidden.
  const canUpload = can(user, 'incentive.edit');

  const emps = store.getEmployees({ status: 'active' });
  const sites = store.getSites();
  const siteById = useMemo(() => Object.fromEntries(sites.map((s) => [s.id, s])), [store.state]);
  const uploads = store.getIncentiveUploads();
  const templates = store.getSlabTemplates();

  /* Flatten employee × incentive rows */
  const allRows = useMemo(() => {
    const rows = [];
    emps.forEach((e) => {
      const site = siteById[e.siteId];
      if ((e.incentives || []).length === 0) {
        rows.push({ emp: e, site, incentive: null });
      } else {
        (e.incentives || []).forEach((inc) => rows.push({ emp: e, site, incentive: inc }));
      }
    });
    return rows;
  }, [store.state]);

  const locations = useMemo(() => [...new Set(sites.map((s) => s.city).filter(Boolean))].sort(), [store.state]);

  const filtered = allRows.filter((r) => {
    if (q) {
      const ql = q.toLowerCase();
      if (!((r.emp.name || '').toLowerCase().includes(ql) || (r.emp.code || '').toLowerCase().includes(ql) || (r.site?.city || '').toLowerCase().includes(ql))) return false;
    }
    if (locFilter !== 'all' && r.site?.city !== locFilter) return false;
    if (typeFilter !== 'all') {
      if (typeFilter === 'none' && r.incentive) return false;
      if (typeFilter !== 'none' && (!r.incentive || r.incentive.type !== typeFilter)) return false;
    }
    return true;
  });

  const PER = 20;
  const pages = Math.ceil(filtered.length / PER) || 1;
  const shown = filtered.slice(page * PER, page * PER + PER);

  /* ---- CSV sample download ---- */
  const downloadSample = () => downloadCSV('incentive_upload_sample.csv', [
    ['Employee ID', 'Employee Name', 'Location', 'Minimum Sales', 'Incentive Type', 'Incentive Value'],
    // Same employee, two independent rules — both pay if both thresholds are cleared.
    ['SDC001', 'Rahul Verma', 'Mumbai', '50000', 'Percentage', '10'],
    ['SDC001', 'Rahul Verma', 'Mumbai', '40000', 'Fixed Amount', '2000'],
    ['SDC002', 'Priya Nair', 'Mumbai', '60000', 'Percentage', '8'],
    ['SDC003', 'Amit Sharma', 'Delhi', '0', 'Fixed Amount', '1500'],
  ]);

  /* ---- Parse uploaded CSV into a preview — nothing is written here ----
     The old behaviour applied every valid row the instant the file was
     parsed, with no chance to review what was about to be replaced. Parsing
     and committing are now two separate steps; this one only ever builds
     state to show the admin, never touches an employee record. */
  const parseCSV = (text, fileName) => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) { toast('File is empty or has no data rows', 'error'); return; }
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const empIdCol = header.findIndex((h) => h.includes('employee id') || h === 'empid');
    const empNameCol = header.findIndex((h) => h.includes('employee name'));
    const typeCol = header.findIndex((h) => h.includes('incentive type') || h === 'type');
    const valueCol = header.findIndex((h) => h.includes('incentive value') || h === 'value');
    // Optional so older files without a threshold column still import (they
    // simply get minSales = 0, i.e. "pays from the first rupee").
    const minCol = header.findIndex((h) => h.includes('minimum sales') || h.includes('min sales') || h.includes('sales from') || h === 'threshold');

    if (empIdCol < 0 || typeCol < 0 || valueCol < 0) {
      toast('Invalid CSV format — required columns: Employee ID, Incentive Type, Incentive Value', 'error');
      return;
    }

    let total = 0, success = 0;
    const errors = [];
    const byEmp = {}; // grouped by empId — each employee's rows replace their existing rules, on confirm

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      if (cols.every((c) => !c)) continue;
      total++;
      const empCode = cols[empIdCol];
      const typRaw = (cols[typeCol] || '').toLowerCase();
      const val = cols[valueCol];

      const emp = emps.find((e) => e.code === empCode);
      if (!emp) { errors.push({ row: i + 1, empId: empCode, empName: cols[empNameCol] || '', reason: 'Employee ID not found' }); continue; }

      const type = typRaw.includes('percent') || typRaw === 'pct' || typRaw === '%' ? 'pct'
                 : typRaw.includes('fixed') || typRaw.includes('flat') || typRaw === '₹' ? 'flat'
                 : null;
      if (!type) { errors.push({ row: i + 1, empId: empCode, empName: emp.name, reason: 'Invalid Incentive Type — use "Percentage" or "Fixed Amount"' }); continue; }

      const numVal = parseFloat(val);
      if (isNaN(numVal) || numVal < 0) { errors.push({ row: i + 1, empId: empCode, empName: emp.name, reason: 'Invalid Incentive Value — must be a positive number' }); continue; }

      let minSales = 0;
      if (minCol >= 0 && cols[minCol] !== undefined && cols[minCol] !== '') {
        minSales = parseFloat(String(cols[minCol]).replace(/[₹,\s]/g, ''));
        if (isNaN(minSales) || minSales < 0) { errors.push({ row: i + 1, empId: empCode, empName: emp.name, reason: 'Invalid Minimum Sales — must be 0 or a positive number' }); continue; }
      }

      if (!byEmp[emp.id]) byEmp[emp.id] = { emp, before: emp.incentives || [], incentives: [] };
      byEmp[emp.id].incentives.push({ id: 'inc_' + Math.random().toString(36).slice(2, 8), minSales, type, value: numVal });
      success++;
    }

    setPreview({ byEmp, errors, total, success, fileName });
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

  /* ---- Confirm the preview — this is the only place anything is written ---- */
  const confirmImport = () => {
    if (!preview) return;
    const lock = store.getPayrollLockInfo();
    if (lock.locked) { toast(`Locked: ${lock.month} payroll was ${lock.status} — incentive changes are frozen until it is reopened.`, 'error'); return; }
    const rows = Object.values(preview.byEmp);
    let success = 0, failed = 0;
    rows.forEach(({ emp, incentives }) => {
      const res = Store.updateEmployeeIncentives(emp.id, incentives, user);
      if (res && res.error) failed++; else success++;
    });
    Store.addIncentiveUpload({
      fileName: preview.fileName,
      uploadedBy: user.name,
      totalRecords: preview.total,
      successRecords: success,
      failedRecords: preview.errors.length + failed,
      status: (preview.errors.length + failed) === 0 ? 'Success' : success === 0 ? 'Failed' : 'Partial',
      errors: preview.errors,
    });
    toast(`Import applied — ${success} employee${success === 1 ? '' : 's'} updated, ${preview.errors.length} row${preview.errors.length === 1 ? '' : 's'} rejected`, preview.errors.length ? 'warn' : 'success');
    setPreview(null);
    setTab('history');
  };

  const TABS = [
    { id: 'employees', label: 'Employee rules', icon: 'users' },
    ...(canUpload ? [{ id: 'upload', label: 'Bulk upload', icon: 'file' }] : []),
    { id: 'history', label: 'Upload history', icon: 'history' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Tabs tabs={TABS} value={tab} onChange={setTab} variant="pill"/>
        <div className="text-[11.5px] text-slate-500">
          {emps.filter((e) => (e.incentives || []).length > 0).length} employees with custom rules ·{' '}
          {emps.reduce((n, e) => n + (e.incentives || []).length, 0)} rules total
        </div>
      </div>

      {/* ======================== TAB 1: Employee Incentives ======================== */}
      {tab === 'employees' && (
        <Card noBody>
          <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 flex-1 min-w-[220px] h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <Icon name="search" className="w-3.5 h-3.5 text-slate-400"/>
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search employee, code or location…" className="flex-1 bg-transparent text-[13px] outline-none dark:text-slate-100"/>
            </div>
            <SearchSelect value={locFilter} onChange={(v) => { setLocFilter(v); setPage(0); }} className="!w-[180px]"
              options={[{ value: 'all', label: 'All locations' }, ...locations.map((l) => ({ value: l, label: l }))]}
              searchPlaceholder="Search location…" emptyLabel="No location matches"/>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
              className="h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] text-slate-700 dark:text-slate-200 outline-none">
              <option value="all">All types</option>
              <option value="pct">Percentage (%)</option>
              <option value="flat">Fixed Amount (₹)</option>
              <option value="none">No incentive</option>
            </select>
            <Btn size="xs" onClick={() => downloadCSV('employee_incentives.csv', [
              ['Employee ID', 'Employee Name', 'Location', 'Minimum Sales', 'Incentive Type', 'Incentive Value'],
              ...allRows.filter((r) => r.incentive).map((r) => [r.emp.code, r.emp.name, r.site?.city || '—', +r.incentive.minSales || 0, fmtIncentiveType(r.incentive.type), r.incentive.value]),
            ])}><Icon name="download" className="w-3 h-3"/>Export</Btn>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full dense-table text-[13px]">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Location</th>
                <th>Applies From</th>
                <th>Incentive Type</th>
                <th>Incentive Value</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r, idx) => (
                <tr key={`${r.emp.id}_${r.incentive?.id || idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar emp={r.emp} size={28}/>
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{r.emp.name}</div>
                    </div>
                  </td>
                  <td className="font-mono text-[11px] text-slate-500">{r.emp.code}</td>
                  <td>
                    {r.site ? (
                      <div>
                        <div className="text-[12px] text-slate-700 dark:text-slate-200">{r.site.city}</div>
                        <div className="text-[10px] text-slate-400">{r.site.name}</div>
                      </div>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td>
                    {r.incentive ? (
                      +r.incentive.minSales > 0
                        ? <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{fmtINR(+r.incentive.minSales)}</span>
                        : <span className="text-[11px] text-slate-400">No minimum</span>
                    ) : '—'}
                  </td>
                  <td>
                    {r.incentive ? (
                      <Badge tone={r.incentive.type === 'pct' ? 'brand' : 'violet'}>
                        {r.incentive.type === 'pct' ? 'Percentage (%)' : 'Fixed Amount (₹)'}
                      </Badge>
                    ) : <span className="text-[11px] text-slate-400 italic">No incentive</span>}
                  </td>
                  <td className="font-semibold text-slate-800 dark:text-slate-100">
                    {r.incentive ? fmtIncentiveValue(r.incentive) : '—'}
                  </td>
                  <td>
                    <Btn size="xs" onClick={() => setEditEmp(r.emp)}>
                      <Icon name="edit" className="w-3 h-3"/>Edit
                    </Btn>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={7}><Empty title="No employees match filters"/></td></tr>}
            </tbody>
          </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 dark:border-slate-800 text-[12px]">
              <span className="text-slate-500">Showing {page * PER + 1}–{Math.min((page + 1) * PER, filtered.length)} of {filtered.length} rows</span>
              <div className="flex items-center gap-2">
                <Btn size="xs" disabled={page === 0} onClick={() => setPage(page - 1)}><Icon name="chevron-left" className="w-3 h-3"/>Prev</Btn>
                <span className="font-mono">{page + 1} / {pages}</span>
                <Btn size="xs" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next<Icon name="chevron-right" className="w-3 h-3"/></Btn>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ======================== TAB 2: Bulk Upload ======================== */}
      {tab === 'upload' && canUpload && preview && (
        <Card noBody title={`Review import — ${preview.fileName}`}
          subtitle={`${preview.success} valid row${preview.success === 1 ? '' : 's'} across ${Object.keys(preview.byEmp).length} employee${Object.keys(preview.byEmp).length === 1 ? '' : 's'} · ${preview.errors.length} rejected · nothing is saved until you confirm`}
          right={<div className="flex gap-2"><Btn size="sm" onClick={() => setPreview(null)}>Cancel</Btn><Btn size="sm" variant="primary" onClick={confirmImport}><Icon name="check" className="w-3.5 h-3.5"/>Confirm import</Btn></div>}>
          <div className="p-3 space-y-3">
            {store.getPayrollLockInfo().locked && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-[12px] text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <Icon name="lock" className="w-4 h-4 shrink-0"/>Locked: {store.getPayrollLockInfo().month} payroll is {store.getPayrollLockInfo().status} — confirming will be refused until it is reopened.
              </div>
            )}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Will be applied ({Object.keys(preview.byEmp).length} employees)</div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full dense-table text-[12px]">
                  <thead><tr><th>Employee</th><th>Before</th><th>After</th></tr></thead>
                  <tbody>
                    {Object.values(preview.byEmp).map(({ emp, before, incentives }) => (
                      <tr key={emp.id}>
                        <td><EmployeeIdentity emp={emp}/></td>
                        <td className="text-slate-500">{before.length} rule{before.length === 1 ? '' : 's'}</td>
                        <td className="font-semibold text-emerald-700 dark:text-emerald-400">{incentives.length} rule{incentives.length === 1 ? '' : 's'}</td>
                      </tr>
                    ))}
                    {Object.keys(preview.byEmp).length === 0 && <tr><td colSpan={3}><Empty title="No valid rows to apply"/></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            {preview.errors.length > 0 && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-rose-500 mb-1.5">Rejected ({preview.errors.length} rows)</div>
                <div className="rounded-lg border border-rose-200 dark:border-rose-900 overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full dense-table text-[12px]">
                    <thead><tr><th>Row</th><th>Employee ID</th><th>Reason</th></tr></thead>
                    <tbody>
                      {preview.errors.map((e, i) => (
                        <tr key={i}><td className="font-mono">{e.row}</td><td className="font-mono text-slate-500">{e.empId || '—'}</td><td className="text-rose-600 dark:text-rose-400">{e.reason}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
      {tab === 'upload' && canUpload && !preview && (
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-4">
            {/* Upload card */}
            <div className="col-span-12 lg:col-span-7">
              <Card title="Upload Incentive Data" subtitle="Upload a CSV file to bulk-assign employee incentives">
                <div className="space-y-4">
                  {/* Format info */}
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Required CSV Columns</div>
                    </div>
                    <div className="p-3">
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
                        {['Employee ID', 'Employee Name', 'Location', 'Minimum Sales', 'Incentive Type', 'Incentive Value'].map((col) => (
                          <div key={col} className="text-[11px] font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/20 rounded px-2 py-1 text-center">{col}</div>
                        ))}
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500 space-y-1">
                        <div>
                          <span className="font-semibold">Minimum Sales</span>: the monthly sales that must be crossed before this rule pays — use <span className="font-mono">0</span> for no minimum &nbsp;·&nbsp;
                          <span className="font-semibold">Incentive Type</span>: "Percentage" or "Fixed Amount" &nbsp;·&nbsp;
                          <span className="font-semibold">Incentive Value</span>: numeric (e.g. 10 for 10%)
                        </div>
                        <div>
                          The same employee can appear in multiple rows to define multiple incentives. Rules are
                          <span className="font-semibold"> independent</span> — e.g. "₹50,000 → 10%" and "₹40,000 → ₹2,000"
                          both pay once their thresholds are cleared.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Download sample */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <Icon name="file" className="w-5 h-5 text-emerald-600 shrink-0"/>
                    <div className="flex-1">
                      <div className="text-[12px] font-semibold text-emerald-900 dark:text-emerald-100">Download Sample Template</div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-300">Pre-filled with example data to guide your upload</div>
                    </div>
                    <Btn size="sm" onClick={downloadSample}><Icon name="download" className="w-3.5 h-3.5"/>Sample CSV</Btn>
                  </div>

                  {/* Drop zone */}
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
                        <div className="text-[11px] text-slate-400">Accepts .csv files only · Same employee can have multiple rows</div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Rules / notes */}
            <div className="col-span-12 lg:col-span-5 space-y-4">
              <Card title="Upload Rules" subtitle="How the bulk upload works">
                <div className="space-y-3 text-[12px] text-slate-600 dark:text-slate-300">
                  {[
                    ['file', 'CSV format only', 'Use the sample template to ensure correct column ordering.'],
                    ['users', 'Employee matching', 'Employees are matched by Employee ID (e.g. SDC001). Unrecognised IDs are skipped with an error.'],
                    ['trending-up', 'Multiple incentives', 'A single employee can appear in multiple rows — each row adds one incentive rule.'],
                    ['target', 'Independent thresholds', 'Every rule that clears its Minimum Sales pays out, and the amounts add up. Rules do not override one another.'],
                    ['eye', 'Preview first', 'Nothing is saved until you review the parsed rows and confirm — cancel any time before that.'],
                    ['refresh', 'Full replace', 'Confirming replaces all of that employee\'s existing incentive definitions, for employees present in the file only.'],
                    ['shield', 'Admin only', 'Incentive rules, slabs, targets and bulk uploads are Admin-only. HR sees a read-only calculation breakdown.'],
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
        </div>
      )}

      {/* ======================== TAB 3: Upload History ======================== */}
      {tab === 'history' && (
        <Card noBody title="Upload History" subtitle="All previous incentive bulk upload records">
          <div className="overflow-x-auto">
          <table className="w-full dense-table text-[13px]">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Uploaded By</th>
                <th>Date & Time</th>
                <th className="text-right">Total</th>
                <th className="text-right">Success</th>
                <th className="text-right">Failed</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td>
                    <div className="flex items-center gap-2">
                      <Icon name="file" className="w-3.5 h-3.5 text-slate-400 shrink-0"/>
                      <span className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[180px]" title={u.fileName}>{u.fileName}</span>
                    </div>
                  </td>
                  <td className="text-[12px] text-slate-600 dark:text-slate-300">{u.uploadedBy}</td>
                  <td className="text-[12px] text-slate-500 font-mono">{fmtDateTime(u.uploadedAt)}</td>
                  <td className="text-right font-mono font-semibold text-slate-700 dark:text-slate-200">{u.totalRecords}</td>
                  <td className="text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{u.successRecords}</td>
                  <td className="text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">{u.failedRecords}</td>
                  <td>
                    <Badge tone={u.status === 'Success' ? 'green' : u.status === 'Failed' ? 'red' : 'amber'}>
                      {u.status}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Btn size="xs" onClick={() => setViewError(u)}><Icon name="info" className="w-3 h-3"/>View</Btn>
                      {u.failedRecords > 0 && (
                        <Btn size="xs" variant="danger" onClick={() => setViewError(u)}><Icon name="download" className="w-3 h-3"/>Error Log</Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {uploads.length === 0 && <tr><td colSpan={8}><Empty title="No uploads yet" subtitle="Use the Bulk Upload tab to import employee incentive data"/></td></tr>}
            </tbody>
          </table>
          </div>
        </Card>
      )}

      {/* ======================== Advanced: Slab Templates (collapsible) ======================== */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
        >
          <div className="flex items-center gap-2">
            <Icon name="trending-up" className="w-4 h-4 text-slate-500"/>
            <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Advanced: Slab Template Library</span>
            <Badge tone="slate">{templates.length} templates</Badge>
          </div>
          <Icon name={showTemplates ? 'chevron-up' : 'chevron-down'} className="w-4 h-4 text-slate-400"/>
        </button>
        {showTemplates && (
          <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-slate-500">Tiered slab templates assigned per-store or per-region. Payroll resolves each employee's payout automatically.</div>
              <Btn size="xs" variant="primary" onClick={() => setEditTpl({ id: null, label: 'New slab', raw: '', kind: 'pct', tiers: [{ from: 50000, type: 'pct', value: 10 }] })}>
                <Icon name="plus" className="w-3 h-3"/>New template
              </Btn>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full dense-table text-[12px]">
                <thead><tr><th>Slab</th><th>Structure</th><th className="text-right">Stores</th><th></th></tr></thead>
                <tbody>
                  {templates.slice(0, 10).map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[200px]">{t.label || '—'}</div>
                        <div className="text-[10px] text-slate-400 truncate" title={t.raw}>{t.raw}</div>
                      </td>
                      <td>
                        {t.kind === 'none' ? <Badge tone="slate">No incentive</Badge> : <Badge tone={t.kind === 'flat' ? 'violet' : 'brand'}>{t.kind === 'flat' ? 'Flat ₹' : t.kind === 'pct' ? '% of sales' : 'Mixed'} · {(t.tiers || []).length} tier{(t.tiers||[]).length !== 1 ? 's' : ''}</Badge>}
                      </td>
                      <td className="text-right font-mono">{sites.filter((s) => s.slabId === t.id).length}</td>
                      <td>
                        <div className="flex gap-1 justify-end">
                          <Btn size="xs" onClick={() => setEditTpl(t)}><Icon name="edit" className="w-3 h-3"/></Btn>
                          <Btn size="xs" variant="danger" onClick={async () => {
                            const ok = await confirm({ title: 'Delete this slab template?', body: 'Stores using it fall back to the company default bands.', confirmLabel: 'Delete template', destructive: true });
                            if (!ok) return;
                            const res = Store.deleteSlabTemplate(t.id, user);
                            if (res && res.error) { toast(res.error, 'error'); return; }
                            toast('Template deleted', 'warn');
                          }}><Icon name="trash" className="w-3 h-3"/></Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {templates.length === 0 && <tr><td colSpan={4}><Empty title="No slab templates"/></td></tr>}
                </tbody>
              </table>
            </div>
            {templates.length > 10 && <div className="text-[11px] text-slate-400 text-center">Showing 10 of {templates.length} templates</div>}
          </div>
        )}
      </div>

      {/* Modals */}
      {editEmp && <EmpIncentiveEditModal emp={editEmp} onClose={() => setEditEmp(null)} user={user}/>}
      {editTpl && <SlabTemplateEditor tpl={editTpl} onClose={() => setEditTpl(null)} user={user}/>}
      {viewError && <UploadErrorModal upload={viewError} onClose={() => setViewError(null)}/>}
      {ConfirmUI}
    </div>
  );
}

Object.assign(window, {
  IncentiveConfigPanel, SlabTemplateEditor, UploadErrorModal, EmpIncentiveEditModal,
  fmtIncentiveThreshold, fmtIncentiveType, fmtIncentiveValue, tierText,
});
