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
                  <Select value={draft.siteId || ''} onChange={(e) => setD({ siteId: e.target.value })}>
                    <option value="">— Unassigned —</option>
                    {sites.map((s) => <option key={s.id} value={s.id}>{s.name}{s.city ? ` · ${s.city}` : ''}</option>)}
                  </Select>
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


function EmployeesPage({ user }) {
  const store = useStore();
  const [q, setQ] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [openWizard, setOpenWizard] = useState(false);
  const [page, setPage] = useState(0);
  const isSiteMgr = user.role === 'site-manager';
  const hierarchy = store.getHierarchy();

  let list = store.getEmployees();
  if (isSiteMgr) list = list.filter((e) => e.siteId === user.siteId);
  if (zoneFilter !== 'all') list = list.filter((e) => store.getSite(e.siteId)?.zone === zoneFilter);
  if (regionFilter !== 'all') list = list.filter((e) => store.getSite(e.siteId)?.region === regionFilter);
  if (statusFilter !== 'all') list = list.filter((e) => e.status === statusFilter);
  if (q) list = list.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()) || e.code.toLowerCase().includes(q.toLowerCase()));
  const PER = 25;
  const pages = Math.ceil(list.length / PER) || 1;
  const pageList = list.slice(page * PER, page * PER + PER);
  const regionsForZone = (hierarchy.regions || []).filter((r) => zoneFilter === 'all' || r.zone === zoneFilter);

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
            ['Code','Name','Phone','Email','Site','Status','Aadhaar','PAN','Base'],
            ...list.map((e) => [e.code, e.name, e.phone, e.email, store.getSite(e.siteId)?.name || '', e.status, e.aadhaarMasked, e.panMasked, e.baseSalary]),
          ])}><Icon name="download" className="w-3.5 h-3.5"/>Export CSV</Btn>
        </div>
      </div>

      <Card noBody>
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 flex-1 min-w-[220px] h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <Icon name="search" className="w-3.5 h-3.5 text-slate-400"/>
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search by name or code…" className="flex-1 bg-transparent text-[13px] outline-none dark:text-slate-100"/>
          </div>
          {!isSiteMgr && (
            <Select value={zoneFilter} onChange={(e) => { setZoneFilter(e.target.value); setRegionFilter('all'); setPage(0); }} className="!w-auto">
              <option value="all">All zones</option>
              {(hierarchy.zones || []).map((z) => <option key={z} value={z}>{z}</option>)}
            </Select>
          )}
          {!isSiteMgr && (
            <Select value={regionFilter} onChange={(e) => { setRegionFilter(e.target.value); setPage(0); }} className="!w-auto">
              <option value="all">All regions</option>
              {regionsForZone.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
            </Select>
          )}
          <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="!w-auto">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
        <table className="w-full dense-table text-[13px]">
          <thead>
            <tr>
              <th>Employee</th><th>Code</th><th>Site</th><th>Aadhaar</th><th>PAN</th><th>Bank</th><th>Status</th><th>Salary</th><th></th>
            </tr>
          </thead>
          <tbody>
            {pageList.map((e) => {
              const site = store.getSite(e.siteId);
              return (
                <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => setSelected(e)}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Avatar emp={e} size={30}/>
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{e.name}</div>
                        <div className="text-[11px] text-slate-500">{e.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-[12px] text-slate-600 dark:text-slate-300">{e.code}</td>
                  <td>{site ? <div><div className="text-[12px] text-slate-700 dark:text-slate-200">{site.city}</div><div className="text-[10px] text-slate-500">{site.type}</div></div> : '—'}</td>
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
            {list.length === 0 && <tr><td colSpan={9}><Empty title="No employees match filters"/></td></tr>}
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

Object.assign(window, { EmployeesPage, EmployeeDetailDrawer });
