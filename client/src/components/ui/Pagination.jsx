import { ChevronLeft, ChevronRight } from 'lucide-react';

// Shared by every list page. `pagination` is the { page, limit, total, totalPages }
// object returned alongside `data` by any paginated API endpoint.
export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, limit, total, totalPages } = pagination;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between mt-4 text-sm text-muted">
      <p>
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-navy-950/15 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cream-100"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-ink font-medium">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-navy-950/15 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cream-100"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
