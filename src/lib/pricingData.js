// Renee's Cleaning Services — Real Pricing Data

export const SERVICE_RATES = [
  { id: 'general_residential', label: 'Standard / General Residential Clean', rate: 75, unit: 'hr', min_hours: 2 },
  { id: 'detailed_refresh', label: 'Detailed Refresh Clean', rate: 85, unit: 'hr', min_hours: 2.5 },
  { id: 'deep_spring', label: 'Deep / Spring Clean', rate: 95, unit: 'hr', min_hours: 3 },
  { id: 'pressure_washing', label: 'Pressure Washing', rate: 90, unit: 'hr', min_hours: 2 },
  { id: 'office_commercial', label: 'Office / Commercial Cleaning', rate: 98, unit: 'hr', min_hours: 2 },
  { id: 'workcover', label: 'WorkCover Cleaning', rate: 92, unit: 'hr', min_hours: 2 },
  { id: 'move_in', label: 'Move-in Clean', rate: 92, unit: 'hr', min_hours: 2 },
  { id: 'pre_sale', label: 'Pre-sale Presentation Clean', rate: 92, unit: 'hr', min_hours: 2 },
  { id: 'rental_inspection', label: 'Rental Inspection Rescue Clean', rate: 92, unit: 'hr', min_hours: 2 },
  { id: 'wall_washing', label: 'Wall Washing', rate: 90, unit: 'hr', min_hours: 2 },
  { id: 'airbnb', label: 'Airbnb / Short-stay Clean', rate: 85, unit: 'hr', min_hours: 2 },
  { id: 'airbnb_detailed_refresh', label: 'Airbnb Detailed Refresh & Restocking Clean', rate: 85, unit: 'hr', min_hours: 2 },
  { id: 'airbnb_turnover_premium', label: 'Airbnb Refresh Turn Over Clean - Premium Host Package', rate: 85, unit: 'hr', min_hours: 2 },
  { id: 'other', label: 'Other / Custom Service', rate: 75, unit: 'hr', min_hours: 1 },
];

// Services that require dirty meter application
export const DIRTY_METER_SERVICES = [
  'deep_spring', 'move_in', 'rental_inspection', 'pre_sale', 'wall_washing', 'general_residential', 'detailed_refresh'
];

// Dirty meter levels: percentage surcharge applied to core service subtotal
export const DIRTY_METER_LEVELS = [
  { level: 1, label: 'Level 1 — Lightly Dirty', description: 'Recently cleaned, light dust and surface marks', pct: 0, color: 'bg-green-500', textColor: 'text-green-700' },
  { level: 2, label: 'Level 2 — Average', description: 'Normal household wear and tear, standard clean', pct: 0.10, color: 'bg-yellow-400', textColor: 'text-yellow-700' },
  { level: 3, label: 'Level 3 — Moderately Dirty', description: 'Build-up in bathrooms, kitchen grease, pet hair', pct: 0.20, color: 'bg-orange-500', textColor: 'text-orange-700' },
  { level: 4, label: 'Level 4 — Very Dirty', description: 'Heavy build-up, mould, extensive grease, photos required', pct: 0.35, color: 'bg-red-500', textColor: 'text-red-700', photoRequired: true },
  { level: 5, label: 'Level 5 — Extreme / Hoarding', description: 'Biohazard risk, hoarding, mould, unsafe access — QUOTE REQUIRED', pct: null, color: 'bg-red-900', textColor: 'text-red-900', quoteRequired: true, photoRequired: true },
];

// Condition multipliers applied to estimated hours based on Dirty Meter level
export const CONDITION_MULTIPLIERS = { 1: 0.9, 2: 1.0, 3: 1.25, 4: 1.5, 5: 1.75 };

