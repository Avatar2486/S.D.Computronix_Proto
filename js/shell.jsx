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

/* ---- Global search ----

   What it searches, and what pressing Enter does, was never defined — so here
   it is, explicitly. Four kinds of thing are indexed:

     People   — name, employee code, email, phone, designation.  → Employees
     Stores   — store name, code, city, state.                   → Client Sites
     Policies — title and category of every HR document.         → Employees ▸ Onboarding
     Screens  — the pages this role can reach, by name.          → that page

   Picking a result navigates to the page that owns it and pre-seeds that
   page's own filter with the term, so the item you searched for is the thing
   you land on. Results are scoped to the role: a Team Lead only ever matches
   their own store's people, and never sees a page they cannot open. */
function useGlobalSearch(user, query) {
  const store = useStore();
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const role = roleOf(user);
    const isSiteMgr = role === 'site-manager';
    const digits = q.replace(/\D/g, '');
    const out = [];

    const people = store.state.employees.filter((e) => (!isSiteMgr || e.siteId === user.siteId) && (
      (e.name || '').toLowerCase().includes(q) ||
      (e.code || '').toLowerCase().includes(q) ||
      (e.email || '').toLowerCase().includes(q) ||
      (e.designation || '').toLowerCase().includes(q) ||
      (digits.length >= 4 && (e.phone || '').replace(/\D/g, '').includes(digits))
    )).slice(0, 6);
    people.forEach((e) => out.push({
      id: 'emp_' + e.id, group: 'People', icon: 'user', emp: e,
      title: e.name, sub: `${e.code} · ${e.designation}${store.getSite(e.siteId) ? ' · ' + store.getSite(e.siteId).city : ''}`,
      nav: 'employees', arg: { search: e.name },
    }));

    if (can(user, 'site.view')) {
      const sites = store.getSites().filter((s) => (!isSiteMgr || s.id === user.siteId) && (
        (s.name || '').toLowerCase().includes(q) ||
        (s.code || '').toLowerCase().includes(q) ||
        (s.city || '').toLowerCase().includes(q) ||
        (s.region || '').toLowerCase().includes(q)
      )).slice(0, 5);
      sites.forEach((s) => out.push({
        id: 'site_' + s.id, group: 'Stores', icon: 'building',
        title: s.name, sub: [s.code, s.city, s.region].filter(Boolean).join(' · '),
        nav: 'sites', arg: { search: s.name },
      }));
    }

    store.getPolicies().filter((p) => p.active && (
      (p.title || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)
    )).slice(0, 4).forEach((p) => out.push({
      id: 'pol_' + p.id, group: 'Policies', icon: 'book',
      title: p.title, sub: `${p.category} · v${p.version}`,
      nav: 'employees', arg: { tab: 'onboarding' },
    }));

    const subsOf = (n) => (typeof n.sub === 'function' ? n.sub(role) : n.sub) || [];
    NAV_ITEMS.filter((n) => n.roles.includes(role) && (
      n.label.toLowerCase().includes(q) || subsOf(n).some((s) => s.toLowerCase().includes(q))
    )).slice(0, 4).forEach((n) => {
      const subHit = subsOf(n).find((s) => s.toLowerCase().includes(q));
      out.push({
        id: 'nav_' + n.id, group: 'Screens', icon: n.icon,
        title: n.label + (subHit ? ` ▸ ${subHit}` : ''), sub: n.section,
        nav: n.id, arg: subHit ? { tab: subHit.toLowerCase() } : null,
      });
    });

    return out;
  }, [query, store.state, user]);
}

