/* Incentive slab config */
function SlabsPage({ user }) {
  const store = useStore();
  const toast = useToast();
  const slabs = store.getSlabs();
  const [editing, setEditing] = useState(null);

  const save = () => {
    Store.upsertSlab(editing);
    toast('Slab saved — incentives recomputed', 'success');
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Variable pay</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">Incentive slabs</div>
          <div className="text-[12px] text-slate-500 mt-0.5">Band-based flat payout. Changes here recompute every employee's payslip live.</div>
        </div>
        <Btn variant="primary" onClick={() => setEditing({ id: null, minSales: 0, maxSales: 100000, payout: 1000, label: 'New slab' })}><Icon name="plus" className="w-3.5 h-3.5"/>Add slab</Btn>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Slab configuration" bodyClass="p-0">
          <table className="w-full dense-table">
            <thead><tr><th>Label</th><th>Min sales</th><th>Max sales</th><th>Payout</th><th></th></tr></thead>
            <tbody>
              {slabs.map((s) => (
                <tr key={s.id}>
                  <td className="font-semibold text-slate-800 dark:text-slate-100">{s.label}</td>
                  <td className="font-mono">{fmtINR(s.minSales)}</td>
                  <td className="font-mono">{s.maxSales == null ? '∞' : fmtINR(s.maxSales)}</td>
                  <td className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{fmtINR(s.payout)}</td>
                  <td>
                    <div className="flex gap-1">
                      <Btn size="xs" onClick={() => setEditing(s)}><Icon name="edit" className="w-3 h-3"/></Btn>
                      <Btn size="xs" variant="danger" onClick={() => { if (confirm('Delete slab?')) { Store.deleteSlab(s.id); toast('Slab deleted', 'warn'); } }}><Icon name="trash" className="w-3 h-3"/></Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Live incentive preview" subtitle="Current July sales × slabs">
          <div className="space-y-2">
            {store.getEmployees({ status: 'active' }).map((e) => {
              const s = store.getSales(e.id, '2026-07')?.totalSales || 0;
              const inc = store.calcIncentive(s);
              return (
                <div key={e.id} className="flex items-center gap-2.5 p-2 rounded bg-slate-50 dark:bg-slate-800/50">
                  <Avatar emp={e} size={28}/>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">{e.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{fmtINR(s)} sales · {inc.slab.label}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-bold text-emerald-700 dark:text-emerald-400 font-mono">{fmtINR(inc.payout)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? 'Edit slab' : 'New slab'}
          footer={<><Btn onClick={() => setEditing(null)}>Cancel</Btn><Btn variant="primary" onClick={save}>Save</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label" className="col-span-2"><Input value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })}/></Field>
            <Field label="Min sales (₹)"><Input type="number" value={editing.minSales} onChange={(e) => setEditing({ ...editing, minSales: +e.target.value })}/></Field>
            <Field label="Max sales (₹, blank = ∞)"><Input type="number" value={editing.maxSales ?? ''} onChange={(e) => setEditing({ ...editing, maxSales: e.target.value === '' ? null : +e.target.value })}/></Field>
            <Field label="Flat payout (₹)" className="col-span-2"><Input type="number" value={editing.payout} onChange={(e) => setEditing({ ...editing, payout: +e.target.value })}/></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

Object.assign(window, { SlabsPage });
