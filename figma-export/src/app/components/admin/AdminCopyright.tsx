import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  FileText,
  Music,
  User,
  Calendar,
  Tag,
  Info,
  Trash2,
  Eye,
  Filter,
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
type CaseStatus = 'pending' | 'approved' | 'flagged' | 'removed' | 'clearance_requested';

interface RedFlag {
  type: string;
  description: string;
  severity: RiskLevel;
}

interface CopyrightCase {
  id: string;
  trackTitle: string;
  artistName: string;
  submittedBy: string;
  releaseDate: string;
  genre: string;
  notes: string;
  riskLevel: RiskLevel;
  riskScore: number;
  redFlags: RedFlag[];
  status: CaseStatus;
  decision?: string;
  analyzedAt: string;
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string; dot: string }> = {
  low:      { bg: 'bg-green-900/30',   text: 'text-green-300',   border: 'border-green-800/50',  dot: 'bg-green-400' },
  medium:   { bg: 'bg-yellow-900/30',  text: 'text-yellow-300',  border: 'border-yellow-800/50', dot: 'bg-yellow-400' },
  high:     { bg: 'bg-orange-900/30',  text: 'text-orange-300',  border: 'border-orange-800/50', dot: 'bg-orange-400' },
  critical: { bg: 'bg-red-900/30',     text: 'text-red-300',     border: 'border-red-800/50',    dot: 'bg-red-400' },
};

const STATUS_CONFIG: Record<CaseStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending:             { label: 'Pending Review',      icon: Clock,         color: 'text-yellow-300' },
  approved:            { label: 'Approved',            icon: CheckCircle,   color: 'text-green-300' },
  flagged:             { label: 'Flagged',             icon: AlertTriangle, color: 'text-orange-300' },
  removed:             { label: 'Removed',             icon: XCircle,       color: 'text-red-300' },
  clearance_requested: { label: 'Clearance Requested', icon: FileText,      color: 'text-[#00E5FF]' },
};

// Known phrases / patterns that are red flags
const SAMPLING_KEYWORDS = ['sample', 'remix', 'interpolat', 'replay', 'flip', 'chop', 'cover', 'bootleg', 'edit'];
const TITLE_RED_FLAGS   = ['unofficial', 'tribute', 'vs.', 'ft.', 'feat', 'karaoke', 'instrumental version'];

// Well-known copyrighted song fragments (illustrative)
const KNOWN_TITLES = [
  'blinding lights', 'shape of you', 'stay with me', 'happy', 'rolling in the deep',
  'thriller', 'billie jean', 'superstition', 'love story', 'smells like teen spirit',
  'bohemian rhapsody', 'hotel california', 'stairway to heaven', 'what a wonderful world',
];

function analyzeTrack(title: string, artist: string, notes: string, genre: string): { riskScore: number; riskLevel: RiskLevel; redFlags: RedFlag[] } {
  const flags: RedFlag[] = [];
  let score = 0;

  const titleLower  = title.toLowerCase();
  const notesLower  = notes.toLowerCase();
  const combined    = `${titleLower} ${notesLower}`;

  // 1. Sampling keywords in title or notes
  for (const kw of SAMPLING_KEYWORDS) {
    if (combined.includes(kw)) {
      flags.push({
        type: 'Sampling Reference',
        description: `Keyword "${kw}" found in title or notes — may indicate uncleared sample or derivative work.`,
        severity: 'high',
      });
      score += 25;
      break;
    }
  }

  // 2. Title similarity to known works
  for (const known of KNOWN_TITLES) {
    if (titleLower.includes(known) || known.includes(titleLower)) {
      flags.push({
        type: 'Title Similarity',
        description: `Track title "${title}" closely resembles the well-known copyrighted work "${known}".`,
        severity: 'critical',
      });
      score += 40;
      break;
    }
  }

  // 3. Title red-flag phrases
  for (const phrase of TITLE_RED_FLAGS) {
    if (titleLower.includes(phrase)) {
      flags.push({
        type: 'Derivative Title',
        description: `Title contains "${phrase}" which may indicate a cover, tribute, or unofficial version.`,
        severity: 'medium',
      });
      score += 20;
      break;
    }
  }

  // 4. Notes contain explicit credit to another artist/publisher
  if (/written by|composed by|produced by|originally by|©|℗|all rights reserved/i.test(notes)) {
    flags.push({
      type: 'Third-Party Credit',
      description: 'Notes reference a third-party creator or contain copyright symbols — verify ownership chain.',
      severity: 'high',
    });
    score += 30;
  }

  // 5. Artist name contains common aggregator abuse patterns
  if (/distrokid|tunecore|cdbaby|universal|sony|warner|emi|bmg/i.test(artist)) {
    flags.push({
      type: 'Label Name Misuse',
      description: 'Artist name contains a well-known distributor or major label name — possible impersonation.',
      severity: 'medium',
    });
    score += 15;
  }

  // 6. No flags at all
  if (flags.length === 0) {
    flags.push({
      type: 'No Automatic Flags',
      description: 'No automated red flags detected. Manual review is still recommended before final approval.',
      severity: 'low',
    });
  }

  score = Math.min(score, 100);

  const riskLevel: RiskLevel =
    score >= 70 ? 'critical' :
    score >= 45 ? 'high' :
    score >= 20 ? 'medium' : 'low';

  return { riskScore: score, riskLevel, redFlags: flags };
}

