import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  LifeBuoy,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  closeMySupportTicket,
  createSupportTicket,
  getMySupportTicket,
  getMySupportTickets,
  replyToMySupportTicket,
  type SupportPriority,
  type SupportStatus,
  type SupportTicket,
} from '../../utils/support-api';

const CATEGORY_OPTIONS = [
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'question', label: 'Question' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'billing_inquiry', label: 'Billing Inquiry' },
  { value: 'account_access', label: 'Account Access' },
  { value: 'technical_issue', label: 'Technical Issue' },
  { value: 'other', label: 'Other' },
];

const PRIORITY_OPTIONS: Array<{ value: SupportPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const STATUS_CONFIG: Record<SupportStatus, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: '#FDBA74', bg: 'rgba(249,115,22,0.12)' },
  acknowledged: { label: 'Acknowledged', color: '#67E8F9', bg: 'rgba(6,182,212,0.12)' },
  in_progress: { label: 'In Progress', color: '#FDE047', bg: 'rgba(234,179,8,0.12)' },
  waiting_on_user: { label: 'Waiting on You', color: '#C4B5FD', bg: 'rgba(168,85,247,0.12)' },
  resolved: { label: 'Resolved', color: '#4ADE80', bg: 'rgba(34,197,94,0.12)' },
  closed: { label: 'Closed', color: '#94A3B8', bg: 'rgba(100,116,139,0.12)' },
};

function categoryLabel(value: string) {
  return CATEGORY_OPTIONS.find((option) => option.value === value)?.label || value;
}

function priorityLabel(value: SupportPriority) {
  return PRIORITY_OPTIONS.find((option) => option.value === value)?.label || value;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusMeta(status: SupportStatus) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.open;
}

function SupportTicketBadge({ status }: { status: SupportStatus }) {
  const meta = statusMeta(status);
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: meta.bg, color: meta.color }}>
      <Clock3 className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

