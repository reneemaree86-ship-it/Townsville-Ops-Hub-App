import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { business_id, website_url } = await req.json();
  if (!website_url) return Response.json({ error: 'No website_url provided' }, { status: 400 });

  const startTime = Date.now();

  // Create audit record
  const audit = await base44.entities.SeoAudit.create({
    business_id,
    website_url,
    status: 'running',
    pages_crawled: 0,
    issues_found: 0,
  });

  const issues = [];
  let pagesCrawled = 0;

  // Fetch and analyse the main page
  const pagesToCheck = [website_url];
  // Try common sub-pages
  const baseUrl = website_url.replace(/\/$/, '');
  const commonPages = ['/about', '/services', '/contact', '/cleaning-services', '/townsville'];

  for (const path of [website_url, ...commonPages.map(p => baseUrl + p)]) {
    let html = '';
    let pageOk = false;
    try {
      const res = await fetch(path, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BCCBot/1.0)' },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        html = await res.text();
        pageOk = true;
        pagesCrawled++;
      }
    } catch {
      // page not reachable - only flag for main URL
      if (path === website_url) {
        issues.push({
          business_id,
          audit_id: audit.id,
          page_url: path,
          issue_type: 'other',
          severity: 'critical',
          description: `Website is not reachable: ${path}`,
          recommended_fix: 'Check hosting, DNS, and SSL certificate. Ensure the site is live and returning 200 OK.',
          fix_status: 'open',
          auto_fixable: false,
          date_detected: new Date().toISOString(),
        });
      }
      continue;
    }

    if (!pageOk || !html) continue;

    const url = path;

    // --- Meta Title ---
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const titleText = titleMatch ? titleMatch[1].trim() : null;
    if (!titleText) {
      issues.push({ business_id, audit_id: audit.id, page_url: url, issue_type: 'meta_title', severity: 'critical', description: 'Page is missing a <title> tag.', recommended_fix: 'Add a unique, descriptive title tag (50-60 characters) including your primary keyword and location e.g. "Professional Cleaning Services Townsville | Renee\'s Cleaning"', fix_status: 'open', auto_fixable: false, date_detected: new Date().toISOString() });
    } else if (titleText.length < 30) {
      issues.push({ business_id, audit_id: audit.id, page_url: url, issue_type: 'meta_title', severity: 'warning', description: `Title tag is too short (${titleText.length} chars): "${titleText}"`, recommended_fix: 'Expand the title to 50-60 characters. Include primary keyword + location e.g. "Townsville House Cleaning | Professional & Affordable"', fix_status: 'open', current_value: titleText, auto_fixable: false, date_detected: new Date().toISOString() });
    } else if (titleText.length > 70) {
      issues.push({ business_id, audit_id: audit.id, page_url: url, issue_type: 'meta_title', severity: 'warning', description: `Title tag is too long (${titleText.length} chars) and will be cut off in search results.`, recommended_fix: 'Shorten the title to under 60 characters while keeping the main keyword and location.', fix_status: 'open', current_value: titleText, auto_fixable: false, date_detected: new Date().toISOString() });
    }

    // --- Meta Description ---
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
    const descText = descMatch ? descMatch[1].trim() : null;
    if (!descText) {
      issues.push({ business_id, audit_id: audit.id, page_url: url, issue_type: 'meta_description', severity: 'critical', description: 'Page is missing a meta description.', recommended_fix: 'Add a meta description of 150-160 characters. Include your key service, location, and a call to action e.g. "Professional house cleaning in Townsville. Trusted, affordable, thorough. Book your free quote today!"', fix_status: 'open', auto_fixable: false, date_detected: new Date().toISOString() });
    } else if (descText.length < 80) {
      issues.push({ business_id, audit_id: audit.id, page_url: url, issue_type: 'meta_description', severity: 'warning', description: `Meta description is too short (${descText.length} chars).`, recommended_fix: 'Expand to 150-160 characters. Mention services, location (Townsville), and a call to action.', fix_status: 'open', current_value: descText, auto_fixable: false, date_detected: new Date().toISOString() });
    }

    // --- H1 ---
    const h1Matches = [...html.matchAll(/<h1[^>]*>([^<]*)<\/h1>/gi)];
    if (h1Matches.length === 0) {
      issues.push({ business_id, audit_id: audit.id, page_url: url, issue_type: 'heading_structure', severity: 'critical', description: 'Page has no H1 heading.', recommended_fix: 'Add a single H1 tag with your primary keyword e.g. <h1>Professional Cleaning Services in Townsville</h1>', fix_status: 'open', auto_fixable: false, date_detected: new Date().toISOString() });
    } else if (h1Matches.length > 1) {
      issues.push({ business_id, audit_id: audit.id, page_url: url, issue_type: 'heading_structure', severity: 'warning', description: `Page has ${h1Matches.length} H1 tags. Only one H1 is recommended.`, recommended_fix: 'Keep only one H1 per page. Convert additional H1s to H2s.', fix_status: 'open', auto_fixable: false, date_detected: new Date().toISOString() });
    }

    // --- Images without alt ---
    const imgMatches = [...html.matchAll(/<img[^>]+>/gi)];
    const imgsWithoutAlt = imgMatches.filter(m => !m[0].includes('alt=') || m[0].includes('alt=""') || m[0].includes("alt=''"));
    if (imgsWithoutAlt.length > 0) {
      issues.push({ business_id, audit_id: audit.id, page_url: url, issue_type: 'image_alt', severity: 'warning', description: `${imgsWithoutAlt.length} image(s) missing alt text.`, recommended_fix: 'Add descriptive alt text to all images. e.g. alt="Renee\'s team deep cleaning a Townsville home kitchen". This helps SEO and accessibility.', fix_status: 'open', auto_fixable: false, date_detected: new Date().toISOString() });
    }

    // --- Schema Markup ---
    if (!html.includes('application/ld+json') && !html.includes('schema.org')) {
      issues.push({ business_id, audit_id: audit.id, page_url: url, issue_type: 'schema_markup', severity: 'warning', description: 'No structured data (schema.org/JSON-LD) detected.', recommended_fix: 'Add LocalBusiness schema markup. Include: business name, address (Townsville), phone, services offered, opening hours. Use https://schema.org/LocalBusiness or https://schema.org/CleaningService', fix_status: 'open', auto_fixable: false, date_detected: new Date().toISOString() });
    }

    // --- Location keywords ---
    const htmlLower = html.toLowerCase();
    if (!htmlLower.includes('townsville') && path === website_url) {
      issues.push({ business_id, audit_id: audit.id, page_url: url, issue_type: 'location_targeting', severity: 'critical', description: '"Townsville" not found anywhere on the homepage.', recommended_fix: 'Add "Townsville" to your page title, H1, meta description, and body content. Google uses location signals to show local search results.', fix_status: 'open', auto_fixable: false, date_detected: new Date().toISOString() });
    }

    // --- Mobile viewport ---
    if (!html.includes('viewport') || !html.includes('width=device-width')) {
      issues.push({ business_id, audit_id: audit.id, page_url: url, issue_type: 'mobile_usability', severity: 'critical', description: 'Missing or incorrect viewport meta tag for mobile.', recommended_fix: 'Add to <head>: <meta name="viewport" content="width=device-width, initial-scale=1">. This is required for Google Mobile-First Indexing.', fix_status: 'open', auto_fixable: false, date_detected: new Date().toISOString() });
    }

    // --- HTTPS ---
    if (!website_url.startsWith('https://')) {
      issues.push({ business_id, audit_id: audit.id, page_url: url, issue_type: 'other', severity: 'critical', description: 'Website is not using HTTPS (SSL).', recommended_fix: 'Install an SSL certificate and redirect all HTTP traffic to HTTPS. Most hosting providers offer free SSL via Let\'s Encrypt. Google penalises non-HTTPS sites.', fix_status: 'open', auto_fixable: false, date_detected: new Date().toISOString() });
    }
  }

  // --- Check sitemap ---
  try {
    const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`, { signal: AbortSignal.timeout(5000) });
    if (!sitemapRes.ok) {
      issues.push({ business_id, audit_id: audit.id, page_url: `${baseUrl}/sitemap.xml`, issue_type: 'sitemap', severity: 'warning', description: 'No sitemap.xml found.', recommended_fix: 'Create and submit a sitemap.xml to Google Search Console. Most CMS platforms (WordPress, Wix, etc.) can generate this automatically.', fix_status: 'open', auto_fixable: false, date_detected: new Date().toISOString() });
    }
  } catch { /* ignore */ }

  // --- Check robots.txt ---
  try {
    const robotsRes = await fetch(`${baseUrl}/robots.txt`, { signal: AbortSignal.timeout(5000) });
    if (!robotsRes.ok) {
      issues.push({ business_id, audit_id: audit.id, page_url: `${baseUrl}/robots.txt`, issue_type: 'robots_txt', severity: 'info', description: 'No robots.txt found.', recommended_fix: 'Create a robots.txt file at your domain root. Minimum content: "User-agent: *\\nAllow: /"', fix_status: 'open', auto_fixable: false, date_detected: new Date().toISOString() });
    }
  } catch { /* ignore */ }

  // Save all issues
  for (const issue of issues) {
    await base44.entities.SeoIssue.create(issue);
  }

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const duration = Math.round((Date.now() - startTime) / 1000);

  // Update audit record
  await base44.entities.SeoAudit.update(audit.id, {
    status: 'completed',
    pages_crawled: pagesCrawled,
    issues_found: issues.length,
    critical_issues: criticalCount,
    warnings: warningCount,
    passed_checks: Math.max(0, (pagesCrawled * 7) - issues.length),
    duration_seconds: duration,
    summary: `Crawled ${pagesCrawled} pages. Found ${issues.length} issues (${criticalCount} critical, ${warningCount} warnings).`,
  });

  // Create notification if critical issues found
  if (criticalCount > 0) {
    await base44.entities.Notification.create({
      business_id,
      type: 'seo_issue',
      title: `SEO Audit: ${criticalCount} Critical Issues Found`,
      message: `${website_url} has ${criticalCount} critical SEO issues that need immediate attention.`,
      severity: 'high',
      read: false,
    });
  }

  return Response.json({ pages_crawled: pagesCrawled, issues_found: issues.length, critical_issues: criticalCount, warnings: warningCount, duration_seconds: duration });
});