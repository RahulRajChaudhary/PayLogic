export default function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {Icon && (
        <span className="w-12 h-12 rounded-full bg-cream-100 flex items-center justify-center text-muted mb-3">
          <Icon className="w-5 h-5" />
        </span>
      )}
      <p className="text-ink font-medium">{title}</p>
      {hint && <p className="text-sm text-muted mt-1 max-w-xs">{hint}</p>}
    </div>
  );
}
