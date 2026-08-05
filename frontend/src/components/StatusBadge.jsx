const COLORS = {
  CREATED: 'bg-slate-100 text-slate-700 border-slate-300',
  VALIDATED: 'bg-blue-50 text-blue-700 border-blue-200',
  SENT: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded border text-xs font-bold tracking-wide uppercase whitespace-nowrap ${COLORS[status] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
      {status}
    </span>
  );
}
