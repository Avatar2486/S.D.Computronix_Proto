/* Mobile onboarding documents — sample preview + validated upload per document.
   Rendered as a full-screen sheet inside the phone frame (sibling of MobileNotifPanel)
   so the overlay stays within the device, not the browser viewport. */

const MOBILE_DOC_LIST = [
  { k: 'aadhaar', label: 'Aadhaar Card',           hint: 'Front side — name, DOB and 12-digit UID clearly readable', required: true },
  { k: 'pan',     label: 'PAN Card',               hint: 'Front side — 10-character PAN clearly readable',           required: true },
  { k: 'bank',    label: 'Bank Passbook / Cheque', hint: 'First page or cancelled cheque — account no. + IFSC',      required: true },
  { k: 'photo',   label: 'Profile Photo',          hint: 'Passport size, plain background, face clearly visible',    required: true },
  { k: 'address', label: 'Address Proof',          hint: 'Optional — utility bill (within 3 months) or Voter ID',    required: false },
];

/* Existing employees carry KYC flags but no per-file record; derive a sensible
   starting state so already-verified proofs aren't shown as missing. */
function getEmpDocs(emp) {
  const stored = (emp && emp.documents) || {};
  const seeded = {
    aadhaar: emp && emp.aadhaarMasked ? { status: 'verified' } : { status: 'missing' },
    pan:     emp && emp.panMasked     ? { status: 'verified' } : { status: 'missing' },
    bank:    emp && emp.bankVerified  ? { status: 'verified' } : { status: 'missing' },
    photo:   { status: 'missing' },
    address: { status: 'missing' },
  };
  const out = {};
  MOBILE_DOC_LIST.forEach((d) => { out[d.k] = stored[d.k] || seeded[d.k] || { status: 'missing' }; });
  return out;
}

const docsPendingCount = (emp) => {
  const docs = getEmpDocs(emp);
  return MOBILE_DOC_LIST.filter((d) => d.required && docs[d.k].status === 'missing').length;
};

const fmtFileSize = (bytes) => (!bytes ? '' : bytes < 1024 * 1024 ? Math.round(bytes / 1024) + ' KB' : (bytes / 1024 / 1024).toFixed(1) + ' MB');

/* ---- Full-bleed sample viewer (inside the phone) ---- */
function MobileSamplePreview({ docKey, onClose }) {
  const info = SAMPLE_DOCS[docKey];
  const meta = MOBILE_DOC_LIST.find((d) => d.k === docKey);
  if (!info) return null;
  return (
    <div className="absolute inset-0 z-40 bg-slate-900/70 backdrop-blur-sm flex items-end anim-in" onClick={onClose}>
      <div className="w-full bg-white dark:bg-slate-900 rounded-t-2xl max-h-[88%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{info.title}</div>
            <div className="text-[10px] text-slate-500">This is an example only — upload your own document</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
            <Icon name="x" className="w-4 h-4"/>
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center min-h-[150px]">
            <img
              src={info.img}
              alt={info.title}
              className="max-w-full max-h-[260px] object-contain"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
            <div style={{ display: 'none' }} className="w-full h-36 flex-col items-center justify-center gap-2 text-slate-400">
              <Icon name="file" className="w-7 h-7"/>
              <div className="text-[11px]">Sample image unavailable</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800">
            <div className="text-[11px] text-brand-900 dark:text-brand-100 leading-relaxed">{info.desc}</div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
            {[
              ['Accepted formats', 'JPG, PNG or PDF'],
              ['Maximum size', DOC_MAX_MB + ' MB'],
              ['What we check', meta ? meta.hint : 'All corners visible, no glare, text readable'],
            ].map(([k, v]) => (
              <div key={k} className="px-3 py-2 flex items-start justify-between gap-3">
                <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500 shrink-0 pt-0.5">{k}</div>
                <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 text-right">{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 pb-5">
          <button onClick={onClose} className="w-full h-10 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-[13px] font-semibold transition">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- One document row ----
   `locked` is true once an identity proof (Aadhaar / PAN) has been verified.
   The document is then the company's record of who this person is, and letting
   the holder swap the file afterwards would undo the verification — so Replace
   disappears and the row says where to go instead. */
function MobileDocCard({ doc, record, locked, onPreview, onFile }) {
  const camRef = useRef(null);
  const fileRef = useRef(null);
  const [error, setError] = useState('');
  const sample = SAMPLE_DOCS[doc.k];
  const uploaded = record.status === 'uploaded';
  const verified = record.status === 'verified';

  const pick = (file, source) => {
    const err = validateDocFile(file);
    setError(err || '');
    if (!err) onFile(doc.k, file, source);
  };

  return (
    <div className={`rounded-xl border p-3 transition ${
      error ? 'border-rose-300 bg-rose-50/60 dark:border-rose-800 dark:bg-rose-900/15'
      : verified ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-900/15'
      : uploaded ? 'border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-900/15'
      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
    }`}>
      <div className="flex gap-3">
        {/* Sample thumbnail — tap to enlarge */}
        <button onClick={() => onPreview(doc.k)} className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
          <img src={sample && sample.img} alt="" className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; }}/>
          <span className="absolute inset-x-0 bottom-0 bg-slate-900/70 text-white text-[8px] font-bold text-center py-0.5">SAMPLE</span>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[12px] font-bold text-slate-900 dark:text-white truncate">{doc.label}</div>
              <div className="text-[10px] text-slate-500 leading-snug mt-0.5">{doc.hint}</div>
            </div>
            {locked ? <Badge tone="green"><Icon name="lock" className="w-3 h-3"/>Verified</Badge>
              : verified ? <Badge tone="green">Verified</Badge>
              : uploaded ? <Badge tone="amber">In review</Badge>
              : doc.required ? <Badge tone="red">Required</Badge>
              : <Badge tone="slate">Optional</Badge>}
          </div>

          {record.fileName && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
              <Icon name="file" className="w-3 h-3 shrink-0"/>
              <span className="truncate">{record.fileName}</span>
              {record.size ? <span className="shrink-0 font-mono">· {fmtFileSize(record.size)}</span> : null}
            </div>
          )}

          {error && (
            <div className="mt-1.5 flex items-start gap-1.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
              <Icon name="alert" className="w-3 h-3 shrink-0 mt-px"/><span>{error}</span>
            </div>
          )}

          {locked ? (
            <div className="mt-2 flex items-start gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
              <Icon name="lock" className="w-3 h-3 shrink-0 mt-px"/>
              <span>Verified and locked. To correct this document, contact Admin.</span>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-1.5">
              <button onClick={() => onPreview(doc.k)}
                className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                <Icon name="eye" className="w-3 h-3"/>View Sample
              </button>
              <button onClick={() => camRef.current && camRef.current.click()}
                className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                <Icon name="camera" className="w-3 h-3"/>Camera
              </button>
              <button onClick={() => fileRef.current && fileRef.current.click()}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-brand-700 hover:bg-brand-800 text-white text-[10px] font-semibold">
                <Icon name="upload" className="w-3 h-3"/>{uploaded || verified ? 'Replace' : 'Upload'}
              </button>
            </div>
          )}

          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; pick(f, 'camera'); }}/>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
            onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; pick(f, 'file'); }}/>
        </div>
      </div>
    </div>
  );
}

