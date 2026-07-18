import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, addDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ClientPicker from './ClientPicker';
import LineItemEditor from './LineItemEditor';
import TotalsPanel from './TotalsPanel';
import { calcTotals, calcTravel } from '@/lib/pricingData';

function nextQuoteNumber(existing) {
  const nums = existing.map(q => parseInt((q.quote_number || '').replace(/\D/g, '') || '0')).filter(Boolean);
  const max = nums.length ? Math.max(...nums) : 0;
  return `Q${String(max + 1).padStart(4, '0')}`;
}

const today = () => format(new Date(), 'yyyy-MM-dd');
const inDays = (n) => format(addDays(new Date(), n), 'yyyy-MM-dd');

const EMPTY = {
  client_id: '', client_name: '', client_email: '', client_phone: '', client_address: '',
  quote_date: today(), expiry_date: inDays(14),
  line_items: [],
  travel_km: 0, travel_fee: 0,
  discount_amount: 0, discount_type: 'fixed',
  gst_enabled: false, gst_amount: 0,
  subtotal: 0, total: 0,
  property_condition: 'average',
  job_address: '', job_notes: '', internal_notes: '',
  status: 'draft',
};

export default function QuoteForm({ quote, business, clients, onSaved, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [quoteNumber, setQuoteNumber] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (quote) {
      setForm({ ...EMPTY, ...quote });
      setQuoteNumber(quote.quote_number || '');
    } else {
      setForm({ ...EMPTY, quote_date: today(), expiry_date: inDays(14) });
    }
  }, [quote]);

  useEffect(() => {
    if (!quote) {
      base44.entities.Quote.filter({ business_id: business?.id }).then(existing => {
        setQuoteNumber(nextQuoteNumber(existing));
      });
    }
  }, [business, quote]);

  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  const handleSave = async () => {
    if (!form.client_name || !form.quote_date) return;
    setSaving(true);
    const travelFee = calcTravel(Number(form.travel_km) || 0);
    const totals = calcTotals({
      lineItems: form.line_items || [],
      travelFee,
      discountAmount: Number(form.discount_amount) || 0,
      discountType: form.discount_type || 'fixed',
      gstEnabled: form.gst_enabled || false,
    });
    const payload = {
      ...form,
      business_id: business.id,
      quote_number: quoteNumber,
      travel_fee: travelFee,
      subtotal: totals.subtotal,
      gst_amount: totals.gst,
      total: totals.total,
    };
    if (quote) {
      await base44.entities.Quote.update(quote.id, payload);
    } else {
      await base44.entities.Quote.create(payload);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            {quote ? 'Edit Quote' : 'New Quote'}
            <span className="text-muted-foreground font-normal">#{quoteNumber}</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList className="h-8">
            <TabsTrigger value="details" className="text-xs">Client & Details</TabsTrigger>
            <TabsTrigger value="items" className="text-xs">Line Items</TabsTrigger>
            <TabsTrigger value="totals" className="text-xs">Totals & Pricing</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 pt-3">
            <ClientPicker form={form} onChange={set} clients={clients} business={business} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Quote Date *</Label>
                <Input type="date" className="h-8 text-xs mt-1" value={form.quote_date} onChange={e => set({ quote_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Expiry Date</Label>
                <Input type="date" className="h-8 text-xs mt-1" value={form.expiry_date} onChange={e => set({ expiry_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Job Address (if different)</Label>
              <Input className="h-8 text-xs mt-1" value={form.job_address} onChange={e => set({ job_address: e.target.value })} placeholder="Job location" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Property Condition</Label>
                <Select value={form.property_condition} onValueChange={v => set({ property_condition: v })}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light" className="text-xs">Light — recently cleaned</SelectItem>
                    <SelectItem value="average" className="text-xs">Average — normal wear</SelectItem>
                    <SelectItem value="dirty" className="text-xs">Dirty — needs attention</SelectItem>
                    <SelectItem value="very_dirty" className="text-xs">Very Dirty — heavy build-up</SelectItem>
                    <SelectItem value="extreme" className="text-xs">Extreme — hoarder/neglected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => set({ status: v })}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                    <SelectItem value="sent" className="text-xs">Sent</SelectItem>
                    <SelectItem value="accepted" className="text-xs">Accepted</SelectItem>
                    <SelectItem value="declined" className="text-xs">Declined</SelectItem>
                    <SelectItem value="expired" className="text-xs">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="items" className="pt-3">
            <LineItemEditor items={form.line_items || []} onChange={items => set({ line_items: items })} />
          </TabsContent>

          <TabsContent value="totals" className="pt-3">
            <TotalsPanel form={form} onChange={set} />
          </TabsContent>

          <TabsContent value="notes" className="space-y-3 pt-3">
            <div>
              <Label className="text-xs">Job Notes (visible on quote)</Label>
              <Textarea className="text-xs mt-1 min-h-[80px]" value={form.job_notes} onChange={e => set({ job_notes: e.target.value })} placeholder="Service details, scope, inclusions, exclusions..." />
            </div>
            <div>
              <Label className="text-xs">Internal Notes (not on PDF)</Label>
              <Textarea className="text-xs mt-1 min-h-[60px]" value={form.internal_notes} onChange={e => set({ internal_notes: e.target.value })} placeholder="Renee's internal notes only..." />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-3 border-t mt-2">
          <div className="text-sm font-bold">
            Total: ${(calcTotals({ lineItems: form.line_items || [], travelFee: calcTravel(Number(form.travel_km) || 0), discountAmount: Number(form.discount_amount) || 0, discountType: form.discount_type || 'fixed', gstEnabled: form.gst_enabled }).total || 0).toFixed(2)}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="text-xs h-8" onClick={handleSave} disabled={saving || !form.client_name}>
              {saving ? 'Saving...' : quote ? 'Save Changes' : 'Save Quote'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}