/* Employee self-registration wizard: personal → Aadhaar → PAN → Bank → documents → submit */

/* ---- Sample document preview modal ---- */
/* Paths are relative so they resolve both on the local static server and on
   Firebase Hosting (firebase.json ignores Files/**, so samples live in assets/). */
const DOC_MAX_MB = 5;
const DOC_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const SAMPLE_DOCS = {
  aadhaar: {
    img: 'assets/sample_aadhaar.png',
    title: 'Sample Aadhaar Card',
    desc: 'Your Aadhaar card should clearly show your name, date of birth, 12-digit UID number, and QR code. Upload a clear, unobstructed photo or scan.',
  },
  pan: {
    img: 'assets/sample_pan.png',
    title: 'Sample PAN Card',
    desc: 'Upload the front side of your PAN card showing your full name, father\'s name, date of birth, and 10-character PAN number.',
  },
  bank: {
    img: 'assets/sample_passbook.png',
    title: 'Sample Bank Passbook / Cheque',
    desc: 'Upload the first page of your bank passbook or a cancelled cheque showing your name, account number, IFSC code, and branch details.',
  },
  photo: {
    img: 'assets/sample_photo.png',
    title: 'Sample Passport Photo',
    desc: 'Upload a recent passport-size photograph (3.5cm × 4.5cm) with a plain white or off-white background. Face should be clearly visible.',
  },
  address: {
    img: 'assets/sample_aadhaar.png',
    title: 'Sample Address Proof',
    desc: 'Any government-issued document showing your current residential address — Aadhaar, Voter ID, Utility bill (within 3 months), or Passport.',
  },
};

