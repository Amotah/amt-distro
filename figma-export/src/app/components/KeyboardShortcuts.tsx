/**
 * KeyboardShortcuts — modal showing all platform keyboard shortcuts.
 * Open via: "?" key (handled by the parent via useKeyboardShortcuts hook).
 */
import { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    heading: 'Navigation',
    shortcuts: [
      { keys: ['g', 'h'], label: 'Go to Home / Dashboard' },
      { keys: ['g', 'r'], label: 'Go to Releases' },
      { keys: ['g', 'a'], label: 'Go to Analytics' },
      { keys: ['g', 'e'], label: 'Go to Earnings' },
      { keys: ['g', 'u'], label: 'Go to Upload' },
    ],
  },
  {
    heading: 'Global',
    shortcuts: [
      { keys: ['/'], label: 'Focus search bar' },
      { keys: ['?'], label: 'Show keyboard shortcuts' },
      { keys: ['Esc'], label: 'Close modals / menus' },
    ],
  },
  {
    heading: 'Tables & Lists',
    shortcuts: [
      { keys: ['↑', '↓'], label: 'Navigate rows' },
      { keys: ['Enter'], label: 'Open selected item' },
      { keys: ['Space'], label: 'Select / activate item' },
    ],
  },
  {
    heading: 'Accessibility',
    shortcuts: [
      { keys: ['Tab'], label: 'Move to next element' },
      { keys: ['Shift', 'Tab'], label: 'Move to previous element' },
      { keys: ['Enter'], label: 'Activate button' },
    ],
  },
];

export function KeyboardShortcuts({ open, onClose }: KeyboardShortcutsProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Trap scroll on mount
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kbd-shortcuts-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in-0 duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-[#FF6B00]/20 bg-[#161616] shadow-2xl
        animate-in zoom-in-95 fade-in-0 duration-200 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#FF6B00]/10 bg-[#161616] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6B00]/10">
              <Keyboard className="h-4 w-4 text-[#FF6B00]" />
            </div>
            <div>
              <h2 id="kbd-shortcuts-title" className="font-bold text-white text-base">Keyboard Shortcuts</h2>
              <p className="text-xs text-[#B3B3B3]">Use these shortcuts to navigate faster</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[#B3B3B3] hover:bg-[#FF6B00]/10 hover:text-white transition-colors"
            aria-label="Close keyboard shortcuts"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Shortcut groups */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.heading}>
              <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#FF6B00]">
                {group.heading}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map(({ keys, label }) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-[#D6D6D6]">{label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {keys.map((key, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <kbd
                            className="inline-flex items-center justify-center rounded-md border border-[#FF6B00]/20 bg-[#0A0A0A]
                              px-2 py-0.5 text-[11px] font-mono font-medium text-[#B3B3B3] shadow-sm min-w-[1.6rem]"
                          >
                            {key}
                          </kbd>
                          {i < keys.length - 1 && (
                            <span className="text-[10px] text-[#555]">then</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="border-t border-[#FF6B00]/10 px-6 py-3 text-center">
          <p className="text-xs text-[#555]">
            Press <kbd className="rounded border border-[#FF6B00]/20 bg-[#0A0A0A] px-1.5 py-0.5 text-[10px] font-mono text-[#B3B3B3]">?</kbd> anytime to show this panel
          </p>
        </div>
      </div>
    </div>
  );
}
