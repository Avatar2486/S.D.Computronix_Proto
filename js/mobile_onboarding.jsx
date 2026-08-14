/* Aadhaar-first self-onboarding, run entirely from the employee's phone.
   The applicant verifies their mobile, completes simulated UIDAI eKYC (which
   pre-fills name / DOB / gender / address), adds PAN + bank + store, uploads
   documents, and submits. The record lands as status:'pending' for HR to approve.

   Document capture reuses MobileDocCard / MobileSamplePreview / MOBILE_DOC_LIST
   from mobile_documents.jsx, so sample previews and type+size validation are
   shared with the post-joining document screen. */

const ONB_STEPS = [
  { k: 'mobile',    label: 'Mobile',    icon: 'phone' },
  { k: 'aadhaar',   label: 'Aadhaar',   icon: 'shield' },
  { k: 'personal',  label: 'Personal',  icon: 'user' },
  { k: 'pan',       label: 'PAN',       icon: 'file' },
  { k: 'bank',      label: 'Bank',      icon: 'wallet' },
  { k: 'store',     label: 'Store',     icon: 'building' },
  { k: 'documents', label: 'Documents', icon: 'upload' },
  { k: 'review',    label: 'Review',    icon: 'check-circle' },
];

/* Deterministic stand-in for a UIDAI eKYC response — same Aadhaar always
   returns the same identity, so the demo is repeatable. */
const AADHAAR_IDENTITIES = [
  { name: 'Arjun Mehta',      dob: '1996-04-12', gender: 'Male',   careOf: 'S/O Rakesh Mehta',   house: 'Flat 402, Shanti Residency', street: 'Linking Road', locality: 'Bandra West', city: 'Mumbai',    state: 'MAHARASHTRA', pin: '400050' },
  { name: 'Sneha Kulkarni',   dob: '1999-11-03', gender: 'Female', careOf: 'D/O Vinod Kulkarni', house: '12, Sai Krupa CHS',          street: 'FC Road',      locality: 'Shivajinagar', city: 'Pune',    state: 'MAHARASHTRA', pin: '411005' },
  { name: 'Imran Qureshi',    dob: '1994-07-25', gender: 'Male',   careOf: 'S/O Abdul Qureshi',  house: 'H.No 88, Green Park',        street: 'Ring Road',    locality: 'Lajpat Nagar', city: 'New Delhi', state: 'DELHI',     pin: '110024' },
  { name: 'Lakshmi Narayanan',dob: '1997-02-18', gender: 'Female', careOf: 'D/O R Narayanan',    house: 'No 7, Anna Nagar East',      street: '2nd Main Rd',  locality: 'Anna Nagar',   city: 'Chennai',   state: 'TAMIL NADU',pin: '600102' },
];
function resolveAadhaarIdentity(aadhaar) {
  const digits = String(aadhaar || '').replace(/\D/g, '');
  // FNV-1a plus an avalanche finalizer. A digit-sum (or a plain ×31 hash) keeps
  // too little entropy in the low bits, so repeated-digit Aadhaars like
  // 1111… and 2222… would all resolve to the same identity.
  let h = 0x811c9dc5;
  for (let i = 0; i < digits.length; i++) { h ^= digits.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return AADHAAR_IDENTITIES[(h >>> 0) % AADHAAR_IDENTITIES.length];
}

/* Tiny IFSC → bank/branch lookup so the bank step feels real without a network. */
const IFSC_BANKS = {
  HDFC: 'HDFC Bank', ICIC: 'ICICI Bank', SBIN: 'State Bank of India', UTIB: 'Axis Bank',
  KKBK: 'Kotak Mahindra Bank', PUNB: 'Punjab National Bank', BARB: 'Bank of Baroda',
  IDIB: 'Indian Bank', CNRB: 'Canara Bank', YESB: 'Yes Bank',
};
function bankFromIfsc(ifsc) {
  const code = String(ifsc || '').toUpperCase().slice(0, 4);
  return IFSC_BANKS[code] || null;
}

/* ---- Searchable store picker — 566 sites make a <select> unusable on a phone ---- */
function StorePicker({ value, onChange }) {
  const store = useStore();
  const sites = store.getSites();
  const [q, setQ] = useState('');
  const selected = value ? store.getSite(value) : null;

  const matches = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return sites.slice(0, 12);
    return sites.filter((s) =>
      (s.name || '').toLowerCase().includes(ql) ||
      (s.city || '').toLowerCase().includes(ql) ||
      (s.code || '').toLowerCase().includes(ql)
    ).slice(0, 25);
  }, [q, store.state]);

  return (
    <div className="space-y-2">
      {selected && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800">
          <Icon name="check-circle" className="w-4 h-4 text-emerald-600 shrink-0"/>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-slate-800 dark:text-white truncate">{selected.name}</div>
            <div className="text-[10px] text-slate-500">{selected.city} · {selected.code} · {selected.type === 'store' ? 'Retail' : 'Service centre'}</div>
          </div>
          <button onClick={() => onChange('')} className="text-[10px] font-semibold text-slate-500 underline shrink-0">Change</button>
        </div>
      )}
      {!selected && (
        <>
          <div className="flex items-center gap-1.5 h-10 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus-within:border-brand-500 transition">
            <Icon name="search" className="w-3.5 h-3.5 text-slate-400 shrink-0"/>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search store, city or code…"
              className="flex-1 bg-transparent text-[13px] outline-none text-slate-900 dark:text-white"/>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
            {matches.map((s) => (
              <button key={s.id} onClick={() => { onChange(s.id); setQ(''); }}
                className="w-full text-left px-3 py-2 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition">
                <div className="text-[12px] font-semibold text-slate-800 dark:text-white truncate">{s.name}</div>
                <div className="text-[10px] text-slate-500">{s.city} · {s.code}</div>
              </button>
            ))}
            {matches.length === 0 && <div className="px-3 py-4 text-center text-[11px] text-slate-400">No store matches “{q}”</div>}
          </div>
          {!q && <div className="text-[10px] text-slate-400 text-center">Showing 12 of {sites.length} stores — search to narrow down</div>}
        </>
      )}
    </div>
  );
}

