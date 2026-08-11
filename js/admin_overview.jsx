/* Admin overview: KPIs, mini live map, charts, activity */
function MiniLiveMap({ height = 240 }) {
  const store = useStore();
  const ref = useRef(null);
  const layerRef = useRef(null);
  if (!hasLeaflet()) return <MapUnavailable height={height}/>;

  const mapRef = useLeafletMap(ref, (el) => {
    const m = L.map(el, { zoomControl: false, attributionControl: false, dragging: true, scrollWheelZoom: false }).setView([21.5, 78.5], 4);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxZoom: 18 }).addTo(m);
    // Overlays live in their own group: clearing a group is safe, whereas
    // removing layers while iterating the map's own layer table skips entries
    // and leaves stale markers behind.
    layerRef.current = L.layerGroup().addTo(m);
    return m;
  }, []);

  useEffect(() => {
    const m = mapRef.current, layer = layerRef.current;
    if (!m || !layer) return;
    layer.clearLayers();
    const positions = store.getLivePositions();
    const bounds = [];
    const shown = new Set();
    positions.forEach(({ emp, site, lat, lng, inside }) => {
      const color = inside ? '#059669' : '#e11d48';
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 0 2px ${color}55"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7],
      });
      L.marker([lat, lng], { icon }).bindTooltip(`${emp.name} · ${site.city}`, { direction: 'top' }).addTo(layer);
      bounds.push([lat, lng]);
      if (!shown.has(site.id)) {
        shown.add(site.id);
        L.circle([site.lat, site.lng], { radius: site.radius, color: '#1E40AF', weight: 1, fillColor: '#1E40AF', fillOpacity: 0.06 }).addTo(layer);
      }
    });
    if (bounds.length) m.fitBounds(bounds, { padding: [20, 20] });
  }, [store.state, mapRef.current]);

  return <div ref={ref} className="leaflet-tiny rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800" style={{ height }}/>;
}

