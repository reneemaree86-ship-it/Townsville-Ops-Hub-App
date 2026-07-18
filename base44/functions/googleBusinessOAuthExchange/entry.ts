import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const { code, redirect_uri, business_id } = payload;
    if (!code) return Response.json({ error: 'Missing code' }, { status: 400 });
    if (!redirect_uri) return Response.json({ error: 'Missing redirect_uri' }, { status: 400 });

    const clientId = Deno.env.get('GOOGLE_BUSINESS_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_BUSINESS_CLIENT_SECRET');
    if (!clientId || !clientSecret) return Response.json({ error: 'Google Business OAuth not configured' }, { status: 500 });

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error) {
      return Response.json({ error: `Google token exchange failed: ${tokenData.error_description || tokenData.error}` }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    let accountLabel = 'Google Business Profile';
    let externalId = '';
    try {
      const acctRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const acctData = await acctRes.json();
      const firstAccount = acctData.accounts?.[0];
      if (firstAccount) {
        accountLabel = firstAccount.accountName || accountLabel;
        externalId = firstAccount.name || '';
      }
    } catch (_e) {
      // non-fatal, keep defaults
    }

    const connectionData = {
      business_id: business_id || '',
      platform_name: 'Google Business Profile',
      connection_status: 'connected',
      connection_type: 'oauth',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || undefined,
      token_expires_at: expiresAt,
      scopes: (tokenData.scope || '').split(' ').filter(Boolean),
      external_id: externalId,
      account_label: accountLabel,
      last_checked: new Date().toISOString(),
      last_successful_at: new Date().toISOString(),
      error_message: '',
    };

    const existing = await base44.asServiceRole.entities.PlatformConnection.filter({ platform_name: 'Google Business Profile', business_id: business_id || '' });
    if (existing.length > 0) {
      // Don't overwrite a stored refresh_token with an empty value if Google didn't send a new one
      if (!connectionData.refresh_token) delete connectionData.refresh_token;
      await base44.asServiceRole.entities.PlatformConnection.update(existing[0].id, connectionData);
    } else {
      await base44.asServiceRole.entities.PlatformConnection.create(connectionData);
    }

    return Response.json({ success: true, account_label: accountLabel }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
});