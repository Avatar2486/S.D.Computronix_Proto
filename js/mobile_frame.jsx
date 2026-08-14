/* Phone frame + tab router + mobile utilities */
function PhoneFrame({ children }) {
  return (
    <div className="phone-shadow rounded-[42px] bg-slate-950 p-2.5 shrink-0" style={{ width: 380, height: 780, minWidth: 380, minHeight: 780, flex: '0 0 auto' }}>
      <div className="w-full h-full rounded-[34px] bg-white dark:bg-[#0F172A] overflow-hidden relative flex flex-col">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-950 rounded-b-2xl z-10"/>
        <div className="absolute top-1.5 left-6 right-6 flex justify-between items-center z-20 pointer-events-none text-[11px] font-semibold text-slate-800 dark:text-white">
          <span className="font-mono">10:30</span>
          <div className="flex items-center gap-1.5 opacity-80">
            <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor"><rect x="0" y="6" width="2" height="4" rx="0.5"/><rect x="4" y="4" width="2" height="6" rx="0.5"/><rect x="8" y="2" width="2" height="8" rx="0.5"/><rect x="12" y="0" width="2" height="10" rx="0.5"/></svg>
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1 4a7 7 0 0 1 10 0M3 6a4 4 0 0 1 6 0M6 8v.1"/></svg>
            <svg width="20" height="10" viewBox="0 0 20 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x="0.5" y="0.5" width="17" height="9" rx="2"/><rect x="18.5" y="3.5" width="1" height="3" rx="0.5" fill="currentColor"/><rect x="2" y="2" width="12" height="6" rx="1" fill="currentColor"/></svg>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function PhoneApp({ user, onLogout }) {
  const [tab, setTab] = useState('home');
  const store = useStore();
  const isEmp = roleOf(user) === 'field-employee';
  const isTeamLead = roleOf(user) === 'site-manager';
  /* Team Lead is the other mobile-only seat (isMobileOnlyRole = field-employee
     OR site-manager). This governs which record the phone opens on — it used
     to fall through to the hard-coded emp_001 demo employee ("Rahul Verma")
     for a Team Lead exactly like it did for Admin/HR preview, showing the
     wrong person's KYC/incentive profile. */
  const isSelfSession = isMobileOnlyRole(user);

  /* The phone keeps its own session, separate from the desktop shell's. It is
     seeded from `user` so the existing entry paths (role picker, split-screen
     demo) still land straight in the app — signing out drops to the in-phone
     login rather than tearing down the whole admin session. */
  const [phoneUser, setPhoneUser] = useState(() => (isSelfSession ? user : store.getEmployee('emp_001')));
  const [auth, setAuth] = useState(null);   // null | {mode:'onboarding', reapplyFor} | {mode:'status', emp}

  const emp = phoneUser ? (store.getEmployee(phoneUser.id) || phoneUser) : null;
  const notifs = emp ? store.getNotifications(emp.id) : [];
  const unread = notifs.filter((n) => !n.read).length;
  const [notifOpen, setNotifOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [policiesOpen, setPoliciesOpen] = useState(false);
  // In-app tour — auto-opens once for real field-employee logins.
  const [tourOpen, setTourOpen] = useState(() => {
    if (!isEmp) return false;
    try { return !localStorage.getItem('sdc_mtour_seen'); } catch (e) { return true; }
  });
  const closeTour = () => { setTourOpen(false); try { localStorage.setItem('sdc_mtour_seen', '1'); } catch (e) {} };

  const signOut = () => {
    setPhoneUser(null); setAuth(null); setTab('home');
    setNotifOpen(false); setDocsOpen(false); setPoliciesOpen(false); setTourOpen(false);
  };

  /* ---- Logged out: login / self-onboarding / application status ---- */
  if (!emp) {
    return (
      <PhoneFrame>
        {auth && auth.mode === 'onboarding' ? (
          <MobileOnboarding
            reapplyFor={auth.reapplyFor}
            onClose={() => setAuth(null)}
            onSubmitted={(applicant) => setAuth({ mode: 'status', emp: applicant })}
          />
        ) : auth && auth.mode === 'status' ? (
          <MobileApplicationStatus
            emp={auth.emp}
            onBack={() => setAuth(null)}
            onReapply={(e) => setAuth({ mode: 'onboarding', reapplyFor: e })}
          />
        ) : (
          <MobileLoginScreen
            onSignedIn={(e) => { setPhoneUser(e); setTab('home'); }}
            onRegister={(reapplyFor) => setAuth({ mode: 'onboarding', reapplyFor })}
          />
        )}
      </PhoneFrame>
    );
  }

  const view = (() => {
    switch (tab) {
      case 'home':       return isTeamLead ? <MobileTeamHome user={user} emp={emp} setTab={setTab}/> : <MobileHome emp={emp} setTab={setTab}/>;
      case 'attendance': return <MobileAttendance emp={emp}/>;
      case 'team':       return <MobileTeamRoster user={user} emp={emp}/>;
      case 'payslips':   return <MobilePayslips emp={emp}/>;
      case 'gigs':       return <MobileGigs emp={emp}/>;
      case 'profile':    return <MobileProfile emp={emp} restricted={isTeamLead} onLogout={signOut} onTour={() => setTourOpen(true)} onOpenDocs={() => setDocsOpen(true)} onOpenPolicies={() => setPoliciesOpen(true)}/>;
      default:           return isTeamLead ? <MobileTeamHome user={user} emp={emp} setTab={setTab}/> : <MobileHome emp={emp} setTab={setTab}/>;
    }
  })();

  return (
    <PhoneFrame>
      {/* Header */}
      <div className="pt-9 pb-2 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Avatar emp={emp} size={30}/>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Welcome back</div>
            <div className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">{emp.name.split(' ')[0]}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setTourOpen(true)} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-brand-700 dark:text-brand-300" title="App tour">
            <Icon name="sparkle" className="w-4 h-4"/>
          </button>
          <button onClick={() => setNotifOpen(true)} className="relative w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Icon name="bell" className="w-4 h-4"/>
            {unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500"/>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-16">
        <div className="px-4 pt-1"><DevModeBanner scope="employee" emp={emp}/></div>
        <div key={tab} className="anim-in">{view}</div>
      </div>

      {/* Bottom tab bar — a Team Lead gets Team instead of Payslips/Gigs: no
          money screens (spec: salary/payroll = No, even for Team Lead's own
          pay — see MobileProfile's `restricted` prop), and a scoped roster in
          their place. */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 flex items-center justify-around">
        {(isTeamLead ? [
          { id: 'home',       label: 'Home',       icon: 'home' },
          { id: 'attendance', label: 'Attendance', icon: 'target' },
          { id: 'team',       label: 'Team',        icon: 'users' },
          { id: 'profile',    label: 'Profile',    icon: 'user' },
        ] : [
          { id: 'home',       label: 'Home',       icon: 'home' },
          { id: 'attendance', label: 'Attendance', icon: 'target' },
          { id: 'payslips',   label: 'Payslips',   icon: 'wallet' },
          { id: 'gigs',       label: 'Gigs',       icon: 'external' },
          { id: 'profile',    label: 'Profile',    icon: 'user' },
        ]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex flex-col items-center gap-0.5 py-2 flex-1 ${tab === t.id ? 'text-brand-700 dark:text-brand-300' : 'text-slate-400'}`}>
            <Icon name={t.icon} className="w-5 h-5"/>
            <span className="text-[10px] font-semibold">{t.label}</span>
            {tab === t.id && <div className="w-4 h-0.5 rounded-full bg-brand-700 dark:bg-brand-300 mt-0.5"/>}
          </button>
        ))}
      </div>

      {docsOpen && <MobileDocsSheet emp={emp} onClose={() => setDocsOpen(false)}/>}
      {policiesOpen && <MobilePoliciesSheet emp={emp} onClose={() => setPoliciesOpen(false)}/>}
      {notifOpen && <MobileNotifPanel emp={emp} onClose={() => setNotifOpen(false)}/>}
      {tourOpen && <TourOverlay mobile steps={MOBILE_TOUR_STEPS} onNavigate={setTab} onClose={closeTour}/>}
    </PhoneFrame>
  );
}

function MobileNotifPanel({ emp, onClose }) {
  const notifs = Store.getNotifications(emp.id);
  return (
    <div className="absolute inset-0 z-30 bg-black/40 flex items-end anim-in" onClick={onClose}>
      <div className="w-full bg-white dark:bg-slate-900 rounded-t-2xl max-h-[75%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="font-bold text-slate-900 dark:text-white">Notifications</div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><Icon name="x"/></button>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {notifs.map((n) => (
            <div key={n.id} className={`p-3 flex gap-2.5 ${!n.read ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                n.type === 'payroll' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' :
                n.type === 'geofence' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40' :
                n.type === 'regularisation' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40' :
                'bg-violet-100 text-violet-700 dark:bg-violet-900/40'
              }`}>
                <Icon name={n.type === 'payroll' ? 'wallet' : n.type === 'geofence' ? 'target' : n.type === 'regularisation' ? 'calendar' : 'sparkle'} className="w-4 h-4"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-slate-700 dark:text-slate-200">{n.message}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{fmtDateTime(n.timestamp)}</div>
              </div>
            </div>
          ))}
          {notifs.length === 0 && <Empty title="No notifications yet"/>}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PhoneFrame, PhoneApp, MobileNotifPanel });
