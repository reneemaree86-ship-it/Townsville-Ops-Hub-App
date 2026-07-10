import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/card';
import { Button } from '@/button';
import { Input } from '@/input';
import { Textarea } from '@/textarea';
import { Label } from '@/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/select';
import { Badge } from '@/badge';
import { CheckCircle2, CalendarCheck, ClipboardList, X } from 'lucide-react';
import { Lead } from '@/entities';

const SERVICE_TYPES = [
  'Regular Home Cleaning ($75/hr)',
  'Detailed Refresh Clean ($85/hr)',
  'Deep / Spring Clean ($95/hr)',
  'Office & Commercial Cleaning ($98/hr)',
  'Pressure Washing ($90/hr)',
  'Pre-Sale / Rental Inspection Rescue ($92/hr)',
  'Airbnb / Short-Stay Reset ($75/hr)',
  'Oven Clean ($85)',
  'Rangehood Clean ($65)',
  'Fridge Internal Clean ($55)',
  'Windows & Glass (Security Screens $8 ea)',
  'Windows & Glass (Sliding Doors $25 ea)',
  'WorkCover / Support Home Help (Quote required)',
  'Bond Clean (Manual approval required)',
  'NDIS (Manual approval required)',
  'DVA (Manual approval required)',
  'Hazardous / Biohazard Clean (Manual approval required)',
  'Hoarder / Heavy Clean (Manual approval required)',
];

const MANUAL_APPROVAL_TYPES = [
  'Bond Clean (Manual approval required)',
  'NDIS (Manual approval required)',
  'DVA (Manual approval required)',
  'Hazardous / Biohazard Clean (Manual approval required)',
  'Hoarder / Heavy Clean (Manual approval required)',
];

const SUBURBS = [
  'Townsville City', 'Kirwan', 'Aitkenvale', 'Hermit Park', 'Hyde Park',
  'Mundingburra', 'Cranbrook', 'Annandale', 'Thuringowa Central', 'Condon',
  'Bohle Plains', 'Mount Louisa', 'Idalia', 'Rasmussen', 'Kelso',
  'Douglas', 'Deeragun', 'Burdell', 'Bushland Beach', 'Saunders Beach',
  'Woodstock', 'Magnetic Island', 'Belgian Gardens', 'Rowes Bay',
  'North Ward', 'Castle Hill', 'South Townsville', 'Other',
];

const URGENCY_OPTIONS = [
  { value: 'Cool - Flexible', label: 'Flexible — any time suits' },
  { value: 'Warm - This Week', label: 'This week' },
  { value: 'Hot - Urgent', label: 'Urgent — ASAP' },
];

