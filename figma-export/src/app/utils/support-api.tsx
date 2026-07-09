import { getSupabaseClient } from '../../../utils/supabase/client';
import { BACKEND_API_BASE_URL } from './backend-api-base';

const API_BASE_URL = BACKEND_API_BASE_URL;

async function getAuthToken(storageKey: 'access_token' | 'admin_access_token'): Promise<string> {
  try {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      sessionStorage.setItem(storageKey, session.access_token);
      return session.access_token;
    }
  } catch {
    // fall back to sessionStorage below
  }

  const token = sessionStorage.getItem(storageKey) || sessionStorage.getItem('access_token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  return token;
}

async function readApiError(response: Response): Promise<string> {
  const raw = await response.text().catch(() => '');
  if (!raw) {
    return `API Error: ${response.status}`;
  }

  try {
    const parsed = JSON.parse(raw) as { error?: string; message?: string };
    if (parsed.error) return parsed.error;
    if (parsed.message) return parsed.message;
  } catch {
    // Fall through to plain-text response handling.
  }

  return raw;
}

async function apiCall<T>(token: string, endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return response.json();
}

async function publicApiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return response.json();
}

export type SupportStatus = 'open' | 'acknowledged' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';
export type SupportPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SupportCategory = 'bug_report' | 'question' | 'feature_request' | 'billing_inquiry' | 'account_access' | 'technical_issue' | 'other';
export type SupportSenderType = 'user' | 'admin' | 'system' | 'guest';

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

export interface CreateSupportTicketInput {
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

export async function createSupportTicket(input: CreateSupportTicketInput): Promise<SupportTicket> {
  const token = await getAuthToken('access_token');
  const result = await apiCall<{ ticket: SupportTicket }>(token, '/support/tickets', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return result.ticket;
}

export async function createPublicSupportTicket(
  email: string,
  input: CreateSupportTicketInput
): Promise<SupportTicket> {
  // Public support ticket creation (for non-authenticated users)
  const result = await publicApiCall<{ ticket: SupportTicket }>('/support/tickets', {
    method: 'POST',
    body: JSON.stringify({
      ...input,
      email,
    }),
  });
  return result.ticket;
}

export async function getMySupportTickets(): Promise<SupportTicket[]> {
  const token = await getAuthToken('access_token');
  const result = await apiCall<{ tickets: SupportTicket[] }>(token, '/support/tickets');
  return result.tickets;
}

export async function getMySupportTicket(ticketId: string): Promise<SupportTicket> {
  const token = await getAuthToken('access_token');
  const result = await apiCall<{ ticket: SupportTicket }>(token, `/support/tickets/${ticketId}`);
  return result.ticket;
}

export async function replyToMySupportTicket(ticketId: string, message: string): Promise<SupportTicket> {
  const token = await getAuthToken('access_token');
  const result = await apiCall<{ ticket: SupportTicket }>(token, `/support/tickets/${ticketId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  return result.ticket;
}

export async function closeMySupportTicket(ticketId: string): Promise<SupportTicket> {
  const token = await getAuthToken('access_token');
  const result = await apiCall<{ ticket: SupportTicket }>(token, `/support/tickets/${ticketId}/close`, {
    method: 'PATCH',
  });
  return result.ticket;
}

export async function getAdminSupportStats(): Promise<SupportTicketStats> {
  const token = await getAuthToken('admin_access_token');
  const result = await apiCall<{ stats: SupportTicketStats }>(token, '/admin/support/stats');
  return result.stats;
}

export async function getAdminSupportTickets(): Promise<SupportTicket[]> {
  const token = await getAuthToken('admin_access_token');
  const result = await apiCall<{ tickets: SupportTicket[] }>(token, '/admin/support/tickets');
  return result.tickets;
}

export async function getAdminSupportTicket(ticketId: string): Promise<SupportTicket> {
  const token = await getAuthToken('admin_access_token');
  const result = await apiCall<{ ticket: SupportTicket }>(token, `/admin/support/tickets/${ticketId}`);
  return result.ticket;
}

export async function updateAdminSupportTicket(ticketId: string, updates: UpdateSupportTicketInput): Promise<SupportTicket> {
  const token = await getAuthToken('admin_access_token');
  const result = await apiCall<{ ticket: SupportTicket }>(token, `/admin/support/tickets/${ticketId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return result.ticket;
}

export async function replyToAdminSupportTicket(ticketId: string, message: string): Promise<SupportTicket> {
  const token = await getAuthToken('admin_access_token');
  const result = await apiCall<{ ticket: SupportTicket }>(token, `/admin/support/tickets/${ticketId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  return result.ticket;
}