/* ---- The documents sheet ---- */
function MobileDocsSheet({ emp, onClose }) {
  const store = useStore();
  const toast = useToast();
  const live = store.getEmployee(emp.id) || emp;
  const docs = getEmpDocs(live);
  const [preview, setPreview] = useState(null);

  const required = MOBILE_DOC_LIST.filter((d) => d.required);
  const done = required.filter((d) => docs[d.k].status !== 'missing').length;
  const pct = Math.round((done / required.length) * 100);

  const onFile = (docKey, file, source) => {
    if (Store.isDocumentLocked(live, docKey)) {
      toast('This document is verified and locked — contact Admin to change it', 'error');
      return;
    }
    Store.updateEmployee(live.id, {
      documents: {
        ...docs,
        [docKey]: {
          status: 'uploaded',
          fileName: file.name || (source === 'camera' ? 'camera-capture.jpg' : 'upload'),
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
        },
      },
    });
    const label = (MOBILE_DOC_LIST.find((d) => d.k === docKey) || {}).label || docKey;
    toast(`${label} uploaded — pending verification`, 'success');
  };

  return (
    /* z-[5] keeps the sheet above the tab bar but under the phone's notch (z-10)
       and status bar (z-20), so the device chrome stays visible. */
    <div className="absolute inset-0 z-[5] bg-white dark:bg-slate-900 flex flex-col anim-in">
      {/* Sheet header */}
      <div className="pt-9 px-4 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Icon name="chevron-left" className="w-4 h-4"/>
          </button>
          <div className="min-w-0">
            <div className="text-[14px] font-bold text-slate-900 dark:text-white">Onboarding Documents</div>
            <div className="text-[10px] text-slate-500">Tap any sample to see what a valid upload looks like</div>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] font-semibold mb-1">
            <span className="text-slate-500">{done} of {required.length} required documents</span>
            <span className={pct === 100 ? 'text-emerald-600' : 'text-brand-700 dark:text-brand-300'}>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-brand-600'}`} style={{ width: pct + '%' }}/>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800">
          <Icon name="info" className="w-4 h-4 text-brand-700 dark:text-brand-300 shrink-0 mt-px"/>
          <div className="text-[10px] text-brand-900 dark:text-brand-100 leading-relaxed">
            Accepted formats: <span className="font-bold">JPG, PNG, PDF</span> · Max <span className="font-bold">{DOC_MAX_MB} MB</span> per file.
            Files are checked before submission — anything invalid is rejected right away.
          </div>
        </div>

        {MOBILE_DOC_LIST.map((d) => (
          <MobileDocCard key={d.k} doc={d} record={docs[d.k]} locked={Store.isDocumentLocked(live, d.k)}
            onPreview={setPreview} onFile={onFile}/>
        ))}

        <div className="pt-1 pb-4">
          <button
            disabled={done < required.length}
            onClick={() => { toast('Documents submitted for HR verification', 'success'); onClose(); }}
            className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold transition">
            {done < required.length ? `Upload ${required.length - done} more to submit` : 'Submit for verification'}
          </button>
        </div>
      </div>

      {preview && <MobileSamplePreview docKey={preview} onClose={() => setPreview(null)}/>}
    </div>
  );
}

Object.assign(window, {
  MOBILE_DOC_LIST, getEmpDocs, docsPendingCount, fmtFileSize,
  MobileSamplePreview, MobileDocCard, MobileDocsSheet,
});
