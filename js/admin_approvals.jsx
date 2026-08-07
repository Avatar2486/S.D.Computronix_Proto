/* Onboarding approvals queue */

/* Reject with a reason — the applicant sees this verbatim on their phone and can
   correct and re-apply, so a free-text reason beats a bare confirm(). */
function RejectReasonModal({ emp, onClose, onConfirm }) {
  const PRESETS = [
    'Aadhaar image is blurred — please re-upload a clear photo',
    'PAN details do not match the name on Aadhaar',
    'Bank proof is unreadable — upload passbook first page or a cancelled cheque',
    'Profile photo does not meet passport-photo requirements',
  ];
  const [reason, setReason] = useState('');
  if (!emp) return null;
  return (
    <Modal open onClose={onClose} title={`Reject application — ${emp.name}`}
      footer={<><Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="danger" disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>
          <Icon name="x" className="w-3.5 h-3.5"/>Reject &amp; notify applicant
        </Btn></>}>
      <div className="space-y-3">
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <Icon name="info" className="w-4 h-4 text-amber-600 shrink-0 mt-px"/>
          <div className="text-[12px] text-amber-900 dark:text-amber-100">
            This reason is shown to {emp.name.split(' ')[0]} in the mobile app, along with a
            &ldquo;Correct &amp; re-apply&rdquo; button.
          </div>
        </div>
        <Field label="Reason for rejection">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
            placeholder="Explain what the applicant needs to fix…"/>
        </Field>
        <div>
          <div className="text-[11px] font-semibold text-slate-500 mb-1.5">Common reasons</div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button key={p} onClick={() => setReason(p)}
                className="text-[11px] px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition text-left">
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* Uploaded-document review strip, backed by the real emp.documents map. */
function ApplicantDocuments({ emp }) {
  const [preview, setPreview] = useState(null);
  const list = typeof MOBILE_DOC_LIST !== 'undefined' ? MOBILE_DOC_LIST : [];
  const docs = typeof getEmpDocs === 'function' ? getEmpDocs(emp) : (emp.documents || {});
  const uploaded = list.filter((d) => docs[d.k] && docs[d.k].status !== 'missing').length;
  const missingRequired = list.filter((d) => d.required && (!docs[d.k] || docs[d.k].status === 'missing'));

  return (
    <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Documents · {uploaded} of {list.length} submitted
        </div>
        {missingRequired.length > 0
          ? <Badge tone="red">{missingRequired.length} required missing</Badge>
          : <Badge tone="green">All required received</Badge>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-2.5">
        {list.map((d) => {
          const rec = docs[d.k] || { status: 'missing' };
          const has = rec.status !== 'missing';
          return (
            <button key={d.k} onClick={() => setPreview(d.k)}
              className={`p-2 rounded-md border text-left transition hover:border-brand-400 ${
                rec.status === 'verified' ? 'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-900/20 dark:border-emerald-800'
                : rec.status === 'uploaded' ? 'border-amber-200 bg-amber-50/60 dark:bg-amber-900/20 dark:border-amber-800'
                : d.required ? 'border-rose-200 bg-rose-50/50 dark:bg-rose-900/15 dark:border-rose-800'
                : 'border-slate-200 dark:border-slate-700'
              }`}>
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                <Icon name={has ? 'file' : 'alert'} className="w-3 h-3 shrink-0"/>
                <span className="truncate">{d.label}</span>
              </div>
              <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 mt-0.5 truncate">
                {rec.status === 'verified' ? 'Verified ✓' : rec.status === 'uploaded' ? (rec.fileName || 'Uploaded') : d.required ? 'Missing' : 'Not provided'}
              </div>
              {rec.size ? <div className="text-[9px] text-slate-400 font-mono">{typeof fmtFileSize === 'function' ? fmtFileSize(rec.size) : ''}</div> : null}
            </button>
          );
        })}
      </div>
      {preview && <SampleDocModal docKey={preview} onClose={() => setPreview(null)}/>}
    </div>
  );
}

function ApprovalsPage({ user }) {
  const store = useStore();
  const [openWizard, setOpenWizard] = useState(false);
  const [offerFor, setOfferFor] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const toast = useToast();
  const pending = store.state.employees.filter((e) => e.status === 'pending');
  const recent = store.state.employees.filter((e) => e.role === 'field-employee' && ['active','rejected'].includes(e.status)).slice(-6).reverse();

  const approve = (emp) => {
    Store.approveEmployee(emp.id);
    toast(`${emp.name} approved — offer letter generated`, 'success');
    setOfferFor({ ...emp, status: 'active' });
  };
  const doReject = (reason) => {
    const emp = rejecting;
    Store.rejectEmployee(emp.id, reason);
    toast(`${emp.name} rejected — applicant notified`, 'warn');
    setRejecting(null);
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
                  {emp.onboardingSource === 'self-mobile' && (
                    <Badge tone="violet"><Icon name="phone" className="w-3 h-3"/>Self-onboarded via mobile</Badge>
                  )}
                  <span className="text-[11px] text-slate-500 font-mono">{emp.code}</span>
                </div>
                <div className="text-[12px] text-slate-500 mt-0.5">{emp.email} · {emp.phone} · Applied {fmtDateTime(emp.submittedAt)}</div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                  <div className="p-2 rounded border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/20 dark:border-emerald-800">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-bold"><Icon name="check-circle" className="w-3 h-3"/>Aadhaar eKYC</div>
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 mt-0.5 font-mono">{emp.aadhaarMasked}</div>
                  </div>
                  <div className="p-2 rounded border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/20 dark:border-emerald-800">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-bold"><Icon name="check-circle" className="w-3 h-3"/>PAN</div>
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 mt-0.5 font-mono">{emp.panMasked}</div>
                  </div>
                  <div className="p-2 rounded border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/20 dark:border-emerald-800">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-bold"><Icon name="check-circle" className="w-3 h-3"/>Bank</div>
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 mt-0.5 font-mono">
                      {emp.bankAccountMasked ? emp.bankAccountMasked : 'Penny-drop ✓'}
                    </div>
                    {emp.bankName && <div className="text-[9px] text-slate-500 truncate">{emp.bankName} · {emp.ifsc}</div>}
                  </div>
                  <div className="p-2 rounded border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-500 font-bold"><Icon name="user" className="w-3 h-3"/>Personal</div>
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
                      {[emp.gender, emp.dob ? fmtDate(emp.dob, { year: true }) : null].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                </div>

                {/* Details captured by the self-onboarding flow */}
                {(emp.permanentAddress || emp.emergencyContact) && (
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {emp.permanentAddress && (
                      <div className="p-2 rounded border border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Address (from Aadhaar)</div>
                        <div className="text-[11px] text-slate-700 dark:text-slate-200 mt-0.5 leading-relaxed">{emp.permanentAddress}</div>
                        {emp.currentAddress && emp.currentAddress !== emp.permanentAddress && (
                          <div className="text-[10px] text-slate-500 mt-1"><span className="font-semibold">Current:</span> {emp.currentAddress}</div>
                        )}
                      </div>
                    )}
                    {emp.emergencyContact && (
                      <div className="p-2 rounded border border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Emergency contact</div>
                        <div className="text-[11px] text-slate-700 dark:text-slate-200 mt-0.5">
                          {emp.emergencyContact.name} · <span className="font-mono">{emp.emergencyContact.phone}</span>
                        </div>
                        {(emp.maritalStatus || emp.bloodGroup) && (
                          <div className="text-[10px] text-slate-500 mt-1">
                            {[emp.maritalStatus, emp.bloodGroup ? 'Blood group ' + emp.bloodGroup : null].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <ApplicantDocuments emp={emp}/>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <div className="text-[11px] text-slate-500">Assign to site:</div>
                  <Select className="!w-auto" defaultValue={emp.siteId} onChange={(e) => Store.updateEmployee(emp.id, { siteId: e.target.value })}>
                    {store.getSites().map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                  <div className="ml-auto flex gap-2">
                    <Btn variant="danger" size="sm" onClick={() => setRejecting(emp)}><Icon name="x" className="w-3.5 h-3.5"/>Reject</Btn>
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
                  <td>
                    {emp.status === 'active'
                      ? <Badge tone="green">Approved</Badge>
                      : <div><Badge tone="red">Rejected</Badge>
                          {emp.rejectionReason && <div className="text-[10px] text-slate-500 mt-0.5 max-w-[260px] truncate" title={emp.rejectionReason}>{emp.rejectionReason}</div>}
                        </div>}
                  </td>
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
      {rejecting && <RejectReasonModal emp={rejecting} onClose={() => setRejecting(null)} onConfirm={doReject}/>}
    </div>
  );
}

Object.assign(window, { ApprovalsPage, RejectReasonModal, ApplicantDocuments });
