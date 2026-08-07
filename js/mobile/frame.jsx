/* Phone frame + tab router + mobile utilities */
function PhoneFrame({ children }) {
  return (
    <div className="phone-shadow rounded-[42px] bg-slate-950 p-2.5" style={{ width: 380, height: 780 }}>
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

function PhoneApp({ user }) {
  const [tab, setTab] = useState('home');
  const store = useStore();
  const isEmp = user.role === 'field-employee';
  const emp = isEmp ? user : store.getEmployee('emp_001');
  const notifs = store.getNotifications(emp.id);
  const unread = notifs.filter((n) => !n.read).length;
  const [notifOpen, setNotifOpen] = useState(false);

  const view = (() => {
    switch (tab) {
      case 'home':       return <MobileHome emp={emp} setTab={setTab}/>;
      case 'attendance': return <MobileAttendance emp={emp}/>;
      case 'payslips':   return <MobilePayslips emp={emp}/>;
      case 'profile':    return <MobileProfile emp={emp}/>;
      default:           return <MobileHome emp={emp} setTab={setTab}/>;
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
        <button onClick={() => setNotifOpen(true)} className="relative w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
          <Icon name="bell" className="w-4 h-4"/>
          {unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500"/>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-16">
        <div key={tab} className="anim-in">{view}</div>
      </div>

      {/* Bottom tab bar */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 flex items-center justify-around">
        {[
          { id: 'home',       label: 'Home',       icon: 'home' },
          { id: 'attendance', label: 'Attendance', icon: 'target' },
          { id: 'payslips',   label: 'Payslips',   icon: 'wallet' },
          { id: 'profile',    label: 'Profile',    icon: 'user' },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex flex-col items-center gap-0.5 py-2 flex-1 ${tab === t.id ? 'text-brand-700 dark:text-brand-300' : 'text-slate-400'}`}>
            <Icon name={t.icon} className="w-5 h-5"/>
            <span className="text-[10px] font-semibold">{t.label}</span>
            {tab === t.id && <div className="w-4 h-0.5 rounded-full bg-brand-700 dark:bg-brand-300 mt-0.5"/>}
          </button>
        ))}
      </div>

      {notifOpen && <MobileNotifPanel emp={emp} onClose={() => setNotifOpen(false)}/>}
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