function generateDecisionTemplate(c: CopyrightCase): string {
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  if (c.riskLevel === 'low') {
    return `MODERATION DECISION — APPROVED
Date: ${now}
Track: "${c.trackTitle}" by ${c.artistName}
Risk Level: LOW (Score: ${c.riskScore}/100)

Decision: APPROVED FOR DISTRIBUTION

No copyright concerns were identified during automated and manual review.
The track is cleared for distribution across all selected platforms.

Reviewed by: [Admin Name]
Reference ID: ${c.id}`;
  }

  if (c.riskLevel === 'medium') {
    return `MODERATION DECISION — CLEARANCE REQUESTED
Date: ${now}
Track: "${c.trackTitle}" by ${c.artistName}
Risk Level: MEDIUM (Score: ${c.riskScore}/100)

Decision: DISTRIBUTION HOLD — CLEARANCE DOCUMENTATION REQUIRED

Red Flags Identified:
${c.redFlags.map((f) => `  • [${f.severity.toUpperCase()}] ${f.type}: ${f.description}`).join('\n')}

Required Actions:
  1. Artist must submit written proof of original authorship OR
  2. Submit a valid sampling/synchronisation licence from the rights holder.
  3. If this is a cover version, submit a mechanical licence (e.g. Harry Fox, DistroKid Cover Song Licensing).

Deadline: 14 days from this notice. Distribution will resume once documentation is verified.

Reviewed by: [Admin Name]
Reference ID: ${c.id}`;
  }

  if (c.riskLevel === 'high') {
    return `MODERATION DECISION — FLAGGED FOR LEGAL REVIEW
Date: ${now}
Track: "${c.trackTitle}" by ${c.artistName}
Risk Level: HIGH (Score: ${c.riskScore}/100)

Decision: DISTRIBUTION SUSPENDED — LEGAL REVIEW REQUIRED

Red Flags Identified:
${c.redFlags.map((f) => `  • [${f.severity.toUpperCase()}] ${f.type}: ${f.description}`).join('\n')}

Action Taken:
  - Track has been withheld from distribution pending legal review.
  - Artist notified via registered email.

Required from Artist:
  1. Full chain-of-title documentation.
  2. Sample clearance letters (if applicable) from original rights holder(s).
  3. Mechanical licence for any covered material.

Escalated to: Legal / Compliance team
Deadline for response: 7 days. Non-response will result in permanent removal.

Reviewed by: [Admin Name]
Reference ID: ${c.id}`;
  }

  // critical
  return `MODERATION DECISION — CONTENT REMOVED
Date: ${now}
Track: "${c.trackTitle}" by ${c.artistName}
Risk Level: CRITICAL (Score: ${c.riskScore}/100)

Decision: IMMEDIATE REMOVAL — POTENTIAL COPYRIGHT INFRINGEMENT

Red Flags Identified:
${c.redFlags.map((f) => `  • [${f.severity.toUpperCase()}] ${f.type}: ${f.description}`).join('\n')}

Action Taken:
  - Track has been removed from all active distributions immediately.
  - DMCA / Copyright strike issued to artist account.
  - Incident logged for audit trail.

Artist Notification:
  "Your track "${c.trackTitle}" has been removed due to a high-probability copyright infringement
   determination. Continued violations may result in account suspension. You may appeal this
   decision within 30 days by submitting full rights documentation to legal@amtdistro.com."

Appeal Window: 30 days from this notice.
Escalated to: Senior Legal Officer

Reviewed by: [Admin Name]
Reference ID: ${c.id}`;
}

