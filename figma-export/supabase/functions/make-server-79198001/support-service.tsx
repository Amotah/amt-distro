import * as kv from './kv_store.tsx';

export type SupportStatus = 'open' | 'acknowledged' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';
export type SupportPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SupportCategory = 'bug_report' | 'question' | 'feature_request' | 'billing_inquiry' | 'account_access' | 'technical_issue' | 'other';
export type SupportSenderType = 'user' | 'admin' | 'system' | 'guest';

export interface SupportMessage {
  id: string;
  senderType: SupportSenderType;
  senderId: string;
  senderEmail?: string;
  senderName?: string;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  srNumber: string;
  userId?: string;
  userEmail: string;
  userName?: string;
  userRole?: 'artist' | 'label' | 'partner' | 'admin' | 'guest';
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

// Generate unique SR number
function generateSRNumber(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `SR-${timestamp}-${random}`;
}

// Create a new support ticket
export async function createSupportTicket(
  userEmail: string,
  userId: string | undefined,
  userName: string | undefined,
  userRole: string | undefined,
  subject: string,
  category: SupportCategory,
  message: string,
  priority: SupportPriority = 'normal'
): Promise<SupportTicket> {
  const id = crypto.randomUUID();
  const srNumber = generateSRNumber();
  const now = new Date().toISOString();

  const ticket: SupportTicket = {
    id,
    srNumber,
    userId,
    userEmail,
    userName,
    userRole: (userRole as any) || 'guest',
    subject,
    category,
    message,
    status: 'open',
    priority,
    messages: [
      {
        id: crypto.randomUUID(),
        senderType: userId ? 'user' : 'guest',
        senderId: userId || 'guest',
        senderEmail: userEmail,
        senderName: userName,
        message,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
    lastUpdatedByType: userId ? 'user' : 'system',
    lastUpdatedById: userId,
  };

  // Store ticket in KV
  await kv.set(`support:ticket:${id}`, ticket);
  
  // Index for user lookup (if userId exists)
  if (userId) {
    const userTickets = (await kv.get(`support:user:${userId}:tickets`)) || [];
    userTickets.push(id);
    await kv.set(`support:user:${userId}:tickets`, userTickets);
  }

  // Index for email lookup
  const emailTickets = (await kv.get(`support:email:${userEmail}:tickets`)) || [];
  emailTickets.push(id);
  await kv.set(`support:email:${userEmail}:tickets`, emailTickets);

  // Store in all tickets list
  const allTickets = (await kv.get('support:all:tickets')) || [];
  allTickets.push(id);
  await kv.set('support:all:tickets', allTickets);

  return ticket;
}

// Get all support tickets for a user
export async function getUserSupportTickets(userId: string): Promise<SupportTicket[]> {
  const ticketIds = (await kv.get(`support:user:${userId}:tickets`)) || [];
  const tickets: SupportTicket[] = [];

  for (const ticketId of ticketIds) {
    const ticket = await kv.get(`support:ticket:${ticketId}`);
    if (ticket) {
      tickets.push(ticket);
    }
  }

  return tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Get all support tickets for an email (for non-logged-in users)
export async function getEmailSupportTickets(email: string): Promise<SupportTicket[]> {
  const ticketIds = (await kv.get(`support:email:${email}:tickets`)) || [];
  const tickets: SupportTicket[] = [];

  for (const ticketId of ticketIds) {
    const ticket = await kv.get(`support:ticket:${ticketId}`);
    if (ticket) {
      tickets.push(ticket);
    }
  }

  return tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Get a specific support ticket
export async function getSupportTicket(ticketId: string): Promise<SupportTicket | null> {
  return await kv.get(`support:ticket:${ticketId}`);
}

// Add a message to a support ticket
export async function addMessageToTicket(
  ticketId: string,
  senderType: SupportSenderType,
  senderId: string,
  senderEmail: string | undefined,
  senderName: string | undefined,
  message: string
): Promise<SupportTicket | null> {
  const ticket = await getSupportTicket(ticketId);
  if (!ticket) {
    return null;
  }

  const newMessage: SupportMessage = {
    id: crypto.randomUUID(),
    senderType,
    senderId,
    senderEmail,
    senderName,
    message,
    createdAt: new Date().toISOString(),
  };

  ticket.messages.push(newMessage);
  ticket.updatedAt = new Date().toISOString();
  ticket.lastUpdatedByType = senderType;
  ticket.lastUpdatedById = senderId;

  // If user replied, update status from waiting_on_user
  if (senderType === 'user' && ticket.status === 'waiting_on_user') {
    ticket.status = 'acknowledged';
  }

  await kv.set(`support:ticket:${ticketId}`, ticket);
  return ticket;
}

// Update support ticket status
export async function updateTicketStatus(
  ticketId: string,
  status: SupportStatus
): Promise<SupportTicket | null> {
  const ticket = await getSupportTicket(ticketId);
  if (!ticket) {
    return null;
  }

  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();
  ticket.lastUpdatedByType = 'admin';

  if (status === 'resolved') {
    ticket.resolvedAt = new Date().toISOString();
  }
  if (status === 'closed') {
    ticket.closedAt = new Date().toISOString();
  }

  await kv.set(`support:ticket:${ticketId}`, ticket);
  return ticket;
}

// Update ticket priority
export async function updateTicketPriority(
  ticketId: string,
  priority: SupportPriority
): Promise<SupportTicket | null> {
  const ticket = await getSupportTicket(ticketId);
  if (!ticket) {
    return null;
  }

  ticket.priority = priority;
  ticket.updatedAt = new Date().toISOString();

  await kv.set(`support:ticket:${ticketId}`, ticket);
  return ticket;
}

// Assign ticket to admin
export async function assignTicketToAdmin(
  ticketId: string,
  adminId: string,
  adminEmail: string
): Promise<SupportTicket | null> {
  const ticket = await getSupportTicket(ticketId);
  if (!ticket) {
    return null;
  }

  ticket.assignedAdminId = adminId;
  ticket.assignedAdminEmail = adminEmail;
  ticket.updatedAt = new Date().toISOString();
  
  // Mark as acknowledged when assigned
  if (ticket.status === 'open') {
    ticket.status = 'acknowledged';
  }

  await kv.set(`support:ticket:${ticketId}`, ticket);
  return ticket;
}

// Set admin notes
export async function setAdminNotes(
  ticketId: string,
  adminNotes: string
): Promise<SupportTicket | null> {
  const ticket = await getSupportTicket(ticketId);
  if (!ticket) {
    return null;
  }

  ticket.adminNotes = adminNotes;
  ticket.updatedAt = new Date().toISOString();

  await kv.set(`support:ticket:${ticketId}`, ticket);
  return ticket;
}

// Get all support tickets (admin)
export async function getAllSupportTickets(): Promise<SupportTicket[]> {
  const ticketIds = (await kv.get('support:all:tickets')) || [];
  const tickets: SupportTicket[] = [];

  for (const ticketId of ticketIds) {
    const ticket = await kv.get(`support:ticket:${ticketId}`);
    if (ticket) {
      tickets.push(ticket);
    }
  }

  return tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Get support statistics
export async function getSupportStats(): Promise<SupportTicketStats> {
  const tickets = await getAllSupportTickets();

  const stats: SupportTicketStats = {
    total: tickets.length,
    open: 0,
    acknowledged: 0,
    in_progress: 0,
    waiting_on_user: 0,
    resolved: 0,
    closed: 0,
    urgent: 0,
    high: 0,
    normal: 0,
    low: 0,
  };

  for (const ticket of tickets) {
    stats[ticket.status]++;
    stats[ticket.priority]++;
  }

  return stats;
}
