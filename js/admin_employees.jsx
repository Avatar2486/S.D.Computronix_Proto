/* ============================================================================
   Employees — the single home for the whole employee lifecycle.

     New Employee → Registration → Documents → Approval → Onboarding → Active

   Three tabs slice the same directory rather than duplicating it:
     Existing   — everyone already active
     New        — recent joiners and records still moving through the lifecycle
     Onboarding — the approval queue plus the HR document library

   The old separate "Onboarding ▸ Register new" screen is gone; Add Employee here
   is the only way in, so there is one form and one approval rule.
   ========================================================================== */

/* ---- Lifecycle rail ----
   Shows where a record actually is. Compact variant fits in a table cell. */
function LifecycleRail({ emp, compact }) {
  const lc = Store.getLifecycle(emp);
  if (compact) {
    return (
      <div className="flex items-center gap-1" title={`Stage: ${lc.label}`}>
        {lc.stages.map((s, i) => (
          <span key={s.id}
            className={`h-1.5 rounded-full transition-all ${i === lc.index ? 'w-4 bg-brand-600' : i < lc.index ? 'w-1.5 bg-brand-300' : 'w-1.5 bg-slate-200 dark:bg-slate-700'}`}/>
        ))}
        <span className="text-[10px] font-semibold text-slate-500 ml-1 whitespace-nowrap">{lc.label}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {lc.stages.map((s, i) => {
        const done = i < lc.index, active = i === lc.index;
        const rejected = emp.approvalStatus === 'rejected' && s.id === 'approval';
        return (
          <React.Fragment key={s.id}>
            <div className={`flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-md text-[11px] font-semibold ${
              rejected ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-300'
              : active ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-200'
              : done ? 'text-brand-700 dark:text-brand-300' : 'text-slate-400'}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0 ${
                rejected ? 'bg-rose-600 text-white'
                : done ? 'bg-brand-700 text-white'
                : active ? 'bg-brand-200 text-brand-900 dark:bg-brand-700 dark:text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                {rejected ? '!' : done ? '✓' : i + 1}
              </span>
              {s.label}
            </div>
            {i < lc.stages.length - 1 && <div className={`w-4 h-px shrink-0 ${done ? 'bg-brand-400' : 'bg-slate-200 dark:bg-slate-700'}`}/>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ---- Designation editor ----
   Promotion walks the person's own ladder; any designation can still be chosen
   for a lateral move. Every change is recorded with a reason. */
function DesignationModal({ emp, user, onClose }) {
  const toast = useToast();
  const ladder = Store.DESIGNATION_LADDERS[emp.employeeType] || Store.DESIGNATION_LADDERS.field;
  const currentIndex = ladder.indexOf(emp.designation);
  const nextUp = currentIndex >= 0 && currentIndex < ladder.length - 1 ? ladder[currentIndex + 1] : null;
  const [designation, setDesignation] = useState(nextUp || emp.designation || ladder[0]);
  const [note, setNote] = useState('');
  const history = (emp.designationHistory || []).slice().reverse();

  const save = () => {
    if (designation === emp.designation) { toast('Pick a different designation to record a change', 'warn'); return; }
    Store.updateDesignation(emp.id, designation, user.id, note.trim());
    toast(`${emp.name}: ${emp.designation} → ${designation}`, 'success');
    onClose();
  };

  return (
    <Modal open onClose={onClose} size="lg" icon="arrow-up"
      title="Edit / upgrade designation" subtitle={`${emp.name} · currently ${emp.designation}`}
      footer={<><Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={designation === emp.designation}>
          <Icon name="check" className="w-3.5 h-3.5"/>Apply change
        </Btn></>}>
      <div className="space-y-4">
        {/* Ladder */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-1.5">
            {emp.employeeType === 'office' ? 'Office' : 'Field'} career ladder
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {ladder.map((d, i) => {
              const isCurrent = d === emp.designation;
              const isTarget = d === designation;
              return (
                <React.Fragment key={d}>
                  <button type="button" onClick={() => setDesignation(d)}
                    className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold border-2 transition ${
                      isTarget ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-200'
                      : isCurrent ? 'border-slate-400 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                      : 'border-transparent bg-slate-50 text-slate-500 dark:bg-slate-800/50 hover:border-slate-300'}`}>
                    {d}
                    {isCurrent && <span className="block text-[9px] font-normal opacity-70">current</span>}
                    {isTarget && !isCurrent && <span className="block text-[9px] font-normal opacity-70">new</span>}
                  </button>
                  {i < ladder.length - 1 && <Icon name="chevron-right" className="w-3 h-3 text-slate-300 shrink-0"/>}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Field label="New designation" hint="Pick from the ladder above or type a lateral move.">
            <SearchSelect value={designation} onChange={setDesignation} allowCustom
              options={Store.ALL_DESIGNATIONS.map((d) => ({ value: d, label: d, sub: ladder.includes(d) ? 'On this ladder' : 'Other' }))}
              searchPlaceholder="Search designation…" emptyLabel="Type to add a new one"/>
          </Field>
          <Field label="Reason / note"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Annual review, promotion, transfer…"/></Field>
        </div>

        {designation !== emp.designation && (
          <div className="p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 flex items-center gap-2 text-[12.5px]">
            <Icon name="arrow-right" className="w-4 h-4 text-brand-700 shrink-0"/>
            <span className="text-brand-900 dark:text-brand-100">
              <span className="font-semibold">{emp.designation}</span> will become <span className="font-semibold">{designation}</span>, effective today.
            </span>
          </div>
        )}

        {/* History */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Icon name="history" className="w-3.5 h-3.5"/>Designation history
          </div>
          {history.length === 0 ? (
            <div className="text-[11px] text-slate-400 italic px-1">No recorded changes yet — this will be the first.</div>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
              {history.map((h, i) => (
                <div key={i} className="px-3 py-2 flex items-center gap-2.5 text-[12px]">
                  <Icon name="arrow-up" className="w-3.5 h-3.5 text-brand-600 shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-800 dark:text-slate-100">
                      {h.from ? <><span className="text-slate-500">{h.from}</span> → </> : null}
                      <span className="font-semibold">{h.to}</span>
                    </div>
                    {h.note && <div className="text-[10.5px] text-slate-500 truncate">{h.note}</div>}
                  </div>
                  <div className="text-[10.5px] text-slate-400 font-mono shrink-0">{fmtDate(h.at, { year: true })}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ---- Employee detail ----
   Centered modal, not a side drawer: the record is the focus of the screen, it
   is scrollable, and it uses the same overlay behaviour as every other dialog. */
function EmployeeDetailModal({ emp: empProp, user, onClose }) {
  const store = useStore();
  const toast = useToast();
  const [tab, setTab] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [emailOk, setEmailOk] = useState(true);
  const [designationOpen, setDesignationOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);

  if (!empProp) return null;
  /* Always read the live record so edits, incentive changes and toggles are
     reflected without reopening the modal. */
  const emp = store.getEmployee(empProp.id) || empProp;
  const site = store.getSite(emp.siteId);
  const month = '2026-07';
  const payslip = store.computePayslip(emp.id, month);
  const sales = store.getSales(emp.id, month);
  const inc = store.calcIncentive(sales?.totalSales || 0, emp, month);
  const slabInfo = store.resolveSlab(emp);
  const recentAtt = store.getAttendance({ employeeId: emp.id }).slice(-8).reverse();
  const lc = store.getLifecycle(emp);
  const isOffice = emp.employeeType === 'office';
  const docs = getEmpDocs(emp);

  const canEdit = can(user, 'employee.edit');
  const canApprove = isSuperAdmin(user);
  /* Pay is a separate axis from the rest of the record: HR sees it because
     they run payroll, only an Admin sets it, and a Team Lead sees none of it. */
  const canSeePay = can(user, 'salary.view');
  const canSetPay = can(user, 'salary.edit');

  const sites = store.getSites();
  const siteOptions = useMemo(() => [
    { value: '', label: '— Unassigned —' },
    ...sites.map((s) => ({ value: s.id, label: s.name, sub: [s.city, s.region, s.code].filter(Boolean).join(' · '), keywords: s.code })),
  ], [store.state]);

  const startEdit = () => {
    setDraft({
      name: emp.name || '', code: emp.code || '', phone: emp.phone || '', email: emp.email || '',
      employeeType: emp.employeeType || 'field', status: emp.status || 'active', siteId: emp.siteId || '',
      joiningDate: emp.joiningDate || '', baseSalary: emp.baseSalary || 0,
      aadhaarMasked: emp.aadhaarMasked || '', panMasked: emp.panMasked || '',
      bankVerified: !!emp.bankVerified, photoUrl: emp.photoUrl || null,
      address: { ...Store.BLANK_ADDRESS, ...(emp.address || {}) },
      education: emp.education || [],
    });
    setEmailOk(true);
    setEditing(true);
  };
  const setD = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const saveEdit = () => {
    if (!draft.name.trim()) { toast('Employee name is required', 'error'); return; }
    if (!draft.code.trim()) { toast('Employee ID is required', 'error'); return; }
    const clash = store.getEmployees().find((x) => x.id !== emp.id && (x.code || '').toLowerCase() === draft.code.trim().toLowerCase());
    if (clash) { toast(`Employee ID ${draft.code} already belongs to ${clash.name}`, 'error'); return; }
    // The email went through the same validation API used at onboarding.
    if (!emailOk) { toast('Fix the email address before saving', 'error'); return; }
    /* Pay is written through setSalary, never as part of the general patch, so
       a revision always lands in the salary history rather than silently
       replacing the figure payroll ran on. */
    const nextSalary = Math.round(+draft.baseSalary || 0);
    const { baseSalary, ...rest } = draft;
    Store.updateEmployee(emp.id, {
      ...rest,
      name: draft.name.trim(), code: draft.code.trim(),
      email: draft.email.trim(),
      siteId: draft.siteId || null,
      currentAddress: formatAddress(draft.address),
    });
    if (canSetPay && nextSalary !== (emp.baseSalary || 0)) {
      Store.setSalary(emp.id, nextSalary, user.id, 'Edited from the employee record');
    }
    toast('Employee details updated', 'success');
    setEditing(false);
  };

  const approve = () => {
    Store.approveEmployee(emp.id, emp.siteId);
    toast(`${emp.name} approved — offer letter ready`, 'success');
    setOfferOpen(true);
  };

  const TABS = [
    { id: 'profile',   label: 'Profile',    icon: 'user' },
    { id: 'education', label: 'Education',  icon: 'graduation', badge: (emp.education || []).length },
    { id: 'documents', label: 'Documents',  icon: 'file' },
    { id: 'work',      label: canSeePay ? 'Attendance & pay' : 'Attendance', icon: 'wallet' },
    { id: 'settings',  label: 'Settings',   icon: 'settings' },
  ];

  const infoTile = (k, v, i) => (
    <div key={k} className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2.5 min-w-0">
      <Icon name={i} className="w-3.5 h-3.5 text-slate-400 shrink-0"/>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{k}</div>
        <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate" title={String(v)}>{v}</div>
      </div>
    </div>
  );

  return (
    <>
      <Modal open onClose={onClose} size="full" bodyClass="p-0"
        title={emp.name} subtitle={`${emp.code} · ${emp.designation}${site ? ' · ' + site.name : ''}`}
        footer={
          <>
            {canApprove && emp.approvalStatus === 'pending-approval' && (
              <Btn variant="success" onClick={approve}><Icon name="check-circle" className="w-3.5 h-3.5"/>Approve employee</Btn>
            )}
            {emp.status === 'active' && (
              <Btn onClick={() => setOfferOpen(true)}><Icon name="file" className="w-3.5 h-3.5"/>Offer letter</Btn>
            )}
            {canEdit && (
              <Btn variant="danger" onClick={() => {
                Store.updateEmployee(emp.id, { status: emp.status === 'active' ? 'inactive' : 'active' });
                toast(emp.status === 'active' ? `${emp.name} deactivated` : `${emp.name} reactivated`, 'warn');
              }}>{emp.status === 'active' ? 'Deactivate' : 'Activate'}</Btn>
            )}
            <Btn variant="primary" onClick={onClose}>Close</Btn>
          </>
        }>

        {/* Identity header */}
        <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-start gap-4 flex-wrap">
            {emp.photoUrl
              ? <img src={emp.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover shrink-0"/>
              : <Avatar emp={emp} size={56}/>}
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold text-slate-900 dark:text-white truncate">{emp.name}</div>
              <div className="text-[12px] text-slate-500 truncate">{emp.designation} · {emp.code}</div>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                <StatusBadge status={emp.status}/>
                {emp.approvalStatus === 'pending-approval' && <StatusBadge status="pending-approval"/>}
                <Badge tone={isOffice ? 'violet' : 'brand'}>
                  <Icon name={isOffice ? 'briefcase' : 'pin'} className="w-3 h-3"/>{isOffice ? 'Office' : 'Field'}
                </Badge>
                {emp.isStoreManager && <Badge tone="violet">Store Manager</Badge>}
                <Badge tone={emp.geoFenceEnabled ? 'green' : 'slate'}>
                  <Icon name="pin" className="w-3 h-3"/>Geo-fence {emp.geoFenceEnabled ? 'on' : 'off'}
                </Badge>
              </div>
            </div>
            {canEdit && !editing && (
              <div className="flex items-center gap-1.5">
                <Btn size="sm" onClick={() => setDesignationOpen(true)}><Icon name="arrow-up" className="w-3 h-3"/>Designation</Btn>
                <Btn size="sm" variant="primary" onClick={startEdit}><Icon name="edit" className="w-3 h-3"/>Edit</Btn>
              </div>
            )}
          </div>
          <div className="mt-3"><LifecycleRail emp={emp}/></div>
          {emp.approvalStatus === 'rejected' && emp.rejectionReason && (
            <div className="mt-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-[12px] text-rose-800 dark:text-rose-200 flex items-start gap-2">
              <Icon name="alert" className="w-4 h-4 shrink-0 mt-px"/>
              <span><span className="font-semibold">Rejected:</span> {emp.rejectionReason}</span>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-5 pt-2 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <Tabs tabs={TABS} value={tab} onChange={setTab}/>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* ---------------- Profile ---------------- */}
          {tab === 'profile' && (editing ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
                <PhotoUpload value={draft.photoUrl} name={draft.name} onChange={(v) => setD({ photoUrl: v })}/>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                <Field label="Full name"><Input value={draft.name} onChange={(e) => setD({ name: e.target.value })}/></Field>
                <Field label="Employee ID"><Input value={draft.code} onChange={(e) => setD({ code: e.target.value })} placeholder="SDC001"/></Field>
                <Field label="Phone"><Input value={draft.phone} onChange={(e) => setD({ phone: e.target.value })} placeholder="+91 98xxx xxxxx"/></Field>
                {/* Changing an existing employee's email re-runs the same check as onboarding. */}
                <EmailField value={draft.email} onChange={(v) => setD({ email: v })} excludeEmpId={emp.id} onValidity={setEmailOk}/>
                <Field label="Employee type">
                  <Select value={draft.employeeType} onChange={(e) => setD({ employeeType: e.target.value })}>
                    {Store.EMPLOYEE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={draft.status} onChange={(e) => setD({ status: e.target.value })}>
                    <option value="active">Active</option><option value="pending">Pending</option>
                    <option value="inactive">Inactive</option><option value="rejected">Rejected</option>
                  </Select>
                </Field>
                <Field label="Assigned store" className="sm:col-span-2">
                  <SearchSelect value={draft.siteId || ''} onChange={(v) => setD({ siteId: v })}
                    options={siteOptions} placeholder="— Unassigned —" searchPlaceholder="Search store, code or city…" emptyLabel="No store matches"/>
                </Field>
                <Field label="Joining date"><Input type="date" value={draft.joiningDate || ''} onChange={(e) => setD({ joiningDate: e.target.value })}/></Field>
                {canSeePay && (
                  <Field label="Base salary (₹ / month)"
                    hint={canSetPay ? 'Changes are recorded in the salary history' : 'Read-only — only an Admin can revise pay'}>
                    <Input type="number" min="0" step="500" value={draft.baseSalary} disabled={!canSetPay}
                      onChange={(e) => setD({ baseSalary: e.target.value })}/>
                  </Field>
                )}
                <Field label="Aadhaar (masked)"><Input value={draft.aadhaarMasked} onChange={(e) => setD({ aadhaarMasked: e.target.value })} placeholder="XXXX-XXXX-4321"/></Field>
                <Field label="PAN (masked)"><Input value={draft.panMasked} onChange={(e) => setD({ panMasked: e.target.value })} placeholder="ABXXX7845N"/></Field>
                <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer self-end pb-1">
                  <input type="checkbox" checked={draft.bankVerified} onChange={(e) => setD({ bankVerified: e.target.checked })} className="accent-brand-700 w-4 h-4"/>
                  Bank verified (penny-drop)
                </label>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-1.5">Residential address</div>
                <AddressFields value={draft.address} onChange={(v) => setD({ address: v })}/>
              </div>

              <div className="flex justify-end gap-2 pt-1 border-t border-slate-200 dark:border-slate-800 pt-3">
                <Btn onClick={() => setEditing(false)}>Cancel</Btn>
                <Btn variant="primary" onClick={saveEdit}><Icon name="check" className="w-3.5 h-3.5"/>Save changes</Btn>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {[
                  ['Employee code', emp.code, 'file'],
                  ['Designation', emp.designation, 'briefcase'],
                  ['Phone', emp.phone || '—', 'phone'],
                  ['Email', emp.email || '—', 'mail'],
                  ['Joined', emp.joiningDate ? fmtDate(emp.joiningDate, { year: true }) : 'Not yet', 'calendar'],
                  ['Aadhaar', emp.aadhaarMasked || '—', 'shield'],
                  ['PAN', emp.panMasked || '—', 'shield'],
                  ...(canSeePay ? [['Base salary', fmtINR(emp.baseSalary), 'wallet']] : []),
                  ['Bank', emp.bankVerified ? 'Verified ✓' : 'Not verified', 'wallet'],
                  ['Store', site ? site.name : (isOffice ? 'Head office' : 'Unassigned'), 'building'],
                  ['Zone / State', site ? `${site.zone || '—'} · ${site.region || '—'}` : '—', 'map'],
                  ['Incentive basis', inc.slab.label, 'trending-up'],
                ].map(([k, v, i]) => infoTile(k, v, i))}
              </div>

              <Card title="Residential address" bodyClass="p-3">
                {formatAddress(emp.address)
                  ? <div className="text-[12.5px] text-slate-700 dark:text-slate-200 leading-relaxed">{formatAddress(emp.address)}</div>
                  : <div className="text-[12px] text-slate-400 italic">No address on record.</div>}
              </Card>

              {/* Reporting line — Technician → Store Manager → Team Lead → Business Manager */}
              <Card title="Reporting line" bodyClass="p-3"
                right={emp.isStoreManager ? <Badge tone="violet">Store Manager</Badge> : <Badge tone="slate">{emp.designation}</Badge>}>
                <div className="flex gap-2.5">
                  <div className="flex flex-col items-center">
                    <Avatar emp={emp} size={22}/>
                    <div className="w-px flex-1 min-h-[14px] bg-slate-200 dark:bg-slate-700"/>
                  </div>
                  <div className="pb-2.5 min-w-0">
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">{emp.name}</div>
                    <div className="text-[10px] text-slate-500">{emp.designation} · {site ? site.name : 'Unassigned'}</div>
                  </div>
                </div>
                {store.getReportingChain(emp.id).map((node, i, arr) => (
                  <div key={node.level} className="flex gap-2.5">
                    <div className="flex flex-col items-center">
                      <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 ${
                        node.level === 'store-manager' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                        : node.level === 'team-lead' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
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
              </Card>
            </div>
          ))}

          {/* ---------------- Education ---------------- */}
          {tab === 'education' && (
            <EducationEditor
              education={emp.education || []}
              disabled={!canEdit}
              onChange={(v) => { Store.updateEmployee(emp.id, { education: v }); }}
            />
          )}

          {/* ---------------- Documents ---------------- */}
          {tab === 'documents' && (
            <div className="space-y-3">
              <div className="text-[12px] text-slate-500">
                KYC and onboarding proofs.{' '}
                {canApprove
                  ? 'As an Admin you can verify or reject a document directly.'
                  : 'Documents you upload are marked Pending Approval for an Admin to review.'}{' '}
                Once Aadhaar or PAN is verified it is locked — the identity proof cannot be swapped afterwards.
              </div>
              <Card noBody>
                <table className="w-full dense-table text-[12.5px]">
                  <thead><tr><th>Document</th><th>Type</th><th className="hidden sm:table-cell">Uploaded</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                  <tbody>
                    {MOBILE_DOC_LIST.map((d) => {
                      const rec = docs[d.k] || { status: 'missing' };
                      /* Aadhaar and PAN are write-once: once verified they are
                         the record of identity, so Replace goes away. */
                      const locked = store.isDocumentLocked(emp, d.k);
                      return (
                        <tr key={d.k}>
                          <td>
                            <div className="font-semibold text-slate-800 dark:text-slate-100">{d.label}</div>
                            <div className="text-[10.5px] text-slate-500 truncate max-w-[220px]">{rec.fileName || d.hint}</div>
                          </td>
                          <td><Badge tone={d.required ? 'brand' : 'slate'}>{d.required ? 'Required' : 'Optional'}</Badge></td>
                          <td className="hidden sm:table-cell text-[11px] text-slate-500">{rec.uploadedAt ? fmtDate(rec.uploadedAt, { year: true }) : '—'}</td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <StatusBadge status={rec.status}/>
                              {locked && <Icon name="lock" className="w-3 h-3 text-slate-400" title="Verified and locked"/>}
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-1 justify-end">
                              <Btn size="xs" onClick={() => toast(`Previewing ${d.label}`, 'info')}><Icon name="eye" className="w-3 h-3"/></Btn>
                              <Btn size="xs" onClick={() => toast(`Downloading ${d.label}`, 'info')}><Icon name="download" className="w-3 h-3"/></Btn>
                              {canEdit && !locked && (
                                <Btn size="xs" onClick={() => toast(`Choose a new file for ${d.label}`, 'info')}>
                                  <Icon name="upload" className="w-3 h-3"/>{rec.status === 'missing' ? 'Upload' : 'Replace'}
                                </Btn>
                              )}
                              {canApprove && rec.status === 'uploaded' && (
                                <Btn size="xs" variant="success" onClick={() => { Store.setDocumentStatus(emp.id, d.k, 'verified', user.id); toast(`${d.label} verified`, 'success'); }}>
                                  <Icon name="check" className="w-3 h-3"/>Verify
                                </Btn>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>

              {(emp.education || []).some((e) => (e.documents || []).length) && (
                <Card title="Educational documents" bodyClass="p-0" noBody>
                  <table className="w-full dense-table text-[12.5px]">
                    <thead><tr><th>Document</th><th>Type</th><th>Qualification</th><th className="hidden sm:table-cell">Uploaded</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                    <tbody>
                      {(emp.education || []).flatMap((e) => (e.documents || []).map((d) => (
                        <tr key={d.id}>
                          <td className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[200px]" title={d.name}>{d.name}</td>
                          <td><Badge tone="slate">{d.type}</Badge></td>
                          <td className="text-[11.5px] text-slate-600 dark:text-slate-300 truncate max-w-[160px]">{e.qualification}</td>
                          <td className="hidden sm:table-cell text-[11px] text-slate-500">{fmtDate(d.uploadedAt, { year: true })}</td>
                          <td><StatusBadge status={d.status}/></td>
                          <td>
                            <div className="flex items-center gap-1 justify-end">
                              <Btn size="xs" onClick={() => toast(`Previewing ${d.name}`, 'info')}><Icon name="eye" className="w-3 h-3"/></Btn>
                              <Btn size="xs" onClick={() => toast(`Downloading ${d.name}`, 'info')}><Icon name="download" className="w-3 h-3"/></Btn>
                            </div>
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          )}

          {/* ---------------- Attendance & pay ---------------- */}
          {tab === 'work' && (
            <div className="space-y-4">
              {/* Net pay is salary plus incentive, so it is behind the same
                  permission as salary; incentive on its own is not. */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <StatCard label="Present (Jul)" value={`${payslip.presentDays}/${payslip.workingDays}`} icon="check-circle" tone="green"/>
                <StatCard label="Sales (Jul)" value={fmtINR(sales?.totalSales || 0)} icon="chart" tone="brand"/>
                <StatCard label="Incentive (Jul)" value={fmtINR(inc.payout)} sub={inc.winner === 'target' ? 'Store target basis' : 'Slab basis'} icon="trending-up" tone="green"/>
                {canSeePay && <StatCard label="Net pay (Jul)" value={fmtINR(payslip.netPay)} icon="wallet" tone="brand"/>}
              </div>

              <Card title="Recent attendance" bodyClass="p-0">
                <div className="max-h-64 overflow-auto">
                  {recentAtt.map((a) => (
                    <div key={a.id} className="p-2.5 flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${a.insideGeofence ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30'}`}>
                        <Icon name={a.type === 'clock-in' ? 'check' : 'x'} className="w-3 h-3"/>
                      </div>
                      <div className="flex-1 text-[12px] text-slate-700 dark:text-slate-200 font-mono capitalize">{a.type.replace('-', ' ')} · {fmtDateTime(a.timestamp)}</div>
                      {!a.insideGeofence && <Badge tone="red">Out of fence</Badge>}
                    </div>
                  ))}
                  {recentAtt.length === 0 && <Empty title="No attendance yet"/>}
                </div>
              </Card>

              {/* Incentive rules for this employee */}
              {!isOffice && (
                <Card title="Employee incentive rules" bodyClass="p-3"
                  subtitle="Supplement the store slab · compared against the store target, higher wins"
                  right={<Badge tone="brand">{(emp.incentives || []).length} rule{(emp.incentives || []).length !== 1 ? 's' : ''}</Badge>}>
                  <IncentiveEditor
                    incentives={emp.incentives || []}
                    sales={sales?.totalSales || 0}
                    onChange={(v) => { Store.updateEmployeeIncentives(emp.id, v); toast('Incentives updated', 'success'); }}
                  />
                </Card>
              )}
            </div>
          )}

          {/* ---------------- Settings ---------------- */}
          {tab === 'settings' && (
            <div className="space-y-3">
              {/* Compensation — HR reads it, only an Admin revises it. */}
              {canSeePay && <SalaryCard emp={emp} user={user}/>}

              {/* Bank details — three self-service changes, then Admin only. */}
              <BankDetailsCard emp={emp} user={user}/>

              {/* Geo-fencing — editable for existing employees, per spec §9 */}
              <Card title="Geo-fencing" bodyClass="p-3"
                right={<Badge tone={emp.geoFenceEnabled ? 'green' : 'slate'}>{emp.geoFenceEnabled ? 'Enabled' : 'Disabled'}</Badge>}>
                <label className={`flex items-start gap-3 ${can(user, 'geofence.edit') ? 'cursor-pointer' : 'opacity-60'}`}>
                  <input type="checkbox" checked={!!emp.geoFenceEnabled} disabled={!can(user, 'geofence.edit')}
                    onChange={(e) => { Store.setGeoFence(emp.id, e.target.checked); toast(e.target.checked ? 'Geo-fencing enabled' : 'Geo-fencing disabled', 'success'); }}
                    className="accent-brand-700 w-4 h-4 mt-0.5 shrink-0"/>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">Require clock-in inside the store radius</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {emp.geoFenceEnabled
                        ? `Attendance is accepted only within ${site ? site.radius + 'm of ' + site.name : 'the assigned store'}.`
                        : 'Attendance is accepted from any location — normal for office and desktop employees.'}
                    </div>
                    {isOffice && emp.geoFenceEnabled && (
                      <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 flex items-center gap-1">
                        <Icon name="alert" className="w-3 h-3"/>This is an office employee — geo-fencing is not usually required.
                      </div>
                    )}
                  </div>
                </label>
              </Card>

              {/* Travel allowance */}
              <Card title="Travel allowance" bodyClass="p-3"
                right={<Badge tone={emp.travelEligible ? 'green' : 'slate'}>{emp.travelEligible ? 'Eligible' : 'Not eligible'}</Badge>}>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className={`flex items-center gap-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200 ${canEdit ? 'cursor-pointer' : 'opacity-60'}`}>
                    <input type="checkbox" checked={!!emp.travelEligible} disabled={!canEdit}
                      onChange={(e) => { Store.updateEmployee(emp.id, { travelEligible: e.target.checked, travelAmount: emp.travelAmount || 1500 }); toast(e.target.checked ? 'Travel allowance enabled' : 'Travel allowance disabled', 'success'); }}
                      className="accent-brand-700 w-4 h-4"/>
                    Eligible for travel allowance
                  </label>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Fixed amount</span>
                    <Input type="number" value={emp.travelAmount || 0} disabled={!emp.travelEligible || !canEdit}
                      onChange={(e) => Store.updateEmployee(emp.id, { travelAmount: +e.target.value })} className="!w-24"/>
                  </div>
                </div>
              </Card>

              {/* Designation history */}
              <Card title="Designation" bodyClass="p-3"
                right={canEdit ? <Btn size="xs" onClick={() => setDesignationOpen(true)}><Icon name="arrow-up" className="w-3 h-3"/>Edit / upgrade</Btn> : null}>
                <div className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{emp.designation}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {(emp.designationHistory || []).length} recorded change{(emp.designationHistory || []).length === 1 ? '' : 's'}
                </div>
                {(emp.designationHistory || []).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {(emp.designationHistory || []).slice().reverse().slice(0, 4).map((h, i) => (
                      <div key={i} className="text-[11.5px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                        <Icon name="arrow-up" className="w-3 h-3 text-brand-600 shrink-0"/>
                        <span className="flex-1 truncate">{h.from ? `${h.from} → ` : ''}<span className="font-semibold">{h.to}</span>{h.note ? ` · ${h.note}` : ''}</span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">{fmtDate(h.at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Approval state */}
              <Card title="Approval" bodyClass="p-3" right={<StatusBadge status={emp.approvalStatus}/>}>
                <div className="text-[12px] text-slate-600 dark:text-slate-300">
                  {emp.approvalStatus === 'approved' && `Approved${emp.approvedAt ? ' on ' + fmtDate(emp.approvedAt, { year: true }) : ''}.`}
                  {emp.approvalStatus === 'pending-approval' && (canApprove
                    ? 'Awaiting your decision — use "Approve employee" below, or reject from the Onboarding tab.'
                    : 'Awaiting Admin approval. Only an Admin can clear this queue.')}
                  {emp.approvalStatus === 'rejected' && `Rejected${emp.rejectedAt ? ' on ' + fmtDate(emp.rejectedAt, { year: true }) : ''}. ${emp.rejectionReason || ''}`}
                </div>
              </Card>
            </div>
          )}
        </div>
      </Modal>

      {designationOpen && <DesignationModal emp={emp} user={user} onClose={() => setDesignationOpen(false)}/>}
      <OfferLetterModal emp={emp} open={offerOpen} onClose={() => setOfferOpen(false)}/>
    </>
  );
}

/* ---- Compensation ----
   Two permissions, not one. HR holds `salary.view` because they run payroll
   and have to see the figure; only an Admin holds `salary.edit`, because
   setting someone's pay is the decision rather than the bookkeeping. A Team
   Lead holds neither, so this card never renders for them.

   Every revision is appended rather than overwriting, so the figure payroll
   used last month stays traceable. */
function SalaryCard({ emp, user }) {
  const store = useStore();
  const toast = useToast();
  const mayEdit = can(user, 'salary.edit');
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(emp.baseSalary || 0);
  const [note, setNote] = useState('');
  const history = (emp.salaryHistory || []).slice().reverse();

  const save = () => {
    if (!mayEdit) { toast('Only an Admin can revise salary', 'error'); return; }
    const v = Math.round(+amount || 0);
    if (v <= 0) { toast('Enter a monthly salary above zero', 'error'); return; }
    if (v === (emp.baseSalary || 0)) { setEditing(false); return; }
    Store.setSalary(emp.id, v, user.id, note.trim());
    toast(`Salary revised to ${fmtINR(v)} — payroll recomputes from this figure`, 'success');
    setNote(''); setEditing(false);
  };

  return (
    <Card title="Compensation" bodyClass="p-3"
      right={editing ? null : (mayEdit
        ? <Btn size="xs" onClick={() => { setAmount(emp.baseSalary || 0); setEditing(true); }}><Icon name="edit" className="w-3 h-3"/>Edit salary</Btn>
        : <Badge tone="slate"><Icon name="lock" className="w-3 h-3"/>Admin sets pay</Badge>)}>
      {editing ? (
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Field label="Monthly salary (₹)" hint={`Currently ${fmtINR(emp.baseSalary || 0)}`}>
              <Input type="number" min="0" step="500" value={amount} onChange={(e) => setAmount(e.target.value)}/>
            </Field>
            <Field label="Reason (optional)">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Annual revision, promotion…"/>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Btn size="sm" onClick={() => setEditing(false)}>Cancel</Btn>
            <Btn size="sm" variant="primary" onClick={save}><Icon name="check" className="w-3 h-3"/>Save salary</Btn>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-2">
            <div className="text-[20px] font-bold text-slate-900 dark:text-white font-mono">{fmtINR(emp.baseSalary || 0)}</div>
            <div className="text-[11px] text-slate-500 pb-1">per month, before deductions</div>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {history.length} recorded revision{history.length === 1 ? '' : 's'}
          </div>
        </>
      )}

      {history.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-slate-100 dark:border-slate-800 pt-2">
          {history.slice(0, 4).map((h, i) => (
            <div key={i} className="text-[11.5px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <Icon name={h.to >= h.from ? 'arrow-up' : 'chevron-down'} className={`w-3 h-3 shrink-0 ${h.to >= h.from ? 'text-emerald-600' : 'text-rose-500'}`}/>
              <span className="flex-1 truncate font-mono">
                {fmtINR(h.from)} → <span className="font-semibold">{fmtINR(h.to)}</span>
                {h.note ? <span className="font-sans"> · {h.note}</span> : null}
              </span>
              <span className="text-[10px] text-slate-400 font-mono shrink-0">{fmtDate(h.at)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---- Bank details ----
   The account that receives the salary is the one field worth attacking, so
   self-service changes are capped. An Admin is the escalation path and is not
   counted against the cap. */
function BankDetailsCard({ emp, user }) {
  const store = useStore();
  const toast = useToast();
  const byAdmin = isAdmin(user);
  const left = store.bankUpdatesLeft(emp);
  const exhausted = left <= 0;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ bankAccount: emp.bankAccount || '', bankIfsc: emp.bankIfsc || '', bankName: emp.bankName || '' });

  const save = () => {
    const res = Store.updateBankDetails(emp.id, {
      bankAccount: draft.bankAccount.trim(),
      bankIfsc: draft.bankIfsc.trim().toUpperCase(),
      bankName: draft.bankName.trim(),
      // A changed account has to be re-verified before payroll trusts it.
      bankVerified: false,
    }, user);
    if (!res.ok) { toast(res.reason, 'error'); return; }
    toast(res.byAdmin
      ? 'Bank details updated by Admin — penny-drop verification required'
      : `Bank details updated — ${res.remaining} change${res.remaining === 1 ? '' : 's'} left before you must contact Admin`,
      'success');
    setEditing(false);
  };

  return (
    <Card title="Bank details" bodyClass="p-3"
      right={
        <div className="flex items-center gap-1.5">
          <Badge tone={emp.bankVerified ? 'green' : 'amber'}>{emp.bankVerified ? 'Penny-drop verified' : 'Not verified'}</Badge>
          {!editing && (byAdmin || !exhausted) && can(user, 'employee.edit') && (
            <Btn size="xs" onClick={() => setEditing(true)}><Icon name="edit" className="w-3 h-3"/>Change</Btn>
          )}
        </div>
      }>
      {editing ? (
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <Field label="Account number"><Input value={draft.bankAccount} onChange={(e) => setDraft((d) => ({ ...d, bankAccount: e.target.value.replace(/\D/g, '').slice(0, 18) }))} placeholder="18 digits max"/></Field>
            <Field label="IFSC"><Input value={draft.bankIfsc} onChange={(e) => setDraft((d) => ({ ...d, bankIfsc: e.target.value.toUpperCase().slice(0, 11) }))} placeholder="HDFC0001234"/></Field>
            <Field label="Bank"><Input value={draft.bankName} onChange={(e) => setDraft((d) => ({ ...d, bankName: e.target.value }))} placeholder="HDFC Bank"/></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Btn size="sm" onClick={() => setEditing(false)}>Cancel</Btn>
            <Btn size="sm" variant="primary" onClick={save}><Icon name="check" className="w-3 h-3"/>Save bank details</Btn>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[12px]">
          {[['Account', emp.bankAccount ? '••••' + String(emp.bankAccount).slice(-4) : '—'],
            ['IFSC', emp.bankIfsc || '—'],
            ['Bank', emp.bankName || '—']].map(([k, v]) => (
            <div key={k} className="p-2 rounded-md bg-slate-50 dark:bg-slate-800/50">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{k}</div>
              <div className="font-semibold font-mono text-slate-800 dark:text-slate-100 truncate">{v}</div>
            </div>
          ))}
        </div>
      )}

      <div className={`mt-2 text-[11.5px] flex items-start gap-1.5 ${exhausted ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500'}`}>
        <Icon name={exhausted ? 'lock' : 'info'} className="w-3.5 h-3.5 shrink-0 mt-px"/>
        <span>
          {exhausted
            ? `The self-service limit of ${Store.BANK_UPDATE_LIMIT} changes has been used${byAdmin ? '. As an Admin you can still update the account on the employee’s behalf.' : ' — the employee must contact Admin to change these details.'}`
            : `${emp.bankUpdateCount || 0} of ${Store.BANK_UPDATE_LIMIT} self-service changes used · ${left} left, then Admin approval is required.`}
        </span>
      </div>
    </Card>
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
          <div className="absolute right-0 top-9 z-30 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-pop p-3 space-y-2.5 anim-in">
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

/* ---- Reject-with-reason (moved here from the old Onboarding page) ---- */
function RejectReasonModal({ emp, onClose, onConfirm }) {
  const PRESETS = [
    'Aadhaar image is blurred — please re-upload a clear photo',
    'PAN details do not match the name on Aadhaar',
    'Bank proof is unreadable — upload passbook first page or a cancelled cheque',
    'Profile photo does not meet passport-photo requirements',
    'Education certificate is missing for the stated qualification',
  ];
  const [reason, setReason] = useState('');
  if (!emp) return null;
  return (
    <Modal open onClose={onClose} size="md" icon="x" title={`Reject application — ${emp.name}`}
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

/* ---- Onboarding queue (Employees ▸ Onboarding) ---- */
function OnboardingQueue({ user, onOpen }) {
  const store = useStore();
  const toast = useToast();
  const [rejecting, setRejecting] = useState(null);
  const [offerFor, setOfferFor] = useState(null);

  const pending = store.state.employees.filter((e) => e.approvalStatus === 'pending-approval');
  const recent = store.state.employees
    .filter((e) => ['approved', 'rejected'].includes(e.approvalStatus) && (e.approvedAt || e.rejectedAt))
    .sort((a, b) => new Date(b.approvedAt || b.rejectedAt) - new Date(a.approvedAt || a.rejectedAt))
    .slice(0, 8);

  const canApprove = isSuperAdmin(user);

  const approve = (emp) => {
    Store.approveEmployee(emp.id, emp.siteId);
    toast(`${emp.name} approved — offer letter generated`, 'success');
    setOfferFor(Store.getEmployee(emp.id));
  };
  const doReject = (reason) => {
    const emp = rejecting;
    Store.rejectEmployee(emp.id, reason);
    toast(`${emp.name} rejected — applicant notified`, 'warn');
    setRejecting(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Awaiting approval" value={pending.length} icon="shield" tone="amber"/>
        <StatCard label="Approved" value={recent.filter((e) => e.approvalStatus === 'approved').length} sub="Most recent" icon="check-circle" tone="green"/>
        <StatCard label="Rejected" value={recent.filter((e) => e.approvalStatus === 'rejected').length} sub="Most recent" icon="x" tone="red"/>
      </div>

      {!canApprove && (
        <div className="p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 flex items-start gap-2.5">
          <Icon name="lock" className="w-4 h-4 text-brand-700 shrink-0 mt-px"/>
          <div className="text-[12px] text-brand-900 dark:text-brand-100">
            You can add employees and upload their documents, but only an <span className="font-semibold">Admin</span> can approve them.
            Records you submit appear here as Pending Approval.
          </div>
        </div>
      )}

      <Card title={`Pending approval (${pending.length})`} bodyClass="p-0"
        subtitle="Review KYC, documents and education before approving.">
        {pending.length === 0 && <Empty icon="check-circle" title="Queue is clear" hint="No applicants waiting for review."/>}
        {pending.map((emp) => {
          const lc = store.getLifecycle(emp);
          const docs = getEmpDocs(emp);
          const missing = MOBILE_DOC_LIST.filter((d) => d.required && docs[d.k].status === 'missing');
          return (
            <div key={emp.id} className="p-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <div className="flex items-start gap-4 flex-wrap">
                {emp.photoUrl
                  ? <img src={emp.photoUrl} alt="" className="w-11 h-11 rounded-full object-cover shrink-0"/>
                  : <Avatar emp={emp} size={44}/>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => onOpen(emp)} className="font-semibold text-slate-800 dark:text-slate-100 hover:text-brand-700 hover:underline">
                      {emp.name}
                    </button>
                    <StatusBadge status="pending-approval"/>
                    <Badge tone={emp.employeeType === 'office' ? 'violet' : 'brand'}>{emp.designation}</Badge>
                    {emp.onboardingSource === 'self-mobile' && <Badge tone="violet"><Icon name="phone" className="w-3 h-3"/>Self-onboarded</Badge>}
                    <span className="text-[11px] text-slate-500 font-mono">{emp.code}</span>
                  </div>
                  <div className="text-[12px] text-slate-500 mt-0.5 truncate">
                    {emp.email} · {emp.phone} · Applied {fmtDateTime(emp.submittedAt)}
                    {emp.submittedBy && store.getEmployee(emp.submittedBy) ? ` by ${store.getEmployee(emp.submittedBy).name}` : ''}
                  </div>
                  <div className="mt-2"><LifecycleRail emp={emp} compact/></div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                    {[
                      ['Aadhaar eKYC', emp.aadhaarMasked, !!emp.aadhaarMasked],
                      ['PAN', emp.panMasked, !!emp.panMasked],
                      ['Bank', emp.bankVerified ? 'Penny-drop ✓' : 'Not verified', !!emp.bankVerified],
                      ['Documents', `${MOBILE_DOC_LIST.filter((d) => docs[d.k].status !== 'missing').length} of ${MOBILE_DOC_LIST.length}`, missing.length === 0],
                    ].map(([k, v, ok]) => (
                      <div key={k} className={`p-2 rounded border ${ok
                        ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/20 dark:border-emerald-800'
                        : 'border-amber-200 bg-amber-50/50 dark:bg-amber-900/20 dark:border-amber-800'}`}>
                        <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-bold ${ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                          <Icon name={ok ? 'check-circle' : 'alert'} className="w-3 h-3"/>{k}
                        </div>
                        <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 mt-0.5 font-mono truncate">{v || '—'}</div>
                      </div>
                    ))}
                  </div>

                  {missing.length > 0 && (
                    <div className="mt-2 text-[11.5px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <Icon name="alert" className="w-3.5 h-3.5 shrink-0"/>
                      Missing required: {missing.map((d) => d.label).join(', ')}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <div className="text-[11px] text-slate-500">Assign to store:</div>
                    <SearchSelect className="!w-[220px]" value={emp.siteId || ''}
                      disabled={!can(user, 'employee.edit')}
                      onChange={(v) => Store.updateEmployee(emp.id, { siteId: v })}
                      options={store.getSites().map((s) => ({ value: s.id, label: s.name, sub: [s.city, s.region, s.code].filter(Boolean).join(' · '), keywords: s.code }))}
                      placeholder="Select a store…" searchPlaceholder="Search store, code or city…" emptyLabel="No store matches"/>
                    <div className="ml-auto flex gap-2">
                      <Btn size="sm" onClick={() => onOpen(emp)}><Icon name="eye" className="w-3.5 h-3.5"/>Review</Btn>
                      {canApprove && <>
                        <Btn variant="danger" size="sm" onClick={() => setRejecting(emp)}><Icon name="x" className="w-3.5 h-3.5"/>Reject</Btn>
                        <Btn variant="success" size="sm" onClick={() => approve(emp)}><Icon name="check" className="w-3.5 h-3.5"/>Approve &amp; generate offer</Btn>
                      </>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      {recent.length > 0 && (
        <Card title="Recently processed" bodyClass="p-0" noBody>
          <table className="w-full dense-table text-[12.5px]">
            <thead><tr><th>Employee</th><th>Store</th><th>Decision</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {recent.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar emp={emp} size={24}/>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">{emp.name}</div>
                        <div className="text-[10px] text-slate-500">{emp.designation}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-[12px] text-slate-600 dark:text-slate-300 truncate max-w-[180px]">{store.getSite(emp.siteId)?.name || '—'}</td>
                  <td>
                    {emp.approvalStatus === 'approved'
                      ? <StatusBadge status="approved"/>
                      : <div><StatusBadge status="rejected"/>
                          {emp.rejectionReason && <div className="text-[10px] text-slate-500 mt-0.5 max-w-[240px] truncate" title={emp.rejectionReason}>{emp.rejectionReason}</div>}
                        </div>}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <Btn size="xs" onClick={() => onOpen(emp)}>Open</Btn>
                      {emp.status === 'active' && <Btn size="xs" onClick={() => setOfferFor(emp)}><Icon name="file" className="w-3 h-3"/>Offer letter</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Employees can read these during onboarding; HR and Admin manage them. */}
      <PolicyLibrary user={user} manage={can(user, 'policy.edit')}/>

      <OfferLetterModal emp={offerFor} open={!!offerFor} onClose={() => setOfferFor(null)}/>
      {rejecting && <RejectReasonModal emp={rejecting} onClose={() => setRejecting(null)} onConfirm={doReject}/>}
    </div>
  );
}

/* ---- Directory table, shared by the Existing and New tabs ---- */
function EmployeeDirectory({ user, list, onOpen, emptyTitle, emptyHint }) {
  const store = useStore();
  const [page, setPage] = useState(0);
  const PER = 25;
  useEffect(() => { setPage(0); }, [list.length]);
  const pages = Math.ceil(list.length / PER) || 1;
  const pageList = list.slice(page * PER, page * PER + PER);
  const siteById = useMemo(() => Object.fromEntries(store.getSites().map((s) => [s.id, s])), [store.state]);
  // A Team Lead has no reason to know what their store's people are paid, so
  // the column is absent rather than blanked.
  const showSalary = can(user, 'salary.view');

  return (
    <Card noBody>
      <div className="overflow-x-auto">
        <table className="w-full dense-table text-[13px]">
          <thead>
            <tr>
              <th>Employee</th><th>Designation</th><th>Type</th><th>Store</th>
              <th className="hidden xl:table-cell">Team Lead</th>
              <th>Stage</th><th>Status</th>
              <th className="hidden lg:table-cell">Geo-fence</th>
              {showSalary && <th className="text-right">Salary</th>}<th/>
            </tr>
          </thead>
          <tbody>
            {pageList.map((e) => {
              const site = siteById[e.siteId];
              return (
                <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => onOpen(e)}>
                  <td>
                    <div className="flex items-center gap-2.5 min-w-0">
                      {e.photoUrl
                        ? <img src={e.photoUrl} alt="" className="w-[30px] h-[30px] rounded-full object-cover shrink-0"/>
                        : <Avatar emp={e} size={30}/>}
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{e.name}</span>
                          {e.isStoreManager && <Badge tone="violet">Store Mgr</Badge>}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{e.code} · {e.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-[12px] text-slate-700 dark:text-slate-200 truncate max-w-[130px]">{e.designation}</td>
                  <td>
                    <Badge tone={e.employeeType === 'office' ? 'violet' : 'brand'}>
                      <Icon name={e.employeeType === 'office' ? 'briefcase' : 'pin'} className="w-3 h-3"/>
                      {e.employeeType === 'office' ? 'Office' : 'Field'}
                    </Badge>
                  </td>
                  <td>{site
                    ? <div className="max-w-[160px]"><div className="text-[12px] text-slate-700 dark:text-slate-200 truncate">{site.name}</div><div className="text-[10px] text-slate-500">{site.city} · {site.region}</div></div>
                    : <span className="text-slate-400">—</span>}</td>
                  <td className="hidden xl:table-cell text-[12px] text-slate-600 dark:text-slate-300 max-w-[120px] truncate">{site && site.cm ? site.cm : '—'}</td>
                  <td><LifecycleRail emp={e} compact/></td>
                  <td><StatusBadge status={e.status}/></td>
                  <td className="hidden lg:table-cell">
                    <Badge tone={e.geoFenceEnabled ? 'green' : 'slate'}>{e.geoFenceEnabled ? 'On' : 'Off'}</Badge>
                  </td>
                  {showSalary && <td className="text-right font-semibold text-slate-800 dark:text-slate-100">{fmtINR(e.baseSalary)}</td>}
                  <td><Icon name="chevron-right" className="w-4 h-4 text-slate-400"/></td>
                </tr>
              );
            })}
            {list.length === 0 && <tr><td colSpan={showSalary ? 10 : 9}><Empty title={emptyTitle} hint={emptyHint}/></td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={pages} total={list.length} per={PER} onPage={setPage} unit="employees"/>
    </Card>
  );
}

function EmployeesPage({ user, navArg }) {
  const store = useStore();
  const [tab, setTab] = useState('existing');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [openWizard, setOpenWizard] = useState(false);
  const isSiteMgr = roleOf(user) === 'site-manager';
  const canSeeSalary = can(user, 'salary.view');
  const hierarchy = store.getHierarchy();

  /* Arriving from global search or a dashboard alert: land on the tab that
     holds the thing being pointed at, with the search box already filled in.
     "New" is checked first because a fresh joiner is not in the Existing list. */
  useEffect(() => {
    if (!navArg) return;
    if (navArg.tab) setTab(navArg.tab);
    if (navArg.search) {
      setQ(navArg.search);
      const hit = store.state.employees.find((e) => e.name === navArg.search);
      if (hit && !navArg.tab) setTab(store.isNewJoiner(hit) ? 'new' : 'existing');
    }
  }, [navArg && navArg._n]);

  const BLANK = { zone: 'all', region: 'all', city: 'all', siteId: 'all', teamLead: 'all', bm: 'all', level: 'all', status: 'all', empType: 'all', designation: 'all' };
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
  const designationOpts = useMemo(
    () => [...new Set(store.state.employees.map((e) => e.designation).filter(Boolean))].sort(),
    [store.state]
  );

  /* Everyone in the directory: field staff plus office staff, since Employees is
     now the central people area rather than a field-only roster. */
  const everyone = useMemo(
    () => store.state.employees.filter((e) => !isSiteMgr || e.siteId === user.siteId),
    [store.state, isSiteMgr, user.siteId]
  );

  const applyFilters = (base) => {
    let list = base;
    if (f.status !== 'all') list = list.filter((e) => e.status === f.status);
    if (f.empType !== 'all') list = list.filter((e) => (e.employeeType || 'field') === f.empType);
    if (f.designation !== 'all') list = list.filter((e) => e.designation === f.designation);
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
          || (e.designation || '').toLowerCase().includes(ql)
          || (qDigits.length >= 4 && (e.phone || '').replace(/\D/g, '').includes(qDigits))
          || (site && ((site.name || '').toLowerCase().includes(ql) || (site.city || '').toLowerCase().includes(ql)));
      });
    }
    return list;
  };

  const existing = useMemo(() => applyFilters(everyone.filter((e) => e.status === 'active' && !store.isNewJoiner(e))), [everyone, f, q]);
  const newcomers = useMemo(() => applyFilters(everyone.filter((e) => store.isNewJoiner(e))), [everyone, f, q]);
  const pendingCount = store.state.employees.filter((e) => e.approvalStatus === 'pending-approval').length;

  /* Onboarding is a queue you act on — create, upload, approve. A Team Lead
     holds none of those, so the tab is not shown to them at all rather than
     shown as a wall of buttons they cannot press. */
  const showOnboarding = can(user, 'employee.create') || can(user, 'document.upload') || isAdmin(user);
  const TABS = [
    { id: 'existing',   label: 'Existing Employees', icon: 'users' },
    { id: 'new',        label: 'New Employees',      icon: 'sparkle', badge: newcomers.length },
    ...(showOnboarding ? [{ id: 'onboarding', label: 'Onboarding', icon: 'shield', badge: pendingCount }] : []),
  ];
  useEffect(() => { if (tab === 'onboarding' && !showOnboarding) setTab('existing'); }, [showOnboarding, tab]);

  /* Removable chips — one per active filter, so the current scope is always visible. */
  const chips = [];
  if (f.zone !== 'all')        chips.push({ k: 'zone',   label: 'Zone: ' + f.zone,   clear: () => setFilter({ zone: 'all' }) });
  if (f.region !== 'all')      chips.push({ k: 'region', label: 'State: ' + f.region, clear: () => setFilter({ region: 'all' }) });
  if (f.city !== 'all')        chips.push({ k: 'city',   label: 'City: ' + f.city,   clear: () => setFilter({ city: 'all' }) });
  if (f.siteId !== 'all')      chips.push({ k: 'site',   label: 'Store: ' + ((siteById[f.siteId] || {}).name || f.siteId), clear: () => setFilter({ siteId: 'all' }) });
  if (f.teamLead !== 'all')    chips.push({ k: 'tl',     label: 'Team Lead: ' + ((store.getTeamLead(f.teamLead) || {}).name || ''), clear: () => setFilter({ teamLead: 'all' }) });
  if (f.bm !== 'all')          chips.push({ k: 'bm',     label: 'Business Mgr: ' + ((store.getBusinessManager(f.bm) || {}).name || ''), clear: () => setFilter({ bm: 'all' }) });
  if (f.level !== 'all')       chips.push({ k: 'level',  label: 'Level: ' + (f.level === 'store-manager' ? 'Store Manager' : 'Technician'), clear: () => setFilter({ level: 'all' }) });
  if (f.status !== 'all')      chips.push({ k: 'status', label: 'Status: ' + f.status, clear: () => setFilter({ status: 'all' }) });
  if (f.empType !== 'all')     chips.push({ k: 'type',   label: 'Type: ' + (f.empType === 'office' ? 'Office' : 'Field'), clear: () => setFilter({ empType: 'all' }) });
  if (f.designation !== 'all') chips.push({ k: 'desig',  label: 'Designation: ' + f.designation, clear: () => setFilter({ designation: 'all' }) });
  const popoverCount = ['zone', 'region', 'city', 'siteId', 'teamLead', 'bm', 'designation'].filter((k) => f[k] !== 'all').length;

  const activeList = tab === 'existing' ? existing : newcomers;

  /* The export honours the same permission as the table — a Team Lead cannot
     download the salary column they are not shown on screen. */
  const exportCSV = () => downloadCSV(`employees_${tab}.csv`, [
    ['Code','Name','Designation','Type','Stage','Phone','Email','Store','City','State','Zone','Store Manager','Team Lead','Business Manager','Geo-fence','Status','Aadhaar','PAN',
      ...(canSeeSalary ? ['Base'] : [])],
    ...activeList.map((e) => {
      const s = siteById[e.siteId] || {};
      const mgr = s.managerId ? store.getEmployee(s.managerId) : null;
      return [e.code, e.name, e.designation, e.employeeType === 'office' ? 'Office' : 'Field',
        store.getLifecycle(e).label, e.phone, e.email,
        s.name || '', s.city || '', s.region || '', s.zone || '',
        mgr ? mgr.name : '', s.cm || '', s.bm || '',
        e.geoFenceEnabled ? 'Enabled' : 'Disabled',
        e.status, e.aadhaarMasked, e.panMasked,
        ...(canSeeSalary ? [e.baseSalary] : [])];
    }),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="People" title="Employees"
        subtitle={`${everyone.length} people · ${everyone.filter((e) => e.status === 'active').length} active · ${pendingCount} awaiting approval`}>
        {can(user, 'employee.create') && (
          <Btn variant="primary" onClick={() => setOpenWizard(true)}>
            <Icon name="plus" className="w-3.5 h-3.5"/>Add employee
          </Btn>
        )}
        {tab !== 'onboarding' && (
          <Btn onClick={exportCSV}><Icon name="download" className="w-3.5 h-3.5"/>Export CSV</Btn>
        )}
      </PageHeader>

      <Tabs tabs={TABS} value={tab} onChange={setTab}/>

      {tab === 'onboarding' ? (
        <OnboardingQueue user={user} onOpen={setSelected}/>
      ) : (
        <>
          {/* Lifecycle legend — makes the Stage column self-explanatory */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wide text-[10px]">Lifecycle</span>
            {Store.LIFECYCLE_STAGES.map((s, i) => (
              <React.Fragment key={s.id}>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{s.label}</span>
                {i < Store.LIFECYCLE_STAGES.length - 1 && <Icon name="chevron-right" className="w-3 h-3 text-slate-300"/>}
              </React.Fragment>
            ))}
          </div>

          <Card noBody>
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 flex-1 min-w-[220px] h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <Icon name="search" className="w-3.5 h-3.5 text-slate-400"/>
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, code, email, phone, designation or store…" className="flex-1 min-w-0 bg-transparent text-[13px] outline-none dark:text-slate-100"/>
                  {q && <button onClick={() => setQ('')} className="text-slate-400 hover:text-slate-600"><Icon name="x" className="w-3.5 h-3.5"/></button>}
                </div>

                {/* Employee type — the split that changes onboarding, attendance and payroll rules */}
                <div className="inline-flex rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                  {[['all', 'All'], ['field', 'Field'], ['office', 'Office']].map(([v, label]) => (
                    <button key={v} onClick={() => setFilter({ empType: v })}
                      className={`h-8 px-2.5 text-[12px] font-semibold transition border-r last:border-r-0 border-slate-200 dark:border-slate-700 ${
                        f.empType === v ? 'bg-brand-700 text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
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
                  <FilterPopover count={popoverCount} onClear={() => setF({ ...BLANK, level: f.level, status: f.status, empType: f.empType })}>
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
                    <Field label="Designation">
                      <SearchSelect value={f.designation} onChange={(v) => setFilter({ designation: v })}
                        options={[{ value: 'all', label: `All designations (${designationOpts.length})` }, ...designationOpts.map((d) => ({ value: d, label: d }))]}
                        searchPlaceholder="Search designation…" emptyLabel="No designation matches"/>
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

              <FilterChips chips={chips} onClearAll={() => { setF(BLANK); setQ(''); }}/>
            </div>

            <div className="px-3 py-1.5 text-[11px] text-slate-500 border-b border-slate-100 dark:border-slate-800">
              {tab === 'existing'
                ? `${existing.length} established employee${existing.length === 1 ? '' : 's'} (joined more than 90 days ago)`
                : `${newcomers.length} new employee${newcomers.length === 1 ? '' : 's'} — joined in the last 90 days or still moving through the lifecycle`}
            </div>

            <EmployeeDirectory user={user} list={activeList} onOpen={setSelected}
              emptyTitle={tab === 'existing' ? 'No established employees match' : 'No new employees'}
              emptyHint={tab === 'existing' ? 'Try clearing a filter chip above.' : 'Recent joiners and in-progress applications appear here.'}/>
          </Card>
        </>
      )}

      {selected && <EmployeeDetailModal emp={selected} user={user} onClose={() => setSelected(null)}/>}
      <OnboardingWizard open={openWizard} user={user} onClose={() => setOpenWizard(false)}
        onSubmitted={(emp) => { setTab(emp.status === 'active' ? 'new' : 'onboarding'); }}/>
    </div>
  );
}

Object.assign(window, {
  EmployeesPage, EmployeeDetailModal, EmployeeDirectory, OnboardingQueue,
  LifecycleRail, DesignationModal, RejectReasonModal, FilterPopover,
  SalaryCard, BankDetailsCard,
});
