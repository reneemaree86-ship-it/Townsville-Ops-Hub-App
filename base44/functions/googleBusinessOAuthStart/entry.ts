import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const { business_id, redirect_uri } = payload;
    if (!redirect_uri) return Response.json({ error: 'Missing redirect_uri' }, { status: 400 });

    const clientId = Deno.env.get('GOOGLE_BUSINESS_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'GOOGLE_BUSINESS_CLIENT_ID not configured' }, { status: 500 });

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirect_uri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/business.manage');
    if (business_id) authUrl.searchParams.set('state', business_id);

    return Response.json({ authUrl: authUrl.toString() }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
});