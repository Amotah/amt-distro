/**
 * PaginationControl — paginator with "Show 10|20|50 per page" + page buttons.
 * Built on top of the existing shadcn/ui Pagination primitives.
 *
 * Usage:
 *   <PaginationControl
 *     page={page} totalPages={totalPages}
 *     pageSize={pageSize} pageSizeOptions={[10, 20, 50]}
 *     totalItems={totalItems}
 *     onPageChange={setPage}
 *     onPageSizeChange={setPageSize}
 *   />
 */
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface PaginationControlProps {
  page: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions?: number[];
  totalItems?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

function buildPageWindows(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

export function PaginationControl({
  page,
  totalPages,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  totalItems,
  onPageChange,
  onPageSizeChange,
  className = '',
}: PaginationControlProps) {
  const windows = buildPageWindows(page, totalPages);
  const from = totalItems !== undefined ? (page - 1) * pageSize + 1 : undefined;
  const to = totalItems !== undefined ? Math.min(page * pageSize, totalItems) : undefined;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`}
      role="navigation"
      aria-label="Pagination"
    >
      {/* Left: item count + page size selector */}
      <div className="flex items-center gap-3 text-sm text-[#B3B3B3]">
        {totalItems !== undefined && from !== undefined && to !== undefined && (
          <span aria-live="polite">
            Showing <strong className="text-white">{from}–{to}</strong> of{' '}
            <strong className="text-white">{totalItems.toLocaleString()}</strong>
          </span>
        )}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs">Show</span>
            {pageSizeOptions.map((size) => (
              <button
                key={size}
                onClick={() => { onPageSizeChange(size); onPageChange(1); }}
                className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                  pageSize === size
                    ? 'bg-[#FF6B00] text-white'
                    : 'text-[#B3B3B3] hover:text-white hover:bg-[#FF6B00]/20'
                }`}
                aria-label={`Show ${size} per page`}
              >
                {size}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: page buttons */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1" aria-label="Page navigation">
          {/* Previous */}
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#FF6B00]/20 text-[#B3B3B3]
              hover:border-[#FF6B00]/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page numbers */}
          {windows.map((p, i) =>
            p === '...' ? (
              <span
                key={`ellipsis-${i}`}
                className="flex h-8 w-8 items-center justify-center text-[#555]"
                aria-hidden="true"
              >
                <MoreHorizontal className="h-4 w-4" />
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                  p === page
                    ? 'border-[#FF6B00] bg-[#FF6B00] text-white'
                    : 'border-[#FF6B00]/20 text-[#B3B3B3] hover:border-[#FF6B00]/40 hover:text-white'
                }`}
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </button>
            ),
          )}

          {/* Next */}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#FF6B00]/20 text-[#B3B3B3]
              hover:border-[#FF6B00]/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
