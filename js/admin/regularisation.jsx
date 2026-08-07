/* Regularisation queue */
function RegularisationPage({ user }) {
  const store = useStore();
  const toast = useToast();
  const [tab, setTab] = useState('pending');
  const [detail, setDetail] = useState(null);
  const isSiteMgr = user.role === 'site-manager';

  let list = store.getRegularisations();
  if (isSiteMgr) list = list.filter((r) => store.getEmployee(r.employeeId)?.siteId === user.siteId);
  if (tab !== 'all') list = list.filter((r) => r.status === tab);

  const decide = (r, decision) => {
    Store.decideRegularisation(r.id, decision, user.id);
    toast(`Regularisation ${decision}`, decision === 'approved' ? 'success' : 'warn');
    setDetail(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Attendance corrections</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">Regularisation requests</div>
          <div className="text-[12px] text-slate-500 mt-0.5">Approve missed/incorrect attendance marks. Approvals recompute the affected payslip automatically.</div>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
        {['pending', 'approved', 'rejected', 'all'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2 text-[12px] font-semibold border-b-2 -mb-px capitalize ${tab === t ? 'text-brand-700 border-brand-700 dark:text-brand-300 dark:border-brand-400' : 'text-slate-500 border-transparent hover:text-slate-700'}`}>
            {t} {t !== 'all' && `(${store.getRegularisations({ status: t }).length})`}
          </button>
        ))}
      </div>

      <Card noBody>
        <table className="w-full dense-table">
          <thead><tr><th>Employee</th><th>Date</th><th>Reason</th><th>Submitted</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {list.map((r) => {
              const emp = store.getEmployee(r.employeeId);
              return (
                <tr key={r.id}>
                  <td>
                    <div className="flex items-center gap-2"><Avatar emp={emp} size={26}/><div><div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">{emp?.name}</div><div className="text-[10px] text-slate-500">{store.getSite(emp?.siteId)?.city}</div></div></div>
                  </td>
                  <td className="text-[12px] font-mono">{fmtDate(r.date, { year: true })}</td>
                  <td className="text-[12px] max-w-xs truncate">{r.reason}</td>
                  <td className="text-[11px] text-slate-500">{fmtDateTime(r.auditTrail?.[0]?.at)}</td>
                  <td>
                    {r.status === 'pending' && <Badge tone="amber">Pending</Badge>}
                    {r.status === 'approved' && <Badge tone="green">Approved</Badge>}
                    {r.status === 'rejected' && <Badge tone="red">Rejected</Badge>}
                  </td>
                  <td>
                    <div className="flex gap-1.5">
                      <Btn size="xs" onClick={() => setDetail(r)}>View</Btn>
                      {r.status === 'pending' && !isSiteMgr && (
                        <>
                          <Btn size="xs" variant="success" onClick={() => decide(r, 'approved')}>Approve</Btn>
                          <Btn size="xs" variant="danger" onClick={() => decide(r, 'rejected')}>Reject</Btn>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && <tr><td colSpan={6}><Empty icon="check-circle" title="Nothing here" hint="No requests match this filter."/></td></tr>}
          </tbody>
        </table>
      </Card>

      {detail && (() => {
        const emp = store.getEmployee(detail.employeeId);
        return (
          <Modal open onClose={() => setDetail(null)} title="Regularisation request"
            footer={detail.status === 'pending' && !isSiteMgr ? (
              <>
                <Btn variant="danger" onClick={() => decide(detail, 'rejected')}>Reject</Btn>
                <Btn variant="success" onClick={() => decide(detail, 'approved')}>Approve</Btn>
              </>
            ) : <Btn onClick={() => setDetail(null)}>Close</Btn>}>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <Avatar emp={emp} size={40}/>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{emp?.name}</div>
                  <div className="text-[11px] text-slate-500">For date: {fmtDate(detail.date, { year: true })} · {store.getSite(emp?.siteId)?.name}</div>
                </div>
              </div>
              <Field label="Reason">
                <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{detail.reason}</div>
              </Field>
              <Field label="Details">
                <div className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">{detail.details}</div>
              </Field>
              <Field label="Audit trail">
                <div className="space-y-1.5 text-[12px]">
                  {detail.auditTrail.map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-600"/>
                      <div className="text-slate-600 dark:text-slate-300">{fmtDateTime(a.at)} — <span className="capitalize font-semibold">{a.action}</span> by <span className="font-mono text-[11px]">{a.by}</span></div>
                    </div>
                  ))}
                </div>
              </Field>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

Object.assign(window, { RegularisationPage });
