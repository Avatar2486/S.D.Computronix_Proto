/* Shared utilities, UI atoms, icons, toast system. */
const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;

// ---------- formatters ----------
const fmtINR = (n) => {
  if (n == null || isNaN(n)) return '—';
  const neg = n < 0; const abs = Math.abs(Math.round(n));
  const s = abs.toString();
  // Indian grouping: last 3, then 2s
  const last3 = s.slice(-3); const rest = s.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
  return (neg ? '-' : '') + '₹' + grouped;
};
const fmtDate = (d, opts = {}) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: opts.year ? 'numeric' : undefined });
};
const fmtDateTime = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' · ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
};
const fmtTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
};
const fmtMonth = (m /* YYYY-MM */) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

// ---------- store hook ----------
function useStore() {
  const [, force] = useState(0);
  useEffect(() => Store.subscribe(() => force((x) => x + 1)), []);
  return Store;
}

// ---------- toast ----------
const ToastCtx = createContext(null);
function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, kind = 'info', ms = 3200) => {
    const id = Math.random().toString(36).slice(2, 9);
    setItems((x) => [...x, { id, msg, kind }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), ms);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {items.map((t) => (
          <div key={t.id} className={`anim-in pointer-events-auto min-w-[260px] max-w-sm px-3.5 py-2.5 rounded-lg shadow-pop text-[13px] border flex items-start gap-2.5 ${
            t.kind === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800'
              : t.kind === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950 dark:text-rose-100 dark:border-rose-800'
              : t.kind === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800'
              : 'bg-white border-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
          }`}>
            <div className="mt-0.5">
              {t.kind === 'success' ? <Icon name="check-circle" className="w-4 h-4 text-emerald-600" /> :
               t.kind === 'error' ? <Icon name="alert" className="w-4 h-4 text-rose-600" /> :
               t.kind === 'warn' ? <Icon name="alert" className="w-4 h-4 text-amber-600" /> :
               <Icon name="info" className="w-4 h-4 text-brand-700" />}
            </div>
            <div className="flex-1">{t.msg}</div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
const useToast = () => useContext(ToastCtx);

// ---------- Icons (lightweight inline SVGs) ----------
function Icon({ name, className = 'w-4 h-4', stroke = 1.75 }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const svgs = {
    'home': <><path d="M3 11 12 4l9 7" {...p}/><path d="M5 10v10h14V10" {...p}/></>,
    'users': <><circle cx="9" cy="8" r="3.5" {...p}/><path d="M2.5 20a6.5 6.5 0 0 1 13 0" {...p}/><circle cx="17" cy="9" r="2.5" {...p}/><path d="M15 20a5 5 0 0 1 6.5-4.8" {...p}/></>,
    'user': <><circle cx="12" cy="8" r="4" {...p}/><path d="M4 21a8 8 0 0 1 16 0" {...p}/></>,
    'map': <><path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2Z" {...p}/><path d="M9 3v16M15 5v16" {...p}/></>,
    'pin': <><path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" {...p}/><circle cx="12" cy="10" r="2.5" {...p}/></>,
    'calendar': <><rect x="3" y="5" width="18" height="16" rx="2" {...p}/><path d="M8 3v4M16 3v4M3 10h18" {...p}/></>,
    'clock': <><circle cx="12" cy="12" r="9" {...p}/><path d="M12 7v5l3 2" {...p}/></>,
    'wallet': <><rect x="3" y="6" width="18" height="14" rx="2" {...p}/><path d="M3 10h18M16 15h2" {...p}/></>,
    'chart': <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" {...p}/></>,
    'bell': <><path d="M6 8a6 6 0 1 1 12 0c0 6 2 8 2 8H4s2-2 2-8Z" {...p}/><path d="M10 20a2 2 0 0 0 4 0" {...p}/></>,
    'settings': <><circle cx="12" cy="12" r="3" {...p}/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" {...p}/></>,
    'search': <><circle cx="11" cy="11" r="7" {...p}/><path d="m20 20-3.5-3.5" {...p}/></>,
    'plus': <><path d="M12 5v14M5 12h14" {...p}/></>,
    'check': <><path d="m5 12 5 5L20 6" {...p}/></>,
    'check-circle': <><circle cx="12" cy="12" r="9" {...p}/><path d="m8 12 3 3 5-6" {...p}/></>,
    'x': <><path d="M6 6l12 12M18 6 6 18" {...p}/></>,
    'alert': <><circle cx="12" cy="12" r="9" {...p}/><path d="M12 8v5M12 16.5v.5" {...p}/></>,
    'info': <><circle cx="12" cy="12" r="9" {...p}/><path d="M12 11v5M12 7.5v.5" {...p}/></>,
    'chevron-down': <><path d="m6 9 6 6 6-6" {...p}/></>,
    'chevron-right': <><path d="m9 6 6 6-6 6" {...p}/></>,
    'chevron-left': <><path d="m15 6-6 6 6 6" {...p}/></>,
    'download': <><path d="M12 4v12M6 12l6 6 6-6M4 20h16" {...p}/></>,
    'print': <><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" {...p}/></>,
    'camera': <><path d="M4 8h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" {...p}/><circle cx="12" cy="14" r="3.5" {...p}/></>,
    'target': <><circle cx="12" cy="12" r="9" {...p}/><circle cx="12" cy="12" r="5" {...p}/><circle cx="12" cy="12" r="1" {...p}/></>,
    'moon': <><path d="M20 14A8 8 0 1 1 10 4a7 7 0 0 0 10 10Z" {...p}/></>,
    'sun': <><circle cx="12" cy="12" r="4" {...p}/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" {...p}/></>,
    'logout': <><path d="M15 12H3M8 7l-5 5 5 5M20 4v16" {...p}/></>,
    'refresh': <><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 4v4h-4M21 12a9 9 0 0 1-15 6.7L3 16M3 20v-4h4" {...p}/></>,
    'sliders': <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" {...p}/><circle cx="16" cy="6" r="2" {...p}/><circle cx="10" cy="12" r="2" {...p}/><circle cx="18" cy="18" r="2" {...p}/></>,
    'file': <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" {...p}/><path d="M14 3v6h6" {...p}/></>,
    'shield': <><path d="M12 3 4 6v6c0 5 4 8 8 9 4-1 8-4 8-9V6l-8-3Z" {...p}/><path d="m9 12 2 2 4-4" {...p}/></>,
    'building': <><rect x="4" y="3" width="16" height="18" rx="1" {...p}/><path d="M8 7h2M8 11h2M8 15h2M14 7h2M14 11h2M14 15h2M10 21v-4h4v4" {...p}/></>,
    'send': <><path d="m4 12 16-8-6 18-2-8-8-2Z" {...p}/></>,
    'edit': <><path d="M4 20h4l10-10-4-4L4 16v4Z" {...p}/><path d="m14 6 4 4" {...p}/></>,
    'trash': <><path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" {...p}/></>,
    'menu': <><path d="M4 6h16M4 12h16M4 18h16" {...p}/></>,
    'phone': <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 20 20 0 0 1-8.6-3 20 20 0 0 1-6-6 20 20 0 0 1-3-8.6A2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7 12 12 0 0 0 .7 2.8 2 2 0 0 1-.5 2L8 9.5a16 16 0 0 0 6 6l1-1.2a2 2 0 0 1 2-.5 12 12 0 0 0 2.8.7A2 2 0 0 1 22 16.9Z" {...p}/></>,
    'mail': <><rect x="3" y="5" width="18" height="14" rx="2" {...p}/><path d="m3 7 9 6 9-6" {...p}/></>,
    'external': <><path d="M14 4h6v6M20 4l-8 8M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" {...p}/></>,
    'trending-up': <><path d="M3 17 9 11l4 4L21 7" {...p}/><path d="M14 7h7v7" {...p}/></>,
    'wifi-off': <><path d="M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 5-2.6M19 12.5a10 10 0 0 0-3-2.1M2 8.8A15 15 0 0 1 8 6.5M22 8.8a15 15 0 0 0-6-2.3M12 20h.01" {...p}/></>,
    'sparkle': <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2" {...p}/></>,
    'monitor': <><rect x="3" y="4" width="18" height="12" rx="2" {...p}/><path d="M8 20h8M12 16v4" {...p}/></>,
    'columns': <><rect x="3" y="4" width="18" height="16" rx="2" {...p}/><path d="M12 4v16" {...p}/></>,
    'chevron-up': <><path d="m6 15 6-6 6 6" {...p}/></>,
    'eye': <><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" {...p}/><circle cx="12" cy="12" r="2.75" {...p}/></>,
    'upload': <><path d="M12 16V4" {...p}/><path d="m7.5 8.5 4.5-4.5 4.5 4.5" {...p}/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" {...p}/></>,
    'briefcase': <><rect x="3" y="7" width="18" height="13" rx="2" {...p}/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" {...p}/></>,
    'graduation': <><path d="M12 4 2 9l10 5 10-5-10-5Z" {...p}/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5" {...p}/></>,
    'award': <><circle cx="12" cy="9" r="5.5" {...p}/><path d="m8.5 13.5-1 7 4.5-2.5 4.5 2.5-1-7" {...p}/></>,
    'book': <><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22V4.5Z" {...p}/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20" {...p}/></>,
    'image': <><rect x="3" y="4" width="18" height="16" rx="2" {...p}/><circle cx="8.5" cy="9.5" r="1.75" {...p}/><path d="m4 17 5-5 4 4 3-3 4 4" {...p}/></>,
    'lock': <><rect x="4" y="10" width="16" height="11" rx="2" {...p}/><path d="M8 10V7a4 4 0 0 1 8 0v3" {...p}/></>,
    'arrow-up': <><path d="M12 20V4M6 10l6-6 6 6" {...p}/></>,
    'arrow-right': <><path d="M4 12h16M14 6l6 6-6 6" {...p}/></>,
    'layers': <><path d="m12 3 9 5-9 5-9-5 9-5Z" {...p}/><path d="m3 13 9 5 9-5M3 17l9 5 9-5" {...p}/></>,
    'history': <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" {...p}/><path d="M3 4v4h4M12 8v4.5l3 1.5" {...p}/></>,
    // Arrival / departure arrows for the attendance log — ↙ in, ↗ out.
    'sign-in':  <><path d="M17 7 7 17" {...p}/><path d="M7 10v7h7" {...p}/></>,
    'sign-out': <><path d="M7 17 17 7" {...p}/><path d="M10 7h7v7" {...p}/></>,
  };
  return <svg viewBox="0 0 24 24" className={className} aria-hidden>{svgs[name] || null}</svg>;
}

// ---------- generic atoms ----------
function Btn({ variant = 'default', size = 'md', className = '', children, ...props }) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-semibold transition rounded-md whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { xs: 'h-6 px-2 text-[11px]', sm: 'h-7 px-2.5 text-[12px]', md: 'h-8 px-3 text-[13px]', lg: 'h-10 px-4 text-[13px]' };
  const variants = {
    default: 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700',
    primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-sm',
    ghost:   'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
    danger:  'bg-rose-600 text-white hover:bg-rose-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    outline: 'border border-brand-700 text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/30',
  };
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>{children}</button>;
}

function Badge({ tone = 'slate', children, className = '' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200',
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
    red:   'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
    amber: 'bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    violet:'bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200',
  };
  return <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold rounded ${tones[tone]} ${className}`}>{children}</span>;
}

function Card({ title, subtitle, right, children, className = '', bodyClass = 'p-4', noBody = false }) {
  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-card ${className}`}>
      {(title || right) && (
        <div className="px-4 h-11 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            {title && <div className="font-semibold text-[13px] text-slate-800 dark:text-slate-100">{title}</div>}
            {subtitle && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div>}
          </div>
          {right}
        </div>
      )}
      {!noBody && <div className={bodyClass}>{children}</div>}
      {noBody && children}
    </div>
  );
}

function Avatar({ emp, size = 32, className = '' }) {
  const initials = (emp?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const hue = emp?.avatarHue ?? 220;
  return (
    <div className={`inline-flex items-center justify-center rounded-full text-white font-semibold shrink-0 ${className}`}
         style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, hsl(${hue} 65% 50%), hsl(${(hue+30)%360} 60% 40%))` }}>
      {initials}
    </div>
  );
}

function StatCard({ label, value, sub, tone = 'slate', icon }) {
  const toneMap = {
    slate: 'text-slate-700', brand: 'text-brand-700 dark:text-brand-300',
    green: 'text-emerald-600', red: 'text-rose-600', amber: 'text-amber-600',
  };
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-card">
      <div className="flex items-start justify-between">
        <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">{label}</div>
        {icon && <div className={`${toneMap[tone]}`}><Icon name={icon} className="w-4 h-4"/></div>}
      </div>
      <div className={`text-2xl font-bold mt-1.5 ${toneMap[tone]} dark:text-slate-100`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

/* ---------- Modal ----------
   The single overlay pattern for the whole app: always centered, always capped
   at 90vh with its body scrolling, always closable on Escape or backdrop click.
   `size` covers everything from a confirm box to a full record view, so no
   screen needs to invent its own side panel. */
const MODAL_SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' };

/* Every dialog in the app renders through this, and every one of them is a
   portal into <body>.

   A `position: fixed` overlay is only viewport-relative while no ancestor
   establishes a containing block — a transform, filter, backdrop-filter or
   `will-change` anywhere above it silently re-anchors the dialog to that
   element, which is how a centred modal ends up pinned to the side of a card.
   Rendering outside the page tree removes the whole class of bug, and takes
   overflow clipping and z-index stacking with it. */
function Modal({ open, onClose, title, subtitle, icon, children, wide, size, footer, bodyClass = 'p-4' }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    /* Freeze whatever is actually scrolling behind the overlay. The app shell
       scrolls <main>, not <body>, so locking the body alone does nothing.

       The lock is ref-counted: dialogs stack (an employee record opens the
       offer letter over itself), and if each one restored the scroll on close
       the first to unmount would unlock the page while another is still up. */
    const scrollers = [document.body, ...document.querySelectorAll('main')];
    if (!window.__modalLocks) window.__modalLocks = 0;
    if (window.__modalLocks === 0) {
      window.__modalPrevOverflow = scrollers.map((el) => el.style.overflow);
      scrollers.forEach((el) => { el.style.overflow = 'hidden'; });
    }
    window.__modalLocks += 1;
    return () => {
      window.removeEventListener('keydown', h);
      window.__modalLocks = Math.max(0, window.__modalLocks - 1);
      if (window.__modalLocks === 0) {
        const prev = window.__modalPrevOverflow || [];
        scrollers.forEach((el, i) => { el.style.overflow = prev[i] || ''; });
      }
    };
  }, [open, onClose]);
  if (!open) return null;
  const width = MODAL_SIZES[size] || (wide ? MODAL_SIZES.xl : MODAL_SIZES.md);
  const overlay = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 anim-in" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white dark:bg-slate-900 rounded-xl shadow-pop border border-slate-200 dark:border-slate-800 w-full ${width} max-h-[90vh] flex flex-col`}>
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
                <Icon name={icon} className="w-4 h-4"/>
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">{title}</div>
              {subtitle && <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{subtitle}</div>}
            </div>
          </div>
          <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0" onClick={onClose} aria-label="Close"><Icon name="x"/></button>
        </div>
        <div className={`${bodyClass} overflow-auto flex-1`}>{children}</div>
        {footer && <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  );
  return ReactDOM.createPortal(overlay, document.body);
}

// ---------- Input ----------
function Field({ label, hint, error, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 uppercase tracking-wide">{label}</div>}
      {children}
      {hint && !error && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{hint}</div>}
      {error && <div className="text-[11px] text-rose-600 mt-1">{error}</div>}
    </label>
  );
}
function Input({ className = '', ...props }) {
  return <input className={`w-full h-8 px-2.5 text-[13px] border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${className}`} {...props}/>;
}
function Select({ className = '', children, ...props }) {
  return <select className={`w-full h-8 px-2 text-[13px] border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 ${className}`} {...props}>{children}</select>;
}
function Textarea({ className = '', ...props }) {
  return <textarea className={`w-full px-2.5 py-1.5 text-[13px] border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[70px] ${className}`} {...props}/>;
}

// ---------- SearchSelect ----------
/* Type-ahead replacement for <Select> wherever the choices already exist in the
   database — employees, Team Leads, Business Managers, stores, cities. With 562
   stores and 490 staff a native <select> means scrolling forever, so here the
   user types two or three letters instead.

   options: [{ value, label, sub, keywords }]  ·  onChange receives the raw value.
   The panel is portalled to <body> so a Modal or filter popover never clips it.
   allowCustom keeps a field usable for values not yet in the database (a store
   in a brand-new city) — the typed text is offered as its own option. */
function SearchSelect({
  value, onChange, options = [], placeholder = 'Select…',
  searchPlaceholder = 'Type to search…', emptyLabel = 'No matches',
  disabled = false, className = '', allowCustom = false,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [box, setBox] = useState(null);
  const anchorRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);

  const val = value == null ? '' : String(value);
  const selected = options.find((o) => String(o.value) === val)
    || (allowCustom && val ? { value: val, label: val } : null);

  const matches = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return options;
    const hits = options.filter((o) => `${o.label || ''} ${o.sub || ''} ${o.keywords || ''}`.toLowerCase().includes(ql));
    if (allowCustom && !options.some((o) => String(o.label).toLowerCase() === ql)) {
      return [{ value: q.trim(), label: `Use "${q.trim()}"`, sub: 'Not in the list yet — add it' }, ...hits];
    }
    return hits;
  }, [q, options, allowCustom]);

  const place = useCallback(() => {
    if (anchorRef.current) setBox(anchorRef.current.getBoundingClientRect());
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e) => {
      if ((anchorRef.current && anchorRef.current.contains(e.target)) ||
          (panelRef.current && panelRef.current.contains(e.target))) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown, true);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      clearTimeout(t);
    };
  }, [open, place]);

  const openPanel = () => { if (!disabled) { setQ(''); setActive(0); setOpen(true); } };
  const pick = (o) => { onChange(o.value); setOpen(false); setQ(''); setActive(0); };

  const onKey = (e) => {
    if (e.key === 'ArrowDown')      { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter')     { e.preventDefault(); if (matches[active]) pick(matches[active]); }
    else if (e.key === 'Escape')    { e.preventDefault(); setOpen(false); }
  };

  // Drop upwards when the panel would run off the bottom of the viewport.
  const PANEL_H = 280;
  const width = box ? Math.max(box.width, 240) : 240;
  const dropUp = box && (window.innerHeight - box.bottom) < PANEL_H && box.top > (window.innerHeight - box.bottom);
  const style = box ? {
    position: 'fixed', zIndex: 100, width,
    left: Math.max(8, Math.min(box.left, window.innerWidth - width - 8)),
    top: dropUp ? undefined : box.bottom + 4,
    bottom: dropUp ? window.innerHeight - box.top + 4 : undefined,
  } : null;

  return (
    <div className="relative">
      <div ref={anchorRef} role="button" tabIndex={disabled ? -1 : 0} aria-haspopup="listbox" aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); openPanel(); } }}
        className={`w-full h-8 px-2 flex items-center gap-1.5 text-[13px] border rounded-md transition ${
          disabled
            ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 cursor-pointer hover:border-slate-400 dark:hover:border-slate-600'
        } ${open ? 'ring-2 ring-brand-500 border-brand-500' : ''} ${className}`}>
        <span className={`flex-1 min-w-0 truncate text-left ${selected ? '' : 'text-slate-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <Icon name="chevron-down" className="w-3 h-3 text-slate-400 shrink-0"/>
      </div>

      {open && box && ReactDOM.createPortal(
        <div ref={panelRef} style={style}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-pop overflow-hidden anim-in">
          <div className="flex items-center gap-1.5 h-8 px-2 border-b border-slate-100 dark:border-slate-800">
            <Icon name="search" className="w-3.5 h-3.5 text-slate-400 shrink-0"/>
            <input ref={inputRef} value={q} onKeyDown={onKey}
              onChange={(e) => { setQ(e.target.value); setActive(0); }}
              placeholder={searchPlaceholder}
              className="flex-1 min-w-0 bg-transparent text-[13px] outline-none dark:text-slate-100"/>
            {q && (
              <button type="button" onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setQ(''); setActive(0); if (inputRef.current) inputRef.current.focus(); }}
                className="text-slate-400 hover:text-slate-600 shrink-0"><Icon name="x" className="w-3.5 h-3.5"/></button>
            )}
          </div>
          <div className="max-h-[220px] overflow-auto py-1">
            {matches.length === 0 && <div className="px-3 py-4 text-[12px] text-slate-500 text-center">{emptyLabel}</div>}
            {matches.map((o, i) => {
              const isSel = String(o.value) === val;
              return (
                <button key={String(o.value)} type="button"
                  ref={i === active ? (el) => { if (el) el.scrollIntoView({ block: 'nearest' }); } : null}
                  onMouseEnter={() => setActive(i)} onClick={() => pick(o)}
                  className={`w-full text-left px-2.5 py-1.5 flex items-center gap-2 ${i === active ? 'bg-brand-50 dark:bg-brand-900/30' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[12.5px] truncate ${isSel ? 'font-bold text-brand-800 dark:text-brand-200' : 'font-semibold text-slate-800 dark:text-slate-100'}`}>{o.label}</div>
                    {o.sub && <div className="text-[10.5px] text-slate-500 truncate">{o.sub}</div>}
                  </div>
                  {isSel && <Icon name="check" className="w-3.5 h-3.5 text-brand-600 shrink-0"/>}
                </button>
              );
            })}
          </div>
          {options.length > 12 && (
            <div className="px-2.5 py-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/50">
              {matches.length} of {options.length} · type to narrow
            </div>
          )}
        </div>, document.body)}
    </div>
  );
}

/* ---------- Tabs ----------
   One tab component for every tabbed surface in the app (Employees, Attendance,
   Incentives, Reports) so they can never drift apart visually.
   `variant`: 'underline' for page-level sections, 'pill' for sub-sections. */
function Tabs({ tabs, value, onChange, variant = 'underline', className = '' }) {
  if (variant === 'pill') {
    return (
      <div className={`inline-flex flex-wrap gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 ${className}`}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => onChange(t.id)}
            className={`h-7 px-3 rounded-md text-[12px] font-semibold transition flex items-center gap-1.5 ${
              value === t.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                             : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}>
            {t.icon && <Icon name={t.icon} className="w-3.5 h-3.5"/>}{t.label}
            {t.badge > 0 && <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand-700 text-white text-[10px] font-bold flex items-center justify-center">{t.badge}</span>}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-0.5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto ${className}`}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-[13px] font-semibold border-b-2 -mb-px whitespace-nowrap transition ${
            value === t.id ? 'border-brand-700 text-brand-800 dark:text-brand-300 dark:border-brand-400'
                           : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}>
          {t.icon && <Icon name={t.icon} className="w-3.5 h-3.5"/>}{t.label}
          {t.badge > 0 && <span className="min-w-[16px] h-4 px-1 rounded-full bg-brand-700 text-white text-[10px] font-bold flex items-center justify-center">{t.badge}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- PageHeader ----------
   Eyebrow / title / subtitle / actions, identical on every page. */
function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <div className="flex items-end justify-between flex-wrap gap-3">
      <div className="min-w-0">
        {eyebrow && <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{eyebrow}</div>}
        <div className="text-xl font-bold text-slate-900 dark:text-white">{title}</div>
        {subtitle && <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div>}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}

/* ---------- StatusBadge ----------
   Every status string in the system resolves to one tone and one label here, so
   "pending" looks the same in Employees, Payroll and Reports. */
const STATUS_TONES = {
  draft:              ['slate',  'Draft'],
  new:                ['violet', 'New'],
  registered:         ['brand',  'Registered'],
  documents:          ['brand',  'Documents'],
  'pending-approval': ['amber',  'Pending Approval'],
  pending:            ['amber',  'Pending'],
  approval:           ['amber',  'Awaiting Approval'],
  approved:           ['green',  'Approved'],
  onboarding:         ['brand',  'Onboarding'],
  active:             ['green',  'Active'],
  inactive:           ['slate',  'Inactive'],
  rejected:           ['red',    'Rejected'],
  completed:          ['green',  'Completed'],
  verified:           ['green',  'Verified'],
  uploaded:           ['amber',  'Pending Review'],
  missing:            ['red',    'Missing'],
  // Attendance log day states
  'on-time':          ['green',  'On Time'],
  late:               ['amber',  'Late'],
  incomplete:         ['amber',  'Incomplete'],
  absent:             ['red',    'Absent'],
  'weekly-off':       ['slate',  'Weekly Off'],
  upcoming:           ['slate',  'Upcoming'],
  'no-data':          ['slate',  'No log'],
  regularised:        ['violet', 'Regularised'],
};
function StatusBadge({ status, label, className = '' }) {
  const [tone, text] = STATUS_TONES[status] || ['slate', status || '—'];
  return <Badge tone={tone} className={className}>{label || text}</Badge>;
}

/* ---------- FilterBar ----------
   Shared shell for the filter rows across Reports, Incentives and Attendance:
   a responsive grid of controls plus Apply / Reset. Children supply the fields.
   `activeCount` drives the "n active" pill so a narrowed view is never silent. */
function FilterBar({ children, onApply, onReset, activeCount = 0, title = 'Filters', hint }) {
  return (
    <Card noBody className="overflow-visible">
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="sliders" className="w-3.5 h-3.5 text-slate-400 shrink-0"/>
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{title}</span>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-brand-700 text-white text-[10px] font-bold">{activeCount} active</span>
          )}
          {hint && <span className="text-[11px] text-slate-400 truncate hidden md:inline">· {hint}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onApply && <Btn size="xs" variant="primary" onClick={onApply}><Icon name="check" className="w-3 h-3"/>Apply</Btn>}
          <Btn size="xs" onClick={onReset} disabled={activeCount === 0}><Icon name="refresh" className="w-3 h-3"/>Reset</Btn>
        </div>
      </div>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">{children}</div>
    </Card>
  );
}

