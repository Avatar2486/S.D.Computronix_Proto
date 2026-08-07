/* Main app shell: sidebar, topbar, side-by-side layout, dark mode, role switcher */
function DarkToggle({ dark, setDark }) {
  return (
    <button onClick={() => setDark(!dark)} className="w-8 h-8 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" title="Toggle theme">
      <Icon name={dark ? 'sun' : 'moon'} className="w-4 h-4"/>
    </button>
  );
}

function TopBar({ user, onSwitch, dark, setDark, onReset, viewMode, setViewMode, onLogout, onTour }) {
  const store = useStore();
  const toast = useToast();
  const [openUser, setOpenUser] = useState(false);
  const [openNotif, setOpenNotif] = useState(false);
  const notifs = user.role === 'field-employee' ? store.getNotifications(user.id) : store.state.notifications.slice().sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 12);
  const unread = notifs.filter((n) => !n.read).length;

  const resetDemo = async () => {
    if (!confirm('Reset all demo data to seed?')) return;
    Store.reset();
    toast('Demo data reset to seed values.', 'success');
    onReset && onReset();
  };

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 gap-3 shrink-0">
      <span data-tour="brand"><BrandLogo size={30}/></span>
      <div className="ml-4 hidden md:flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
        <span>Mid-month view</span><span>·</span><span className="font-mono">15 Jul 2026 · 10:30 IST</span>
      </div>
      <div className="flex-1"/>

      {/* Search */}
      <div className="hidden lg:flex items-center gap-2 w-72 h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <Icon name="search" className="w-3.5 h-3.5 text-slate-400"/>
        <input className="flex-1 bg-transparent text-[12px] outline-none dark:text-slate-100 placeholder:text-slate-400" placeholder="Search employees, sites, payslips…"/>
        <kbd className="text-[10px] font-mono text-slate-400 border border-slate-300 dark:border-slate-700 px-1 rounded">⌘K</kbd>
      </div>

      {/* View-mode switcher: Web / Split / Mobile */}
      {user.role !== 'field-employee' && (
        <div data-tour="viewswitch" className="flex items-center rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden" title="Switch between web dashboard, split, and mobile app view">
          {[
            { id: 'web',    label: 'Web',    icon: 'monitor' },
            { id: 'split',  label: 'Split',  icon: 'columns' },
            { id: 'mobile', label: 'Mobile', icon: 'phone' },
          ].map((m) => (
            <button key={m.id} onClick={() => setViewMode(m.id)}
              className={`h-8 px-2.5 flex items-center gap-1.5 text-[12px] font-semibold border-r last:border-r-0 border-slate-200 dark:border-slate-700 ${viewMode === m.id ? 'bg-brand-700 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <Icon name={m.icon} className="w-3.5 h-3.5"/><span className="hidden sm:inline">{m.label}</span>
            </button>
          ))}
        </div>
      )}

      {user.role !== 'field-employee' && (
        <button onClick={onTour} className="hidden md:inline-flex h-8 px-2.5 items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-[12px] font-semibold" title="Guided tour">
          <Icon name="sparkle" className="w-3.5 h-3.5"/>Tour
        </button>
      )}
      <button data-tour="reset" onClick={resetDemo} className="h-8 px-2.5 flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-[12px] font-semibold" title="Reset seed data">
        <Icon name="refresh" className="w-3.5 h-3.5"/>Reset
      </button>
      <button onClick={onLogout} className="hidden sm:flex h-8 px-2.5 items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-[12px] font-semibold" title="Sign out">
        <Icon name="logout" className="w-3.5 h-3.5"/>Logout
      </button>
      <DarkToggle dark={dark} setDark={setDark}/>

      {/* Notifications */}
      <div className="relative">
        <button onClick={() => setOpenNotif(!openNotif)} className="w-8 h-8 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 relative">
          <Icon name="bell" className="w-4 h-4"/>
          {unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">{unread}</span>}
        </button>
        {openNotif && (
          <div className="absolute right-0 mt-1 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-pop z-30 anim-in" onMouseLeave={() => setOpenNotif(false)}>
            <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">Notifications</div>
              <button className="text-[11px] text-brand-700 dark:text-brand-300 font-semibold" onClick={() => { Store.markAllRead(user.id); }}>Mark all read</button>
            </div>
            <div className="max-h-80 overflow-auto">
              {notifs.length === 0 && <div className="p-6 text-center text-[12px] text-slate-500">No notifications</div>}
              {notifs.map((n) => (
                <div key={n.id} className={`px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0 flex gap-2 ${!n.read ? 'bg-brand-50/40 dark:bg-brand-900/10' : ''}`}>
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${!n.read ? 'bg-brand-600' : 'bg-slate-300'}`}/>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-slate-700 dark:text-slate-200">{n.message}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{fmtDateTime(n.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User menu */}
      <div className="relative">
        <button onClick={() => setOpenUser(!openUser)} className="flex items-center gap-2 pl-1 pr-2 h-9 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
          <Avatar emp={user} size={26}/>
          <div className="text-left leading-tight">
            <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">{user.name}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">{ROLE_LABEL[user.role]}</div>
          </div>
          <Icon name="chevron-down" className="w-3.5 h-3.5 text-slate-400"/>
        </button>
        {openUser && (
          <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-pop z-30 anim-in" onMouseLeave={() => setOpenUser(false)}>
            <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Switch role / user</div>
            <div className="max-h-72 overflow-auto">
              {store.getUsers().concat(store.getEmployees({ status: 'active' })).map((u) => (
                <button key={u.id} onClick={() => { onSwitch(u); setOpenUser(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-left ${u.id === user.id ? 'bg-brand-50/70 dark:bg-brand-900/20' : ''}`}>
                  <Avatar emp={u} size={26}/>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">{u.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{ROLE_LABEL[u.role]}</div>
                  </div>
                  {u.id === user.id && <Icon name="check" className="w-4 h-4 text-brand-700"/>}
                </button>
              ))}
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 p-2">
              <button onClick={onLogout} className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[12px] text-slate-700 dark:text-slate-200">
                <Icon name="logout" className="w-4 h-4"/>Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

const NAV_ITEMS = [
  { id: 'overview',       label: 'Overview',        icon: 'home',      roles: ['super-admin','hr-manager','site-manager'] },
  { id: 'employees',      label: 'Employees',       icon: 'users',     roles: ['super-admin','hr-manager','site-manager'] },
  { id: 'approvals',      label: 'Onboarding',      icon: 'shield',    roles: ['super-admin','hr-manager'], badge: (s) => s.getEmployees({ status: 'pending' }).length },
  { id: 'livemap',        label: 'Live Map',        icon: 'map',       roles: ['super-admin','hr-manager','site-manager'] },
  { id: 'regularisation', label: 'Regularisation',  icon: 'calendar',  roles: ['super-admin','hr-manager','site-manager'], badge: (s) => s.getRegularisations({ status: 'pending' }).length },
  { id: 'payroll',        label: 'Payroll',         icon: 'wallet',    roles: ['super-admin','hr-manager'] },
  { id: 'slabs',          label: 'Incentive Slabs', icon: 'trending-up', roles: ['super-admin','hr-manager'] },
  { id: 'sites',          label: 'Client Sites',    icon: 'building',  roles: ['super-admin'] },
  { id: 'appreciation',   label: 'Appreciation',    icon: 'sparkle',   roles: ['super-admin','hr-manager','site-manager'] },
  { id: 'reports',        label: 'Reports',         icon: 'chart',     roles: ['super-admin','hr-manager','site-manager'] },
];

function SideBar({ nav, setNav, user }) {
  const store = useStore();
  const items = NAV_ITEMS.filter((n) => n.roles.includes(user.role));
  return (
    <aside className="w-56 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
      <div className="p-3 space-y-0.5 flex-1 overflow-y-auto">
        <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Workspace</div>
        {items.map((i) => {
          const badge = i.badge ? i.badge(store) : 0;
          const active = nav === i.id;
          return (
            <button key={i.id} data-tour={`nav-${i.id}`} onClick={() => setNav(i.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium ${active ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-200' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <Icon name={i.icon} className={`w-4 h-4 ${active ? 'text-brand-700 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'}`}/>
              <span className="flex-1 text-left">{i.label}</span>
              {badge > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-700 text-white">{badge}</span>}
            </button>
          );
        })}
      </div>
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <div className="rounded-lg bg-gradient-to-br from-brand-700 to-brand-900 p-3 text-white">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-100">Live Sync</div>
          <div className="text-[13px] font-bold mt-0.5">All systems operational</div>
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot"/>
            <span>{store.getEmployees({ status: 'active' }).length} field staff online</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function AdminApp({ user, splitMode, nav, setNav }) {
  const store = useStore();
  useEffect(() => {
    // If site manager, filter to their site
    if (user.role === 'site-manager' && !['overview','employees','livemap','regularisation','appreciation','reports'].includes(nav)) setNav('overview');
  }, [user, nav]);

  const view = (() => {
    switch (nav) {
      case 'overview':       return <OverviewPage user={user}/>;
      case 'employees':      return <EmployeesPage user={user}/>;
      case 'approvals':      return <ApprovalsPage user={user}/>;
      case 'livemap':        return <LiveMapPage user={user}/>;
      case 'regularisation': return <RegularisationPage user={user}/>;
      case 'payroll':        return <PayrollPage user={user}/>;
      case 'slabs':          return <SlabsPage user={user}/>;
      case 'sites':          return <SitesPage user={user}/>;
      case 'appreciation':   return <AppreciationPage user={user}/>;
      case 'reports':        return <ReportsPage user={user}/>;
      default:               return <OverviewPage user={user}/>;
    }
  })();

  return (
    <div className={`flex-1 flex min-h-0 ${splitMode ? '' : ''}`}>
      <SideBar nav={nav} setNav={setNav} user={user}/>
      <main className="flex-1 min-w-0 overflow-auto bg-slate-50 dark:bg-[#0B0F1A]">
        <div className="p-5 min-h-full anim-in" key={nav}>{view}</div>
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
        onReset={() => {}} onLogout={onLogout} onTour={startTour}/>
      <div className="flex-1 flex min-h-0">
        {effectiveMode === 'mobile' ? (
          <PhoneStage user={demoEmp} onLogout={onLogout} label={isMobileUser ? null : `Employee App · ${demoEmp.name}`}/>
        ) : effectiveMode === 'split' ? (
          <>
            <div className="flex-1 min-w-0 flex"><AdminApp user={user} splitMode nav={nav} setNav={setNav}/></div>
            <PhoneStage user={demoEmp} onLogout={onLogout} label={`Employee App · ${demoEmp.name}`}
              className="w-[460px] shrink-0 border-l border-slate-200 dark:border-slate-800"/>
          </>
        ) : (
          <AdminApp user={user} nav={nav} setNav={setNav}/>
        )}
      </div>
      {/* Desktop guided tour — admins only; field employees get the in-app mobile tour. */}
      {tourOpen && !isMobileUser && <TourOverlay steps={ADMIN_TOUR_STEPS} onNavigate={setNav} onClose={() => { setTourOpen(false); try { localStorage.setItem('sdc_tour_seen','1'); } catch(e){} }}/>}
    </div>
  );
}

Object.assign(window, { AppShell, TopBar, SideBar, AdminApp, PhoneStage });
