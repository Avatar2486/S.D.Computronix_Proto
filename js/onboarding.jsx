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

   Approval rule (spec §4 / §23): an Admin creating a record approves it
   outright and the employee goes straight to Active. Anyone else submits it and
   it sits in the queue as Pending Approval until an Admin clears it. The
   footer button, the review panel and the documents step all read the same
   `selfApprove` flag so they can never disagree.
   ========================================================================== */
/* OTP + government-document sequencing shared by the desktop wizard (and
   mirrored, not duplicated, in the mobile self-onboarding flow's own state).
   Fixed demo code, generous but finite retry budget, and a real expiry window
   so "failure/retry/expiry" are all reachable states rather than only
   "success" and a fake "force failure" toggle. */
const ONB_OTP_CODE = '123456';
const ONB_OTP_RESEND_MS = 30000;
const ONB_OTP_EXPIRY_MS = 120000;
const ONB_OTP_MAX_ATTEMPTS = 5;
const GOV_DOC_KEYS = ['aadhaar', 'pan', 'bank']; // these three carry a number + OTP; photo/address are file-only

function blankKycDoc(key) {
  return { number: '', ifsc: key === 'bank' ? '' : undefined, otp: '', otpSent: false, otpSentAt: null,
    canResend: false, attempts: 0, verified: false, verifiedAt: null, file: null };
}

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
    employmentBasis: 'contract',
    pf: { applicable: false, uan: '' }, tds: { applicable: false },
    baseSalary: 15000, salaryCycle: 'monthly', travelEligible: false, travelAmount: 1500, geoFenceEnabled: true,
    skippedSteps: [],
    kyc: {
      aadhaar: blankKycDoc('aadhaar'), pan: blankKycDoc('pan'), bank: blankKycDoc('bank'),
      photo: { file: null }, address: { file: null, skipped: false },
    },
    docStep: 0,
  };
  const [data, setData] = useState(BLANK);
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [emailOk, setEmailOk] = useState(false);
  const [sampleDoc, setSampleDoc] = useState(null);
  const set = (patch) => setData((d) => ({ ...d, ...patch }));
  const setKyc = (key, patch) => setData((d) => ({
    ...d, kyc: { ...d.kyc, [key]: { ...d.kyc[key], ...(typeof patch === 'function' ? patch(d.kyc[key]) : patch) } },
  }));

  const isOffice = data.employeeType === 'office';
  const ladder = Store.DESIGNATION_LADDERS[data.employeeType] || Store.DESIGNATION_LADDERS.field;

  /* Switching employee type re-bases the fields that only make sense for one of
     them: office staff lose the store and the geo-fence, field staff regain it.
     Employment basis defaults with it (contract for field, full-time for
     office) but stays a genuinely independent, always-editable choice — not
     every field hire is on contract and not every office hire is full-time. */
  const setType = (type) => {
    const office = type === 'office';
    set({
      employeeType: type,
      geoFenceEnabled: !office,
      siteId: office ? '' : data.siteId,
      designation: (Store.DESIGNATION_LADDERS[type] || [])[office ? 0 : 1] || '',
      employmentBasis: office ? 'full-time' : 'contract',
      pf: { ...data.pf, applicable: office },
    });
  };

  const STEPS = [
    { id: 'personal',   label: 'Personal' },
    { id: 'address',    label: 'Address' },
    { id: 'education',  label: 'Education' },
    { id: 'employment', label: 'Employment' },
    { id: 'documents',  label: 'Documents' },
    { id: 'review',     label: 'Review' },
  ];
  const current = STEPS[step];

  /* ---- OTP + sequential document verification ----
     A document's number is editable up to the moment an OTP is sent for it —
     sending locks the number so the OTP actually vouches for what is on
     record, not for whatever was typed last. "Change number" is the only way
     back in, and it always costs a fresh OTP cycle. */
  const sendOtp = (key) => {
    setKyc(key, { otpSent: true, otpSentAt: Date.now(), otp: '', attempts: 0, canResend: false, verified: false, verifiedAt: null });
    setTimeout(() => setKyc(key, { canResend: true }), ONB_OTP_RESEND_MS);
    toast(`OTP sent (demo code: ${ONB_OTP_CODE})`, 'info');
  };
  const verifyOtp = (key) => {
    const rec = data.kyc[key];
    if (!rec.otpSent) return;
    if (Date.now() - rec.otpSentAt > ONB_OTP_EXPIRY_MS) { toast('OTP expired — resend to try again', 'error'); return; }
    if (rec.otp !== ONB_OTP_CODE) {
      const attempts = rec.attempts + 1;
      setKyc(key, { attempts });
      toast(attempts >= ONB_OTP_MAX_ATTEMPTS ? 'Too many incorrect attempts — resend a new OTP' : `Incorrect OTP — ${ONB_OTP_MAX_ATTEMPTS - attempts} attempt${ONB_OTP_MAX_ATTEMPTS - attempts === 1 ? '' : 's'} left`, 'error');
      return;
    }
    setKyc(key, { verified: true, verifiedAt: new Date().toISOString() });
    toast(`${key === 'aadhaar' ? 'Aadhaar' : key === 'pan' ? 'PAN' : 'Bank account'} verified`, 'success');
  };
  const changeNumber = (key) => setKyc(key, (prev) => ({ ...blankKycDoc(key), file: prev.file }));
  const handleKycFile = (key, file) => {
    const err = validateDocFile(file);
    if (err) { toast(err, 'error'); return; }
    setKyc(key, { file: { fileName: file.name, size: file.size, type: file.type } });
  };
  const kycDocDone = (key) => (GOV_DOC_KEYS.includes(key)
    ? data.kyc[key].verified && !!data.kyc[key].file
    : key === 'photo' ? !!data.kyc.photo.file : true); // address is optional — never blocks
  const requiredDocsDone = ['aadhaar', 'pan', 'bank', 'photo'].every(kycDocDone);

  const stepValid = (i) => {
    const id = STEPS[i].id;
    if (id === 'personal')   return !!(data.name.trim() && data.phone.trim() && emailOk);
    if (id === 'address')    return !!(data.address.line1.trim() && data.address.city.trim() && /^\d{6}$/.test(String(data.address.pincode || '')));
    if (id === 'education')  return true; // optional by design — many field hires have none on file
    if (id === 'employment') return !!(data.designation && (isOffice || data.siteId) && +data.baseSalary > 0 && data.salaryCycle);
    if (id === 'documents')  return requiredDocsDone;
    return true;
  };
  const canNext = stepValid(step);
  const go = (i) => { setStep(i); setFurthest((f) => Math.max(f, i)); };

  const skipEducation = () => {
    set({ skippedSteps: [...new Set([...data.skippedSteps, 'education'])] });
    toast('Education skipped — add it later from the employee profile', 'info');
    go(step + 1);
  };

  const reset = () => { setData(BLANK); setStep(0); setFurthest(0); setEmailOk(false); };

  const submit = () => {
    // Documents follow the same approval rule as the record itself. Each
    // carries the OTP-verification audit timestamp alongside the upload, not
    // just a boolean — "verified" now means something traceable.
    const docStatus = selfApprove ? 'verified' : 'uploaded';
    const documents = {};
    Object.entries(data.kyc).forEach(([k, v]) => {
      if (!v.file) return;
      documents[k] = {
        status: docStatus, fileName: v.file.fileName, size: v.file.size, uploadedAt: new Date().toISOString(),
        otpVerifiedAt: v.verifiedAt || null,
      };
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
      employmentBasis: data.employmentBasis,
      pf: { ...data.pf, uan: data.pf.applicable ? data.pf.uan.trim() : '' },
      tds: { ...data.tds },
      role: isOffice ? 'hr-manager' : 'field-employee',
      designation: data.designation,
      designationHistory: [{ from: null, to: data.designation, at: new Date().toISOString(), by: actor.id, note: 'Initial designation' }],
      siteId: data.siteId || null,
      joiningDate: data.joiningDate || '',
      baseSalary: +data.baseSalary || 0,
      salaryCycle: data.salaryCycle,
      travelEligible: !!data.travelEligible,
      travelAmount: data.travelEligible ? +data.travelAmount || 0 : 0,
      geoFenceEnabled: !!data.geoFenceEnabled,
      aadhaarMasked: 'XXXX-XXXX-' + data.kyc.aadhaar.number.slice(-4).padStart(4, '0'),
      panMasked: data.kyc.pan.number.slice(0, 2) + 'XXX' + data.kyc.pan.number.slice(-4),
      bankVerified: data.kyc.bank.verified, ifsc: data.kyc.bank.ifsc,
      documents,
      onboardingSkipped: data.skippedSteps,
      status: 'pending',
      approvalStatus: selfApprove ? 'approved' : 'pending-approval',
      submittedBy: actor.id,
      submittedAt: new Date().toISOString(),
    });

    if (selfApprove) {
      // Admin: approve immediately so the record lands Active with a
      // joining date and an offer letter ready to issue.
      Store.approveEmployee(emp.id, data.siteId || null);
      toast(`${emp.name} created and approved — offer letter ready`, 'success');
    } else {
      toast(`${emp.name} submitted for Admin approval`, 'success');
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
        ? 'You are an Admin — this record is approved on save.'
        : `Created by ${actor.name} · an Admin must approve before the employee goes active.`}
      footer={
        <>
          {data.skippedSteps.length > 0 && (
            <span className="mr-auto text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
              <Icon name="alert" className="w-3.5 h-3.5"/>{data.skippedSteps.length} section{data.skippedSteps.length === 1 ? '' : 's'} skipped
            </span>
          )}
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
          <div className="p-2.5 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5">
              <Icon name="graduation" className="w-4 h-4 text-brand-700 shrink-0 mt-px"/>
              <div className="text-[12px] text-brand-900 dark:text-brand-100">
                Add each qualification and attach its certificate or marksheet. Optional — not required for activation.
              </div>
            </div>
            {data.education.length === 0 && !data.skippedSteps.includes('education') && (
              <button type="button" onClick={skipEducation} className="shrink-0 text-[11px] font-semibold text-brand-700 dark:text-brand-300 underline underline-offset-2 whitespace-nowrap">
                Skip for now
              </button>
            )}
          </div>
          {data.skippedSteps.includes('education') && data.education.length === 0 && (
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Icon name="alert" className="w-3.5 h-3.5 text-amber-500"/>Skipped — will show as a pending item on the onboarding checklist and the employee's profile.
            </div>
          )}
          <EducationEditor education={data.education} onChange={(v) => set({ education: v, skippedSteps: v.length ? data.skippedSteps.filter((s) => s !== 'education') : data.skippedSteps })}/>
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

          {/* Employment basis — a separate axis from Employee type: field/office
             is about WHERE someone works, contract/full-time is about HOW they
             are employed. Technicians default to contract (spec §3.6) but the
             choice is always open — not every field hire is on contract. */}
          <div>
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Employment basis</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Store.EMPLOYMENT_BASIS.map((b) => (
                <button key={b.id} type="button"
                  onClick={() => set({ employmentBasis: b.id, pf: { ...data.pf, applicable: b.id === 'full-time' } })}
                  className={`text-left p-3 rounded-xl border-2 transition ${
                    data.employmentBasis === b.id
                      ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                  <span className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{b.label}</span>
                  <div className="text-[11px] text-slate-500 mt-1">{b.hint}</div>
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
            <Field label="Base salary (₹ / month)" hint={data.baseSalary ? numberToWordsIndian(+data.baseSalary) : undefined}>
              <Input type="number" min="0" step="500" value={data.baseSalary} onChange={(e) => set({ baseSalary: e.target.value })}/>
            </Field>
            <Field label="Salary cycle">
              <Select value={data.salaryCycle} onChange={(e) => set({ salaryCycle: e.target.value })}>
                <option value="monthly">Monthly</option>
                <option value="bi-weekly">Bi-weekly</option>
              </Select>
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

          {/* Reporting line — read-only, derived from the store's own manager
             assignments (never invented). Shows once a store is picked; a
             newly-opened store with no assignments yet shows the placeholder
             it already has everywhere else in the app. */}
          {!isOffice && data.siteId && (() => {
            const site = Store.getSite(data.siteId);
            const mgr = site && site.managerId ? Store.getEmployee(site.managerId) : null;
            const tl = site ? Store.getTeamLead(site.teamLeadId) : null;
            const bm = site ? Store.getBusinessManager(site.bmId) : null;
            return (
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
                <Icon name="users" className="w-4 h-4 text-slate-400 shrink-0 mt-px"/>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  Reporting line for this store: <span className="font-semibold text-slate-800 dark:text-slate-100">
                    Technician → {mgr ? mgr.name : 'Store Manager (unassigned)'} → {tl ? tl.name : 'Team Lead (unassigned)'} → {bm ? bm.name : 'Business Manager (unassigned)'}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Statutory configuration — PF only ever applies when explicitly
             turned on; contract staff never have it implied. TDS applicability
             is a business decision this prototype does not have real rates
             for, so it is captured as a choice with an explanation, not
             computed. */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-3">
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Statutory configuration</div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={data.pf.applicable} onChange={(e) => set({ pf: { ...data.pf, applicable: e.target.checked } })}
                className="accent-brand-700 w-4 h-4 mt-0.5 shrink-0"/>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                  Provident Fund (PF) applicable
                  {data.employmentBasis === 'contract' && !data.pf.applicable && <Badge tone="slate">Not implied for contract staff</Badge>}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                  {data.employmentBasis === 'full-time'
                    ? 'Default for Full-time employment — clear the box if this person is exempt.'
                    : 'Off by default for Contract employment. PF is never assumed unless turned on here.'}
                </div>
                {data.pf.applicable && (
                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <Field label="UAN (if already allotted)"><Input value={data.pf.uan} onChange={(e) => set({ pf: { ...data.pf, uan: e.target.value } })} placeholder="12-digit UAN, optional at this stage"/></Field>
                  </div>
                )}
              </div>
            </label>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">Tax Deducted at Source (TDS)</div>
                <Select value={data.tds.applicable ? 'yes' : 'no'} onChange={(e) => set({ tds: { applicable: e.target.value === 'yes' } })} className="!w-auto">
                  <option value="no">Not applicable</option>
                  <option value="yes">Applicable</option>
                </Select>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Prototype placeholder — this records the choice and shows it on the payslip; it does not compute a real
                deduction. Actual TDS applicability depends on total annual compensation and declarations this demo
                does not model.
              </div>
            </div>
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

      {/* ---------------- Documents (sequential: one government document at a
          time — number, OTP, then the file for it, before moving on) ---------------- */}
      {current.id === 'documents' && (() => {
        const docKey = MOBILE_DOC_LIST[data.docStep].k;
        const isGov = GOV_DOC_KEYS.includes(docKey);
        const rec = data.kyc[docKey];
        const docMeta = MOBILE_DOC_LIST[data.docStep];
        const otpExpired = rec.otpSent && Date.now() - rec.otpSentAt > ONB_OTP_EXPIRY_MS;
        const numberValid = docKey === 'aadhaar' ? rec.number.length === 12
          : docKey === 'pan' ? rec.number.length === 10
          : docKey === 'bank' ? rec.number.length >= 8 && rec.ifsc.length >= 11
          : true;
        const done = kycDocDone(docKey);

        return (
          <div className="space-y-3">
            <div className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${selfApprove
              ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
              : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'}`}>
              <Icon name={selfApprove ? 'check-circle' : 'clock'} className={`w-4 h-4 shrink-0 mt-px ${selfApprove ? 'text-emerald-600' : 'text-amber-600'}`}/>
              <div className={`text-[12px] ${selfApprove ? 'text-emerald-900 dark:text-emerald-100' : 'text-amber-900 dark:text-amber-100'}`}>
                {selfApprove
                  ? 'As an Admin your uploads are verified on save — no document review step.'
                  : 'Documents you upload are marked Pending Approval and reviewed by an Admin.'}
                {' '}One document at a time · JPG, PNG or PDF · max {DOC_MAX_MB} MB each.
              </div>
            </div>

            {/* Mini sequence rail — jump back to fix an earlier document, but
               forward progress within the step still requires the current one done. */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {MOBILE_DOC_LIST.map((d, i) => {
                const dDone = kycDocDone(d.k);
                const reachable = i === 0 || kycDocDone(MOBILE_DOC_LIST[i - 1].k) || i <= data.docStep;
                return (
                  <button key={d.k} type="button" disabled={!reachable} onClick={() => reachable && set({ docStep: i })}
                    className={`shrink-0 flex items-center gap-1.5 text-[11px] font-semibold rounded-md px-2 py-1 border transition ${
                      i === data.docStep ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-800 dark:text-brand-200'
                      : dDone ? 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                      : reachable ? 'border-slate-200 dark:border-slate-700 text-slate-500' : 'border-slate-100 dark:border-slate-800 text-slate-300 cursor-default'}`}>
                    <Icon name={dDone ? 'check-circle' : 'file'} className="w-3.5 h-3.5"/>{d.label}
                    {!d.required && <span className="text-slate-400">(optional)</span>}
                  </button>
                );
              })}
            </div>

            <Card title={docMeta.label} bodyClass="p-3"
              right={done ? <Badge tone="green">{isGov ? 'Verified' : 'Uploaded'}</Badge> : rec.skipped ? <Badge tone="slate">Skipped</Badge> : <Badge tone="amber">Pending</Badge>}>
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[11px] text-slate-500 flex-1">{docMeta.hint}</div>
                  <button onClick={() => setSampleDoc(docKey)} className="shrink-0 text-[10px] font-semibold text-brand-700 dark:text-brand-300 hover:text-brand-900 underline underline-offset-2">Sample</button>
                </div>

                {/* Number + OTP — only for Aadhaar / PAN / Bank */}
                {isGov && (
                  <div className="space-y-2.5 p-3 rounded-lg bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                    {docKey === 'bank' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Account number">
                          <Input value={rec.number} disabled={rec.otpSent}
                            onChange={(e) => setKyc('bank', { number: e.target.value.replace(/\D/g, '') })} placeholder="0123456789"/>
                        </Field>
                        <Field label="IFSC code">
                          <Input value={rec.ifsc} disabled={rec.otpSent}
                            onChange={(e) => setKyc('bank', { ifsc: e.target.value.toUpperCase() })} placeholder="HDFC0001234"/>
                        </Field>
                      </div>
                    ) : (
                      <Field label={docKey === 'aadhaar' ? 'Aadhaar number' : 'PAN number'}>
                        <Input value={rec.number} disabled={rec.otpSent}
                          onChange={(e) => setKyc(docKey, { number: docKey === 'aadhaar' ? e.target.value.replace(/\D/g, '').slice(0, 12) : e.target.value.toUpperCase().slice(0, 10) })}
                          placeholder={docKey === 'aadhaar' ? '12-digit UID' : 'ABCDE1234F'}/>
                      </Field>
                    )}

                    {!rec.otpSent && (
                      <Btn variant="primary" className="w-full" disabled={!numberValid} onClick={() => sendOtp(docKey)}>
                        <Icon name="send" className="w-3.5 h-3.5"/>Send OTP
                      </Btn>
                    )}

                    {rec.otpSent && !rec.verified && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input value={rec.otp} onChange={(e) => setKyc(docKey, { otp: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="6-digit OTP (demo: 123456)" className="flex-1"/>
                          <Btn variant="primary" disabled={rec.otp.length !== 6 || otpExpired || rec.attempts >= ONB_OTP_MAX_ATTEMPTS} onClick={() => verifyOtp(docKey)}>Verify</Btn>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={otpExpired ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-500'}>
                            {otpExpired ? 'OTP expired' : rec.attempts > 0 ? `${ONB_OTP_MAX_ATTEMPTS - rec.attempts} attempt${ONB_OTP_MAX_ATTEMPTS - rec.attempts === 1 ? '' : 's'} left` : 'Sent to the phone/email on file'}
                          </span>
                          <button type="button" disabled={!rec.canResend && !otpExpired} onClick={() => sendOtp(docKey)}
                            className={`font-semibold ${rec.canResend || otpExpired ? 'text-brand-700 dark:text-brand-300 hover:underline' : 'text-slate-300 dark:text-slate-600 cursor-default'}`}>
                            Resend OTP
                          </button>
                        </div>
                        <button type="button" onClick={() => changeNumber(docKey)} className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline underline-offset-2">
                          Change number
                        </button>
                      </div>
                    )}

                    {rec.verified && (
                      <div className="flex items-center justify-between">
                        <div className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                          <Icon name="check-circle" className="w-4 h-4"/>
                          {docKey === 'aadhaar' ? `XXXX-XXXX-${rec.number.slice(-4)}` : docKey === 'pan' ? `${rec.number.slice(0,2)}XXX${rec.number.slice(-4)}` : 'Penny-drop confirmed'}
                          <span className="text-[10px] text-slate-400 font-normal">verified {fmtDateTime(rec.verifiedAt)}</span>
                        </div>
                        <button type="button" onClick={() => changeNumber(docKey)} className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline underline-offset-2 shrink-0">Change</button>
                      </div>
                    )}
                  </div>
                )}

                {/* File upload — required for every doc except once OTP-verified this
                   also gates it for gov docs; photo/address are file-only. */}
                {(!isGov || rec.verified) && (
                  <label className="block cursor-pointer">
                    <input type="file" accept=".pdf,image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) handleKycFile(docKey, f); }}/>
                    {rec.file ? (
                      <div className="flex items-center gap-1.5 flex-wrap px-3 py-1.5 rounded-md border border-emerald-300 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-900/20">
                        <Icon name="check-circle" className="w-3.5 h-3.5 text-emerald-600"/>
                        <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-[220px]" title={rec.file.fileName}>{rec.file.fileName}</span>
                        <StatusBadge status={selfApprove ? 'verified' : 'uploaded'}/>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition">
                        <Icon name="upload" className="w-3.5 h-3.5 text-slate-400"/>
                        <span className="text-[11px] text-slate-500">Click to upload {docMeta.label.toLowerCase()}</span>
                      </div>
                    )}
                  </label>
                )}

                {/* Skip — address proof only; explains the consequence and
                   is tracked, never offered for a legally-required document. */}
                {docKey === 'address' && !rec.file && !rec.skipped && (
                  <button type="button" onClick={() => setKyc('address', { skipped: true })}
                    className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline underline-offset-2">
                    Skip for now — can be added later from the employee profile
                  </button>
                )}
                {docKey === 'address' && rec.skipped && !rec.file && (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Icon name="alert" className="w-3.5 h-3.5 text-amber-500"/>Skipped — shows as a pending item on the onboarding checklist.
                    <button type="button" onClick={() => setKyc('address', { skipped: false })} className="text-brand-700 dark:text-brand-300 underline underline-offset-2">Undo</button>
                  </div>
                )}
              </div>
            </Card>

            <div className="flex items-center justify-between">
              <Btn size="sm" disabled={data.docStep === 0} onClick={() => set({ docStep: data.docStep - 1 })}>
                <Icon name="chevron-left" className="w-3.5 h-3.5"/>Previous document
              </Btn>
              {data.docStep < MOBILE_DOC_LIST.length - 1 && (
                <Btn size="sm" variant="primary" disabled={!done && MOBILE_DOC_LIST[data.docStep].required}
                  onClick={() => set({ docStep: data.docStep + 1 })}>
                  Next document<Icon name="chevron-right" className="w-3.5 h-3.5"/>
                </Btn>
              )}
            </div>
          </div>
        );
      })()}

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
                  : `${data.name || 'The employee'} will sit at the Approval stage until an Admin reviews the application and its documents.`}
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
                ['Employment basis', Store.EMPLOYMENT_BASIS.find((b) => b.id === data.employmentBasis)?.label || data.employmentBasis],
                ['Store', data.siteId ? (Store.getSite(data.siteId) || {}).name : (isOffice ? 'Head office' : '—')],
                ['Joining date', data.joiningDate ? fmtDate(data.joiningDate, { year: true }) : 'On approval'],
                ['Salary', `${fmtINRWords(+data.baseSalary || 0)} · ${data.salaryCycle}`],
                ['Travel allowance', data.travelEligible ? fmtINR(+data.travelAmount || 0) + ' / month' : 'Not eligible'],
                ['PF', data.pf.applicable ? `Applicable${data.pf.uan ? ' · UAN ' + data.pf.uan : ''}` : 'Not applicable'],
                ['TDS', data.tds.applicable ? 'Applicable' : 'Not applicable'],
              ]],
              ['Address', [['Residential', formatAddress(data.address) || '—']]],
              ['Verification', [
                ['Aadhaar', data.kyc.aadhaar.verified ? `Verified · XXXX-XXXX-${data.kyc.aadhaar.number.slice(-4)}` : 'Not verified'],
                ['PAN', data.kyc.pan.verified ? `Verified · ${data.kyc.pan.number.slice(0,2)}XXX${data.kyc.pan.number.slice(-4)}` : 'Not verified'],
                ['Bank', data.kyc.bank.verified ? 'Verified via penny-drop' : 'Not verified'],
                ['Documents', `${MOBILE_DOC_LIST.filter((d) => data.kyc[d.k].file).length} of ${MOBILE_DOC_LIST.length} uploaded`],
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

          {/* Onboarding checklist — everything pending and why activation is or
             isn't blocked, in one place, instead of scattered across steps. */}
          {(() => {
            const missing = ['aadhaar', 'pan', 'bank', 'photo'].filter((k) => !kycDocDone(k));
            const skippedList = [...data.skippedSteps, ...(data.kyc.address.skipped && !data.kyc.address.file ? ['address proof'] : [])];
            const blockReasons = [];
            if (missing.length) blockReasons.push(`${missing.length} required document${missing.length === 1 ? '' : 's'} not verified/uploaded: ${missing.join(', ')}`);
            if (!(+data.baseSalary > 0)) blockReasons.push('Salary is not configured');
            return (
              <Card title="Onboarding checklist" bodyClass="p-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2">
                  {[
                    ['Required docs', `${4 - missing.length}/4`, missing.length === 0 ? 'text-emerald-600' : 'text-amber-600'],
                    ['Skipped items', String(skippedList.length), skippedList.length ? 'text-amber-600' : 'text-slate-700 dark:text-slate-200'],
                    ['Education', `${data.education.length} added`, 'text-slate-700 dark:text-slate-200'],
                    ['Policies pending ack.', String(Store.getPoliciesForUser({ role: isOffice ? 'hr-manager' : 'field-employee', siteId: data.siteId || null, designation: data.designation }, { activeOnly: true }).filter((p) => p.acknowledgeRequired).length), 'text-slate-700 dark:text-slate-200'],
                  ].map(([k, v, c]) => (
                    <div key={k} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div className="text-[9.5px] uppercase text-slate-500 font-bold">{k}</div>
                      <div className={`text-[14px] font-bold ${c}`}>{v}</div>
                    </div>
                  ))}
                </div>
                {skippedList.length > 0 && (
                  <div className="text-[11px] text-slate-500 mb-1.5">Skipped: {skippedList.join(', ')} — will show as pending on the employee's profile.</div>
                )}
                {blockReasons.length > 0 ? (
                  <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-[11.5px] text-rose-700 dark:text-rose-300">
                    <span className="font-semibold">Blocking activation:</span> {blockReasons.join('; ')}.
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-[11.5px] text-emerald-700 dark:text-emerald-300">
                    Nothing legally required is missing — mandatory items only. Skipped optional items above remain outstanding on the profile.
                  </div>
                )}
              </Card>
            );
          })()}
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

/* Offer-letter lifecycle chrome — status strip, history, and the actions
   available at each stage. Draft → pending-ack (generated, waiting on the
   employee) → admin-review (employee signed, waiting on Admin) → approved
   (issued) → returned (Admin sent it back with a reason, loops to draft). */
const OFFER_STATUS_LABEL = {
  draft: 'Draft', 'pending-ack': 'Waiting on employee', 'admin-review': 'Waiting on Admin review',
  approved: 'Approved & issued', returned: 'Returned for correction',
};
const OFFER_STATUS_TONE = { draft: 'slate', 'pending-ack': 'amber', 'admin-review': 'brand', approved: 'green', returned: 'red' };

function OfferLetterModal({ emp: empProp, open, onClose, user }) {
  const store = useStore();
  const toast = useToast();
  const [returning, setReturning] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  if (!open || !empProp) return null;
  const emp = store.getEmployee(empProp.id) || empProp;
  const offerStatus = emp.offerStatus || 'draft';
  const isAdminUser = isSuperAdmin(user);
  const canGenerate = can(user, 'employee.edit');

  const generate = () => {
    const res = Store.generateOfferLetter(emp.id, user);
    if (res && res.error) { toast(res.error, 'error'); return; }
    toast('Offer letter generated — waiting on the employee to acknowledge', 'success');
  };
  const markAcknowledged = () => {
    const res = Store.acknowledgeOffer(emp.id, emp.name);
    if (res && res.error) { toast(res.error, 'error'); return; }
    toast('Marked as acknowledged by the employee', 'success');
  };
  const approve = () => {
    const res = Store.reviewOffer(emp.id, 'approved', user);
    if (res && res.error) { toast(res.error, 'error'); return; }
    toast('Offer letter approved and issued', 'success');
  };
  const doReturn = () => {
    if (!returnReason.trim()) { toast('A reason is required to return the offer', 'error'); return; }
    const res = Store.reviewOffer(emp.id, 'returned', user, returnReason.trim());
    if (res && res.error) { toast(res.error, 'error'); return; }
    toast('Offer letter returned to draft', 'warn');
    setReturning(false); setReturnReason('');
  };
  const regenerate = () => {
    const res = Store.regenerateOfferLetter(emp.id, user);
    if (res && res.error) { toast(res.error, 'error'); return; }
    toast('Back to draft — make corrections and generate again', 'info');
  };

  /* Before Generated, there is nothing to read yet — showing the letter body
     here would let a PDF exist before the lifecycle says it does. */
  if (offerStatus === 'draft') {
    const blockers = [];
    if (!(+emp.baseSalary > 0)) blockers.push('salary is not configured');
    if (!emp.salaryCycle) blockers.push('salary cycle is not set');
    return (
      <Modal open onClose={onClose} size="md" icon="file"
        title="Digital Offer / Joining Letter" subtitle={`${emp.name} · ${emp.code}`}
        footer={<Btn variant="primary" onClick={onClose}>Close</Btn>}>
        <div className="space-y-3">
          <div className="flex items-center gap-2"><Badge tone={OFFER_STATUS_TONE.draft}>{OFFER_STATUS_LABEL.draft}</Badge></div>
          <div className="text-[12.5px] text-slate-600 dark:text-slate-300">
            Salary, salary cycle, employment basis and statutory choices must be finalised before the offer letter can
            be generated — this is validated here, not just implied by the form being filled in.
          </div>
          {blockers.length > 0 ? (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-[12px] text-rose-700 dark:text-rose-300">
              Cannot generate yet — {blockers.join(', ')}. Set these from the Settings tab first.
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-[12px] text-emerald-700 dark:text-emerald-300">
              Ready to generate — salary {fmtINRWords(emp.baseSalary)} · {emp.salaryCycle}.
            </div>
          )}
          {canGenerate ? (
            <Btn variant="primary" className="w-full" disabled={blockers.length > 0} onClick={generate}>
              <Icon name="file" className="w-3.5 h-3.5"/>Generate offer letter
            </Btn>
          ) : (
            <div className="text-[11px] text-slate-400 italic">Generating an offer letter requires Admin or HR.</div>
          )}
        </div>
      </Modal>
    );
  }

  return <OfferLetterDocument emp={emp} offerStatus={offerStatus} isAdminUser={isAdminUser} canGenerate={canGenerate}
    onClose={onClose} onMarkAcknowledged={markAcknowledged} onApprove={approve}
    returning={returning} setReturning={setReturning} returnReason={returnReason} setReturnReason={setReturnReason}
    onReturn={doReturn} onRegenerate={regenerate}/>;
}

function OfferLetterDocument({ emp, offerStatus, isAdminUser, canGenerate, onClose,
  onMarkAcknowledged, onApprove, returning, setReturning, returnReason, setReturnReason, onReturn, onRegenerate }) {
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
        {offerStatus === 'pending-ack' && (
          <span className="mr-auto text-[11px] text-slate-500 no-print">Waiting on the employee's own acknowledgement/signature.</span>
        )}
        {offerStatus === 'pending-ack' && (
          <Btn className="no-print" onClick={onMarkAcknowledged} title="Stand-in for the employee's own mobile acknowledgement">
            <Icon name="check" className="w-3.5 h-3.5"/>Mark employee acknowledged (demo)
          </Btn>
        )}
        {offerStatus === 'admin-review' && isAdminUser && !returning && (
          <>
            <Btn className="no-print" onClick={() => setReturning(true)}><Icon name="x" className="w-3.5 h-3.5"/>Return with reason</Btn>
            <Btn variant="success" className="no-print" onClick={onApprove}><Icon name="check-circle" className="w-3.5 h-3.5"/>Read and approve</Btn>
          </>
        )}
        {offerStatus === 'admin-review' && !isAdminUser && (
          <span className="mr-auto text-[11px] text-slate-400 italic no-print">Only an Admin can read and approve — HR can review the draft but not issue it.</span>
        )}
        {offerStatus === 'returned' && canGenerate && (
          <Btn variant="primary" className="no-print" onClick={onRegenerate}><Icon name="refresh" className="w-3.5 h-3.5"/>Revise &amp; regenerate</Btn>
        )}
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

      {/* Lifecycle status + history — never printed, and never lets a reader
         confuse "a PDF is showing" with "this offer is issued". */}
      <div className="no-print px-4 sm:px-6 pt-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge tone={OFFER_STATUS_TONE[offerStatus]}>{OFFER_STATUS_LABEL[offerStatus]}</Badge>
              {offerStatus === 'approved' && <span className="text-[11px] text-slate-500">Issued — this is the final version.</span>}
            </div>
          </div>
          {offerStatus === 'returned' && (
            <div className="mt-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-[12px] text-rose-700 dark:text-rose-300">
              {(emp.offerHistory || []).slice().reverse().find((h) => h.status === 'returned')?.note || 'Returned for correction.'}
            </div>
          )}
          {returning && (
            <div className="mt-2 space-y-2">
              <Textarea value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="Reason for returning this offer…"/>
              <div className="flex justify-end gap-2">
                <Btn size="xs" onClick={() => setReturning(false)}>Cancel</Btn>
                <Btn size="xs" variant="danger" onClick={onReturn}>Confirm return</Btn>
              </div>
            </div>
          )}
          {(emp.offerHistory || []).length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
              {emp.offerHistory.slice().reverse().map((h, i) => (
                <div key={i} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 dark:text-slate-300">{OFFER_STATUS_LABEL[h.status] || h.status}{h.note ? ` · ${h.note}` : ''}{h.by ? ` · ${h.by}` : ''}</span>
                  <span className="text-slate-400 font-mono shrink-0">{fmtDateTime(h.at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
   and Admin add / edit / replace / version / activate controls.
   ========================================================================== */
const POLICY_CATEGORIES = ['Policy', 'Handbook', 'Payroll', 'IT', 'Security', 'Compliance', 'Other'];

/* The four roles this prototype knows about — a policy's audience picker
   offers exactly these, matching PERMISSIONS/ROLE_LABEL everywhere else.
   Site/designation/named-employee targeting exist in the data model
   (`Store.matchesAudience`) but have no editor UI yet; role is the audience
   dimension the brief's own example scopes by, so it's the one this pass
   wires up. */
const POLICY_AUDIENCE_ROLES = ['admin', 'hr-manager', 'site-manager', 'field-employee'];

function PolicyEditorModal({ policy, onClose, user }) {
  const store = useStore();
  const toast = useToast();
  const isNew = !policy.id;
  const [draft, setDraft] = useState(() => ({
    id: policy.id || null, title: policy.title || '', category: policy.category || 'Policy',
    summary: policy.summary || '', version: policy.version || '1.0',
    fileName: policy.fileName || '', active: policy.active !== false,
    acknowledgeRequired: policy.acknowledgeRequired !== false,
    audience: policy.audience || { roles: [], siteIds: [], zones: [], designations: [], employeeIds: [] },
  }));
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const audienceRoles = draft.audience.roles || [];
  const toggleRole = (role) => set({
    audience: { ...draft.audience, roles: audienceRoles.includes(role) ? audienceRoles.filter((r) => r !== role) : [...audienceRoles, role] },
  });

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
    const res = Store.upsertPolicy({ ...draft, title: draft.title.trim(), body: draft.summary }, user);
    if (res && res.error) { toast(res.error, 'error'); return; }
    toast(isNew ? 'Document added to the library' : 'Document updated — re-acknowledgement required if the version changed', 'success');
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

        {/* Audience — who this document is distributed to. Leaving every role
            unchecked means "All employees", chosen on purpose rather than the
            old behaviour where every active policy went to everyone with no
            way to say otherwise. */}
        <div className="pt-1">
          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5">Audience</div>
          <div className="flex flex-wrap gap-3">
            {POLICY_AUDIENCE_ROLES.map((role) => (
              <label key={role} className="flex items-center gap-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                <input type="checkbox" checked={audienceRoles.includes(role)} onChange={() => toggleRole(role)} className="accent-brand-700 w-4 h-4"/>
                {ROLE_LABEL[role]}
              </label>
            ))}
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            {audienceRoles.length === 0
              ? 'No roles selected — this document goes to All employees.'
              : `Visible only to: ${audienceRoles.map((r) => ROLE_LABEL[r]).join(', ')}.`}
            {' '}
            <span className="font-semibold">
              {(() => {
                // Live count off the in-progress selection, not just after save —
                // an admin should see the audience size change as they check boxes.
                const everyone = store.getEmployees({ status: 'active' }).concat(store.getUsers());
                const count = audienceRoles.length === 0 ? everyone.length : everyone.filter((u) => audienceRoles.includes(roleOf(u))).length;
                return `${count} people in scope.`;
              })()}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* Plain-English label for a policy's audience — "All employees" is the only
   phrase that means every viewer, so it only ever appears for a genuinely
   empty audience, never as a default assumption. */
function audienceLabel(audience) {
  if (!audience) return 'All employees';
  const roles = audience.roles || [];
  const named = (audience.employeeIds || []).length;
  const parts = [];
  if (roles.length) parts.push(roles.map((r) => ROLE_LABEL[r] || r).join(', '));
  if (named) parts.push(`${named} named employee${named === 1 ? '' : 's'}`);
  return parts.length ? parts.join(' + ') : 'All employees';
}

function PolicyLibrary({ user, manage }) {
  const store = useStore();
  const toast = useToast();
  const { confirm, ConfirmUI } = useConfirm();
  const [editing, setEditing] = useState(null);
  const [reading, setReading] = useState(null);
  const [q, setQ] = useState('');
  const canEdit = manage && can(user, 'policy.edit');

  /* HR/Admin manage the whole library regardless of their own audience scope;
     everyone else sees only the active policies actually assigned to them —
     this is the fix for "every active policy is visible to everyone". */
  const all = canEdit ? store.getPolicies() : store.getPoliciesForUser(user, { activeOnly: true });
  const list = all.filter((p) => !q || `${p.title} ${p.category} ${p.summary}`.toLowerCase().includes(q.toLowerCase()));

  const remove = async (p) => {
    const ok = await confirm({ title: `Delete "${p.title}"?`, body: 'The document is removed from the library for everyone.', confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    const res = Store.deletePolicy(p.id, user);
    if (res && res.error) { toast(res.error, 'error'); return; }
    toast('Document deleted', 'warn');
  };

  const acknowledge = (p) => {
    const res = Store.acknowledgePolicy(p.id, user.id);
    if (res && res.error) { toast(res.error, 'error'); return; }
    toast(`Acknowledged "${p.title}"`, 'success');
  };

  return (
    <>
      <Card noBody
        title="Company policies & HR documents"
        subtitle={canEdit
          ? `${all.length} document${all.length === 1 ? '' : 's'} · ${all.filter((p) => p.active).length} active`
          : `${all.length} document${all.length === 1 ? '' : 's'} assigned to you · read or download`}
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
            {list.map((p) => {
              const acked = store.isPolicyAcknowledged(p.id, user.id);
              const coverage = canEdit ? store.getPolicyAckCoverage(p.id) : null;
              return (
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
                      {p.acknowledgeRequired && (acked ? <Badge tone="green">Acknowledged</Badge> : <Badge tone="amber">Acknowledge</Badge>)}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">{p.summary}</div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Icon name="users" className="w-3 h-3 shrink-0"/>
                  <span className="truncate" title={audienceLabel(p.audience)}>{audienceLabel(p.audience)}</span>
                  {coverage && <span className="ml-auto shrink-0 font-mono">{coverage.ackedCount}/{coverage.audienceCount} acked</span>}
                </div>
                <div className="text-[10px] text-slate-400 mt-auto">Updated {fmtDate(p.updatedAt, { year: true })} by {p.updatedBy}</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Btn size="xs" onClick={() => setReading(p)}><Icon name="eye" className="w-3 h-3"/>Read</Btn>
                  <Btn size="xs" onClick={() => toast(`Downloading ${p.fileName}`, 'info')}><Icon name="download" className="w-3 h-3"/>Download</Btn>
                  {p.acknowledgeRequired && !acked && (
                    <Btn size="xs" variant="primary" onClick={() => acknowledge(p)}><Icon name="check" className="w-3 h-3"/>Acknowledge</Btn>
                  )}
                  {canEdit && <>
                    <Btn size="xs" onClick={() => setEditing(p)}><Icon name="edit" className="w-3 h-3"/>Edit</Btn>
                    <Btn size="xs" onClick={() => {
                      const res = Store.togglePolicy(p.id, undefined, user);
                      if (res && res.error) { toast(res.error, 'error'); return; }
                      toast(p.active ? 'Marked inactive' : 'Marked active', 'success');
                    }}>
                      {p.active ? 'Deactivate' : 'Activate'}
                    </Btn>
                    <Btn size="xs" variant="danger" onClick={() => remove(p)}><Icon name="trash" className="w-3 h-3"/></Btn>
                  </>}
                </div>
              </div>
              );
            })}
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
                ['Audience', audienceLabel(reading.audience)],
                ['Acknowledgement', reading.acknowledgeRequired ? 'Required' : 'Not required'],
                ['Last updated', `${fmtDate(reading.updatedAt, { year: true })} by ${reading.updatedBy}`],
              ].map(([k, v]) => (
                <div key={k} className="px-3 py-2 flex justify-between gap-4">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100 text-right">{v}</span>
                </div>
              ))}
            </div>
            {(reading.versions || []).length > 1 && (
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500 mb-1">Version history</div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                  {reading.versions.slice().reverse().map((v, i) => (
                    <div key={i} className="px-3 py-2 flex items-center justify-between gap-3 text-[11.5px]">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-100">v{v.version}</span>
                        <span className="text-slate-400"> · {v.changeNote}</span>
                      </div>
                      <span className="text-slate-400 shrink-0">{fmtDate(v.updatedAt, { year: true })} · {v.updatedBy}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

/* ---- Company Policies, as a destination ----
   The library used to live only inside the HR onboarding queue, which meant
   the people the documents are written for could not reach them. It is now a
   page of its own that every role can open; the add/edit/version controls
   appear only for `policy.edit`, so a Team Lead or an employee gets a clean
   read-and-download view of exactly the same library. */
function PoliciesPage({ user }) {
  const store = useStore();
  const canEdit = can(user, 'policy.edit');
  const all = store.getPolicies();
  const active = all.filter((p) => p.active);
  const mine = store.getPoliciesForUser(user, { activeOnly: true });
  const pending = store.getPendingAcknowledgements(user);

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Workspace" title="Company policies & HR documents"
        subtitle={canEdit
          ? 'The company handbook, code of conduct and HR policies, scoped to the audience each one is assigned to.'
          : 'The handbook, code of conduct and HR policies assigned to you. Read or download any document.'}>
        <Badge tone="brand">{canEdit ? `${active.length} active` : `${mine.length} assigned`}</Badge>
        {pending.length > 0 && <Badge tone="amber">{pending.length} need{pending.length === 1 ? 's' : ''} your acknowledgement</Badge>}
      </PageHeader>

      {!canEdit && (
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
          <Icon name="info" className="w-4 h-4 text-slate-400 shrink-0 mt-px"/>
          <div className="text-[12px] text-slate-600 dark:text-slate-300">
            These documents are maintained by <span className="font-semibold">HR and Admin</span>. If something looks
            out of date, raise it with HR rather than editing it locally.
          </div>
        </div>
      )}

      <PolicyLibrary user={user} manage={canEdit}/>
    </div>
  );
}

Object.assign(window, {
  PoliciesPage,
  OnboardingWizard, OfferLetterModal, SampleDocModal,
  EducationEditor, AddressFields, WizardSteps, formatAddress, blankEducation,
  PolicyLibrary, PolicyEditorModal, POLICY_CATEGORIES, COMPANY,
  EDU_LEVELS, EDU_DOC_TYPES,
  SAMPLE_DOCS, DOC_MAX_MB, DOC_ALLOWED_TYPES, validateDocFile,
});