/* Removable chips summarising the active filters. */
function FilterChips({ chips, onClearAll }) {
  if (!chips || chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <button key={c.k} onClick={c.clear}
          className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 text-[11px] font-semibold text-brand-800 dark:text-brand-200 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition">
          {c.label}<Icon name="x" className="w-3 h-3"/>
        </button>
      ))}
      {onClearAll && <button onClick={onClearAll} className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 underline ml-1">Clear all</button>}
    </div>
  );
}

/* ---------- PhotoUpload ----------
   Profile photo with preview and replace. Reads the file to a data URL so the
   picture survives a reload in this local-storage-backed prototype. */
function PhotoUpload({ value, onChange, name, size = 96, disabled }) {
  const ref = useRef(null);
  const [err, setErr] = useState('');
  const pick = (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) { setErr('Choose an image file (JPG, PNG or WebP)'); return; }
    if (file.size > 2 * 1024 * 1024) { setErr('Photo must be 2 MB or smaller'); return; }
    setErr('');
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target.result);
    reader.readAsDataURL(file);
  };
  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0 rounded-full overflow-hidden border-2 border-white dark:border-slate-800 shadow-card"
        style={{ width: size, height: size }}>
        {value
          ? <img src={value} alt={name ? `${name} profile photo` : 'Profile photo'} className="w-full h-full object-cover"/>
          : <Avatar emp={{ name: name || '?', avatarHue: 220 }} size={size}/>}
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">Profile photo</div>
        <div className="text-[11px] text-slate-500 mt-0.5">JPG, PNG or WebP · max 2 MB</div>
        {err && <div className="text-[11px] text-rose-600 mt-1">{err}</div>}
        <div className="flex items-center gap-1.5 mt-2">
          <input ref={ref} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; pick(f); }}/>
          <Btn size="xs" type="button" disabled={disabled} onClick={() => ref.current && ref.current.click()}>
            <Icon name={value ? 'refresh' : 'upload'} className="w-3 h-3"/>{value ? 'Replace' : 'Upload'}
          </Btn>
          {value && <Btn size="xs" type="button" variant="ghost" disabled={disabled} onClick={() => onChange(null)}>Remove</Btn>}
        </div>
      </div>
    </div>
  );
}

