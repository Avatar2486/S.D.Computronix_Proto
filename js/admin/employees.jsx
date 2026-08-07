/* Employees list + detail drawer */
function EmployeeDetailDrawer({ emp, onClose }) {
  const store = useStore();
  if (!emp) return null;
  const site = store.getSite(emp.siteId);
  const july = '2026-07';
  const payslip = store.computePayslip(emp.id, july);
  const sales = store.getSales(emp.id, july);
  const inc = store.calcIncentive(sales?.totalSales || 0);
  const recentAtt = store.getAttendance({ employeeId: emp.id }).slice(-8).reverse();

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
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><Icon name="x"/></button>
        </div>

        <div className="p-5 space-y-4">
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

          <div className="flex gap-2">
            <Btn variant="danger" size="sm" onClick={() => { Store.updateEmployee(emp.id, { status: emp.status === 'active' ? 'inactive' : 'active' }); onClose(); }}>
              {emp.status === 'active' ? 'Deactivate' : 'Activate'}
            </Btn>
            <Btn size="sm"><Icon name="edit" className="w-3.5 h-3.5"/>Edit</Btn>
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
  const [siteFilter, setSiteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [openWizard, setOpenWizard] = useState(false);
  const isSiteMgr = user.role === 'site-manager';

  let list = store.getEmployees();
  if (isSiteMgr) list = list.filter((e) => e.siteId === user.siteId);
  if (siteFilter !== 'all') list = list.filter((e) => e.siteId === siteFilter);
  if (statusFilter !== 'all') list = list.filter((e) => e.status === statusFilter);
  if (q) list = list.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()) || e.code.toLowerCase().includes(q.toLowerCase()));

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
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or code…" className="flex-1 bg-transparent text-[13px] outline-none dark:text-slate-100"/>
          </div>
          {!isSiteMgr && (
            <Select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="!w-auto">
              <option value="all">All sites</option>
              {store.getSites().map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          )}
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="!w-auto">
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
            {list.map((e) => {
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
      </Card>

      {selected && <EmployeeDetailDrawer emp={selected} onClose={() => setSelected(null)}/>}
      <OnboardingWizard open={openWizard} onClose={() => setOpenWizard(false)}/>
    </div>
  );
}

Object.assign(window, { EmployeesPage, EmployeeDetailDrawer });
