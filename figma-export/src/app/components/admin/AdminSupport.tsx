import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  LifeBuoy,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  getAdminSupportStats,
  getAdminSupportTicket,
  getAdminSupportTickets,
  replyToAdminSupportTicket,
  updateAdminSupportTicket,
  type SupportPriority,
  type SupportStatus,
  type SupportTicket,
  type SupportTicketStats,
} from '../../utils/support-api';

const STATUS_OPTIONS: Array<{ value: 'all' | SupportStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_on_user', label: 'Waiting on User' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const PRIORITY_OPTIONS: Array<{ value: 'all' | SupportPriority; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const STATUS_LABELS: Record<SupportStatus, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  in_progress: 'In Progress',
  waiting_on_user: 'Waiting on User',
  resolved: 'Resolved',
  closed: 'Closed',
};

const STATUS_STYLES: Record<SupportStatus, { color: string; bg: string }> = {
  open: { color: '#FDBA74', bg: 'rgba(249,115,22,0.12)' },
  acknowledged: { color: '#67E8F9', bg: 'rgba(6,182,212,0.12)' },
  in_progress: { color: '#FDE047', bg: 'rgba(234,179,8,0.12)' },
  waiting_on_user: { color: '#C4B5FD', bg: 'rgba(168,85,247,0.12)' },
  resolved: { color: '#4ADE80', bg: 'rgba(34,197,94,0.12)' },
  closed: { color: '#94A3B8', bg: 'rgba(100,116,139,0.12)' },
};

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function priorityLabel(value: SupportPriority) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function statusBadge(status: SupportStatus) {
  const meta = STATUS_STYLES[status] || STATUS_STYLES.open;
  return (
    <span 
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" 
      style={{ backgroundColor: meta.bg, color: meta.color }}
      role="status"
    >
      <Clock3 className="h-3 w-3" />
      {STATUS_LABELS[status]}
    </span>
  );
}

function categoryLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