/* ---------- EmailField ----------
   Runs the store's email check (syntax, disposable domains, duplicates) as the
   user types, debounced so a half-typed address is not flagged mid-keystroke.
   Reports the verdict upward via onValidity so the parent can gate Save. */
function EmailField({ value, onChange, excludeEmpId, label = 'Email address', placeholder = 'you@sdc.in', onValidity, required = true, disabled }) {
  const [state, setState] = useState({ status: 'idle', reason: '' });
  useEffect(() => {
    const raw = String(value || '').trim();
    if (!raw) {
      const next = { status: required ? 'error' : 'idle', reason: required ? 'Email address is required' : '' };
      setState(next); onValidity && onValidity(!required);
      return;
    }
    setState({ status: 'checking', reason: 'Validating address…' });
    const t = setTimeout(() => {
      const res = Store.validateEmail(raw, excludeEmpId);
      setState({ status: res.valid ? 'ok' : 'error', reason: res.reason });
      onValidity && onValidity(res.valid);
    }, 400);
    return () => clearTimeout(t);
  }, [value, excludeEmpId, required]);

  const tone = state.status === 'ok' ? 'text-emerald-600' : state.status === 'error' ? 'text-rose-600' : 'text-slate-500';
  const ring = state.status === 'ok' ? 'border-emerald-400 focus:ring-emerald-500'
    : state.status === 'error' ? 'border-rose-400 focus:ring-rose-500' : '';
  return (
    <Field label={label}>
      <div className="relative">
        <Input type="email" value={value || ''} disabled={disabled} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)} className={`pr-8 ${ring}`}/>
        {state.status !== 'idle' && (
          <span className={`absolute right-2 top-1/2 -translate-y-1/2 ${tone}`}>
            <Icon name={state.status === 'ok' ? 'check-circle' : state.status === 'error' ? 'alert' : 'clock'} className="w-4 h-4"/>
          </span>
        )}
      </div>
      {state.reason && <div className={`text-[11px] mt-1 ${tone}`}>{state.reason}</div>}
    </Field>
  );
}

