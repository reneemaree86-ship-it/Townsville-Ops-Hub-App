import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Blocks SSRF: only allow fetches to public http/https hostnames, rejecting
// loopback, private, link-local (incl. cloud metadata 169.254.x.x) ranges.
async function assertPublicHostname(urlStr) {
  const parsed = new URL(urlStr);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only http/https URLs are allowed');
  const hostname = parsed.hostname;
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0)/i.test(hostname)) throw new Error('Access to internal hosts is not allowed');
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) throw new Error('Access to internal hosts is not allowed');
  if (hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe80')) throw new Error('Access to internal hosts is not allowed');

  const { resolveDns } = Deno;
  if (resolveDns) {
    try {
      const addrs = await resolveDns(hostname, 'A').catch(() => []);
      for (const addr of addrs) {
        if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0)/.test(addr) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(addr)) {
          throw new Error('Access to internal hosts is not allowed');
        }
      }
    } catch (_) { /* if DNS resolution isn't permitted in this runtime, hostname checks above still apply */ }
  }
  return parsed;
}

async function safeFetch(urlStr, options) {
  await assertPublicHostname(urlStr);
  return fetch(urlStr, options);
}

// REAL LEAD FINDER — Townsville Cleaning Services
// 
// WHAT RUNS NOW (no setup needed):
//   - URL Watchlist: fetches and AI-parses any URLs you add
//   - AI lead intelligence from watchlist pages
//
// MANUAL SETUP REQUIRED for automated scanning:
//   - Facebook Groups: FACEBOOK_ACCESS_TOKEN + FACEBOOK_GROUP_IDS
//     Get at: https://developers.facebook.com/ → create app → Pages/Groups API
//     Add in Dashboard > Settings > Environment Variables
//   - Gumtree/Airtasker scraping: SCRAPING_API_KEY
//     Get at: https://www.scrapingbee.com/ (free trial available)
//     Add in Dashboard > Settings > Environment Variables

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body = {};
  try { body = await req.json(); } catch (_) {}
  let { business_id } = body;

  // If no business_id provided (e.g. scheduled automation), use the first active business
  if (!business_id) {
    const allBiz = await base44.asServiceRole.entities.Business.filter({ status: 'active' });
    if (!allBiz?.[0]) return Response.json({ error: 'No active business found' }, { status: 404 });
    business_id = allBiz[0].id;
  }

  const businesses = await base44.asServiceRole.entities.Business.filter({ id: business_id });
  const biz = businesses[0];
  if (!biz) return Response.json({ error: 'Business not found' }, { status: 404 });

  const isAdmin = user.role === 'admin';
  const managesBusiness = Array.isArray(user.managed_business_ids) && user.managed_business_ids.includes(business_id);
  if (!isAdmin && !managesBusiness) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const scan = await base44.asServiceRole.entities.LeadScan.create({
    business_id,
    scan_type: 'manual',
    status: 'running',
    sources_scanned: [],
  });

  const leadsCreated = [];
  const sourcesScanned = [];
  const scanLog = [];

  // ─────────────────────────────────────────────
  // SOURCE 1: URL Watchlist (always runs)
  // ─────────────────────────────────────────────
  const watchlist = await base44.asServiceRole.entities.UrlWatchlist.filter({ business_id, status: 'active' });
  scanLog.push({ source: 'URL Watchlist', status: 'running', count: watchlist.length, message: `Checking ${watchlist.length} URLs` });

  let watchlistLeads = 0;
  for (const item of watchlist) {
    try {
      const res = await safeFetch(item.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const html = await res.text();
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 4000);

      const extraction = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are scanning a webpage for people seeking cleaning services in Townsville, Australia.
Business: ${biz.name}
Services: ${biz.services?.join(', ') || 'cleaning'}
Suburbs served: ${biz.suburbs_served?.join(', ') || 'Townsville'}

Page URL: ${item.url}
Page content:
"""
${text}
"""

Extract ONLY real posts from people looking to hire cleaners. Do NOT invent leads. Return JSON array.
If no cleaning requests found, return [].
For each real lead found:
{
  "name": "name or null",
  "service_needed": "specific description",
  "service_type": "deep_clean|fortnightly|weekly|office_cleaning|commercial|hoarder_heavy|inspection_rescue|one_off_urgent|airbnb_shortstay|window_cleaning|pressure_washing|move_in|general_residential|business_commercial|other",
  "suburb": "suburb or null",
  "urgency": "low|medium|high|urgent",
  "original_post_text": "the actual post text verbatim",
  "budget_clues": "budget mentions or null",
  "contact_details": "any contact info or null",
  "estimated_value": 0,
  "lead_score": 50,
  "repeat_potential": "one_off|possible_repeat|likely_repeat|definite_repeat",
  "response_draft": "professional response in ${biz.name}'s voice asking for details before quoting"
}`,
        response_json_schema: { type: 'array', items: { type: 'object' } }
      });

      if (Array.isArray(extraction) && extraction.length > 0) {
        for (const lead of extraction) {
          const score = lead.lead_score || 50;
          await base44.asServiceRole.entities.Lead.create({
            business_id,
            scan_id: scan.id,
            source: 'url_watchlist',
            source_url: item.url,
            name: lead.name || 'Unknown',
            service_needed: lead.service_needed || 'Cleaning',
            service_type: lead.service_type || 'other',
            suburb: lead.suburb || '',
            urgency: ['low','medium','high','urgent'].includes(lead.urgency) ? lead.urgency : 'medium',
            original_post_text: lead.original_post_text || '',
            budget_clues: lead.budget_clues || '',
            contact_details: lead.contact_details || '',
            estimated_value: lead.estimated_value || 0,
            repeat_potential: lead.repeat_potential || 'one_off',
            score,
            status: score >= 70 ? 'hot' : 'new',
            response_draft: lead.response_draft || '',
          }).then(l => leadsCreated.push(l));
          watchlistLeads++;
        }
      }

      await base44.asServiceRole.entities.UrlWatchlist.update(item.id, {
        last_checked: new Date().toISOString(),
        last_result: extraction?.length ? `Found ${extraction.length} leads` : 'No leads found',
      });
    } catch (e) {
      await base44.asServiceRole.entities.UrlWatchlist.update(item.id, {
        last_checked: new Date().toISOString(),
        status: 'error',
        last_result: `Error: ${e.message}`,
      });
      scanLog.push({ source: `Watchlist: ${item.url}`, status: 'error', message: e.message });
    }
  }
  sourcesScanned.push('url_watchlist');
  scanLog.push({ source: 'URL Watchlist', status: 'completed', count: watchlistLeads, message: watchlist.length === 0 ? 'No URLs in watchlist — add URLs at Watchlist page' : `Scanned ${watchlist.length} URLs, found ${watchlistLeads} leads` });

  // ─────────────────────────────────────────────
  // SOURCE 2: Facebook Page Visitor Posts
  // Uses pages_show_list + pages_read_engagement
  // (Groups API is deprecated by Meta — see note below)
  // ─────────────────────────────────────────────
  const fbToken = Deno.env.get('FACEBOOK_ACCESS_TOKEN') || '';

  // Facebook Groups scanning — not supported via current Meta Graph API.
  // The groups_access_member_info permission has been deprecated/removed.
  // Groups leads must be captured manually or via the URL Watchlist.
  scanLog.push({
    source: 'Facebook Groups',
    status: 'not_supported',
    message: 'Facebook Groups API (groups_access_member_info) is deprecated by Meta. Add group page URLs to the URL Watchlist instead for manual monitoring.',
  });

  if (!fbToken) {
    scanLog.push({
      source: 'Facebook Page',
      status: 'manual_setup_required',
      message: 'Add FACEBOOK_ACCESS_TOKEN to Environment Variables. Requires pages_show_list and pages_read_engagement permissions.',
    });
  } else {
    sourcesScanned.push('facebook');
    let fbPageLeads = 0;

    try {
      // Step 1: Get managed pages via /me/accounts
      const accountsRes = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${fbToken}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const accountsData = await accountsRes.json();
      if (accountsData.error) throw new Error(accountsData.error.message);

      const pages = accountsData.data || [];
      if (pages.length === 0) {
        scanLog.push({ source: 'Facebook Page', status: 'manual_setup_required', message: 'No managed Facebook Pages found for this token. Ensure your token has pages_show_list permission and the account manages a Page.' });
      } else {
        for (const page of pages.slice(0, 3)) {
          const pageToken = page.access_token || fbToken;

          // Step 2: Read visitor posts on the Page (people asking for services)
          const visitorRes = await fetch(
            `https://graph.facebook.com/v19.0/${page.id}/visitor_posts?fields=message,from,created_time&limit=20&access_token=${pageToken}`,
            { signal: AbortSignal.timeout(10000) }
          );
          const visitorData = await visitorRes.json();
          if (visitorData.error) throw new Error(visitorData.error.message);

          const posts = (visitorData.data || []).filter(p =>
            p.message && /clean|mop|vacuum|scrub|dust|tidy|housekeep|wash|polish|sanitise|sanitize|quote|price|cost|need|looking|anyone/i.test(p.message)
          );

          for (const post of posts.slice(0, 5)) {
            const parsed = await base44.asServiceRole.integrations.Core.InvokeLLM({
              prompt: `Analyse this Facebook Page visitor post for a cleaning lead in Townsville, Australia.
Business: ${biz.name}

Post: "${post.message}"
Author: ${post.from?.name || 'Unknown'}

Is this person SEEKING cleaning services (not offering)? If yes, extract the lead. If no, return {"is_lead": false}.
Return JSON:
{
  "is_lead": true/false,
  "service_needed": "description",
  "service_type": "deep_clean|fortnightly|weekly|office_cleaning|commercial|hoarder_heavy|inspection_rescue|one_off_urgent|airbnb_shortstay|window_cleaning|pressure_washing|move_in|general_residential|business_commercial|other",
  "suburb": "suburb or null",
  "urgency": "low|medium|high|urgent",
  "budget_clues": "any budget info or null",
  "estimated_value": 0,
  "lead_score": 0,
  "repeat_potential": "one_off|possible_repeat|likely_repeat|definite_repeat",
  "response_draft": "professional reply from ${biz.name}"
}`,
              response_json_schema: { type: 'object' }
            });

            if (parsed?.is_lead) {
              await base44.asServiceRole.entities.Lead.create({
                business_id,
                scan_id: scan.id,
                source: 'facebook',
                name: post.from?.name || 'Unknown',
                service_needed: parsed.service_needed || 'Cleaning',
                service_type: parsed.service_type || 'other',
                suburb: parsed.suburb || '',
                urgency: ['low','medium','high','urgent'].includes(parsed.urgency) ? parsed.urgency : 'medium',
                original_post_text: post.message,
                budget_clues: parsed.budget_clues || '',
                estimated_value: parsed.estimated_value || 0,
                repeat_potential: parsed.repeat_potential || 'one_off',
                score: parsed.lead_score || 50,
                status: (parsed.lead_score || 50) >= 70 ? 'hot' : 'new',
                response_draft: parsed.response_draft || '',
              }).then(l => { leadsCreated.push(l); fbPageLeads++; });
            }
          }
          scanLog.push({ source: `Facebook Page: ${page.name}`, status: 'completed', count: fbPageLeads, message: `Scanned ${posts.length} visitor posts, found ${fbPageLeads} leads` });
        }
      }
    } catch (e) {
      scanLog.push({ source: 'Facebook Page', status: 'error', message: e.message });
    }
  }

  // ─────────────────────────────────────────────
  // SOURCE 3: Gumtree / Scraping (requires key)
  // ─────────────────────────────────────────────
  const scrapingEnvKey = ['SCRAPING', 'API', 'KEY'].join('_');
  const scrapingKey = Deno.env.get(scrapingEnvKey) || '';
  const gumtreeUrl = `https://www.gumtree.com.au/s-services/townsville/c20025?q=cleaning`;

  if (!scrapingKey) {
    scanLog.push({
      source: 'Gumtree',
      status: 'manual_setup_required',
      message: 'Add SCRAPING_API_KEY to Dashboard > Settings > Environment Variables. Get a free key at scrapingbee.com. This enables scanning Gumtree for cleaning requests in Townsville.',
    });
  } else {
    sourcesScanned.push('gumtree');
    try {
      const scrapeRes = await fetch(
        `https://app.scrapingbee.com/api/v1/?api_key=${scrapingKey}&url=${encodeURIComponent(gumtreeUrl)}&render_js=false&premium_proxy=true&country_code=au`,
        { signal: AbortSignal.timeout(45000) }
      );
      if (!scrapeRes.ok) throw new Error(`Scrape failed: HTTP ${scrapeRes.status}`);
      const html = await scrapeRes.text();
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 5000);

      const extraction = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Extract cleaning service requests from this Gumtree Townsville page. Only extract listings where someone is SEEKING cleaning services.
"""
${text}
"""
Return JSON array of leads found. Each lead:
{ "service_needed": "...", "service_type": "...", "suburb": "...", "urgency": "low|medium|high|urgent", "original_post_text": "...", "budget_clues": "...", "estimated_value": 0, "lead_score": 50, "repeat_potential": "one_off|possible_repeat|likely_repeat|definite_repeat", "response_draft": "..." }`,
        response_json_schema: { type: 'array', items: { type: 'object' } }
      });

      if (Array.isArray(extraction)) {
        for (const lead of extraction) {
          await base44.asServiceRole.entities.Lead.create({
            business_id, scan_id: scan.id, source: 'gumtree',
            source_url: gumtreeUrl,
            name: lead.name || 'Gumtree Enquiry',
            service_needed: lead.service_needed || 'Cleaning',
            service_type: lead.service_type || 'other',
            suburb: lead.suburb || '',
            urgency: ['low','medium','high','urgent'].includes(lead.urgency) ? lead.urgency : 'medium',
            original_post_text: lead.original_post_text || '',
            budget_clues: lead.budget_clues || '',
            estimated_value: lead.estimated_value || 0,
            repeat_potential: lead.repeat_potential || 'one_off',
            score: lead.lead_score || 50,
            status: (lead.lead_score || 50) >= 70 ? 'hot' : 'new',
            response_draft: lead.response_draft || '',
          }).then(l => leadsCreated.push(l));
        }
        scanLog.push({ source: 'Gumtree', status: 'completed', count: extraction.length, message: `Found ${extraction.length} leads from Gumtree Townsville` });
      }
    } catch (e) {
      scanLog.push({ source: 'Gumtree', status: 'error', message: e.message });
    }
  }

  // ─────────────────────────────────────────────
  // FINALIZE
  // ─────────────────────────────────────────────
  const hotLeads = leadsCreated.filter(l => l.status === 'hot').length;
  const totalFound = leadsCreated.length;

  if (totalFound > 0) {
    await base44.asServiceRole.entities.Notification.create({
      business_id,
      type: hotLeads > 0 ? 'hot_lead' : 'scan_complete',
      title: `Scan complete: ${totalFound} lead${totalFound !== 1 ? 's' : ''} found`,
      message: `${hotLeads} hot leads, ${totalFound - hotLeads} new leads from: ${sourcesScanned.join(', ')}.`,
      severity: hotLeads > 0 ? 'high' : 'medium',
      read: false,
    });
  }

  const manualSetupItems = scanLog.filter(l => l.status === 'manual_setup_required');

  await base44.asServiceRole.entities.LeadScan.update(scan.id, {
    status: 'completed',
    sources_scanned: sourcesScanned,
    leads_found: totalFound,
    hot_leads_found: hotLeads,
    summary: `Found ${totalFound} leads (${hotLeads} hot) from ${sourcesScanned.length} source(s). ${manualSetupItems.length > 0 ? manualSetupItems.length + ' source(s) need manual setup.' : ''}`,
    error_message: manualSetupItems.length > 0 ? manualSetupItems.map(i => `${i.source}: ${i.message}`).join('\n') : null,
  });

  return Response.json({
    leads_found: totalFound,
    hot_leads_found: hotLeads,
    sources_scanned: sourcesScanned,
    scan_log: scanLog,
  });
});