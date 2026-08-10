/* Guided tour.
   - Desktop: an anchored "spotlight" walkthrough. Each step navigates to the
     relevant page and highlights the real UI element, with a callout beside it.
   - Mobile: a centered card inside the phone that switches to the relevant tab. */

// Desktop steps. `target` = CSS selector to spotlight; `nav` = page to open first.
const ADMIN_TOUR_STEPS = [
  { icon: 'sparkle', title: 'Welcome to S.D. Computronix HRMS', body: 'A purpose-built field-force platform. This quick tour will walk you through the product, opening each screen as we go.', target: '[data-tour="brand"]', placement: 'bottom' },
  { icon: 'monitor', title: 'Web · Split · Mobile views', body: 'Use this switcher any time to flip the whole workspace between the web dashboard, a side-by-side split, and the employee mobile app.', target: '[data-tour="viewswitch"]', placement: 'bottom' },
  { icon: 'home', title: 'Command Center', body: 'Priority alerts sit at the top, so anything needing a decision is the first thing you see. Every KPI below is computed from live data.', target: '[data-tour="nav-overview"]', nav: 'overview', placement: 'right' },
  { icon: 'users', title: 'One place for people', body: 'Employees holds the whole lifecycle — Existing staff, New joiners, and the Onboarding queue — as tabs. There is no separate "register" screen to hunt for.', target: '[data-tour="nav-employees"]', nav: 'employees', placement: 'right' },
  { icon: 'calendar', title: 'Attendance, end to end', body: 'Overview, Daily, Monthly and Regularization all live here. Approve a correction and the affected payslip recomputes on the spot.', target: '[data-tour="nav-attendance"]', nav: 'attendance', placement: 'right' },
  { icon: 'wallet', title: 'Payroll with real math', body: 'Run June — Priya’s 2 absent days automatically become a ₹1,000 deduction. Travel allowance and incentive each get their own card below the run.', target: '[data-tour="nav-payroll"]', nav: 'payroll', placement: 'right' },
  { icon: 'trending-up', title: 'Incentives', body: 'Store target versus incentive slab, side by side, with the higher of the two paid out. Change a target or a slab and every figure recomputes instantly.', target: '[data-tour="nav-incentives"]', nav: 'incentives', placement: 'right' },
  { icon: 'refresh', title: 'Reset anytime', body: 'Explored enough? Reset restores all demo data to its seed so you can present again from scratch.', target: '[data-tour="reset"]', placement: 'bottom' },
  { icon: 'phone', title: 'Open the employee app', body: 'Finally, click Split or Mobile up here to open the field employee’s phone app and clock in with a live photo — it appears on the map in real time.', target: '[data-tour="viewswitch"]', placement: 'bottom' },
];

// Mobile steps. `tab` = which bottom tab to switch to for the step.
const MOBILE_TOUR_STEPS = [
  { icon: 'sparkle', title: 'Your field app', body: 'Welcome! This is your S.D. Computronix app for attendance, payslips and incentives. Let’s take a quick look.', tab: 'home' },
  { icon: 'target',  title: 'Geo-fenced clock-in', body: 'This is the Attendance tab. Clock in with a live photo once you are inside your assigned store’s geo-fence — that is the only check you need to do.', tab: 'attendance' },
  { icon: 'calendar', title: 'Missed a mark?', body: 'Use Regularise on the same tab to request a correction. Your Team Lead approves it and your payslip updates automatically.', tab: 'attendance' },
  { icon: 'wallet',  title: 'Payslips', body: 'The Payslips tab shows your salary breakdown — base pay, deductions and incentive — and you can download each one.', tab: 'payslips' },
  { icon: 'user',    title: 'Profile & sign out', body: 'Your KYC, documents and shift live in Profile — and you can replay this tour or sign out from there anytime.', tab: 'profile' },
];

function tourPos(rect, placement, tw, th) {
  const gap = 14, vw = window.innerWidth, vh = window.innerHeight;
  let top, left;
  if (placement === 'right')      { left = rect.right + gap;  top = rect.top; }
  else if (placement === 'left')  { left = rect.left - tw - gap; top = rect.top; }
  else if (placement === 'top')   { top = rect.top - th - gap; left = rect.left; }
  else                            { top = rect.bottom + gap; left = rect.left; } // bottom
  left = Math.max(12, Math.min(left, vw - tw - 12));
  top  = Math.max(12, Math.min(top,  vh - th - 12));
  return { top, left };
}

