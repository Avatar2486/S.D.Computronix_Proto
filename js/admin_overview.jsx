/* Admin overview: KPIs, mini live map, charts, activity */
function MiniLiveMap({ height = 240 }) {
  const store = useStore();
  const ref = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const m = L.map(ref.current, { zoomControl: false, attributionControl: false, dragging: true, scrollWheelZoom: false }).setView([21.5, 78.5], 4);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxZoom: 18 }).addTo(m);
    mapRef.current = m;
    // resize once container is real
    setTimeout(() => m.invalidateSize(), 50);
  }, []);

  useEffect(() => {
    const m = mapRef.current; if (!m) return;
    // clear existing layers except base tiles
    m.eachLayer((layer) => { if (!(layer instanceof L.TileLayer)) m.removeLayer(layer); });
    const positions = store.getLivePositions();
    const bounds = [];
    positions.forEach(({ emp, site, lat, lng, inside }) => {
      const color = inside ? '#059669' : '#e11d48';
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 0 2px ${color}55"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7],
      });
      L.marker([lat, lng], { icon }).bindTooltip(`${emp.name} · ${site.city}`, { direction: 'top' }).addTo(m);
      bounds.push([lat, lng]);
    });
    store.getSites().forEach((s) => {
      L.circle([s.lat, s.lng], { radius: s.radius, color: '#1E40AF', weight: 1, fillColor: '#1E40AF', fillOpacity: 0.06 }).addTo(m);
    });
    if (bounds.length) m.fitBounds(bounds, { padding: [20, 20] });
  }, [store.state]);

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

