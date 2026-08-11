/* Cross-cutting feature modules:
   - DevModeBanner: simulated developer-mode fraud warning (twice/day → auto-absent)
   - AppreciationPage: managers send digital "Kudos" that surface on the technician's app
   - EmployeePicker: type-ahead picker usable across the large (490-employee) directory */

const KUDOS_BADGES = ['Customer Star', 'Perfect Attendance', 'Top Seller', 'Team Player', 'Fast Learner', 'Going the Extra Mile'];

/* Developer-mode warning.

   On the employee's own device this is addressed to them, in the second
   person, and it does not go away by being dismissed: the only way past it is
   to switch Developer Mode off and confirm. Written in the third person
   ("Developer Mode detected on Rahul's device") it read like a report about
   somebody else, which is exactly the wrong thing to show the person who has
   to act on it. Admins still get the third-person view — for them it *is* a
   report about somebody else. */
function DevModeBanner({ scope = 'admin', emp }) {
  const store = useStore();
  const toast = useToast();
  const today = store.TODAY.toISOString().slice(0, 10);
  // pick the flagged employee: for the mobile app it's the logged-in tech; for admin
  // it's whoever currently has a developer-mode detection today.
  let target = emp;
  if (scope === 'admin') {
    const ev = store.getDevEvents(null, today)[0];
    target = ev ? store.getEmployee(ev.employeeId) : null;
  }
  if (!target) return null;
  const count = store.getDevEvents(target.id, today).length;
  const absent = store.isDevAbsent(target.id, today);
  if (count === 0 && !absent) return null;

  const firstName = (target.name || 'this user').split(' ')[0];
  const escalated = absent;
  const self = scope === 'employee';

  const title = self
    ? (escalated
        ? 'You have been marked absent — Developer Mode was on twice today'
        : 'Switch Developer Mode off to continue')
    : (escalated
        ? `Auto-marked ABSENT: Developer Mode detected twice today on ${firstName}'s device`
        : `Warning: Developer Mode detected on ${firstName}'s device`);

  const body = self
    ? (escalated
        ? `Developer Mode was detected on your phone twice today, so your attendance for ${today} has been marked absent pending review. Turn Developer Mode off in Settings, then confirm below and speak to your Team Lead.`
        : `Developer Mode lets an app fake its GPS position, so attendance cannot be trusted while it is on. This is detection ${count} of 2 — one more today and you will be marked absent. Turn it off in Settings ▸ System ▸ Developer options, then confirm below.`)
    : (escalated
        ? `Repeated developer-mode detections indicate attendance tampering. ${target.name} (${target.code}) has been auto-marked absent for ${today} pending review.`
        : `Detection #${count} of the fraud-prevention limit. A second detection today auto-marks ${target.code} absent. Location data may be spoofed.`);

  return (
    <div className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${escalated ? 'bg-rose-50 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800' : 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800'}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${escalated ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/50' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/50'}`}>
        <Icon name={escalated ? 'shield' : 'alert'} className="w-5 h-5"/>
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-bold ${escalated ? 'text-rose-800 dark:text-rose-200' : 'text-amber-900 dark:text-amber-200'}`}>{title}</div>
        <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">{body}</div>

        {self && (
          /* The one action available: confirm it is off. Nothing dismisses this
             banner except clearing the flag, so it cannot be scrolled past. */
          <div className="mt-2">
            <Btn size="xs" variant="primary" onClick={() => {
              Store.clearDevMode(target.id);
              toast('Thanks — Developer Mode confirmed off. Attendance is trusted again.', 'success');
            }}>
              <Icon name="check" className="w-3 h-3"/>I have switched Developer Mode off
            </Btn>
          </div>
        )}

        {scope === 'admin' && (
          <div className="flex items-center gap-2 mt-2">
            {!absent && <Btn size="xs" variant="danger" onClick={() => { const r = Store.triggerDevMode(target.id); toast(r.autoAbsent ? `${firstName} auto-marked absent` : `Detection #${r.count} logged`, r.autoAbsent ? 'error' : 'warn'); }}>Simulate re-detection</Btn>}
            <Btn size="xs" onClick={() => { Store.clearDevMode(target.id); toast('Developer-mode flag cleared', 'success'); }}>Mark resolved</Btn>
          </div>
        )}
      </div>
      <Badge tone={escalated ? 'red' : 'amber'}>{escalated ? 'Absent' : `${count}/2`}</Badge>
    </div>
  );
}

