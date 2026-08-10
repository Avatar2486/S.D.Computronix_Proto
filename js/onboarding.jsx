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

function OnboardingWizard({ open, onClose, onSubmitted }) {
  const [step, setStep] = useState(0);
  const [forceFail, setForceFail] = useState(false);
  const toast = useToast();
  const [data, setData] = useState({
    name: '', phone: '', email: '', dob: '', gender: 'Male', addr: '',
    aadhaar: '', aadhaarOtp: '', aadhaarVerified: false,
    pan: '', panVerified: false,
    bankAcct: '', ifsc: '', bankVerified: false,
    docs: { aadhaar: false, pan: false, photo: false, address: false, bank: false },
    siteId: 'site_mum',
  });
  const set = (patch) => setData((d) => ({ ...d, ...patch }));
  const [sampleDoc, setSampleDoc] = useState(null); // key of doc being previewed

  const steps = ['Personal', 'Aadhaar eKYC', 'PAN', 'Bank', 'Documents', 'Review'];

  const [loading, setLoading] = useState(null);
  const verify = (kind) => {
    setLoading(kind);
    setTimeout(() => {
      setLoading(null);
      if (forceFail) {
        toast(`${kind.toUpperCase()} verification failed — please retry`, 'error');
      } else {
        if (kind === 'aadhaar-otp') set({ aadhaarOtp: '' });
        if (kind === 'aadhaar') set({ aadhaarVerified: true });
        if (kind === 'pan') set({ panVerified: true });
        if (kind === 'bank') set({ bankVerified: true });
        toast(`${kind.toUpperCase()} verified successfully`, 'success');
      }
    }, 1400);
  };

  const canNext = () => {
    if (step === 0) return data.name && data.phone && data.email;
    if (step === 1) return data.aadhaarVerified;
    if (step === 2) return data.panVerified;
    if (step === 3) return data.bankVerified;
    if (step === 4) return data.docs.aadhaar && data.docs.pan && data.docs.photo && data.docs.bank;
    return true;
  };

  const submit = () => {
    const emp = Store.addEmployee({
      name: data.name, phone: data.phone, email: data.email,
      aadhaarMasked: 'XXXX-XXXX-' + data.aadhaar.slice(-4).padStart(4, '0'),
      panMasked: data.pan.slice(0, 2) + 'XXX' + data.pan.slice(-4),
      bankVerified: data.bankVerified, siteId: data.siteId,
    });
    toast('Application submitted for admin approval', 'success');
    onSubmitted && onSubmitted(emp);
    onClose();
    setStep(0);
    setData({ name: '', phone: '', email: '', dob: '', gender: 'Male', addr: '', aadhaar: '', aadhaarOtp: '', aadhaarVerified: false, pan: '', panVerified: false, bankAcct: '', ifsc: '', bankVerified: false, docs: { aadhaar: false, pan: false, photo: false, address: false, bank: false }, siteId: 'site_mum' });
  };

  const handleDocFile = (docKey, file) => {
    const err = validateDocFile(file);
    if (err) { toast(err, 'error'); return; }
    set({ docs: { ...data.docs, [docKey]: file.name || true } });
  };

  if (!open) return null;

  return (
    <Modal open onClose={onClose} title="New Employee Onboarding" wide
      footer={
        <>
          <label className="flex items-center gap-1.5 text-[11px] text-slate-500 mr-auto">
            <input type="checkbox" checked={forceFail} onChange={(e) => setForceFail(e.target.checked)} className="accent-brand-700"/>
            Force verification failure (demo)
          </label>
          {step > 0 && <Btn onClick={() => setStep(step - 1)}>Back</Btn>}
          {step < steps.length - 1 && <Btn variant="primary" onClick={() => setStep(step + 1)} disabled={!canNext()}>Continue</Btn>}
          {step === steps.length - 1 && <Btn variant="success" onClick={submit}>Submit for Approval</Btn>}
        </>
      }>
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-5">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${i <= step ? 'text-brand-700 dark:text-brand-300' : 'text-slate-400'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${i < step ? 'bg-brand-700 text-white' : i === step ? 'bg-brand-100 text-brand-800 border border-brand-700 dark:bg-brand-900/40 dark:text-brand-200' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              {s}
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`}/>}
          </React.Fragment>
        ))}
      </div>

      {step === 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name"><Input value={data.name} onChange={(e) => set({ name: e.target.value })} placeholder="Arjun Mehta"/></Field>
          <Field label="Phone"><Input value={data.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+91 98xxx xxxxx"/></Field>
          <Field label="Work email"><Input value={data.email} onChange={(e) => set({ email: e.target.value })} placeholder="you@sdc.in"/></Field>
          <Field label="Date of birth"><Input type="date" value={data.dob} onChange={(e) => set({ dob: e.target.value })}/></Field>
          <Field label="Gender"><Select value={data.gender} onChange={(e) => set({ gender: e.target.value })}><option>Male</option><option>Female</option><option>Other</option></Select></Field>
          <Field label="Assign to site">
            <SearchSelect value={data.siteId} onChange={(v) => set({ siteId: v })}
              options={Store.getSites().map((s) => ({ value: s.id, label: s.name, sub: [s.city, s.region, s.code].filter(Boolean).join(' · '), keywords: s.code }))}
              placeholder="Select a store…" searchPlaceholder="Search store, code or city…" emptyLabel="No store matches"/>
          </Field>
          <Field label="Residential address" className="col-span-2"><Textarea value={data.addr} onChange={(e) => set({ addr: e.target.value })} placeholder="Flat / Street / City / PIN"/></Field>
        </div>
      )}

      {step === 1 && (
        <div className="max-w-md mx-auto space-y-3">
          <div className="p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 flex items-start gap-2.5">
            <Icon name="shield" className="w-4 h-4 text-brand-700 mt-0.5"/>
            <div className="text-[12px] text-brand-900 dark:text-brand-100">Powered by UIDAI eKYC (simulated). Your Aadhaar number is masked and encrypted.</div>
          </div>
          <Field label="Aadhaar number">
            <Input value={data.aadhaar} onChange={(e) => set({ aadhaar: e.target.value.replace(/[^\d]/g, '').slice(0, 12) })} placeholder="12-digit UID" disabled={data.aadhaarVerified}/>
          </Field>
          <Field label="OTP sent to registered mobile">
            <Input value={data.aadhaarOtp} onChange={(e) => set({ aadhaarOtp: e.target.value.replace(/[^\d]/g, '').slice(0, 6) })} placeholder="6 digits — demo: 123456" disabled={data.aadhaarVerified}/>
          </Field>
          {!data.aadhaarVerified ? (
            <Btn variant="primary" onClick={() => verify('aadhaar')} disabled={data.aadhaar.length !== 12 || loading} className="w-full">
              {loading === 'aadhaar' ? 'Verifying with UIDAI…' : 'Verify Aadhaar'}
            </Btn>
          ) : (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
              <Icon name="check-circle" className="w-4 h-4 text-emerald-600"/>
              <div className="text-[12px] text-emerald-900 dark:text-emerald-100 font-semibold">Verified · XXXX-XXXX-{data.aadhaar.slice(-4)}</div>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="max-w-md mx-auto space-y-3">
          <div className="p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 flex items-start gap-2.5">
            <Icon name="file" className="w-4 h-4 text-brand-700 mt-0.5"/>
            <div className="text-[12px] text-brand-900 dark:text-brand-100">Name-match performed against NSDL records (simulated).</div>
          </div>
          <Field label="PAN number">
            <Input value={data.pan} onChange={(e) => set({ pan: e.target.value.toUpperCase().slice(0, 10) })} placeholder="ABCDE1234F" disabled={data.panVerified}/>
          </Field>
          {!data.panVerified ? (
            <Btn variant="primary" onClick={() => verify('pan')} disabled={data.pan.length !== 10 || loading} className="w-full">
              {loading === 'pan' ? 'Verifying with NSDL…' : 'Verify PAN'}
            </Btn>
          ) : (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
              <Icon name="check-circle" className="w-4 h-4 text-emerald-600"/>
              <div className="text-[12px] text-emerald-900 dark:text-emerald-100 font-semibold">Name match confirmed · {data.pan.slice(0,2)}XXX{data.pan.slice(-4)}</div>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="max-w-md mx-auto space-y-3">
          <div className="p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 flex items-start gap-2.5">
            <Icon name="wallet" className="w-4 h-4 text-brand-700 mt-0.5"/>
            <div className="text-[12px] text-brand-900 dark:text-brand-100">Penny-drop verification via NPCI — a ₹1 transaction confirms account ownership.</div>
          </div>
          <Field label="Account number"><Input value={data.bankAcct} onChange={(e) => set({ bankAcct: e.target.value.replace(/\D/g, '') })} placeholder="0123456789" disabled={data.bankVerified}/></Field>
          <Field label="IFSC code"><Input value={data.ifsc} onChange={(e) => set({ ifsc: e.target.value.toUpperCase() })} placeholder="HDFC0001234" disabled={data.bankVerified}/></Field>
          {!data.bankVerified ? (
            <Btn variant="primary" onClick={() => verify('bank')} disabled={data.bankAcct.length < 8 || data.ifsc.length < 11 || loading} className="w-full">
              {loading === 'bank' ? 'Sending ₹1 penny-drop…' : 'Verify Bank Account'}
            </Btn>
          ) : (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
              <Icon name="check-circle" className="w-4 h-4 text-emerald-600"/>
              <div className="text-[12px] text-emerald-900 dark:text-emerald-100 font-semibold">Account verified via penny-drop ✓</div>
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="max-w-lg mx-auto space-y-3">
          <div className="p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 flex items-start gap-2.5">
            <Icon name="file" className="w-4 h-4 text-brand-700 mt-0.5"/>
            <div className="text-[12px] text-brand-900 dark:text-brand-100">
              Upload PDF or image proofs (JPG, PNG, PDF · max 5 MB each). Click <span className="font-semibold">View Sample</span> on any card to see what a valid document looks like.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: 'aadhaar', label: 'Aadhaar card', req: true },
              { k: 'pan',     label: 'PAN card', req: true },
              { k: 'photo',   label: 'Recent photograph', req: true },
              { k: 'bank',    label: 'Bank proof (passbook/cheque)', req: true },
              { k: 'address', label: 'Address proof', req: false },
            ].map((d) => (
              <div key={d.k}
                className={`p-3 border-2 border-dashed rounded-lg text-left transition ${data.docs[d.k] ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-300 dark:border-slate-700'}`}>
                {/* Header row: label + View Sample */}
                <div className="flex items-start justify-between gap-1 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Icon name={data.docs[d.k] ? 'check-circle' : 'file'} className={`w-4 h-4 shrink-0 ${data.docs[d.k] ? 'text-emerald-600' : 'text-slate-400'}`}/>
                    <span className="font-semibold text-[12px] text-slate-800 dark:text-slate-100">{d.label}</span>
                    {d.req && !data.docs[d.k] && <Badge tone="red">Required</Badge>}
                  </div>
                  <button
                    onClick={() => setSampleDoc(d.k)}
                    className="shrink-0 text-[10px] font-semibold text-brand-700 dark:text-brand-300 hover:text-brand-900 dark:hover:text-brand-100 underline underline-offset-2 transition"
                  >
                    View Sample
                  </button>
                </div>
                {/* Upload area */}
                <label className="block cursor-pointer">
                  <input type="file" accept=".pdf,image/*" className="hidden"
                    onChange={(e) => { if (e.target.files && e.target.files[0]) { handleDocFile(d.k, e.target.files[0]); e.target.value = ''; } }}/>
                  {data.docs[d.k] ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-500 truncate max-w-[130px]">{typeof data.docs[d.k] === 'string' ? data.docs[d.k] : 'file uploaded'}</span>
                      <Badge tone="amber"><Icon name="clock" className="w-3 h-3"/>Pending Verification</Badge>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition">
                      <Icon name="file" className="w-3.5 h-3.5 text-slate-400"/>
                      <span className="text-[11px] text-slate-500">Click to upload PDF / image</span>
                    </div>
                  )}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="max-w-lg mx-auto">
          <div className="text-[12px] text-slate-500 mb-3">Review before submitting for admin approval.</div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 text-[12px]">
            {[
              ['Full name', data.name],
              ['Phone', data.phone],
              ['Email', data.email],
              ['Aadhaar', data.aadhaarVerified ? `Verified · XXXX-XXXX-${data.aadhaar.slice(-4)}` : 'Not verified'],
              ['PAN', data.panVerified ? `Verified · ${data.pan.slice(0,2)}XXX${data.pan.slice(-4)}` : 'Not verified'],
              ['Bank', data.bankVerified ? 'Verified via penny-drop' : 'Not verified'],
              ['Documents', Object.entries(data.docs).filter(([,v]) => v).length + ' uploaded'],
              ['Assigned site', Store.getSite(data.siteId)?.name || '—'],
            ].map(([k, v]) => (
              <div key={k} className="px-3 py-2 flex justify-between gap-4">
                <div className="text-slate-500">{k}</div>
                <div className="font-semibold text-slate-800 dark:text-slate-100 text-right">{v || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sample document preview modal (rendered inside the wizard modal) */}
      {sampleDoc && <SampleDocModal docKey={sampleDoc} onClose={() => setSampleDoc(null)}/>}
    </Modal>
  );
}

/* Offer letter view */
function OfferLetterModal({ emp, open, onClose }) {

  if (!open || !emp) return null;
  const site = Store.getSite(emp.siteId);
  return (
    <Modal open onClose={onClose} title="Digital Offer / Joining Letter" wide
      footer={<>
        <Btn onClick={() => window.print()}><Icon name="print" className="w-3.5 h-3.5"/>Print / Save PDF</Btn>
        <Btn variant="primary" onClick={onClose}>Close</Btn>
      </>}>
      <div className="print-area bg-white text-slate-900 p-8 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <BrandLogo size={36}/>
          <div className="text-right text-[11px] text-slate-500">
            <div>S.D. Computronix Pvt. Ltd.</div>
            <div>410, Prestige Tower, Andheri East, Mumbai 400059</div>
            <div>CIN: U72900MH2014PTC258912</div>
          </div>
        </div>
        <div className="mt-6 text-[12px] text-slate-500">Ref: SDC/OL/{emp.code}/2026 · Date: {fmtDate(new Date(), { year: true })}</div>
        <div className="mt-6 text-[15px] font-bold text-slate-900">Dear {emp.name},</div>
        <div className="mt-3 text-[13px] leading-relaxed text-slate-700">
          We are pleased to extend an offer of employment for the position of <span className="font-semibold">Field Sales Associate</span> at S.D. Computronix Pvt. Ltd., assigned to <span className="font-semibold">{site?.name}</span>.
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
          {[
            ['Employee code', emp.code],
            ['Designation', 'Field Sales Associate'],
            ['Reporting site', site?.name],
            ['Shift timings', `${site?.shiftStart} – ${site?.shiftEnd}`],
            ['Fixed monthly CTC', fmtINR(emp.baseSalary)],
            ['Variable / incentive', 'As per slab configuration'],
            ['Date of joining', fmtDate(new Date(), { year: true })],
            ['Probation', '3 months'],
          ].map(([k, v]) => (
            <div key={k} className="border border-slate-200 rounded p-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{k}</div>
              <div className="font-semibold text-slate-800">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-[12px] leading-relaxed text-slate-700 space-y-2">
          <p><b>Attendance:</b> Live-photo, geo-fenced clock-in/out is mandatory. Location checks occur every 2 hours during shifts.</p>
          <p><b>Payroll:</b> Salary is processed on the 1st of every month via NEFT to your verified bank account. Absences reduce pay proportionally at ₹500/day.</p>
          <p><b>Confidentiality & Conduct:</b> You agree to abide by S.D. Computronix's code of conduct and confidentiality policy.</p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-8">
          <div>
            <div className="h-14 border-b border-slate-400"/>
            <div className="text-[11px] text-slate-600 mt-1">For S.D. Computronix Pvt. Ltd.<br/>Neha Kapoor, Head of People Ops</div>
          </div>
          <div>
            <div className="h-14 border-b border-slate-400"/>
            <div className="text-[11px] text-slate-600 mt-1">Accepted by: {emp.name}<br/>Date: __________________</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

Object.assign(window, {
  OnboardingWizard, OfferLetterModal, SampleDocModal,
  SAMPLE_DOCS, DOC_MAX_MB, DOC_ALLOWED_TYPES, validateDocFile,
});
