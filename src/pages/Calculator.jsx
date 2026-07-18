import React, { useState, useCallback, useMemo } from 'react';
import AddressAutocomplete from '@/components/shared/AddressAutocomplete';
import { useOutletContext } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calculator as CalcIcon, Save, Download, ArrowRight } from 'lucide-react';
import {
  SERVICE_RATES, DIRTY_METER_LEVELS, ADDONS, CONDITION_MULTIPLIERS,
  calcTravel, calcEstimatedHours,
} from '@/lib/pricingData';
import { generatePDF } from '@/lib/pdfGenerator';
import CalculatorBreakdown from '@/components/calculator/CalculatorBreakdown';
import CalculatorAddons from '@/components/calculator/CalculatorAddons';

// Quote Required triggers
function checkQuoteRequired(form) {
  const reasons = [];
  if (form.dirty_level === 5) reasons.push('Dirty Meter Level 5 selected');
  if (form.hoarding) reasons.push('Hoarding job selected');
  if (form.biohazard) reasons.push('Biohazard risk selected');
  if (form.mould_risk) reasons.push('Mould risk selected');
  if (form.excessive_pet_waste) reasons.push('Excessive pet waste selected');
  if (form.unsafe_access) reasons.push('Unsafe access selected');
  if (form.extreme_grease) reasons.push('Extreme grease / build-up selected');
  if (Number(form.bedrooms) > 5) reasons.push('More than 5 bedrooms');
  if (Number(form.bathrooms) > 4) reasons.push('More than 4 bathrooms');
  if (form.property_size_unknown) reasons.push('Property size unknown');
  return reasons;
}

// Photo upload required triggers
function checkPhotoRequired(form) {
  return form.dirty_level >= 4
    || form.hoarding
    || form.biohazard
    || form.extreme_grease
    || ['deep_spring', 'move_in', 'rental_inspection', 'pre_sale', 'wall_washing'].includes(form.service_type);
}

const today = () => format(new Date(), 'yyyy-MM-dd');
const inDays = (n) => format(addDays(new Date(), n), 'yyyy-MM-dd');

const EMPTY_FORM = {
  client_name: '', client_email: '', client_phone: '', client_address: '', suburb: '',
  service_type: '', frequency: 'one_off',
  bedrooms: 2, bathrooms: 1, living_areas: 1, storeys: 1,
  pet_hair: 'none', clutter: 'none', grease: 'none',
  dirty_level: 2,
  manual_hours: '',
  travel_km: '',
  addons: [], // [{ id, qty }]
  gst_enabled: false,
  deposit_enabled: false, deposit_type: 'percent', deposit_value: 20,
  discount_amount: 0, discount_type: 'fixed',
  manual_adjustment: 0, manual_adjustment_reason: '',
  notes: '', internal_notes: '',
  // quote required flags
  hoarding: false, biohazard: false, mould_risk: false,
  excessive_pet_waste: false, unsafe_access: false, extreme_grease: false,
  property_size_unknown: false,
};

