import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const { business_id } = payload;

    const connections = await base44.asServiceRole.entities.PlatformConnection.filter({ platform_name: 'Google Business Profile', business_id: business_id || '' });
    const connection = connections[0];
    if (!connection) return Response.json({ success: true }, { status: 200 });

    if (connection.access_token) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${connection.access_token}`, { method: 'POST' });
      } catch (_e) {
        // non-fatal, continue clearing local record
      }
    }

    await base44.asServiceRole.entities.PlatformConnection.update(connection.id, {
      connection_status: 'not_connected',
      access_token: '',
      refresh_token: '',
      token_expires_at: '',
      location_id: '',
      location_name: '',
      external_id: '',
      error_message: '',
    });

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
});