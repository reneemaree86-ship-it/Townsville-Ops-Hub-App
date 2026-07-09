import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/base44Client';
import { Card, CardContent } from '@/card';
import { Button } from '@/button';
import { Input } from '@/input';
import { Label } from '@/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/select';
import { Textarea } from '@/textarea';
import { Checkbox } from '@/checkbox';
import { Switch } from '@/switch';
import { Separator } from '@/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/dialog';
import PageHeader from '@/PageHeader';
import StatusBadge from '@/StatusBadge';
import { Plus, Pencil, Trash2, Send, CheckCircle2, XCircle, ArrowRightCircle, FileText, Eye, Download, Receipt, RotateCcw } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import invoiceHeaderImg from '@/assets/invoice-logo-small.png';

const FALLBACK_ADD_ONS = [
  { name: 'Security Screen (ea)', price: 8 },
  { name: 'Sliding Glass Door (ea)', price: 25 },
  { name: 'Oven Clean', price: 85 },
  { name: 'Rangehood Clean', price: 65 },
  { name: 'Fridge Internal', price: 55 },
  { name: 'Fridge/Freezer Combo', price: 85 },
];

// Locked formula per Renee (tuned 2026-07-03 -- base adjusted 1.5->0.95 so a
// standard 3bed/2bath clean lands on exactly 3hrs)
// base 0.95hr + 0.35hr/bedroom + 0.5hr/bathroom + 0.25hr/extra living area
// + 0.25hr large kitchen + 0.5hr heavy dust/pet hair/clutter/extra detail
// then × condition multiplier, floored at the service's minimum_hours,
// then rounded UP to the nearest 0.5hr.
const CONDITION_LEVELS = [
  { value: 'light', label: 'Light / well maintained', multiplier: 0.9 },
  { value: 'standard', label: 'Standard / average', multiplier: 1.0 },
  { value: 'detailed', label: 'Detailed / lived-in', multiplier: 1.25 },
  { value: 'heavy', label: 'Heavy / neglected', multiplier: 1.5 },
  { value: 'deep_clean', label: 'Deep clean / restoration level', multiplier: 1.75 },
];

function conditionMultiplier(level) {
  return CONDITION_LEVELS.find(c => c.value === level)?.multiplier ?? 1.0;
}

function calculateHours({ bedrooms, bathrooms, extra_living_areas, large_kitchen, extra_detail_needed, condition_level }, minimumHours) {
  const bd = parseFloat(bedrooms) || 0;
  const ba = parseFloat(bathrooms) || 0;
  const living = parseFloat(extra_living_areas) || 0;

  let hours = 0.95 + bd * 0.35 + ba * 0.5 + living * 0.25;
  if (large_kitchen) hours += 0.25;
  if (extra_detail_needed) hours += 0.5;

  hours *= conditionMultiplier(condition_level);

  const floor = parseFloat(minimumHours) || 0;
  hours = Math.max(hours, floor);

  // round up to nearest 0.5
  hours = Math.ceil(hours * 2) / 2;

  return +hours.toFixed(2);
}

function computeTotals(form) {
  const rate = parseFloat(form.hourly_rate) || 0;
  const hours = parseFloat(form.final_hours) || 0;
  const travel = parseFloat(form.travel_fee) || 0;
  const laundry = parseFloat(form.laundry_linen_fee) || 0;
  const urgency = parseFloat(form.urgency_fee) || 0;
  const addOnsTotal = (form.add_ons || []).reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0);

  const subtotal = rate * hours + travel + laundry + urgency + addOnsTotal;
  const gstAmount = form.gst_included ? subtotal * 0.1 : 0;
  const total = subtotal + gstAmount;

  return {
    subtotal: +subtotal.toFixed(2),
    gst_amount: +gstAmount.toFixed(2),
    total_estimate: +total.toFixed(2),
    total_range_min: +total.toFixed(2),
    total_range_max: +total.toFixed(2),
    estimated_hours_min: hours,
    estimated_hours_max: hours,
  };
}