/* ---------- IncentiveAmount ----------
   Whenever a percentage or a flat value is entered anywhere in the app, this
   spells out the rupees it actually produces, so nobody has to do the sum in
   their head. */
function IncentiveAmount({ base, type, value, baseLabel = 'Target', className = '' }) {
  const v = +value || 0;
  const b = +base || 0;
  const amount = type === 'pct' ? Math.round((b * v) / 100) : Math.round(v);
  const hasInput = value !== '' && value != null;
  return (
    <div className={`rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 ${className}`}>
      <div className="text-[10px] uppercase font-bold tracking-wide text-emerald-700 dark:text-emerald-300">
        {type === 'pct' ? 'Calculated incentive' : 'Actual incentive'}
      </div>
      <div className="text-lg font-bold text-emerald-800 dark:text-emerald-200 leading-tight">
        {hasInput ? fmtINR(amount) : '—'}
      </div>
      <div className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80">
        {type === 'pct'
          ? `${v || 0}% of ${baseLabel.toLowerCase()} ${fmtINR(b)}`
          : 'Fixed amount — paid as entered'}
      </div>
    </div>
  );
}

// ---------- Empty ----------
function Empty({ icon = 'info', title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-2">
        <Icon name={icon} className="w-5 h-5"/>
      </div>
      <div className="font-semibold text-slate-700 dark:text-slate-200">{title}</div>
      {hint && <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs">{hint}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// ---------- CSV download ----------
function downloadCSV(filename, rows) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ---------- role helpers ----------

   Four roles. There used to be an Admin and a Super Admin; they did the same
   job with different labels, so they are now one `admin` role that any number
   of people can hold. Records written before the merge still say 'super-admin',
   so every lookup goes through `roleOf` rather than reading `user.role` raw.

   Site Manager is the Team Lead seat. A Team Lead runs a store's day — they do
   not create or edit people, and they do not decide attendance corrections;
   both of those are HR/Admin work. */
const roleOf = (user) => (Store.canonicalRole ? Store.canonicalRole(user && user.role) : (user && user.role));

const ROLE_LABEL = {
  'admin': 'Admin',
  'super-admin': 'Admin',       // legacy sessions
  'hr-manager': 'HR Manager',
  'site-manager': 'Team Lead',
  'field-employee': 'Employee',
};
const ROLE_SHORT = {
  'admin': 'Admin', 'super-admin': 'Admin', 'hr-manager': 'HR', 'site-manager': 'Team Lead', 'field-employee': 'Employee',
};

/* Single source of truth for "may this role do this?".
   The UI hides actions rather than showing them disabled, so a Team Lead never
   sees a payroll button they cannot press. */
/* Money is its own axis, split three ways.

     salary.view    — HR and Admin. HR runs payroll and has to see the figure.
     salary.edit    — Admin only. Setting someone's pay is the decision, and it
                      stays with the role that owns approvals.
     incentive.view — HR and Admin. Incentive is pay by another name.

   A Team Lead holds none of them. They run a store's day — attendance, sales
   performance, recognition — and never see what anyone earns. `money.view` is
   the coarse gate for anywhere a rupee figure about a person's earnings would
   otherwise appear. */
const MONEY_ACTIONS = ['salary.view', 'incentive.view', 'payroll.view'];

const PERMISSIONS = {
  'admin':          ['*'],
  'hr-manager':     ['employee.view','employee.create','employee.edit','employee.submit','document.upload','designation.edit','geofence.edit',
                     'salary.view','attendance.view','attendance.decide','payroll.view','incentive.view','incentive.edit','target.view','target.edit',
                     'site.view','policy.view','policy.edit','report.view','kudos.send'],
  /* Team Lead: read their own technicians, nothing that writes to a personnel
     record, decides a correction, or reveals earnings. */
  'site-manager':   ['employee.view','attendance.view','target.view','site.view','policy.view','report.view','kudos.send'],
  'field-employee': ['policy.view'],
};
function can(user, action) {
  if (!user) return false;
  const list = PERMISSIONS[roleOf(user)] || [];
  return list.includes('*') || list.includes(action);
}
/* "Is this person allowed to see money at all?" — one call for the many places
   a payout, a payslip total or an incentive amount would otherwise leak. */
const canSeeMoney = (user) => MONEY_ACTIONS.some((a) => can(user, a));
// Only an Admin's own records skip the approval queue.
const isAdmin = (user) => roleOf(user) === 'admin';
// Kept under the old name so existing call sites keep reading naturally.
const isSuperAdmin = isAdmin;

// ---------- confirm dialog ----------
function useConfirm() {
  const [conf, setConf] = useState(null);
  const ConfirmUI = conf ? (
    <Modal open onClose={() => { conf.resolve(false); setConf(null); }} title={conf.title}
      footer={<>
        <Btn onClick={() => { conf.resolve(false); setConf(null); }}>Cancel</Btn>
        <Btn variant={conf.destructive ? 'danger' : 'primary'} onClick={() => { conf.resolve(true); setConf(null); }}>{conf.confirmLabel || 'Confirm'}</Btn>
      </>}>
      <div className="text-[13px] text-slate-600 dark:text-slate-300">{conf.body}</div>
    </Modal>
  ) : null;
  const confirm = (opts) => new Promise((resolve) => setConf({ ...opts, resolve }));
  return { confirm, ConfirmUI };
}

// ---------- misc formatters ----------
/* Compact rupee for dense cells and chart labels: ₹1.2L / ₹45k / ₹900. */
const fmtINRShort = (n) => {
  const v = Math.round(+n || 0);
  if (Math.abs(v) >= 10000000) return '₹' + (v / 10000000).toFixed(v % 10000000 ? 1 : 0) + 'Cr';
  if (Math.abs(v) >= 100000) return '₹' + (v / 100000).toFixed(v % 100000 ? 1 : 0) + 'L';
  if (Math.abs(v) >= 1000) return '₹' + Math.round(v / 1000) + 'k';
  return '₹' + v;
};
const pctOf = (a, b) => (!b ? 0 : Math.round((a / b) * 100));

/* ---------- Leaflet mounting ----------

   Leaflet measures its container once, at creation, and lays the tile grid out
   from that measurement. Every map in this app is created inside a container
   that is still mid-fade (the page wrapper animates on navigation) and inside a
   flex column whose height settles a frame later — so the map was measuring a
   collapsed or offset box and painting its tiles outside the visible area. The
   result was a map pane that rendered nothing.

   This hook re-measures on the next frame, once the entry animation is over,
   and thereafter whenever the container changes size. `onReady` runs once with
   the map instance; the caller keeps its own layer refs. */
function useLeafletMap(containerRef, factory, deps = []) {
  const mapRef = useRef(null);
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (typeof L === 'undefined' || !L || !L.map) return;
    const map = factory(containerRef.current);
    if (!map) return;
    mapRef.current = map;

    const settle = () => { try { map.invalidateSize(); } catch (e) {} };
    // Next frame (layout done), after the 200ms page fade, and once more late
    // for slow tile/font loads — all cheap, and between them nothing is missed.
    requestAnimationFrame(settle);
    const timers = [setTimeout(settle, 250), setTimeout(settle, 700)];

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(settle);
      ro.observe(containerRef.current);
    }
    window.addEventListener('resize', settle);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', settle);
      if (ro) ro.disconnect();
      try { map.remove(); } catch (e) {}
      mapRef.current = null;
    };
  }, deps);
  return mapRef;
}

