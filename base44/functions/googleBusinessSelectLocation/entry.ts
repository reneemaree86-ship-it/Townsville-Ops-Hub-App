import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const { business_id, account_name, location_id, location_name } = payload;
    if (!location_id) return Response.json({ error: 'Missing location_id' }, { status: 400 });

    const connections = await base44.asServiceRole.entities.PlatformConnection.filter({ platform_name: 'Google Business Profile', business_id: business_id || '' });
    const connection = connections[0];
    if (!connection) return Response.json({ error: 'Google Business Profile is not connected' }, { status: 400 });

    await base44.asServiceRole.entities.PlatformConnection.update(connection.id, {
      external_id: account_name || connection.external_id,
      location_id,
      location_name,
      connection_status: 'connected',
      error_message: '',
      last_checked: new Date().toISOString(),
    });

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
});