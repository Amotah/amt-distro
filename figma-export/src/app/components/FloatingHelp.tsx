import { useEffect, useRef, useState } from 'react';
import {
  HelpCircle,
  X,
  Minus,
  Search,
  MessageCircle,
  Bug,
  Lightbulb,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

interface FloatingHelpProps {
  /** Called when the user clicks "Chat with support" */
  onOpenChat?: () => void;
  /** Called when "Report bug" is clicked — passes the form data */
  onReportBug?: (data: { description: string }) => void;
  /** Called when "Request feature" is clicked — passes the form data */
  onRequestFeature?: (data: { description: string }) => void;
}

type HelpView = 'menu' | 'search' | 'report-bug' | 'request-feature';

const KB_ARTICLES = [
  { id: 1, title: 'How to upload your first release', category: 'Upload' },
  { id: 2, title: 'ISRC codes — what they are and how they work', category: 'Metadata' },
  { id: 3, title: 'Understanding your royalty earnings', category: 'Earnings' },
  { id: 4, title: 'How to create a Smart Link', category: 'Smart Links' },
  { id: 5, title: 'Distribution platforms and delivery times', category: 'Distribution' },
  { id: 6, title: 'Setting up your payout method', category: 'Payments' },
  { id: 7, title: 'How to dispute a royalty statement', category: 'Disputes' },
  { id: 8, title: 'Upgrading or changing your plan', category: 'Account' },
];

export function FloatingHelp({ onOpenChat, onReportBug, onRequestFeature }: FloatingHelpProps) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [view, setView] = useState<HelpView>('menu');
  const [kbQuery, setKbQuery] = useState('');
  const [bugText, setBugText] = useState('');
  const [featureText, setFeatureText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredArticles = KB_ARTICLES.filter(
    (a) =>
      !kbQuery.trim() ||
      a.title.toLowerCase().includes(kbQuery.toLowerCase()) ||
      a.category.toLowerCase().includes(kbQuery.toLowerCase()),
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus search when switching to search view
  useEffect(() => {
    if (view === 'search') {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [view]);

  const handleOpen = () => {
    setOpen(true);
    setMinimized(false);
    setView('menu');
    setSubmitted(false);
  };

  const handleClose = () => {
    setOpen(false);
    setView('menu');
    setSubmitted(false);
    setKbQuery('');
    setBugText('');
    setFeatureText('');
  };

  const handleSubmitBug = () => {
    if (!bugText.trim()) return;
    onReportBug?.({ description: bugText.trim() });
    setSubmitted(true);
    setBugText('');
  };

  const handleSubmitFeature = () => {
    if (!featureText.trim()) return;
    onRequestFeature?.({ description: featureText.trim() });
    setSubmitted(true);
    setFeatureText('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3" ref={panelRef}>
      {/* Panel */}
      {open && !minimized && (
        <div
          className="w-80 rounded-2xl border border-[#FF6B00]/20 bg-[#161616] shadow-2xl overflow-hidden
            animate-in slide-in-from-bottom-4 fade-in-0 duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Help &amp; Support"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-[#FF6B00] to-[#FFD600] px-4 py-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-[#0A0A0A]" />
              <span className="font-semibold text-sm text-[#0A0A0A]">Help &amp; Support</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized(true)}
                className="rounded p-1 text-[#0A0A0A]/70 hover:text-[#0A0A0A] hover:bg-black/10 transition-colors"
                aria-label="Minimize help panel"
                title="Minimize"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleClose}
                className="rounded p-1 text-[#0A0A0A]/70 hover:text-[#0A0A0A] hover:bg-black/10 transition-colors"
                aria-label="Close help panel"
                title="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[420px] overflow-y-auto">
            {/* ── MENU VIEW ─────────────────────────────────────────────── */}
            {view === 'menu' && (
              <div className="p-4 space-y-2">
                <p className="text-xs text-[#B3B3B3] mb-3">How can we help you today?</p>

                {[
                  {
                    icon: Search,
                    label: 'Search knowledge base',
                    desc: 'Browse articles and guides',
                    action: () => setView('search'),
                  },
                  {
                    icon: MessageCircle,
                    label: 'Chat with support',
                    desc: 'Typically replies in minutes',
                    action: () => { onOpenChat?.(); handleClose(); },
                    badge: 'Online',
                  },
                  {
                    icon: Bug,
                    label: 'Report a bug',
                    desc: 'Something not working right?',
                    action: () => { setView('report-bug'); setSubmitted(false); },
                  },
                  {
                    icon: Lightbulb,
                    label: 'Request a feature',
                    desc: 'Share your ideas with us',
                    action: () => { setView('request-feature'); setSubmitted(false); },
                  },
                ].map(({ icon: Icon, label, desc, action, badge }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="flex w-full items-center gap-3 rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-3 text-left
                      hover:border-[#FF6B00]/30 hover:bg-[#FF6B00]/5 transition-all group"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FF6B00]/10 group-hover:bg-[#FF6B00]/20 transition-colors">
                      <Icon className="h-4 w-4 text-[#FF6B00]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{label}</span>
                        {badge && (
                          <span className="rounded-full bg-[#1DB954]/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#1DB954]">
                            {badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#B3B3B3] truncate">{desc}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#555] group-hover:text-[#FF6B00] transition-colors" />
                  </button>
                ))}
              </div>
            )}

            {/* ── KB SEARCH VIEW ────────────────────────────────────────── */}
            {view === 'search' && (
              <div className="p-4 space-y-3">
                <button
                  onClick={() => setView('menu')}
                  className="flex items-center gap-1 text-xs text-[#B3B3B3] hover:text-[#FF6B00] transition-colors"
                >
                  ← Back
                </button>
                <div className="flex items-center gap-2 rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2">
                  <Search className="h-3.5 w-3.5 shrink-0 text-[#B3B3B3]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={kbQuery}
                    onChange={(e) => setKbQuery(e.target.value)}
                    placeholder="Search articles…"
                    className="flex-1 bg-transparent text-sm text-white placeholder-[#555] focus:outline-none"
                    aria-label="Search knowledge base"
                  />
                  {kbQuery && (
                    <button onClick={() => setKbQuery('')} className="text-[#555] hover:text-[#B3B3B3]" aria-label="Clear">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {filteredArticles.length === 0 ? (
                    <p className="py-4 text-center text-sm text-[#B3B3B3]">No results for &ldquo;{kbQuery}&rdquo;</p>
                  ) : (
                    filteredArticles.map((a) => (
                      <button
                        key={a.id}
                        className="flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-[#FF6B00]/8 transition-colors group"
                        onClick={() => { /* In production, navigate to KB article */ }}
                      >
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#555] group-hover:text-[#FF6B00]" />
                        <div className="min-w-0">
                          <p className="text-sm text-white leading-snug">{a.title}</p>
                          <span className="text-[10px] text-[#B3B3B3]">{a.category}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── REPORT BUG VIEW ───────────────────────────────────────── */}
            {view === 'report-bug' && (
              <div className="p-4 space-y-3">
                <button
                  onClick={() => { setView('menu'); setSubmitted(false); }}
                  className="flex items-center gap-1 text-xs text-[#B3B3B3] hover:text-[#FF6B00] transition-colors"
                >
                  ← Back
                </button>
                <div className="flex items-center gap-2 mb-1">
                  <Bug className="h-4 w-4 text-red-400" />
                  <span className="font-semibold text-white text-sm">Report a Bug</span>
                </div>
                {submitted ? (
                  <div className="rounded-xl border border-[#1DB954]/30 bg-[#1DB954]/10 p-4 text-center">
                    <p className="text-sm font-medium text-[#1DB954]">Bug reported!</p>
                    <p className="mt-1 text-xs text-[#B3B3B3]">Thank you. We&apos;ll investigate and follow up.</p>
                    <button
                      onClick={() => { setView('menu'); setSubmitted(false); }}
                      className="mt-3 text-xs text-[#FF6B00] hover:underline"
                    >Back to Help</button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-[#B3B3B3]">Describe what happened and how to reproduce it.</p>
                    <textarea
                      value={bugText}
                      onChange={(e) => setBugText(e.target.value)}
                      placeholder="e.g. When I click 'Upload', the page shows an error…"
                      rows={4}
                      className="w-full resize-none rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#FF6B00]/50 focus:outline-none"
                      aria-label="Bug description"
                    />
                    <button
                      onClick={handleSubmitBug}
                      disabled={!bugText.trim()}
                      className="w-full rounded-lg bg-[#FF6B00] py-2 text-sm font-semibold text-white
                        hover:bg-[#FF6B00]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Submit Report
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── REQUEST FEATURE VIEW ──────────────────────────────────── */}
            {view === 'request-feature' && (
              <div className="p-4 space-y-3">
                <button
                  onClick={() => { setView('menu'); setSubmitted(false); }}
                  className="flex items-center gap-1 text-xs text-[#B3B3B3] hover:text-[#FF6B00] transition-colors"
                >
                  ← Back
                </button>
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="h-4 w-4 text-[#FFD600]" />
                  <span className="font-semibold text-white text-sm">Request a Feature</span>
                </div>
                {submitted ? (
                  <div className="rounded-xl border border-[#1DB954]/30 bg-[#1DB954]/10 p-4 text-center">
                    <p className="text-sm font-medium text-[#1DB954]">Idea received!</p>
                    <p className="mt-1 text-xs text-[#B3B3B3]">We love feedback — our team will review your idea.</p>
                    <button
                      onClick={() => { setView('menu'); setSubmitted(false); }}
                      className="mt-3 text-xs text-[#FF6B00] hover:underline"
                    >Back to Help</button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-[#B3B3B3]">What feature would improve your experience?</p>
                    <textarea
                      value={featureText}
                      onChange={(e) => setFeatureText(e.target.value)}
                      placeholder="e.g. I'd love a bulk-edit tool for track metadata…"
                      rows={4}
                      className="w-full resize-none rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#FF6B00]/50 focus:outline-none"
                      aria-label="Feature request description"
                    />
                    <button
                      onClick={handleSubmitFeature}
                      disabled={!featureText.trim()}
                      className="w-full rounded-lg bg-gradient-to-r from-[#FF6B00] to-[#FFD600] py-2 text-sm font-semibold text-[#0A0A0A]
                        hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                    >
                      Submit Idea
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Minimized strip */}
      {open && minimized && (
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FFD600] px-4 py-2 shadow-lg
            hover:opacity-90 transition-opacity animate-in slide-in-from-bottom-2 fade-in-0 duration-150"
          aria-label="Restore help panel"
        >
          <HelpCircle className="h-4 w-4 text-[#0A0A0A]" />
          <span className="text-xs font-semibold text-[#0A0A0A]">Help</span>
        </button>
      )}

      {/* FAB */}
      {!open && (
        <button
          onClick={handleOpen}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FFD600] shadow-lg
            hover:scale-110 hover:shadow-[0_0_20px_rgba(255,107,0,0.4)] active:scale-95 transition-all duration-200"
          aria-label="Open help menu"
          title="Help &amp; Support"
        >
          <HelpCircle className="h-6 w-6 text-white" />
        </button>
      )}
    </div>
  );
}