export default function Calculator() {
  const { activeBusiness } = useOutletContext();
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [savedQuote, setSavedQuote] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  const set = useCallback((patch) => setForm(f => ({ ...f, ...patch })), []);

  const selectedService = SERVICE_RATES.find(s => s.id === form.service_type);
  const dirtyMeter = DIRTY_METER_LEVELS.find(d => d.level === Number(form.dirty_level)) || DIRTY_METER_LEVELS[1];
  const quoteRequiredReasons = checkQuoteRequired({ ...form, dirty_level: Number(form.dirty_level) });
  const photoRequired = checkPhotoRequired({ ...form, dirty_level: Number(form.dirty_level) });
  const isQuoteRequired = quoteRequiredReasons.length > 0;

  // ---- CALCULATION ----
  const calc = React.useMemo(() => {
    if (!selectedService) return null;

    // Hours
    const heavyDetail = form.pet_hair !== 'none' || form.clutter !== 'none' || form.grease !== 'none';
    const estimatedHours = form.manual_hours
      ? Number(form.manual_hours)
      : calcEstimatedHours({
          bedrooms: Number(form.bedrooms) || 1,
          bathrooms: Number(form.bathrooms) || 1,
          livingAreas: Number(form.living_areas) || 1,
          heavyDetail,
        });

    // Condition multiplier (Dirty Meter level)
    const conditionMultiplier = form.manual_hours ? 1 : (CONDITION_MULTIPLIERS[Number(form.dirty_level)] || 1);
    const adjustedHours = estimatedHours * conditionMultiplier;
    const roundedHours = Math.ceil(adjustedHours * 2) / 2;

    const minHours = selectedService.min_hours || 2;
    const chargeableHours = Math.max(roundedHours, minHours);
    const minimumApplied = chargeableHours > roundedHours;

    // Core service subtotal
    const coreSubtotal = chargeableHours * selectedService.rate;
    const dirtySurchargeAmt = 0;
    const adjustedCore = coreSubtotal;

    // Add-ons
    const addonLines = (form.addons || []).map(({ id, qty }) => {
      const addon = ADDONS.find(a => a.id === id);
      if (!addon) return null;
      const q = Number(qty) || 1;
      return { id, label: addon.label, qty: q, unit_price: addon.price, total: addon.price * q, unit: addon.unit };
    }).filter(Boolean);
    const addonsTotal = addonLines.reduce((s, a) => s + a.total, 0);

    // Travel
    const travelKm = Number(form.travel_km) || 0;
    const travelFee = calcTravel(travelKm);

    // Discount
    const preDiscountSubtotal = adjustedCore + addonsTotal + travelFee + Number(form.manual_adjustment || 0);
    let discountAmt = 0;
    if (Number(form.discount_amount) > 0) {
      discountAmt = form.discount_type === 'percent'
        ? preDiscountSubtotal * (Number(form.discount_amount) / 100)
        : Number(form.discount_amount);
    }

    // Pre-GST
    const preGst = Math.max(0, preDiscountSubtotal - discountAmt);
    const gst = form.gst_enabled ? preGst * 0.1 : 0;
    const finalTotal = preGst + gst;

    // Deposit
    let depositDue = 0;
    if (form.deposit_enabled && !isQuoteRequired) {
      depositDue = form.deposit_type === 'percent'
        ? finalTotal * (Number(form.deposit_value) / 100)
        : Number(form.deposit_value);
    }
    const balanceDue = finalTotal - depositDue;

    return {
      estimatedHours: Math.round(estimatedHours * 4) / 4,
      chargeableHours,
      conditionMultiplier,
      minimumApplied,
      minHours,
      coreSubtotal,
      dirtySurchargeAmt,
      adjustedCore,
      addonLines,
      addonsTotal,
      travelKm,
      travelFee,
      discountAmt,
      preGst,
      gst,
      finalTotal,
      depositDue,
      balanceDue,
    };
  }, [form, selectedService, dirtyMeter, isQuoteRequired]);

  // ---- VALIDATE ----
  const validate = () => {
    const errs = [];
    if (!form.client_name.trim()) errs.push('Client name required');
    if (!form.suburb.trim() && !form.client_address.trim()) errs.push('Suburb or address required');
    if (!form.service_type) errs.push('Service type required');
    if (!form.frequency) errs.push('Frequency required');
    if (Number(form.travel_km) < 0) errs.push('Distance cannot be negative');
    if (form.manual_hours && Number(form.manual_hours) <= 0) errs.push('Hours must be greater than zero');
    (form.addons || []).forEach(a => { if (!a.qty || Number(a.qty) <= 0) errs.push(`Quantity required for: ${ADDONS.find(x => x.id === a.id)?.label}`); });
    setValidationErrors(errs);
    return errs.length === 0;
  };

  // ---- SAVE QUOTE ----
  const handleSave = async () => {
    if (!validate()) return;
    if (!activeBusiness?.id) return alert('Please select a business first');
    setSaving(true);
    const existing = await base44.entities.Quote.filter({ business_id: activeBusiness.id });
    const nums = existing.map(q => parseInt((q.quote_number || '').replace(/\D/g, '') || '0')).filter(Boolean);
    const nextNum = `Q${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, '0')}`;

    const payload = {
      business_id: activeBusiness.id,
      client_name: form.client_name,
      client_email: form.client_email,
      client_phone: form.client_phone,
      client_address: form.client_address || form.suburb,
      quote_number: nextNum,
      quote_date: today(),
      expiry_date: inDays(14),
      status: isQuoteRequired ? 'draft' : 'draft',
      line_items: calc?.addonLines || [],
      subtotal: calc?.preGst || 0,
      gst_enabled: form.gst_enabled,
      gst_amount: calc?.gst || 0,
      travel_km: Number(form.travel_km) || 0,
      travel_fee: calc?.travelFee || 0,
      discount_amount: Number(form.discount_amount) || 0,
      discount_type: form.discount_type,
      total: isQuoteRequired ? 0 : (calc?.finalTotal || 0),
      job_address: form.client_address,
      job_notes: form.notes,
      internal_notes: form.internal_notes + (isQuoteRequired ? '\n\nQUOTE REQUIRED: ' + quoteRequiredReasons.join(', ') : ''),
      property_condition: ['1', '2'].includes(String(form.dirty_level)) ? 'light' : ['3'].includes(String(form.dirty_level)) ? 'average' : ['4'].includes(String(form.dirty_level)) ? 'dirty' : 'extreme',
      // Extra calc data in internal notes
    };

    const saved = await base44.entities.Quote.create(payload);
    setSavedQuote({ ...saved, _calc: calc, _form: form });
    qc.invalidateQueries(['quotes', activeBusiness?.id]);
    setSaving(false);
    setShowBreakdown(true);
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setSavedQuote(null);
    setShowBreakdown(false);
    setValidationErrors([]);
  };

  const handleDownloadPDF = () => {
    if (!savedQuote) return;
    const doc = generatePDF({ ...savedQuote, type: 'quote' });
    doc.save(`Quote-${savedQuote.quote_number}.pdf`);
  };

  const handleConvertToInvoice = async () => {
    if (!savedQuote) return;
    const existing = await base44.entities.Invoice.filter({ business_id: activeBusiness.id });
    const nums = existing.map(i => parseInt((i.invoice_number || '').replace(/\D/g, '') || '0')).filter(Boolean);
    const nextNum = `INV${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, '0')}`;
    await base44.entities.Invoice.create({
      business_id: activeBusiness.id,
      client_name: savedQuote.client_name,
      client_email: savedQuote.client_email,
      client_phone: savedQuote.client_phone,
      client_address: savedQuote.client_address,
      invoice_number: nextNum,
      invoice_date: today(),
      due_date: inDays(7),
      line_items: savedQuote.line_items,
      subtotal: savedQuote.subtotal,
      gst_enabled: savedQuote.gst_enabled,
      gst_amount: savedQuote.gst_amount,
      travel_km: savedQuote.travel_km,
      travel_fee: savedQuote.travel_fee,
      discount_amount: savedQuote.discount_amount,
      discount_type: savedQuote.discount_type,
      total: savedQuote.total,
      balance_due: savedQuote.total,
      payment_status: 'unpaid',
      payment_method: 'bank_transfer',
      notes: savedQuote.job_notes,
      job_address: savedQuote.job_address,
      quote_id: savedQuote.id,
    });
    await base44.entities.Quote.update(savedQuote.id, { status: 'converted' });
    qc.invalidateQueries(['invoices', activeBusiness?.id]);
    qc.invalidateQueries(['quotes', activeBusiness?.id]);
    alert('Invoice created successfully!');
  };

  return (
    <div className="max-w-5xl mx-auto pb-10" style={{ background: '#f0ece4', minHeight: '100vh', padding: '24px 16px' }}>
      {/* Header banner */}
      <div className="rounded-2xl mb-5 px-5 py-4 flex items-center justify-between flex-wrap gap-2" style={{ background: '#1A3A2A' }}>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#F5ECD7' }}><CalcIcon className="w-5 h-5" />Quoting Calculator</h1>
          <p className="text-xs mt-0.5" style={{ color: '#8BAF8B' }}>Renee's Cleaning Services — Real business quoting tool</p>
        </div>
        {savedQuote && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="text-xs h-8 border-[#8BAF8B] text-[#F5ECD7] hover:bg-[#2D5A3D]" style={{ background: 'transparent' }} onClick={handleReset}>New Quote</Button>
            <Button variant="outline" size="sm" className="text-xs h-8 border-[#8BAF8B] text-[#F5ECD7] hover:bg-[#2D5A3D]" style={{ background: 'transparent' }} onClick={handleDownloadPDF}><Download className="w-3.5 h-3.5 mr-1" />PDF</Button>
            <Button size="sm" className="text-xs h-8" style={{ background: '#8BAF8B', color: '#1A3A2A' }} onClick={handleConvertToInvoice}><ArrowRight className="w-3.5 h-3.5 mr-1" />Convert to Invoice</Button>
          </div>
        )}
      </div>

      {/* QUOTE REQUIRED banner */}
      {isQuoteRequired && (
        <div className="rounded-xl p-4 mb-4 flex gap-3 border-2" style={{ background: '#fff5f5', borderColor: '#e57373' }}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#c0392b' }} />
          <div>
            <p className="font-bold text-sm" style={{ color: '#c0392b' }}>Quote Required — Cannot produce instant price</p>
            <p className="text-xs mt-0.5" style={{ color: '#c0392b' }}>This job needs manual review before a final price can be confirmed.</p>
            <ul className="mt-1 text-xs list-disc list-inside space-y-0.5" style={{ color: '#c0392b' }}>
              {quoteRequiredReasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT COLUMN — main inputs */}
        <div className="lg:col-span-2 space-y-4">

          {/* Client Details */}
          <Card className="border-0 shadow-sm" style={{ background: '#ffffff' }}>
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm" style={{ color: '#1A3A2A' }}>Client Details</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs" style={{ color: '#1A3A2A' }}>Client Name *</Label>
                  <Input className="h-8 text-xs mt-1" value={form.client_name} onChange={e => set({ client_name: e.target.value })} placeholder="Full name" />
                </div>
                <div>
                  <Label className="text-xs" style={{ color: '#1A3A2A' }}>Phone</Label>
                  <Input className="h-8 text-xs mt-1" value={form.client_phone} onChange={e => set({ client_phone: e.target.value })} placeholder="04xx xxx xxx" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs" style={{ color: '#1A3A2A' }}>Email</Label>
                  <Input className="h-8 text-xs mt-1" type="email" value={form.client_email} onChange={e => set({ client_email: e.target.value })} placeholder="email@example.com" />
                </div>
                <div>
                  <Label className="text-xs" style={{ color: '#1A3A2A' }}>Suburb / Address *</Label>
                  <Input className="h-8 text-xs mt-1" value={form.suburb} onChange={e => set({ suburb: e.target.value })} placeholder="e.g. Kirwan, Townsville" />
                </div>
              </div>
              <div>
                <Label className="text-xs" style={{ color: '#1A3A2A' }}>Job Address</Label>
                <AddressAutocomplete
                  value={form.client_address}
                  onChange={val => set({ client_address: val })}
                  onSelect={({ formatted_address, suburb, km, travel_fee }) => {
                    set({ client_address: formatted_address });
                    if (suburb) set({ suburb });
                    if (km != null) set({ travel_km: String(km) });
                  }}
                  placeholder="Start typing job address..."
                  inputClassName="h-8 text-xs mt-1"
                  fetchDistance={true}
                />
              </div>
            </CardContent>
          </Card>

          {/* Service & Frequency */}
          <Card className="border-0 shadow-sm" style={{ background: '#ffffff' }}>
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm" style={{ color: '#1A3A2A' }}>Service Type & Frequency</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs" style={{ color: '#1A3A2A' }}>Service Type *</Label>
                  <Select value={form.service_type} onValueChange={v => set({ service_type: v })}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select service..." /></SelectTrigger>
                    <SelectContent>
                      {SERVICE_RATES.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs" style={{ color: '#1A3A2A' }}>Frequency *</Label>
                  <Select value={form.frequency} onValueChange={v => set({ frequency: v })}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_off" className="text-xs">One-off</SelectItem>
                      <SelectItem value="weekly" className="text-xs">Weekly (ongoing)</SelectItem>
                      <SelectItem value="fortnightly" className="text-xs">Fortnightly (ongoing)</SelectItem>
                      <SelectItem value="monthly" className="text-xs">Monthly (ongoing)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selectedService && (
                <div className="rounded-lg px-3 py-2 text-xs flex gap-4 flex-wrap" style={{ background: '#e8f5e9', color: '#1A3A2A' }}>
                  <span>Rate: <strong>${selectedService.rate}/hr</strong></span>
                  <span>Min hours: <strong>{selectedService.min_hours}h</strong></span>
                  {form.frequency !== 'one_off' && (
                    <span className="text-gray-600">Ongoing frequency — separate initial & ongoing pricing applies</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Property Size */}
          <Card className="border-0 shadow-sm" style={{ background: '#ffffff' }}>
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm" style={{ color: '#1A3A2A' }}>Property Size & Conditions</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Bedrooms</Label>
                  <Select value={String(form.bedrooms)} onValueChange={v => set({ bedrooms: Number(v) })}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)} className="text-xs">{n}{n===5?' (large — may trigger quote req)':''}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Bathrooms</Label>
                  <Select value={String(form.bathrooms)} onValueChange={v => set({ bathrooms: Number(v) })}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4].map(n => <SelectItem key={n} value={String(n)} className="text-xs">{n}{n===4?' (may trigger quote req)':''}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Living Areas</Label>
                  <Select value={String(form.living_areas)} onValueChange={v => set({ living_areas: Number(v) })}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3].map(n => <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Storeys</Label>
                  <Select value={String(form.storeys)} onValueChange={v => set({ storeys: Number(v) })}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3].map(n => <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Pet Hair</Label>
                  <Select value={form.pet_hair} onValueChange={v => set({ pet_hair: v })}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">None</SelectItem>
                      <SelectItem value="light" className="text-xs">Light (+15 min)</SelectItem>
                      <SelectItem value="moderate" className="text-xs">Moderate (+30 min)</SelectItem>
                      <SelectItem value="heavy" className="text-xs">Heavy (+45 min)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Clutter</Label>
                  <Select value={form.clutter} onValueChange={v => set({ clutter: v })}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">None</SelectItem>
                      <SelectItem value="some" className="text-xs">Some (+15 min)</SelectItem>
                      <SelectItem value="moderate" className="text-xs">Moderate (+30 min)</SelectItem>
                      <SelectItem value="heavy" className="text-xs">Heavy (+45 min)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Kitchen Grease</Label>
                  <Select value={form.grease} onValueChange={v => set({ grease: v })}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">None</SelectItem>
                      <SelectItem value="light" className="text-xs">Light (+15 min)</SelectItem>
                      <SelectItem value="moderate" className="text-xs">Moderate (+30 min)</SelectItem>
                      <SelectItem value="heavy" className="text-xs">Heavy (+1 hr)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Property size unknown checkbox */}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="psunk" checked={form.property_size_unknown}
                  onChange={e => set({ property_size_unknown: e.target.checked })}
                  className="w-3.5 h-3.5 accent-red-500" />
                <label htmlFor="psunk" className="text-xs text-muted-foreground">Property size unknown / client selected "not sure" → triggers Quote Required</label>
              </div>

              <div>
                <Label className="text-xs">Manual Hours Override (optional)</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="number" className="h-8 text-xs w-32" value={form.manual_hours} min={0} step={0.5}
                    onChange={e => set({ manual_hours: e.target.value })} placeholder="e.g. 3.5" />
                  <span className="text-xs text-muted-foreground self-center">Leave blank to use auto-calculated hours</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dirty Meter */}
          <Card className="border-0 shadow-sm" style={{ background: '#ffffff' }}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm" style={{ color: '#1A3A2A' }}>Dirty Meter — Property Condition *</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {DIRTY_METER_LEVELS.map(dm => (
                  <button key={dm.level} type="button"
                    onClick={() => set({ dirty_level: dm.level })}
                    className={`w-full text-left px-3 py-2 rounded-lg border-2 transition-all text-xs ${Number(form.dirty_level) === dm.level ? `border-current ${dm.textColor} bg-opacity-10` : 'border-border hover:border-muted-foreground'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${dm.color} shrink-0`}></div>
                      <span className="font-semibold">{dm.label}</span>
                      {dm.quoteRequired && <Badge variant="destructive" className="text-[9px] px-1 py-0">QUOTE REQUIRED</Badge>}
                      {dm.photoRequired && !dm.quoteRequired && <Badge className="text-[9px] px-1 py-0 bg-orange-500">PHOTOS REQUIRED</Badge>}
                    </div>
                    <p className="text-muted-foreground mt-0.5 pl-5">{dm.description}</p>
                    {dm.pct !== null && dm.pct > 0 && <p className={`pl-5 font-medium ${dm.textColor}`}>+{(dm.pct * 100).toFixed(0)}% surcharge on core service</p>}
                  </button>
                ))}
              </div>

              {/* Quote-required flags */}
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quote-Required Risk Factors</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'hoarding', label: 'Hoarding job' },
                    { key: 'biohazard', label: 'Biohazard risk' },
                    { key: 'mould_risk', label: 'Mould risk' },
                    { key: 'excessive_pet_waste', label: 'Excessive pet waste' },
                    { key: 'unsafe_access', label: 'Unsafe access' },
                    { key: 'extreme_grease', label: 'Extreme grease/build-up' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2">
                      <input type="checkbox" id={key} checked={form[key]}
                        onChange={e => set({ [key]: e.target.checked })}
                        className="w-3.5 h-3.5 accent-red-500" />
                      <label htmlFor={key} className="text-xs">{label}</label>
                    </div>
                  ))}
                </div>
              </div>

              {photoRequired && (
                <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-2.5 text-xs text-orange-700">
                  📸 <strong>Photos required</strong> for this job type before a final quote can be confirmed.
                  <br /><span className="text-orange-500">Photo upload: Needs storage/API connection setup required. Download quote and attach photos via email for now.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add-ons */}
          <CalculatorAddons addons={form.addons || []} onChange={addons => set({ addons })} />

          {/* Travel */}
          <Card className="border-0 shadow-sm" style={{ background: '#ffffff' }}>
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm" style={{ color: '#1A3A2A' }}>Travel Distance</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <p className="text-xs text-gray-600">Base: Mount Low / Townsville. First 10 km included, then $1.00/km. Auto-filled when you select a job address above.</p>
              <div className="flex items-center gap-3">
                <div>
                  <Label className="text-xs">Distance to job (km)</Label>
                  <Input type="number" className="h-8 text-xs mt-1 w-28" value={form.travel_km}
                    min={0} onChange={e => set({ travel_km: e.target.value })} placeholder="e.g. 15" />
                </div>
                {Number(form.travel_km) > 10 && (
                  <div className="text-xs text-muted-foreground self-end pb-2">
                    Travel fee: <strong>${calcTravel(Number(form.travel_km)).toFixed(2)}</strong>
                    <span className="ml-1 text-muted-foreground">({Number(form.travel_km) - 10} km × $1)</span>
                  </div>
                )}
                {Number(form.travel_km) > 0 && Number(form.travel_km) <= 10 && (
                  <p className="text-xs text-green-600 self-end pb-2">Within free 10 km zone — no travel fee</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Surcharges, Discounts & Adjustments */}
          <Card className="border-0 shadow-sm" style={{ background: '#ffffff' }}>
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm" style={{ color: '#1A3A2A' }}>Discounts & Adjustments</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Discount Amount</Label>
                  <Input type="number" className="h-8 text-xs mt-1" value={form.discount_amount || ''} min={0}
                    onChange={e => set({ discount_amount: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={form.discount_type} onValueChange={v => set({ discount_type: v })}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed" className="text-xs">$ Fixed</SelectItem>
                      <SelectItem value="percent" className="text-xs">% Percent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Manual Adjustment ($) — positive or negative</Label>
                  <Input type="number" className="h-8 text-xs mt-1" value={form.manual_adjustment || ''}
                    onChange={e => set({ manual_adjustment: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <Label className="text-xs">Reason (required)</Label>
                  <Input className="h-8 text-xs mt-1" value={form.manual_adjustment_reason}
                    onChange={e => set({ manual_adjustment_reason: e.target.value })} placeholder="e.g. loyalty discount" />
                </div>
              </div>
              {Number(form.manual_adjustment) !== 0 && !form.manual_adjustment_reason && (
                <p className="text-xs text-orange-600">⚠️ Warning: Manual override applied — reason required.</p>
              )}
            </CardContent>
          </Card>

          {/* GST & Deposit */}
          <Card className="border-0 shadow-sm" style={{ background: '#ffffff' }}>
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm" style={{ color: '#1A3A2A' }}>GST & Deposit</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="flex items-center gap-3">
                <Switch checked={form.gst_enabled} onCheckedChange={v => set({ gst_enabled: v })} />
                <span className="text-xs">{form.gst_enabled ? 'GST Enabled (10% will be added)' : 'GST not applied to this quote'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.deposit_enabled} onCheckedChange={v => set({ deposit_enabled: v })} />
                <span className="text-xs">Require deposit</span>
              </div>
              {form.deposit_enabled && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">Deposit Amount</Label>
                    <Input type="number" className="h-8 text-xs mt-1" value={form.deposit_value} min={0}
                      onChange={e => set({ deposit_value: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={form.deposit_type} onValueChange={v => set({ deposit_type: v })}>
                      <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent" className="text-xs">% of total</SelectItem>
                        <SelectItem value="fixed" className="text-xs">$ Fixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-0 shadow-sm" style={{ background: '#ffffff' }}>
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm" style={{ color: '#1A3A2A' }}>Notes</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div>
                <Label className="text-xs">Client-facing notes (appears on quote)</Label>
                <Textarea className="text-xs mt-1 min-h-[60px]" value={form.notes} onChange={e => set({ notes: e.target.value })} placeholder="Service scope, inclusions/exclusions..." />
              </div>
              <div>
                <Label className="text-xs">Internal notes (Renee only)</Label>
                <Textarea className="text-xs mt-1 min-h-[50px]" value={form.internal_notes} onChange={e => set({ internal_notes: e.target.value })} placeholder="Access notes, red flags, parking..." />
              </div>
            </CardContent>
          </Card>

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3">
              <p className="text-xs font-bold text-red-700 mb-1">Please fix the following:</p>
              <ul className="text-xs text-red-600 list-disc list-inside space-y-0.5">
                {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          <Button className="w-full h-10 font-bold text-sm" style={{ background: '#1A3A2A', color: '#F5ECD7' }} onClick={handleSave} disabled={saving || !selectedService}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Quote'}
          </Button>
        </div>

        {/* RIGHT COLUMN — live breakdown */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <CalculatorBreakdown
              calc={calc}
              form={form}
              selectedService={selectedService}
              dirtyMeter={dirtyMeter}
              isQuoteRequired={isQuoteRequired}
              savedQuote={savedQuote}
            />
          </div>
        </div>
      </div>
    </div>
  );
}