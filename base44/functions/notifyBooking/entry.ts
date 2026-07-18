import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Shared secret set as a static automation argument (see "New Booking Alert" automation's
// function_args) — rejects any caller that isn't the trusted entity-automation trigger.
const AUTOMATION_TOKEN = 'wh_7f2a9c1e4b6d8f3a0c5e2b9d7f4a1c8e';

// Triggered by entity automation when a Booking is created
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch (_) {}

    if (body.args?.secret !== AUTOMATION_TOKEN) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const booking = body.data;
    if (!booking?.business_id || !booking?.client_name) {
      return Response.json({ skipped: true });
    }

    const serviceLabel = (booking.service_type || 'Clean').replace(/_/g, ' ');
    const timeStr = booking.start_time ? ` at ${booking.start_time}${booking.end_time ? '–' + booking.end_time : ''}` : '';
    const locationStr = [booking.client_address, booking.suburb].filter(Boolean).join(', ');

    // Create in-app notification
    await base44.asServiceRole.entities.Notification.create({
      business_id: booking.business_id,
      type: 'system_alert',
      title: `New booking: ${booking.client_name}`,
      message: `${serviceLabel} on ${booking.date}${timeStr}${locationStr ? ' — ' + locationStr : ''}`,
      severity: 'medium',
      read: false,
      related_entity_type: 'Booking',
      related_entity_id: booking.id,
    });

    // Email alert if the business has a contact email
    const businesses = await base44.asServiceRole.entities.Business.filter({ id: booking.business_id });
    const biz = businesses[0];
    if (biz?.contact_email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: biz.contact_email,
        from_name: biz.name,
        subject: `New clean scheduled: ${booking.client_name} — ${booking.date}`,
        body: [
          `A new clean has been scheduled!\n`,
          `Client:   ${booking.client_name}`,
          `Date:     ${booking.date}${timeStr}`,
          `Service:  ${serviceLabel}`,
          `Address:  ${locationStr || 'Not specified'}`,
          `Notes:    ${booking.notes || 'None'}`,
          `\nLog in to view and manage this booking.`,
        ].join('\n'),
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});