const nodemailer = require('nodemailer');
const env = require('../config/env');
const User = require('../models/user');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatActor(actor) {
  if (!actor) {
    return 'System';
  }

  const roleLabel = actor.role ? ` (${actor.role})` : '';
  const emailLabel = actor.email ? ` <${actor.email}>` : '';

  return `${actor.fullName || 'Unknown user'}${roleLabel}${emailLabel}`;
}

function formatTarget(target) {
  if (!target) {
    return 'activity';
  }

  const name = target.name || target.title || target.displayName || target.label || 'item';
  const idLabel = target.id ? ` [${target.id}]` : '';

  return `${target.type || 'item'}: ${name}${idLabel}`;
}

function buildEmailMessage({ actor, action, target, summary, details }) {
  const subjectName = target.name || target.displayName || target.title || 'item';
  const title = `${action.toUpperCase()} ${target.type || 'activity'}`;
  const detailBlock = details?.length
    ? `<ul>${details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join('')}</ul>`
    : '';

  return {
    subject: `[AMT Distro] ${title} - ${subjectName}`,
    text: [
      `Action: ${action}`,
      `Actor: ${formatActor(actor)}`,
      `Target: ${formatTarget(target)}`,
      summary ? `Summary: ${summary}` : null,
      details?.length ? `Details:\n- ${details.join('\n- ')}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin: 0 0 12px;">${escapeHtml(title)}</h2>
        <p><strong>Actor:</strong> ${escapeHtml(formatActor(actor))}</p>
        <p><strong>Target:</strong> ${escapeHtml(formatTarget(target))}</p>
        ${summary ? `<p><strong>Summary:</strong> ${escapeHtml(summary)}</p>` : ''}
        ${detailBlock}
      </div>
    `,
  };
}

function createTransport() {
  if (!env.smtpHost || !env.mailFrom) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
  });
}

async function resolveRecipients() {
  if (env.activityNotificationEmails.length > 0) {
    return env.activityNotificationEmails;
  }

  const admins = await User.find({ role: 'admin', status: 'active' }).select('email');
  return admins.map((admin) => admin.email).filter(Boolean);
}

async function notifyActivity({ actor, action, target, summary, details }) {
  try {
    const recipients = await resolveRecipients();

    if (!recipients.length) {
      return { skipped: true, reason: 'no_recipients' };
    }

    const transport = createTransport();

    if (!transport) {
      return { skipped: true, reason: 'email_not_configured' };
    }

    const message = buildEmailMessage({ actor, action, target, summary, details });

    await transport.sendMail({
      from: env.mailFrom,
      to: env.mailFrom,
      bcc: recipients,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    return { sent: true, recipients };
  } catch (error) {
    console.error('[activityNotificationService] failed to send email notification:', error);
    return { sent: false, error: error.message };
  }
}

module.exports = {
  notifyActivity,
};