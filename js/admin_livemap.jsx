/* Live attendance map with real-time positions, geofence circles, trails.

   The map is created through `useLeafletMap`, which re-measures the container
   once layout has settled and again whenever it resizes. Creating a Leaflet map
   inside the page wrapper while its entry animation is still running used to
   leave the tile grid laid out against a stale box, so the panel rendered
   nothing at all — that is what the shared hook exists to prevent. */
const LIVEMAP_FILTERS = [
  { id: 'onshift',  label: 'On shift' },
  { id: 'outside',  label: 'Outside geo-fence' },
  { id: 'stale',    label: 'Stale' },
  { id: 'offshift', label: 'Clocked out' },
  { id: 'all',      label: 'All' },
];

function LiveMapPage({ user, navArg }) {
  const store = useStore();
  const ref = useRef(null);
  const layerRef = useRef(null);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [showTrails, setShowTrails] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('onshift');
  const available = hasLeaflet();

  const mapRef = useLeafletMap(ref, (el) => {
    const m = L.map(el, { attributionControl: true }).setView([21.5, 78.5], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxZoom: 18, attribution: '&copy; OpenStreetMap &copy; CartoDB' }).addTo(m);
    layerRef.current = L.layerGroup().addTo(m);
    return m;
  }, []);

  const isSiteMgr = roleOf(user) === 'site-manager';
  /* Fetch both on-shift and off-shift ("last known") so the filter chips and
     their counts are consistent — a clock-out removes someone from the
     default (on-shift) view, but "Clocked out" still needs their last
     position to show. */
  const all = store.getLivePositions({ includeOffShift: true }).filter((p) => !isSiteMgr || p.emp.siteId === user.siteId);
  const onShift = all.filter((p) => p.onShift);
  const outside = onShift.filter((p) => !p.inside);
  const stale = onShift.filter((p) => p.stale);
  const offShift = all.filter((p) => !p.onShift);
  const positions = filter === 'onshift' ? onShift : filter === 'outside' ? outside : filter === 'stale' ? stale : filter === 'offshift' ? offShift : all;

  const listed = q
    ? positions.filter(({ emp, site }) => `${emp.name} ${emp.code} ${site.name} ${site.code} ${site.city}`.toLowerCase().includes(q.toLowerCase()))
    : positions;

  useEffect(() => {
    const m = mapRef.current, layer = layerRef.current;
    if (!m || !layer) return;
    layer.clearLayers();
    const sites = store.getSites().filter((s) => !isSiteMgr || s.id === user.siteId);
    const bounds = [];

    /* Only draw the stores that have somebody standing in them. Rendering all
       562 geo-fences turned the national view into a solid blue sheet and cost
       a second of layout on every refresh. */
    const activeSiteIds = new Set(positions.map((p) => p.site.id));
    sites.filter((s) => activeSiteIds.has(s.id)).forEach((s) => {
      L.circle([s.lat, s.lng], { radius: s.radius, color: '#1E40AF', weight: 1.5, fillColor: '#1E40AF', fillOpacity: 0.08, dashArray: '4,4' }).addTo(layer);
      const siteIcon = L.divIcon({ className: '', html: `<div style="background:#1E40AF;color:white;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2)">📍 ${s.name} (${s.code})</div>`, iconSize: null });
      L.marker([s.lat, s.lng], { icon: siteIcon }).addTo(layer);
      bounds.push([s.lat, s.lng]);
    });

    positions.forEach(({ emp, site, lat, lng, inside, onShift: pOnShift, stale: pStale, freshnessMinutes, distance }) => {
      // Off-shift is always grey (last known, not live); on-shift is green
      // inside the fence, amber if stale, red if outside — colour-safe (shape
      // + label carry the same meaning, not colour alone: the popup and list
      // row always spell out the state in text too).
      const color = !pOnShift ? '#64748B' : !inside ? '#e11d48' : pStale ? '#D97706' : '#059669';
      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative"><div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);opacity:${pOnShift ? 1 : 0.6}"></div>${(pOnShift && !inside) ? '<div style="position:absolute;top:-3px;left:-3px;width:24px;height:24px;border-radius:50%;border:2px solid '+color+';animation:pulse-dot 1.4s ease-out infinite"></div>' : ''}</div>`,
        iconSize: [18, 18], iconAnchor: [9, 9],
      });
      const marker = L.marker([lat, lng], { icon }).addTo(layer);
      const stateLine = !pOnShift ? `Clocked out · last seen ${freshnessMinutes}m ago`
        : !inside ? `✕ Outside — ${distance}m from site (limit ${site.radius}m)`
        : pStale ? `⚠ Stale — no update for ${freshnessMinutes}m` : '✓ Inside geo-fence';
      const stateBg = !pOnShift ? '#F1F5F9' : !inside ? '#FEF2F2' : pStale ? '#FFFBEB' : '#ECFDF5';
      const stateColor = !pOnShift ? '#475569' : !inside ? '#991B1B' : pStale ? '#92400E' : '#065F46';
      marker.bindPopup(`
        <div style="min-width:190px;font-family:inherit">
          <div style="font-weight:700;font-size:13px;color:#0F172A">${emp.name}</div>
          <div style="font-size:11px;color:#64748B">${emp.code} · ${site.name} (${site.code})</div>
          <div style="margin-top:6px;padding:6px;background:${stateBg};border-radius:4px;font-size:11px;color:${stateColor};font-weight:600">${stateLine}</div>
          <div style="margin-top:4px;font-size:10px;color:#94A3B8;font-family:monospace">${lat.toFixed(5)}, ${lng.toFixed(5)} · updated ${freshnessMinutes}m ago</div>
          <div style="margin-top:2px;font-size:9.5px;color:#CBD5E1;font-style:italic">Simulated location — demo GPS data</div>
        </div>
      `);
      marker.on('click', () => setSelectedEmp(emp));
      bounds.push([lat, lng]);

      if (showTrails) {
        const marks = store.getAttendance({ employeeId: emp.id, date: dateKeyOf(Store.TODAY) });
        if (marks.length > 1) {
          const line = marks.map((mk) => [mk.latitude, mk.longitude]);
          L.polyline(line, { color: color, weight: 2, opacity: 0.5, dashArray: '4,3' }).addTo(layer);
        }
      }
    });

    if (bounds.length) m.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [store.state, showTrails, user, mapRef.current, filter]);

  /* Arriving from a dashboard geo-fence alert: centre on that person straight
     away, so "Live Map" answers the question the alert asked. */
  useEffect(() => {
    if (!navArg || !navArg.focusEmpId) return;
    const hit = all.find((p) => p.emp.id === navArg.focusEmpId);
    if (!hit) return;
    setSelectedEmp(hit.emp);
    const m = mapRef.current;
    if (m) setTimeout(() => { try { m.invalidateSize(); m.setView([hit.lat, hit.lng], 15); } catch (e) {} }, 300);
  }, [navArg && navArg._n, mapRef.current]);

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Field Operations" title="Live attendance map"
        subtitle="On-shift field employees only, by default — clock-out removes a person from live tracking.">
        <label className="flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-300 font-semibold">
          <input type="checkbox" checked={showTrails} onChange={(e) => setShowTrails(e.target.checked)} className="accent-brand-700"/>Show trails
        </label>
        <Badge tone="violet"><Icon name="info" className="w-3 h-3"/>Simulated location</Badge>
        <Badge tone={outside.length > 0 ? 'red' : 'green'}><span className="w-1.5 h-1.5 rounded-full bg-current pulse-dot"/>{outside.length > 0 ? `${outside.length} out of fence` : 'All within fence'}</Badge>
      </PageHeader>

      {/* Filter chips — counts always visible so switching views is never a guess */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {LIVEMAP_FILTERS.map((f) => {
          const count = f.id === 'onshift' ? onShift.length : f.id === 'outside' ? outside.length : f.id === 'stale' ? stale.length : f.id === 'offshift' ? offShift.length : all.length;
          return (
            <button key={f.id} type="button" onClick={() => setFilter(f.id)}
              className={`h-8 px-3 rounded-full text-[12px] font-semibold border transition ${
                filter === f.id ? 'bg-brand-700 border-brand-700 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              {f.label} <span className={filter === f.id ? 'opacity-80' : 'text-slate-400'}>· {count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 space-y-3">
          <Card noBody className="overflow-hidden">
            {available
              ? <div ref={ref} style={{ height: 560 }}/>
              : <MapUnavailable height={560}/>}
          </Card>
          {/* Legend — colour is never the only signal (the popup/list row also
             spell out the state), but this is the map's own key. */}
          <Card bodyClass="p-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px] text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide">Legend</span>
              {[
                ['#059669', 'On shift · inside geo-fence'],
                ['#D97706', 'On shift · stale (no update recently)'],
                ['#e11d48', 'On shift · outside geo-fence'],
                ['#64748B', 'Clocked out · last known position'],
              ].map(([c, l]) => (
                <span key={l} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: c }}/>{l}</span>
              ))}
            </div>
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-4 space-y-3">
          <Card title={`${LIVEMAP_FILTERS.find((f) => f.id === filter)?.label} (${listed.length})`} bodyClass="p-0" className="max-h-[560px] overflow-hidden"
            right={
              <div className="flex items-center gap-1.5 h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <Icon name="search" className="w-3.5 h-3.5 text-slate-400"/>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find…"
                  className="bg-transparent text-[12px] outline-none w-20 sm:w-24 dark:text-slate-100"/>
              </div>
            }>
            {/* This list is the accessible alternative to the map — every row is a
               real button, keyboard-reachable, stating the same status in text. */}
            <div className="overflow-y-auto max-h-[500px]" role="list" aria-label="Field staff positions">
              {listed.length === 0 && <Empty icon="pin" title="Nobody matches this view" hint={q ? 'No one matches that search.' : filter === 'onshift' ? 'No one is currently on shift.' : 'Try a different filter.'}/>}
              {listed.map(({ emp, site, lat, lng, inside, onShift: pOnShift, stale: pStale, freshnessMinutes, distance }) => (
                <button key={emp.id} role="listitem" onClick={() => { setSelectedEmp(emp); if (mapRef.current) mapRef.current.setView([lat, lng], 15); }}
                  className={`w-full text-left p-3 flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selectedEmp?.id === emp.id ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}>
                  <Avatar emp={emp} size={32}/>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">{emp.name} <span className="font-mono font-normal text-slate-400">({emp.code})</span></div>
                    <div className="text-[10px] text-slate-500 truncate">{site.name} ({site.code}) · updated {freshnessMinutes}m ago</div>
                  </div>
                  <div className="text-right shrink-0">
                    {!pOnShift ? <Badge tone="slate">OUT · Clocked out</Badge>
                      : pStale ? <Badge tone="amber">Stale</Badge>
                      : <Badge tone={inside ? 'green' : 'red'}>{inside ? 'IN' : 'OUT'}</Badge>}
                    <div className="text-[10px] text-slate-500 mt-0.5">{pOnShift && !inside ? `${distance}m / ${site.radius}m` : ''}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
          <div className="text-[10.5px] text-slate-400 leading-relaxed px-1">
            Location access is scoped to your role and shown only while a person is on an active shift. Retention and
            audit-log policy for location data is a placeholder pending real business direction.
          </div>
        </div>
      </div>

      {selectedEmp && <LocationHistoryPanel emp={selectedEmp} onClose={() => setSelectedEmp(null)}/>}
    </div>
  );
}
const dateKeyOf = (d) => new Date(d).toISOString().slice(0, 10);

/* Location history — a centred dialog like every other detail view in the app,
   rather than the side drawer this used to be. */
function LocationHistoryPanel({ emp, onClose }) {
  const store = useStore();
  const today = dateKeyOf(Store.TODAY);
  const marks = store.getAttendance({ employeeId: emp.id, date: today });
  const site = store.getSite(emp.siteId);
  const ref = useRef(null);
  const available = hasLeaflet() && !!site;

  useLeafletMap(ref, (el) => {
    if (!site) return null;
    const m = L.map(el, { zoomControl: false, attributionControl: false }).setView([site.lat, site.lng], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd' }).addTo(m);
    L.circle([site.lat, site.lng], { radius: site.radius, color: '#1E40AF', weight: 1, fillOpacity: 0.08 }).addTo(m);
    marks.forEach((mk) => {
      L.circleMarker([mk.latitude, mk.longitude], { radius: 5, color: mk.insideGeofence ? '#059669' : '#e11d48', fillColor: mk.insideGeofence ? '#059669' : '#e11d48', fillOpacity: 0.8, weight: 2 })
        .bindTooltip(`${mk.type} · ${fmtTime(mk.timestamp)}`).addTo(m);
    });
    if (marks.length > 1) L.polyline(marks.map((mk) => [mk.latitude, mk.longitude]), { color: '#1E40AF', weight: 2, dashArray: '4,3' }).addTo(m);
    return m;
  }, [emp.id]);

  return (
    <Modal open onClose={onClose} size="lg" bodyClass="p-0" icon="map"
      title={emp.name} subtitle={`Location history · ${site ? `${site.name} (${site.code})` : 'No store assigned'} · ${fmtDate(today, { year: true })} · Simulated`}
      footer={<Btn variant="primary" onClick={onClose}>Close</Btn>}>
      {available
        ? <div ref={ref} style={{ height: 280 }} className="border-b border-slate-200 dark:border-slate-800"/>
        : <div className="p-3 border-b border-slate-200 dark:border-slate-800"><MapUnavailable height={200}/></div>}
      <div className="p-3">
        <div className="text-[11px] uppercase font-bold tracking-wide text-slate-500 mb-2">Timeline</div>
        <div className="space-y-1.5">
          {marks.map((mk) => (
            <div key={mk.id} className="flex items-center gap-3 p-2 rounded bg-slate-50 dark:bg-slate-800/50">
              <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${mk.insideGeofence ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'}`}>
                <Icon name={mk.type === 'clock-in' ? 'sign-in' : 'sign-out'} className="w-4 h-4"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 capitalize">{mk.type.replace('-', ' ')}</div>
                <div className="text-[10px] text-slate-500 font-mono">{mk.latitude.toFixed(5)}, {mk.longitude.toFixed(5)}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[12px] font-mono font-semibold text-slate-700 dark:text-slate-200">{fmtTime(mk.timestamp)}</div>
                {!mk.insideGeofence && <Badge tone="red">Out</Badge>}
              </div>
            </div>
          ))}
          {marks.length === 0 && <Empty title="No marks recorded today"/>}
        </div>
      </div>
    </Modal>
  );
}

Object.assign(window, { LiveMapPage, LocationHistoryPanel });
