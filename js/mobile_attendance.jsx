/* Mobile attendance: clock-in/out with webcam + geo-fence check, history,
   regularisation submit. There is no periodic re-check — a shift is one
   clock-in and one clock-out, and anything missed goes to Regularise. */
function MobileAttendance({ emp }) {
  const store = useStore();
  const toast = useToast();
  const [subtab, setSubtab] = useState('clock');
  return (
    <div className="px-4 space-y-3">
      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
        {[
          { id: 'clock', label: 'Clock in/out' },
          { id: 'history', label: 'History' },
          { id: 'regularise', label: 'Regularise' },
        ].map((t) => (
          <button key={t.id} onClick={() => setSubtab(t.id)}
            className={`flex-1 py-1.5 text-[12px] font-semibold rounded-md ${subtab === t.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {subtab === 'clock' && <ClockPanel emp={emp}/>}
      {subtab === 'history' && <HistoryPanel emp={emp}/>}
      {subtab === 'regularise' && <RegularisePanel emp={emp}/>}
    </div>
  );
}

function ClockPanel({ emp }) {
  const store = useStore();
  const toast = useToast();
  const site = store.getSite(emp.siteId);
  const today = '2026-07-15';
  const marks = store.getAttendance({ employeeId: emp.id, date: today });
  const clockIn = marks.find((m) => m.type === 'clock-in');
  const clockOut = marks.find((m) => m.type === 'clock-out');

  // Simulated GPS position — user can drag on map
  const [pos, setPos] = useState({ lat: site.lat + 0.0001, lng: site.lng - 0.0001 });
  const geo = store.checkGeofence(emp.id, pos.lat, pos.lng);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [captureFor, setCaptureFor] = useState(null); // 'clock-in' | 'clock-out'
  /* Offline capture is automatic — the app queues a mark whenever the device
     has no connection and syncs it when the connection returns. There is no
     manual switch: asking an employee to declare they are offline was a toggle
     that only ever produced the wrong state. */
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const [queued, setQueued] = useState(0);

  const startCapture = (type) => {
    // The fence only gates clock-in, and only when it is enabled for this person.
    if (type === 'clock-in' && geo.enforced && !geo.inside) {
      toast(`You are ${Math.round(geo.distance)}m outside the geo-fence — cannot clock in`, 'error');
      return;
    }
    setCaptureFor(type);
    setCameraOpen(true);
  };
  const onCaptured = (photoDataUrl) => {
    Store.addAttendance({
      employeeId: emp.id, type: captureFor, date: today,
      timestamp: new Date().toISOString(),
      latitude: pos.lat, longitude: pos.lng,
      insideGeofence: geo.inside, photoUrl: photoDataUrl,
      offlineCaptured: offline,
    });
    if (offline) { setQueued((q) => q + 1); toast(`${captureFor.replace('-', ' ')} saved offline · GPS captured, will sync when online`, 'warn'); }
    else toast(`${captureFor.replace('-', ' ')} recorded · ${geo.inside ? 'inside fence' : 'outside fence'}`, 'success');
    setCameraOpen(false);
    setCaptureFor(null);
  };

  const syncNow = () => { setQueued(0); toast('Queued marks synced to server', 'success'); };

  return (
    <div className="space-y-3">
      {/* Offline-first indicator */}
      <div className={`rounded-xl px-3 py-2 flex items-center gap-2.5 border ${offline ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800' : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'}`}>
        <Icon name={offline ? 'wifi-off' : 'check-circle'} className={`w-4 h-4 shrink-0 ${offline ? 'text-amber-600' : 'text-emerald-600'}`}/>
        <div className="flex-1 min-w-0">
          {offline ? (
            <>
              <div className="text-[11px] font-bold text-amber-800 dark:text-amber-200">Offline Mode — Captured GPS</div>
              <div className="text-[10px] text-amber-700 dark:text-amber-300">{queued > 0 ? `${queued} mark${queued > 1 ? 's' : ''} queued · ` : ''}Will sync automatically when online</div>
            </>
          ) : (
            <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">Online · marks sync in real time</div>
          )}
        </div>
        {queued > 0 && <Btn size="xs" variant="success" onClick={syncNow}><Icon name="refresh" className="w-3 h-3"/>Sync</Btn>}
      </div>

      {/* Geo-fence status card — reads differently when the fence is switched off */}
      {!geo.enforced ? (
        <div className="rounded-xl p-3 border bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Icon name="pin" className="w-5 h-5 text-slate-400"/>
            <div className="flex-1">
              <div className="text-[12px] font-bold text-slate-700 dark:text-slate-200">Geo-fencing not required</div>
              <div className="text-[11px] text-slate-500">You can clock in from any location.</div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`rounded-xl p-3 border ${geo.inside ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800'}`}>
          <div className="flex items-center gap-2">
            <Icon name={geo.inside ? 'check-circle' : 'alert'} className={`w-5 h-5 ${geo.inside ? 'text-emerald-600' : 'text-rose-600'}`}/>
            <div className="flex-1">
              <div className={`text-[12px] font-bold ${geo.inside ? 'text-emerald-800 dark:text-emerald-200' : 'text-rose-800 dark:text-rose-200'}`}>{geo.inside ? 'Inside geo-fence' : 'Outside geo-fence'}</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300">{Math.round(geo.distance)}m from {site.name}</div>
            </div>
          </div>
        </div>
      )}

      {/* Mini map with draggable position */}
      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative">
        <MiniGeoMap site={site} pos={pos} setPos={setPos}/>
        <div className="absolute top-2 left-2 right-2 z-10 px-2 py-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded text-[10px] text-slate-600 dark:text-slate-300 font-mono">
          {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)} · drag pin to simulate
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => startCapture('clock-in')} disabled={!!clockIn || !geo.inside}
          className={`p-4 rounded-xl border-2 text-left transition ${!!clockIn ? 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 opacity-60 cursor-not-allowed' : geo.inside ? 'bg-brand-700 border-brand-800 text-white hover:bg-brand-800' : 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600 text-slate-400 cursor-not-allowed'}`}>
          <Icon name="check" className={`w-6 h-6 mb-1 ${!!clockIn ? 'text-slate-400' : geo.inside ? 'text-white' : 'text-slate-400'}`}/>
          <div className="text-[13px] font-bold">Clock In</div>
          <div className={`text-[10px] mt-0.5 ${!!clockIn ? '' : geo.inside ? 'text-brand-100' : 'text-slate-400'}`}>{clockIn ? `Done at ${fmtTime(clockIn.timestamp)}` : geo.inside ? 'Take live photo' : 'Move inside fence'}</div>
        </button>
        <button onClick={() => startCapture('clock-out')} disabled={!clockIn || !!clockOut}
          className={`p-4 rounded-xl border-2 text-left transition ${!clockIn || !!clockOut ? 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 opacity-60 cursor-not-allowed' : 'bg-slate-900 border-slate-950 text-white hover:bg-slate-800 dark:bg-slate-700'}`}>
          <Icon name="x" className={`w-6 h-6 mb-1 ${!clockIn || !!clockOut ? 'text-slate-400' : 'text-white'}`}/>
          <div className="text-[13px] font-bold">Clock Out</div>
          <div className="text-[10px] mt-0.5 opacity-80">{clockOut ? `Done at ${fmtTime(clockOut.timestamp)}` : clockIn ? 'End your shift' : 'Clock in first'}</div>
        </button>
      </div>

      {/* Missed a mark? Regularise it — no periodic re-check exists any more. */}
      {clockIn && clockOut && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0"><Icon name="check" className="w-4 h-4"/></div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-emerald-900 dark:text-emerald-100">Shift complete</div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
              {fmtTime(clockIn.timestamp)} – {fmtTime(clockOut.timestamp)} · both marks recorded
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 flex items-start gap-2">
        <Icon name="info" className="w-4 h-4 text-brand-700 dark:text-brand-300 mt-0.5 shrink-0"/>
        <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
          <span className="font-semibold text-slate-800 dark:text-slate-100">Two marks a day.</span> Clock in when you arrive and clock out when you leave — nothing else is required during your shift.
          Each mark is a live capture stamped with the time and your location; gallery uploads are disabled.
          Missed one? Raise it under <span className="font-semibold">Regularise</span>.
        </div>
      </div>

      {cameraOpen && <CameraCapture onClose={() => setCameraOpen(false)} onCapture={onCaptured} pos={pos} inside={geo.inside}/>}
    </div>
  );
}

function MiniGeoMap({ site, pos, setPos }) {
  const ref = useRef(null);
  if (!hasLeaflet() || !site) return <MapUnavailable height={180}/>;
  useLeafletMap(ref, (el) => {
    const m = L.map(el, { zoomControl: false, attributionControl: false }).setView([site.lat, site.lng], 17);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd' }).addTo(m);
    L.circle([site.lat, site.lng], { radius: site.radius, color: '#1E40AF', fillOpacity: 0.12, weight: 1.5, dashArray: '4,3' }).addTo(m);
    L.marker([site.lat, site.lng], { icon: L.divIcon({ className: '', html: '<div style="background:#1E40AF;color:white;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:600;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.3)">📍 Site</div>', iconSize: null }) }).addTo(m);
    const marker = L.marker([pos.lat, pos.lng], {
      draggable: true,
      icon: L.divIcon({ className: '', html: '<div style="width:18px;height:18px;border-radius:50%;background:#F59E0B;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>', iconSize: [18,18], iconAnchor: [9,9] })
    }).addTo(m);
    marker.on('drag', (e) => { const p = e.target.getLatLng(); setPos({ lat: p.lat, lng: p.lng }); });
    return m;
  }, [site.id]);
  return <div ref={ref} style={{ height: 180 }}/>;
}

function CameraCapture({ onClose, onCapture, pos, inside }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const streamRef = useRef(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (cancel) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; setReady(true); }
      } catch (e) {
        setFailed(true);
      }
    })();
    return () => { cancel = true; if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop()); };
  }, []);

  const snap = () => {
    const c = canvasRef.current || document.createElement('canvas');
    canvasRef.current = c;
    c.width = 320; c.height = 320;
    const ctx = c.getContext('2d');
    if (!failed && videoRef.current && ready) {
      // draw video centered/cropped
      const v = videoRef.current;
      const s = Math.min(v.videoWidth, v.videoHeight);
      const sx = (v.videoWidth - s) / 2, sy = (v.videoHeight - s) / 2;
      ctx.drawImage(v, sx, sy, s, s, 0, 0, 320, 320);
    } else {
      // fallback placeholder
      const grad = ctx.createLinearGradient(0, 0, 320, 320);
      grad.addColorStop(0, '#1E40AF'); grad.addColorStop(1, '#312E81');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 320, 320);
      // silhouette
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.arc(160, 130, 55, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(160, 260, 90, Math.PI, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Photo Placeholder', 160, 160);
    }
    // stamp
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 260, 320, 60);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = 'bold 11px monospace';
    ctx.fillText(`15 Jul 2026 · ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`, 10, 280);
    ctx.font = '10px monospace';
    ctx.fillText(`${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`, 10, 296);
    ctx.fillStyle = inside ? '#10B981' : '#F43F5E';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(inside ? '● INSIDE FENCE' : '● OUTSIDE FENCE', 10, 312);
    // SDC brand
    ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif';
    ctx.fillText('SDC Field HRMS', 310, 296);
    const data = c.toDataURL('image/jpeg', 0.75);
    onCapture(data);
  };

  return (
    <div className="absolute inset-0 z-30 bg-black flex flex-col anim-in">
      <div className="p-3 flex items-center justify-between text-white">
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20"><Icon name="x"/></button>
        <div className="text-[12px] font-semibold">Live photo · geo-stamped</div>
        <div className="w-8"/>
      </div>
      <div className="flex-1 flex items-center justify-center relative bg-slate-900">
        {!failed && (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }}/>
        )}
        {failed && (
          <div className="text-white text-center p-4">
            <div className="w-40 h-40 mx-auto rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center mb-3">
              <Icon name="camera" className="w-16 h-16 opacity-50"/>
            </div>
            <div className="text-[12px] opacity-80">Camera unavailable — a stamped placeholder will be used.</div>
          </div>
        )}
        {/* Corner brackets */}
        <div className="absolute inset-8 pointer-events-none">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white"/>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white"/>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white"/>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white"/>
        </div>
      </div>
      <div className="p-4 bg-black text-white">
        <div className="text-center text-[11px] opacity-70 mb-2 font-mono">
          15 Jul 2026 · 12:30:{String(new Date().getSeconds()).padStart(2,'0')} · {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
        </div>
        <div className="flex items-center justify-center">
          <button onClick={snap} className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white border-4 border-slate-950"/>
          </button>
        </div>
        <div className="text-center text-[10px] opacity-60 mt-2">Gallery upload disabled — live capture only</div>
      </div>
    </div>
  );
}