/* Shared file guard — returns null when valid, else an error message. */
function validateDocFile(file) {
  if (!file) return 'No file selected';
  if (!DOC_ALLOWED_TYPES.includes(file.type)) return 'Invalid file type — only JPG, PNG or PDF are accepted';
  if (file.size > DOC_MAX_MB * 1024 * 1024) return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB) — maximum is ${DOC_MAX_MB} MB`;
  return null;
}

function SampleDocModal({ docKey, onClose }) {
  const info = SAMPLE_DOCS[docKey];
  if (!info) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"/>
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-pop max-w-sm w-full overflow-hidden anim-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <div className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{info.title}</div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <Icon name="x" className="w-4 h-4 text-slate-500"/>
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center min-h-[160px]">
            <img
              src={info.img}
              alt={info.title}
              className="max-w-full max-h-[220px] object-contain"
              onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
            />
            <div style={{display:'none'}} className="w-full h-40 flex-col items-center justify-center gap-2 text-slate-400">
              <Icon name="file" className="w-8 h-8"/>
              <div className="text-[12px]">Sample image unavailable</div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800">
            <div className="text-[11px] text-brand-900 dark:text-brand-100 leading-relaxed">{info.desc}</div>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Icon name="shield" className="w-3.5 h-3.5 text-slate-400 shrink-0"/>
            Accepted formats: JPG, PNG, PDF &nbsp;·&nbsp; Max size: 5 MB
          </div>
        </div>
        <div className="px-4 pb-4">
          <button onClick={onClose} className="w-full h-9 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-[13px] font-semibold transition">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Education ----
   A repeatable block per qualification, each with its own certificate upload.
   Kept as an array on the employee record so a person can hold a diploma and a
   degree without the form growing a second shape. */
const EDU_LEVELS = ['10th / SSC', '12th / HSC', 'Diploma', 'ITI / Vocational', "Bachelor's Degree", "Master's Degree", 'Doctorate', 'Certification'];
const EDU_DOC_TYPES = ['Degree Certificate', 'Diploma Certificate', 'Marksheet', 'Provisional Certificate', 'Transcript', 'Other'];

const blankEducation = () => ({
  id: 'edu_' + Math.random().toString(36).slice(2, 8),
  qualification: "Bachelor's Degree", institution: '', specialization: '',
  startYear: '', endYear: '', grade: '', notes: '', documents: [],
});

function EducationEditor({ education, onChange, disabled }) {
  const toast = useToast();
  const rows = education || [];
  const update = (id, patch) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id) => onChange(rows.filter((r) => r.id !== id));

  const attach = (row, file, docType) => {
    const err = validateDocFile(file);
    if (err) { toast(err, 'error'); return; }
    const doc = {
      id: 'edoc_' + Math.random().toString(36).slice(2, 8),
      name: file.name, type: docType, size: file.size,
      uploadedAt: new Date().toISOString(), status: 'uploaded',
    };
    update(row.id, { documents: [...(row.documents || []), doc] });
    toast(`${file.name} attached — pending verification`, 'success');
  };

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-5 text-center">
          <Icon name="graduation" className="w-6 h-6 text-slate-300 mx-auto mb-1.5"/>
          <div className="text-[12px] text-slate-500">No education records yet.</div>
        </div>
      )}
      {rows.map((row, i) => (
        <div key={row.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 min-w-0">
              <Icon name="graduation" className="w-3.5 h-3.5 text-brand-600 shrink-0"/>
              <span className="text-[12px] font-bold text-slate-800 dark:text-slate-100 truncate">
                {row.qualification || `Qualification ${i + 1}`}
              </span>
              {row.institution && <span className="text-[11px] text-slate-500 truncate hidden sm:inline">· {row.institution}</span>}
            </div>
            {!disabled && (
              <button onClick={() => remove(row.id)} className="w-7 h-7 flex items-center justify-center rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20" aria-label="Remove qualification">
                <Icon name="trash" className="w-3.5 h-3.5"/>
              </button>
            )}
          </div>
          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            <Field label="Qualification / degree">
              <Select value={row.qualification} disabled={disabled} onChange={(e) => update(row.id, { qualification: e.target.value })}>
                {EDU_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Institution / university" className="lg:col-span-2">
              <Input value={row.institution} disabled={disabled} onChange={(e) => update(row.id, { institution: e.target.value })} placeholder="University of Mumbai"/>
            </Field>
            <Field label="Specialization">
              <Input value={row.specialization} disabled={disabled} onChange={(e) => update(row.id, { specialization: e.target.value })} placeholder="Electronics"/>
            </Field>
            <Field label="Start year">
              <Input type="number" min="1960" max="2100" value={row.startYear} disabled={disabled} onChange={(e) => update(row.id, { startYear: e.target.value })} placeholder="2019"/>
            </Field>
            <Field label="Completion year"
              error={row.startYear && row.endYear && +row.endYear < +row.startYear ? 'Completion year is before the start year' : null}>
              <Input type="number" min="1960" max="2100" value={row.endYear} disabled={disabled} onChange={(e) => update(row.id, { endYear: e.target.value })} placeholder="2022"/>
            </Field>
            <Field label="Grade / percentage">
              <Input value={row.grade} disabled={disabled} onChange={(e) => update(row.id, { grade: e.target.value })} placeholder="First class · 72%"/>
            </Field>
            <Field label="Additional details" className="sm:col-span-2">
              <Input value={row.notes} disabled={disabled} onChange={(e) => update(row.id, { notes: e.target.value })} placeholder="Part-time, distance learning, honours…"/>
            </Field>
          </div>

          {/* Attached education documents */}
          <div className="px-3 pb-3">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Education documents · {(row.documents || []).length}
                </span>
                {!disabled && (
                  <label className="text-[10px] font-semibold text-brand-700 dark:text-brand-300 hover:underline cursor-pointer flex items-center gap-1">
                    <Icon name="upload" className="w-3 h-3"/>Add document
                    <input type="file" accept=".pdf,image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) attach(row, f, EDU_DOC_TYPES[0]); }}/>
                  </label>
                )}
              </div>
              {(row.documents || []).length === 0 ? (
                <div className="px-2.5 py-2 text-[11px] text-slate-400 italic">
                  No certificates attached — degree, diploma or marksheet (JPG, PNG, PDF · max {DOC_MAX_MB} MB).
                </div>
              ) : (
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-[9px] uppercase font-bold tracking-wide text-slate-500 bg-slate-50/60 dark:bg-slate-800/30">
                      <th className="text-left px-2.5 py-1">Document</th>
                      <th className="text-left px-2 py-1">Type</th>
                      <th className="text-left px-2 py-1 hidden sm:table-cell">Uploaded</th>
                      <th className="text-left px-2 py-1">Status</th>
                      <th className="px-2 py-1"/>
                    </tr>
                  </thead>
                  <tbody>
                    {(row.documents || []).map((d) => (
                      <tr key={d.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-2.5 py-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Icon name="file" className="w-3 h-3 text-slate-400 shrink-0"/>
                            <span className="truncate max-w-[150px] text-slate-700 dark:text-slate-200" title={d.name}>{d.name}</span>
                          </div>
                          {d.size ? <div className="text-[9px] text-slate-400 font-mono pl-4.5">{fmtFileSize(d.size)}</div> : null}
                        </td>
                        <td className="px-2 py-1.5">
                          <Select className="!h-6 !text-[10px]" value={d.type} disabled={disabled}
                            onChange={(e) => update(row.id, { documents: row.documents.map((x) => x.id === d.id ? { ...x, type: e.target.value } : x) })}>
                            {EDU_DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </Select>
                        </td>
                        <td className="px-2 py-1.5 text-slate-500 hidden sm:table-cell">{fmtDate(d.uploadedAt)}</td>
                        <td className="px-2 py-1.5"><StatusBadge status={d.status}/></td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-0.5 justify-end">
                            <button title="Preview" className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-brand-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                              <Icon name="eye" className="w-3 h-3"/>
                            </button>
                            <button title="Download" className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-brand-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                              <Icon name="download" className="w-3 h-3"/>
                            </button>
                            {!disabled && (
                              <button title="Remove" onClick={() => update(row.id, { documents: row.documents.filter((x) => x.id !== d.id) })}
                                className="w-6 h-6 rounded flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                                <Icon name="trash" className="w-3 h-3"/>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ))}
      {!disabled && (
        <Btn size="sm" onClick={() => onChange([...rows, blankEducation()])}>
          <Icon name="plus" className="w-3.5 h-3.5"/>Add qualification
        </Btn>
      )}
    </div>
  );
}

/* ---- Structured residential address ----
   Replaces the single free-text textarea. Broken out so the same block serves
   the wizard, the edit form and (later) any address the employee updates. */
function AddressFields({ value, onChange, disabled }) {
  const a = { ...Store.BLANK_ADDRESS, ...(value || {}) };
  const set = (patch) => onChange({ ...a, ...patch });
  const pinError = a.pincode && !/^\d{6}$/.test(String(a.pincode)) ? 'Pincode must be 6 digits' : null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
      <Field label="Address line 1" className="sm:col-span-2 lg:col-span-3">
        <Input value={a.line1} disabled={disabled} onChange={(e) => set({ line1: e.target.value })} placeholder="Flat / house no., building name"/>
      </Field>
      <Field label="Address line 2" className="sm:col-span-2 lg:col-span-2">
        <Input value={a.line2} disabled={disabled} onChange={(e) => set({ line2: e.target.value })} placeholder="Street, area"/>
      </Field>
      <Field label="Address line 3">
        <Input value={a.line3} disabled={disabled} onChange={(e) => set({ line3: e.target.value })} placeholder="Locality (optional)"/>
      </Field>
      <Field label="Landmark">
        <Input value={a.landmark} disabled={disabled} onChange={(e) => set({ landmark: e.target.value })} placeholder="Near…"/>
      </Field>
      <Field label="City">
        <Input value={a.city} disabled={disabled} onChange={(e) => set({ city: e.target.value })} placeholder="Mumbai"/>
      </Field>
      <Field label="District">
        <Input value={a.district} disabled={disabled} onChange={(e) => set({ district: e.target.value })} placeholder="Mumbai Suburban"/>
      </Field>
      <Field label="State">
        <SearchSelect value={a.state} disabled={disabled} onChange={(v) => set({ state: v })} allowCustom
          options={(Store.getHierarchy().regions || []).map((r) => ({ value: r.name, label: r.name, sub: r.zone + ' zone' }))}
          placeholder="Select state…" searchPlaceholder="Search state…" emptyLabel="Not on record — type to add"/>
      </Field>
      <Field label="Country">
        <Input value={a.country} disabled={disabled} onChange={(e) => set({ country: e.target.value })} placeholder="India"/>
      </Field>
      <Field label="Pincode / ZIP" error={pinError}>
        <Input value={a.pincode} disabled={disabled} inputMode="numeric"
          onChange={(e) => set({ pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="400059"/>
      </Field>
    </div>
  );
}

/* Renders a structured address back as one readable line. */
const formatAddress = (a) => {
  if (!a) return '';
  return [a.line1, a.line2, a.line3, a.landmark, a.city, a.district, a.state, a.country, a.pincode]
    .map((x) => String(x || '').trim()).filter(Boolean).join(', ');
};

/* ---- Stepper rail ---- */
function WizardSteps({ steps, step, onJump, furthest }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
      {steps.map((s, i) => {
        const done = i < step;
        const reachable = i <= furthest;
        return (
          <React.Fragment key={s.id}>
            <button type="button" disabled={!reachable} onClick={() => reachable && onJump(i)}
              className={`flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap shrink-0 rounded-md px-1.5 py-1 transition ${
                i === step ? 'text-brand-800 dark:text-brand-200 bg-brand-50 dark:bg-brand-900/30'
                : done ? 'text-brand-700 dark:text-brand-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                : 'text-slate-400 cursor-default'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                done ? 'bg-brand-700 text-white'
                : i === step ? 'bg-brand-100 text-brand-800 border border-brand-700 dark:bg-brand-900/40 dark:text-brand-200'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                {done ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && <div className={`flex-1 min-w-[10px] h-px shrink ${done ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`}/>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ============================================================================
   OnboardingWizard — the single "add an employee" flow.

   Approval rule (spec §4 / §23): a Super Admin creating a record approves it
   outright and the employee goes straight to Active. Anyone else submits it and
   it sits in the queue as Pending Approval until a Super Admin clears it. The
   footer button, the review panel and the documents step all read the same
   `selfApprove` flag so they can never disagree.
   ========================================================================== */
function OnboardingWizard({ open, onClose, onSubmitted, user }) {
  const toast = useToast();
  const actor = user || { role: 'hr-manager', name: 'HR', id: 'usr_hr' };
  const selfApprove = isSuperAdmin(actor);

  const BLANK = {
    name: '', phone: '', email: '', dob: '', gender: 'Male', maritalStatus: 'Single', bloodGroup: '',
    photoUrl: null, emergencyName: '', emergencyPhone: '',
    address: { ...Store.BLANK_ADDRESS },
    education: [],
    employeeType: 'field', designation: 'Technician', siteId: '', joiningDate: '',
    baseSalary: 15000, travelEligible: false, travelAmount: 1500, geoFenceEnabled: true,
    aadhaar: '', aadhaarOtp: '', aadhaarVerified: false,
    pan: '', panVerified: false,
    bankAcct: '', ifsc: '', bankVerified: false,
    docs: {},
  };
  const [data, setData] = useState(BLANK);
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [emailOk, setEmailOk] = useState(false);
  const [forceFail, setForceFail] = useState(false);
  const [loading, setLoading] = useState(null);
  const [sampleDoc, setSampleDoc] = useState(null);
  const set = (patch) => setData((d) => ({ ...d, ...patch }));

  const isOffice = data.employeeType === 'office';
  const ladder = Store.DESIGNATION_LADDERS[data.employeeType] || Store.DESIGNATION_LADDERS.field;

  /* Switching employee type re-bases the fields that only make sense for one of
     them: office staff lose the store and the geo-fence, field staff regain it. */
  const setType = (type) => {
    const office = type === 'office';
    set({
      employeeType: type,
      geoFenceEnabled: !office,
      siteId: office ? '' : data.siteId,
      designation: (Store.DESIGNATION_LADDERS[type] || [])[office ? 0 : 1] || '',
    });
  };

  const STEPS = [
    { id: 'personal',   label: 'Personal' },
    { id: 'address',    label: 'Address' },
    { id: 'education',  label: 'Education' },
    { id: 'employment', label: 'Employment' },
    { id: 'kyc',        label: 'KYC' },
    { id: 'documents',  label: 'Documents' },
    { id: 'review',     label: 'Review' },
  ];
  const current = STEPS[step];

  const verify = (kind) => {
    setLoading(kind);
    setTimeout(() => {
      setLoading(null);
      if (forceFail) { toast(`${kind.toUpperCase()} verification failed — please retry`, 'error'); return; }
      if (kind === 'aadhaar') set({ aadhaarVerified: true });
      if (kind === 'pan') set({ panVerified: true });
      if (kind === 'bank') set({ bankVerified: true });
      toast(`${kind.toUpperCase()} verified successfully`, 'success');
    }, 1200);
  };

  const requiredDocsDone = Store.REQUIRED_DOC_KEYS.every((k) => data.docs[k]);
  const stepValid = (i) => {
    const id = STEPS[i].id;
    if (id === 'personal')   return !!(data.name.trim() && data.phone.trim() && emailOk);
    if (id === 'address')    return !!(data.address.line1.trim() && data.address.city.trim() && /^\d{6}$/.test(String(data.address.pincode || '')));
    if (id === 'education')  return true; // optional by design — many field hires have none on file
    if (id === 'employment') return !!(data.designation && (isOffice || data.siteId));
    if (id === 'kyc')        return data.aadhaarVerified && data.panVerified && data.bankVerified;
    if (id === 'documents')  return requiredDocsDone;
    return true;
  };
  const canNext = stepValid(step);
  const go = (i) => { setStep(i); setFurthest((f) => Math.max(f, i)); };

  const handleDocFile = (docKey, file) => {
    const err = validateDocFile(file);
    if (err) { toast(err, 'error'); return; }
    set({ docs: { ...data.docs, [docKey]: { fileName: file.name, size: file.size, type: file.type } } });
  };

  const reset = () => { setData(BLANK); setStep(0); setFurthest(0); setEmailOk(false); };

  const submit = () => {
    // Documents follow the same approval rule as the record itself.
    const docStatus = selfApprove ? 'verified' : 'uploaded';
    const documents = {};
    Object.entries(data.docs).forEach(([k, v]) => {
      documents[k] = { status: docStatus, fileName: v.fileName, size: v.size, uploadedAt: new Date().toISOString() };
    });

    const emp = Store.addEmployee({
      name: data.name.trim(), phone: data.phone.trim(), email: data.email.trim(),
      dob: data.dob, gender: data.gender, maritalStatus: data.maritalStatus, bloodGroup: data.bloodGroup,
      photoUrl: data.photoUrl,
      emergencyContact: data.emergencyName ? { name: data.emergencyName, phone: data.emergencyPhone } : null,
      address: data.address,
      currentAddress: formatAddress(data.address),
      education: data.education,
      employeeType: data.employeeType,
      role: isOffice ? 'hr-manager' : 'field-employee',
      designation: data.designation,
      designationHistory: [{ from: null, to: data.designation, at: new Date().toISOString(), by: actor.id, note: 'Initial designation' }],
      siteId: data.siteId || null,
      joiningDate: data.joiningDate || '',
      baseSalary: +data.baseSalary || 0,
      travelEligible: !!data.travelEligible,
      travelAmount: data.travelEligible ? +data.travelAmount || 0 : 0,
      geoFenceEnabled: !!data.geoFenceEnabled,
      aadhaarMasked: 'XXXX-XXXX-' + data.aadhaar.slice(-4).padStart(4, '0'),
      panMasked: data.pan.slice(0, 2) + 'XXX' + data.pan.slice(-4),
      bankVerified: data.bankVerified, ifsc: data.ifsc,
      documents,
      status: 'pending',
      approvalStatus: selfApprove ? 'approved' : 'pending-approval',
      submittedBy: actor.id,
      submittedAt: new Date().toISOString(),
    });

    if (selfApprove) {
      // Super Admin: approve immediately so the record lands Active with a
      // joining date and an offer letter ready to issue.
      Store.approveEmployee(emp.id, data.siteId || null);
      toast(`${emp.name} created and approved — offer letter ready`, 'success');
    } else {
      toast(`${emp.name} submitted for Super Admin approval`, 'success');
    }
    onSubmitted && onSubmitted(Store.getEmployee(emp.id));
    onClose();
    reset();
  };

  if (!open) return null;

  const sites = Store.getSites();
  const siteOptions = sites.map((s) => ({ value: s.id, label: s.name, sub: [s.city, s.region, s.code].filter(Boolean).join(' · '), keywords: s.code }));

  return (
    <Modal open onClose={onClose} size="xl" icon="user"
      title={selfApprove ? 'Add employee' : 'Add employee — submit for approval'}
      subtitle={selfApprove
        ? 'You are a Super Admin — this record is approved on save.'
        : `Created by ${actor.name} · a Super Admin must approve before the employee goes active.`}
      footer={
        <>
          <label className="flex items-center gap-1.5 text-[11px] text-slate-500 mr-auto cursor-pointer">
            <input type="checkbox" checked={forceFail} onChange={(e) => setForceFail(e.target.checked)} className="accent-brand-700"/>
            Force verification failure (demo)
          </label>
          {step > 0 && <Btn onClick={() => setStep(step - 1)}>Back</Btn>}
          {step < STEPS.length - 1 && (
            <Btn variant="primary" onClick={() => go(step + 1)} disabled={!canNext}>
              Continue<Icon name="chevron-right" className="w-3.5 h-3.5"/>
            </Btn>
          )}
          {step === STEPS.length - 1 && (
            selfApprove
              ? <Btn variant="success" onClick={submit} disabled={!STEPS.every((_, i) => stepValid(i))}>
                  <Icon name="check-circle" className="w-3.5 h-3.5"/>Create &amp; approve
                </Btn>
              : <Btn variant="primary" onClick={submit} disabled={!STEPS.every((_, i) => stepValid(i))}>
                  <Icon name="send" className="w-3.5 h-3.5"/>Submit for Approval
                </Btn>
          )}
        </>
      }>

      <div className="mb-4"><WizardSteps steps={STEPS} step={step} onJump={setStep} furthest={furthest}/></div>

      {/* ---------------- Personal ---------------- */}
      {current.id === 'personal' && (
        <div className="space-y-4">
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
            <PhotoUpload value={data.photoUrl} name={data.name} onChange={(v) => set({ photoUrl: v })}/>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            <Field label="Full name"><Input value={data.name} onChange={(e) => set({ name: e.target.value })} placeholder="Arjun Mehta"/></Field>
            <Field label="Phone"><Input value={data.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+91 98xxx xxxxx"/></Field>
            <EmailField value={data.email} onChange={(v) => set({ email: v })} onValidity={setEmailOk} label="Work email"/>
            <Field label="Date of birth"><Input type="date" value={data.dob} onChange={(e) => set({ dob: e.target.value })}/></Field>
            <Field label="Gender">
              <Select value={data.gender} onChange={(e) => set({ gender: e.target.value })}><option>Male</option><option>Female</option><option>Other</option></Select>
            </Field>
            <Field label="Marital status">
              <Select value={data.maritalStatus} onChange={(e) => set({ maritalStatus: e.target.value })}><option>Single</option><option>Married</option><option>Other</option></Select>
            </Field>
            <Field label="Blood group">
              <Select value={data.bloodGroup} onChange={(e) => set({ bloodGroup: e.target.value })}>
                <option value="">—</option>
                {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map((b) => <option key={b} value={b}>{b}</option>)}
              </Select>
            </Field>
            <Field label="Emergency contact name"><Input value={data.emergencyName} onChange={(e) => set({ emergencyName: e.target.value })} placeholder="Parent / spouse"/></Field>
            <Field label="Emergency contact phone"><Input value={data.emergencyPhone} onChange={(e) => set({ emergencyPhone: e.target.value })} placeholder="+91 …"/></Field>
          </div>
        </div>
      )}

      {/* ---------------- Address ---------------- */}
      {current.id === 'address' && (
        <div className="space-y-3">
          <div className="p-2.5 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 flex items-start gap-2.5">
            <Icon name="pin" className="w-4 h-4 text-brand-700 shrink-0 mt-px"/>
            <div className="text-[12px] text-brand-900 dark:text-brand-100">
              Residential address. Address line 1, city and a valid 6-digit pincode are required.
            </div>
          </div>
          <AddressFields value={data.address} onChange={(v) => set({ address: v })}/>
          {formatAddress(data.address) && (
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500">Preview</div>
              <div className="text-[12px] text-slate-700 dark:text-slate-200 mt-0.5">{formatAddress(data.address)}</div>
            </div>
          )}
        </div>
      )}

      {/* ---------------- Education ---------------- */}
      {current.id === 'education' && (
        <div className="space-y-3">
          <div className="p-2.5 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 flex items-start gap-2.5">
            <Icon name="graduation" className="w-4 h-4 text-brand-700 shrink-0 mt-px"/>
            <div className="text-[12px] text-brand-900 dark:text-brand-100">
              Add each qualification and attach its certificate or marksheet. Optional — you can complete this later from the employee's profile.
            </div>
          </div>
          <EducationEditor education={data.education} onChange={(v) => set({ education: v })}/>
        </div>
      )}

      {/* ---------------- Employment ---------------- */}
      {current.id === 'employment' && (
        <div className="space-y-4">
          {/* Employee type drives onboarding, attendance and payroll rules */}
          <div>
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Employee type</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Store.EMPLOYEE_TYPES.map((t) => (
                <button key={t.id} type="button" onClick={() => setType(t.id)}
                  className={`text-left p-3 rounded-xl border-2 transition ${
                    data.employeeType === t.id
                      ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                  <div className="flex items-center gap-2">
                    <Icon name={t.id === 'field' ? 'pin' : 'briefcase'} className={`w-4 h-4 ${data.employeeType === t.id ? 'text-brand-700' : 'text-slate-400'}`}/>
                    <span className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{t.label}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {t.id === 'field'
                      ? 'Posted to a store · geo-fenced attendance · sales incentives'
                      : 'Desk-based · no geo-fence · fixed monthly pay, no sales incentive'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            <Field label="Designation" hint={`${data.employeeType === 'office' ? 'Office' : 'Field'} career ladder`}>
              <SearchSelect value={data.designation} onChange={(v) => set({ designation: v })} allowCustom
                options={ladder.map((d, i) => ({ value: d, label: d, sub: `Level ${i + 1}` }))}
                placeholder="Select designation…" searchPlaceholder="Search designation…" emptyLabel="Type to add a new one"/>
            </Field>
            <Field label={isOffice ? 'Base location (optional)' : 'Assigned store'} className="lg:col-span-2"
              hint={isOffice ? 'Office staff need not be tied to a store.' : `${sites.length} stores on record`}>
              <SearchSelect value={data.siteId} onChange={(v) => set({ siteId: v })}
                options={[{ value: '', label: '— Unassigned —' }, ...siteOptions]}
                placeholder={isOffice ? '— Head office —' : 'Select a store…'}
                searchPlaceholder="Search store, code or city…" emptyLabel="No store matches"/>
            </Field>
            <Field label="Joining date"><Input type="date" value={data.joiningDate} onChange={(e) => set({ joiningDate: e.target.value })}/></Field>
            <Field label="Base salary (₹ / month)">
              <Input type="number" min="0" step="500" value={data.baseSalary} onChange={(e) => set({ baseSalary: e.target.value })}/>
            </Field>
            <Field label="Travel allowance">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap">
                  <input type="checkbox" checked={data.travelEligible} onChange={(e) => set({ travelEligible: e.target.checked })} className="accent-brand-700 w-4 h-4"/>
                  Eligible
                </label>
                <Input type="number" min="0" step="100" disabled={!data.travelEligible}
                  value={data.travelAmount} onChange={(e) => set({ travelAmount: e.target.value })} className="!w-24"/>
              </div>
            </Field>
          </div>

          {/* Geo-fencing — on by default for field staff, off for office staff */}
          <div className={`rounded-xl border p-3 ${data.geoFenceEnabled ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-900/15' : 'border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/40'}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={data.geoFenceEnabled} onChange={(e) => set({ geoFenceEnabled: e.target.checked })} className="accent-brand-700 w-4 h-4 mt-0.5 shrink-0"/>
              <div className="min-w-0">
                <div className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                  Enable geo-fencing
                  <Badge tone={data.geoFenceEnabled ? 'green' : 'slate'}>{data.geoFenceEnabled ? 'Enabled' : 'Disabled'}</Badge>
                  {!isOffice && <Badge tone="brand">Default for field staff</Badge>}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                  {data.geoFenceEnabled
                    ? 'Clock-in is only accepted inside the assigned store’s radius. This is the default for field employees and can be changed later from the profile.'
                    : 'Attendance is accepted from any location. Normal for office and desktop employees.'}
                </div>
                {isOffice && data.geoFenceEnabled && (
                  <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 flex items-center gap-1">
                    <Icon name="alert" className="w-3 h-3"/>Office employees do not usually need a geo-fence.
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>
      )}

      {/* ---------------- KYC ---------------- */}
      {current.id === 'kyc' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Aadhaar */}
          <Card title="Aadhaar eKYC" bodyClass="p-3"
            right={data.aadhaarVerified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Pending</Badge>}>
            <div className="space-y-2.5">
              <div className="text-[11px] text-slate-500">UIDAI eKYC (simulated). The number is masked before storage.</div>
              <Field label="Aadhaar number">
                <Input value={data.aadhaar} disabled={data.aadhaarVerified}
                  onChange={(e) => set({ aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12) })} placeholder="12-digit UID"/>
              </Field>
              <Field label="OTP">
                <Input value={data.aadhaarOtp} disabled={data.aadhaarVerified}
                  onChange={(e) => set({ aadhaarOtp: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="demo: 123456"/>
              </Field>
              {data.aadhaarVerified
                ? <div className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5"><Icon name="check-circle" className="w-4 h-4"/>XXXX-XXXX-{data.aadhaar.slice(-4)}</div>
                : <Btn variant="primary" className="w-full" disabled={data.aadhaar.length !== 12 || !!loading} onClick={() => verify('aadhaar')}>
                    {loading === 'aadhaar' ? 'Verifying with UIDAI…' : 'Verify Aadhaar'}
                  </Btn>}
            </div>
          </Card>

          {/* PAN */}
          <Card title="PAN" bodyClass="p-3"
            right={data.panVerified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Pending</Badge>}>
            <div className="space-y-2.5">
              <div className="text-[11px] text-slate-500">Name-match against NSDL records (simulated).</div>
              <Field label="PAN number">
                <Input value={data.pan} disabled={data.panVerified}
                  onChange={(e) => set({ pan: e.target.value.toUpperCase().slice(0, 10) })} placeholder="ABCDE1234F"/>
              </Field>
              {data.panVerified
                ? <div className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5"><Icon name="check-circle" className="w-4 h-4"/>{data.pan.slice(0,2)}XXX{data.pan.slice(-4)}</div>
                : <Btn variant="primary" className="w-full" disabled={data.pan.length !== 10 || !!loading} onClick={() => verify('pan')}>
                    {loading === 'pan' ? 'Verifying with NSDL…' : 'Verify PAN'}
                  </Btn>}
            </div>
          </Card>

          {/* Bank */}
          <Card title="Bank account" bodyClass="p-3"
            right={data.bankVerified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Pending</Badge>}>
            <div className="space-y-2.5">
              <div className="text-[11px] text-slate-500">Penny-drop via NPCI — a ₹1 credit confirms ownership.</div>
              <Field label="Account number">
                <Input value={data.bankAcct} disabled={data.bankVerified}
                  onChange={(e) => set({ bankAcct: e.target.value.replace(/\D/g, '') })} placeholder="0123456789"/>
              </Field>
              <Field label="IFSC code">
                <Input value={data.ifsc} disabled={data.bankVerified}
                  onChange={(e) => set({ ifsc: e.target.value.toUpperCase() })} placeholder="HDFC0001234"/>
              </Field>
              {data.bankVerified
                ? <div className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5"><Icon name="check-circle" className="w-4 h-4"/>Penny-drop confirmed</div>
                : <Btn variant="primary" className="w-full" disabled={data.bankAcct.length < 8 || data.ifsc.length < 11 || !!loading} onClick={() => verify('bank')}>
                    {loading === 'bank' ? 'Sending ₹1 penny-drop…' : 'Verify account'}
                  </Btn>}
            </div>
          </Card>
        </div>
      )}

      {/* ---------------- Documents ---------------- */}
      {current.id === 'documents' && (
        <div className="space-y-3">
          <div className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${selfApprove
            ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
            : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'}`}>
            <Icon name={selfApprove ? 'check-circle' : 'clock'} className={`w-4 h-4 shrink-0 mt-px ${selfApprove ? 'text-emerald-600' : 'text-amber-600'}`}/>
            <div className={`text-[12px] ${selfApprove ? 'text-emerald-900 dark:text-emerald-100' : 'text-amber-900 dark:text-amber-100'}`}>
              {selfApprove
                ? 'As a Super Admin your uploads are verified on save — no document review step.'
                : 'Documents you upload are marked Pending Approval and reviewed by a Super Admin.'}
              {' '}JPG, PNG or PDF · max {DOC_MAX_MB} MB each.
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {MOBILE_DOC_LIST.map((d) => {
              const rec = data.docs[d.k];
              return (
                <div key={d.k} className={`p-3 border-2 border-dashed rounded-xl transition ${rec ? 'border-emerald-400 bg-emerald-50/60 dark:bg-emerald-900/20' : 'border-slate-300 dark:border-slate-700'}`}>
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <Icon name={rec ? 'check-circle' : 'file'} className={`w-4 h-4 shrink-0 ${rec ? 'text-emerald-600' : 'text-slate-400'}`}/>
                      <span className="font-semibold text-[12px] text-slate-800 dark:text-slate-100">{d.label}</span>
                      {d.required && !rec && <Badge tone="red">Required</Badge>}
                      {!d.required && !rec && <Badge tone="slate">Optional</Badge>}
                    </div>
                    <button onClick={() => setSampleDoc(d.k)}
                      className="shrink-0 text-[10px] font-semibold text-brand-700 dark:text-brand-300 hover:text-brand-900 underline underline-offset-2">
                      Sample
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-500 mb-2 leading-snug">{d.hint}</div>
                  <label className="block cursor-pointer">
                    <input type="file" accept=".pdf,image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) handleDocFile(d.k, f); }}/>
                    {rec ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-[130px]" title={rec.fileName}>{rec.fileName}</span>
                        <StatusBadge status={selfApprove ? 'verified' : 'uploaded'}/>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition">
                        <Icon name="upload" className="w-3.5 h-3.5 text-slate-400"/>
                        <span className="text-[11px] text-slate-500">Click to upload</span>
                      </div>
                    )}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- Review ---------------- */}
      {current.id === 'review' && (
        <div className="space-y-3">
          <div className={`rounded-xl border p-3 flex items-start gap-3 ${selfApprove
            ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
            : 'bg-brand-50 border-brand-200 dark:bg-brand-900/20 dark:border-brand-800'}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${selfApprove ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40' : 'bg-brand-100 text-brand-700 dark:bg-brand-900/40'}`}>
              <Icon name={selfApprove ? 'check-circle' : 'send'} className="w-5 h-5"/>
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                {selfApprove ? 'This record will be created and approved immediately' : 'This record will be submitted for approval'}
              </div>
              <div className="text-[11.5px] text-slate-600 dark:text-slate-300 mt-0.5">
                {selfApprove
                  ? `${data.name || 'The employee'} goes straight to Active, documents are marked verified, and the digital offer letter becomes available.`
                  : `${data.name || 'The employee'} will sit at the Approval stage until a Super Admin reviews the application and its documents.`}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 lg:col-span-2">
              {data.photoUrl
                ? <img src={data.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover shrink-0"/>
                : <Avatar emp={{ name: data.name || '?', avatarHue: 220 }} size={56}/>}
              <div className="min-w-0">
                <div className="text-[15px] font-bold text-slate-900 dark:text-white truncate">{data.name || '—'}</div>
                <div className="text-[12px] text-slate-500 truncate">{data.designation} · {isOffice ? 'Office employee' : 'Field employee'}</div>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  <StatusBadge status={selfApprove ? 'approved' : 'pending-approval'}/>
                  <Badge tone={data.geoFenceEnabled ? 'green' : 'slate'}>
                    <Icon name="pin" className="w-3 h-3"/>Geo-fence {data.geoFenceEnabled ? 'on' : 'off'}
                  </Badge>
                </div>
              </div>
            </div>

            {[
              ['Contact', [
                ['Phone', data.phone], ['Email', data.email],
                ['Date of birth', data.dob ? fmtDate(data.dob, { year: true }) : '—'],
                ['Emergency', data.emergencyName ? `${data.emergencyName} · ${data.emergencyPhone}` : '—'],
              ]],
              ['Employment', [
                ['Designation', data.designation],
                ['Store', data.siteId ? (Store.getSite(data.siteId) || {}).name : (isOffice ? 'Head office' : '—')],
                ['Joining date', data.joiningDate ? fmtDate(data.joiningDate, { year: true }) : 'On approval'],
                ['Base salary', fmtINR(+data.baseSalary || 0)],
                ['Travel allowance', data.travelEligible ? fmtINR(+data.travelAmount || 0) + ' / month' : 'Not eligible'],
              ]],
              ['Address', [['Residential', formatAddress(data.address) || '—']]],
              ['Verification', [
                ['Aadhaar', data.aadhaarVerified ? `Verified · XXXX-XXXX-${data.aadhaar.slice(-4)}` : 'Not verified'],
                ['PAN', data.panVerified ? `Verified · ${data.pan.slice(0,2)}XXX${data.pan.slice(-4)}` : 'Not verified'],
                ['Bank', data.bankVerified ? 'Verified via penny-drop' : 'Not verified'],
                ['Documents', `${Object.keys(data.docs).length} of ${MOBILE_DOC_LIST.length} uploaded`],
                ['Education', `${data.education.length} qualification${data.education.length === 1 ? '' : 's'} · ${data.education.reduce((n, e) => n + (e.documents || []).length, 0)} certificate(s)`],
              ]],
            ].map(([section, rows]) => (
              <div key={section} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wide text-slate-500">{section}</div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-[12px]">
                  {rows.map(([k, v]) => (
                    <div key={k} className="px-3 py-1.5 flex justify-between gap-4">
                      <div className="text-slate-500 shrink-0">{k}</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-100 text-right min-w-0 break-words">{v || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sampleDoc && <SampleDocModal docKey={sampleDoc} onClose={() => setSampleDoc(null)}/>}
    </Modal>
  );
}

/* ============================================================================
   Digital offer letter

   Rebuilt as a real document rather than a grid of boxes: a proper letterhead,
   a body that reads as prose, a numbered terms section, and a signature block
   that stays with the text. Print rules matter as much as screen rules here —
   `.sheet` is A4-width with fixed padding so the printed page matches what is
   on screen, and `break-inside: avoid` keeps clauses and the signature block
   from being split across pages.
   ========================================================================== */
const COMPANY = {
  name: 'S.D. Computronix Pvt. Ltd.',
  address: '410, Prestige Tower, Andheri East, Mumbai 400059, Maharashtra, India',
  cin: 'U72900MH2014PTC258912',
  email: 'people@sdc.in',
  phone: '+91 22 4000 1200',
  signatory: { name: 'Neha Kapoor', title: 'Head of People Operations' },
};

function OfferLetterModal({ emp, open, onClose }) {
  if (!open || !emp) return null;
  const site = Store.getSite(emp.siteId);
  const issued = emp.approvedAt ? new Date(emp.approvedAt) : Store.TODAY;
  const joining = emp.joiningDate ? new Date(emp.joiningDate) : issued;
  const isOffice = emp.employeeType === 'office';
  const designation = emp.designation || (isOffice ? 'Executive' : 'Field Technician');
  const ref = `SDC/OL/${emp.code}/${issued.getFullYear()}`;
  const travel = emp.travelEligible ? (emp.travelAmount || 0) : 0;
  const annual = (emp.baseSalary || 0) * 12 + travel * 12;

  const TERMS = [
    ['Reporting & place of work', isOffice
      ? `You will be based at the Company's registered office and will report to your assigned department head. The Company may change your place of work with reasonable notice.`
      : `You will be deployed at ${site ? site.name : 'a client store to be advised'} and will report to the Store Manager for that location, and thereafter through the Team Lead for the cluster. The Company may reassign you to another store with reasonable notice.`],
    ['Working hours & attendance', isOffice
      ? `Standard working hours are 09:30 to 18:30, Monday to Saturday, as set out in the Attendance Policy. Attendance is recorded through the Company's HRMS application.`
      : `Your shift at the assigned store is ${site ? `${site.shiftStart} to ${site.shiftEnd}` : 'as published for that location'}. Attendance is recorded by clock-in and clock-out through the Company's HRMS application${emp.geoFenceEnabled === false ? '.' : ', which captures a live photograph and your location at the store.'}`],
    ['Remuneration', `Your fixed monthly salary is ${fmtINR(emp.baseSalary || 0)}${travel ? `, together with a travel allowance of ${fmtINR(travel)} per month` : ''}. Salary is credited by NEFT to your verified bank account on the first working day of the following month. Statutory deductions (Provident Fund, ESIC and Professional Tax) apply as per prevailing law. Days absent without approved leave or an approved regularisation are deducted on a pro-rata basis.`],
    ['Variable pay & incentive', isOffice
      ? `This role does not carry a sales incentive component.`
      : `You are eligible for a monthly sales incentive computed under the incentive scheme applicable to your store. Where both a store-target incentive and an incentive slab apply, the Company pays whichever yields the higher eligible amount, subject to the monthly ceiling notified from time to time.`],
    ['Probation & confirmation', `You will be on probation for three (3) months from your date of joining. Confirmation in service follows a satisfactory performance review at the end of that period. The Company may extend the probation period at its discretion.`],
    ['Leave', `Leave entitlement, accrual and approval are governed by the Company's Leave Policy, a copy of which is available to you in the HRMS document library.`],
    ['Conduct & confidentiality', `You agree to observe the Company's Code of Conduct and Information Security Policy. You shall keep confidential all customer, commercial and technical information you come to know in the course of your employment, both during and after your employment.`],
    ['Company property', `Any device, tool, uniform or other asset issued to you remains the property of the Company and must be returned in good condition on separation.`],
    ['Notice period', `Either party may terminate this employment by giving thirty (30) days' written notice, or salary in lieu of notice, after confirmation. During probation, the notice period is seven (7) days.`],
    ['Governing law', `This offer and your employment are governed by the laws of India, and the courts at Mumbai shall have exclusive jurisdiction.`],
  ];

  return (
    <Modal open onClose={onClose} size="xl" icon="file"
      title="Digital Offer / Joining Letter" subtitle={`${emp.name} · Ref ${ref}`}
      bodyClass="p-0 bg-slate-100 dark:bg-slate-950"
      footer={<>
        <Btn className="no-print" onClick={() => window.print()}><Icon name="print" className="w-3.5 h-3.5"/>Print / Save as PDF</Btn>
        <Btn variant="primary" className="no-print" onClick={onClose}>Close</Btn>
      </>}>

      {/* Print rules scoped to the letter so they cannot affect other print areas. */}
      <style>{`
        .offer-sheet { width: 100%; max-width: 210mm; margin: 0 auto; background: #fff; color: #0f172a; }
        .offer-sheet .clause { break-inside: avoid; page-break-inside: avoid; }
        .offer-sheet .sign-block { break-inside: avoid; page-break-inside: avoid; }
        @media print {
          .offer-sheet { max-width: none; box-shadow: none !important; margin: 0; }
          .offer-sheet .running-head { position: running(head); }
        }
      `}</style>

      <div className="p-4 sm:p-6 overflow-auto">
        <div className="print-area offer-sheet shadow-card rounded-lg overflow-hidden">
          <div className="px-8 sm:px-12 py-8 sm:py-10">

            {/* Letterhead */}
            <header className="flex items-start justify-between gap-6 pb-4 border-b-2 border-slate-800">
              <BrandLogo size={38}/>
              <div className="text-right text-[10.5px] leading-relaxed text-slate-600">
                <div className="font-bold text-slate-800 text-[11.5px]">{COMPANY.name}</div>
                <div>{COMPANY.address}</div>
                <div>CIN: {COMPANY.cin}</div>
                <div>{COMPANY.email} · {COMPANY.phone}</div>
              </div>
            </header>

            {/* Reference line */}
            <div className="flex items-baseline justify-between mt-5 text-[11px] text-slate-600">
              <div><span className="font-semibold text-slate-700">Ref:</span> {ref}</div>
              <div><span className="font-semibold text-slate-700">Date:</span> {fmtDate(issued, { year: true })}</div>
            </div>

            {/* Title */}
            <div className="mt-6 text-center">
              <div className="text-[15px] font-extrabold tracking-[0.14em] uppercase text-slate-900">Letter of Appointment</div>
              <div className="mx-auto mt-1.5 w-20 h-px bg-slate-400"/>
            </div>

            {/* Addressee */}
            <div className="mt-6 text-[12px] leading-relaxed text-slate-700">
              <div className="font-bold text-slate-900 text-[13px]">{emp.name}</div>
              {formatAddress(emp.address) && <div className="mt-0.5 max-w-md">{formatAddress(emp.address)}</div>}
              {emp.phone && <div className="mt-0.5">{emp.phone}{emp.email ? ` · ${emp.email}` : ''}</div>}
            </div>

            <div className="mt-5 text-[12.5px] font-semibold text-slate-900">Dear {emp.name.split(' ')[0]},</div>

            <p className="mt-3 text-[12.5px] leading-[1.75] text-slate-700 text-justify">
              Further to your application and the selection process, we are pleased to offer you employment with{' '}
              <span className="font-semibold">{COMPANY.name}</span> in the position of{' '}
              <span className="font-semibold">{designation}</span>
              {site ? <> at <span className="font-semibold">{site.name}</span>, {site.city}</> : null}
              , with effect from <span className="font-semibold">{fmtDate(joining, { year: true })}</span>.
              The principal terms of your appointment are summarised below and set out in full in the clauses that follow.
            </p>

            {/* Terms summary table */}
            <table className="w-full mt-5 text-[11.5px] border border-slate-300 border-collapse">
              <tbody>
                {[
                  ['Employee code', emp.code],
                  ['Designation', designation],
                  ['Employment type', isOffice ? 'Office / Desktop Employee' : 'Field / Store Employee'],
                  ['Place of posting', site ? `${site.name}, ${site.city}` : 'Registered office, Mumbai'],
                  ['Reporting to', isOffice ? 'Department Head' : (Store.getStoreManager(emp.siteId) || {}).name || 'Store Manager'],
                  ['Working hours', isOffice ? '09:30 – 18:30' : (site ? `${site.shiftStart} – ${site.shiftEnd}` : 'As published for the store')],
                  ['Fixed monthly salary', fmtINR(emp.baseSalary || 0)],
                  ['Travel allowance', travel ? `${fmtINR(travel)} per month` : 'Not applicable'],
                  ['Variable / incentive', isOffice ? 'Not applicable' : 'As per the incentive scheme for your store'],
                  ['Indicative annual fixed pay', fmtINR(annual)],
                  ['Date of joining', fmtDate(joining, { year: true })],
                  ['Probation period', '3 months from date of joining'],
                ].map(([k, v], i) => (
                  <tr key={k} className={i % 2 ? 'bg-slate-50' : ''}>
                    <th className="text-left align-top font-semibold text-slate-600 border border-slate-300 px-2.5 py-1.5 w-[38%]">{k}</th>
                    <td className="align-top font-semibold text-slate-900 border border-slate-300 px-2.5 py-1.5">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Numbered terms */}
            <div className="mt-6">
              <div className="text-[12px] font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
                Terms &amp; Conditions of Employment
              </div>
              <ol className="mt-3 space-y-3">
                {TERMS.map(([heading, body], i) => (
                  <li key={heading} className="clause flex gap-2.5 text-[11.5px] leading-[1.7] text-slate-700">
                    <span className="font-bold text-slate-900 shrink-0 w-5 text-right">{i + 1}.</span>
                    <span className="text-justify">
                      <span className="font-bold text-slate-900">{heading}. </span>{body}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <p className="mt-5 text-[12px] leading-[1.75] text-slate-700 text-justify clause">
              This offer is made on the basis of the information and documents furnished by you and is subject to their verification.
              Please signify your acceptance by signing and returning a copy of this letter, or by accepting it in the Company's HRMS
              application, on or before <span className="font-semibold">{fmtDate(new Date(joining.getTime() - 2 * 86400000), { year: true })}</span>.
            </p>
            <p className="mt-3 text-[12px] leading-[1.75] text-slate-700 clause">
              We look forward to welcoming you to the team.
            </p>

            {/* Signature block */}
            <div className="sign-block mt-10 grid grid-cols-2 gap-10">
              <div>
                <div className="text-[11px] text-slate-600 mb-10">Yours sincerely,</div>
                <div className="border-b border-slate-500"/>
                <div className="text-[11px] text-slate-700 mt-1.5 leading-relaxed">
                  <div className="font-bold text-slate-900">{COMPANY.signatory.name}</div>
                  <div>{COMPANY.signatory.title}</div>
                  <div>For {COMPANY.name}</div>
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-600 mb-10">Accepted and agreed,</div>
                <div className="border-b border-slate-500"/>
                <div className="text-[11px] text-slate-700 mt-1.5 leading-relaxed">
                  <div className="font-bold text-slate-900">{emp.name}</div>
                  <div>Employee code: {emp.code}</div>
                  <div>Date: ______________________</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <footer className="mt-10 pt-3 border-t border-slate-300">
              <p className="text-[10px] leading-relaxed text-slate-500 text-center italic">
                This is a computer-generated document and does not require a physical signature unless otherwise
                specified by the company.
              </p>
              <div className="flex items-center justify-between mt-2 text-[9.5px] text-slate-400">
                <span>{COMPANY.name} · CIN {COMPANY.cin}</span>
                <span>Ref {ref}</span>
                <span>Page 1 of 1</span>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================================
   Company policies & HR documents

   One library, two audiences. `PolicyLibrary` is the read/download view an
   employee sees during onboarding; the same component in manage mode gives HR
   and Super Admin add / edit / replace / version / activate controls.
   ========================================================================== */
const POLICY_CATEGORIES = ['Policy', 'Handbook', 'Payroll', 'IT', 'Security', 'Compliance', 'Other'];

function PolicyEditorModal({ policy, onClose, user }) {
  const toast = useToast();
  const isNew = !policy.id;
  const [draft, setDraft] = useState(() => ({
    id: policy.id || null, title: policy.title || '', category: policy.category || 'Policy',
    summary: policy.summary || '', version: policy.version || '1.0',
    fileName: policy.fileName || '', active: policy.active !== false,
    acknowledgeRequired: policy.acknowledgeRequired !== false,
  }));
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  /* Replacing the file is what makes this a new version, so bumping the minor
     version automatically keeps the two in step. */
  const replaceFile = (file) => {
    if (!file) return;
    const err = validateDocFile(file);
    if (err) { toast(err, 'error'); return; }
    const [maj, min] = String(draft.version || '1.0').split('.').map((n) => parseInt(n, 10) || 0);
    set({ fileName: file.name, version: `${maj}.${min + 1}` });
    toast(`New version staged — v${maj}.${min + 1}`, 'success');
  };

  const save = () => {
    if (!draft.title.trim()) { toast('Document title is required', 'error'); return; }
    Store.upsertPolicy({ ...draft, title: draft.title.trim(), body: draft.summary }, user.name);
    toast(isNew ? 'Document added to the library' : 'Document updated', 'success');
    onClose();
  };

  return (
    <Modal open onClose={onClose} size="lg" icon="book"
      title={isNew ? 'Add HR document' : `Edit — ${policy.title}`}
      subtitle={isNew ? 'Published to the onboarding library once active' : `Current version v${policy.version}`}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={save}><Icon name="check" className="w-3.5 h-3.5"/>Save document</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Field label="Title" className="sm:col-span-2">
            <Input value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="Attendance Policy"/>
          </Field>
          <Field label="Category">
            <Select value={draft.category} onChange={(e) => set({ category: e.target.value })}>
              {POLICY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Summary" hint="Shown to employees in the onboarding library.">
          <Textarea value={draft.summary} onChange={(e) => set({ summary: e.target.value })}
            placeholder="What this document covers and who it applies to…"/>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Field label="Version"><Input value={draft.version} onChange={(e) => set({ version: e.target.value })} placeholder="1.0"/></Field>
          <Field label="File" hint="Uploading a replacement bumps the version.">
            <div className="flex items-center gap-1.5">
              <div className="flex-1 min-w-0 h-8 px-2.5 flex items-center rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[12px] text-slate-600 dark:text-slate-300">
                <Icon name="file" className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0"/>
                <span className="truncate">{draft.fileName || 'No file attached'}</span>
              </div>
              <label className="shrink-0">
                <input type="file" accept=".pdf,image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; replaceFile(f); }}/>
                <span className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md bg-brand-700 hover:bg-brand-800 text-white text-[12px] font-semibold cursor-pointer">
                  <Icon name="upload" className="w-3.5 h-3.5"/>{draft.fileName ? 'Replace' : 'Upload'}
                </span>
              </label>
            </div>
          </Field>
        </div>
        <div className="flex flex-wrap gap-4 pt-1">
          <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
            <input type="checkbox" checked={draft.active} onChange={(e) => set({ active: e.target.checked })} className="accent-brand-700 w-4 h-4"/>
            Active — visible to employees
          </label>
          <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
            <input type="checkbox" checked={draft.acknowledgeRequired} onChange={(e) => set({ acknowledgeRequired: e.target.checked })} className="accent-brand-700 w-4 h-4"/>
            Acknowledgement required during onboarding
          </label>
        </div>
      </div>
    </Modal>
  );
}

function PolicyLibrary({ user, manage }) {
  const store = useStore();
  const toast = useToast();
  const { confirm, ConfirmUI } = useConfirm();
  const [editing, setEditing] = useState(null);
  const [reading, setReading] = useState(null);
  const [q, setQ] = useState('');
  const canEdit = manage && can(user, 'policy.edit');

  const all = store.getPolicies();
  const list = (canEdit ? all : all.filter((p) => p.active))
    .filter((p) => !q || `${p.title} ${p.category} ${p.summary}`.toLowerCase().includes(q.toLowerCase()));

  const remove = async (p) => {
    const ok = await confirm({ title: `Delete "${p.title}"?`, body: 'The document is removed from the library for everyone.', confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    Store.deletePolicy(p.id);
    toast('Document deleted', 'warn');
  };

  return (
    <>
      <Card noBody
        title="Company policies & HR documents"
        subtitle={canEdit
          ? `${all.length} document${all.length === 1 ? '' : 's'} · ${all.filter((p) => p.active).length} active`
          : 'Read or download the documents that apply to you'}
        right={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <Icon name="search" className="w-3.5 h-3.5 text-slate-400"/>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents…"
                className="bg-transparent text-[12px] outline-none w-32 dark:text-slate-100"/>
            </div>
            {canEdit && (
              <Btn size="xs" variant="primary" onClick={() => setEditing({})}>
                <Icon name="plus" className="w-3 h-3"/>Add document
              </Btn>
            )}
          </div>
        }>
        {list.length === 0 ? (
          <Empty icon="book" title="No documents" hint={q ? 'Nothing matches that search.' : 'The library is empty.'}/>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-slate-100 dark:bg-slate-800">
            {list.map((p) => (
              <div key={p.id} className={`p-3 bg-white dark:bg-slate-900 flex flex-col gap-2 ${!p.active ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
                    <Icon name="book" className="w-4 h-4"/>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100 truncate" title={p.title}>{p.title}</div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge tone="slate">{p.category}</Badge>
                      <Badge tone="brand">v{p.version}</Badge>
                      <StatusBadge status={p.active ? 'active' : 'inactive'}/>
                      {p.acknowledgeRequired && <Badge tone="amber">Acknowledge</Badge>}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">{p.summary}</div>
                <div className="text-[10px] text-slate-400 mt-auto">Updated {fmtDate(p.updatedAt, { year: true })} by {p.updatedBy}</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Btn size="xs" onClick={() => setReading(p)}><Icon name="eye" className="w-3 h-3"/>Read</Btn>
                  <Btn size="xs" onClick={() => toast(`Downloading ${p.fileName}`, 'info')}><Icon name="download" className="w-3 h-3"/>Download</Btn>
                  {canEdit && <>
                    <Btn size="xs" onClick={() => setEditing(p)}><Icon name="edit" className="w-3 h-3"/>Edit</Btn>
                    <Btn size="xs" onClick={() => { Store.togglePolicy(p.id); toast(p.active ? 'Marked inactive' : 'Marked active', 'success'); }}>
                      {p.active ? 'Deactivate' : 'Activate'}
                    </Btn>
                    <Btn size="xs" variant="danger" onClick={() => remove(p)}><Icon name="trash" className="w-3 h-3"/></Btn>
                  </>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {editing && <PolicyEditorModal policy={editing} user={user} onClose={() => setEditing(null)}/>}
      {reading && (
        <Modal open onClose={() => setReading(null)} size="lg" icon="book"
          title={reading.title} subtitle={`${reading.category} · v${reading.version} · updated ${fmtDate(reading.updatedAt, { year: true })}`}
          footer={<>
            <Btn onClick={() => toast(`Downloading ${reading.fileName}`, 'info')}><Icon name="download" className="w-3.5 h-3.5"/>Download PDF</Btn>
            <Btn variant="primary" onClick={() => setReading(null)}>Close</Btn>
          </>}>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500">Summary</div>
              <div className="text-[12.5px] text-slate-700 dark:text-slate-200 leading-relaxed mt-1">{reading.summary}</div>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 text-[12px]">
              {[
                ['Document', reading.fileName],
                ['Category', reading.category],
                ['Version', 'v' + reading.version],
                ['Status', reading.active ? 'Active' : 'Inactive'],
                ['Acknowledgement', reading.acknowledgeRequired ? 'Required during onboarding' : 'Not required'],
                ['Last updated', `${fmtDate(reading.updatedAt, { year: true })} by ${reading.updatedBy}`],
              ].map(([k, v]) => (
                <div key={k} className="px-3 py-2 flex justify-between gap-4">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100 text-right">{v}</span>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-slate-400 italic text-center">
              Full document text is served from the attached file — this preview shows the published summary and metadata.
            </div>
          </div>
        </Modal>
      )}
      {ConfirmUI}
    </>
  );
}

Object.assign(window, {
  OnboardingWizard, OfferLetterModal, SampleDocModal,
  EducationEditor, AddressFields, WizardSteps, formatAddress, blankEducation,
  PolicyLibrary, PolicyEditorModal, POLICY_CATEGORIES, COMPANY,
  EDU_LEVELS, EDU_DOC_TYPES,
  SAMPLE_DOCS, DOC_MAX_MB, DOC_ALLOWED_TYPES, validateDocFile,
});
