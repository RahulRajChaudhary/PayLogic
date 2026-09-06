export default function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-navy-950/10 p-4 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold-500/70" />
      <div className="flex items-start justify-between">
        <p className="text-xs text-muted font-medium">{label}</p>
        {Icon && (
          <span className="w-7 h-7 rounded-lg bg-navy-950/5 flex items-center justify-center text-navy-950/70">
            <Icon className="w-4 h-4" />
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold text-ink mt-2 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}
