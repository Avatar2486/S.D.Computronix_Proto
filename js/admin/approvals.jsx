/* Onboarding approvals queue */
function ApprovalsPage({ user }) {
  const store = useStore();
  const [openWizard, setOpenWizard] = useState(false);
  const [offerFor, setOfferFor] = useState(null);
  const toast = useToast();
  const pending = store.state.employees.filter((e) => e.status === 'pending');
  const recent = store.state.employees.filter((e) => e.role === 'field-employee' && ['active','rejected'].includes(e.status)).slice(-6).reverse();

  const approve = (emp) => {
    Store.approveEmployee(emp.id);
    toast(`${emp.name} approved — offer letter generated`, 'success');
    setOfferFor({ ...emp, status: 'active' });
  };
  const reject = (emp) => {
    if (!confirm(`Reject application from ${emp.name}?`)) return;
    Store.rejectEmployee(emp.id);
    toast(`${emp.name} rejected`, 'warn');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Compliance</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">Onboarding & KYC Approvals</div>
          <div className="text-[12px] text-slate-500 mt-0.5">Review digital KYC results and approve new field employees.</div>
        </div>
        <Btn variant="primary" onClick={() => setOpenWizard(true)}><Icon name="plus" className="w-3.5 h-3.5"/>Register new</Btn>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Awaiting review" value={pending.length} icon="shield" tone="amber"/>
        <StatCard label="Approved this month" value={recent.filter(e => e.status === 'active').length} icon="check-circle" tone="green"/>
        <StatCard label="Rejected" value={recent.filter(e => e.status === 'rejected').length} icon="x" tone="red"/>
      </div>

      <Card title={`Pending applications (${pending.length})`} bodyClass="p-0">
        {pending.length === 0 && <Empty icon="check-circle" title="Queue is clear" hint="No applicants waiting for review."/>}
        {pending.map((emp) => (
          <div key={emp.id} className="p-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
            <div className="flex items-start gap-4">
              <Avatar emp={emp} size={44}/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-semibold text-slate-800 dark:text-slate-100">{emp.name}</div>
                  <Badge tone="amber">Pending review</Badge>
                  <span className="text-[11px] text-slate-500 font-mono">{emp.code}</span>
                </div>
                <div className="text-[12px] text-slate-500 mt-0.5">{emp.email} · {emp.phone} · Applied {fmtDateTime(emp.submittedAt)}</div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                  <div className="p-2 rounded border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/20 dark:border-emerald-800">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-bold"><Icon name="check-circle" className="w-3 h-3"/>Aadhaar</div>
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 mt-0.5 font-mono">{emp.aadhaarMasked}</div>
                  </div>
                  <div className="p-2 rounded border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/20 dark:border-emerald-800">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-bold"><Icon name="check-circle" className="w-3 h-3"/>PAN</div>
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 mt-0.5 font-mono">{emp.panMasked}</div>
                  </div>
                  <div className="p-2 rounded border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/20 dark:border-emerald-800">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-bold"><Icon name="check-circle" className="w-3 h-3"/>Bank</div>
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 mt-0.5">Penny-drop ✓</div>
                  </div>
                  <div className="p-2 rounded border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/20 dark:border-emerald-800">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-bold"><Icon name="check-circle" className="w-3 h-3"/>Documents</div>
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 mt-0.5">4 files</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <div className="text-[11px] text-slate-500">Assign to site:</div>
                  <Select className="!w-auto" defaultValue={emp.siteId} onChange={(e) => Store.updateEmployee(emp.id, { siteId: e.target.value })}>
                    {store.getSites().map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                  <div className="ml-auto flex gap-2">
                    <Btn variant="danger" size="sm" onClick={() => reject(emp)}><Icon name="x" className="w-3.5 h-3.5"/>Reject</Btn>
                    <Btn variant="success" size="sm" onClick={() => approve(emp)}><Icon name="check" className="w-3.5 h-3.5"/>Approve & generate offer</Btn>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </Card>

      {recent.length > 0 && (
        <Card title="Recently processed" bodyClass="p-0">
          <table className="w-full dense-table">
            <thead><tr><th>Employee</th><th>Site</th><th>Decision</th><th>Actions</th></tr></thead>
            <tbody>
              {recent.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <div className="flex items-center gap-2"><Avatar emp={emp} size={24}/><div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">{emp.name}</div></div>
                  </td>
                  <td className="text-[12px] text-slate-600 dark:text-slate-300">{store.getSite(emp.siteId)?.name || '—'}</td>
                  <td>{emp.status === 'active' ? <Badge tone="green">Approved</Badge> : <Badge tone="red">Rejected</Badge>}</td>
                  <td>
                    {emp.status === 'active' && <Btn size="xs" onClick={() => setOfferFor(emp)}><Icon name="file" className="w-3 h-3"/>View offer letter</Btn>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <OnboardingWizard open={openWizard} onClose={() => setOpenWizard(false)}/>
      <OfferLetterModal emp={offerFor} open={!!offerFor} onClose={() => setOfferFor(null)}/>
    </div>
  );
}

Object.assign(window, { ApprovalsPage });