function HistoryPanel({ emp }) {
  const store = useStore();
  const allMarks = store.getAttendance({ employeeId: emp.id }).slice(-30).reverse();
  const byDate = {};
  allMarks.forEach((m) => { (byDate[m.date] = byDate[m.date] || []).push(m); });
  return (
    <div className="space-y-2">
      {Object.entries(byDate).map(([date, marks]) => (
        <div key={date} className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="text-[12px] font-bold text-slate-800 dark:text-white">{fmtDate(date, { year: true })}</div>
            <Badge tone={marks.some(m => !m.insideGeofence) ? 'amber' : 'green'}>{marks.length} marks</Badge>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {marks.map((m) => (
              <div key={m.id} className="px-3 py-2 flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${m.insideGeofence ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  <Icon name={m.type === 'clock-in' ? 'check' : m.type === 'clock-out' ? 'x' : 'target'} className="w-3 h-3"/>
                </div>
                <div className="flex-1 text-[12px] text-slate-700 dark:text-slate-200 capitalize">{m.type.replace('-', ' ')}</div>
                <div className="text-[11px] font-mono text-slate-500">{fmtTime(m.timestamp)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* Regularise, from the employee's side.

   The employee picks the day and then states the times the log should read —
   the same request an HR user raises from the desktop, so the queue is one
   shape and approving it rewrites the log either way. The day's actual state
   is loaded first, so a shift with a clock-in but no clock-out arrives with
   the in-time already filled and only the missing half to supply. */
function RegularisePanel({ emp }) {
  const store = useStore();
  const toast = useToast();
  const [date, setDate] = useState('2026-07-15');
  const [type, setType] = useState('adjust');
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const day = store.getDayLog(emp.id, date);
  const shift = day.shift;
  const balance = store.getRegularisationBalance(emp.id, date.slice(0, 7));

  const [entry, setEntry] = useState({ in: '', out: '' });
  // Changing the date reloads that day's real stamps into the form.
  useEffect(() => { setEntry({ in: day.inTime || '', out: day.outTime || '' }); }, [date, day.inTime, day.outTime]);

  const submit = (e) => {
    e.preventDefault();
    if (!reason.trim()) { toast('Please add a reason', 'warn'); return; }
    if (type === 'adjust' && !entry.in && !entry.out) { toast('Set at least one clock time', 'warn'); return; }
    const res = Store.addRegularisation({
      employeeId: emp.id, date, type,
      shift: { start: shift.start, end: shift.end, name: shift.name, location: shift.location },
      entries: type === 'adjust' ? [{ in: entry.in, out: entry.out, location: shift.location }] : [],
      reason: reason.trim(), details,
    });
    if (res && res.error) { toast(res.error, 'error'); return; }
    toast('Request submitted for HR approval', 'success');
    setReason(''); setDetails('');
  };

  const myRequests = [...store.getRegularisations({ employeeId: emp.id })].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const timeBox = (field, fallback) => (
    entry[field]
      ? <input type="time" value={entry[field]} onChange={(e) => setEntry((s) => ({ ...s, [field]: e.target.value }))}
          className="h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-[13px] font-mono dark:text-slate-100"/>
      : <button type="button" onClick={() => setEntry((s) => ({ ...s, [field]: fallback }))}
          className="h-9 px-3 rounded-lg bg-rose-500 text-white text-[11px] font-bold tracking-wide">MISSING</button>
  );

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 space-y-3">
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)}/></Field>

        {/* What the shift was, so the times below mean something */}
        <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/50">
          <span className="text-slate-500">{shift.name}</span>
          <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{fmtHHMM(shift.start)} – {fmtHHMM(shift.end)}</span>
        </div>

        <div className="space-y-1.5">
          {Store.REG_TYPES.map((t) => (
            <label key={t.id} className="flex items-start gap-2 cursor-pointer">
              <input type="radio" name="mregtype" checked={type === t.id} onChange={() => setType(t.id)} className="accent-brand-700 w-4 h-4 mt-0.5 shrink-0"/>
              <span className={`text-[11.5px] leading-snug ${type === t.id ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-500'}`}>{t.label}</span>
            </label>
          ))}
        </div>

        {type === 'adjust' && (
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Attendance adjustment</div>
            <div className="flex items-center gap-2 flex-wrap">
              <Icon name="sign-in" className="w-4 h-4 text-emerald-600 shrink-0"/>
              {timeBox('in', shift.start)}
              <Icon name="sign-out" className="w-4 h-4 text-rose-500 shrink-0"/>
              {timeBox('out', shift.end)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">{shift.location}</div>
          </div>
        )}

        <div className={`text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 ${
          balance.remaining <= 0 ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300' : 'bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300'}`}>
          <Icon name="info" className="w-3.5 h-3.5 shrink-0"/>
          Remaining balance: <span className="font-bold">{balance.remaining} of {balance.limit}</span> this month
        </div>

        <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Missed clock-out, network issue…"/></Field>
        <Field label="Note"><Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Enter note"/></Field>
        <Btn variant="primary" size="lg" className="w-full" disabled={balance.remaining <= 0}>
          {balance.remaining <= 0 ? 'No requests left this month' : 'Request'}
        </Btn>
      </form>

      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 text-[12px] font-bold text-slate-800 dark:text-white">Your requests</div>
        {myRequests.length === 0 && <div className="p-4 text-[11px] text-slate-500 text-center">No requests yet.</div>}
        {myRequests.map((r) => {
          const first = (r.entries || [])[0];
          return (
            <div key={r.id} className="p-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-semibold text-slate-800 dark:text-white">{fmtDate(r.date, { year: true })}</div>
                {r.status === 'pending' && <Badge tone="amber">Pending</Badge>}
                {r.status === 'approved' && <Badge tone="green">Approved</Badge>}
                {r.status === 'rejected' && <Badge tone="red">Rejected</Badge>}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{r.reason}</div>
              {first && (
                <div className="text-[10.5px] font-mono text-slate-400 mt-0.5">
                  {first.in ? fmtHHMM(first.in) : '—'} → {first.out ? fmtHHMM(first.out) : '—'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { MobileAttendance, ClockPanel, CameraCapture, MiniGeoMap, HistoryPanel, RegularisePanel });
