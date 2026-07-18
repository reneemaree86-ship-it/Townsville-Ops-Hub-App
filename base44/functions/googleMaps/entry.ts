import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ORIGIN = 'Mount Low QLD 4818, Australia';
const API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

async function gmapsRequest(path, params) {
  const url = new URL(`https://maps.googleapis.com/maps/api/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('key', API_KEY);
  const res = await fetch(url.toString());
  return res.json();
}

function mapsError(data) {
  const status = data?.status || data?.error_message || 'UNKNOWN';
  const msgs = {
    REQUEST_DENIED: 'API key rejected. Check: (1) Billing enabled on Google Cloud, (2) Maps JavaScript API + Places API + Geocoding API + Distance Matrix API all enabled, (3) Domain restriction allows townsville-growth-command.base44.app, (4) API key restrictions include the required APIs.',
    OVER_DAILY_LIMIT: 'Daily quota exceeded. Check billing or upgrade your Google Cloud plan.',
    OVER_QUERY_LIMIT: 'Rate limit hit. Too many requests in a short window. Retry in a moment.',
    INVALID_REQUEST: 'Invalid request sent to Google Maps API. Check the address or coordinates provided.',
    ZERO_RESULTS: 'No results found for this address. Try a more specific address including suburb and state.',
    NOT_FOUND: 'Address not found by Google Maps. Try including the suburb and "QLD" or "Australia".',
  };
  return msgs[status] || `Google Maps error: ${status}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!API_KEY) {
      return Response.json({ error: 'GOOGLE_MAPS_API_KEY secret is not set. Please add it in Settings → Environment Variables.' }, { status: 500 });
    }

    const { action, address, lat, lng, destinations } = await req.json();

    // --- GEOCODE: address → lat/lng + suburb ---
    if (action === 'geocode') {
      if (!address) return Response.json({ error: 'address is required' }, { status: 400 });

      const data = await gmapsRequest('geocode/json', {
        address: address + (address.toLowerCase().includes('australia') ? '' : ', Queensland, Australia'),
        region: 'au',
      });

      if (data.status !== 'OK') return Response.json({ error: mapsError(data) }, { status: 422 });

      const result = data.results[0];
      const comps = result.address_components;
      const suburb = comps.find(c => c.types.includes('locality'))?.long_name || '';
      const state = comps.find(c => c.types.includes('administrative_area_level_1'))?.short_name || '';
      const postcode = comps.find(c => c.types.includes('postal_code'))?.long_name || '';
      const formattedAddress = result.formatted_address;
      const { lat: rLat, lng: rLng } = result.geometry.location;

      return Response.json({ suburb, state, postcode, formatted_address: formattedAddress, lat: rLat, lng: rLng });
    }

    // --- DISTANCE: address → km from base + travel time ---
    if (action === 'distance') {
      const dest = address || (lat && lng ? `${lat},${lng}` : null);
      if (!dest) return Response.json({ error: 'address or lat/lng required' }, { status: 400 });

      const data = await gmapsRequest('distancematrix/json', {
        origins: ORIGIN,
        destinations: dest + (typeof dest === 'string' && !dest.includes(',') && !dest.toLowerCase().includes('australia') ? ', Queensland, Australia' : ''),
        units: 'metric',
        region: 'au',
      });

      if (data.status !== 'OK') return Response.json({ error: mapsError(data) }, { status: 422 });

      const element = data.rows?.[0]?.elements?.[0];
      if (!element || element.status !== 'OK') {
        return Response.json({ error: mapsError({ status: element?.status || 'ZERO_RESULTS' }) }, { status: 422 });
      }

      const km = Math.round((element.distance.value / 1000) * 10) / 10;
      const durationMins = Math.ceil(element.duration.value / 60);
      const travelFee = km > 10 ? Math.round((km - 10) * 1.0 * 100) / 100 : 0;

      return Response.json({
        km,
        duration_mins: durationMins,
        duration_text: element.duration.text,
        distance_text: element.distance.text,
        travel_fee: travelFee,
        origin: ORIGIN,
        destination: element.end_address || dest,
      });
    }

    // --- REVERSE GEOCODE: lat/lng → suburb ---
    if (action === 'reverse_geocode') {
      if (!lat || !lng) return Response.json({ error: 'lat and lng required' }, { status: 400 });

      const data = await gmapsRequest('geocode/json', {
        latlng: `${lat},${lng}`,
        result_type: 'locality|sublocality',
        region: 'au',
      });

      if (data.status !== 'OK') return Response.json({ error: mapsError(data) }, { status: 422 });

      const result = data.results[0];
      const comps = result.address_components;
      const suburb = comps.find(c => c.types.includes('locality'))?.long_name || '';
      const postcode = comps.find(c => c.types.includes('postal_code'))?.long_name || '';

      return Response.json({ suburb, postcode, formatted_address: result.formatted_address });
    }

    return Response.json({ error: 'Unknown action. Use: geocode, distance, reverse_geocode' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});