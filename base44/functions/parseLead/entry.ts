import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { business_id, text, source } = await req.json();
  if (!text) return Response.json({ error: 'No text provided' }, { status: 400 });

  const business = business_id ? await base44.entities.Business.filter({ id: business_id }) : [];
  const biz = business[0] || {};

  const prompt = `You are an expert lead analyst for a cleaning business in Townsville, Australia.
Business: ${biz?.name || 'Renee\'s Cleaning Services'}
Services: ${biz?.services?.join(', ') || 'residential cleaning, commercial cleaning, deep cleaning, Airbnb cleaning'}
Suburbs served: ${biz?.suburbs_served?.join(', ') || 'Townsville and surrounding suburbs'}

Analyse this ${source} post and extract lead information:

"""
${text}
"""

Return ONLY valid JSON with these fields:
{
  "name": "person's name if mentioned, else null",
  "contact_details": "phone/email/facebook if mentioned, else null",
  "service_needed": "what cleaning service they need (be specific)",
  "service_type": "one of: deep_clean, fortnightly, weekly, office_cleaning, commercial, hoarder_heavy, inspection_rescue, one_off_urgent, airbnb_shortstay, window_cleaning, pressure_washing, move_in, general_residential, business_commercial, other",
  "suburb": "suburb if mentioned, else null",
  "urgency": "one of: low, medium, high, urgent - based on language used",
  "budget_clues": "any mention of budget, price sensitivity, or value signals",
  "contact_method": "how they want to be contacted",
  "estimated_value": "estimated job value in AUD as a number (0 if unknown)",
  "repeat_potential": "one of: one_off, possible_repeat, likely_repeat, definite_repeat",
  "lead_score": "score 0-100 based on: urgency (25pts), suburb match (20pts), service clarity (20pts), budget signals (15pts), repeat potential (20pts)",
  "score_reasoning": "brief explanation of score",
  "response_draft": "a professional, warm response draft Renee can send - address their specific need, mention relevant service, include a call to action to get a free quote"
}`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        contact_details: { type: 'string' },
        service_needed: { type: 'string' },
        service_type: { type: 'string' },
        suburb: { type: 'string' },
        urgency: { type: 'string' },
        budget_clues: { type: 'string' },
        contact_method: { type: 'string' },
        estimated_value: { type: 'number' },
        repeat_potential: { type: 'string' },
        lead_score: { type: 'number' },
        score_reasoning: { type: 'string' },
        response_draft: { type: 'string' },
      }
    }
  });

  return Response.json(result);
});