/* Mobile profile: personal info, documents, incentive detail */
/* ---- Company policies, on the phone ----
   The handbook and HR policies are written for the people who carry this app,
   so they have to be readable from it. Read-only by construction: there is no
   edit path here at all, and editing lives with HR and Admin on the desktop. */
function MobilePoliciesSheet({ onClose }) {
  const store = useStore();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const list = store.getPolicies().filter((p) => p.active)
    .filter((p) => !q || `${p.title} ${p.category} ${p.summary}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="absolute inset-0 z-[5] bg-white dark:bg-slate-900 flex flex-col anim-in">
      <div className="pt-9 px-4 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Icon name="chevron-left" className="w-4 h-4"/>
          </button>
          <div className="min-w-0">
            <div className="text-[14px] font-bold text-slate-900 dark:text-white">Company Policies</div>
            <div className="text-[10px] text-slate-500">Maintained by HR · read and download</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <Icon name="search" className="w-3.5 h-3.5 text-slate-400"/>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search policies…"
            className="flex-1 min-w-0 bg-transparent text-[12px] outline-none dark:text-slate-100"/>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {list.length === 0 && (
          <div className="p-8 text-center text-[11px] text-slate-500">
            {q ? 'Nothing matches that search.' : 'No policies published yet.'}
          </div>
        )}
        {list.map((p) => (
          <button key={p.id} onClick={() => setOpen(p)}
            className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 flex gap-2.5 hover:border-brand-400 transition">
            <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
              <Icon name="book" className="w-4 h-4"/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-bold text-slate-900 dark:text-white truncate">{p.title}</div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge tone="slate">{p.category}</Badge>
                <Badge tone="brand">v{p.version}</Badge>
                {p.acknowledgeRequired && <Badge tone="amber">Acknowledge</Badge>}
              </div>
              <div className="text-[10.5px] text-slate-500 mt-1 line-clamp-2 leading-snug">{p.summary}</div>
            </div>
            <Icon name="chevron-right" className="w-4 h-4 text-slate-300 shrink-0 self-center"/>
          </button>
        ))}
      </div>

      {open && (
        <div className="absolute inset-0 z-40 bg-slate-900/70 backdrop-blur-sm flex items-end" onClick={() => setOpen(null)}>
          <div className="w-full bg-white dark:bg-slate-900 rounded-t-2xl max-h-[88%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-slate-900 dark:text-white">{open.title}</div>
                <div className="text-[10px] text-slate-500">{open.category} · v{open.version} · updated {fmtDate(open.updatedAt, { year: true })}</div>
              </div>
              <button onClick={() => setOpen(null)} className="w-8 h-8 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                <Icon name="x" className="w-4 h-4"/>
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11.5px] text-slate-700 dark:text-slate-200 leading-relaxed">
                {open.summary}
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                {[['Document', open.fileName], ['Version', 'v' + open.version],
                  ['Acknowledgement', open.acknowledgeRequired ? 'Required during onboarding' : 'Not required'],
                  ['Updated by', open.updatedBy]].map(([k, v]) => (
                  <div key={k} className="px-3 py-2 flex justify-between gap-3">
                    <span className="text-slate-500 shrink-0">{k}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100 text-right truncate">{v}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => toast(`Downloading ${open.fileName}`, 'info')}
                className="w-full h-10 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-[13px] font-semibold flex items-center justify-center gap-2">
                <Icon name="download" className="w-4 h-4"/>Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileProfile({ emp: empProp, onLogout, onTour, onOpenDocs, onOpenPolicies, restricted = false }) {
  const store = useStore();
  /* Read the live record so document uploads reflect immediately. */
  const emp = store.getEmployee(empProp.id) || empProp;
  const site = store.getSite(emp.siteId);
  const docs = getEmpDocs(emp);
  const pendingDocs = docsPendingCount(emp);
  const july = '2026-07';
  const sales = store.getSales(emp.id, july)?.totalSales || 0;
  const detail = store.incentiveDetail(emp, july);

  return (
    <div className="px-4 space-y-3">
      {/* Profile hero */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
        <Avatar emp={emp} size={56}/>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold text-slate-900 dark:text-white">{emp.name}</div>
          <div className="text-[11px] text-slate-500 font-mono">{emp.code} · {ROLE_LABEL[emp.role]}</div>
          <div className="flex gap-1.5 mt-1">
            <Badge tone="green">Active</Badge>
            <Badge tone="brand">{site?.city}</Badge>
          </div>
        </div>
      </div>

      {/* Incentive tracker — store-specific slab. A Team Lead never sees an
          individual pay figure, not even their own (spec: "View incentives —
          Team performance only, never individual pay"), so this card is
          skipped entirely for that role rather than shown with a ₹0. */}
      {!restricted && (
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
        <div className="flex items-center justify-between mb-1">
          {/* The title names whichever branch actually won — this used to say
              "Store incentive slab" unconditionally, which was wrong whenever
              the store-target branch (not the slab) was the higher figure. */}
          <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500">
            {detail.winner === 'target' ? 'Store target incentive · July' : 'Store incentive slab · July'}
          </div>
          <div className="text-[13px] font-bold text-emerald-700 dark:text-emerald-400">{fmtINR(detail.payout)}</div>
        </div>
        <div className="text-[10px] text-slate-500 mb-2">{site?.name} · <span className="font-semibold text-slate-600 dark:text-slate-300">{detail.raw || detail.label}</span></div>
        {/* Independent threshold rules — these pay on top of the slab */}
        {detail.rules && (detail.rules.applied.length > 0 || detail.rules.pending.length > 0) && (
          <div className="mb-2 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-[9px] uppercase font-bold tracking-wide text-slate-500">Extra incentive rules</span>
              {detail.rules.total > 0 && <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">+{fmtINR(detail.rules.total)}</span>}
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {detail.rules.applied.map((r, i) => (
                <div key={'a' + i} className="px-2.5 py-1.5 flex items-center gap-2">
                  <Icon name="check-circle" className="w-3.5 h-3.5 text-emerald-600 shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-slate-800 dark:text-white">{r.typeLabel}</div>
                    <div className="text-[9px] text-slate-500">Unlocked · crossed {r.minLabel}</div>
                  </div>
                  <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">{fmtINR(r.amount)}</div>
                </div>
              ))}
              {detail.rules.pending.map((r, i) => (
                <div key={'p' + i} className="px-2.5 py-1.5 flex items-center gap-2 opacity-70">
                  <Icon name="target" className="w-3.5 h-3.5 text-slate-400 shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{r.typeLabel}</div>
                    <div className="text-[9px] text-slate-500">{r.remainingLabel} more sales to unlock {r.minLabel}</div>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-400">{r.amountLabel}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {detail.tiers.length === 0 && <div className="text-[11px] text-slate-400">This store has no incentive slab configured.</div>}
          {detail.tiers.map((t, i) => (
            <div key={i} className={`p-2 rounded-lg border ${t.active ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : t.reached ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-800' : 'border-slate-200 dark:border-slate-700'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${t.active ? 'bg-brand-700 text-white' : t.reached ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700'}`}>
                  {t.reached ? <Icon name="check" className="w-3 h-3"/> : <span className="text-[10px] font-bold">₹</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-slate-800 dark:text-white">Cross {t.fromLabel} sales</div>
                  <div className="text-[10px] text-slate-500">{t.active ? 'Current tier' : t.reached ? 'Achieved' : 'Locked'}</div>
                </div>
                <div className={`text-[12px] font-bold ${t.active ? 'text-brand-700 dark:text-brand-300' : t.reached ? 'text-emerald-700' : 'text-slate-400'}`}>{t.payoutText}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Info list — a Team Lead's own KYC (Aadhaar/PAN/bank) is excluded here
          too, per the same "no individual pay/KYC information" rule. */}
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
        {[
          ['Phone', emp.phone, 'phone'],
          ['Email', emp.email, 'mail'],
          ['Assigned site', site?.name, 'building'],
          ['Shift', `${site?.shiftStart} – ${site?.shiftEnd}`, 'clock'],
          ...(restricted ? [] : [
            ['Aadhaar', emp.aadhaarMasked, 'shield'],
            ['PAN', emp.panMasked, 'file'],
            ['Bank', emp.bankVerified ? 'Verified ✓ via penny-drop' : '—', 'wallet'],
          ]),
          ['Joined', fmtDate(emp.joiningDate, { year: true }), 'calendar'],
        ].map(([k, v, i]) => (
          <div key={k} className="p-3 flex items-center gap-2.5">
            <Icon name={i} className="w-4 h-4 text-slate-400"/>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wide">{k}</div>
              <div className="text-[12px] font-semibold text-slate-800 dark:text-white truncate">{v}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Onboarding documents — tap through to sample previews + upload.
          Skipped for a Team Lead: these are government-ID documents, and the
          rule barring individual KYC applies to that role's own file too. */}
      {!restricted && (
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500">Onboarding documents</div>
          {pendingDocs > 0
            ? <Badge tone="red">{pendingDocs} pending</Badge>
            : <Badge tone="green">All submitted</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {MOBILE_DOC_LIST.map((d) => {
            const st = docs[d.k].status;
            return (
              <button key={d.k} onClick={() => onOpenDocs && onOpenDocs()}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-left hover:border-brand-400 hover:bg-brand-50/40 dark:hover:bg-brand-900/10 transition">
                <Icon name="file" className={`w-4 h-4 shrink-0 ${st === 'verified' ? 'text-emerald-600' : st === 'uploaded' ? 'text-amber-600' : 'text-slate-400'}`}/>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-slate-800 dark:text-white truncate">{d.label}</div>
                  <div className={`text-[9px] ${st === 'verified' ? 'text-emerald-600' : st === 'uploaded' ? 'text-amber-600' : 'text-slate-400'}`}>
                    {st === 'verified' ? 'Verified ✓' : st === 'uploaded' ? 'In review' : d.required ? 'Required' : 'Optional'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={() => onOpenDocs && onOpenDocs()}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-[12px] font-semibold transition">
          <Icon name="upload" className="w-3.5 h-3.5"/>Manage documents &amp; view samples
        </button>
      </div>
      )}

      {/* Company policies — the same library HR maintains, read-only here */}
      <button onClick={() => onOpenPolicies && onOpenPolicies()}
        className="w-full rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3 text-left hover:border-brand-400 transition">
        <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
          <Icon name="book" className="w-4 h-4"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-bold text-slate-800 dark:text-white">Company Policies</div>
          <div className="text-[10px] text-slate-500">
            {store.getPolicies().filter((p) => p.active).length} documents · handbook, code of conduct, leave, payroll
          </div>
        </div>
        <Icon name="chevron-right" className="w-4 h-4 text-slate-300 shrink-0"/>
      </button>

      {/* Account actions */}
      <div className="space-y-2 pt-1">
        <button onClick={() => onTour && onTour()} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-[13px] hover:bg-slate-50 dark:hover:bg-slate-700">
          <Icon name="sparkle" className="w-4 h-4 text-brand-700 dark:text-brand-300"/>Replay app tour
        </button>
        <button onClick={() => onLogout && onLogout()} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-semibold text-[13px] hover:bg-rose-100 dark:hover:bg-rose-900/30">
          <Icon name="logout" className="w-4 h-4"/>Sign out
        </button>
      </div>

      <div className="text-[10px] text-center text-slate-400 py-4">S.D. Computronix HRMS · v1.0 (demo)</div>
    </div>
  );
}

Object.assign(window, { MobileProfile, MobilePoliciesSheet });