/* Shown in place of a map when Leaflet itself failed to load, so the panel
   explains itself instead of being a blank rectangle. */
function MapUnavailable({ height = 240 }) {
  return (
    <div style={{ height }} className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-400">
      <Icon name="map" className="w-6 h-6"/>
      <div className="text-[11.5px] font-semibold">Map library unavailable</div>
      <div className="text-[10.5px]">Check the network connection and reload.</div>
    </div>
  );
}
const hasLeaflet = () => typeof L !== 'undefined' && !!L && !!L.map;

/* ---------- time ---------- */
/* 'HH:MM' (24h, what <input type="time"> speaks) → '10:11 am' for display. */
const fmtHHMM = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = String(hhmm).split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m || 0).padStart(2, '0')} ${suffix}`;
};
/* Minutes → '8h 24m', for gross-hours columns. */
const fmtDuration = (mins) => {
  const v = Math.max(0, Math.round(mins || 0));
  return `${Math.floor(v / 60)}h ${String(v % 60).padStart(2, '0')}m`;
};

/* A clock time the user picks. Native time input so mobile gets its own wheel
   and the keyboard path stays typeable. */
function TimeInput({ value, onChange, disabled, className = '', ...rest }) {
  return (
    <input type="time" value={value || ''} disabled={disabled}
      onChange={(e) => onChange && onChange(e.target.value)}
      className={`h-8 px-2 text-[13px] font-mono border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 ${className}`}
      {...rest}/>
  );
}

/* Small horizontal progress bar used in target/achievement cells. */
function ProgressBar({ value, tone, className = '', height = 6 }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  const bg = tone || (pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-brand-600' : 'bg-amber-500');
  return (
    <div className={`rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden ${className}`} style={{ height }}>
      <div className={`h-full rounded-full transition-all ${bg}`} style={{ width: pct + '%' }}/>
    </div>
  );
}

/* Shared pagination footer — same control on every long table. */
function Pagination({ page, pages, total, per, onPage, unit = 'rows' }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 dark:border-slate-800 text-[12px] flex-wrap gap-2">
      <span className="text-slate-500">Showing {page * per + 1}–{Math.min((page + 1) * per, total)} of {total} {unit}</span>
      <div className="flex items-center gap-2">
        <Btn size="xs" disabled={page === 0} onClick={() => onPage(page - 1)}><Icon name="chevron-left" className="w-3 h-3"/>Prev</Btn>
        <span className="font-mono">{page + 1} / {pages}</span>
        <Btn size="xs" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>Next<Icon name="chevron-right" className="w-3 h-3"/></Btn>
      </div>
    </div>
  );
}

// Expose to global scope for other Babel scripts
Object.assign(window, {
  fmtINR, fmtINRShort, fmtDate, fmtDateTime, fmtTime, fmtMonth, pctOf, useStore, useToast, ToastProvider, ToastCtx,
  Icon, Btn, Badge, Card, Avatar, StatCard, Modal, Field, Input, Select, SearchSelect, Textarea, Empty,
  Tabs, PageHeader, StatusBadge, STATUS_TONES, FilterBar, FilterChips, PhotoUpload, EmailField,
  IncentiveAmount, ProgressBar, Pagination, TimeInput,
  useLeafletMap, MapUnavailable, hasLeaflet, fmtHHMM, fmtDuration,
  downloadCSV, ROLE_LABEL, ROLE_SHORT, PERMISSIONS, MONEY_ACTIONS, can, canSeeMoney, roleOf, isAdmin, isSuperAdmin, useConfirm,
});
