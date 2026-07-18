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
    const { code, redirect_uri } = payload;
    if (!code) return Response.json({ error: 'Missing code' }, { status: 400 });

    const FB_APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET');
    if (!FB_APP_SECRET) return Response.json({ error: 'FACEBOOK_APP_SECRET not configured' }, { status: 500 });

    if (!redirect_uri) return Response.json({ error: 'Missing redirect_uri' }, { status: 400 });

    const tokenUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', FB_APP_ID);
    tokenUrl.searchParams.set('client_secret', FB_APP_SECRET);
    tokenUrl.searchParams.set('redirect_uri', redirect_uri);
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error) {
      return Response.json({ error: `Facebook token exchange failed: ${tokenData.error?.message}` }, { status: 400 });
    }

    const longTokenUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token');
    longTokenUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longTokenUrl.searchParams.set('client_id', FB_APP_ID);
    longTokenUrl.searchParams.set('client_secret', FB_APP_SECRET);
    longTokenUrl.searchParams.set('fb_exchange_token', tokenData.access_token);
    const longTokenRes = await fetch(longTokenUrl.toString());
    const longTokenData = await longTokenRes.json();
    const longLivedToken = longTokenData.access_token || tokenData.access_token;

    const pagesUrl = new URL('https://graph.facebook.com/v20.0/me/accounts');
    pagesUrl.searchParams.set('access_token', longLivedToken);
    pagesUrl.searchParams.set('fields', 'id,name,access_token,category,fan_count');
    const pagesRes = await fetch(pagesUrl.toString());
    const pagesData = await pagesRes.json();
    if (!pagesRes.ok || pagesData.error) {
      return Response.json({ error: `Failed to fetch Facebook Pages: ${pagesData.error?.message}` }, { status: 400 });
    }

    const pages = (pagesData.data || []).map((p) => ({ id: p.id, name: p.name, access_token: p.access_token, category: p.category, fan_count: p.fan_count ?? 0 }));
    return Response.json({ pages }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
});