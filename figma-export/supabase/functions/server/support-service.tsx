import * as kv from './kv_store.tsx';
import * as userService from './user-service.tsx';
import * as adminService from './admin-service.tsx';
import { sendEmail } from './integration-service.tsx';

export type SupportStatus = 'open' | 'acknowledged' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';
export type SupportPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SupportCategory = 'bug_report' | 'question' | 'feature_request' | 'billing_inquiry' | 'account_access' | 'technical_issue' | 'other';

export type SupportSenderType = 'user' | 'admin' | 'system';

export interface SupportMessage {
  id: string;
  senderType: SupportSenderType;
  senderId: string;
  senderEmail?: string;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  srNumber: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: 'artist' | 'label' | 'partner' | 'admin';
  subject: string;
  category: SupportCategory;
  message: string;
  status: SupportStatus;
  priority: SupportPriority;
  assignedAdminId?: string;
  assignedAdminEmail?: string;
  adminNotes?: string;
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  resolvedAt?: string;
  lastUpdatedByType?: SupportSenderType;
  lastUpdatedById?: string;
}

export interface CreateSupportTicketInput {
  userId: string;
  userEmail: string;
  userName: string;
  userRole: 'artist' | 'label' | 'partner' | 'admin';
  subject: string;
  category: SupportCategory;
  message: string;
  priority?: SupportPriority;
}

export interface UpdateSupportTicketInput {
  status?: SupportStatus;
  priority?: SupportPriority;
  assignedAdminId?: string;
  adminNotes?: string;
}

export interface SupportTicketStats {
  total: number;
  open: number;
  acknowledged: number;
  in_progress: number;
  waiting_on_user: number;
  resolved: number;
  closed: number;
  urgent: number;
  high: number;
  normal: number;
  low: number;
}

const TICKET_KEY_PREFIX = 'support:ticket:';
const USER_INDEX_PREFIX = 'support:user:';
const ADMIN_INDEX_PREFIX = 'support:admin:';
const SR_INDEX_PREFIX = 'support:sr:';

function normalizePriority(priority?: string): SupportPriority {
  if (priority === 'low' || priority === 'normal' || priority === 'high' || priority === 'urgent') {
    return priority;
  }

  return 'normal';
}

function normalizeStatus(status?: string): SupportStatus {
  if (
    status === 'open'
    || status === 'acknowledged'
    || status === 'in_progress'
    || status === 'waiting_on_user'
    || status === 'resolved'
    || status === 'closed'
  ) {
    return status;
  }

  return 'open';
}

function normalizeCategory(category?: string): SupportCategory {
  if (
    category === 'bug_report'
    || category === 'question'
    || category === 'feature_request'
    || category === 'billing_inquiry'
    || category === 'account_access'
    || category === 'technical_issue'
    || category === 'other'
  ) {
    return category;
  }

  return 'other';
}

function sanitizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toSupportTicket(value: any): SupportTicket {
  return value as SupportTicket;
}

async function generateSrNumber(): Promise<string> {
  const dateKey = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const counterKey = `support:counter:${dateKey}`;
  const current = await kv.get<number>(counterKey) || 0;
  const next = current + 1;
  await kv.set(counterKey, next);
  return `SR-${dateKey}-${String(next).padStart(4, '0')}`;
}

async function resolveSupportAdmins(): Promise<Array<{ userId: string; email: string; adminId: string }>> {
  const admins = await adminService.getAllAdminUsers();
  const supportAdmins = admins.filter((admin) => admin.role === 'admin_support' || admin.role === 'superadmin');
  const resolved = await Promise.all(supportAdmins.map(async (admin) => {
    const user = await userService.getUserByUserId(admin.userId);
    return user?.email
      ? { userId: admin.userId, email: user.email, adminId: admin.id }
      : null;
  }));

  return resolved.filter(Boolean) as Array<{ userId: string; email: string; adminId: string }>;
}

async function saveTicket(ticket: SupportTicket): Promise<SupportTicket> {
  await kv.set(`${TICKET_KEY_PREFIX}${ticket.id}`, ticket);
  await kv.set(`${SR_INDEX_PREFIX}${ticket.srNumber}`, ticket.id);
  await kv.set(`${USER_INDEX_PREFIX}${ticket.userId}:${ticket.id}`, ticket.id);

  if (ticket.assignedAdminId) {
    await kv.set(`${ADMIN_INDEX_PREFIX}${ticket.assignedAdminId}:${ticket.id}`, ticket.id);
  }

  return ticket;
}

