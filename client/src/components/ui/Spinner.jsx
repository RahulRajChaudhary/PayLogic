export default function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-muted text-sm">
      <span className="w-4 h-4 rounded-full border-2 border-navy-950/20 border-t-navy-950 animate-spin" />
      {label}
    </div>
  );
}