export const ADDONS = [
  { id: 'oven', label: 'Oven Clean', price: 85, unit: 'fixed' },
  { id: 'rangehood', label: 'Rangehood Clean', price: 65, unit: 'fixed' },
  { id: 'microwave', label: 'Microwave Clean', price: 35, unit: 'fixed' },
  { id: 'dishwasher', label: 'Dishwasher Clean', price: 35, unit: 'fixed' },
  { id: 'fridge_inside', label: 'Inside Fridge', price: 55, unit: 'fixed' },
  { id: 'fridge_freezer', label: 'Fridge + Freezer Combo', price: 85, unit: 'fixed' },
  { id: 'linen_change', label: 'Linen Change (per bed)', price: 15, unit: 'per_bed' },
  { id: 'folding', label: 'Laundry Folding (per basket)', price: 25, unit: 'per_basket' },
  { id: 'laundry_bin', label: 'Laundry Bin Clean', price: 15, unit: 'fixed' },
  { id: 'ceiling_fans', label: 'Ceiling Fans (each)', price: 10, unit: 'each' },
  { id: 'aircon_vents', label: 'Aircon Vents (each)', price: 15, unit: 'each' },
  { id: 'light_fixtures', label: 'Light Fixtures (each)', price: 8, unit: 'each' },
  { id: 'grout_light', label: 'Grout / Mould Treatment — Light (per area)', price: 40, unit: 'per_area' },
  { id: 'grout_heavy', label: 'Grout / Mould Treatment — Heavy (per area)', price: 80, unit: 'per_area' },
  { id: 'bin_clean', label: 'Wheelie Bin Clean', price: 15, unit: 'fixed' },
  { id: 'balcony_patio', label: 'Balcony / Patio Clean', price: 55, unit: 'fixed' },
  { id: 'windows_1_2bed', label: 'Window Package — 1–2 Bed Home', price: 220, unit: 'fixed' },
  { id: 'windows_3_4bed', label: 'Window Package — 3–4 Bed Home', price: 350, unit: 'fixed' },
  { id: 'sliding_door', label: 'Sliding Glass Door (each)', price: 25, unit: 'each' },
  { id: 'window_standard', label: 'Window — Standard (each)', price: 10, unit: 'each' },
  { id: 'window_large', label: 'Window — Large (each)', price: 15, unit: 'each' },
  { id: 'window_xl', label: 'Window — Extra Large (each)', price: 20, unit: 'each' },
  { id: 'mirror', label: 'Mirror (each)', price: 10, unit: 'each' },
  { id: 'security_screen', label: 'Security Screen (each)', price: 8, unit: 'each' },
];

export const FREQUENCY_DISCOUNT = {
  one_off: 0,
  weekly: 0.15,
  fortnightly: 0.10,
  monthly: 0.05,
};

export const BUSINESS_INFO = {
  name: "Renee's Cleaning Services",
  abn: '35 572 084 098',
  email: 'reneescleaningservices.tsv@gmail.com',
  website: 'www.reneescleaningservicestsv.com',
  location: 'Townsville, Queensland',
  phone: '',
  account_name: 'Renee Butt',
  bsb: '034668',
  account_number: '497518',
  payid: '35572084098',
};

export const QUOTE_DISCLAIMER = `This quote is an estimate based on the information provided. Final pricing may change depending on property condition, access, clutter, pet hair, grease, build-up, photos, requested extras, safety concerns, and actual time required on site. Heavy build-up, hoarding, biohazard, mould, excessive pet waste, or unsafe conditions may require manual review and revised pricing.`;
export const PAYMENT_TERMS = `Payment is due on the day of service completion unless otherwise agreed in writing. Deposits may be required for large, detailed, or high-risk jobs. Bookings are not confirmed until any required deposit has been received.`;

export function calcTravel(km) {
  if (!km || km <= 10) return 0;
  return (km - 10) * 1.0;
}

export function calcEstimatedHours({ bedrooms = 1, bathrooms = 1, livingAreas = 1, largeKitchen = false, heavyDetail = false }) {
  const base = 0.95;
  const bedroomHours = bedrooms * 0.35;
  const bathroomHours = bathrooms * 0.5;
  const extraLivingHours = Math.max(0, livingAreas - 1) * 0.25;
  const kitchenHours = largeKitchen ? 0.25 : 0;
  const detailHours = heavyDetail ? 0.5 : 0;
  return base + bedroomHours + bathroomHours + extraLivingHours + kitchenHours + detailHours;
}

export function calcTotals({ lineItems = [], travelFee = 0, discountAmount = 0, discountType = 'fixed', gstEnabled = false }) {
  const subtotalLines = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const subtotalWithTravel = subtotalLines + travelFee;
  let discount = 0;
  if (discountType === 'percent') {
    discount = (subtotalWithTravel * discountAmount) / 100;
  } else {
    discount = discountAmount || 0;
  }
  const afterDiscount = Math.max(0, subtotalWithTravel - discount);
  const gst = gstEnabled ? afterDiscount * 0.1 : 0;
  const total = afterDiscount + gst;
  return { subtotal: subtotalLines, travelFee, discount, afterDiscount, gst, total };
}