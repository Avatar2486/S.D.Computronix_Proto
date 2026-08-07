/* Client-location (site) management with map picker */
function SitesPage({ user }) {
  const store = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState(null);

  const save = () => {
    Store.upsertSite(editing);
    toast('Site saved', 'success');
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Deployments</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">Client sites & geo-fences</div>
          <div className="text-[12px] text-slate-500 mt-0.5">Manage Croma stores, service centres, and their geo-fence radius.</div>
        </div>
        <Btn variant="primary" onClick={() => setEditing({ id: null, name: '', type: 'store', lat: 19.108, lng: 72.826, radius: 150, shiftStart: '10:00', shiftEnd: '19:00', city: '' })}><Icon name="plus" className="w-3.5 h-3.5"/>Add site</Btn>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {store.getSites().map((s) => {
          const count = store.getEmployees({ siteId: s.id, status: 'active' }).length;
          return (
            <Card key={s.id} bodyClass="p-0" className="overflow-hidden">
              <div className="h-32 bg-gradient-to-br from-brand-700 to-brand-900 relative flex items-end p-3">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white blur-2xl"/>
                </div>
                <div className="relative text-white">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-brand-100">{s.type === 'store' ? 'Retail store' : 'Service centre'}</div>
                  <div className="font-bold text-lg leading-tight">{s.name}</div>
                </div>
                <div className="absolute top-3 right-3 flex gap-1">
                  <button onClick={() => setEditing(s)} className="w-7 h-7 rounded bg-white/20 hover:bg-white/30 flex items-center justify-center text-white backdrop-blur"><Icon name="edit" className="w-3.5 h-3.5"/></button>
                  <button onClick={() => { if (confirm('Delete site?')) { Store.deleteSite(s.id); toast('Site removed', 'warn'); } }} className="w-7 h-7 rounded bg-white/20 hover:bg-rose-500 flex items-center justify-center text-white backdrop-blur"><Icon name="trash" className="w-3.5 h-3.5"/></button>
                </div>
              </div>
              <div className="p-3 space-y-2 text-[12px]">
                <div className="flex justify-between"><span className="text-slate-500">Coordinates</span><span className="font-mono">{s.lat.toFixed(3)}, {s.lng.toFixed(3)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Geo-fence radius</span><span className="font-mono font-semibold">{s.radius}m</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Shift</span><span className="font-mono">{s.shiftStart} – {s.shiftEnd}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Active staff</span><Badge tone="brand">{count}</Badge></div>
              </div>
            </Card>
          );
        })}
      </div>

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? 'Edit site' : 'New client site'} wide
          footer={<><Btn onClick={() => setEditing(null)}>Cancel</Btn><Btn variant="primary" onClick={save}>Save site</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Site name" className="col-span-2"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Croma – Andheri West, Mumbai"/></Field>
            <Field label="City"><Input value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })}/></Field>
            <Field label="Type"><Select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}><option value="store">Retail store</option><option value="service-centre">Service centre</option></Select></Field>
            <Field label="Latitude"><Input type="number" step="0.0001" value={editing.lat} onChange={(e) => setEditing({ ...editing, lat: +e.target.value })}/></Field>
            <Field label="Longitude"><Input type="number" step="0.0001" value={editing.lng} onChange={(e) => setEditing({ ...editing, lng: +e.target.value })}/></Field>
            <Field label="Geo-fence radius (m)" className="col-span-2">
              <Input type="range" min="50" max="500" value={editing.radius} onChange={(e) => setEditing({ ...editing, radius: +e.target.value })} className="!h-6"/>
              <div className="text-[12px] font-mono font-semibold text-brand-700 mt-1">{editing.radius}m</div>
            </Field>
            <Field label="Shift start"><Input type="time" value={editing.shiftStart} onChange={(e) => setEditing({ ...editing, shiftStart: e.target.value })}/></Field>
            <Field label="Shift end"><Input type="time" value={editing.shiftEnd} onChange={(e) => setEditing({ ...editing, shiftEnd: e.target.value })}/></Field>
          </div>
          <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <SiteMapPicker lat={editing.lat} lng={editing.lng} radius={editing.radius} onChange={(lat, lng) => setEditing({ ...editing, lat, lng })}/>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SiteMapPicker({ lat, lng, radius, onChange }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const m = L.map(ref.current).setView([lat, lng], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd' }).addTo(m);
    const marker = L.marker([lat, lng], { draggable: true }).addTo(m);
    const circle = L.circle([lat, lng], { radius, color: '#1E40AF', fillOpacity: 0.1 }).addTo(m);
    marker.on('drag', (e) => { const p = e.target.getLatLng(); circle.setLatLng(p); onChange(p.lat, p.lng); });
    m.on('click', (e) => { marker.setLatLng(e.latlng); circle.setLatLng(e.latlng); onChange(e.latlng.lat, e.latlng.lng); });
    mapRef.current = m; markerRef.current = marker; circleRef.current = circle;
    setTimeout(() => m.invalidateSize(), 100);
  }, []);
  useEffect(() => {
    if (circleRef.current) circleRef.current.setRadius(radius);
  }, [radius]);
  useEffect(() => {
    if (markerRef.current) { markerRef.current.setLatLng([lat, lng]); circleRef.current.setLatLng([lat, lng]); mapRef.current.setView([lat, lng]); }
  }, [lat, lng]);
  return <div ref={ref} style={{ height: 260 }}/>;
}

Object.assign(window, { SitesPage });
