import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ORGANIC TRAFFIC RECOMMENDATIONS
// What this does: Analyses your business data (SEO issues, leads, website) and generates 
// real, actionable recommendations for increasing organic traffic.
//
// MANUAL SETUP REQUIRED for live traffic data:
// - Google Search Console API: Shows actual impressions, clicks, ranking keywords
//   Get at: https://search.google.com/search-console/
//   Setup: Add property for your domain, download credentials JSON
//   Add secret: GOOGLE_SEARCH_CONSOLE_SITE_URL (e.g. https://yourdomain.com.au)
// - Google Analytics 4 API: Real visitor/session data
//   Add secret: GA4_PROPERTY_ID
// Until then: AI generates recommendations from your SEO audit data + business context

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { business_id } = await req.json();
  if (!business_id) return Response.json({ error: 'business_id required' }, { status: 400 });

  const biz = await base44.entities.Business.get(business_id);
  if (!biz) return Response.json({ error: 'Business not found' }, { status: 404 });

  // Pull existing SEO issues for context
  const seoIssues = await base44.entities.SeoIssue.filter({ business_id, fix_status: 'open' }, '-created_date', 20);
  const leads = await base44.entities.Lead.filter({ business_id }, '-created_date', 50);
  const audits = await base44.entities.SeoAudit.filter({ business_id }, '-created_date', 1);

  const criticalIssues = seoIssues.filter(i => i.severity === 'critical').map(i => i.description);
  const topServiceTypes = {};
  leads.forEach(l => { topServiceTypes[l.service_type] = (topServiceTypes[l.service_type] || 0) + 1; });
  const popularServices = Object.entries(topServiceTypes).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);

  const hasGSC = !!Deno.env.get('GOOGLE_SEARCH_CONSOLE_SITE_URL');
  const hasGA4 = !!Deno.env.get('GA4_PROPERTY_ID');

  const recommendations = await base44.integrations.Core.InvokeLLM({
    prompt: `You are an SEO and digital marketing expert for local service businesses in Australia.

Business: ${biz.name}
Website: ${biz.website_url}
Location: Townsville, QLD, Australia
Services: ${biz.services?.join(', ') || 'residential and commercial cleaning'}
Service areas: ${biz.suburbs_served?.join(', ') || 'Townsville and surrounds'}
Most popular lead services: ${popularServices.join(', ') || 'general cleaning'}
Open critical SEO issues: ${criticalIssues.join('; ') || 'none detected yet - run SEO audit first'}
Last audit: ${audits[0] ? `${audits[0].pages_crawled} pages, ${audits[0].issues_found} issues` : 'No audit run yet'}
Live traffic data: ${hasGSC ? 'Google Search Console connected' : 'NOT connected (manual setup required)'} | ${hasGA4 ? 'GA4 connected' : 'GA4 NOT connected'}

Generate 10 specific, actionable recommendations to increase organic traffic for this local cleaning business. 
Focus on: local SEO, Google Business Profile, content strategy, suburb targeting, competitor gaps.
Each recommendation must be something they can actually implement.

Return JSON array:
[{
  "priority": "critical|high|medium|low",
  "category": "local_seo|content|technical|google_business_profile|backlinks|suburb_targeting|reviews|social",
  "title": "short title",
  "description": "what to do and why",
  "estimated_impact": "expected traffic/ranking impact",
  "effort": "low|medium|high",
  "how_to": "step by step how to implement this",
  "keywords_to_target": ["keyword1", "keyword2"]
}]`,
    response_json_schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object' } } } }
  });

  const setupRequired = [];
  if (!hasGSC) setupRequired.push({
    name: 'Google Search Console',
    why: 'Shows real search impressions, clicks, and ranking keywords for your website',
    how: '1. Go to https://search.google.com/search-console/ 2. Add property for ' + (biz.website_url || 'your website') + ' 3. Verify ownership via HTML tag or DNS record 4. After 7+ days of data, connect the API',
    secret_needed: 'GOOGLE_SEARCH_CONSOLE_SITE_URL',
  });
  if (!hasGA4) setupRequired.push({
    name: 'Google Analytics 4',
    why: 'Shows real visitor sessions, bounce rate, traffic sources, and conversion data',
    how: '1. Go to https://analytics.google.com/ 2. Create a GA4 property for your website 3. Install the tracking code 4. Note your Property ID (format: 12345678)',
    secret_needed: 'GA4_PROPERTY_ID',
  });

  return Response.json({
    recommendations: Array.isArray(recommendations?.items) ? recommendations.items : (Array.isArray(recommendations) ? recommendations : []),
    setup_required: setupRequired,
    data_sources: {
      seo_issues_analysed: seoIssues.length,
      leads_analysed: leads.length,
      live_search_console: hasGSC,
      live_analytics: hasGA4,
    }
  });
});