async function getTicketById(ticketId: string): Promise<SupportTicket | null> {
  const ticket = await kv.get<SupportTicket>(`${TICKET_KEY_PREFIX}${ticketId}`);
  return ticket ? toSupportTicket(ticket) : null;
}

async function appendMessage(
  ticket: SupportTicket,
  senderType: SupportSenderType,
  senderId: string,
  senderEmail: string | undefined,
  message: string,
): Promise<SupportTicket> {
  ticket.messages = ticket.messages || [];
  ticket.messages.push({
    id: crypto.randomUUID(),
    senderType,
    senderId,
    senderEmail,
    message: sanitizeText(message),
    createdAt: new Date().toISOString(),
  });

  ticket.lastUpdatedByType = senderType;
  ticket.lastUpdatedById = senderId;
  ticket.updatedAt = new Date().toISOString();
  return saveTicket(ticket);
}

function buildEmailHtml(title: string, lines: string[]): string {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin: 0 0 12px;">${title}</h2>
      ${lines.map((line) => `<p style="margin: 0 0 8px;">${line}</p>`).join('')}
    </div>
  `;
}

async function sendSupportNotifications(ticket: SupportTicket, action: 'created' | 'updated' | 'resolved' | 'closed') {
  const supportAdmins = await resolveSupportAdmins();
  const userSubject = `[AMT Distro Support] ${ticket.srNumber} ${action === 'created' ? 'received' : 'updated'}`;
  const adminSubject = `[Support Queue] ${ticket.srNumber} - ${ticket.subject}`;

  const userLines = [
    `<strong>SR Number:</strong> ${ticket.srNumber}`,
    `<strong>Subject:</strong> ${ticket.subject}`,
    `<strong>Status:</strong> ${ticket.status.replace(/_/g, ' ')}`,
    `<strong>Priority:</strong> ${ticket.priority}`,
    `We have received your request and our support team is reviewing it.`,
  ];

  const adminLines = [
    `<strong>SR Number:</strong> ${ticket.srNumber}`,
    `<strong>Requester:</strong> ${ticket.userName} (${ticket.userEmail})`,
    `<strong>Subject:</strong> ${ticket.subject}`,
    `<strong>Category:</strong> ${ticket.category.replace(/_/g, ' ')}`,
    `<strong>Status:</strong> ${ticket.status.replace(/_/g, ' ')}`,
    `<strong>Priority:</strong> ${ticket.priority}`,
  ];

  await Promise.allSettled([
    sendEmail(ticket.userEmail, userSubject, buildEmailHtml(`Support request ${ticket.srNumber}`, userLines)),
    ...supportAdmins.map((admin) => sendEmail(admin.email, adminSubject, buildEmailHtml(`New support request ${ticket.srNumber}`, adminLines))),
  ]);
}

export async function createSupportTicket(input: CreateSupportTicketInput): Promise<SupportTicket> {
  const now = new Date().toISOString();
  const supportAdmins = await resolveSupportAdmins();
  const assignedAdmin = supportAdmins[0] || null;
  const srNumber = await generateSrNumber();
  const ticket: SupportTicket = {
    id: crypto.randomUUID(),
    srNumber,
    userId: input.userId,
    userEmail: sanitizeText(input.userEmail).toLowerCase(),
    userName: sanitizeText(input.userName) || 'Unknown user',
    userRole: input.userRole,
    subject: sanitizeText(input.subject),
    category: normalizeCategory(input.category),
    message: sanitizeText(input.message),
    status: 'open',
    priority: normalizePriority(input.priority),
    assignedAdminId: assignedAdmin?.userId,
    assignedAdminEmail: assignedAdmin?.email,
    messages: [
      {
        id: crypto.randomUUID(),
        senderType: 'user',
        senderId: input.userId,
        senderEmail: input.userEmail,
        message: sanitizeText(input.message),
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
    lastUpdatedByType: 'user',
    lastUpdatedById: input.userId,
  };

  await saveTicket(ticket);
  await sendSupportNotifications(ticket, 'created');
  return ticket;
}

export async function getSupportTicketsForUser(userId: string): Promise<SupportTicket[]> {
  const entries = await kv.getEntriesByPrefix(`${USER_INDEX_PREFIX}${userId}:`);
  const ticketIds = entries.map((entry) => String(entry.value || entry.key.split(':').pop() || '')).filter(Boolean);
  const tickets = await Promise.all(ticketIds.map((ticketId) => getTicketById(ticketId)));
  return tickets.filter(Boolean).sort((left, right) => new Date(right!.updatedAt).getTime() - new Date(left!.updatedAt).getTime()) as SupportTicket[];
}

export async function getSupportTicketForUser(ticketId: string, userId: string): Promise<SupportTicket | null> {
  const ticket = await getTicketById(ticketId);
  if (!ticket || ticket.userId !== userId) {
    return null;
  }

  return ticket;
}

export async function addUserReply(ticketId: string, userId: string, userEmail: string, message: string): Promise<SupportTicket | null> {
  const ticket = await getSupportTicketForUser(ticketId, userId);
  if (!ticket) {
    return null;
  }

  ticket.status = ticket.status === 'closed' ? 'open' : 'waiting_on_user';
  const updated = await appendMessage(ticket, 'user', userId, userEmail, message);
  await sendSupportNotifications(updated, 'updated');
  return updated;
}

export async function closeUserTicket(ticketId: string, userId: string): Promise<SupportTicket | null> {
  const ticket = await getSupportTicketForUser(ticketId, userId);
  if (!ticket) {
    return null;
  }

  ticket.status = 'closed';
  ticket.closedAt = new Date().toISOString();
  const updated = await appendMessage(ticket, 'system', userId, ticket.userEmail, 'Ticket closed by user');
  await sendSupportNotifications(updated, 'closed');
  return updated;
}

export async function listAllSupportTickets(): Promise<SupportTicket[]> {
  const tickets = await kv.getByPrefix(TICKET_KEY_PREFIX) as SupportTicket[];
  return tickets
    .filter(Boolean)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export async function getSupportStats(): Promise<SupportTicketStats> {
  const tickets = await listAllSupportTickets();

  return {
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === 'open').length,
    acknowledged: tickets.filter((ticket) => ticket.status === 'acknowledged').length,
    in_progress: tickets.filter((ticket) => ticket.status === 'in_progress').length,
    waiting_on_user: tickets.filter((ticket) => ticket.status === 'waiting_on_user').length,
    resolved: tickets.filter((ticket) => ticket.status === 'resolved').length,
    closed: tickets.filter((ticket) => ticket.status === 'closed').length,
    urgent: tickets.filter((ticket) => ticket.priority === 'urgent').length,
    high: tickets.filter((ticket) => ticket.priority === 'high').length,
    normal: tickets.filter((ticket) => ticket.priority === 'normal').length,
    low: tickets.filter((ticket) => ticket.priority === 'low').length,
  };
}

export async function getSupportTicketStats(): Promise<SupportTicketStats> {
  return getSupportStats();
}

export async function getSupportTicket(ticketId: string): Promise<SupportTicket | null> {
  return getTicketById(ticketId);
}

export async function updateSupportTicket(ticketId: string, updates: UpdateSupportTicketInput, adminUserId: string): Promise<SupportTicket | null> {
  const ticket = await getTicketById(ticketId);
  if (!ticket) {
    return null;
  }

  const now = new Date().toISOString();
  const statusBefore = ticket.status;

  if (updates.status) {
    ticket.status = normalizeStatus(updates.status);
    if (ticket.status === 'resolved') {
      ticket.resolvedAt = now;
    }
    if (ticket.status === 'closed') {
      ticket.closedAt = now;
    }
  }

  if (updates.priority) {
    ticket.priority = normalizePriority(updates.priority);
  }

  if (updates.assignedAdminId) {
    const adminUser = await userService.getUserByUserId(updates.assignedAdminId);
    ticket.assignedAdminId = updates.assignedAdminId;
    ticket.assignedAdminEmail = adminUser?.email;
  }

  if (updates.adminNotes !== undefined) {
    ticket.adminNotes = sanitizeText(updates.adminNotes);
  }

  ticket.lastUpdatedByType = 'admin';
  ticket.lastUpdatedById = adminUserId;
  ticket.updatedAt = now;

  const updated = await saveTicket(ticket);

  if (statusBefore !== updated.status) {
    await appendMessage(updated, 'system', adminUserId, updated.assignedAdminEmail, `Status changed to ${updated.status.replace(/_/g, ' ')}`);
  }

  await sendSupportNotifications(updated, updated.status === 'resolved' ? 'resolved' : 'updated');
  return updated;
}

export async function addAdminReply(ticketId: string, adminUserId: string, adminEmail: string, message: string): Promise<SupportTicket | null> {
  const ticket = await getTicketById(ticketId);
  if (!ticket) {
    return null;
  }

  const updated = await appendMessage(ticket, 'admin', adminUserId, adminEmail, message);
  if (updated.status === 'open' || updated.status === 'acknowledged') {
    updated.status = 'in_progress';
  }

  await saveTicket(updated);
  await sendSupportNotifications(updated, 'updated');
  return updated;
}
