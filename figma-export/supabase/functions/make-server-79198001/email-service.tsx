import * as supportService from './support-service.tsx';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const FROM_EMAIL = 'GWMusic Support <support@gwmusic.com.ng>';
const SUPPORT_EMAIL = 'support@gwmusic.com.ng';

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
  const categoryLabels: Record<string, string> = {
    bug_report: 'Bug Report',
    question: 'General Inquiry',
    feature_request: 'Feature Request / Partnership',
    billing_inquiry: 'Billing & Payments',
    account_access: 'Account Access',
    technical_issue: 'Technical Support',
    other: 'Feedback / Other',
  };
  const priorityLabels: Record<string, string> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    urgent: 'Urgent',
  };
  const submittedAt = new Date(ticket.createdAt).toLocaleString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
  const categoryLabel = categoryLabels[ticket.category] || ticket.category;
  const priorityLabel = priorityLabels[ticket.priority] || ticket.priority;

  // Strip the "From: Name\n\n" prefix that ContactUs prepends to expose the raw message
  const rawMessage = ticket.message.replace(/^From:[^\n]+\n\n/, '');

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Message Received – GWMusic</title></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0A0A0A;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1A0A00 0%,#0A0A0A 100%);border-radius:12px 12px 0 0;padding:36px 40px 28px;text-align:center;border-bottom:2px solid #FF6B00;">
          <p style="margin:0 0 8px;font-size:28px;font-weight:800;color:#FF6B00;letter-spacing:-0.5px;">GWMusic</p>
          <p style="margin:0;font-size:13px;color:#B3B3B3;letter-spacing:0.08em;text-transform:uppercase;">by AMT Distro</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#161616;padding:36px 40px;">

          <!-- Greeting -->
          <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#FFFFFF;">Thanks for reaching out${ticket.userName ? `, ${ticket.userName.split(' ')[0]}` : ''}!</p>
          <p style="margin:0 0 28px;font-size:15px;color:#B3B3B3;line-height:1.6;">We've received your message and our support team will get back to you within <strong style="color:#FFD600;">24 hours</strong> on business days. Here's a full copy of everything you submitted.</p>

          <!-- Ticket reference badge -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1A1410;border:1px solid #FF6B00;border-radius:8px;margin-bottom:28px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#FF6B00;font-weight:700;">Ticket Reference</p>
              <p style="margin:0;font-size:20px;font-weight:800;color:#FFD600;letter-spacing:0.04em;">${ticket.srNumber}</p>
            </td></tr>
          </table>

          <!-- Submission details table -->
          <p style="margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#FF6B00;">Submission Details</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0F0F0F;border:1px solid #2A2A2A;border-radius:8px;margin-bottom:28px;overflow:hidden;">
            <tr style="border-bottom:1px solid #2A2A2A;">
              <td style="padding:12px 16px;width:38%;font-size:13px;color:#8D8D8D;font-weight:600;">Full Name</td>
              <td style="padding:12px 16px;font-size:13px;color:#FFFFFF;">${ticket.userName || '—'}</td>
            </tr>
            <tr style="border-bottom:1px solid #2A2A2A;">
              <td style="padding:12px 16px;font-size:13px;color:#8D8D8D;font-weight:600;">Email Address</td>
              <td style="padding:12px 16px;font-size:13px;color:#FFFFFF;">${ticket.userEmail}</td>
            </tr>
            <tr style="border-bottom:1px solid #2A2A2A;">
              <td style="padding:12px 16px;font-size:13px;color:#8D8D8D;font-weight:600;">Subject</td>
              <td style="padding:12px 16px;font-size:13px;color:#FFFFFF;">${ticket.subject}</td>
            </tr>
            <tr style="border-bottom:1px solid #2A2A2A;">
              <td style="padding:12px 16px;font-size:13px;color:#8D8D8D;font-weight:600;">Category</td>
              <td style="padding:12px 16px;font-size:13px;color:#FFFFFF;">${categoryLabel}</td>
            </tr>
            <tr style="border-bottom:1px solid #2A2A2A;">
              <td style="padding:12px 16px;font-size:13px;color:#8D8D8D;font-weight:600;">Priority</td>
              <td style="padding:12px 16px;font-size:13px;color:#FFFFFF;">${priorityLabel}</td>
            </tr>
            <tr style="border-bottom:1px solid #2A2A2A;">
              <td style="padding:12px 16px;font-size:13px;color:#8D8D8D;font-weight:600;">Status</td>
              <td style="padding:12px 16px;font-size:13px;color:#FFFFFF;">Open</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#8D8D8D;font-weight:600;">Submitted On</td>
              <td style="padding:12px 16px;font-size:13px;color:#FFFFFF;">${submittedAt}</td>
            </tr>
          </table>

          <!-- Message body -->
          <p style="margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#FF6B00;">Your Message</p>
          <div style="background:#0F0F0F;border:1px solid #2A2A2A;border-left:4px solid #FF6B00;border-radius:8px;padding:20px;margin-bottom:28px;">
            <p style="margin:0;font-size:14px;color:#D4D4D4;line-height:1.8;white-space:pre-wrap;">${rawMessage}</p>
          </div>

          <!-- What happens next -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1A1A1A;border-radius:8px;margin-bottom:28px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#FFFFFF;">What happens next?</p>
              <p style="margin:0 0 8px;font-size:13px;color:#B3B3B3;line-height:1.6;">✅ &nbsp;You'll receive a reply to <strong style="color:#FFFFFF;">${ticket.userEmail}</strong> once a team member reviews your request.</p>
              <p style="margin:0 0 8px;font-size:13px;color:#B3B3B3;line-height:1.6;">📋 &nbsp;Quote your ticket number <strong style="color:#FFD600;">${ticket.srNumber}</strong> in any follow-up communication.</p>
              <p style="margin:0;font-size:13px;color:#B3B3B3;line-height:1.6;">⏱ &nbsp;Average response time: <strong style="color:#FFFFFF;">under 24 hours</strong> (Mon – Fri, 9 AM – 6 PM WAT).</p>
            </td></tr>
          </table>

          <!-- CTA -->
          <p style="margin:0;font-size:13px;color:#8D8D8D;line-height:1.6;">Need to reach us directly? Email <a href="mailto:support@gwmusic.com.ng" style="color:#FF6B00;text-decoration:none;">support@gwmusic.com.ng</a> or call <a href="tel:+2348162988301" style="color:#FF6B00;text-decoration:none;">+234 816 298 8301</a>.</p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#0F0F0F;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;border-top:1px solid #2A2A2A;">
          <p style="margin:0 0 6px;font-size:12px;color:#555;">GWMusic · Powered by AMT Distro · Lagos, Nigeria</p>
          <p style="margin:0;font-size:11px;color:#444;">This is an automated confirmation. Please do not reply to this email — use <a href="mailto:support@gwmusic.com.ng" style="color:#FF6B00;text-decoration:none;">support@gwmusic.com.ng</a> instead.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return await sendEmail(
    ticket.userEmail,
    `[${ticket.srNumber}] We've received your message – GWMusic Support`,
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