/* ---- Small labelled field used throughout the wizard ---- */
function MField({ label, hint, children }) {
  return (
    <label className="block">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">{label}</div>
      {children}
      {hint && <div className="text-[10px] text-slate-400 mt-1">{hint}</div>}
    </label>
  );
}
const mInput = 'w-full h-10 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] outline-none focus:border-brand-500 transition text-slate-900 dark:text-white';

/* ---- Verified read-only chip for eKYC-sourced values ---- */
function KycRow({ label, value }) {
  return (
    <div className="px-3 py-2 flex items-start justify-between gap-3">
      <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500 shrink-0 pt-0.5">{label}</div>
      <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 text-right">{value || '—'}</div>
    </div>
  );
}

/* ======================= The wizard ======================= */
function MobileOnboarding({ reapplyFor, onClose, onSubmitted }) {
  const store = useStore();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState(null);

  const [d, setD] = useState(() => ({
    phone: reapplyFor ? (reapplyFor.phone || '').replace(/\D/g, '').slice(-10) : '',
    phoneOtp: '', phoneVerified: !!reapplyFor,
    aadhaar: '', aadhaarOtp: '', aadhaarVerified: false, kyc: null,
    email: reapplyFor ? (reapplyFor.email || '') : '', altPhone: '',
    maritalStatus: 'Single', bloodGroup: '', emergencyName: '', emergencyPhone: '',
    sameAddress: true, currentAddress: '',
    pan: '', panOtp: '', panVerified: false,
    bankAcct: '', bankAcctConfirm: '', ifsc: '', bankOtp: '', bankVerified: false,
    employmentBasis: 'contract',
    siteId: reapplyFor ? (reapplyFor.siteId || '') : '',
    documents: reapplyFor && reapplyFor.documents ? { ...reapplyFor.documents } : {},
    declared: false,
  }));
  const set = (patch) => { setD((s) => ({ ...s, ...patch })); setErr(''); };

  const cur = ONB_STEPS[step];
  const bankName = bankFromIfsc(d.ifsc);

  /* ---- gates ---- */
  const canNext = () => {
    switch (cur.k) {
      case 'mobile':    return d.phoneVerified;
      case 'aadhaar':   return d.aadhaarVerified;
      case 'personal':  return !!d.email.trim() && !!d.emergencyName.trim() && d.emergencyPhone.replace(/\D/g, '').length >= 10 && (d.sameAddress || !!d.currentAddress.trim());
      case 'pan':       return d.panVerified;
      case 'bank':      return d.bankVerified;
      case 'store':     return !!d.siteId;
      case 'documents': return MOBILE_DOC_LIST.filter((x) => x.required).every((x) => d.documents[x.k] && d.documents[x.k].status !== 'missing');
      case 'review':    return d.declared;
      default:          return true;
    }
  };

  /* ---- simulated verifications ---- */
  const run = (kind, ms, fn) => { setBusy(kind); setTimeout(() => { setBusy(null); fn(); }, ms); };

  const verifyPhone = () => {
    if (d.phone.replace(/\D/g, '').length !== 10) { setErr('Enter a valid 10-digit mobile number'); return; }
    const existing = Store.findEmployeeByPhone(d.phone);
    if (existing && (!reapplyFor || existing.id !== reapplyFor.id)) {
      setErr(existing.status === 'active'
        ? 'This number already has an active account — go back and sign in instead.'
        : 'An application already exists for this number.');
      return;
    }
    if (d.phoneOtp !== DEMO_OTP) { setErr('Incorrect OTP. For this demo the code is ' + DEMO_OTP + '.'); return; }
    run('phone', 600, () => { set({ phoneVerified: true }); toast('Mobile number verified', 'success'); });
  };

  const verifyAadhaar = () => {
    if (d.aadhaar.length !== 12) { setErr('Aadhaar must be 12 digits'); return; }
    if (d.aadhaarOtp !== DEMO_OTP) { setErr('Incorrect Aadhaar OTP. For this demo the code is ' + DEMO_OTP + '.'); return; }
    run('aadhaar', 1300, () => {
      const kyc = resolveAadhaarIdentity(d.aadhaar);
      set({ aadhaarVerified: true, kyc });
      toast('Aadhaar verified — details fetched from UIDAI', 'success');
    });
  };

  const verifyPan = () => {
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(d.pan)) { setErr('PAN must look like ABCDE1234F'); return; }
    if (d.panOtp !== DEMO_OTP) { setErr('Incorrect PAN OTP. For this demo the code is ' + DEMO_OTP + '.'); return; }
    run('pan', 1100, () => { set({ panVerified: true }); toast('PAN verified — name matched with Aadhaar', 'success'); });
  };

  const verifyBank = () => {
    if (d.bankAcct.length < 8) { setErr('Enter a valid account number'); return; }
    if (d.bankAcct !== d.bankAcctConfirm) { setErr('Account numbers do not match'); return; }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(d.ifsc)) { setErr('IFSC must look like HDFC0001234'); return; }
    if (d.bankOtp !== DEMO_OTP) { setErr('Incorrect bank OTP. For this demo the code is ' + DEMO_OTP + '.'); return; }
    run('bank', 1300, () => { set({ bankVerified: true }); toast('Bank account verified via ₹1 penny-drop', 'success'); });
  };

  const onDocFile = (docKey, file, source) => {
    set({ documents: { ...d.documents, [docKey]: {
      status: 'uploaded',
      fileName: file.name || (source === 'camera' ? 'camera-capture.jpg' : 'upload'),
      size: file.size, type: file.type, uploadedAt: new Date().toISOString(),
    } } });
    const meta = MOBILE_DOC_LIST.find((x) => x.k === docKey);
    toast(`${meta ? meta.label : docKey} uploaded`, 'success');
  };

  const submit = () => {
    const k = d.kyc || {};
    const address = [k.house, k.street, k.locality, k.city, k.state, k.pin].filter(Boolean).join(', ');
    const payload = {
      name: k.name, phone: '+91 ' + d.phone, email: d.email.trim(),
      dob: k.dob, gender: k.gender,
      aadhaarMasked: 'XXXX-XXXX-' + d.aadhaar.slice(-4),
      panMasked: d.pan.slice(0, 2) + 'XXX' + d.pan.slice(-4),
      bankVerified: true,
      bankAccountMasked: 'XXXX' + d.bankAcct.slice(-4),
      ifsc: d.ifsc, bankName: bankFromIfsc(d.ifsc) || '',
      siteId: d.siteId,
      employmentBasis: d.employmentBasis,
      pf: { applicable: d.employmentBasis === 'full-time', uan: '' },
      tds: { applicable: false },
      permanentAddress: address,
      currentAddress: d.sameAddress ? address : d.currentAddress.trim(),
      altPhone: d.altPhone ? '+91 ' + d.altPhone : '',
      maritalStatus: d.maritalStatus, bloodGroup: d.bloodGroup,
      emergencyContact: { name: d.emergencyName.trim(), phone: '+91 ' + d.emergencyPhone.replace(/\D/g, '').slice(-10) },
      documents: d.documents,
      onboardingSource: 'self-mobile',
      status: 'pending',
    };

    if (reapplyFor) {
      // Re-application reuses the existing record so HR keeps one thread per person.
      Store.updateEmployee(reapplyFor.id, { ...payload, rejectionReason: null, submittedAt: new Date().toISOString() });
      toast('Application resubmitted for review', 'success');
      onSubmitted(Store.getEmployee(reapplyFor.id));
    } else {
      const emp = Store.addEmployee(payload);
      toast('Application submitted for HR approval', 'success');
      onSubmitted(emp);
    }
  };

  const next = () => { if (step < ONB_STEPS.length - 1) setStep(step + 1); else submit(); };

  return (
    <MobileScreen>
      {/* Header + progress */}
      <div className="pt-9 px-4 pb-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
            <Icon name="chevron-left" className="w-4 h-4"/>
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-slate-900 dark:text-white">
              {reapplyFor ? 'Correct your application' : 'Self onboarding'}
            </div>
            <div className="text-[10px] text-slate-500">Step {step + 1} of {ONB_STEPS.length} · {cur.label}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
            <Icon name="x" className="w-4 h-4"/>
          </button>
        </div>
        <div className="mt-2.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: ((step + 1) / ONB_STEPS.length * 100) + '%' }}/>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* ---------- 1 · Mobile ---------- */}
        {cur.k === 'mobile' && (
          <>
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800">
              <Icon name="phone" className="w-4 h-4 text-brand-700 dark:text-brand-300 shrink-0 mt-px"/>
              <div className="text-[10px] text-brand-900 dark:text-brand-100 leading-relaxed">
                Your mobile number becomes your sign-in ID once HR approves you.
              </div>
            </div>
            <MField label="Mobile number">
              <input type="tel" inputMode="numeric" value={d.phone} disabled={d.phoneVerified}
                onChange={(e) => set({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                placeholder="10-digit number" className={mInput + (d.phoneVerified ? ' opacity-60' : '')}/>
            </MField>
            {!d.phoneVerified && (
              <MField label="OTP" hint={'Demo OTP: ' + DEMO_OTP}>
                <input type="tel" inputMode="numeric" value={d.phoneOtp}
                  onChange={(e) => set({ phoneOtp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  placeholder="6 digits" className={mInput}/>
              </MField>
            )}
            {d.phoneVerified
              ? <VerifiedBanner text={'Mobile verified · +91 ' + d.phone}/>
              : <StepBtn onClick={verifyPhone} busy={busy === 'phone'} label="Verify mobile" busyLabel="Verifying…"/>}
          </>
        )}

        {/* ---------- 2 · Aadhaar eKYC ---------- */}
        {cur.k === 'aadhaar' && (
          <>
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800">
              <Icon name="shield" className="w-4 h-4 text-brand-700 dark:text-brand-300 shrink-0 mt-px"/>
              <div className="text-[10px] text-brand-900 dark:text-brand-100 leading-relaxed">
                Powered by UIDAI eKYC (simulated). Your name, date of birth, gender and address are fetched
                automatically — you will not need to type them. Only the last 4 digits are ever stored.
              </div>
            </div>
            <MField label="Aadhaar number">
              <input type="tel" inputMode="numeric" value={d.aadhaar} disabled={d.aadhaarVerified}
                onChange={(e) => set({ aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                placeholder="12-digit UID" className={mInput + (d.aadhaarVerified ? ' opacity-60' : '')}/>
            </MField>
            {!d.aadhaarVerified && (
              <MField label="OTP sent to your Aadhaar-linked mobile" hint={'Demo OTP: ' + DEMO_OTP}>
                <input type="tel" inputMode="numeric" value={d.aadhaarOtp}
                  onChange={(e) => set({ aadhaarOtp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  placeholder="6 digits" className={mInput}/>
              </MField>
            )}
            {!d.aadhaarVerified
              ? <StepBtn onClick={verifyAadhaar} busy={busy === 'aadhaar'} label="Verify with UIDAI" busyLabel="Contacting UIDAI…"/>
              : (
                <>
                  <VerifiedBanner text={'Aadhaar verified · XXXX-XXXX-' + d.aadhaar.slice(-4)}/>
                  <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 overflow-hidden">
                    <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/25 border-b border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                      <Icon name="check-circle" className="w-3.5 h-3.5 text-emerald-600"/>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">Fetched from UIDAI</span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      <KycRow label="Name" value={d.kyc.name}/>
                      <KycRow label="Date of birth" value={fmtDate(d.kyc.dob, { year: true })}/>
                      <KycRow label="Gender" value={d.kyc.gender}/>
                      <KycRow label="Care of" value={d.kyc.careOf}/>
                      <KycRow label="Address" value={[d.kyc.house, d.kyc.street, d.kyc.locality].filter(Boolean).join(', ')}/>
                      <KycRow label="City / State" value={d.kyc.city + ', ' + d.kyc.state}/>
                      <KycRow label="PIN code" value={d.kyc.pin}/>
                    </div>
                  </div>
                </>
              )}
          </>
        )}

        {/* ---------- 3 · Personal ---------- */}
        {cur.k === 'personal' && (
          <>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-2.5">
              <div className="text-[10px] text-slate-500 leading-relaxed">
                <span className="font-bold text-slate-700 dark:text-slate-200">{d.kyc && d.kyc.name}</span> · {d.kyc && d.kyc.gender} · born {d.kyc && fmtDate(d.kyc.dob, { year: true })}
                <span className="block mt-0.5">Fetched from Aadhaar and locked. Only add what is missing below.</span>
              </div>
            </div>
            <MField label="Email address">
              <input type="email" value={d.email} onChange={(e) => set({ email: e.target.value })} placeholder="you@example.com" className={mInput}/>
            </MField>
            <MField label="Alternate mobile (optional)">
              <input type="tel" inputMode="numeric" value={d.altPhone} onChange={(e) => set({ altPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="10-digit number" className={mInput}/>
            </MField>
            <div className="grid grid-cols-2 gap-2.5">
              <MField label="Marital status">
                <select value={d.maritalStatus} onChange={(e) => set({ maritalStatus: e.target.value })} className={mInput}>
                  <option>Single</option><option>Married</option><option>Other</option>
                </select>
              </MField>
              <MField label="Blood group">
                <select value={d.bloodGroup} onChange={(e) => set({ bloodGroup: e.target.value })} className={mInput}>
                  <option value="">Select</option>
                  {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </MField>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Emergency contact</div>
              <MField label="Full name">
                <input value={d.emergencyName} onChange={(e) => set({ emergencyName: e.target.value })} placeholder="Contact person" className={mInput}/>
              </MField>
              <MField label="Mobile number">
                <input type="tel" inputMode="numeric" value={d.emergencyPhone} onChange={(e) => set({ emergencyPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="10-digit number" className={mInput}/>
              </MField>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Permanent address (from Aadhaar)</div>
              <div className="text-[11px] text-slate-700 dark:text-slate-200 leading-relaxed">
                {d.kyc && [d.kyc.house, d.kyc.street, d.kyc.locality, d.kyc.city, d.kyc.state, d.kyc.pin].filter(Boolean).join(', ')}
              </div>
              <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer pt-1">
                <input type="checkbox" checked={d.sameAddress} onChange={(e) => set({ sameAddress: e.target.checked })} className="accent-brand-700 w-4 h-4"/>
                I currently live at this address
              </label>
              {!d.sameAddress && (
                <MField label="Current address">
                  <textarea value={d.currentAddress} onChange={(e) => set({ currentAddress: e.target.value })} rows={3}
                    placeholder="Flat / Street / Locality / City / PIN"
                    className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] outline-none focus:border-brand-500 text-slate-900 dark:text-white"/>
                </MField>
              )}
            </div>
          </>
        )}

        {/* ---------- 4 · PAN ---------- */}
        {cur.k === 'pan' && (
          <>
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800">
              <Icon name="file" className="w-4 h-4 text-brand-700 dark:text-brand-300 shrink-0 mt-px"/>
              <div className="text-[10px] text-brand-900 dark:text-brand-100 leading-relaxed">
                Your PAN is name-matched against NSDL records and against the name on your Aadhaar (simulated).
              </div>
            </div>
            <MField label="PAN number" hint="10 characters, e.g. ABCDE1234F">
              <input value={d.pan} disabled={d.panVerified}
                onChange={(e) => set({ pan: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) })}
                placeholder="ABCDE1234F" className={mInput + ' tracking-widest font-semibold' + (d.panVerified ? ' opacity-60' : '')}/>
            </MField>
            {!d.panVerified && (
              <MField label="OTP sent to your registered mobile" hint={'Demo OTP: ' + DEMO_OTP}>
                <input type="tel" inputMode="numeric" value={d.panOtp}
                  onChange={(e) => set({ panOtp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  placeholder="6 digits" className={mInput}/>
              </MField>
            )}
            {d.panVerified
              ? <VerifiedBanner text={'PAN verified · name matched with ' + (d.kyc ? d.kyc.name : 'Aadhaar')}/>
              : <StepBtn onClick={verifyPan} busy={busy === 'pan'} label="Verify PAN" busyLabel="Verifying with NSDL…"/>}
          </>
        )}

        {/* ---------- 5 · Bank ---------- */}
        {cur.k === 'bank' && (
          <>
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800">
              <Icon name="wallet" className="w-4 h-4 text-brand-700 dark:text-brand-300 shrink-0 mt-px"/>
              <div className="text-[10px] text-brand-900 dark:text-brand-100 leading-relaxed">
                Penny-drop verification via NPCI — we credit ₹1 to confirm the account belongs to you.
                Your salary is paid into this account.
              </div>
            </div>
            <MField label="Account number">
              <input type="tel" inputMode="numeric" value={d.bankAcct} disabled={d.bankVerified}
                onChange={(e) => set({ bankAcct: e.target.value.replace(/\D/g, '').slice(0, 18) })}
                placeholder="Account number" className={mInput + (d.bankVerified ? ' opacity-60' : '')}/>
            </MField>
            {!d.bankVerified && (
              <MField label="Re-enter account number">
                <input type="tel" inputMode="numeric" value={d.bankAcctConfirm}
                  onChange={(e) => set({ bankAcctConfirm: e.target.value.replace(/\D/g, '').slice(0, 18) })}
                  placeholder="Confirm account number" className={mInput}/>
              </MField>
            )}
            <MField label="IFSC code" hint={bankName ? 'Detected: ' + bankName : 'e.g. HDFC0001234'}>
              <input value={d.ifsc} disabled={d.bankVerified}
                onChange={(e) => set({ ifsc: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11) })}
                placeholder="HDFC0001234" className={mInput + ' tracking-widest font-semibold' + (d.bankVerified ? ' opacity-60' : '')}/>
            </MField>
            {!d.bankVerified && (
              <MField label="OTP sent to your registered mobile" hint={'Demo OTP: ' + DEMO_OTP}>
                <input type="tel" inputMode="numeric" value={d.bankOtp}
                  onChange={(e) => set({ bankOtp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  placeholder="6 digits" className={mInput}/>
              </MField>
            )}
            {d.bankVerified
              ? <VerifiedBanner text={'Account verified · XXXX' + d.bankAcct.slice(-4) + (bankName ? ' · ' + bankName : '')}/>
              : <StepBtn onClick={verifyBank} busy={busy === 'bank'} label="Verify bank account" busyLabel="Sending ₹1 penny-drop…"/>}
          </>
        )}

        {/* ---------- 6 · Store ---------- */}
        {cur.k === 'store' && (
          <>
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800">
              <Icon name="building" className="w-4 h-4 text-brand-700 dark:text-brand-300 shrink-0 mt-px"/>
              <div className="text-[10px] text-brand-900 dark:text-brand-100 leading-relaxed">
                Pick the store you have been hired for. HR can reassign you during approval if needed.
              </div>
            </div>
            <StorePicker value={d.siteId} onChange={(id) => set({ siteId: id })}/>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Employment basis</div>
              <div className="grid grid-cols-2 gap-2">
                {Store.EMPLOYMENT_BASIS.map((b) => (
                  <button key={b.id} type="button" onClick={() => set({ employmentBasis: b.id })}
                    className={`text-left p-2.5 rounded-lg border-2 transition ${d.employmentBasis === b.id
                      ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                    <div className="text-[12px] font-bold text-slate-800 dark:text-white">{b.label}</div>
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-slate-400">HR confirms this and configures PF/TDS during approval.</div>
            </div>
          </>
        )}

        {/* ---------- 7 · Documents ---------- */}
        {cur.k === 'documents' && (
          <>
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800">
              <Icon name="info" className="w-4 h-4 text-brand-700 dark:text-brand-300 shrink-0 mt-px"/>
              <div className="text-[10px] text-brand-900 dark:text-brand-100 leading-relaxed">
                Tap the <span className="font-bold">SAMPLE</span> thumbnail on any card to see exactly what a valid
                upload looks like. Accepted: <span className="font-bold">JPG, PNG, PDF</span> · max <span className="font-bold">{DOC_MAX_MB} MB</span>.
              </div>
            </div>
            {MOBILE_DOC_LIST.map((doc) => (
              <MobileDocCard key={doc.k} doc={doc}
                record={d.documents[doc.k] || { status: 'missing' }}
                onPreview={setPreview} onFile={onDocFile}/>
            ))}
          </>
        )}

        {/* ---------- 8 · Review ---------- */}
        {cur.k === 'review' && (
          <>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Review your application
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <KycRow label="Name" value={d.kyc && d.kyc.name}/>
                <KycRow label="Date of birth" value={d.kyc && fmtDate(d.kyc.dob, { year: true })}/>
                <KycRow label="Gender" value={d.kyc && d.kyc.gender}/>
                <KycRow label="Mobile" value={'+91 ' + d.phone}/>
                <KycRow label="Email" value={d.email}/>
                <KycRow label="Aadhaar" value={'XXXX-XXXX-' + d.aadhaar.slice(-4)}/>
                <KycRow label="PAN" value={d.pan.slice(0, 2) + 'XXX' + d.pan.slice(-4)}/>
                <KycRow label="Bank" value={'XXXX' + d.bankAcct.slice(-4) + (bankName ? ' · ' + bankName : '')}/>
                <KycRow label="IFSC" value={d.ifsc}/>
                <KycRow label="Store" value={d.siteId && store.getSite(d.siteId) ? store.getSite(d.siteId).name : '—'}/>
                <KycRow label="Employment basis" value={Store.EMPLOYMENT_BASIS.find((b) => b.id === d.employmentBasis)?.label}/>
                <KycRow label="Emergency contact" value={d.emergencyName + ' · +91 ' + d.emergencyPhone}/>
                <KycRow label="Documents" value={Object.values(d.documents).filter((x) => x && x.status !== 'missing').length + ' uploaded'}/>
              </div>
            </div>
            <label className="flex items-start gap-2 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 cursor-pointer">
              <input type="checkbox" checked={d.declared} onChange={(e) => set({ declared: e.target.checked })} className="accent-brand-700 w-4 h-4 mt-0.5 shrink-0"/>
              <span className="text-[11px] text-slate-700 dark:text-slate-200 leading-relaxed">
                I confirm that the information and documents provided are true and belong to me. I understand
                that false information may lead to my application being rejected.
              </span>
            </label>
          </>
        )}

        {err && (
          <div className="flex items-start gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            <Icon name="alert" className="w-3.5 h-3.5 shrink-0 mt-px"/><span>{err}</span>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="px-4 pb-5 pt-2.5 shrink-0 border-t border-slate-200 dark:border-slate-800 flex gap-2">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)}
            className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[13px] font-semibold shrink-0">
            Back
          </button>
        )}
        <button onClick={next} disabled={!canNext()}
          className={`flex-1 h-11 rounded-xl text-white text-[13px] font-bold transition disabled:opacity-40 disabled:cursor-not-allowed ${
            cur.k === 'review' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-brand-700 hover:bg-brand-800'
          }`}>
          {cur.k === 'review' ? (reapplyFor ? 'Resubmit application' : 'Submit for approval') : 'Continue'}
        </button>
      </div>

      {preview && <MobileSamplePreview docKey={preview} onClose={() => setPreview(null)}/>}
    </MobileScreen>
  );
}

/* ---- small shared bits ---- */
function StepBtn({ onClick, busy, label, busyLabel }) {
  return (
    <button onClick={onClick} disabled={busy}
      className="w-full h-11 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white text-[13px] font-bold transition flex items-center justify-center gap-2">
      {busy && <Icon name="refresh" className="w-4 h-4 animate-spin"/>}
      {busy ? busyLabel : label}
    </button>
  );
}
function VerifiedBanner({ text }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
      <Icon name="check-circle" className="w-4 h-4 text-emerald-600 shrink-0"/>
      <div className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-100">{text}</div>
    </div>
  );
}

Object.assign(window, {
  ONB_STEPS, AADHAAR_IDENTITIES, resolveAadhaarIdentity, IFSC_BANKS, bankFromIfsc,
  StorePicker, MobileOnboarding, StepBtn, VerifiedBanner, MField, KycRow,
});
