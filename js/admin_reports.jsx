/* Reports: Attendance / Payroll / Incentive / Deployment with charts + SVG India map */
function LineChart({ series, height = 200, color = '#1E40AF' }) {
  const max = Math.max(...series.map((s) => s.value), 1);
  const min = 0;
  const w = 100;
  const step = w / (series.length - 1 || 1);
  const points = series.map((s, i) => [i * step, height - 20 - ((s.value - min) / (max - min || 1)) * (height - 40)]);
  const path = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.join(',')).join(' ');
  const area = path + ` L${(series.length - 1) * step},${height - 20} L0,${height - 20} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.3"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((p) => <line key={p} x1="0" x2={w} y1={20 + (height - 40) * p} y2={20 + (height - 40) * p} stroke="currentColor" strokeWidth="0.1" className="text-slate-300 dark:text-slate-700"/>)}
      <path d={area} fill="url(#lg1)"/>
      <path d={path} fill="none" stroke={color} strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
      {points.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="0.8" fill={color}/>)}
      {series.map((s, i) => <text key={'l'+i} x={i * step} y={height - 5} textAnchor="middle" fontSize="3" fill="currentColor" className="text-slate-500 dark:text-slate-400 font-semibold">{s.label}</text>)}
    </svg>
  );
}

function IndiaMapSVG({ sites, height = 320 }) {
  // simplified India outline path
  const w = 300, h = 320;
  const project = (lat, lng) => {
    // rough equirectangular projection for India bounds (68..97 lng, 8..37 lat)
    const x = ((lng - 68) / (97 - 68)) * w;
    const y = ((37 - lat) / (37 - 8)) * h;
    return [x, y];
  };
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" style={{ maxHeight: height }}>
      <defs>
        <linearGradient id="indfill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#EEF2FF"/><stop offset="1" stopColor="#DBEAFE"/></linearGradient>
      </defs>
      {/* Simplified India outline (approximate) */}
      <path fill="url(#indfill)" stroke="#94A3B8" strokeWidth="0.6" className="dark:fill-slate-800 dark:stroke-slate-600"
        d="M95,42 L110,38 L125,42 L142,50 L156,62 L168,70 L175,80 L182,72 L192,75 L200,88 L210,95 L215,110 L225,118 L232,132 L240,140 L245,155 L250,168 L245,178 L240,190 L232,198 L225,208 L215,215 L205,220 L195,230 L185,238 L175,245 L165,252 L155,260 L145,265 L135,262 L128,270 L120,265 L112,258 L108,248 L112,238 L105,228 L100,215 L102,205 L108,195 L112,185 L108,175 L100,168 L92,158 L88,148 L82,138 L78,128 L75,118 L72,108 L68,98 L65,88 L68,78 L72,68 L78,58 L85,50 Z"/>
      {sites.map((s) => {
        const [x, y] = project(s.lat, s.lng);
        return (
          <g key={s.id} transform={`translate(${x},${y})`}>
            <circle r="6" fill="#1E40AF" opacity="0.15"/>
            <circle r="3" fill="#1E40AF"/>
            <text x="6" y="3" fontSize="7" fill="currentColor" className="text-slate-800 dark:text-slate-200 font-semibold">{s.city}</text>
            <text x="6" y="11" fontSize="5" fill="currentColor" className="text-slate-500 dark:text-slate-400">{s.staffCount} staff</text>
          </g>
        );
      })}
    </svg>
  );
}

function ReportsPage({ user }) {
  const store = useStore();
  const [tab, setTab] = useState('attendance');
  const july = '2026-07';
  const payMonth = '2026-06'; // last completed month for payroll/incentive breakdowns
  const emps = store.getEmployees({ status: 'active' });

  // Attendance daily counts July 1..15 — org-wide present count (deterministic ~87–95%)
  const attSeries = [];
  for (let d = 1; d <= 15; d++) {
    const frac = 0.87 + ((d * 53) % 9) / 100;
    attSeries.push({ label: String(d), value: Math.round(emps.length * frac) });
  }

  // Payroll breakdown per employee
  const payslips = emps.map((e) => store.computePayslip(e.id, payMonth));
  const totalNet = payslips.reduce((s, p) => s + p.netPay, 0);
  const totalDed = payslips.reduce((s, p) => s + p.absenceDeduction + p.statutory.pf + p.statutory.esic + p.statutory.pt, 0);
  const totalInc = payslips.reduce((s, p) => s + p.incentive, 0);

  // Incentive distribution by payout band (store-specific slabs → too many to chart individually)
  const incBuckets = [
    { label: 'No incentive', test: (v) => v <= 0 },
    { label: '₹1 – ₹2,000',  test: (v) => v > 0 && v <= 2000 },
    { label: '₹2k – ₹4,000', test: (v) => v > 2000 && v <= 4000 },
    { label: '₹4k+',         test: (v) => v > 4000 },
  ];
  const slabColors = ['#CBD5E1','#93C5FD','#3B82F6','#1E40AF'];
  const empInc = emps.map((e) => store.calcIncentive(store.getSales(e.id, july)?.totalSales || 0, e).payout);
  const slabDist = incBuckets.map((b, i) => ({ label: b.label, value: empInc.filter(b.test).length, color: slabColors[i % slabColors.length] }));

  // Site deployment (562 stores → count via a map, show only staffed sites, most-deployed first)
  const staffBySite = {};
  emps.forEach((e) => { staffBySite[e.siteId] = (staffBySite[e.siteId] || 0) + 1; });
  const sitesWithCount = store.getSites()
    .map((s) => ({ ...s, staffCount: staffBySite[s.id] || 0 }))
    .filter((s) => s.staffCount > 0)
    .sort((a, b) => b.staffCount - a.staffCount);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Analytics</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">Reports & insights</div>
          <div className="text-[12px] text-slate-500 mt-0.5">Filter, chart, and export operational metrics.</div>
        </div>
        <Btn><Icon name="download" className="w-3.5 h-3.5"/>Export PDF</Btn>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'attendance', label: 'Attendance', icon: 'calendar' },
          { id: 'payroll',    label: 'Payroll',    icon: 'wallet' },
          { id: 'incentive',  label: 'Incentive',  icon: 'trending-up' },
          { id: 'deployment', label: 'Deployment', icon: 'map' },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-[12px] font-semibold border-b-2 -mb-px flex items-center gap-1.5 ${tab === t.id ? 'text-brand-700 border-brand-700 dark:text-brand-300 dark:border-brand-400' : 'text-slate-500 border-transparent hover:text-slate-700'}`}>
            <Icon name={t.icon} className="w-3.5 h-3.5"/>{t.label}
          </button>
        ))}
      </div>

      {tab === 'attendance' && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8">
            <Card title="Daily attendance · July 1–15" subtitle="Unique employees clocked in per day">
              <LineChart series={attSeries} height={220}/>
            </Card>
          </div>
          <div className="col-span-12 lg:col-span-4">
            <Card title="Attendance summary">
              {[
                ['Avg presence', `${(attSeries.reduce((s,d) => s+d.value,0)/attSeries.length).toFixed(1)} / ${emps.length}`],
                ['Perfect attendance', emps.filter((e) => store.computePayslip(e.id, payMonth).absentDays === 0).length + ' employees'],
                ['2-hr checks today', store.getAttendance({ date: '2026-07-15' }).filter((a) => a.type === '2hr-check').length],
                ['Geo-fence breaches', store.getLivePositions().filter((p) => !p.inside).length],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 text-[13px]">
                  <span className="text-slate-500">{k}</span><span className="font-semibold text-slate-800 dark:text-slate-100">{v}</span>
                </div>
              ))}
            </Card>
          </div>
          <div className="col-span-12">
            <Card title="Per-employee attendance · July" bodyClass="p-0">
              <table className="w-full dense-table">
                <thead><tr><th>Employee</th><th>Site</th><th>Working</th><th>Present</th><th>Absent</th><th>Attendance %</th></tr></thead>
                <tbody>
                  {payslips.slice(0, 80).map((p) => {
                    const e = store.getEmployee(p.employeeId);
                    const pct = (p.presentDays / p.workingDays) * 100;
                    return (
                      <tr key={p.employeeId}>
                        <td><div className="flex items-center gap-2"><Avatar emp={e} size={24}/>{e.name}</div></td>
                        <td className="text-[11px] text-slate-500">{store.getSite(e.siteId)?.city}</td>
                        <td className="font-mono">{p.workingDays}</td>
                        <td className="font-mono text-emerald-700">{p.presentDays}</td>
                        <td className="font-mono text-rose-700">{p.absentDays}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-32 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full bg-brand-600" style={{ width: `${pct}%` }}/>
                            </div>
                            <span className="text-[11px] font-mono font-semibold">{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {payslips.length > 80 && <div className="p-2 text-center text-[11px] text-slate-500">Showing first 80 of {payslips.length} employees · export for the full list</div>}
            </Card>
          </div>
        </div>
      )}

      {tab === 'payroll' && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4"><StatCard label="Total net payout" value={fmtINR(totalNet)} tone="brand" icon="wallet"/></div>
          <div className="col-span-12 md:col-span-4"><StatCard label="Total deductions" value={fmtINR(totalDed)} tone="red" icon="alert"/></div>
          <div className="col-span-12 md:col-span-4"><StatCard label="Total incentives" value={fmtINR(totalInc)} tone="green" icon="trending-up"/></div>
          <div className="col-span-12 lg:col-span-7">
            <Card title="Net pay by employee">
              <BarChart data={payslips.map((p) => ({ label: store.getEmployee(p.employeeId).name.split(' ')[0].slice(0,4), value: p.netPay }))} height={220}/>
            </Card>
          </div>
          <div className="col-span-12 lg:col-span-5">
            <Card title="Cost breakdown">
              <div className="space-y-3">
                {[
                  { l: 'Base salaries', v: payslips.reduce((s,p) => s+p.base,0), c: '#1E40AF' },
                  { l: 'Incentives',    v: totalInc, c: '#059669' },
                  { l: 'PF employer',   v: payslips.reduce((s,p) => s+p.statutory.pf,0), c: '#7C3AED' },
                  { l: 'ESIC',          v: payslips.reduce((s,p) => s+p.statutory.esic,0), c: '#EA580C' },
                  { l: 'Absence ded.',  v: payslips.reduce((s,p) => s+p.absenceDeduction,0), c: '#DC2626' },
                ].map((r) => {
                  const total = payslips.reduce((s,p) => s+p.base,0) + totalInc;
                  return (
                    <div key={r.l}>
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="text-slate-600 dark:text-slate-300">{r.l}</span>
                        <span className="font-mono font-semibold">{fmtINR(r.v)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(r.v/total)*100}%`, background: r.c }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'incentive' && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-5">
            <Card title="Slab distribution">
              <div className="flex items-center justify-center py-4">
                <DonutChart data={slabDist} size={180}/>
              </div>
              <div className="space-y-1.5">
                {slabDist.map((d) => (
                  <div key={d.label} className="flex items-center gap-2 text-[12px]">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }}/>
                    <span className="flex-1 text-slate-600 dark:text-slate-300">{d.label}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{d.value} employees</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <div className="col-span-12 lg:col-span-7">
            <Card title="Sales vs incentive earned" bodyClass="p-0">
              <table className="w-full dense-table">
                <thead><tr><th>Employee</th><th>Sales (Jul)</th><th>Slab</th><th className="text-right">Incentive</th></tr></thead>
                <tbody>
                  {emps.slice(0, 80).map((e) => {
                    const s = store.getSales(e.id, july)?.totalSales || 0;
                    const inc = store.calcIncentive(s, e);
                    return (
                      <tr key={e.id}>
                        <td><div className="flex items-center gap-2"><Avatar emp={e} size={24}/>{e.name}</div></td>
                        <td className="font-mono">{fmtINR(s)}</td>
                        <td><Badge tone="brand">{inc.slab.label}</Badge></td>
                        <td className="text-right font-mono font-bold text-emerald-700">{fmtINR(inc.payout)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {emps.length > 80 && <div className="p-2 text-center text-[11px] text-slate-500">Showing first 80 of {emps.length} employees</div>}
            </Card>
          </div>
        </div>
      )}

      {tab === 'deployment' && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-7">
            <Card title="Manpower deployment across India" subtitle={`${sitesWithCount.length} staffed client sites`} bodyClass="p-3">
              <IndiaMapSVG sites={sitesWithCount.slice(0, 60)} height={340}/>
            </Card>
          </div>
          <div className="col-span-12 lg:col-span-5">
            <Card title="Site roster" subtitle={`${sitesWithCount.length} staffed sites · top 40 shown`} bodyClass="p-0" className="max-h-[560px] overflow-auto">
              {sitesWithCount.slice(0, 40).map((s) => (
                <div key={s.id} className="p-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">{s.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{s.lat.toFixed(3)}, {s.lng.toFixed(3)}</div>
                    </div>
                    <Badge tone="brand">{s.staffCount} staff</Badge>
                  </div>
                  <div className="flex -space-x-2">
                    {store.getEmployees({ siteId: s.id, status: 'active' }).map((e) => (
                      <Avatar key={e.id} emp={e} size={24} className="ring-2 ring-white dark:ring-slate-900"/>
                    ))}
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { ReportsPage, LineChart, IndiaMapSVG });