function OverviewPage({ user }) {
  const store = useStore();
  const isSiteMgr = user.role === 'site-manager';
  const emps = store.getEmployees({ status: 'active' }).filter((e) => !isSiteMgr || e.siteId === user.siteId);
  const today = '2026-07-15';
  const presentToday = emps.filter((e) => store.isPresentToday(e)).length;
  const absentToday = emps.length - presentToday;
  const outFence = store.getLivePositions().filter((p) => !p.inside && (!isSiteMgr || p.emp.siteId === user.siteId)).length;
  const pendingApprovals = store.getEmployees({ status: 'pending' }).length;
  const pendingReg = store.getRegularisations({ status: 'pending' }).length;

  const july = '2026-07';
  // Payroll/incentive figures use the last completed month (June) so deductions
  // reflect real full-month attendance, not partial in-progress July days.
  const payMonth = '2026-06';
  const payslips = emps.map((e) => store.computePayslip(e.id, payMonth));
  const payrollCost = payslips.reduce((s, p) => s + p.netPay, 0);
  const incentiveTotal = payslips.reduce((s, p) => s + p.incentive, 0);

  // last 7 days attendance bar chart — org-wide daily present count (deterministic ~88–95%)
  const days = [];
  for (let d = 9; d <= 15; d++) {
    const frac = 0.88 + ((d * 37) % 8) / 100; // 0.88–0.95, stable per day
    days.push({ label: String(d), value: Math.round(emps.length * frac) });
  }

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
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Command Center</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">Good morning, {user.name.split(' ')[0]}</div>
          <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Here's what's happening across your field operations right now.</div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot"/>Auto-refresh every 30s
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total field staff" value={emps.length} sub={`${sites.length} stores · ${(hierarchy.zones||[]).length} zones`} icon="users" tone="brand"/>
        <StatCard label="Present today" value={presentToday} sub={`${((presentToday/Math.max(emps.length,1))*100).toFixed(0)}% attendance`} icon="check-circle" tone="green"/>
        <StatCard label="Absent today" value={absentToday} sub={absentToday > 0 ? 'Regularisable' : 'None'} icon="calendar" tone="amber"/>
        <StatCard label="Out of geo-fence" value={outFence} sub={outFence > 0 ? 'Alert raised' : 'All within fence'} icon="alert" tone={outFence > 0 ? 'red' : 'slate'}/>
        <StatCard label="Payroll (Jun)" value={fmtINR(payrollCost)} sub="Last processed net payout" icon="wallet" tone="brand"/>
        <StatCard label="Incentives (Jun)" value={fmtINR(incentiveTotal)} sub="Across all slabs" icon="trending-up" tone="green"/>
      </div>

      {/* Row 2: mini map + attendance + donut */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-6">
          <Card title="Live field map" subtitle="All active employees · click Live Map for full view"
            right={<Badge tone={outFence > 0 ? 'red' : 'green'}><span className="w-1.5 h-1.5 rounded-full bg-current"/>{outFence > 0 ? `${outFence} alert` : 'All good'}</Badge>}
            bodyClass="p-3">
            <MiniLiveMap height={220}/>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"/>Inside fence</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"/>Outside</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-700 opacity-40"/>Geo-fence radius</div>
            </div>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <Card title="Attendance last 7 days" subtitle="Unique clock-ins per day">
            <BarChart data={days} height={160}/>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-2">
          <Card title="Zone distribution" bodyClass="p-3">
            <div className="flex items-center justify-center py-2"><DonutChart data={donut} size={130}/></div>
            <div className="space-y-1 text-[11px] mt-1">
              {donut.map((d) => (
                <div key={d.label} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: d.color }}/>
                  <span className="text-slate-600 dark:text-slate-300 flex-1">{d.label}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{d.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Row 3: alerts + queues + activity */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-4">
          <Card title="Priority alerts" bodyClass="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {store.getLivePositions().filter((p) => !p.inside).map((p) => (
                <div key={p.emp.id} className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center"><Icon name="alert" className="w-4 h-4"/></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">Geo-fence breach · {p.emp.name}</div>
                    <div className="text-[11px] text-slate-500">{Math.round(Store.checkGeofence(p.emp.id, p.lat, p.lng).distance)}m from {p.site.city} site</div>
                  </div>
                  <Badge tone="red">Live</Badge>
                </div>
              ))}
              {pendingApprovals > 0 && (
                <div className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 text-brand-700 flex items-center justify-center"><Icon name="shield" className="w-4 h-4"/></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">Onboarding pending</div>
                    <div className="text-[11px] text-slate-500">{pendingApprovals} new applicant(s) awaiting KYC review</div>
                  </div>
                  <Badge tone="brand">{pendingApprovals}</Badge>
                </div>
              )}
              {pendingReg > 0 && (
                <div className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 flex items-center justify-center"><Icon name="calendar" className="w-4 h-4"/></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">Regularisation queue</div>
                    <div className="text-[11px] text-slate-500">{pendingReg} request(s) awaiting your decision</div>
                  </div>
                  <Badge tone="amber">{pendingReg}</Badge>
                </div>
              )}
              {outFence === 0 && pendingApprovals === 0 && pendingReg === 0 && (
                <Empty icon="check-circle" title="All clear" hint="No pending alerts or approvals."/>
              )}
            </div>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <Card title="Top performers · July" subtitle="By monthly sales" bodyClass="p-0">
            {[...emps].sort((a,b) => (store.getSales(b.id, july)?.totalSales || 0) - (store.getSales(a.id, july)?.totalSales || 0)).slice(0, 5).map((e, i) => {
              const sales = store.getSales(e.id, july)?.totalSales || 0;
              const inc = store.calcIncentive(sales, e);
              const max = 250000;
              return (
                <div key={e.id} className="p-3 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className="text-[11px] font-bold text-slate-400 w-4">{i+1}</div>
                  <Avatar emp={e} size={28}/>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">{e.name}</div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-brand-600" style={{ width: `${Math.min(100, (sales/max)*100)}%` }}/>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{fmtINR(sales)}</div>
                    <div className="text-[10px] text-emerald-600 font-semibold">+{fmtINR(inc.payout)}</div>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <Card title="Recent activity" bodyClass="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                { icon: 'check', t: 'Amit Sharma clocked in at Croma Delhi', time: '10:04', tone: 'green' },
                { icon: 'alert', t: 'Vikram Singh moved outside geo-fence', time: '12:22', tone: 'red' },
                { icon: 'camera', t: 'Priya Nair completed 2-hour check', time: '12:00', tone: 'brand' },
                { icon: 'send', t: 'Regularisation submitted by Priya Nair', time: '09:20', tone: 'amber' },
                { icon: 'wallet', t: 'June payroll processed for 6 employees', time: '01 Jul', tone: 'brand' },
                { icon: 'shield', t: 'Arjun Mehta submitted onboarding application', time: '10:30', tone: 'violet' },
              ].map((a, i) => (
                <div key={i} className="p-2.5 flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
                    a.tone === 'green' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' :
                    a.tone === 'red'   ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30' :
                    a.tone === 'amber' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30' :
                    a.tone === 'violet'? 'bg-violet-50 text-violet-600 dark:bg-violet-900/30' :
                                         'bg-brand-50 text-brand-700 dark:bg-brand-900/30'
                  }`}><Icon name={a.icon} className="w-3.5 h-3.5"/></div>
                  <div className="flex-1 min-w-0 text-[12px] text-slate-700 dark:text-slate-200 truncate">{a.t}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{a.time}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { OverviewPage, MiniLiveMap, BarChart, DonutChart });
