import * as supportService from './support-service.tsx';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const FROM_EMAIL = 'support@amtdistro.com';
const SUPPORT_EMAIL = 'support@amtdistro.com';

interface EmailTemplateData {
  [key: string]: string | number | boolean;
}

// Send email via Resend (or fallback to console logging if not configured)
async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string
): Promise<boolean> {
  try {
    if (!RESEND_API_KEY) {
      console.log('⚠️  RESEND_API_KEY not configured');
      console.log(`📧 Email would be sent to: ${to}`);
      console.log(`📋 Subject: ${subject}`);
      console.log(`📝 Body length: ${htmlBody.length} chars`);
      return true; // Still return true so the flow continues
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html: htmlBody,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Email send failed:', error);
      return false;
    }

    console.log(`✅ Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error('❌ Email service error:', error);
    return false;
  }
}

// Confirmation email when ticket is created
export async function sendTicketCreationEmail(
  ticket: supportService.SupportTicket
): Promise<boolean> {
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-bottom: 16px;">Support Ticket Created</h2>
        
        <p style="color: #666; margin-bottom: 12px;">Hello${ticket.userName ? ` ${ticket.userName}` : ''},</p>
        
        <p style="color: #666; margin-bottom: 24px;">
          Thank you for contacting us! We've received your support request and assigned it a tracking number.
        </p>

        <div style="background-color: #f9f9f9; padding: 16px; border-left: 4px solid #007bff; margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; color: #333;"><strong>Ticket Number:</strong> ${ticket.srNumber}</p>
          <p style="margin: 0 0 8px 0; color: #333;"><strong>Subject:</strong> ${ticket.subject}</p>
          <p style="margin: 0 0 8px 0; color: #333;"><strong>Category:</strong> ${ticket.category}</p>
          <p style="margin: 0 0 8px 0; color: #333;"><strong>Status:</strong> ${ticket.status}</p>
          <p style="margin: 0; color: #333;"><strong>Priority:</strong> ${ticket.priority}</p>
        </div>

        <h3 style="color: #333; margin-top: 20px; margin-bottom: 12px;">Your Message:</h3>
        <p style="color: #666; background-color: #f9f9f9; padding: 12px; border-radius: 4px; white-space: pre-wrap;">
          ${ticket.message}
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

        <p style="color: #666; margin-bottom: 12px;">
          Our support team will review your request and get back to you as soon as possible. You'll receive updates on this ticket via email.
        </p>

        <p style="color: #999; font-size: 12px; margin-top: 20px;">
          If you need to check on your ticket or add more information, please keep the ticket number ${ticket.srNumber} handy.
        </p>
      </div>
    </div>
  `;

  return await sendEmail(
    ticket.userEmail,
    `[${ticket.srNumber}] Support Ticket Created: ${ticket.subject}`,
    htmlBody
  );
}

// Notification when admin responds
export async function sendAdminResponseEmail(
  ticket: supportService.SupportTicket,
  message: supportService.SupportMessage,
  adminName?: string
): Promise<boolean> {
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-bottom: 16px;">We've Responded to Your Support Ticket</h2>
        
        <p style="color: #666; margin-bottom: 12px;">Hello${ticket.userName ? ` ${ticket.userName}` : ''},</p>
        
        <p style="color: #666; margin-bottom: 24px;">
          Our support team has posted a response to your ticket. Please see the message below:
        </p>

        <div style="background-color: #f0f8ff; padding: 16px; border-left: 4px solid #28a745; margin-bottom: 24px; border-radius: 4px;">
          <p style="margin: 0 0 12px 0; color: #333;"><strong>${adminName || 'Support Team'} responded:</strong></p>
          <p style="margin: 0; color: #666; white-space: pre-wrap;">
            ${message.message}
          </p>
        </div>

        <div style="background-color: #f9f9f9; padding: 12px; border-radius: 4px; margin-bottom: 24px;">
          <p style="margin: 0 0 6px 0; color: #666;"><strong>Ticket:</strong> ${ticket.srNumber}</p>
          <p style="margin: 0; color: #666;"><strong>Status:</strong> ${ticket.status}</p>
        </div>

        <p style="color: #666; margin-bottom: 12px;">
          If you need to reply to this message or provide additional information, please log in to your account or reply directly to this email.
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

        <p style="color: #999; font-size: 12px;">
          Ticket Reference: ${ticket.srNumber}
        </p>
      </div>
    </div>
  `;

  return await sendEmail(
    ticket.userEmail,
    `[${ticket.srNumber}] Response to Your Support Request`,
    htmlBody
  );
}

// Notification when ticket status changes
export async function sendStatusChangeEmail(
  ticket: supportService.SupportTicket,
  oldStatus: supportService.SupportStatus
): Promise<boolean> {
  const statusMessages: Record<string, string> = {
    acknowledged: 'Your ticket has been acknowledged and is being reviewed by our team.',
    in_progress: 'Your ticket is now being actively worked on by our support team.',
    waiting_on_user: 'We need more information from you to proceed. Please reply to this email with the requested details.',
    resolved: 'Your issue has been resolved! If you need any further assistance, please let us know.',
    closed: 'This ticket has been closed. Thank you for contacting us!',
    open: 'Your ticket status has been updated.',
  };

  const statusMessage = statusMessages[ticket.status] || 'Your ticket status has been updated.';
  const colorMap: Record<string, string> = {
    resolved: '#28a745',
    closed: '#6c757d',
    in_progress: '#007bff',
    waiting_on_user: '#ffc107',
    acknowledged: '#17a2b8',
  };

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-bottom: 16px;">Support Ticket Status Update</h2>
        
        <p style="color: #666; margin-bottom: 12px;">Hello${ticket.userName ? ` ${ticket.userName}` : ''},</p>
        
        <p style="color: #666; margin-bottom: 24px;">
          The status of your support ticket has been updated:
        </p>

        <div style="background-color: ${colorMap[ticket.status] || '#007bff'}15; padding: 16px; border-left: 4px solid ${colorMap[ticket.status] || '#007bff'}; margin-bottom: 24px; border-radius: 4px;">
          <p style="margin: 0 0 12px 0; color: #333;"><strong>Previous Status:</strong> ${oldStatus}</p>
          <p style="margin: 0 0 12px 0; color: #333;"><strong>Current Status:</strong> ${ticket.status}</p>
          <p style="margin: 0; color: #666;">
            ${statusMessage}
          </p>
        </div>

        <div style="background-color: #f9f9f9; padding: 12px; border-radius: 4px; margin-bottom: 24px;">
          <p style="margin: 0 0 6px 0; color: #666;"><strong>Ticket:</strong> ${ticket.srNumber}</p>
          <p style="margin: 0; color: #666;"><strong>Subject:</strong> ${ticket.subject}</p>
        </div>

        <p style="color: #999; font-size: 12px;">
          Ticket Reference: ${ticket.srNumber}
        </p>
      </div>
    </div>
  `;

  return await sendEmail(
    ticket.userEmail,
    `[${ticket.srNumber}] Status Update: ${ticket.status}`,
    htmlBody
  );
}

// Notification to admins when new ticket is created
export async function sendNewTicketNotificationToAdmins(
  ticket: supportService.SupportTicket
): Promise<boolean> {
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #c72c48; margin-bottom: 16px;">🎫 New Support Ticket</h2>
        
        <p style="color: #666; margin-bottom: 12px;">
          A new support ticket has been created and requires attention.
        </p>

        <div style="background-color: #f9f9f9; padding: 16px; border-left: 4px solid #c72c48; margin-bottom: 24px; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; color: #333;"><strong>Ticket:</strong> ${ticket.srNumber}</p>
          <p style="margin: 0 0 8px 0; color: #333;"><strong>From:</strong> ${ticket.userName || 'Unknown'} (${ticket.userEmail})</p>
          <p style="margin: 0 0 8px 0; color: #333;"><strong>Category:</strong> ${ticket.category}</p>
          <p style="margin: 0 0 8px 0; color: #333;"><strong>Priority:</strong> ${ticket.priority}</p>
          <p style="margin: 0 0 12px 0; color: #333;"><strong>Subject:</strong> ${ticket.subject}</p>
          <p style="margin: 0; color: #666; background-color: white; padding: 8px; border-radius: 3px; white-space: pre-wrap;">
            ${ticket.message}
          </p>
        </div>

        <p style="color: #666; margin-bottom: 12px;">
          Please log in to the admin panel to review and respond to this ticket.
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

        <p style="color: #999; font-size: 12px;">
          Auto-generated notification - Ticket: ${ticket.srNumber}
        </p>
      </div>
    </div>
  `;

  return await sendEmail(
    SUPPORT_EMAIL,
    `🎫 New Support Ticket: [${ticket.srNumber}] ${ticket.subject}`,
    htmlBody
  );
}

// Reminder notification for unassigned tickets
export async function sendUnassignedTicketReminderToAdmins(
  tickets: supportService.SupportTicket[]
): Promise<boolean> {
  if (tickets.length === 0) {
    return false;
  }

  const ticketList = tickets
    .map(t => `- [${t.srNumber}] ${t.subject} (Priority: ${t.priority}, Category: ${t.category})`)
    .join('\n');

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #ff9800; margin-bottom: 16px;">⚠️ Unassigned Support Tickets Reminder</h2>
        
        <p style="color: #666; margin-bottom: 12px;">
          The following support tickets are still unassigned and waiting for attention:
        </p>

        <div style="background-color: #fff3e0; padding: 16px; border-left: 4px solid #ff9800; margin-bottom: 24px; border-radius: 4px;">
          <pre style="color: #333; margin: 0; white-space: pre-wrap;">${ticketList}</pre>
        </div>

        <p style="color: #666; margin-bottom: 12px;">
          Please review and assign these tickets as needed.
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

        <p style="color: #999; font-size: 12px;">
          Auto-generated reminder - Total unassigned: ${tickets.length}
        </p>
      </div>
    </div>
  `;

  return await sendEmail(
    SUPPORT_EMAIL,
    `⚠️ ${tickets.length} Unassigned Support Tickets Awaiting Review`,
    htmlBody
  );
}
