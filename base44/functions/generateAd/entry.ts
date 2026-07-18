import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { business_id, platform, service_targeting, suburb_targeting, notes } = await req.json();
  if (!platform) return Response.json({ error: 'platform required' }, { status: 400 });

  let biz = null;
  if (business_id) {
    biz = await base44.asServiceRole.entities.Business.get(business_id).catch(() => null);
  }
  if (!biz) {
    const allBiz = await base44.asServiceRole.entities.Business.list().catch(() => []);
    biz = allBiz.find(b => b.status === 'active') || allBiz[0];
  }

  if (!biz) {
    return Response.json({ error: 'Business not found. Please set up a business in Settings first.' }, { status: 404 });
  }

  const resolvedBusinessId = biz.id;

  const platformGuide = {
    google_ads: 'Google Search Ads - character limits: headline 30 chars, description 90 chars. Need 3 headlines and 2 descriptions. Focus on intent-based keywords.',
    facebook_ads: 'Facebook/Instagram Ads - primary text up to 125 chars (before "See more"), headline 40 chars. Emotional, benefit-focused. Use social proof.',
    instagram_ads: 'Instagram Ads - visual-first. Short punchy headline, emoji-friendly, call to action. Lifestyle angle.',
    google_business_profile: 'Google Business Profile post - 1500 chars max. Local focus, special offers, seasonal content. Include phone number and suburb list.',
    local_platform: 'Local Townsville platform - community-focused, highlight local expertise, suburb-specific, trust-building language.',
    local_service_promo: 'Local community promotion - Facebook Marketplace, community boards, letterbox drops. Friendly, local, competitive pricing. No jargon.',
    marketplace: 'Marketplace listing (Facebook Marketplace, Gumtree) - detailed description with services, suburbs, pricing guide, contact method.',
  }[platform] || 'General ad copy - clear, benefit-focused, call to action.';

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are an expert copywriter for a local cleaning business in Townsville, Australia.

Business: ${biz.name}
Contact: ${biz.contact_phone || 'phone TBD'} | ${biz.contact_email || 'email TBD'}
Services: ${biz.services?.join(', ') || 'residential and commercial cleaning'}
Service areas: ${biz.suburbs_served?.join(', ') || 'Townsville and surrounds'}
Pricing notes: ${biz.pricing_notes || 'Competitive local pricing'}
Tone: ${biz.response_tone || 'Professional, warm, trustworthy'}
Target services for this ad: ${service_targeting?.join(', ') || 'all services'}
Target suburbs for this ad: ${suburb_targeting?.join(', ') || biz.suburbs_served?.join(', ') || 'Townsville'}
Additional notes: ${notes || 'None'}

Platform: ${platform}
Platform guide: ${platformGuide}

Generate complete ad copy ready to use. Return JSON:
{
  "headline_options": ["headline 1", "headline 2", "headline 3"],
  "short_description": "short punchy description",
  "long_description": "full ad body copy",
  "call_to_action": "CTA text",
  "suggested_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "suggested_audience": "description of who to target",
  "suggested_budget_notes": "budget recommendation for this platform and business size"
}`,
    response_json_schema: {
      type: 'object',
      properties: {
        headline_options: { type: 'array', items: { type: 'string' } },
        short_description: { type: 'string' },
        long_description: { type: 'string' },
        call_to_action: { type: 'string' },
        suggested_keywords: { type: 'array', items: { type: 'string' } },
        suggested_audience: { type: 'string' },
        suggested_budget_notes: { type: 'string' },
      }
    }
  });

  // Save draft to database using user-scoped client so created_by_id is set correctly
  const draft = await base44.entities.AdDraft.create({
    business_id: resolvedBusinessId,
    platform,
    headline_options: result.headline_options || [],
    short_description: result.short_description || '',
    long_description: result.long_description || '',
    call_to_action: result.call_to_action || '',
    service_targeting: service_targeting || [],
    suburb_targeting: suburb_targeting || biz.suburbs_served || [],
    suggested_keywords: result.suggested_keywords || [],
    suggested_audience: result.suggested_audience || '',
    suggested_budget_notes: result.suggested_budget_notes || '',
    status: 'needs_approval',
  });

  return Response.json({ ...result, draft_id: draft.id });
});