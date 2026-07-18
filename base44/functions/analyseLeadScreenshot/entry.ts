import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { image_url, business_id } = await req.json();
    if (!image_url) return Response.json({ error: 'image_url required' }, { status: 400 });

    const prompt = `You are a quoting assistant for Renee's Cleaning Services in Townsville, Australia.

You have been given a screenshot of a cleaning lead from Facebook, Gumtree, a text message, or another platform.

PRICING RULES (use ONLY these — never invent prices):
Base rates:
- standard_residential: $75/hr (2hr min)
- detailed_refresh: $85/hr
- deep_spring_clean: $95/hr
- office_commercial: $98/hr
- rental_inspection_rescue: $92/hr
- pre_sale_clean: $92/hr
- move_in_clean: $92/hr
- wall_washing: $90/hr
- pressure_washing: $90/hr (2hr min)
- airbnb_standard: $75/hr
- airbnb_same_day: $85/hr
- airbnb_deep_reset: $92/hr
- airbnb_post_guest: $95/hr
- window_glass: see bundles below
- decluttering: $75/hr

Window bundles:
- 1-2 bed home: from $220
- 3-4 bed home: from $350
- Standard window: $10, Large: $15, XL: $20, Sliding door: $25, Mirror: $10, Security screen: $8

Add-ons (flat fees):
- Oven: $85, Rangehood: $65, Microwave: $35, Dishwasher: $35
- Fridge inside: $55, Fridge+freezer: $85
- Folding: $25/basket, Linen change: $15/bed
- Ceiling fans: $10+ each, Aircon vents: $15+ each
- Grout/mould light: $40+/area, Heavy grout/mould: $80+/area
- Bin clean: $15+, Balcony/patio: $55+

Travel: First 10km free, then $1.00/km

IMPORTANT — Renee's does NOT offer bond cleans or end-of-lease cleans.

RED FLAGS to detect (flag these explicitly):
- mentions "cheap", "lowest price", "cash only", "should only take an hour", "very dirty but easy"
- "today urgent" combined with unrealistic scope
- "NDIS" — flag for manual approval
- "bond clean", "end of lease", "vacate clean" — Renee's does not offer this service
- biohazard, faeces, needles, blood, hoarding, mould infestation, pest infestation, unsafe conditions

YOUR TASK:
1. Extract all visible text from the screenshot image
2. Identify lead details from that text
3. Classify the service type
4. Estimate realistic hours based on bedrooms/bathrooms/condition
5. Calculate min/max quote using the pricing above
6. Detect red flags
7. List missing information needed to quote accurately
8. Generate a professional reply in Renee's voice

Hour estimation guide:
- 1 bed / 1 bath light: 1.5-2hrs standard, 2.5-3hrs deep
- 2 bed / 1 bath average: 2-2.5hrs standard, 3-4hrs deep
- 3 bed / 2 bath average: 2.5-3hrs standard, 4-5hrs deep
- 3 bed / 2 bath dirty: 3.5-4.5hrs standard, 5-7hrs deep
- 4 bed / 2 bath average: 3-4hrs standard, 5-6hrs deep
- 4 bed / 2 bath very dirty/extreme: 6-10hrs deep
- Add 0.5-1hr per add-on

If the screenshot does NOT give enough information to quote (missing suburb, bedrooms, bathrooms, or condition), set confidence_score to "needs_manual_review" and clearly state what is missing.

Return a JSON object with this exact structure:
{
  "extracted_text": "full text extracted from the image",
  "lead_name": "name if visible or null",
  "platform_source": "facebook|gumtree|sms|email|whatsapp|instagram|other",
  "suburb": "suburb name or null",
  "service_type": "one of the service type keys above or 'unknown'",
  "property_type": "house|unit|apartment|office|commercial|other or null",
  "bedrooms": number or null,
  "bathrooms": number or null,
  "condition_level": "light|average|dirty|very_dirty|extreme or null",
  "urgency": "low|medium|high|urgent",
  "recommended_hours_min": number,
  "recommended_hours_max": number,
  "hourly_rate": number,
  "add_ons_detected": ["list of add-on names detected"],
  "travel_fee_estimate": number,
  "estimated_total_min": number,
  "estimated_total_max": number,
  "recommended_quote_total": number,
  "confidence_score": "high|medium|low|needs_manual_review",
  "missing_information": ["list of missing details needed to quote"],
  "red_flags": ["list of red flags detected, empty array if none"],
  "ai_reasoning": "2-3 sentences explaining why you chose this service type and hour range",
  "suggested_reply": "the full polished reply message Renee can copy and paste"
}

The suggested_reply must:
- Be warm, professional and friendly in tone
- Mention the service type and hourly rate
- Give the estimated hour range and price range
- Ask for any missing details (suburb, rooms, photos)
- Sign off as Renee from Renee's Cleaning Services
- NOT mention bond cleans or services not offered
- If this is a bond/end-of-lease enquiry, politely decline and suggest they try another provider

If confidence is needs_manual_review, the suggested_reply must ask the specific missing questions instead of giving a price.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [image_url],
      response_json_schema: {
        type: 'object',
        properties: {
          extracted_text: { type: 'string' },
          lead_name: { type: 'string' },
          platform_source: { type: 'string' },
          suburb: { type: 'string' },
          service_type: { type: 'string' },
          property_type: { type: 'string' },
          bedrooms: { type: 'number' },
          bathrooms: { type: 'number' },
          condition_level: { type: 'string' },
          urgency: { type: 'string' },
          recommended_hours_min: { type: 'number' },
          recommended_hours_max: { type: 'number' },
          hourly_rate: { type: 'number' },
          add_ons_detected: { type: 'array', items: { type: 'string' } },
          travel_fee_estimate: { type: 'number' },
          estimated_total_min: { type: 'number' },
          estimated_total_max: { type: 'number' },
          recommended_quote_total: { type: 'number' },
          confidence_score: { type: 'string' },
          missing_information: { type: 'array', items: { type: 'string' } },
          red_flags: { type: 'array', items: { type: 'string' } },
          ai_reasoning: { type: 'string' },
          suggested_reply: { type: 'string' }
        }
      }
    });

    // Save the record
    const record = await base44.entities.LeadScreenshotQuote.create({
      uploaded_image_url: image_url,
      business_id: business_id || null,
      extracted_text: result.extracted_text || '',
      lead_name: result.lead_name || null,
      platform_source: result.platform_source || 'other',
      suburb: result.suburb || null,
      service_type: result.service_type || 'unknown',
      property_type: result.property_type || null,
      bedrooms: result.bedrooms || null,
      bathrooms: result.bathrooms || null,
      condition_level: result.condition_level || null,
      urgency: result.urgency || 'medium',
      recommended_hours_min: result.recommended_hours_min || 0,
      recommended_hours_max: result.recommended_hours_max || 0,
      hourly_rate: result.hourly_rate || 0,
      add_ons_detected: result.add_ons_detected || [],
      travel_fee_estimate: result.travel_fee_estimate || 0,
      estimated_total_min: result.estimated_total_min || 0,
      estimated_total_max: result.estimated_total_max || 0,
      recommended_quote_total: result.recommended_quote_total || 0,
      confidence_score: result.confidence_score || 'needs_manual_review',
      missing_information: result.missing_information || [],
      red_flags: result.red_flags || [],
      ai_reasoning: result.ai_reasoning || '',
      suggested_reply: result.suggested_reply || '',
      quote_status: (result.red_flags && result.red_flags.length > 0) ? 'needs_review' : 'new'
    });

    return Response.json({ ...result, record_id: record.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});