// ─── Form default ─────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  trackTitle: '',
  artistName: '',
  submittedBy: '',
  releaseDate: '',
  genre: '',
  notes: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminCopyright() {
  const { hasPermission } = useAdmin();
  const canModerate = hasPermission('releases.approve');

  const [cases, setCases] = useState<CopyrightCase[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<CaseStatus | 'all'>('all');
  const [filterRisk, setFilterRisk] = useState<RiskLevel | 'all'>('all');
  const [decisionText, setDecisionText] = useState<Record<string, string>>({});
  const [savingDecision, setSavingDecision] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  }

  function handleAnalyze() {
    if (!form.trackTitle.trim() || !form.artistName.trim()) return;
    const { riskScore, riskLevel, redFlags } = analyzeTrack(
      form.trackTitle,
      form.artistName,
      form.notes,
      form.genre,
    );
    const now = new Date().toISOString();
    const newCase: CopyrightCase = {
      id: `CPR-${Date.now().toString(36).toUpperCase()}`,
      trackTitle: form.trackTitle.trim(),
      artistName: form.artistName.trim(),
      submittedBy: form.submittedBy.trim() || 'Unknown',
      releaseDate: form.releaseDate || now.slice(0, 10),
      genre: form.genre || 'Unknown',
      notes: form.notes.trim(),
      riskScore,
      riskLevel,
      redFlags,
      status: riskLevel === 'low' ? 'approved' : riskLevel === 'critical' ? 'removed' : 'pending',
      analyzedAt: now,
      updatedAt: now,
    };
    setCases((prev) => [newCase, ...prev]);
    setExpandedId(newCase.id);
    setForm({ ...EMPTY_FORM });
    setShowForm(false);
    flash(`Analysis complete — Risk: ${riskLevel.toUpperCase()} (${riskScore}/100)`);
  }

  function handleStatusChange(id: string, status: CaseStatus) {
    setCases((prev) => prev.map((c) => c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c));
  }

  function saveDecision(caseObj: CopyrightCase) {
    setSavingDecision(caseObj.id);
    setTimeout(() => {
      setCases((prev) => prev.map((c) =>
        c.id === caseObj.id ? { ...c, decision: decisionText[caseObj.id] ?? generateDecisionTemplate(caseObj), updatedAt: new Date().toISOString() } : c
      ));
      setSavingDecision(null);
      flash('Decision saved.');
    }, 400);
  }

  function copyTemplate(caseObj: CopyrightCase) {
    const text = decisionText[caseObj.id] ?? generateDecisionTemplate(caseObj);
    navigator.clipboard.writeText(text);
    setCopiedId(caseObj.id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  const filtered = useMemo(() => cases.filter((c) => {
    const matchSearch = !search || c.trackTitle.toLowerCase().includes(search.toLowerCase()) || c.artistName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchRisk   = filterRisk === 'all' || c.riskLevel === filterRisk;
    return matchSearch && matchStatus && matchRisk;
  }), [cases, search, filterStatus, filterRisk]);

  const stats = useMemo(() => ({
    total:    cases.length,
    pending:  cases.filter((c) => c.status === 'pending').length,
    critical: cases.filter((c) => c.riskLevel === 'critical').length,
    approved: cases.filter((c) => c.status === 'approved').length,
  }), [cases]);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-[#00E5FF]" />
            Copyright Management
          </h1>
          <p className="text-[#A0A7B8] mt-1">
            Analyze uploaded tracks for copyright risks, flag issues, and generate moderation decisions.
          </p>
        </div>
        {canModerate && (
          <button
            onClick={() => { setShowForm((v) => !v); setForm({ ...EMPTY_FORM }); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#7B61FF] text-white rounded-lg hover:bg-[#6a52e0] transition font-medium whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Analyze Track
          </button>
        )}
      </div>

      {/* Flash */}
      {successMsg && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-900/30 border border-green-700/50 text-green-300 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Cases',     value: stats.total,    color: 'text-white',         icon: FileText },
          { label: 'Pending Review',  value: stats.pending,  color: 'text-yellow-300',    icon: Clock },
          { label: 'Critical Risk',   value: stats.critical, color: 'text-red-400',       icon: AlertTriangle },
          { label: 'Approved',        value: stats.approved, color: 'text-green-300',     icon: CheckCircle },
        ].map((s) => (
          <div key={s.label} className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-[#6D7385] uppercase tracking-wider font-semibold">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Analyze Form */}
      {showForm && (
        <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-6">
          <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
            <Search className="w-5 h-5 text-[#7B61FF]" />
            Submit Track for Copyright Analysis
          </h2>
          <p className="text-[#6D7385] text-sm mb-6">
            Paste the track details below. The system will score the submission for potential copyright risks and generate a moderation decision template.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-[#B3B3B3] mb-1">
                Track Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.trackTitle}
                onChange={(e) => setForm((f) => ({ ...f, trackTitle: e.target.value }))}
                placeholder="e.g. Blinding Lights (Remix)"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1525] border border-[#7B61FF]/20 placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#B3B3B3] mb-1">
                Artist Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.artistName}
                onChange={(e) => setForm((f) => ({ ...f, artistName: e.target.value }))}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1525] border border-[#7B61FF]/20 placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#B3B3B3] mb-1">Submitted By (User Email / ID)</label>
              <input
                type="text"
                value={form.submittedBy}
                onChange={(e) => setForm((f) => ({ ...f, submittedBy: e.target.value }))}
                placeholder="e.g. user@example.com"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1525] border border-[#7B61FF]/20 placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#B3B3B3] mb-1">Release Date</label>
              <input
                type="date"
                value={form.releaseDate}
                onChange={(e) => setForm((f) => ({ ...f, releaseDate: e.target.value }))}
                title="Release date"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1525] border border-[#7B61FF]/20 focus:ring-2 focus:ring-[#7B61FF] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#B3B3B3] mb-1">Genre</label>
              <select
                value={form.genre}
                onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
                title="Genre"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1525] border border-[#7B61FF]/20 focus:ring-2 focus:ring-[#7B61FF] outline-none"
              >
                <option value="">— Select Genre —</option>
                {['Afrobeats', 'Afropop', 'Hip Hop', 'R&B', 'Pop', 'Electronic', 'Gospel', 'Reggae', 'Dancehall', 'Classical', 'Jazz', 'Rock', 'Other'].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#B3B3B3] mb-1">
                Additional Metadata / Notes
                <span className="ml-1 text-[#6D7385] font-normal">(credits, samples, cover info, producer, composer…)</span>
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={4}
                placeholder="e.g. 'Sample from The Weeknd – Blinding Lights. Written by Abel Tesfaye, Max Martin. Produced by Metro Boomin.'"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0F1525] border border-[#7B61FF]/20 placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleAnalyze}
              disabled={!form.trackTitle.trim() || !form.artistName.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-[#7B61FF] text-white rounded-lg hover:bg-[#6a52e0] transition font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShieldAlert className="w-4 h-4" />
              Run Copyright Analysis
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex items-center gap-2 px-5 py-2 bg-white/5 text-[#A0A7B8] rounded-lg hover:bg-white/10 transition"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      {cases.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6D7385]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by track or artist..."
              className="w-full pl-10 pr-3 py-2 rounded-lg text-sm text-white bg-[#121826] border border-[#7B61FF]/20 placeholder-[#6D7385] focus:ring-2 focus:ring-[#7B61FF] outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#6D7385]" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as CaseStatus | 'all')}
              title="Filter by status"
              className="px-3 py-2 rounded-lg text-sm text-white bg-[#121826] border border-[#7B61FF]/20 focus:ring-2 focus:ring-[#7B61FF] outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="flagged">Flagged</option>
              <option value="clearance_requested">Clearance Requested</option>
              <option value="removed">Removed</option>
            </select>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value as RiskLevel | 'all')}
              title="Filter by risk level"
              className="px-3 py-2 rounded-lg text-sm text-white bg-[#121826] border border-[#7B61FF]/20 focus:ring-2 focus:ring-[#7B61FF] outline-none"
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
      )}

      {/* Empty state */}
      {cases.length === 0 && !showForm && (
        <div className="text-center py-20 bg-[#121826] rounded-xl border border-[#7B61FF]/20">
          <ShieldAlert className="w-14 h-14 text-[#7B61FF]/30 mx-auto mb-4" />
          <p className="text-white font-semibold text-lg mb-1">No copyright cases yet</p>
          <p className="text-[#6D7385] text-sm mb-6 max-w-sm mx-auto">
            Use "Analyze Track" to submit a track for copyright risk analysis and generate a moderation decision.
          </p>
          {canModerate && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B61FF] text-white rounded-lg hover:bg-[#6a52e0] transition font-medium"
            >
              <Plus className="w-4 h-4" />
              Analyze First Track
            </button>
          )}
        </div>
      )}

      {/* Case list */}
      <div className="space-y-4">
        {filtered.map((c) => {
          const risk = RISK_COLORS[c.riskLevel];
          const status = STATUS_CONFIG[c.status];
          const StatusIcon = status.icon;
          const isExpanded = expandedId === c.id;
          const template = decisionText[c.id] ?? generateDecisionTemplate(c);

          return (
            <div key={c.id} className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 overflow-hidden">
              {/* Case row */}
              <div
                className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : c.id)}
              >
                {/* Risk badge */}
                <div className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${risk.bg} ${risk.text} ${risk.border}`}>
                  <span className={`w-2 h-2 rounded-full ${risk.dot}`} />
                  {c.riskLevel.toUpperCase()}
                  <span className="opacity-70 font-normal">·{c.riskScore}/100</span>
                </div>

                {/* Track info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Music className="w-3.5 h-3.5 text-[#6D7385] flex-shrink-0" />
                    <span className="font-semibold text-white truncate">{c.trackTitle}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-[#A0A7B8]">
                      <User className="w-3 h-3" />{c.artistName}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[#6D7385]">
                      <Tag className="w-3 h-3" />{c.genre}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[#6D7385]">
                      <Calendar className="w-3 h-3" />{c.releaseDate}
                    </span>
                    <span className="text-xs text-[#6D7385] font-mono">{c.id}</span>
                  </div>
                </div>

                {/* Status */}
                <div className={`flex items-center gap-1.5 text-xs font-medium ${status.color} flex-shrink-0`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {status.label}
                </div>

                {/* Expand toggle */}
                <div className="flex-shrink-0 text-[#6D7385]">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-[#7B61FF]/10 px-5 py-5 space-y-6">

                  {/* Red flags */}
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-400" />
                      Risk Analysis · {c.redFlags.length} flag{c.redFlags.length !== 1 ? 's' : ''} detected
                    </h3>
                    <div className="space-y-2">
                      {c.redFlags.map((flag, i) => {
                        const fr = RISK_COLORS[flag.severity];
                        return (
                          <div key={i} className={`rounded-lg p-3 border ${fr.bg} ${fr.border}`}>
                            <div className="flex items-start gap-2">
                              <span className={`mt-0.5 flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${fr.bg} ${fr.text} ${fr.border} border uppercase tracking-wide`}>
                                {flag.severity}
                              </span>
                              <div>
                                <p className={`text-sm font-semibold ${fr.text}`}>{flag.type}</p>
                                <p className="text-xs text-[#A0A7B8] mt-0.5">{flag.description}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes submitted */}
                  {c.notes && (
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-[#6D7385]" />
                        Submitted Notes
                      </h3>
                      <p className="text-sm text-[#A0A7B8] bg-[#0F1525] rounded-lg p-3 border border-[#7B61FF]/10 whitespace-pre-wrap">{c.notes}</p>
                    </div>
                  )}

                  {/* Status control */}
                  {canModerate && (
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Eye className="w-4 h-4 text-[#7B61FF]" />
                        Moderation Status
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(STATUS_CONFIG) as CaseStatus[]).map((s) => {
                          const sc = STATUS_CONFIG[s];
                          const Ico = sc.icon;
                          return (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(c.id, s)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                                c.status === s
                                  ? 'bg-[#7B61FF]/20 text-[#7B61FF] border-[#7B61FF]/40'
                                  : 'bg-white/5 text-[#A0A7B8] border-white/10 hover:bg-white/10'
                              }`}
                            >
                              <Ico className="w-3 h-3" />
                              {sc.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Decision template */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#00E5FF]" />
                        Moderation Decision Template
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyTemplate(c)}
                          className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg bg-white/5 text-[#A0A7B8] hover:bg-white/10 border border-white/10 transition"
                        >
                          {copiedId === c.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                          {copiedId === c.id ? 'Copied!' : 'Copy'}
                        </button>
                        {canModerate && (
                          <button
                            onClick={() => saveDecision(c)}
                            disabled={savingDecision === c.id}
                            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg bg-[#7B61FF] text-white hover:bg-[#6a52e0] border border-[#7B61FF]/40 transition disabled:opacity-50"
                          >
                            {savingDecision === c.id ? 'Saving…' : 'Save Decision'}
                          </button>
                        )}
                      </div>
                    </div>
                    <textarea
                      value={decisionText[c.id] ?? template}
                      onChange={(e) => setDecisionText((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      rows={14}
                      title="Moderation decision text"
                      aria-label="Moderation decision template — edit before saving"
                      className="w-full px-4 py-3 rounded-lg text-xs font-mono text-[#A0A7B8] bg-[#0B0F1A] border border-[#7B61FF]/15 focus:ring-1 focus:ring-[#7B61FF] outline-none resize-y leading-relaxed"
                      spellCheck={false}
                    />
                    <p className="text-[10px] text-[#6D7385] mt-1.5">Edit the template above, then copy or save it as the final decision for this case.</p>
                  </div>

                  {/* Delete */}
                  {canModerate && (
                    <div className="flex justify-end pt-2 border-t border-[#7B61FF]/10">
                      {deleteConfirmId === c.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-300">Remove this case?</span>
                          <button
                            onClick={() => { setCases((prev) => prev.filter((x) => x.id !== c.id)); setDeleteConfirmId(null); setExpandedId(null); }}
                            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-3 py-1 text-xs bg-white/10 text-[#A0A7B8] rounded hover:bg-white/20"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(c.id)}
                          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Case
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {cases.length > 0 && filtered.length === 0 && (
          <div className="text-center py-12 text-[#6D7385] text-sm">
            No cases match your current filters.
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-[#0F1525] border border-[#7B61FF]/20 rounded-lg p-5 text-sm">
        <p className="font-semibold text-white mb-2 flex items-center gap-2">
          <Info className="w-4 h-4 text-[#00E5FF]" />
          How Copyright Analysis Works
        </p>
        <ul className="list-disc list-inside space-y-1.5 text-[#A0A7B8]">
          <li><strong className="text-white">Title Similarity</strong> — Checks against a list of well-known copyrighted works for close title matches.</li>
          <li><strong className="text-white">Sampling Detection</strong> — Scans for keywords like "sample", "remix", "cover", "interpolation" in the title and metadata notes.</li>
          <li><strong className="text-white">Third-Party Credits</strong> — Detects "Written by", "Originally by", or © symbols in notes that indicate another rights holder.</li>
          <li><strong className="text-white">Label/Distributor Misuse</strong> — Flags artist names that impersonate major labels or distributors.</li>
          <li><strong className="text-white">Risk Score</strong> — A 0–100 score derived from flag severities. Low (&lt;20), Medium (20–44), High (45–69), Critical (70+).</li>
          <li><strong className="text-white">Decision Templates</strong> — Auto-generated per risk level (Approval, Clearance Request, Legal Review, Removal). Fully editable before saving or sending.</li>
        </ul>
      </div>
    </div>
  );
}
