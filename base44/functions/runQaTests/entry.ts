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

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const batchId = `qa_${Date.now()}`;
  const results = [];

  const pass = (name, area, notes) => results.push({ test_name: name, area_tested: area, status: 'pass', error_found: null, recommended_fix: null, test_batch_id: batchId, severity: 'info', error_log: notes || null });
  const fail = (name, area, error, fix, severity = 'warning') => results.push({ test_name: name, area_tested: area, status: 'fail', error_found: error, recommended_fix: fix, test_batch_id: batchId, severity });
  const warn = (name, area, error, fix) => results.push({ test_name: name, area_tested: area, status: 'warning', error_found: error, recommended_fix: fix, test_batch_id: batchId, severity: 'warning' });

  // --- TEST: Database connectivity ---
  try {
    const businesses = await base44.entities.Business.list();
    if (businesses.length === 0) {
      warn('Business records', 'Database', 'No businesses configured', 'Go to Settings and create at least one business profile for Renee\'s Cleaning Services');
    } else {
      pass('Business records', 'Database', `${businesses.length} business(es) found`);

      for (const biz of businesses) {
        if (!biz.website_url) fail(`${biz.name}: website_url missing`, 'Business Config', 'website_url is blank', 'Set the website URL in Business Settings', 'critical');
        else pass(`${biz.name}: website_url set`, 'Business Config', biz.website_url);

        if (!biz.contact_email) warn(`${biz.name}: contact_email missing`, 'Business Config', 'No contact email', 'Add a contact email in Business Settings');
        else pass(`${biz.name}: contact_email set`, 'Business Config');

        if (!biz.contact_phone) warn(`${biz.name}: contact_phone missing`, 'Business Config', 'No contact phone', 'Add a contact phone in Business Settings');
        else pass(`${biz.name}: contact_phone set`, 'Business Config');

        if (!biz.suburbs_served || biz.suburbs_served.length === 0) warn(`${biz.name}: no suburbs set`, 'Business Config', 'No service areas defined', 'Add suburbs served in Business Settings - this affects lead scoring');
        else pass(`${biz.name}: suburbs set`, 'Business Config', `${biz.suburbs_served.length} suburb(s)`);

        // Test website reachability
        if (biz.website_url) {
          try {
            const siteRes = await safeFetch(biz.website_url, {
              method: 'HEAD',
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BCCBot/1.0)' },
              signal: AbortSignal.timeout(8000),
            });
            if (siteRes.ok) {
              pass(`${biz.name}: website reachable`, 'Website', `HTTP ${siteRes.status}`);
              if (!biz.website_url.startsWith('https://')) {
                fail(`${biz.name}: website not HTTPS`, 'Website', 'Site is using HTTP not HTTPS', 'Install SSL certificate. Most hosts provide free SSL via Let\'s Encrypt', 'critical');
              }
            } else {
              fail(`${biz.name}: website returned error`, 'Website', `HTTP ${siteRes.status} from ${biz.website_url}`, 'Check hosting/DNS. The site is returning an error code.', 'critical');
            }
          } catch (e) {
            fail(`${biz.name}: website unreachable`, 'Website', `Cannot connect to ${biz.website_url}: ${e.message}`, 'Check that the website is online and the URL in Business Settings is correct.', 'critical');
          }
        }
      }
    }
  } catch (e) {
    fail('Database connectivity', 'Database', e.message, 'Check Base44 entity configuration', 'critical');
  }

  // --- TEST: Environment secrets ---
  const requiredSecrets = [
    { key: 'FACEBOOK_ACCESS_TOKEN', name: 'Facebook Access Token', purpose: 'Facebook Group lead scanning', howTo: 'Get from https://developers.facebook.com/ — create a Facebook App, request pages_read_engagement permission, generate a long-lived access token' },
    { key: 'SCRAPING_API_KEY', name: 'ScrapingBee/Bright Data Key', purpose: 'Gumtree lead scraping', howTo: 'Sign up at https://www.scrapingbee.com/ or https://brightdata.com/ — add API key to app secrets as SCRAPING_API_KEY' },
  ];

  for (const secret of requiredSecrets) {
    if (Deno.env.get(secret.key)) {
      pass(`Secret: ${secret.name}`, 'Environment Secrets');
    } else {
      warn(`Secret: ${secret.name} not set`, 'Environment Secrets', `${secret.purpose} is disabled`, `MANUAL SETUP REQUIRED: ${secret.howTo}. Add as secret "${secret.key}" in Base44 dashboard Settings > Environment Variables`);
    }
  }

  // --- TEST: AI integration ---
  try {
    const testResult = await base44.integrations.Core.InvokeLLM({
      prompt: 'Reply with only the word "ok"',
    });
    if (testResult) pass('AI / LLM integration', 'Integrations');
    else fail('AI / LLM integration', 'Integrations', 'LLM returned empty response', 'Check Base44 integration credits');
  } catch (e) {
    fail('AI / LLM integration', 'Integrations', e.message, 'Check Base44 integration credits and plan', 'critical');
  }

  // --- TEST: Lead data ---
  try {
    const leads = await base44.entities.Lead.list('-created_date', 5);
    pass('Lead entity readable', 'Database', `${leads.length} recent lead(s)`);
  } catch (e) {
    fail('Lead entity readable', 'Database', e.message, 'Check Lead entity schema', 'critical');
  }

  // --- TEST: URL Watchlist ---
  try {
    const watchlist = await base44.entities.UrlWatchlist.list();
    if (watchlist.length === 0) {
      warn('URL Watchlist empty', 'Lead Sources', 'No URLs configured for lead scanning', 'Go to URL Watchlist and add Facebook Group pages, Gumtree search URLs, or community notice boards that you want monitored for cleaning leads');
    } else {
      pass('URL Watchlist configured', 'Lead Sources', `${watchlist.length} URL(s) being monitored`);
      const errored = watchlist.filter(w => w.status === 'error');
      if (errored.length > 0) warn(`${errored.length} watchlist URL(s) erroring`, 'Lead Sources', `${errored.map(w => w.url).join(', ')}`, 'Check these URLs are publicly accessible without login');
    }
  } catch (e) {
    fail('URL Watchlist', 'Lead Sources', e.message, 'Check UrlWatchlist entity', 'warning');
  }

  // --- TEST: Notifications ---
  try {
    await base44.entities.Notification.list('-created_date', 1);
    pass('Notification system', 'Notifications');
  } catch (e) {
    fail('Notification system', 'Notifications', e.message, 'Check Notification entity schema', 'warning');
  }

  // --- TEST: SEO Audits ---
  try {
    const audits = await base44.entities.SeoAudit.list('-created_date', 1);
    if (audits.length === 0) warn('No SEO audits run yet', 'SEO', 'SEO module has no data', 'Go to SEO Control Centre and run your first audit');
    else pass('SEO audit data', 'SEO', `${audits.length} audit(s) on record`);
  } catch (e) {
    fail('SEO audit entity', 'SEO', e.message, 'Check SeoAudit entity schema', 'warning');
  }

  // --- TEST: Follow-ups ---
  try {
    const fups = await base44.entities.FollowUp.filter({ status: 'pending' });
    const overdue = fups.filter(f => new Date(f.due_date) < new Date()).length;
    if (overdue > 0) warn(`${overdue} overdue follow-up(s)`, 'CRM', `${overdue} follow-ups past due date`, 'Go to Follow-Ups and action or reschedule these');
    else pass('Follow-ups', 'CRM', `${fups.length} pending, none overdue`);
  } catch (e) {
    fail('Follow-ups entity', 'CRM', e.message, 'Check FollowUp entity schema', 'warning');
  }

  // Save all results
  for (const result of results) {
    await base44.entities.QaTest.create(result);
  }

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warning').length;

  return Response.json({ passed, failed, warnings, total: results.length, batch_id: batchId });
});