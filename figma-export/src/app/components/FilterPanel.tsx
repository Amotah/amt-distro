/**
 * FilterPanel — collapsible filter/sort panel used on Releases, Analytics, Revenue pages.
 *
 * Usage:
 *   <FilterPanel filters={filters} values={values} onChange={setValues} onReset={handleReset} />
 *
 * Each filter can be a:
 *   - 'select'    → dropdown (single value)
 *   - 'multiselect' → checkboxes (array of values)
 *   - 'daterange' → two date inputs (from / to)
 *   - 'sort'      → select + direction toggle (asc/desc)
 */
import { useState } from 'react';
import { ChevronDown, ChevronUp, Filter, X, RotateCcw, SortAsc, SortDesc } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FilterOption = { label: string; value: string };

export type FilterDef =
  | { type: 'select'; key: string; label: string; options: FilterOption[]; placeholder?: string }
  | { type: 'multiselect'; key: string; label: string; options: FilterOption[] }
  | { type: 'daterange'; keyFrom: string; keyTo: string; label: string }
  | { type: 'sort'; key: string; directionKey: string; label: string; options: FilterOption[] };

export type FilterValues = Record<string, string | string[]>;

interface FilterPanelProps {
  filters: FilterDef[];
  values: FilterValues;
  onChange: (next: FilterValues) => void;
  onReset?: () => void;
  /** Number of results — shown in the header */
  resultCount?: number;
  /** Default collapsed state on mobile */
  defaultCollapsed?: boolean;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countActiveFilters(filters: FilterDef[], values: FilterValues): number {
  let n = 0;
  for (const f of filters) {
    if (f.type === 'select') {
      if (values[f.key] && values[f.key] !== '') n++;
    } else if (f.type === 'multiselect') {
      const v = values[f.key];
      if (Array.isArray(v) && v.length > 0) n++;
    } else if (f.type === 'daterange') {
      if (values[f.keyFrom] || values[f.keyTo]) n++;
    } else if (f.type === 'sort') {
      if (values[f.key]) n++;
    }
  }
  return n;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FilterPanel({
  filters,
  values,
  onChange,
  onReset,
  resultCount,
  defaultCollapsed = false,
  className = '',
}: FilterPanelProps) {
  const [open, setOpen] = useState(!defaultCollapsed);
  const activeCount = countActiveFilters(filters, values);

  const set = (key: string, value: string | string[]) =>
    onChange({ ...values, [key]: value });

  const toggleMulti = (key: string, option: string) => {
    const prev = (values[key] as string[]) ?? [];
    const next = prev.includes(option) ? prev.filter((v) => v !== option) : [...prev, option];
    set(key, next);
  };

  return (
    <div
      className={`rounded-xl border border-[#FF6B00]/15 bg-[#111111] ${className}`}
      role="search"
      aria-label="Filter and sort panel"
    >
      {/* ── Panel toggle header ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-[#FF6B00]/5 transition-colors rounded-xl"
        aria-controls="filter-panel-body"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#FF6B00]" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">Filters &amp; Sort</span>
          {activeCount > 0 && (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#FF6B00] px-1.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
          {resultCount !== undefined && (
            <span className="text-xs text-[#B3B3B3] ml-1">{resultCount.toLocaleString()} results</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && onReset && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onReset(); }}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#B3B3B3] hover:text-[#FF6B00] hover:bg-[#FF6B00]/10 transition-colors"
              aria-label="Reset all filters"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
          {open ? (
            <ChevronUp className="h-4 w-4 text-[#B3B3B3]" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#B3B3B3]" aria-hidden="true" />
          )}
        </div>
      </button>

      {/* ── Filter body ── */}
      {open && (
        <div
          id="filter-panel-body"
          className="border-t border-[#FF6B00]/10 px-4 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4
            animate-in slide-in-from-top-2 fade-in-0 duration-150"
        >
          {filters.map((filter) => {
            if (filter.type === 'select') {
              return (
                <div key={filter.key} className="flex flex-col gap-1.5">
                  <label htmlFor={`filter-${filter.key}`} className="text-xs font-medium text-[#B3B3B3]">
                    {filter.label}
                  </label>
                  <div className="relative">
                    <select
                      id={`filter-${filter.key}`}
                      value={(values[filter.key] as string) ?? ''}
                      onChange={(e) => set(filter.key, e.target.value)}
                      className="w-full appearance-none rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 pr-8
                        text-sm text-white focus:border-[#FF6B00]/50 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20
                        disabled:opacity-50 cursor-pointer"
                    >
                      <option value="">{filter.placeholder ?? `All ${filter.label}`}</option>
                      {filter.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#555]" />
                    {values[filter.key] && (
                      <button
                        type="button"
                        onClick={() => set(filter.key, '')}
                        className="absolute right-7 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#B3B3B3] transition-colors"
                        aria-label={`Clear ${filter.label} filter`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            if (filter.type === 'multiselect') {
              const selected = (values[filter.key] as string[]) ?? [];
              return (
                <div key={filter.key} className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-[#B3B3B3]">{filter.label}</span>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label={filter.label}>
                    {filter.options.map((opt) => {
                      const active = selected.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleMulti(filter.key, opt.value)}
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                            active
                              ? 'border-[#FF6B00] bg-[#FF6B00]/15 text-[#FF6B00]'
                              : 'border-[#FF6B00]/20 bg-[#0A0A0A] text-[#B3B3B3] hover:border-[#FF6B00]/40 hover:text-white'
                          }`}
                          aria-label={`${opt.label}${active ? ' (selected)' : ''}`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            if (filter.type === 'daterange') {
              return (
                <div key={filter.keyFrom} className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-xs font-medium text-[#B3B3B3]">{filter.label}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      id={`filter-${filter.keyFrom}`}
                      value={(values[filter.keyFrom] as string) ?? ''}
                      onChange={(e) => set(filter.keyFrom, e.target.value)}
                      className="flex-1 rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-sm text-white
                        focus:border-[#FF6B00]/50 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 [color-scheme:dark]"
                      aria-label={`${filter.label} from`}
                    />
                    <span className="text-xs text-[#555] shrink-0">to</span>
                    <input
                      type="date"
                      id={`filter-${filter.keyTo}`}
                      value={(values[filter.keyTo] as string) ?? ''}
                      onChange={(e) => set(filter.keyTo, e.target.value)}
                      className="flex-1 rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-sm text-white
                        focus:border-[#FF6B00]/50 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 [color-scheme:dark]"
                      aria-label={`${filter.label} to`}
                    />
                    {(values[filter.keyFrom] || values[filter.keyTo]) && (
                      <button
                        type="button"
                        onClick={() => onChange({ ...values, [filter.keyFrom]: '', [filter.keyTo]: '' })}
                        className="shrink-0 text-[#555] hover:text-[#B3B3B3] transition-colors"
                        aria-label="Clear date range"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            if (filter.type === 'sort') {
              const dir = (values[filter.directionKey] as string) ?? 'desc';
              return (
                <div key={filter.key} className="flex flex-col gap-1.5">
                  <label htmlFor={`filter-${filter.key}`} className="text-xs font-medium text-[#B3B3B3]">
                    {filter.label}
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <select
                        id={`filter-${filter.key}`}
                        value={(values[filter.key] as string) ?? ''}
                        onChange={(e) => set(filter.key, e.target.value)}
                        className="w-full appearance-none rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 pr-8
                          text-sm text-white focus:border-[#FF6B00]/50 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 cursor-pointer"
                      >
                        <option value="">Sort by…</option>
                        {filter.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#555]" />
                    </div>
                    <button
                      type="button"
                      onClick={() => set(filter.directionKey, dir === 'asc' ? 'desc' : 'asc')}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A]
                        text-[#B3B3B3] hover:border-[#FF6B00]/40 hover:text-[#FF6B00] transition-colors"
                      aria-label={`Sort ${dir === 'asc' ? 'descending' : 'ascending'}`}
                      title={dir === 'asc' ? 'Sort descending' : 'Sort ascending'}
                    >
                      {dir === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
}
