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
    if (!connection || !connection.access_token) {
      return Response.json({ error: 'Google Business Profile is not connected' }, { status: 400 });
    }

    const clientId = Deno.env.get('GOOGLE_BUSINESS_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_BUSINESS_CLIENT_SECRET');

    let accessToken = connection.access_token;
    const expired = connection.token_expires_at && new Date(connection.token_expires_at).getTime() <= Date.now();

    if (expired) {
      if (!connection.refresh_token) {
        await base44.asServiceRole.entities.PlatformConnection.update(connection.id, { connection_status: 'requires_authorised_connection', error_message: 'Access token expired and no refresh token is available. Please reconnect.' });
        return Response.json({ error: 'Access token expired. Please reconnect Google Business Profile.' }, { status: 400 });
      }
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: connection.refresh_token,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        }),
      });
      const refreshData = await refreshRes.json();
      if (!refreshRes.ok || refreshData.error) {
        await base44.asServiceRole.entities.PlatformConnection.update(connection.id, { connection_status: 'requires_authorised_connection', error_message: `Token refresh failed: ${refreshData.error_description || refreshData.error}` });
        return Response.json({ error: 'Failed to refresh access token. Please reconnect Google Business Profile.' }, { status: 400 });
      }
      accessToken = refreshData.access_token;
      const newExpiresAt = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString();
      await base44.asServiceRole.entities.PlatformConnection.update(connection.id, { access_token: accessToken, token_expires_at: newExpiresAt, connection_status: 'connected', error_message: '' });
    }

    const acctRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const acctData = await acctRes.json();
    if (!acctRes.ok || acctData.error) {
      return Response.json({ error: `Failed to fetch Google accounts: ${acctData.error?.message || 'Unknown error'}` }, { status: 400 });
    }

    const accounts = acctData.accounts || [];
    const results = [];
    for (const account of accounts) {
      const locUrl = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`);
      locUrl.searchParams.set('readMask', 'name,title,storefrontAddress');
      const locRes = await fetch(locUrl.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
      const locData = await locRes.json();
      if (locRes.ok && locData.locations) {
        for (const loc of locData.locations) {
          results.push({
            account_name: account.name,
            account_label: account.accountName,
            location_id: loc.name,
            location_name: loc.title,
            address: loc.storefrontAddress
              ? [loc.storefrontAddress.addressLines?.join(', '), loc.storefrontAddress.locality].filter(Boolean).join(', ')
              : '',
          });
        }
      }
    }

    return Response.json({ locations: results }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
});