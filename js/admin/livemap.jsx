/* Live attendance map with real-time positions, geofence circles, trails */
function LiveMapPage({ user }) {
  const store = useStore();
  const ref = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [showTrails, setShowTrails] = useState(true);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const m = L.map(ref.current, { attributionControl: true }).setView([21.5, 78.5], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxZoom: 18, attribution: '&copy; OpenStreetMap &copy; CartoDB' }).addTo(m);
    mapRef.current = m;
    layerRef.current = L.layerGroup().addTo(m);
    setTimeout(() => m.invalidateSize(), 100);
  }, []);

  useEffect(() => {
    const m = mapRef.current, layer = layerRef.current;
    if (!m || !layer) return;
    layer.clearLayers();
    const isSiteMgr = user.role === 'site-manager';
    const positions = store.getLivePositions().filter((p) => !isSiteMgr || p.emp.siteId === user.siteId);
    const sites = store.getSites().filter((s) => !isSiteMgr || s.id === user.siteId);
    const bounds = [];

    sites.forEach((s) => {
      L.circle([s.lat, s.lng], { radius: s.radius, color: '#1E40AF', weight: 1.5, fillColor: '#1E40AF', fillOpacity: 0.08, dashArray: '4,4' }).addTo(layer);
      const siteIcon = L.divIcon({ className: '', html: `<div style="background:#1E40AF;color:white;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2)">📍 ${s.city}</div>`, iconSize: null });
      L.marker([s.lat, s.lng], { icon: siteIcon }).addTo(layer);
      bounds.push([s.lat, s.lng]);
    });

    positions.forEach(({ emp, site, lat, lng, inside }) => {
      const color = inside ? '#059669' : '#e11d48';
      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative"><div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25)"></div>${!inside ? '<div style="position:absolute;top:-3px;left:-3px;width:24px;height:24px;border-radius:50%;border:2px solid '+color+';animation:pulse-dot 1.4s ease-out infinite"></div>' : ''}</div>`,
        iconSize: [18, 18], iconAnchor: [9, 9],
      });
      const marker = L.marker([lat, lng], { icon }).addTo(layer);
      const dist = Math.round(Store.haversine(lat, lng, site.lat, site.lng));
      marker.bindPopup(`
        <div style="min-width:180px;font-family:inherit">
          <div style="font-weight:700;font-size:13px;color:#0F172A">${emp.name}</div>
          <div style="font-size:11px;color:#64748B">${emp.code} · ${site.name}</div>
          <div style="margin-top:6px;padding:6px;background:${inside ? '#ECFDF5' : '#FEF2F2'};border-radius:4px;font-size:11px;color:${inside ? '#065F46' : '#991B1B'};font-weight:600">
            ${inside ? '✓ Inside geo-fence' : '✕ Outside — ' + dist + 'm from site'}
          </div>
          <div style="margin-top:4px;font-size:10px;color:#94A3B8;font-family:monospace">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
        </div>
      `);
      marker.on('click', () => setSelectedEmp(emp));
      bounds.push([lat, lng]);

      if (showTrails) {
        const marks = store.getAttendance({ employeeId: emp.id, date: '2026-07-15' });
        if (marks.length > 1) {
          const line = marks.map((mk) => [mk.latitude, mk.longitude]);
          L.polyline(line, { color: color, weight: 2, opacity: 0.5, dashArray: '4,3' }).addTo(layer);
        }
      }
    });

    if (bounds.length) m.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [store.state, showTrails, user]);

  const positions = store.getLivePositions().filter((p) => user.role !== 'site-manager' || p.emp.siteId === user.siteId);
  const alerts = positions.filter((p) => !p.inside);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Field Operations</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">Live attendance map</div>
          <div className="text-[12px] text-slate-500 mt-0.5">All active field employees · updated in real time</div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-300 font-semibold">
            <input type="checkbox" checked={showTrails} onChange={(e) => setShowTrails(e.target.checked)} className="accent-brand-700"/>Show trails
          </label>
          <Badge tone={alerts.length > 0 ? 'red' : 'green'}><span className="w-1.5 h-1.5 rounded-full bg-current pulse-dot"/>{alerts.length > 0 ? `${alerts.length} out of fence` : 'All within fence'}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8">
          <Card noBody className="overflow-hidden">
            <div ref={ref} style={{ height: 560 }}/>
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-4 space-y-3">
          <Card title={`Field staff (${positions.length})`} bodyClass="p-0" className="max-h-[560px] overflow-hidden">
            <div className="overflow-y-auto max-h-[520px]">
              {positions.map(({ emp, site, lat, lng, inside }) => {
                const dist = Math.round(Store.haversine(lat, lng, site.lat, site.lng));
                return (
                  <button key={emp.id} onClick={() => { setSelectedEmp(emp); mapRef.current.setView([lat, lng], 15); }}
                    className={`w-full text-left p-3 flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selectedEmp?.id === emp.id ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}>
                    <Avatar emp={emp} size={32}/>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">{emp.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{lat.toFixed(4)}, {lng.toFixed(4)}</div>
                    </div>
                    <div className="text-right">
                      <Badge tone={inside ? 'green' : 'red'}>{inside ? 'IN' : 'OUT'}</Badge>
                      <div className="text-[10px] text-slate-500 mt-0.5">{dist}m</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {selectedEmp && <LocationHistoryPanel emp={selectedEmp} onClose={() => setSelectedEmp(null)}/>}
    </div>
  );
}

function LocationHistoryPanel({ emp, onClose }) {
  const store = useStore();
  const today = '2026-07-15';
  const marks = store.getAttendance({ employeeId: emp.id, date: today });
  const site = store.getSite(emp.siteId);

  const ref = useRef(null);
  const mapRef = useRef(null);
  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const m = L.map(ref.current, { zoomControl: false, attributionControl: false }).setView([site.lat, site.lng], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd' }).addTo(m);
    L.circle([site.lat, site.lng], { radius: site.radius, color: '#1E40AF', weight: 1, fillOpacity: 0.08 }).addTo(m);
    marks.forEach((mk, i) => {
      L.circleMarker([mk.latitude, mk.longitude], { radius: 5, color: mk.insideGeofence ? '#059669' : '#e11d48', fillColor: mk.insideGeofence ? '#059669' : '#e11d48', fillOpacity: 0.8, weight: 2 }).bindTooltip(`${mk.type} · ${fmtTime(mk.timestamp)}`).addTo(m);
    });
    if (marks.length > 1) L.polyline(marks.map((m) => [m.latitude, m.longitude]), { color: '#1E40AF', weight: 2, dashArray: '4,3' }).addTo(m);
    mapRef.current = m;
    setTimeout(() => m.invalidateSize(), 100);
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex anim-in">
      <div className="flex-1 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="w-[560px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full overflow-y-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <Avatar emp={emp} size={40}/>
            <div>
              <div className="font-bold text-slate-900 dark:text-white">{emp.name}</div>
              <div className="text-[11px] text-slate-500">Location history · 15 Jul 2026</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><Icon name="x"/></button>
        </div>
        <div ref={ref} style={{ height: 280 }} className="border-b border-slate-200 dark:border-slate-800"/>
        <div className="p-3">
          <div className="text-[11px] uppercase font-bold tracking-wide text-slate-500 mb-2">Timeline</div>
          <div className="space-y-1.5">
            {marks.map((mk) => (
              <div key={mk.id} className="flex items-center gap-3 p-2 rounded bg-slate-50 dark:bg-slate-800/50">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center ${mk.insideGeofence ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'}`}>
                  <Icon name={mk.type === 'clock-in' ? 'check' : mk.type === 'clock-out' ? 'x' : 'target'} className="w-4 h-4"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 capitalize">{mk.type.replace('-', ' ')}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{mk.latitude.toFixed(5)}, {mk.longitude.toFixed(5)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-mono font-semibold text-slate-700 dark:text-slate-200">{fmtTime(mk.timestamp)}</div>
                  {!mk.insideGeofence && <Badge tone="red">Out</Badge>}
                </div>
              </div>
            ))}
            {marks.length === 0 && <Empty title="No marks recorded today"/>}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LiveMapPage, LocationHistoryPanel });
