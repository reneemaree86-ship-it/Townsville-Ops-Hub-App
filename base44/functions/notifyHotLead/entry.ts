import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Shared secret set as a static automation argument (see "Hot Lead Alert Email" automation's
// function_args) — rejects any caller that isn't the trusted entity-automation trigger.
const AUTOMATION_TOKEN = 'wh_3d8e1f6a9c2b7d4e0f5a8c1b6e9d2f7a';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  let body = {};
  try { body = await req.json(); } catch (_) {}

  if (body.args?.secret !== AUTOMATION_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: lead } = body;
  if (!lead || lead.status !== 'hot') {
    return Response.json({ skipped: true, reason: 'Not a hot lead' });
  }

  // Fetch business details for context
  let bizName = 'Your Business';
  if (lead.business_id) {
    const businesses = await base44.asServiceRole.entities.Business.filter({ id: lead.business_id });
    if (businesses?.[0]) bizName = businesses[0].name;
  }

  const subject = `🔥 Hot Lead Alert — ${escapeHtml(lead.service_needed) || 'Cleaning Request'}`;
  const body_html = `
    <h2 style="color:#e85d04;">🔥 New Hot Lead for ${bizName}</h2>
    <table style="border-collapse:collapse;width:100%;max-width:600px;font-family:sans-serif;">
      <tr><td style="padding:8px;font-weight:bold;color:#555;">Name</td><td style="padding:8px;">${escapeHtml(lead.name) || 'Unknown'}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;color:#555;">Service Needed</td><td style="padding:8px;">${escapeHtml(lead.service_needed) || '—'}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;color:#555;">Suburb</td><td style="padding:8px;">${escapeHtml(lead.suburb) || '—'}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;color:#555;">Urgency</td><td style="padding:8px;">${escapeHtml(lead.urgency) || '—'}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;color:#555;">Score</td><td style="padding:8px;">${lead.score ?? '—'} / 100</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;color:#555;">Source</td><td style="padding:8px;">${escapeHtml(lead.source) || '—'}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;color:#555;">Contact</td><td style="padding:8px;">${escapeHtml(lead.contact_details) || '—'}</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;color:#555;">Budget Clues</td><td style="padding:8px;">${escapeHtml(lead.budget_clues) || '—'}</td></tr>
      ${lead.original_post_text ? `<tr><td style="padding:8px;font-weight:bold;color:#555;vertical-align:top;">Original Post</td><td style="padding:8px;font-style:italic;">${escapeHtml(lead.original_post_text)}</td></tr>` : ''}
      ${lead.response_draft ? `<tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;color:#555;vertical-align:top;">Suggested Reply</td><td style="padding:8px;">${escapeHtml(lead.response_draft)}</td></tr>` : ''}
    </table>
    <p style="margin-top:20px;font-size:12px;color:#999;">This alert was generated automatically by your Lead Finder system.</p>
  `;

  // Get admin email — use env override if set, otherwise find first admin user
  let toEmail = Deno.env.get('ALERT_EMAIL') || '';
  if (!toEmail) {
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    toEmail = admins?.[0]?.email || '';
  }
  if (!toEmail) return Response.json({ skipped: true, reason: 'No admin email found' });

  await base44.asServiceRole.integrations.Core.SendEmail({
    to: toEmail,
    subject,
    body: body_html,
    from_name: bizName,
  });

  return Response.json({ sent: true, lead_id: lead.id });
});