export default function CleaningEnquiryForm({ mode = 'book', onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    suburb: '',
    service_requested: '',
    urgency: 'Cool - Flexible',
    preferred_date: '',
    preferred_time: '',
    notes: '',
  });

  const isManualApproval = MANUAL_APPROVAL_TYPES.includes(form.service_requested);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await Lead.create({
        business_id: null, // will be set by backend via default business
        name: form.name,
        contact_phone: form.phone,
        contact_email: form.email,
        suburb: form.suburb,
        service_requested: form.service_requested.split(' (')[0], // strip pricing suffix
        urgency: form.urgency,
        source: 'ops_hub_form',
        job_details: `${mode === 'book' ? 'Booking request' : 'Quote request'} via Ops Hub form. Preferred date: ${form.preferred_date || 'flexible'}. Preferred time: ${form.preferred_time || 'flexible'}. Notes: ${form.notes || 'none'}`,
        status: 'New',
        manual_approval_required: isManualApproval,
        manual_approval_reason: isManualApproval ? `Service type requires manual approval: ${form.service_requested}` : null,
        lead_score: urgencyScore(),
        score_rationale: `Submitted via Ops Hub ${mode} form`,
        notes: form.notes,
      });
      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (e) {
      setError('Something went wrong. Please try again or contact Renee directly.');
    }
    setSubmitting(false);
  };

  const urgencyScore = () => {
    if (form.urgency === 'Hot - Urgent') return 85;
    if (form.urgency === 'Warm - This Week') return 70;
    return 55;
  };

  const canProceed = () => {
    if (step === 1) return form.name.trim() && form.phone.trim() && form.suburb;
    if (step === 2) return form.service_requested;
    return true;
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {mode === 'book' ? 'Booking Request Received!' : 'Quote Request Received!'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isManualApproval
              ? "This service requires Renee's personal approval. She'll be in touch shortly."
              : "Renee will be in touch within 24 hours to confirm your booking."}
          </p>
        </div>
        {isManualApproval && (
          <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
            ⚠️ Manual approval required
          </Badge>
        )}
        {onClose && (
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {mode === 'book'
            ? <CalendarCheck className="w-4 h-4 text-primary" />
            : <ClipboardList className="w-4 h-4 text-primary" />
          }
          <h2 className="text-sm font-semibold text-foreground">
            {mode === 'book' ? 'Book a Clean' : 'Get a Quote'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Step {step} of 3</span>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-muted">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>

      {/* Step 1 — Contact Details */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Your Details</p>
          <div className="space-y-1">
            <Label className="text-xs">Full Name *</Label>
            <Input
              className="h-9 text-sm"
              placeholder="e.g. Sarah Johnson"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Phone Number *</Label>
            <Input
              className="h-9 text-sm"
              placeholder="e.g. 0412 345 678"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email (optional)</Label>
            <Input
              className="h-9 text-sm"
              placeholder="e.g. sarah@email.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Suburb *</Label>
            <Select value={form.suburb} onValueChange={v => set('suburb', v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select your suburb" />
              </SelectTrigger>
              <SelectContent>
                {SUBURBS.map(s => (
                  <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Step 2 — Service Selection */}
      {step === 2 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Service Required</p>
          <div className="space-y-1">
            <Label className="text-xs">Service Type *</Label>
            <Select value={form.service_requested} onValueChange={v => set('service_requested', v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map(s => (
                  <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isManualApproval && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              ⚠️ This service requires Renee's personal approval. Your enquiry will be reviewed before a booking is confirmed.
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Urgency</Label>
            <Select value={form.urgency} onValueChange={v => set('urgency', v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {URGENCY_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-sm">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Step 3 — Scheduling & Notes */}
      {step === 3 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Preferred Timing & Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Preferred Date</Label>
              <Input
                type="date"
                className="h-9 text-sm"
                value={form.preferred_date}
                onChange={e => set('preferred_date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Preferred Time</Label>
              <Select value={form.preferred_time} onValueChange={v => set('preferred_time', v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Any time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning" className="text-sm">Morning (7am–12pm)</SelectItem>
                  <SelectItem value="afternoon" className="text-sm">Afternoon (12pm–5pm)</SelectItem>
                  <SelectItem value="flexible" className="text-sm">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Additional Notes</Label>
            <Textarea
              className="text-sm resize-none"
              rows={3}
              placeholder="e.g. 3 bedroom house, pet friendly, access via side gate, anything extra we should know..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Summary:</span> {form.service_requested.split(' (')[0]} · {form.suburb} · {URGENCY_OPTIONS.find(o => o.value === form.urgency)?.label}
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2 pt-2">
        {step > 1 && (
          <Button variant="outline" size="sm" className="flex-1" onClick={() => setStep(s => s - 1)}>
            Back
          </Button>
        )}
        {step < 3 ? (
          <Button
            size="sm"
            className="flex-1"
            disabled={!canProceed()}
            onClick={() => setStep(s => s + 1)}
          >
            Next
          </Button>
        ) : (
          <Button
            size="sm"
            className="flex-1"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Submitting...' : mode === 'book' ? 'Submit Booking Request' : 'Submit Quote Request'}
          </Button>
        )}
      </div>
    </div>
  );
}