function GlobalSearch({ user, onNavigate }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const results = useGlobalSearch(user, q);

  useEffect(() => { setCursor(0); }, [q]);
  // Ctrl/⌘-K from anywhere focuses the field — the shortcut people try first.
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current && inputRef.current.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const choose = (r) => {
    if (!r) return;
    setOpen(false); setQ('');
    onNavigate(r.nav, r.arg);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); e.target.blur(); return; }
    if (!results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => (c + 1) % results.length); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor((c) => (c - 1 + results.length) % results.length); }
    if (e.key === 'Enter')     { e.preventDefault(); choose(results[cursor]); }
  };

  // Group headers without losing the flat index the keyboard cursor walks.
  let flat = -1;

  return (
    <div className="hidden lg:block relative">
      <div className={`flex items-center gap-2 w-56 xl:w-72 h-9 px-2.5 rounded-lg border bg-slate-50 dark:bg-slate-800 transition ${
        open ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-200 dark:border-slate-700'}`}>
        <Icon name="search" className="w-3.5 h-3.5 text-slate-400 shrink-0"/>
        <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)} onKeyDown={onKeyDown}
          className="flex-1 min-w-0 bg-transparent text-[12px] outline-none dark:text-slate-100 placeholder:text-slate-400"
          placeholder="Search people, stores, policies…"/>
        {q
          ? <button onClick={() => { setQ(''); inputRef.current && inputRef.current.focus(); }} className="text-slate-400 hover:text-slate-600 shrink-0"><Icon name="x" className="w-3.5 h-3.5"/></button>
          : <kbd className="hidden xl:block text-[9px] font-mono text-slate-400 border border-slate-300 dark:border-slate-600 rounded px-1 shrink-0">Ctrl K</kbd>}
      </div>

      {open && q.trim().length >= 2 && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)}/>
          <div className="absolute right-0 mt-1.5 w-[min(26rem,90vw)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-pop z-40 anim-in overflow-hidden">
            {results.length === 0 ? (
              <div className="p-5 text-center">
                <Icon name="search" className="w-5 h-5 text-slate-300 mx-auto"/>
                <div className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 mt-1.5">No match for "{q}"</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Try a name, employee code, store, city or page.</div>
              </div>
            ) : (
              <div className="max-h-[22rem] overflow-auto py-1">
                {['People', 'Stores', 'Policies', 'Screens'].map((group) => {
                  const rows = results.filter((r) => r.group === group);
                  if (!rows.length) return null;
                  return (
                    <div key={group}>
                      <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{group}</div>
                      {rows.map((r) => {
                        flat += 1;
                        const active = flat === cursor;
                        const i = flat;
                        return (
                          <button key={r.id} onMouseEnter={() => setCursor(i)} onClick={() => choose(r)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left ${active ? 'bg-brand-50 dark:bg-brand-900/25' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                            {r.emp
                              ? <Avatar emp={r.emp} size={26}/>
                              : <div className="w-[26px] h-[26px] rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0"><Icon name={r.icon} className="w-3.5 h-3.5"/></div>}
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">{r.title}</div>
                              <div className="text-[10.5px] text-slate-500 truncate">{r.sub}</div>
                            </div>
                            <Icon name="arrow-right" className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-brand-600' : 'text-slate-300'}`}/>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center gap-3">
              <span>↑↓ move</span><span>↵ open</span><span>esc close</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TopBar({ user, onSwitch, dark, setDark, onReset, viewMode, setViewMode, onLogout, onTour, onToggleNav, onNavigate }) {
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

      {onNavigate && roleOf(user) !== 'field-employee' && <GlobalSearch user={user} onNavigate={onNavigate}/>}

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

   `section` groups items under a heading. `sub` lists the tabs a section owns,
   and every one of them is a real link: each entry carries the `id` of the tab
   on that page, so clicking it navigates and switches the tab in one step
   rather than being a label you then have to go and click again. */
const NAV_ITEMS = [
  { id: 'overview',  section: 'Workspace',  label: 'Dashboard',    icon: 'home',        roles: ['admin','hr-manager','site-manager'] },

  { id: 'employees', section: 'People',     label: 'Employees',    icon: 'users',       roles: ['admin','hr-manager','site-manager'],
    // Onboarding is an HR/Admin queue, so it is not advertised to a Team Lead.
    sub: (role) => [
      { id: 'existing', label: 'Existing' },
      { id: 'new', label: 'New' },
      ...(role === 'site-manager' ? [] : [{ id: 'onboarding', label: 'Onboarding' }]),
    ],
    badge: (s) => s.getEmployees({ status: 'pending' }).length },
  { id: 'attendance', section: 'People',    label: 'Attendance',   icon: 'calendar',    roles: ['admin','hr-manager','site-manager'],
    sub: [
      { id: 'overview', label: 'Overview' },
      { id: 'daily', label: 'Daily' },
      { id: 'monthly', label: 'Monthly log' },
      { id: 'regularization', label: 'Regularization' },
    ],
    badge: (s) => s.getRegularisations({ status: 'pending' }).length },
  { id: 'appreciation', section: 'People',  label: 'Appreciation', icon: 'award',       roles: ['admin','hr-manager','site-manager'] },

  /* Payroll's three blocks are stacked cards rather than tabs, so these scroll
     to the block instead of switching one. */
  { id: 'payroll',   section: 'Compensation', label: 'Payroll',    icon: 'wallet',      roles: ['admin','hr-manager'],
    sub: [
      { id: 'run', label: 'Payroll run' },
      { id: 'travel', label: 'Travel Allowance' },
      { id: 'incentive', label: 'Incentive' },
    ] },
  { id: 'incentives', section: 'Compensation', label: 'Incentives', icon: 'trending-up', roles: ['admin','hr-manager','site-manager'],
    sub: (role) => [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'stores', label: 'By store' },
      ...(role === 'site-manager' ? [] : [{ id: 'config', label: 'Configuration' }]),
    ] },

  { id: 'sites',     section: 'Operations', label: 'Client Sites', icon: 'building',    roles: ['admin','hr-manager'],
    sub: [
      { id: 'stores', label: 'Stores & geo-fences' },
      { id: 'targets', label: 'Store Targets' },
    ] },
  { id: 'livemap',   section: 'Operations', label: 'Live Map',     icon: 'map',         roles: ['admin','hr-manager','site-manager'] },
  { id: 'reports',   section: 'Operations', label: 'Reports',      icon: 'chart',       roles: ['admin','hr-manager','site-manager'],
    sub: (role) => [
      { id: 'attendance', label: 'Attendance' },
      ...(role === 'site-manager' ? [] : [{ id: 'payroll', label: 'Payroll' }]),
      { id: 'incentive', label: 'Incentive' },
      { id: 'deployment', label: 'Deployment' },
    ] },
];

function SideBar({ nav, navArg, setNav, user, mobileOpen, onCloseMobile }) {
  const store = useStore();
  const items = NAV_ITEMS.filter((n) => n.roles.includes(roleOf(user)));
  const sections = items.reduce((acc, i) => {
    (acc[i.section] = acc[i.section] || []).push(i);
    return acc;
  }, {});

  /* "Operational" means people who are actually clocked in right now — not the
     whole payroll. Counting the roster here was the old bug: it reported 490
     "online" at 3am. */
  const activeMembers = store.getEmployees({ status: 'active' }).filter((e) => store.isPresentToday(e)).length;
  const breaches = store.getLivePositions().filter((p) => !p.inside).length;

  const nav$ = (id, arg) => { setNav(id, arg); onCloseMobile && onCloseMobile(); };

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
                  // `sub` may be role-dependent, so a tab the role cannot open
                  // is never advertised in the sidebar.
                  const subs = typeof i.sub === 'function' ? i.sub(roleOf(user)) : i.sub;
                  return (
                    <div key={i.id}>
                      {/* Clicking the section itself opens its first tab, so
                          the highlighted sub-item always matches the page. */}
                      <button data-tour={`nav-${i.id}`} onClick={() => nav$(i.id, subs && subs.length ? { tab: subs[0].id } : null)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition ${active ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-200' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <Icon name={i.icon} className={`w-4 h-4 shrink-0 ${active ? 'text-brand-700 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'}`}/>
                        <span className="flex-1 text-left truncate">{i.label}</span>
                        {badge > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-700 text-white shrink-0">{badge}</span>}
                      </button>
                      {/* Show a section's tabs only while you are in it. */}
                      {active && subs && subs.length > 0 && (
                        <div className="ml-[22px] mt-0.5 mb-1 pl-2.5 border-l border-slate-200 dark:border-slate-700 space-y-0.5">
                          {subs.map((s) => {
                            /* The current tab is only known once the page has
                               been told which one to open, so the first entry
                               is highlighted until something else is picked. */
                            const current = (navArg && navArg.tab) || subs[0].id;
                            const on = current === s.id;
                            return (
                              <button key={s.id} onClick={() => nav$(i.id, { tab: s.id })}
                                className={`w-full text-left text-[11px] py-0.5 px-1.5 -ml-1.5 rounded transition ${
                                  on ? 'text-brand-700 dark:text-brand-300 font-semibold bg-brand-50/70 dark:bg-brand-900/25'
                                     : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                {s.label}
                              </button>
                            );
                          })}
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

/* `navArg` is how one screen hands the next screen its starting state — the
   dashboard's "Decide" opens Attendance already on the Regularization tab, and
   a search hit opens Employees with that person's name in the filter. Pages
   take it as a prop; nothing reads global state. */
function AdminApp({ user, splitMode, nav, navArg, setNav, mobileNavOpen, setMobileNavOpen }) {
  // A role that loses access to the current page (e.g. switching to Team Lead
  // while sitting on Payroll) is sent back to the dashboard rather than a blank.
  useEffect(() => {
    const item = NAV_ITEMS.find((n) => n.id === nav);
    if (item && !item.roles.includes(roleOf(user))) setNav('overview');
  }, [user.role, nav]);

  const arg = navArg || null;
  const view = (() => {
    switch (nav) {
      case 'overview':     return <OverviewPage user={user} onNavigate={setNav}/>;
      case 'employees':    return <EmployeesPage user={user} navArg={arg}/>;
      case 'attendance':   return <AttendancePage user={user} navArg={arg}/>;
      case 'livemap':      return <LiveMapPage user={user}/>;
      case 'payroll':      return <PayrollPage user={user} navArg={arg}/>;
      case 'incentives':   return <IncentivesPage user={user} navArg={arg}/>;
      case 'sites':        return <SitesPage user={user} navArg={arg}/>;
      case 'appreciation': return <AppreciationPage user={user}/>;
      case 'reports':      return <ReportsPage user={user} navArg={arg}/>;
      default:             return <OverviewPage user={user} onNavigate={setNav}/>;
    }
  })();

  return (
    <div className="flex-1 flex min-h-0">
      <SideBar nav={nav} navArg={arg} setNav={setNav} user={user}
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
  const [navArg, setNavArg] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  /* Single navigation entry point: sidebar, tour, dashboard alerts and search
     all come through here, so a deep link and a click behave identically.
     The arg is bumped with a nonce so navigating to the same page twice with
     the same argument still re-applies it. */
  const goTo = (id, arg) => {
    setNav(id);
    setNavArg(arg ? { ...arg, _n: Date.now() } : null);
    setMobileNavOpen(false);
  };

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
        onReset={() => {}} onLogout={onLogout} onTour={startTour} onNavigate={goTo}
        onToggleNav={effectiveMode === 'mobile' ? null : () => setMobileNavOpen((o) => !o)}/>
      <div className="flex-1 flex min-h-0">
        {effectiveMode === 'mobile' ? (
          <PhoneStage user={demoEmp} onLogout={onLogout} label={isMobileUser ? null : `Employee App · ${demoEmp.name}`}/>
        ) : effectiveMode === 'split' ? (
          <>
            <div className="flex-1 min-w-0 flex">
              <AdminApp user={user} splitMode nav={nav} navArg={navArg} setNav={goTo} mobileNavOpen={mobileNavOpen} setMobileNavOpen={setMobileNavOpen}/>
            </div>
            <PhoneStage user={demoEmp} onLogout={onLogout} label={`Employee App · ${demoEmp.name}`}
              className="hidden xl:flex w-[460px] shrink-0 border-l border-slate-200 dark:border-slate-800"/>
          </>
        ) : (
          <AdminApp user={user} nav={nav} navArg={navArg} setNav={goTo} mobileNavOpen={mobileNavOpen} setMobileNavOpen={setMobileNavOpen}/>
        )}
      </div>
      {/* Desktop guided tour — admins only; field employees get the in-app mobile tour. */}
      {tourOpen && !isMobileUser && <TourOverlay steps={ADMIN_TOUR_STEPS} onNavigate={goTo} onClose={() => { setTourOpen(false); try { localStorage.setItem('sdc_tour_seen','1'); } catch(e){} }}/>}
    </div>
  );
}

Object.assign(window, {
  AppShell, TopBar, SideBar, AdminApp, PhoneStage, PeriodClock, NAV_ITEMS,
  GlobalSearch, useGlobalSearch,
});