function TourOverlay({ onClose, steps = ADMIN_TOUR_STEPS, mobile = false, onNavigate }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const tipRef = useRef(null);
  const [tick, setTick] = useState(0); // force reposition after layout
  const s = steps[step];
  const isLast = step === steps.length - 1;

  // Navigate + measure the target for the current step.
  useEffect(() => {
    const dest = mobile ? s.tab : s.nav;
    if (onNavigate && dest) onNavigate(dest);
    if (mobile) { setRect(null); return; }
    let raf;
    const measure = () => {
      const el = s.target ? document.querySelector(s.target) : null;
      setRect(el ? el.getBoundingClientRect() : null);
      setTick((t) => t + 1);
    };
    const t = setTimeout(() => { measure(); raf = requestAnimationFrame(measure); }, 70);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [step]);

  // Card contents (shared)
  const card = (
    <div className={`relative bg-white dark:bg-slate-900 shadow-pop border border-slate-200 dark:border-slate-700 overflow-hidden anim-in rounded-2xl ${mobile ? 'w-full' : 'w-full'}`} key={step}>
      <div className={`bg-gradient-to-br from-brand-700 to-brand-900 flex items-center gap-3 px-5 relative overflow-hidden ${mobile ? 'h-24' : 'h-24'}`}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white blur-2xl"/>
          <div className="absolute -bottom-10 -left-8 w-40 h-40 rounded-full bg-brand-300 blur-2xl"/>
        </div>
        <div className="relative w-12 h-12 rounded-2xl bg-white/15 backdrop-blur border border-white/30 flex items-center justify-center text-white shrink-0">
          <Icon name={s.icon} className="w-6 h-6" stroke={1.5}/>
        </div>
        <div className="relative text-white">
          <div className="text-[10px] uppercase tracking-wider font-bold text-brand-200">Step {step+1} of {steps.length}</div>
          <div className="text-[15px] font-bold leading-tight mt-0.5">{s.title}</div>
        </div>
      </div>
      <div className="p-5">
        <div className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">{s.body}</div>
        <div className="flex items-center gap-1.5 mt-4">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all ${i === step ? 'w-7 bg-brand-700' : i < step ? 'w-3 bg-brand-300' : 'w-3 bg-slate-200 dark:bg-slate-700'}`}/>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4">
          <button onClick={onClose} className="text-[12px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Skip</button>
          <div className="flex gap-2">
            {step > 0 && <Btn size="sm" onClick={() => setStep(step - 1)}>Back</Btn>}
            <Btn variant="primary" size="sm" onClick={() => { if (isLast) onClose(); else setStep(step + 1); }}>
              {isLast ? 'Done' : 'Next'} <Icon name="chevron-right" className="w-3.5 h-3.5"/>
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );

  // Mobile: centered card inside the phone frame.
  if (mobile) {
    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/55" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="w-full">{card}</div>
      </div>
    );
  }

  // Desktop: spotlight the target; place the callout beside it.
  const tw = 340;
  const th = tipRef.current ? tipRef.current.offsetHeight : 220;
  const pos = rect ? tourPos(rect, s.placement, tw, th) : null;

  return (
    <div className="fixed inset-0 z-[95] pointer-events-none">
      {rect ? (
        <div className="fixed rounded-xl transition-all duration-300 ease-out"
          style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12,
                   boxShadow: '0 0 0 9999px rgba(2,6,23,0.62)', border: '2px solid #4F63E6' }}/>
      ) : (
        <div className="fixed inset-0 bg-slate-950/60"/>
      )}
      <div ref={tipRef}
        className="fixed pointer-events-auto transition-all duration-300 ease-out"
        style={pos ? { top: pos.top, left: pos.left, width: tw } : { top: '50%', left: '50%', width: tw, transform: 'translate(-50%,-50%)' }}>
        {card}
      </div>
    </div>
  );
}

Object.assign(window, { TourOverlay, ADMIN_TOUR_STEPS, MOBILE_TOUR_STEPS });
