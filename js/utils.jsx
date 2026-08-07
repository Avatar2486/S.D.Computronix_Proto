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

// ---------- Modal ----------
function Modal({ open, onClose, title, children, wide, footer }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-in">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white dark:bg-slate-900 rounded-xl shadow-pop border border-slate-200 dark:border-slate-800 w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[90vh] flex flex-col`}>
        <div className="h-12 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="font-semibold text-slate-800 dark:text-slate-100">{title}</div>
          <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onClose}><Icon name="x"/></button>
        </div>
        <div className="p-4 overflow-auto flex-1">{children}</div>
        {footer && <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  );
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

// ---------- role helpers ----------
const ROLE_LABEL = {
  'super-admin': 'Super Admin',
  'hr-manager': 'HR Manager',
  'site-manager': 'Site Manager',
  'field-employee': 'Field Employee',
};

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

// Expose to global scope for other Babel scripts
Object.assign(window, {
  fmtINR, fmtDate, fmtDateTime, fmtTime, fmtMonth, useStore, useToast, ToastProvider, ToastCtx,
  Icon, Btn, Badge, Card, Avatar, StatCard, Modal, Field, Input, Select, Textarea, Empty,
  downloadCSV, ROLE_LABEL, useConfirm,
});
