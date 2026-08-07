/* In-phone authentication: mobile-number + OTP sign-in, and the application-status
   screen a self-onboarded applicant sees while HR reviews (or after a rejection).
   Both render inside the PhoneFrame, so they use absolute/z-* layering, not fixed. */

const DEMO_OTP = '123456';

/* Shared phone-shaped shell so login / status / onboarding all sit identically
   under the notch (pt-9) and above the home indicator. */
function MobileScreen({ children, className = '' }) {
  return <div className={`absolute inset-0 z-30 bg-white dark:bg-slate-900 flex flex-col anim-in ${className}`}>{children}</div>;
}

function OtpBoxes({ value }) {
  return (
    <div className="flex gap-1.5 justify-center">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`w-9 h-11 rounded-lg border-2 flex items-center justify-center text-[16px] font-bold transition ${
          value[i] ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/25 text-brand-800 dark:text-brand-200'
                   : 'border-slate-200 dark:border-slate-700 text-slate-300'
        }`}>{value[i] || '·'}</div>
      ))}
    </div>
  );
}

/* ---- Application status / rejection / deactivated ---- */
function MobileApplicationStatus({ emp, onBack, onReapply }) {
  const store = useStore();
  const live = (emp && store.getEmployee(emp.id)) || emp;
  if (!live) return null;

  const rejected = live.status === 'rejected';
  const inactive = live.status === 'inactive';
  const site = store.getSite(live.siteId);

  const STAGES = [
    { k: 'submitted', label: 'Application submitted', hint: live.submittedAt ? fmtDateTime(live.submittedAt) : 'Received' },
    { k: 'review', label: 'HR verification', hint: rejected ? 'Returned by HR' : 'Documents being checked' },
    { k: 'done', label: rejected ? 'Not approved' : 'Approved & activated', hint: rejected ? 'See reason below' : 'You can sign in once approved' },
  ];
  const reached = rejected ? 2 : 1; // index of the furthest stage reached

  return (
    <MobileScreen>
      <div className="pt-9 px-4 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center gap-2">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
          <Icon name="chevron-left" className="w-4 h-4"/>
        </button>
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-slate-900 dark:text-white">Application status</div>
          <div className="text-[10px] text-slate-500 truncate">{live.name} · {live.phone}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Headline */}
        <div className={`rounded-2xl p-4 text-center ${
          inactive ? 'bg-slate-100 dark:bg-slate-800'
          : rejected ? 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800'
          : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
        }`}>
          <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${
            inactive ? 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            : rejected ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
          }`}>
            <Icon name={inactive ? 'logout' : rejected ? 'x' : 'clock'} className="w-6 h-6"/>
          </div>
          <div className="text-[15px] font-bold text-slate-900 dark:text-white">
            {inactive ? 'Account deactivated' : rejected ? 'Application not approved' : 'Under review'}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
            {inactive ? 'Your account is no longer active. Please contact your HR team to restore access.'
             : rejected ? 'HR has reviewed your application and needs some corrections before you can be onboarded.'
             : 'Your details are with the HR team. You will be able to sign in as soon as your application is approved.'}
          </div>
        </div>

        {/* Rejection reason */}
        {rejected && live.rejectionReason && (
          <div className="rounded-xl border border-rose-200 dark:border-rose-800 overflow-hidden">
            <div className="px-3 py-2 bg-rose-50 dark:bg-rose-900/25 border-b border-rose-200 dark:border-rose-800 text-[10px] font-bold uppercase tracking-wide text-rose-700 dark:text-rose-300">
              Reason from HR
            </div>
            <div className="p-3 text-[12px] text-slate-700 dark:text-slate-200 leading-relaxed">{live.rejectionReason}</div>
          </div>
        )}

        {/* Progress timeline */}
        {!inactive && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500 mb-2.5">Progress</div>
            <div className="space-y-0">
              {STAGES.map((s, i) => {
                const done = i < reached || (i === reached && rejected);
                const current = i === reached && !rejected;
                const fail = rejected && i === 2;
                return (
                  <div key={s.k} className="flex gap-2.5">
                    <div className="flex flex-col items-center">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        fail ? 'bg-rose-500 text-white'
                        : done ? 'bg-emerald-500 text-white'
                        : current ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                      }`}>
                        <Icon name={fail ? 'x' : done ? 'check' : current ? 'clock' : 'info'} className="w-2.5 h-2.5"/>
                      </div>
                      {i < STAGES.length - 1 && <div className={`w-px flex-1 min-h-[22px] ${i < reached ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`}/>}
                    </div>
                    <div className="pb-3 min-w-0">
                      <div className={`text-[12px] font-semibold ${done || current ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>{s.label}</div>
                      <div className="text-[10px] text-slate-500">{s.hint}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Submitted summary */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
          {[
            ['Applicant', live.name],
            ['Employee ID', live.code],
            ['Mobile', live.phone],
            ['Aadhaar', live.aadhaarMasked || '—'],
            ['PAN', live.panMasked || '—'],
            ['Preferred store', site ? site.name : '—'],
          ].map(([k, v]) => (
            <div key={k} className="px-3 py-2 flex items-center justify-between gap-3">
              <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500 shrink-0">{k}</div>
              <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 text-right truncate">{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pb-5 pt-2 shrink-0 space-y-2 border-t border-slate-200 dark:border-slate-800">
        {rejected && onReapply && (
          <button onClick={() => onReapply(live)} className="w-full h-10 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-[13px] font-semibold transition">
            Correct &amp; re-apply
          </button>
        )}
        <button onClick={onBack} className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[13px] font-semibold">
          Back to sign in
        </button>
      </div>
    </MobileScreen>
  );
}

/* ---- Mobile sign-in ---- */
function MobileLoginScreen({ onSignedIn, onRegister }) {
  const store = useStore();
  const toast = useToast();
  const [phase, setPhase] = useState('phone'); // phone | otp
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [candidate, setCandidate] = useState(null);
  const [blocked, setBlocked] = useState(null); // employee whose status prevents sign-in

  /* A couple of seeded numbers so the demo never dead-ends on a forgotten phone. */
  const demoAccounts = useMemo(
    () => store.getEmployees({ status: 'active' }).filter((e) => e.demo && e.role === 'field-employee').slice(0, 3),
    [store.state]
  );

  const sendOtp = () => {
    setError('');
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) { setError('Enter your 10-digit mobile number'); return; }
    const emp = Store.findEmployeeByPhone(digits);
    if (!emp) { setError('No account found for this number. Tap Register if you are new.'); return; }
    if (emp.role !== 'field-employee') { setError('This number belongs to an admin account — please use the web sign-in.'); return; }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setCandidate(emp);
      setPhase('otp');
      setOtp('');
      toast('OTP sent — use ' + DEMO_OTP + ' for this demo', 'info');
    }, 700);
  };

  const verifyOtp = () => {
    setError('');
    if (otp !== DEMO_OTP) { setError('Incorrect OTP. For this demo the code is ' + DEMO_OTP + '.'); return; }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      const emp = Store.getEmployee(candidate.id) || candidate;
      if (emp.status !== 'active') { setBlocked(emp); return; }
      toast('Welcome back, ' + emp.name.split(' ')[0], 'success');
      onSignedIn(emp);
    }, 600);
  };

  const quickPick = (emp) => {
    setPhone((emp.phone || '').replace(/\D/g, '').slice(-10));
    setError('');
    setCandidate(emp);
    setPhase('otp');
    setOtp('');
  };

  if (blocked) {
    return (
      <MobileApplicationStatus
        emp={blocked}
        onBack={() => { setBlocked(null); setPhase('phone'); setOtp(''); setCandidate(null); }}
        onReapply={(e) => { setBlocked(null); onRegister(e); }}
      />
    );
  }

  return (
    <MobileScreen className="!bg-gradient-to-b !from-brand-50 !to-white dark:!from-slate-900 dark:!to-slate-900">
      <div className="flex-1 overflow-y-auto px-5 pt-14 pb-4 flex flex-col">
        <div className="flex justify-center mb-1"><BrandLogo size={30}/></div>
        <div className="text-center text-[10px] font-bold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300 mt-2">Field App</div>

        <div className="mt-7">
          <div className="text-[19px] font-extrabold text-slate-900 dark:text-white text-center">
            {phase === 'phone' ? 'Sign in' : 'Verify your number'}
          </div>
          <div className="text-[11px] text-slate-500 text-center mt-1 leading-relaxed">
            {phase === 'phone'
              ? 'Use the mobile number registered with your HR team.'
              : <>We sent a 6-digit code to <span className="font-semibold text-slate-700 dark:text-slate-200">+91 {phone.slice(-10)}</span></>}
          </div>
        </div>

        {phase === 'phone' ? (
          <div className="mt-6 space-y-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Mobile number</div>
              <div className="flex items-center gap-2 h-12 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus-within:border-brand-500 transition">
                <span className="text-[14px] font-semibold text-slate-500 shrink-0">+91</span>
                <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"/>
                <input
                  type="tel" inputMode="numeric" value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                  placeholder="98200 11001"
                  className="flex-1 bg-transparent text-[15px] font-semibold tracking-wide outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                <Icon name="alert" className="w-3.5 h-3.5 shrink-0 mt-px"/><span>{error}</span>
              </div>
            )}

            <button onClick={sendOtp} disabled={busy}
              className="w-full h-11 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white text-[13px] font-bold transition">
              {busy ? 'Sending OTP…' : 'Send OTP'}
            </button>

            {demoAccounts.length > 0 && (
              <div className="pt-2">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 text-center mb-2">Demo accounts</div>
                <div className="space-y-1.5">
                  {demoAccounts.map((e) => (
                    <button key={e.id} onClick={() => quickPick(e)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-400 transition text-left">
                      <Avatar emp={e} size={28}/>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-slate-800 dark:text-white truncate">{e.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{e.phone}</div>
                      </div>
                      <Icon name="chevron-right" className="w-3.5 h-3.5 text-slate-400"/>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <OtpBoxes value={otp}/>
            <input
              type="tel" inputMode="numeric" autoFocus value={otp}
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              placeholder={'Enter ' + DEMO_OTP}
              className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center text-[15px] font-semibold tracking-[0.3em] outline-none focus:border-brand-500 text-slate-900 dark:text-white"
            />
            {error && (
              <div className="flex items-start gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                <Icon name="alert" className="w-3.5 h-3.5 shrink-0 mt-px"/><span>{error}</span>
              </div>
            )}
            <button onClick={verifyOtp} disabled={busy || otp.length !== 6}
              className="w-full h-11 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white text-[13px] font-bold transition">
              {busy ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <button onClick={() => { setPhase('phone'); setOtp(''); setError(''); }}
              className="w-full h-9 text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              Change number
            </button>
          </div>
        )}
      </div>

      {/* Register */}
      <div className="px-5 pb-6 pt-3 shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70">
        <div className="text-[11px] text-slate-500 text-center mb-2">New joiner? Complete your own onboarding.</div>
        <button onClick={() => onRegister(null)}
          className="w-full h-11 rounded-xl border-2 border-brand-600 text-brand-700 dark:text-brand-300 dark:border-brand-500 text-[13px] font-bold hover:bg-brand-50 dark:hover:bg-brand-900/20 transition flex items-center justify-center gap-1.5">
          <Icon name="shield" className="w-4 h-4"/>Register with Aadhaar
        </button>
        <div className="text-[9px] text-slate-400 text-center mt-2.5">Protected by simulated UIDAI eKYC · Demo build</div>
      </div>
    </MobileScreen>
  );
}

Object.assign(window, { DEMO_OTP, MobileScreen, OtpBoxes, MobileLoginScreen, MobileApplicationStatus });