export function SupportCenter({ embedded = false }: { embedded?: boolean } = {}) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SupportStatus>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [sending, setSending] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [form, setForm] = useState({
    subject: '',
    category: 'bug_report',
    priority: 'normal' as SupportPriority,
    message: '',
  });

  const loadTickets = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const result = await getMySupportTickets();
      setTickets(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load support tickets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, []);

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === 'open' || ticket.status === 'acknowledged').length,
    active: tickets.filter((ticket) => ticket.status === 'in_progress' || ticket.status === 'waiting_on_user').length,
    resolved: tickets.filter((ticket) => ticket.status === 'resolved' || ticket.status === 'closed').length,
  }), [tickets]);

  const filteredTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesQuery = !normalizedQuery || [ticket.srNumber, ticket.subject, ticket.category, ticket.message].join(' ').toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [query, statusFilter, tickets]);

  const openTicket = async (ticketId: string) => {
    try {
      const ticket = await getMySupportTicket(ticketId);
      setSelectedTicket(ticket);
      setReplyMessage('');
      setDetailOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to open ticket');
    }
  };

  const handleCreateTicket = async () => {
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error('Please add a subject and message.');
      return;
    }

    try {
      setSending(true);
      const ticket = await createSupportTicket({
        subject: form.subject.trim(),
        category: form.category as SupportTicket['category'],
        message: form.message.trim(),
        priority: form.priority,
      });

      toast.success(`Support request ${ticket.srNumber} created.`);
      setCreateOpen(false);
      setForm({ subject: '', category: 'bug_report', priority: 'normal', message: '' });
      await loadTickets(true);
      await openTicket(ticket.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create support request');
    } finally {
      setSending(false);
    }
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) {
      return;
    }

    try {
      setSending(true);
      const ticket = await replyToMySupportTicket(selectedTicket.id, replyMessage.trim());
      setSelectedTicket(ticket);
      setReplyMessage('');
      toast.success('Your reply was sent to support.');
      await loadTickets(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    if (!selectedTicket) {
      return;
    }

    try {
      const ticket = await closeMySupportTicket(selectedTicket.id);
      setSelectedTicket(ticket);
      toast.success(`Support request ${ticket.srNumber} closed.`);
      await loadTickets(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to close support request');
    }
  };

  return (
    <section className={embedded ? 'space-y-6' : 'min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,107,0,0.16),_transparent_36%),linear-gradient(180deg,_#0A0A0A_0%,_#0E1118_100%)] px-4 py-6 sm:px-6 lg:px-8'}>
      <div className={embedded ? 'space-y-6' : 'mx-auto max-w-7xl space-y-6'}>
        <div className="rounded-[28px] border border-white/8 bg-white/5 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/20 bg-[#FF6B00]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#FFB36B]">
                <LifeBuoy className="h-3.5 w-3.5" /> Support Desk
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Log issues, track SR numbers, and follow every update.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#B3B3B3] sm:text-base">
                  Open a professional support request from your dashboard, get an SR number immediately, and keep all follow-ups in one clean timeline.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setCreateOpen(true)} className="h-11 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] px-5 text-white shadow-lg shadow-[#FF6B00]/25 hover:from-[#FF8C00] hover:to-[#FFD600]">
                <Plus className="mr-2 h-4 w-4" /> New Issue
              </Button>
              <Button variant="outline" onClick={() => void loadTickets(true)} className="h-11 rounded-full border-white/10 bg-white/5 px-5 text-white hover:bg-white/10">
                {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total Requests', value: stats.total, icon: MessageSquare },
              { label: 'Open / Acknowledged', value: stats.open, icon: AlertTriangle },
              { label: 'In Progress', value: stats.active, icon: Clock3 },
              { label: 'Resolved / Closed', value: stats.resolved, icon: CheckCircle2 },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-white/8 bg-[#0B0F1A]/80 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[#A0A7B8]">{item.label}</p>
                    <Icon className="h-4 w-4 text-[#FFB36B]" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-white">{String(item.value).padStart(2, '0')}</p>
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
                placeholder="Search SR number, subject, category, or message"
                className="h-11 border-white/10 bg-white/5 pl-10 text-white placeholder:text-[#667085] focus:border-[#FF6B00]/50"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | SupportStatus)}
              title="Filter tickets by status"
              className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-[#FF6B00]/50"
            >
              <option value="all">All statuses</option>
              {(Object.keys(STATUS_CONFIG) as SupportStatus[]).map((status) => (
                <option key={status} value={status}>{STATUS_CONFIG[status].label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['all', 'open', 'acknowledged', 'in_progress', 'waiting_on_user', 'resolved', 'closed'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${statusFilter === status ? 'bg-[#FF6B00] text-white' : 'border border-white/10 bg-white/5 text-[#B3B3B3] hover:bg-white/10 hover:text-white'}`}
              >
                {status === 'all' ? 'All' : STATUS_CONFIG[status].label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-white/8 bg-white/5">
            <div className="flex items-center gap-3 text-sm text-[#B3B3B3]">
              <Loader2 className="h-5 w-5 animate-spin text-[#FF6B00]" />
              Loading your support requests...
            </div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-white/5 px-6 py-14 text-center">
            <LifeBuoy className="mx-auto h-10 w-10 text-[#FFB36B]" />
            <h2 className="mt-4 text-xl font-semibold text-white">No support issues yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[#A0A7B8]">
              Create a new issue from the support desk and your SR number will appear here with every update.
            </p>
            <Button onClick={() => setCreateOpen(true)} className="mt-6 rounded-full bg-[#FF6B00] px-5 text-white hover:bg-[#FF8C00]">
              <Plus className="mr-2 h-4 w-4" /> Create your first ticket
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredTickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => void openTicket(ticket.id)}
                className="group rounded-[24px] border border-white/8 bg-white/5 p-5 text-left transition hover:-translate-y-0.5 hover:border-[#FF6B00]/30 hover:bg-white/8"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#FF6B00]/20 bg-[#FF6B00]/10 px-3 py-1 text-xs font-semibold text-[#FFB36B]">
                        {ticket.srNumber}
                      </span>
                      <Badge className="bg-white/8 text-[#D1D5DB] hover:bg-white/8">{categoryLabel(ticket.category)}</Badge>
                      <Badge className="bg-white/8 text-[#D1D5DB] hover:bg-white/8">{priorityLabel(ticket.priority)}</Badge>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-white">{ticket.subject}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#A0A7B8]">{ticket.message}</p>
                  </div>
                  <ArrowUpRight className="h-5 w-5 flex-shrink-0 text-[#667085] transition group-hover:text-[#FFB36B]" />
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4 text-xs text-[#A0A7B8]">
                  <div className="flex items-center gap-2">
                    <SupportTicketBadge status={ticket.status} />
                    <span>Updated {formatDate(ticket.updatedAt)}</span>
                  </div>
                  <span>{ticket.messages.length} message{ticket.messages.length === 1 ? '' : 's'}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#0E1118] text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Open a support request</DialogTitle>
            <DialogDescription className="text-[#A0A7B8]">
              Give us the essentials and we’ll generate an SR number immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label className="text-[#D1D5DB]">Subject</Label>
              <Input value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} className="border-white/10 bg-white/5 text-white placeholder:text-[#667085]" placeholder="Short summary of the issue" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[#D1D5DB]">Category</Label>
                <select
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  title="Select ticket category"
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none"
                >
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-[#D1D5DB]">Priority</Label>
                <select
                  value={form.priority}
                  onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as SupportPriority }))}
                  title="Select ticket priority level"
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none"
                >
                  {PRIORITY_OPTIONS.map((priority) => (
                    <option key={priority.value} value={priority.value}>{priority.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#D1D5DB]">Issue details</Label>
              <Textarea
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                rows={6}
                className="border-white/10 bg-white/5 text-white placeholder:text-[#667085]"
                placeholder="Describe what happened, when it happened, and what you expected to see."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-white/10 bg-white/5 text-white hover:bg-white/10">Cancel</Button>
            <Button onClick={() => void handleCreateTicket()} disabled={sending} className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white hover:from-[#FF8C00] hover:to-[#FFD600]">
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Submit ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#0E1118] text-white sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-3">
              <span>{selectedTicket?.srNumber || 'Support ticket'}</span>
              {selectedTicket ? <SupportTicketBadge status={selectedTicket.status} /> : null}
            </DialogTitle>
            <DialogDescription className="text-[#A0A7B8]">
              {selectedTicket ? `${selectedTicket.subject} · ${categoryLabel(selectedTicket.category)}` : 'Ticket details'}
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
                  <p className="text-xs uppercase tracking-[0.2em] text-[#A0A7B8]">Created</p>
                  <p className="mt-2 text-sm font-semibold text-white">{formatDate(selectedTicket.createdAt)}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#A0A7B8]">Updated</p>
                  <p className="mt-2 text-sm font-semibold text-white">{formatDate(selectedTicket.updatedAt)}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/8 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-[#A0A7B8]">Issue summary</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/90">{selectedTicket.message}</p>
              </div>

              <div className="rounded-3xl border border-white/8 bg-[#0B0F1A] p-5">
                <p className="text-sm font-semibold text-white">Conversation</p>
                <div className="mt-4 space-y-4">
                  {selectedTicket.messages.map((message) => (
                    <div key={message.id} className={`rounded-2xl border p-4 ${message.senderType === 'user' ? 'border-[#FF6B00]/20 bg-[#FF6B00]/6' : message.senderType === 'admin' ? 'border-cyan-500/20 bg-cyan-500/6' : 'border-white/8 bg-white/5'}`}>
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

              {selectedTicket.status !== 'closed' && (
                <div className="space-y-3 rounded-3xl border border-white/8 bg-white/5 p-5">
                  <Label className="text-[#D1D5DB]">Add a follow-up</Label>
                  <Textarea
                    rows={4}
                    value={replyMessage}
                    onChange={(event) => setReplyMessage(event.target.value)}
                    placeholder="Add more context, a screenshot description, or anything support should know next."
                    className="border-white/10 bg-[#0B0F1A] text-white placeholder:text-[#667085]"
                  />
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => void handleReply()} disabled={sending} className="bg-[#FF6B00] text-white hover:bg-[#FF8C00]">
                      {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Send reply
                    </Button>
                    <Button variant="outline" onClick={() => void handleClose()} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                      Close ticket
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