export function AdminSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<SupportTicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SupportStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | SupportPriority>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    status: 'open' as SupportStatus,
    priority: 'normal' as SupportPriority,
    adminNotes: '',
    reply: '',
  });

  const loadSupport = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [ticketResult, statsResult] = await Promise.all([getAdminSupportTickets(), getAdminSupportStats()]);
      setTickets(ticketResult);
      setStats(statsResult);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load support queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadSupport();
  }, []);

  const filteredTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesQuery = !normalizedQuery || [ticket.srNumber, ticket.subject, ticket.message, ticket.userName, ticket.userEmail].join(' ').toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
      return matchesQuery && matchesStatus && matchesPriority;
    });
  }, [priorityFilter, query, statusFilter, tickets]);

  const openTicket = async (ticketId: string) => {
    try {
      const ticket = await getAdminSupportTicket(ticketId);
      setSelectedTicket(ticket);
      setDraft({
        status: ticket.status,
        priority: ticket.priority,
        adminNotes: ticket.adminNotes || '',
        reply: '',
      });
      setDetailOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to open ticket');
    }
  };

  const handleSave = async () => {
    if (!selectedTicket) {
      return;
    }

    try {
      setSaving(true);
      const updated = await updateAdminSupportTicket(selectedTicket.id, {
        status: draft.status,
        priority: draft.priority,
        adminNotes: draft.adminNotes,
      });

      let finalTicket = updated;
      if (draft.reply.trim()) {
        finalTicket = await replyToAdminSupportTicket(selectedTicket.id, draft.reply.trim());
      }

      setSelectedTicket(finalTicket);
      setDraft((current) => ({ ...current, reply: '' }));
      toast.success(`Ticket ${finalTicket.srNumber} updated.`);
      await loadSupport(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update ticket');
    } finally {
      setSaving(false);
    }
  };

  const summaryCards = [
    { label: 'Total', value: stats?.total || 0, icon: MessageSquare },
    { label: 'Open / Acknowledged', value: (stats?.open || 0) + (stats?.acknowledged || 0), icon: AlertTriangle },
    { label: 'Active Queue', value: (stats?.in_progress || 0) + (stats?.waiting_on_user || 0), icon: Settings2 },
    { label: 'Resolved / Closed', value: (stats?.resolved || 0) + (stats?.closed || 0), icon: CheckCircle2 },
  ];

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(123,97,255,0.16),_transparent_36%),linear-gradient(180deg,_#0B0F1A_0%,_#0F1423_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[28px] border border-white/8 bg-white/5 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#7B61FF]/20 bg-[#7B61FF]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#C9BEFF]">
                <LifeBuoy className="h-3.5 w-3.5" /> Support Operations
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Support queue, SR routing, and admin response control.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#A0A7B8] sm:text-base">
                  Monitor every issue from the user dashboards, update status or priority, and reply with a full audit trail.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => void loadSupport(true)} className="h-11 rounded-full border-white/10 bg-white/5 px-5 text-white hover:bg-white/10">
                {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh queue
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl border border-white/8 bg-[#0B0F1A]/80 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[#A0A7B8]">{card.label}</p>
                    <Icon className="h-4 w-4 text-[#C9BEFF]" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-white">{String(card.value).padStart(2, '0')}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-[28px] border border-white/8 bg-[#0C1017]/90 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search SR number, requester, email, or subject"
                className="h-11 border-white/10 bg-white/5 pl-10 text-white placeholder:text-[#667085] focus:border-[#7B61FF]/50"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | SupportStatus)}
              title="Filter tickets by status"
              className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-[#7B61FF]/50"
            >
              {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>

            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as 'all' | SupportPriority)}
              title="Filter tickets by priority"
              className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-[#7B61FF]/50"
            >
              {PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.slice(1).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${statusFilter === option.value ? 'bg-[#7B61FF] text-white' : 'border border-white/10 bg-white/5 text-[#A0A7B8] hover:bg-white/10 hover:text-white'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-white/8 bg-white/5">
            <div className="flex items-center gap-3 text-sm text-[#A0A7B8]">
              <Loader2 className="h-5 w-5 animate-spin text-[#7B61FF]" />
              Loading support queue...
            </div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-white/5 px-6 py-14 text-center">
            <LifeBuoy className="mx-auto h-10 w-10 text-[#C9BEFF]" />
            <h2 className="mt-4 text-xl font-semibold text-white">No tickets match the current filters</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[#A0A7B8]">
              Try changing the status or priority filters. New SRs from user dashboards will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredTickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => void openTicket(ticket.id)}
                className="group rounded-[24px] border border-white/8 bg-white/5 p-5 text-left transition hover:-translate-y-0.5 hover:border-[#7B61FF]/30 hover:bg-white/8"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#7B61FF]/20 bg-[#7B61FF]/10 px-3 py-1 text-xs font-semibold text-[#C9BEFF]">{ticket.srNumber}</span>
                      <Badge className="bg-white/8 text-[#D1D5DB] hover:bg-white/8">{priorityLabel(ticket.priority)}</Badge>
                      <Badge className="bg-white/8 text-[#D1D5DB] hover:bg-white/8">{categoryLabel(ticket.category)}</Badge>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-white">{ticket.subject}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#A0A7B8]">{ticket.message}</p>
                  </div>
                  <ArrowUpRight className="h-5 w-5 flex-shrink-0 text-[#667085] transition group-hover:text-[#C9BEFF]" />
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4 text-xs text-[#A0A7B8]">
                  <div className="flex items-center gap-2">
                    {statusBadge(ticket.status)}
                    <span>{ticket.userName} · {ticket.userEmail}</span>
                  </div>
                  <span>Updated {formatDate(ticket.updatedAt)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#0E1118] text-white sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-3">
              <span>{selectedTicket?.srNumber || 'Support ticket'}</span>
              {selectedTicket ? statusBadge(selectedTicket.status) : null}
            </DialogTitle>
            <DialogDescription className="text-[#A0A7B8]">
              {selectedTicket ? `${selectedTicket.userName} · ${selectedTicket.userEmail}` : 'Ticket details'}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-5 py-2">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#A0A7B8]">Priority</p>
                  <p className="mt-2 text-sm font-semibold text-white">{priorityLabel(selectedTicket.priority)}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#A0A7B8]">Category</p>
                  <p className="mt-2 text-sm font-semibold text-white">{categoryLabel(selectedTicket.category)}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#A0A7B8]">Assigned</p>
                  <p className="mt-2 text-sm font-semibold text-white">{selectedTicket.assignedAdminEmail || 'Unassigned'}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/8 bg-[#0B0F1A] p-5">
                <p className="text-sm font-semibold text-white">Issue summary</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/90">{selectedTicket.message}</p>
              </div>

              <div className="rounded-3xl border border-white/8 bg-white/5 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[#D1D5DB]">Status</Label>
                    <select
                      value={draft.status}
                      onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as SupportStatus }))}
                      title="Change ticket status"
                      className="h-11 w-full rounded-xl border border-white/10 bg-[#0B0F1A] px-3 text-sm text-white outline-none"
                    >
                      {STATUS_OPTIONS.slice(1).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#D1D5DB]">Priority</Label>
                    <select
                      value={draft.priority}
                      onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as SupportPriority }))}
                      title="Change ticket priority level"
                      className="h-11 w-full rounded-xl border border-white/10 bg-[#0B0F1A] px-3 text-sm text-white outline-none"
                    >
                      {PRIORITY_OPTIONS.slice(1).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-[#D1D5DB]">Internal notes</Label>
                  <Textarea
                    rows={4}
                    value={draft.adminNotes}
                    onChange={(event) => setDraft((current) => ({ ...current, adminNotes: event.target.value }))}
                    placeholder="Private notes for the support team."
                    className="border-white/10 bg-[#0B0F1A] text-white placeholder:text-[#667085]"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-white/8 bg-white/5 p-5">
                <p className="text-sm font-semibold text-white">Conversation</p>
                <div className="mt-4 space-y-4">
                  {selectedTicket.messages.map((message) => (
                    <div key={message.id} className={`rounded-2xl border p-4 ${message.senderType === 'user' ? 'border-[#7B61FF]/20 bg-[#7B61FF]/6' : message.senderType === 'admin' ? 'border-cyan-500/20 bg-cyan-500/6' : 'border-white/8 bg-white/5'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#A0A7B8]">
                          <span>{message.senderType}</span>
                          <span>•</span>
                          <span>{message.senderEmail || 'system'}</span>
                        </div>
                        <span className="text-xs text-[#A0A7B8]">{formatDate(message.createdAt)}</span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/90">{message.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-3xl border border-white/8 bg-white/5 p-5">
                <Label className="text-[#D1D5DB]">Admin reply</Label>
                <Textarea
                  rows={4}
                  value={draft.reply}
                  onChange={(event) => setDraft((current) => ({ ...current, reply: event.target.value }))}
                  placeholder="Respond to the user and update the status in one save."
                  className="border-white/10 bg-[#0B0F1A] text-white placeholder:text-[#667085]"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)} className="border-white/10 bg-white/5 text-white hover:bg-white/10">Close</Button>
            <Button onClick={() => void handleSave()} disabled={saving || !selectedTicket} className="bg-[#7B61FF] text-white hover:bg-[#6A4EEF]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