function EmployeePicker({ value, onChange, placeholder = 'Search technician…' }) {
  const store = useStore();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const selected = value ? store.getEmployee(value) : null;
  const matches = q ? store.getEmployees({ status: 'active' }).filter((e) => e.name.toLowerCase().includes(q.toLowerCase()) || e.code.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : [];
  return (
    <div className="relative">
      {selected ? (
        <div className="flex items-center gap-2 h-9 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
          <Avatar emp={selected} size={22}/>
          <div className="flex-1 min-w-0 text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">{selected.name} <span className="text-slate-400 font-normal">{selected.code}</span></div>
          <button onClick={() => { onChange(null); setQ(''); }} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><Icon name="x" className="w-3.5 h-3.5"/></button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 h-9 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
          <Icon name="search" className="w-3.5 h-3.5 text-slate-400"/>
          <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder={placeholder} className="flex-1 bg-transparent text-[13px] outline-none dark:text-slate-100"/>
        </div>
      )}
      {open && !selected && matches.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-pop max-h-64 overflow-auto">
          {matches.map((e) => (
            <button key={e.id} onClick={() => { onChange(e.id); setOpen(false); setQ(''); }} className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-left">
              <Avatar emp={e} size={24}/>
              <div className="flex-1 min-w-0"><div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">{e.name}</div><div className="text-[10px] text-slate-500">{store.getSite(e.siteId)?.name}</div></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AppreciationPage({ user }) {
  const store = useStore();
  const toast = useToast();
  const [toId, setToId] = useState('');
  const [badge, setBadge] = useState(KUDOS_BADGES[0]);
  const [message, setMessage] = useState('');
  const allKudos = [...store.state.kudos].sort((a, b) => new Date(b.at) - new Date(a.at));

  const send = () => {
    if (!toId) { toast('Pick a technician', 'warn'); return; }
    if (!message.trim()) { toast('Add an appreciation note', 'warn'); return; }
    const to = store.getEmployee(toId);
    Store.sendKudos({ fromId: user.id, toId, badge, message: message.trim() });
    toast(`Kudos sent to ${to.name.split(' ')[0]} — it now shows on their app feed`, 'success');
    setToId(''); setMessage('');
  };

  // leaderboard: most-appreciated technicians
  const counts = {};
  allKudos.forEach((k) => { counts[k.toId] = (counts[k.toId] || 0) + 1; });
  const leaders = Object.entries(counts).map(([id, n]) => ({ emp: store.getEmployee(id), n })).filter((x) => x.emp).sort((a, b) => b.n - a.n).slice(0, 6);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Culture</div>
        <div className="text-xl font-bold text-slate-900 dark:text-white">Performance & Appreciation</div>
        <div className="text-[12px] text-slate-500 mt-0.5">Site Managers and Team Leads send digital Kudos — they appear instantly on the technician's mobile app feed.</div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-5 space-y-4">
          <Card title="Send Kudos" subtitle={`From ${user.name} · ${ROLE_LABEL[user.role]}`}>
            <div className="space-y-3">
              <Field label="Technician"><EmployeePicker value={toId} onChange={setToId}/></Field>
              <Field label="Badge">
                <div className="flex flex-wrap gap-1.5">
                  {KUDOS_BADGES.map((b) => (
                    <button key={b} onClick={() => setBadge(b)} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge === b ? 'bg-brand-700 text-white border-brand-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                      <Icon name="sparkle" className="w-3 h-3 inline mr-1"/>{b}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Appreciation note"><Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Great job handling the weekend rush at the store…"/></Field>
              <Btn variant="primary" className="w-full" onClick={send}><Icon name="send" className="w-3.5 h-3.5"/>Send Kudos</Btn>
            </div>
          </Card>

          <Card title="Most appreciated · this cycle" bodyClass="p-0">
            {leaders.length === 0 && <Empty title="No kudos yet" hint="Send the first one!"/>}
            {leaders.map((l, i) => (
              <div key={l.emp.id} className="p-3 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div className="text-[12px] font-bold text-slate-400 w-4">{i + 1}</div>
                <Avatar emp={l.emp} size={28}/>
                <div className="flex-1 min-w-0"><div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">{l.emp.name}</div><div className="text-[10px] text-slate-500">{store.getSite(l.emp.siteId)?.city}</div></div>
                <Badge tone="violet"><Icon name="sparkle" className="w-3 h-3"/>{l.n}</Badge>
              </div>
            ))}
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-7">
          <Card title="Appreciation feed" subtitle={`${allKudos.length} kudos sent`} bodyClass="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[640px] overflow-auto">
              {allKudos.length === 0 && <Empty title="No appreciation yet"/>}
              {allKudos.map((k) => {
                const to = store.getEmployee(k.toId);
                return (
                  <div key={k.id} className="p-3.5 flex gap-3">
                    <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0"><Icon name="sparkle" className="w-4 h-4"/></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{to?.name || 'Technician'}</span>
                        <Badge tone="violet">{k.badge}</Badge>
                        <span className="text-[10px] text-slate-400 ml-auto">{fmtDateTime(k.at)}</span>
                      </div>
                      <div className="text-[12px] text-slate-600 dark:text-slate-300 mt-1">"{k.message}"</div>
                      <div className="text-[10px] text-slate-400 mt-1">— {k.fromName}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DevModeBanner, EmployeePicker, AppreciationPage, KUDOS_BADGES });
