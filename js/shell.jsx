/* Main app shell: sidebar, topbar, side-by-side layout, dark mode, role switcher */

/* ---- Period / clock block ----
   The old header spelled out "Mid-month view · 15 Jul 2026 · 10:30 IST" as loose
   grey text. This packs the same four facts — period, date, live time, zone —
   into one aligned control, and collapses to just the clock on small screens.

   The demo runs on a fixed "today" (15 Jul 2026) so the seeded data lines up;
   the seconds tick live off the real clock so the header does not look frozen. */
function PeriodClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const demoDay = Store.TODAY;
  const period = demoDay.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const date = demoDay.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="hidden md:flex items-stretch rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 overflow-hidden h-9">
      <div className="hidden lg:flex flex-col justify-center px-2.5 border-r border-slate-200 dark:border-slate-700">
        <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400 leading-none">Period</div>
        <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 leading-tight">{period}</div>
      </div>
      <div className="flex items-center gap-2 px-2.5">
        <Icon name="calendar" className="w-3.5 h-3.5 text-slate-400 shrink-0"/>
        <div className="leading-none">
          <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{date}</div>
          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">{time} IST</div>
        </div>
      </div>
    </div>
  );
}

function TopBar({ user, onSwitch, dark, setDark, onReset, viewMode, setViewMode, onLogout, onTour, onToggleNav }) {
  const store = useStore();
  const toast = useToast();
  const { confirm, ConfirmUI } = useConfirm();
  const [openUser, setOpenUser] = useState(false);
  const [openNotif, setOpenNotif] = useState(false);
  const notifs = user.role === 'field-employee' ? store.getNotifications(user.id) : store.state.notifications.slice().sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 12);
  const unread = notifs.filter((n) => !n.read).length;

  const resetDemo = async () => {
    const ok = await confirm({
      title: 'Reset demo data?',
      body: 'Every employee, target, policy and attendance change made in this session will be discarded and the seed data restored.',
      confirmLabel: 'Reset everything', destructive: true,
    });
    if (!ok) return;
    Store.reset();
    toast('Demo data reset to seed values.', 'success');
    onReset && onReset();
  };

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-3 sm:px-4 gap-2 sm:gap-3 shrink-0">
      {onToggleNav && (
        <button onClick={onToggleNav} className="lg:hidden w-8 h-8 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300" aria-label="Toggle navigation">
          <Icon name="menu" className="w-4 h-4"/>
        </button>
      )}
      <span data-tour="brand" className="shrink-0"><BrandLogo size={30}/></span>

      <div className="flex-1 min-w-0"/>

      {/* Search */}
      <div className="hidden xl:flex items-center gap-2 w-60 h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <Icon name="search" className="w-3.5 h-3.5 text-slate-400"/>
        <input className="flex-1 min-w-0 bg-transparent text-[12px] outline-none dark:text-slate-100 placeholder:text-slate-400" placeholder="Search employees, stores…"/>
      </div>

      <PeriodClock/>

      {/* View-mode switcher: Web / Split / Mobile */}
      {user.role !== 'field-employee' && (
        <div data-tour="viewswitch" className="hidden sm:flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden h-9" title="Switch between web dashboard, split, and mobile app view">
          {[
            { id: 'web',    label: 'Web',    icon: 'monitor' },
            { id: 'split',  label: 'Split',  icon: 'columns' },
            { id: 'mobile', label: 'Mobile', icon: 'phone' },
          ].map((m) => (
            <button key={m.id} onClick={() => setViewMode(m.id)} title={m.label}
              className={`h-full px-2.5 flex items-center gap-1.5 text-[12px] font-semibold border-r last:border-r-0 border-slate-200 dark:border-slate-700 ${viewMode === m.id ? 'bg-brand-700 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <Icon name={m.icon} className="w-3.5 h-3.5"/><span className="hidden 2xl:inline">{m.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Utility cluster — icon-only, so the header stays compact at every width */}
      <div className="flex items-center gap-1">
        {user.role !== 'field-employee' && (
          <button onClick={onTour} title="Guided tour" aria-label="Guided tour"
            className="hidden md:flex w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Icon name="sparkle" className="w-4 h-4"/>
          </button>
        )}
        <button data-tour="reset" onClick={resetDemo} title="Reset demo data" aria-label="Reset demo data"
          className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
          <Icon name="refresh" className="w-4 h-4"/>
        </button>
        <button onClick={() => setDark(!dark)} title="Toggle theme" aria-label="Toggle theme"
          className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
          <Icon name={dark ? 'sun' : 'moon'} className="w-4 h-4"/>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button onClick={() => setOpenNotif(!openNotif)} aria-label="Notifications"
            className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 relative">
            <Icon name="bell" className="w-4 h-4"/>
            {unread > 0 && <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">{unread}</span>}
          </button>
          {openNotif && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setOpenNotif(false)}/>
              <div className="absolute right-0 mt-1.5 w-[min(20rem,calc(100vw-1.5rem))] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-pop z-40 anim-in overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">Notifications</div>
                  <button className="text-[11px] text-brand-700 dark:text-brand-300 font-semibold" onClick={() => { Store.markAllRead(user.id); }}>Mark all read</button>
                </div>
                <div className="max-h-80 overflow-auto">
                  {notifs.length === 0 && <div className="p-6 text-center text-[12px] text-slate-500">No notifications</div>}
                  {notifs.map((n) => (
                    <div key={n.id} className={`px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0 flex gap-2 ${!n.read ? 'bg-brand-50/40 dark:bg-brand-900/10' : ''}`}>
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${!n.read ? 'bg-brand-600' : 'bg-slate-300'}`}/>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-slate-700 dark:text-slate-200">{n.message}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{fmtDateTime(n.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* User identity — name and role are the last thing, always together */}
      <div className="relative">
        <button onClick={() => setOpenUser(!openUser)}
          className="flex items-center gap-2 pl-1 pr-1.5 sm:pr-2 h-9 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
          <Avatar emp={user} size={28}/>
          <div className="hidden sm:block text-left leading-tight max-w-[9rem]">
            <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">{user.name}</div>
            <div className="text-[10px] font-semibold text-brand-700 dark:text-brand-300 truncate">{ROLE_LABEL[user.role]}</div>
          </div>
          <Icon name="chevron-down" className="w-3.5 h-3.5 text-slate-400 shrink-0"/>
        </button>
        {openUser && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpenUser(false)}/>
            <div className="absolute right-0 mt-1.5 w-[min(17rem,calc(100vw-1.5rem))] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-pop z-40 anim-in overflow-hidden">
              <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/50">
                <Avatar emp={user} size={34}/>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">{user.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{user.email || ROLE_LABEL[user.role]}</div>
                </div>
              </div>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Switch role / user</div>
              <div className="max-h-64 overflow-auto">
                {store.getUsers().concat(store.getEmployees({ status: 'active' }).slice(0, 40)).map((u) => (
                  <button key={u.id} onClick={() => { onSwitch(u); setOpenUser(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-left ${u.id === user.id ? 'bg-brand-50/70 dark:bg-brand-900/20' : ''}`}>
                    <Avatar emp={u} size={26}/>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">{u.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{ROLE_LABEL[u.role]}</div>
                    </div>
                    {u.id === user.id && <Icon name="check" className="w-4 h-4 text-brand-700 shrink-0"/>}
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 p-2">
                <button onClick={onLogout} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/20 text-[12px] font-semibold text-rose-600 dark:text-rose-400">
                  <Icon name="logout" className="w-4 h-4"/>Sign out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {ConfirmUI}
    </header>
  );
}

/* ---- Navigation ----
   One entry per capability, no duplicates. What used to be four separate tabs
   (Onboarding, Regularisation, Incentive Slabs, plus Employees) now lives inside
   the section it belongs to:

     Onboarding + Add Employee  → Employees ▸ tabs
     Regularisation             → Attendance ▸ tab
     Incentive Slabs            → Incentives ▸ Configuration

   `section` groups items under a heading; `sub` lists the tabs a section owns so
   the sidebar can advertise them without becoming a second navigation system. */
const NAV_ITEMS = [
  { id: 'overview',  section: 'Workspace',  label: 'Dashboard',    icon: 'home',        roles: ['super-admin','hr-manager','site-manager'] },

  { id: 'employees', section: 'People',     label: 'Employees',    icon: 'users',       roles: ['super-admin','hr-manager','site-manager'],
    sub: ['Existing', 'New', 'Onboarding'], badge: (s) => s.getEmployees({ status: 'pending' }).length },
  { id: 'attendance', section: 'People',    label: 'Attendance',   icon: 'calendar',    roles: ['super-admin','hr-manager','site-manager'],
    sub: ['Overview', 'Daily', 'Monthly', 'Regularization'], badge: (s) => s.getRegularisations({ status: 'pending' }).length },
  { id: 'appreciation', section: 'People',  label: 'Appreciation', icon: 'award',       roles: ['super-admin','hr-manager','site-manager'] },

  { id: 'payroll',   section: 'Compensation', label: 'Payroll',    icon: 'wallet',      roles: ['super-admin','hr-manager'],
    sub: ['Payroll', 'Travel Allowance', 'Incentive'] },
  { id: 'incentives', section: 'Compensation', label: 'Incentives', icon: 'trending-up', roles: ['super-admin','hr-manager','site-manager'] },

  { id: 'sites',     section: 'Operations', label: 'Client Sites', icon: 'building',    roles: ['super-admin','hr-manager'], sub: ['Store Targets'] },
  { id: 'livemap',   section: 'Operations', label: 'Live Map',     icon: 'map',         roles: ['super-admin','hr-manager','site-manager'] },
  { id: 'reports',   section: 'Operations', label: 'Reports',      icon: 'chart',       roles: ['super-admin','hr-manager','site-manager'] },
];

function SideBar({ nav, setNav, user, mobileOpen, onCloseMobile }) {
  const store = useStore();
  const items = NAV_ITEMS.filter((n) => n.roles.includes(user.role));
  const sections = items.reduce((acc, i) => {
    (acc[i.section] = acc[i.section] || []).push(i);
    return acc;
  }, {});

  /* "Operational" means people who are actually clocked in right now — not the
     whole payroll. Counting the roster here was the old bug: it reported 490
     "online" at 3am. */
  const activeMembers = store.getEmployees({ status: 'active' }).filter((e) => store.isPresentToday(e)).length;
  const breaches = store.getLivePositions().filter((p) => !p.inside).length;

  const nav$ = (id) => { setNav(id); onCloseMobile && onCloseMobile(); };

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={onCloseMobile}/>}
      <aside className={`w-56 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0
        ${mobileOpen ? 'fixed inset-y-0 left-0 z-40 shadow-pop' : 'hidden'} lg:static lg:flex lg:z-auto`}>
        <div className="p-3 flex-1 overflow-y-auto">
          {Object.entries(sections).map(([section, list]) => (
            <div key={section} className="mb-3 last:mb-0">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{section}</div>
              <div className="space-y-0.5">
                {list.map((i) => {
                  const badge = i.badge ? i.badge(store) : 0;
                  const active = nav === i.id;
                  return (
                    <div key={i.id}>
                      <button data-tour={`nav-${i.id}`} onClick={() => nav$(i.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition ${active ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-200' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <Icon name={i.icon} className={`w-4 h-4 shrink-0 ${active ? 'text-brand-700 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'}`}/>
                        <span className="flex-1 text-left truncate">{i.label}</span>
                        {badge > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-700 text-white shrink-0">{badge}</span>}
                      </button>
                      {/* Show a section's tabs only while you are in it. */}
                      {active && i.sub && (
                        <div className="ml-[22px] mt-0.5 mb-1 pl-2.5 border-l border-slate-200 dark:border-slate-700 space-y-0.5">
                          {i.sub.map((s) => (
                            <div key={s} className="text-[11px] text-slate-500 dark:text-slate-400 py-0.5">{s}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className={`rounded-lg p-3 text-white bg-gradient-to-br ${breaches > 0 ? 'from-amber-600 to-amber-800' : 'from-brand-700 to-brand-900'}`}>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-white/70">System status</div>
            <div className="text-[13px] font-bold mt-0.5">
              {breaches > 0 ? `${breaches} geo-fence alert${breaches > 1 ? 's' : ''}` : 'All systems operational'}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot shrink-0"/>
              <span><span className="font-bold">{activeMembers}</span> active member{activeMembers === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function AdminApp({ user, splitMode, nav, setNav, mobileNavOpen, setMobileNavOpen }) {
  // A role that loses access to the current page (e.g. switching to Team Lead
  // while sitting on Payroll) is sent back to the dashboard rather than a blank.
  useEffect(() => {
    const item = NAV_ITEMS.find((n) => n.id === nav);
    if (item && !item.roles.includes(user.role)) setNav('overview');
  }, [user.role, nav]);

  const view = (() => {
    switch (nav) {
      case 'overview':     return <OverviewPage user={user} onNavigate={setNav}/>;
      case 'employees':    return <EmployeesPage user={user}/>;
      case 'attendance':   return <AttendancePage user={user}/>;
      case 'livemap':      return <LiveMapPage user={user}/>;
      case 'payroll':      return <PayrollPage user={user}/>;
      case 'incentives':   return <IncentivesPage user={user}/>;
      case 'sites':        return <SitesPage user={user}/>;
      case 'appreciation': return <AppreciationPage user={user}/>;
      case 'reports':      return <ReportsPage user={user}/>;
      default:             return <OverviewPage user={user} onNavigate={setNav}/>;
    }
  })();

  return (
    <div className="flex-1 flex min-h-0">
      <SideBar nav={nav} setNav={setNav} user={user}
        mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)}/>
      <main className="flex-1 min-w-0 overflow-auto bg-slate-50 dark:bg-[#0B0F1A]">
        <div className="p-3 sm:p-4 lg:p-5 min-h-full anim-in" key={nav}>{view}</div>
      </main>
    </div>
  );
}

/* Scroll-safe centering stage for the phone frame.
   The phone is a fixed 380×780 that never shrinks; when the viewport is shorter
   than the phone, this wrapper scrolls (vertically & horizontally) instead of
   squashing the frame. min-h-full keeps it centered when there is spare room. */
function PhoneStage({ user, label, className = '', onLogout }) {
  return (
    <div className={`flex-1 min-h-0 overflow-auto bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-[#050914] ${className}`}>
      <div className="min-h-full w-full flex flex-col items-center justify-center gap-3 p-6">
        {label && (
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0">
            <Icon name="phone" className="w-3.5 h-3.5"/>{label}
          </div>
        )}
        <PhoneApp user={user} onLogout={onLogout}/>
      </div>
    </div>
  );
}

function AppShell({ user, onSwitch, onLogout, initialSplit }) {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('sdc_dark') === '1'; } catch (e) { return false; }
  });
  const isMobileUser = user.role === 'field-employee';
  // View mode: 'web' | 'split' | 'mobile'. Field employees are locked to mobile.
  const [viewMode, setViewMode] = useState(() => {
    if (isMobileUser) return 'mobile';
    if (initialSplit) return 'split';
    try { return localStorage.getItem('sdc_view') || 'web'; } catch (e) { return 'web'; }
  });
  const [tourOpen, setTourOpen] = useState(() => {
    try { return !localStorage.getItem('sdc_tour_seen'); } catch (e) { return true; }
  });
  const [nav, setNav] = useState('overview'); // owned here so the tour can drive it
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Start the tour on the dashboard so its spotlight targets exist.
  const startTour = () => { if (viewMode === 'mobile' && !isMobileUser) setViewMode('web'); setTourOpen(true); };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('sdc_dark', dark ? '1' : '0'); } catch (e) {}
  }, [dark]);

  useEffect(() => {
    if (!isMobileUser) { try { localStorage.setItem('sdc_view', viewMode); } catch (e) {} }
  }, [viewMode, isMobileUser]);

  // Keep view valid when switching users (e.g. admin -> field employee).
  const effectiveMode = isMobileUser ? 'mobile' : viewMode;
  const demoEmp = isMobileUser ? user : (Store.getEmployee('emp_001') || user);

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F1A]">
      <TopBar user={user} onSwitch={onSwitch} dark={dark} setDark={setDark}
        viewMode={effectiveMode} setViewMode={setViewMode}
        onReset={() => {}} onLogout={onLogout} onTour={startTour}
        onToggleNav={effectiveMode === 'mobile' ? null : () => setMobileNavOpen((o) => !o)}/>
      <div className="flex-1 flex min-h-0">
        {effectiveMode === 'mobile' ? (
          <PhoneStage user={demoEmp} onLogout={onLogout} label={isMobileUser ? null : `Employee App · ${demoEmp.name}`}/>
        ) : effectiveMode === 'split' ? (
          <>
            <div className="flex-1 min-w-0 flex">
              <AdminApp user={user} splitMode nav={nav} setNav={setNav} mobileNavOpen={mobileNavOpen} setMobileNavOpen={setMobileNavOpen}/>
            </div>
            <PhoneStage user={demoEmp} onLogout={onLogout} label={`Employee App · ${demoEmp.name}`}
              className="hidden xl:flex w-[460px] shrink-0 border-l border-slate-200 dark:border-slate-800"/>
          </>
        ) : (
          <AdminApp user={user} nav={nav} setNav={setNav} mobileNavOpen={mobileNavOpen} setMobileNavOpen={setMobileNavOpen}/>
        )}
      </div>
      {/* Desktop guided tour — admins only; field employees get the in-app mobile tour. */}
      {tourOpen && !isMobileUser && <TourOverlay steps={ADMIN_TOUR_STEPS} onNavigate={setNav} onClose={() => { setTourOpen(false); try { localStorage.setItem('sdc_tour_seen','1'); } catch(e){} }}/>}
    </div>
  );
}

Object.assign(window, { AppShell, TopBar, SideBar, AdminApp, PhoneStage, PeriodClock, NAV_ITEMS });
