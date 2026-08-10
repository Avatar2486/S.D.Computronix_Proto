/* Login / role picker */
function BrandLogo({ size = 34, className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="rounded-lg bg-brand-700 flex items-center justify-center shadow-sm" style={{ width: size, height: size }}>
        <svg viewBox="0 0 24 24" className="text-white" style={{ width: size * 0.55, height: size * 0.55 }} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 4h9a5 5 0 0 1 0 10H9m-4 6h10a5 5 0 0 0 0-10"/>
        </svg>
      </div>
      <div className="leading-tight">
        <div className="font-extrabold tracking-tight text-slate-900 dark:text-white" style={{ fontSize: size * 0.44 }}>S.D. Computronix</div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Field-Force HRMS</div>
      </div>
    </div>
  );
}

function LoginScreen({ onEnter }) {
  const store = useStore();
  const [tab, setTab] = useState('roles'); // roles | login
  const [email, setEmail] = useState('neha.k@sdc.in');
  const [pw, setPw] = useState('••••••••');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const users = store.getUsers().concat(store.getEmployees({ status: 'active' }).slice(0, 2));
  const roles = [
    { role: 'super-admin', title: 'Super Admin', desc: 'Full system access, config, all payroll & reports.', user: store.getUsers().find(u => u.role === 'super-admin'), icon: 'shield', tone: 'from-brand-700 to-brand-900' },
    { role: 'hr-manager', title: 'HR Manager', desc: 'Employees, onboarding, payroll, attendance — approvals go to Super Admin.', user: store.getUsers().find(u => u.role === 'hr-manager'), icon: 'users', tone: 'from-violet-600 to-violet-800' },
    { role: 'site-manager', title: 'Team Lead', desc: 'Only your own store — attendance, incentives, appreciation.', user: store.getUsers().find(u => u.role === 'site-manager'), icon: 'building', tone: 'from-emerald-600 to-emerald-800' },
    { role: 'field-employee', title: 'Employee', desc: 'Mobile app — clock-in, payslips, incentives.', user: store.getEmployee('emp_001'), icon: 'user', tone: 'from-amber-600 to-orange-700' },
  ];

  const doLogin = (user) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onEnter(user);
      toast(`Welcome, ${user.name}`, 'success');
    }, 500);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 dark:bg-[#0B0F1A]">
      {/* Decorative background */}
      <div className="absolute inset-0 opacity-[0.35] dark:opacity-25 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-brand-500 to-brand-800 blur-3xl"/>
        <div className="absolute -bottom-40 -left-20 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-indigo-400 to-brand-700 blur-3xl"/>
      </div>
      <div className="relative min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
        {/* Left panel — brand story */}
        <div className="hidden lg:flex flex-col justify-between p-10 xl:p-14 text-slate-800 dark:text-slate-200">
          <BrandLogo size={40}/>
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600"/>Purpose-built for field manpower
            </div>
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.05] text-slate-900 dark:text-white">
              Fraud-resistant field-force operations, end to end.
            </h1>
            <p className="mt-4 text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Geo-fenced photo attendance, live-map monitoring, digital KYC onboarding, store-target and slab-based incentive payroll — tailored for Croma deployments and service centres across India.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { k: '4,200+', v: 'Field employees supported' },
                { k: '180+', v: 'Client sites mapped' },
                { k: '99.6%', v: 'Attendance authenticity' },
                { k: '<3 min', v: 'Digital onboarding' },
              ].map((s) => (
                <div key={s.v} className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur">
                  <div className="text-2xl font-bold text-brand-700 dark:text-brand-300">{s.k}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wide font-semibold">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-500">© 2026 S.D. Computronix Pvt. Ltd. · Demo build</div>
        </div>

        {/* Right panel — login card */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-6"><BrandLogo/></div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-pop overflow-hidden">
              <div className="px-6 pt-6">
                <div className="text-[11px] uppercase tracking-wider font-bold text-brand-700 dark:text-brand-300">Sign in to continue</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Choose your workspace</div>
                <div className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">Quick-jump into any role to explore the demo.</div>
              </div>
              <div className="flex mt-5 border-b border-slate-200 dark:border-slate-800 px-6">
                {['roles', 'login'].map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-3 py-2 text-[13px] font-semibold border-b-2 -mb-px transition ${tab === t ? 'text-brand-700 border-brand-700 dark:text-brand-300 dark:border-brand-400' : 'text-slate-500 border-transparent hover:text-slate-700 dark:hover:text-slate-300'}`}>
                    {t === 'roles' ? 'Quick role picker' : 'Email sign-in'}
                  </button>
                ))}
              </div>

              {tab === 'roles' && (
                <div className="p-5 space-y-2">
                  {roles.map((r) => (
                    <button key={r.role} onClick={() => doLogin(r.user)}
                      className="w-full text-left group flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-900/20 transition">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${r.tone} flex items-center justify-center text-white`}>
                        <Icon name={r.icon} className="w-5 h-5"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[13px] text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          {r.title}
                          <span className="text-[11px] font-normal text-slate-400">{r.user?.name}</span>
                        </div>
                        <div className="text-[12px] text-slate-500 dark:text-slate-400 truncate">{r.desc}</div>
                      </div>
                      <Icon name="chevron-right" className="w-4 h-4 text-slate-400 group-hover:text-brand-700 group-hover:translate-x-0.5 transition"/>
                    </button>
                  ))}
                </div>
              )}

              {tab === 'login' && (
                <form className="p-5 space-y-3" onSubmit={(e) => { e.preventDefault(); const u = users.find(x => x.email === email) || users[0]; doLogin(u); }}>
                  <Field label="Work email">
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@sdc.in"/>
                  </Field>
                  <Field label="Password">
                    <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)}/>
                  </Field>
                  <div className="flex items-center justify-between text-[12px]">
                    <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400"><input type="checkbox" defaultChecked className="accent-brand-700"/>Remember me</label>
                    <a className="text-brand-700 dark:text-brand-300 font-semibold hover:underline" href="#">Forgot?</a>
                  </div>
                  <Btn type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Btn>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center pt-1">Demo mode — any password accepted.</div>
                </form>
              )}

              <div className="px-5 pb-5 -mt-1">
                <button onClick={() => { onEnter({ id: 'demo', name: 'Demo Session', role: 'super-admin', avatarHue: 220 }, { splitDemo: true }); }}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-brand-200 dark:border-brand-900 bg-brand-50 dark:bg-brand-900/30 text-brand-800 dark:text-brand-200 font-semibold text-[13px] hover:bg-brand-100 dark:hover:bg-brand-900/50">
                  <Icon name="sparkle" className="w-4 h-4"/>Enter Split-Screen Demo (Admin + Employee)
                </button>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-500 text-center mt-4">
              Protected by simulated SSO · No real credentials used in demo.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LoginScreen, BrandLogo });