function BarChart({ data, height = 160, valueFmt = (v) => v, color = '#1E40AF' }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = 100 / data.length;
  return (
    <div className="relative" style={{ height }}>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full h-full">
        {[0.25, 0.5, 0.75].map((p) => (
          <line key={p} x1="0" x2="100" y1={height * (1 - p)} y2={height * (1 - p)} stroke="currentColor" strokeWidth="0.15" className="text-slate-300 dark:text-slate-700"/>
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 24);
          return (
            <g key={i} transform={`translate(${i * barW + barW * 0.15},0)`}>
              <rect x="0" y={height - h - 14} width={barW * 0.7} height={h} fill={color} rx="0.6" opacity="0.85"/>
              <text x={barW * 0.35} y={height - 3} textAnchor="middle" fontSize="3" fill="currentColor" className="text-slate-500 dark:text-slate-400 font-semibold">{d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DonutChart({ data, size = 140, thickness = 22 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={thickness} className="text-slate-100 dark:text-slate-800"/>
        {data.map((d, i) => {
          const len = (d.value / total) * c;
          const el = <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={d.color} strokeWidth={thickness} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}/>;
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{total}</div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Total</div>
      </div>
    </div>
  );
}

/* ---- Priority alerts ----
   Anything an admin has to decide about, ranked by urgency and rendered first on
   the page. Each row links straight to the screen that resolves it. */
function PriorityAlerts({ user, onNavigate, isSiteMgr }) {
  const store = useStore();
  const breaches = store.getLivePositions().filter((p) => !p.inside && (!isSiteMgr || p.emp.siteId === user.siteId));
  const pendingApprovals = store.getEmployees({ status: 'pending' });
  const pendingReg = store.getRegularisations({ status: 'pending' });
  const missingDocs = store.getEmployees({ status: 'pending' })
    .filter((e) => !store.getLifecycle(e).docsDone);

  const alerts = [];
  breaches.forEach((p) => alerts.push({
    id: 'fence_' + p.emp.id, tone: 'red', icon: 'alert', badge: 'Live',
    title: `Geo-fence breach · ${p.emp.name}`,
    detail: `${Math.round(store.checkGeofence(p.emp.id, p.lat, p.lng).distance)}m from ${p.site.city} store`,
    go: 'livemap', goLabel: 'Live Map', arg: { focusEmpId: p.emp.id },
  }));
  if (pendingApprovals.length) alerts.push({
    id: 'approvals', tone: 'brand', icon: 'shield', badge: String(pendingApprovals.length),
    title: 'Employees awaiting approval',
    detail: `${pendingApprovals.length} application${pendingApprovals.length > 1 ? 's' : ''} in the onboarding queue`,
    go: 'employees', goLabel: 'Review', arg: { tab: 'onboarding' },
  });
  if (missingDocs.length) alerts.push({
    id: 'docs', tone: 'amber', icon: 'file', badge: String(missingDocs.length),
    title: 'Incomplete document sets',
    detail: `${missingDocs.length} applicant${missingDocs.length > 1 ? 's are' : ' is'} missing a required proof`,
    go: 'employees', goLabel: 'Open', arg: { tab: 'onboarding' },
  });
  if (pendingReg.length) alerts.push({
    id: 'regs', tone: 'amber', icon: 'calendar', badge: String(pendingReg.length),
    title: 'Regularisation requests',
    detail: `${pendingReg.length} attendance correction${pendingReg.length > 1 ? 's' : ''} awaiting your decision`,
    // Decide lands on the Regularization tab itself, not the Attendance overview.
    go: 'attendance', goLabel: 'Decide', arg: { tab: 'regularization' },
  });

  const toneBox = {
    red:   'bg-rose-100 dark:bg-rose-900/30 text-rose-600',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700',
    brand: 'bg-brand-100 dark:bg-brand-900/30 text-brand-700',
  };

  return (
    <Card noBody className={alerts.length ? 'border-l-4 border-l-amber-400 dark:border-l-amber-500' : ''}>
      <div className="px-4 h-11 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="alert" className={`w-4 h-4 ${alerts.length ? 'text-amber-500' : 'text-emerald-500'}`}/>
          <div className="font-semibold text-[13px] text-slate-800 dark:text-slate-100">Priority alerts</div>
        </div>
        <Badge tone={alerts.length ? 'amber' : 'green'}>
          {alerts.length ? `${alerts.length} need${alerts.length === 1 ? 's' : ''} attention` : 'All clear'}
        </Badge>
      </div>
      {alerts.length === 0 ? (
        <Empty icon="check-circle" title="Nothing needs your attention" hint="No breaches, approvals or corrections are pending."/>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 divide-y md:divide-y-0 divide-slate-100 dark:divide-slate-800">
          {alerts.map((a) => (
            <div key={a.id} className="p-3 flex items-center gap-3 md:border-r md:border-b border-slate-100 dark:border-slate-800">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${toneBox[a.tone]}`}>
                <Icon name={a.icon} className="w-4 h-4"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">{a.title}</div>
                <div className="text-[11px] text-slate-500 truncate">{a.detail}</div>
              </div>
              {onNavigate
                ? <Btn size="xs" onClick={() => onNavigate(a.go, a.arg)}>{a.goLabel}<Icon name="chevron-right" className="w-3 h-3"/></Btn>
                : <Badge tone={a.tone}>{a.badge}</Badge>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function OverviewPage({ user, onNavigate }) {
  const store = useStore();
  const isSiteMgr = user.role === 'site-manager';
  const emps = store.getEmployees({ status: 'active' }).filter((e) => !isSiteMgr || e.siteId === user.siteId);
  const presentToday = emps.filter((e) => store.isPresentToday(e)).length;
  const absentToday = emps.length - presentToday;
  const outFence = store.getLivePositions().filter((p) => !p.inside && (!isSiteMgr || p.emp.siteId === user.siteId)).length;

  const july = '2026-07';
  // Payroll/incentive figures use the last completed month (June) so deductions
  // reflect real full-month attendance, not partial in-progress July days.
  const payMonth = '2026-06';
  const showMoney = canSeeMoney(user);
  /* A payroll run over the whole roster is the most expensive thing on this
     page, so it is not computed for a role that is not allowed to see it. */
  const payslips = useMemo(
    () => (showMoney ? emps.map((e) => store.computePayslip(e.id, payMonth)) : []),
    [store.state, emps.length, showMoney]
  );
  const payrollCost = payslips.reduce((s, p) => s + p.netPay, 0);
  const incentiveTotal = payslips.reduce((s, p) => s + p.incentive, 0);

  // Zone distribution donut (real hierarchy)
  const sites = store.getSites();
  const hierarchy = store.getHierarchy();
  const zoneColors = ['#1E40AF', '#7C3AED', '#059669', '#EA580C', '#0EA5E9'];
  const zoneStaff = {};
  emps.forEach((e) => { const z = store.getSite(e.siteId)?.zone || 'Other'; zoneStaff[z] = (zoneStaff[z] || 0) + 1; });
  const donut = (hierarchy.zones || []).map((z, i) => ({ label: z, value: zoneStaff[z] || 0, color: zoneColors[i % zoneColors.length] }));

  return (
    <div className="space-y-4">
      <DevModeBanner scope="admin"/>

      <PageHeader eyebrow="Command Center" title={`Good morning, ${user.name.split(' ')[0]}`}
        subtitle="Here's what's happening across your field operations right now.">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot"/>
          <span className="font-semibold">{presentToday}</span> active members
        </div>
      </PageHeader>

      {/* Priority alerts lead the page — decisions before dashboards. */}
      <PriorityAlerts user={user} onNavigate={onNavigate} isSiteMgr={isSiteMgr}/>

      {/* KPI row — the two payout tiles are earnings, so they are only shown
          to roles that are allowed to see money at all. */}
      <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 ${showMoney ? 'lg:grid-cols-6' : 'lg:grid-cols-4'}`}>
        <StatCard label="Total field staff" value={emps.length} sub={`${sites.length} stores · ${(hierarchy.zones||[]).length} zones`} icon="users" tone="brand"/>
        <StatCard label="Present today" value={presentToday} sub={`${pctOf(presentToday, emps.length)}% attendance`} icon="check-circle" tone="green"/>
        <StatCard label="Absent today" value={absentToday} sub={absentToday > 0 ? 'Regularisable' : 'None'} icon="calendar" tone="amber"/>
        <StatCard label="Out of geo-fence" value={outFence} sub={outFence > 0 ? 'Alert raised' : 'All within fence'} icon="alert" tone={outFence > 0 ? 'red' : 'slate'}/>
        {showMoney && <StatCard label="Payroll (Jun)" value={fmtINR(payrollCost)} sub="Last processed net payout" icon="wallet" tone="brand"/>}
        {showMoney && <StatCard label="Incentives (Jun)" value={fmtINR(incentiveTotal)} sub="Higher of target or slab" icon="trending-up" tone="green"/>}
      </div>

      {/* Live map + zone mix */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8">
          <Card title="Live field map" subtitle="All active employees · open Live Map for the full view"
            right={<Badge tone={outFence > 0 ? 'red' : 'green'}><span className="w-1.5 h-1.5 rounded-full bg-current"/>{outFence > 0 ? `${outFence} alert` : 'All good'}</Badge>}
            bodyClass="p-3">
            <MiniLiveMap height={240}/>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"/>Inside fence</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"/>Outside</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-700 opacity-40"/>Geo-fence radius</div>
            </div>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <Card title="Zone distribution" subtitle="Active field staff by zone" bodyClass="p-3">
            <div className="flex items-center justify-center py-2"><DonutChart data={donut} size={150}/></div>
            <div className="space-y-1 text-[11px] mt-1">
              {donut.map((d) => (
                <div key={d.label} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }}/>
                  <span className="text-slate-600 dark:text-slate-300 flex-1 truncate">{d.label}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{d.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Performers + activity */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-6">
          <Card title="Top performers · July" subtitle="By monthly sales" bodyClass="p-0">
            {[...emps].sort((a,b) => (store.getSales(b.id, july)?.totalSales || 0) - (store.getSales(a.id, july)?.totalSales || 0)).slice(0, 5).map((e, i) => {
              const sales = store.getSales(e.id, july)?.totalSales || 0;
              // Sales is performance, which a Team Lead needs; the incentive it
              // earns is pay, which they do not see.
              const inc = showMoney ? store.calcIncentive(sales, e, july) : null;
              const max = 250000;
              return (
                <div key={e.id} className="p-3 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className="text-[11px] font-bold text-slate-400 w-4">{i+1}</div>
                  <Avatar emp={e} size={28}/>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">{e.name}</div>
                    <ProgressBar value={pctOf(sales, max)} className="mt-1" tone="bg-brand-600"/>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{fmtINR(sales)}</div>
                    {inc && <div className="text-[10px] text-emerald-600 font-semibold">+{fmtINR(inc.payout)}</div>}
                  </div>
                </div>
              );
            })}
            {emps.length === 0 && <Empty title="No active staff in scope"/>}
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-6">
          <Card title="Recent activity" bodyClass="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                { icon: 'check', t: 'Amit Sharma clocked in at Croma Delhi', time: '10:04', tone: 'green' },
                { icon: 'alert', t: 'Vikram Singh moved outside geo-fence', time: '12:22', tone: 'red' },
                { icon: 'target', t: 'July store target set for Croma Juhu — ₹4,00,000', time: '11:15', tone: 'brand' },
                { icon: 'send', t: 'Regularisation submitted by Priya Nair', time: '09:20', tone: 'amber' },
                { icon: 'wallet', t: 'June payroll processed', time: '01 Jul', tone: 'brand' },
                { icon: 'shield', t: 'Arjun Mehta submitted onboarding application', time: '10:30', tone: 'violet' },
              ].map((a, i) => (
                <div key={i} className="p-2.5 flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    a.tone === 'green' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' :
                    a.tone === 'red'   ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30' :
                    a.tone === 'amber' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30' :
                    a.tone === 'violet'? 'bg-violet-50 text-violet-600 dark:bg-violet-900/30' :
                                         'bg-brand-50 text-brand-700 dark:bg-brand-900/30'
                  }`}><Icon name={a.icon} className="w-3.5 h-3.5"/></div>
                  <div className="flex-1 min-w-0 text-[12px] text-slate-700 dark:text-slate-200 truncate">{a.t}</div>
                  <div className="text-[10px] text-slate-400 font-mono shrink-0">{a.time}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { OverviewPage, PriorityAlerts, MiniLiveMap, BarChart, DonutChart });
