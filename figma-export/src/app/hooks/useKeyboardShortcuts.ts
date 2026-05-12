/**
 * useKeyboardShortcuts — attaches global keyboard shortcuts to the document.
 *
 * Supported shortcuts:
 *   /          → focus the element with data-search-input or id="search-input"
 *   ?          → toggle keyboard shortcuts modal (calls onToggleShortcuts)
 *   g then h   → go to home / dashboard
 *   g then r   → go to releases
 *   g then a   → go to analytics
 *   g then e   → go to earnings
 *   g then u   → go to upload
 *   Escape     → call onEscape (close modals / menus)
 *
 * Usage:
 *   useKeyboardShortcuts({
 *     onToggleShortcuts,
 *     onEscape,
 *     onNavigate,            // (path: string) => void
 *     searchInputRef,        // RefObject<HTMLInputElement>
 *     disabled,              // skip when an input/textarea is focused
 *   });
 */
import { useCallback, useEffect, useRef } from 'react';

interface UseKeyboardShortcutsOptions {
  onToggleShortcuts?: () => void;
  onEscape?: () => void;
  /** Called with an absolute path when a "go to" shortcut fires */
  onNavigate?: (path: string) => void;
  /** Ref to the search input to focus with "/" */
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
}

/** Returns true if the currently focused element is a text input */
function isFocusedOnInput(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    (el as HTMLElement).isContentEditable
  );
}

const GO_PATHS: Record<string, string> = {
  h: '/dashboard',
  r: '/dashboard/releases',
  a: '/dashboard/analytics',
  e: '/dashboard/earnings',
  u: '/dashboard/upload',
};

export function useKeyboardShortcuts({
  onToggleShortcuts,
  onEscape,
  onNavigate,
  searchInputRef,
  disabled = false,
}: UseKeyboardShortcutsOptions) {
  // Track "g" prefix for two-key shortcuts
  const gPending = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearG = useCallback(() => {
    gPending.current = false;
    if (gTimer.current) {
      clearTimeout(gTimer.current);
      gTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (disabled) return;

    const handler = (e: KeyboardEvent) => {
      // Never intercept when meta/ctrl is held (browser shortcuts)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key;

      // ── Escape ──────────────────────────────────────────────────────────
      if (key === 'Escape') {
        clearG();
        onEscape?.();
        return;
      }

      // ── "g + x" two-key navigation shortcuts ────────────────────────────
      if (gPending.current) {
        clearG();
        const path = GO_PATHS[key.toLowerCase()];
        if (path && onNavigate && !isFocusedOnInput()) {
          e.preventDefault();
          onNavigate(path);
        }
        return;
      }

      if (key === 'g' && !isFocusedOnInput()) {
        e.preventDefault();
        gPending.current = true;
        // Auto-clear "g pending" after 1 s if no second key pressed
        gTimer.current = setTimeout(() => { gPending.current = false; }, 1000);
        return;
      }

      // ── "/" → focus search ───────────────────────────────────────────────
      if (key === '/' && !isFocusedOnInput()) {
        e.preventDefault();
        // Try explicit ref first
        if (searchInputRef?.current) {
          searchInputRef.current.focus();
          return;
        }
        // Fall back to data attribute
        const el =
          (document.querySelector('[data-search-input]') as HTMLInputElement | null) ??
          (document.getElementById('search-input') as HTMLInputElement | null);
        el?.focus();
        return;
      }

      // ── "?" → toggle shortcuts modal ────────────────────────────────────
      if (key === '?' && !isFocusedOnInput()) {
        e.preventDefault();
        onToggleShortcuts?.();
        return;
      }
    };

    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      clearG();
    };
  }, [disabled, onToggleShortcuts, onEscape, onNavigate, searchInputRef, clearG]);
}
