import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const FB_APP_ID = '1836147090686861';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } });
  }
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const { business_id, page_id, page_name, page_access_token } = payload;
    if (!page_id || !page_name || !page_access_token) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const FB_APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET');
    if (!FB_APP_SECRET) return Response.json({ error: 'FACEBOOK_APP_SECRET not configured' }, { status: 500 });

    const debugUrl = new URL('https://graph.facebook.com/v20.0/debug_token');
    debugUrl.searchParams.set('input_token', page_access_token);
    debugUrl.searchParams.set('access_token', `${FB_APP_ID}|${FB_APP_SECRET}`);
    const debugRes = await fetch(debugUrl.toString());
    const debugData = await debugRes.json();
    if (debugData.error || !debugData.data?.is_valid) {
      return Response.json({ error: `Page token invalid: ${debugData.error?.message || 'expired'}` }, { status: 400 });
    }

    const subscribeRes = await fetch(`https://graph.facebook.com/v20.0/${page_id}/subscribed_apps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: page_access_token, subscribed_fields: ['messages', 'messaging_postbacks', 'leadgen'] }),
    });
    const subscribeData = await subscribeRes.json();

    const db = base44.asServiceRole.entities.PlatformConnection;
    const connectionData = {
      business_id: business_id || null,
      platform_name: 'Facebook Page',
      connection_status: 'connected',
      connection_type: 'oauth',
      external_id: page_id,
      account_label: page_name,
      access_token: page_access_token,
      token_expires_at: debugData.data.expires_at ? new Date(debugData.data.expires_at * 1000).toISOString() : null,
      scopes: debugData.data?.scopes || [],
      notes: `Connected ${new Date().toISOString()}. Webhooks subscribed: ${subscribeData.success === true}.`,
      last_successful_at: new Date().toISOString(),
      last_checked: new Date().toISOString(),
      error_message: null,
    };

    const existing = await db.filter({ platform_name: 'Facebook Page', external_id: page_id });
    let connectionId;
    if (existing.length > 0) {
      await db.update(existing[0].id, connectionData);
      connectionId = existing[0].id;
    } else {
      const created = await db.create(connectionData);
      connectionId = created.id;
    }

    return Response.json({ success: true, connection_id: connectionId, page_name, page_id, webhooks_subscribed: subscribeData.success === true }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
});