const emptyForm = {
  lead_id: '',
  client_id: '',
  service_id: '',
  service_type: '',
  hourly_rate: 75,
  bedrooms: '',
  bathrooms: '',
  extra_living_areas: '',
  large_kitchen: false,
  extra_detail_needed: false,
  condition_level: 'standard',
  calculated_hours: null,
  manual_hours_override: null,
  final_hours: 2,
  add_ons: [],
  travel_fee: 0,
  laundry_linen_fee: 0,
  urgency_fee: 0,
  gst_included: false,
  status: 'draft',
  photos_received: false,
  scope_confirmed: false,
  notes: '',
  caveat: '',
  expires_at: '',
};

function QuoteFormModal({ open, onClose, onSave, existing, saving, clients, leads, services }) {
  const [sourceType, setSourceType] = useState('client');
  const [form, setForm] = useState(existing ? { ...emptyForm, ...existing } : emptyForm);
  const [hoursTouched, setHoursTouched] = useState(false);

  useEffect(() => {
    const initial = existing ? { ...emptyForm, ...existing, add_ons: existing.add_ons || [] } : emptyForm;
    setForm(initial);
    setSourceType(initial.lead_id && !initial.client_id ? 'lead' : 'client');
    setHoursTouched(!!existing?.manual_hours_override);
  }, [existing, open]);

  const selectedService = services.find(s => s.id === form.service_id);
  const availableAddOns = selectedService?.add_ons?.length ? selectedService.add_ons : FALLBACK_ADD_ONS;

  const calculatedHours = useMemo(
    () => calculateHours(form, selectedService?.minimum_hours),
    [form.bedrooms, form.bathrooms, form.extra_living_areas, form.large_kitchen, form.extra_detail_needed, form.condition_level, selectedService?.minimum_hours]
  );

  // Auto-sync final_hours to the formula unless the user has manually overridden it
  useEffect(() => {
    if (!hoursTouched) {
      setForm(f => ({ ...f, final_hours: calculatedHours, calculated_hours: calculatedHours }));
    } else {
      setForm(f => ({ ...f, calculated_hours: calculatedHours }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatedHours]);

  const handleServiceChange = (serviceId) => {
    const svc = services.find(s => s.id === serviceId);
    setForm(f => ({
      ...f,
      service_id: serviceId,
      service_type: svc?.name || f.service_type,
      hourly_rate: svc?.pricing_model === 'hourly' ? (svc.hourly_rate ?? f.hourly_rate) : f.hourly_rate,
      add_ons: [],
    }));
  };

  const toggleAddOn = (addon) => {
    setForm(f => {
      const exists = (f.add_ons || []).some(a => a.name === addon.name);
      const add_ons = exists
        ? f.add_ons.filter(a => a.name !== addon.name)
        : [...(f.add_ons || []), { name: addon.name, price: addon.price }];
      return { ...f, add_ons };
    });
  };

  const handleFinalHoursChange = (value) => {
    setHoursTouched(true);
    setForm(f => ({ ...f, final_hours: value }));
  };

  const handleRecalculate = () => {
    setHoursTouched(false);
    setForm(f => ({ ...f, final_hours: calculatedHours, manual_hours_override: null }));
  };

  const totals = computeTotals(form);

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalHoursNum = parseFloat(form.final_hours) || 0;
    const isOverridden = hoursTouched && finalHoursNum !== calculatedHours;
    const payload = {
      ...form,
      lead_id: sourceType === 'lead' ? form.lead_id : '',
      client_id: sourceType === 'client' ? form.client_id : '',
      hourly_rate: parseFloat(form.hourly_rate) || 0,
      bedrooms: form.bedrooms === '' ? null : Number(form.bedrooms),
      bathrooms: form.bathrooms === '' ? null : Number(form.bathrooms),
      extra_living_areas: form.extra_living_areas === '' ? null : Number(form.extra_living_areas),
      travel_fee: parseFloat(form.travel_fee) || 0,
      laundry_linen_fee: parseFloat(form.laundry_linen_fee) || 0,
      urgency_fee: parseFloat(form.urgency_fee) || 0,
      calculated_hours: calculatedHours,
      manual_hours_override: isOverridden ? finalHoursNum : null,
      final_hours: finalHoursNum,
      ...computeTotals({ ...form, final_hours: finalHoursNum }),
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Quote' : 'New Quote'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs">Quote for</Label>
            <div className="flex gap-2 mt-1">
              <Button type="button" size="sm" variant={sourceType === 'client' ? 'default' : 'outline'} onClick={() => setSourceType('client')}>Existing Client</Button>
              <Button type="button" size="sm" variant={sourceType === 'lead' ? 'default' : 'outline'} onClick={() => setSourceType('lead')}>A Lead (not yet a client)</Button>
            </div>
          </div>
          {sourceType === 'client' ? (
            <div>
              <Label className="text-xs">Client *</Label>
              <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Select a client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.suburb ? `— ${c.suburb}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label className="text-xs">Lead *</Label>
              <Select value={form.lead_id} onValueChange={v => setForm(f => ({ ...f, lead_id: v }))}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Select a lead" /></SelectTrigger>
                <SelectContent>
                  {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.name} {l.suburb ? `— ${l.suburb}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">Convert this lead to a Client first if the quote is approved and needs to become a booking.</p>
            </div>
          )}

          <div>
            <Label className="text-xs">Service Type *</Label>
            <Select value={form.service_id} onValueChange={handleServiceChange}>
              <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Select a service" /></SelectTrigger>
              <SelectContent>
                {services.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}{s.pricing_model === 'hourly' && s.hourly_rate ? ` — $${s.hourly_rate}/hr` : s.pricing_model === 'fixed_from' ? ` — from $${s.fixed_starting_price}` : ' — manual quote'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedService?.manual_approval_required && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">This service always requires manual approval before confirming.</p>
            )}
          </div>

          <div>
            <Label className="text-xs">Hourly Rate ($)</Label>
            <Input type="number" step="0.01" className="mt-1 text-sm max-w-[160px]" value={form.hourly_rate}
              onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} />
            <p className="text-[10px] text-muted-foreground mt-1">Pulled from the Services Catalog — edit there to change the locked rate.</p>
          </div>

          <Separator />
          <p className="text-xs font-semibold text-foreground">Auto-Hours Calculator</p>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Bedrooms</Label>
              <Input type="number" className="mt-1 text-sm" value={form.bedrooms}
                onChange={e => setForm(f => ({ ...f, bedrooms: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Bathrooms</Label>
              <Input type="number" className="mt-1 text-sm" value={form.bathrooms}
                onChange={e => setForm(f => ({ ...f, bathrooms: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Extra Living Areas</Label>
              <Input type="number" className="mt-1 text-sm" value={form.extra_living_areas}
                onChange={e => setForm(f => ({ ...f, extra_living_areas: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-xs p-2 border border-border rounded-md cursor-pointer">
              <Checkbox checked={form.large_kitchen} onCheckedChange={v => setForm(f => ({ ...f, large_kitchen: !!v }))} />
              Large kitchen
            </label>
            <label className="flex items-center gap-2 text-xs p-2 border border-border rounded-md cursor-pointer">
              <Checkbox checked={form.extra_detail_needed} onCheckedChange={v => setForm(f => ({ ...f, extra_detail_needed: !!v }))} />
              Heavy dust / pet hair / clutter
            </label>
          </div>

          <div>
            <Label className="text-xs">Condition Level</Label>
            <Select value={form.condition_level} onValueChange={v => setForm(f => ({ ...f, condition_level: v }))}>
              <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONDITION_LEVELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label} (×{c.multiplier})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Auto-calculated hours{selectedService?.minimum_hours ? ` (min ${selectedService.minimum_hours}hr)` : ''}</span>
              <span className="font-semibold text-foreground">{calculatedHours} hrs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-xs">Final Hours {hoursTouched && <span className="text-amber-600 dark:text-amber-400">(manually overridden)</span>}</Label>
                <Input type="number" step="0.5" className="mt-1 text-sm" value={form.final_hours}
                  onChange={e => handleFinalHoursChange(e.target.value)} />
              </div>
              {hoursTouched && (
                <Button type="button" size="sm" variant="outline" className="mt-5 h-9" onClick={handleRecalculate}>
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-xs">Add-ons</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {availableAddOns.map(a => (
                <label key={a.name} className="flex items-center gap-2 text-xs p-2 border border-border rounded-md cursor-pointer">
                  <Checkbox checked={(form.add_ons || []).some(x => x.name === a.name)} onCheckedChange={() => toggleAddOn(a)} />
                  {a.name} (${parseFloat(a.price).toFixed(0)})
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Travel Fee ($)</Label>
              <Input type="number" step="0.01" className="mt-1 text-sm" value={form.travel_fee}
                onChange={e => setForm(f => ({ ...f, travel_fee: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Laundry/Linen ($)</Label>
              <Input type="number" step="0.01" className="mt-1 text-sm" value={form.laundry_linen_fee}
                onChange={e => setForm(f => ({ ...f, laundry_linen_fee: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Urgency Fee ($)</Label>
              <Input type="number" step="0.01" className="mt-1 text-sm" value={form.urgency_fee}
                onChange={e => setForm(f => ({ ...f, urgency_fee: e.target.value }))} />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground -mt-2">Travel: first 10km free, then $1/km.</p>

          <div className="flex items-center justify-between p-2 bg-muted rounded-md">
            <Label className="text-xs font-normal cursor-pointer">Add GST (10%)</Label>
            <Switch checked={form.gst_included} onCheckedChange={v => setForm(f => ({ ...f, gst_included: v }))} />
          </div>

          <div className="p-3 bg-muted rounded-lg space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{form.final_hours} hrs × ${parseFloat(form.hourly_rate || 0).toFixed(2)}/hr + fees/add-ons</span><span>${totals.subtotal.toFixed(2)}</span>
            </div>
            {form.gst_included && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>GST (10%)</span><span>${totals.gst_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-border">
              <span className="text-xs font-medium">Total Estimate</span>
              <span className="text-sm font-bold text-foreground">${totals.total_estimate.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <Checkbox checked={form.photos_received} onCheckedChange={v => setForm(f => ({ ...f, photos_received: !!v }))} />
              <Label className="text-xs font-normal cursor-pointer">Photos received</Label>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <Checkbox checked={form.scope_confirmed} onCheckedChange={v => setForm(f => ({ ...f, scope_confirmed: !!v }))} />
              <Label className="text-xs font-normal cursor-pointer">Scope confirmed</Label>
            </div>
          </div>
          <div>
            <Label className="text-xs">Quote Expires</Label>
            <Input type="date" className="mt-1 text-sm max-w-xs" value={form.expires_at ? String(form.expires_at).slice(0, 10) : ''}
              onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Caveat (e.g. price may change if property condition differs)</Label>
            <Textarea className="mt-1 text-sm" rows={2} value={form.caveat}
              onChange={e => setForm(f => ({ ...f, caveat: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea className="mt-1 text-sm" rows={2} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button type="submit" disabled={saving || (sourceType === 'client' ? !form.client_id : !form.lead_id)}>
              {saving ? 'Saving...' : 'Save Quote'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuotePreviewModal({ quote, client, lead, onClose, onSent }) {
  const previewRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  const recipient = client || lead;
  const recipientEmail = client?.email || lead?.contact_email;

  const generatePdfFile = async () => {
    const canvas = await html2canvas(previewRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 24;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
    const naturalWidth = usableWidth;
    const naturalHeight = (canvas.height * naturalWidth) / canvas.width;
    let imgWidth = naturalWidth;
    let imgHeight = naturalHeight;
    if (imgHeight > usableHeight) {
      imgHeight = usableHeight;
      imgWidth = (canvas.width * imgHeight) / canvas.height;
    }
    const x = (pageWidth - imgWidth) / 2;
    const y = margin;
    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
    const fileName = `Quote-${quote.id.slice(0, 8)}-${(recipient?.name || 'client').replace(/\s+/g, '-')}.pdf`;
    return { pdf, fileName };
  };

  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      const { pdf, fileName } = await generatePdfFile();
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF generation failed', err);
      alert('Could not generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendToClient = async () => {
    if (!previewRef.current) return;
    setSending(true);
    setSendError(null);
    try {
      const { pdf, fileName } = await generatePdfFile();
      const blob = pdf.output('blob');
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.functions.invoke('sendQuoteEmail', { quote_id: quote.id, pdf_url: file_url });
      onSent();
    } catch (err) {
      console.error('Send quote failed', err);
      setSendError(err?.message || 'Could not send the quote. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const total = quote.total_estimate ?? quote.total_range_max ?? 0;
  const hours = quote.final_hours ?? quote.estimated_hours_max ?? 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Eye className="w-4 h-4" /> Quote Preview</DialogTitle>
        </DialogHeader>

        <div ref={previewRef} className="bg-card border border-border rounded-lg overflow-hidden font-sans">
          <div className="p-6 space-y-5">
            <div className="flex justify-between items-start">
              <img src={invoiceHeaderImg} alt="Renee's Cleaning Services" crossOrigin="anonymous" className="h-14 w-auto object-contain" />
              <div className="text-right">
                <div className="text-lg font-bold text-primary">QUOTE</div>
                <p className="text-xs text-muted-foreground mt-1">Date: {new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                {quote.expires_at && <p className="text-xs text-muted-foreground">Valid until: {new Date(quote.expires_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' })}</p>}
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Quote For</p>
              <p className="text-sm font-semibold text-foreground">{recipient?.name || '—'}</p>
              {recipient?.address && <p className="text-xs text-muted-foreground">{recipient.address}</p>}
              {recipient?.suburb && <p className="text-xs text-muted-foreground">{recipient.suburb}, QLD</p>}
              {recipientEmail && <p className="text-xs text-muted-foreground">{recipientEmail}</p>}
            </div>
            <Separator />
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase">Description</th>
                  <th className="text-right py-2 text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2 text-foreground">
                    {quote.service_type || 'Cleaning Service'} — {hours} hrs @ ${parseFloat(quote.hourly_rate || 0).toFixed(2)}/hr
                  </td>
                  <td className="py-2 text-right text-foreground">
                    ${(parseFloat(quote.hourly_rate || 0) * parseFloat(hours || 0)).toFixed(2)}
                  </td>
                </tr>
                {(quote.add_ons || []).map((a, i) => (
                  <tr key={i}>
                    <td className="py-2 text-muted-foreground">{a.name}</td>
                    <td className="py-2 text-right text-muted-foreground">${parseFloat(a.price).toFixed(2)}</td>
                  </tr>
                ))}
                {parseFloat(quote.travel_fee) > 0 && (
                  <tr><td className="py-2 text-muted-foreground">Travel Fee</td><td className="py-2 text-right text-muted-foreground">${parseFloat(quote.travel_fee).toFixed(2)}</td></tr>
                )}
                {parseFloat(quote.laundry_linen_fee) > 0 && (
                  <tr><td className="py-2 text-muted-foreground">Laundry / Linen</td><td className="py-2 text-right text-muted-foreground">${parseFloat(quote.laundry_linen_fee).toFixed(2)}</td></tr>
                )}
                {parseFloat(quote.urgency_fee) > 0 && (
                  <tr><td className="py-2 text-muted-foreground">Urgency Fee</td><td className="py-2 text-right text-muted-foreground">${parseFloat(quote.urgency_fee).toFixed(2)}</td></tr>
                )}
              </tbody>
            </table>
            <Separator />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">${parseFloat(quote.subtotal || 0).toFixed(2)}</span></div>
              {quote.gst_included && (
                <div className="flex justify-between"><span className="text-muted-foreground">GST (10%)</span><span className="text-foreground">${parseFloat(quote.gst_amount || 0).toFixed(2)}</span></div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-1">
                <span className="text-foreground">Total Estimate</span>
                <span className="text-primary">${parseFloat(total).toFixed(2)}</span>
              </div>
            </div>
            {quote.caveat && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground italic">{quote.caveat}</p>
              </>
            )}
          </div>
        </div>

        {sendError && (
          <div className="text-xs text-destructive bg-destructive/10 rounded-md p-2">{sendError}</div>
        )}
        {!recipientEmail && (
          <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-md p-2">
            No email address on file — add one on the {client ? 'Clients' : 'Leads'} page to send this quote by email. You can still download the PDF.
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={handleDownloadPDF} disabled={downloading} variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" /> {downloading ? 'Generating...' : 'Download PDF'}
          </Button>
          <Button onClick={handleSendToClient} disabled={sending || !recipientEmail} className="flex items-center gap-2">
            <Send className="w-4 h-4" /> {sending ? 'Sending...' : 'Send Quote to Client'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Quotes() {
  const { activeBusiness } = useOutletContext();
  const [quotes, setQuotes] = useState([]);
  const [clients, setClients] = useState([]);
  const [leads, setLeads] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [previewQuote, setPreviewQuote] = useState(null);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!activeBusiness) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading business…</div>;
  }

  const loadData = async () => {
    setLoading(true);
    try {
      const [q, c, l, s] = await Promise.all([
        base44.entities.Quote.list('-created_date', 500),
        base44.entities.Client.list('-created_date', 500),
        base44.entities.Lead.list('-created_date', 200),
        base44.entities.Service.filter({ status: 'active' }),
      ]);
      setQuotes(q);
      setClients(c);
      setLeads(l);
      setServices(s);
    } catch (e) {
      console.error(e);
      setErrorMsg('Could not load quotes, clients, leads or services. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const clientName = (id) => clients.find(c => c.id === id)?.name;
  const leadName = (id) => leads.find(l => l.id === id)?.name;

  const handleSave = async (data) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const payload = { ...data, business_id: activeBusiness?.id || data.business_id };
      if (editingQuote) {
        await base44.entities.Quote.update(editingQuote.id, payload);
      } else {
        await base44.entities.Quote.create(payload);
      }
      setShowForm(false);
      setEditingQuote(null);
      await loadData();
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || 'Could not save the quote. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this quote? This cannot be undone.')) {
      setErrorMsg(null);
      try {
        await base44.entities.Quote.delete(id);
        await loadData();
      } catch (e) {
        console.error(e);
        setErrorMsg(e?.message || 'Could not delete the quote. Please try again.');
      }
    }
  };

  const setStatus = async (quote, status) => {
    const patch = { status };
    if (status === 'sent') patch.sent_at = new Date().toISOString();
    if (status === 'approved') patch.approved_at = new Date().toISOString();
    setErrorMsg(null);
    try {
      await base44.entities.Quote.update(quote.id, patch);
      await loadData();
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || 'Could not update the quote status. Please try again.');
    }
  };

  const handleConvertToJob = async (quote) => {
    if (!quote.client_id) {
      alert('This quote is linked to a lead, not a client yet. Edit the quote and select an existing client (create one on the Clients page first if needed) before converting to a booking.');
      return;
    }
    setConverting(quote.id);
    setErrorMsg(null);
    try {
      const client = clients.find(c => c.id === quote.client_id);
      await base44.entities.Job.create({
        business_id: quote.business_id || activeBusiness.id,
        client_id: quote.client_id,
        service_type: quote.service_type,
        address: client?.address || '',
        suburb: client?.suburb || '',
        status: 'draft',
        quoted_range_min: quote.total_range_min,
        quoted_range_max: quote.total_range_max,
        add_ons: quote.add_ons || [],
        travel_fee: quote.travel_fee || 0,
        notes: quote.notes || '',
        scope_confirmed: quote.scope_confirmed || false,
        quote_id: quote.id,
      });
      await base44.entities.Quote.update(quote.id, { status: 'converted_to_job' });
      await loadData();
      alert('Booking created — go to the Jobs page to schedule it and assign staff.');
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || 'Could not convert the quote to a booking. Please try again.');
    } finally {
      setConverting(null);
    }
  };

  const handleConvertToInvoice = async (quote) => {
    if (!quote.client_id) {
      alert('This quote is linked to a lead, not a client yet. Edit the quote and select an existing client before converting to an invoice.');
      return;
    }
    setConverting(quote.id);
    setErrorMsg(null);
    try {
      const total = quote.total_estimate ?? quote.total_range_max ?? 0;
      const subtotalExGst = quote.gst_included ? (quote.subtotal ?? total / 1.1) : (quote.subtotal ?? total);
      const gstAmount = quote.gst_included ? (quote.gst_amount ?? +(subtotalExGst * 0.1).toFixed(2)) : 0;
      const lineItems = [
        { description: quote.service_type || 'Cleaning Service', quantity: 1, unit_price: subtotalExGst - (quote.travel_fee || 0), amount: subtotalExGst - (quote.travel_fee || 0) },
        ...(quote.add_ons || []).map(a => ({ description: a.name, quantity: 1, unit_price: a.price, amount: a.price })),
      ];
      await base44.entities.Invoice.create({
        business_id: quote.business_id || activeBusiness?.id,
        client_id: quote.client_id,
        service_type: quote.service_type,
        travel_fee: quote.travel_fee || 0,
        amount: +(subtotalExGst).toFixed(2),
        gst_amount: gstAmount,
        total_amount: +(subtotalExGst + gstAmount).toFixed(2),
        status: 'draft',
        line_items: lineItems,
        notes: quote.notes || '',
      });
      await base44.entities.Quote.update(quote.id, { status: 'converted_to_invoice' });
      await loadData();
      alert('Invoice created — go to the Invoices page to review and send it.');
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || 'Could not convert the quote to an invoice. Please try again.');
    } finally {
      setConverting(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotes"
        description={`${quotes.length} total quotes`}
        actions={
          <Button onClick={() => { setEditingQuote(null); setShowForm(true); }} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Quote
          </Button>
        }
        business={activeBusiness}
      />

      {errorMsg && (
        <div className="text-xs text-destructive bg-destructive/10 rounded-md p-3 flex items-center justify-between">
          <span>{errorMsg}</span>
          <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setErrorMsg(null)}>Dismiss</Button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading quotes...</p>
      ) : quotes.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No quotes yet. Create one to get started.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {quotes.map(q => (
            <Card key={q.id}>
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">
                      {q.client_id ? clientName(q.client_id) : (q.lead_id ? `${leadName(q.lead_id)} (lead)` : 'Unassigned')}
                    </span>
                    <StatusBadge status={q.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{q.service_type || '—'} · {q.final_hours ?? q.estimated_hours_max ?? '—'} hrs</p>
                  <p className="text-sm font-semibold text-foreground mt-1">
                    ${parseFloat(q.total_estimate ?? q.total_range_max ?? 0).toFixed(2)}
                  </p>
                  {q.expires_at && <p className="text-[10px] text-muted-foreground mt-1">Expires {new Date(q.expires_at).toLocaleDateString('en-AU')}</p>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setPreviewQuote(q)}>
                    <FileText className="w-3 h-3 mr-1" /> PDF / Send
                  </Button>
                  {q.status === 'draft' && (
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setStatus(q, 'sent')}>
                      <Send className="w-3 h-3 mr-1" /> Mark Sent
                    </Button>
                  )}
                  {q.status === 'sent' && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setStatus(q, 'approved')}>
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setStatus(q, 'rejected')}>
                        <XCircle className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                  {q.status === 'approved' && (
                    <>
                      <Button size="sm" className="h-7 text-[11px]" disabled={converting === q.id} onClick={() => handleConvertToJob(q)}>
                        <ArrowRightCircle className="w-3 h-3 mr-1" /> {converting === q.id ? 'Converting...' : 'Convert to Booking'}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={converting === q.id} onClick={() => handleConvertToInvoice(q)}>
                        <Receipt className="w-3 h-3 mr-1" /> Convert to Invoice
                      </Button>
                    </>
                  )}
                  {q.status === 'converted_to_job' && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> Converted to Booking</span>
                  )}
                  {q.status === 'converted_to_invoice' && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Receipt className="w-3 h-3" /> Converted to Invoice</span>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingQuote(q); setShowForm(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(q.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <QuoteFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingQuote(null); }}
        onSave={handleSave}
        existing={editingQuote}
        saving={saving}
        clients={clients}
        leads={leads}
        services={services}
      />

      {previewQuote && (
        <QuotePreviewModal
          quote={previewQuote}
          client={previewQuote.client_id ? clients.find(c => c.id === previewQuote.client_id) : null}
          lead={previewQuote.lead_id ? leads.find(l => l.id === previewQuote.lead_id) : null}
          onClose={() => setPreviewQuote(null)}
          onSent={async () => { setPreviewQuote(null); await loadData(); }}
        />
      )}
    </div>
  );
}
