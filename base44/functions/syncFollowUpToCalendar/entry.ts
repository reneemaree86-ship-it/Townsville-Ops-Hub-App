import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const followUp = payload.data;
    if (!followUp || payload.event?.type !== 'create') {
      return Response.json({ status: 'ignored' });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    const startDate = new Date(followUp.due_date);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

    const eventBody = {
      summary: `Follow-up: ${followUp.lead_name || followUp.note}`,
      description: [followUp.note, followUp.description].filter(Boolean).join('\n\n'),
      start: { dateTime: startDate.toISOString() },
      end: { dateTime: endDate.toISOString() },
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 60 }],
      },
    };

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      await base44.asServiceRole.entities.FollowUp.update(payload.event.entity_id, {
        calendar_sync_status: 'failed',
      });
      return Response.json({ status: 'error', details: errText }, { status: 500 });
    }

    const created = await res.json();
    await base44.asServiceRole.entities.FollowUp.update(payload.event.entity_id, {
      calendar_event_id: created.id,
      calendar_sync_status: 'synced',
    });

    return Response.json({ status: 'synced', event_id: created.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});