import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';

const MAPS_API_KEY = 'AIzaSyCvf6pU207jLZpI-7YKF9lYFfnnDLy2c6g';
const SCRIPT_ID = 'google-maps-places-script';

function loadGoogleMapsScript() {
  if (document.getElementById(SCRIPT_ID)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * AddressAutocomplete
 * Props:
 *   value: string
 *   onChange: (value: string) => void
 *   onSelect: ({ formatted_address, suburb, postcode, lat, lng, km, duration_mins, travel_fee }) => void
 *   placeholder: string
 *   className: string
 *   fetchDistance: boolean  — if true, also calls backend distance function
 *   inputClassName: string
 */
export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing an address...',
  className = '',
  inputClassName = '',
  fetchDistance = false,
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [scriptError, setScriptError] = useState(null);
  const [loadingDistance, setLoadingDistance] = useState(false);
  const [distanceResult, setDistanceResult] = useState(null);
  const [distanceError, setDistanceError] = useState(null);
  const [scriptReady, setScriptReady] = useState(false);

  // Load Google Maps script once
  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => setScriptReady(true))
      .catch(() => setScriptError('Failed to load Google Maps. Check your internet connection and API key restrictions.'));
  }, []);

  // Initialise Places Autocomplete once script is ready
  useEffect(() => {
    if (!scriptReady || !inputRef.current || autocompleteRef.current) return;

    try {
      const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'au' },
        fields: ['formatted_address', 'address_components', 'geometry'],
        types: ['address'],
      });

      ac.addListener('place_changed', async () => {
        const place = ac.getPlace();
        if (!place?.formatted_address) return;

        const comps = place.address_components || [];
        const suburb = comps.find(c => c.types.includes('locality'))?.long_name || '';
        const postcode = comps.find(c => c.types.includes('postal_code'))?.long_name || '';
        const lat = place.geometry?.location?.lat?.() || null;
        const lng = place.geometry?.location?.lng?.() || null;

        onChange(place.formatted_address);

        const baseResult = { formatted_address: place.formatted_address, suburb, postcode, lat, lng };

        if (fetchDistance && (lat || suburb)) {
          setLoadingDistance(true);
          setDistanceError(null);
          try {
            const res = await base44.functions.invoke('googleMaps', {
              action: 'distance',
              address: place.formatted_address,
            });
            const d = res.data;
            setDistanceResult(d);
            onSelect?.({ ...baseResult, km: d.km, duration_mins: d.duration_mins, travel_fee: d.travel_fee, distance_text: d.distance_text, duration_text: d.duration_text });
          } catch (err) {
            setDistanceError(err?.response?.data?.error || err.message || 'Distance lookup failed');
            onSelect?.(baseResult);
          } finally {
            setLoadingDistance(false);
          }
        } else {
          onSelect?.(baseResult);
        }
      });

      autocompleteRef.current = ac;
    } catch (e) {
      setScriptError('Google Maps Places failed to initialise: ' + e.message);
    }
  }, [scriptReady]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <Input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`pl-7 ${inputClassName}`}
        />
        {loadingDistance && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 animate-spin" />
        )}
      </div>

      {scriptError && (
        <div className="mt-1 flex items-start gap-1.5 rounded-md bg-red-50 border border-red-200 px-2 py-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-red-700">{scriptError}</p>
        </div>
      )}

      {distanceError && (
        <div className="mt-1 flex items-start gap-1.5 rounded-md bg-red-50 border border-red-200 px-2 py-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-red-700">{distanceError}</p>
        </div>
      )}

      {distanceResult && !distanceError && (
        <div className="mt-1 rounded-md bg-green-50 border border-green-200 px-2 py-1.5 text-[10px] text-green-700 flex gap-3">
          <span>📍 {distanceResult.distance_text} from base</span>
          <span>🕐 {distanceResult.duration_text}</span>
          {distanceResult.travel_fee > 0
            ? <span className="text-amber-600 font-medium">Travel fee: ${distanceResult.travel_fee.toFixed(2)}</span>
            : <span className="text-green-600">✓ Within free zone</span>}
        </div>
      )}
    </div>
  );
}