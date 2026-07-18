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
import { Eye } from 'lucide-react';
import ClientPicker from './ClientPicker';
import LineItemEditor from './LineItemEditor';
import TotalsPanel from './TotalsPanel';
import { calcTotals, calcTravel } from '@/lib/pricingData';
import { generatePDF } from '@/lib/pdfGenerator';
import { openPdfInNewWindow } from '@/lib/openPdf';

function nextInvoiceNumber(existing) {
  const nums = existing.map(i => parseInt((i.invoice_number || '').replace(/\D/g, '') || '0')).filter(Boolean);
  const max = nums.length ? Math.max(...nums) : 0;
  return `INV${String(max + 1).padStart(4, '0')}`;
}

const today = () => format(new Date(), 'yyyy-MM-dd');
const inDays = (n) => format(addDays(new Date(), n), 'yyyy-MM-dd');

const EMPTY = {
  client_id: '', client_name: '', client_email: '', client_phone: '', client_address: '',
  invoice_date: today(), due_date: inDays(14),
  line_items: [],
  travel_km: 0, travel_fee: 0,
  discount_amount: 0, discount_type: 'fixed',
  gst_enabled: false, gst_amount: 0,
  subtotal: 0, total: 0,
  amount_paid: 0, balance_due: 0,
  payment_status: 'unpaid',
  payment_method: 'bank_transfer',
  notes: '', job_address: '', service_description: '', scope_of_work_id: '',
};

export default function InvoiceForm({ invoice, business, clients, onSaved, onClose, prefillData }) {
  const [form, setForm] = useState(EMPTY);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [scopes, setScopes] = useState([]);

  useEffect(() => {
    if (business?.id) base44.entities.ScopeOfWork.filter({ business_id: business.id }).then(setScopes);
  }, [business]);

  useEffect(() => {
    if (invoice) {
      setForm({ ...EMPTY, ...invoice });
      setInvoiceNumber(invoice.invoice_number || '');
    } else if (prefillData) {
      setForm({ ...EMPTY, ...prefillData, invoice_date: today(), due_date: inDays(14) });
    } else {
      setForm({ ...EMPTY, invoice_date: today(), due_date: inDays(14) });
    }
  }, [invoice, prefillData]);

  useEffect(() => {
    if (!invoice) {
      base44.entities.Invoice.filter({ business_id: business?.id }).then(existing => {
        setInvoiceNumber(nextInvoiceNumber(existing));
      });
    }
  }, [business, invoice]);

  const set = (patch) => setForm(f => {
    const next = { ...f, ...patch };
    // Recalc balance due when amount_paid changes
    if ('amount_paid' in patch) {
      next.balance_due = Math.max(0, (next.total || 0) - (Number(patch.amount_paid) || 0));
      if (Number(patch.amount_paid) >= (next.total || 0)) next.payment_status = 'paid';
      else if (Number(patch.amount_paid) > 0) next.payment_status = 'partially_paid';
      else next.payment_status = 'unpaid';
    }
    return next;
  });

  const handleSave = async () => {
    if (!form.client_name || !form.invoice_date) return;
    setSaving(true);
    const travelFee = calcTravel(Number(form.travel_km) || 0);
    const totals = calcTotals({
      lineItems: form.line_items || [],
      travelFee,
      discountAmount: Number(form.discount_amount) || 0,
      discountType: form.discount_type || 'fixed',
      gstEnabled: form.gst_enabled || false,
    });
    const totalVal = totals.total;
    const amtPaid = Number(form.amount_paid) || 0;
    const balanceDue = Math.max(0, totalVal - amtPaid);
    let payStatus = form.payment_status;
    if (amtPaid >= totalVal && totalVal > 0) payStatus = 'paid';
    else if (amtPaid > 0) payStatus = 'partially_paid';

    const payload = {
      ...form,
      business_id: business.id,
      invoice_number: invoiceNumber,
      travel_fee: travelFee,
      subtotal: totals.subtotal,
      gst_amount: totals.gst,
      total: totalVal,
      balance_due: balanceDue,
      payment_status: payStatus,
    };
    let savedInvoice;
    if (invoice) {
      savedInvoice = await base44.entities.Invoice.update(invoice.id, payload);
    } else {
      savedInvoice = await base44.entities.Invoice.create(payload);
    }
    if (form.scope_of_work_id) {
      await base44.entities.ScopeOfWork.update(form.scope_of_work_id, { invoice_id: savedInvoice.id });
    }
    setSaving(false);
    onSaved();
  };

  const liveTotals = calcTotals({
    lineItems: form.line_items || [],
    travelFee: calcTravel(Number(form.travel_km) || 0),
    discountAmount: Number(form.discount_amount) || 0,
    discountType: form.discount_type || 'fixed',
    gstEnabled: form.gst_enabled || false,
  });

  const handlePreview = async () => {
    try {
      const travelFee = calcTravel(Number(form.travel_km) || 0);
      const doc = generatePDF({
        ...form,
        type: 'invoice',
        invoice_number: invoiceNumber,
        travel_fee: travelFee,
        subtotal: liveTotals.subtotal,
        gst_amount: liveTotals.gst,
        total: liveTotals.total,
        balance_due: Math.max(0, liveTotals.total - (Number(form.amount_paid) || 0)),
      });
      await openPdfInNewWindow(doc, `invoice-preview-${form.client_name || 'client'}.pdf`);
    } catch (e) {
      alert('Preview error: ' + e.message);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            {invoice ? 'Edit Invoice' : 'New Invoice'}
            <span className="text-muted-foreground font-normal">#{invoiceNumber}</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList className="h-8">
            <TabsTrigger value="details" className="text-xs">Client & Details</TabsTrigger>
            <TabsTrigger value="items" className="text-xs">Line Items</TabsTrigger>
            <TabsTrigger value="totals" className="text-xs">Totals & Pricing</TabsTrigger>
            <TabsTrigger value="payment" className="text-xs">Payment</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 pt-3">
            <ClientPicker form={form} onChange={set} clients={clients} business={business} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Invoice Date *</Label>
                <Input type="date" className="h-8 text-xs mt-1" value={form.invoice_date} onChange={e => set({ invoice_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Due Date</Label>
                <Input type="date" className="h-8 text-xs mt-1" value={form.due_date} onChange={e => set({ due_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Job Address (if different from client address)</Label>
              <Input className="h-8 text-xs mt-1" value={form.job_address} onChange={e => set({ job_address: e.target.value })} placeholder="Job location" />
            </div>
            <div>
              <Label className="text-xs">Attach Scope of Work</Label>
              <Select value={form.scope_of_work_id || '__none'} onValueChange={v => set({ scope_of_work_id: v === '__none' ? '' : v })}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none" className="text-xs">None</SelectItem>
                  {scopes.filter(s => !form.client_id || s.client_id === form.client_id).map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.client_name} — {(s.service_type || '').replace(/_/g, ' ')} ({s.service_date || 'no date'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">Only scopes belonging to the selected client are shown. This will be included when the invoice is sent.</p>
            </div>
            <div>
              <Label className="text-xs">Service Description</Label>
              <Textarea className="text-xs mt-1 min-h-[70px]" value={form.service_description} onChange={e => set({ service_description: e.target.value })} placeholder="Describe the service(s) performed..." />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea className="text-xs mt-1 min-h-[70px]" value={form.notes} onChange={e => set({ notes: e.target.value })} placeholder="Thank you note, instructions, references..." />
            </div>
          </TabsContent>

          <TabsContent value="items" className="pt-3">
            <LineItemEditor items={form.line_items || []} onChange={items => set({ line_items: items })} />
          </TabsContent>

          <TabsContent value="totals" className="pt-3">
            <TotalsPanel form={form} onChange={set} />
          </TabsContent>

          <TabsContent value="payment" className="space-y-4 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Payment Status</Label>
                <Select value={form.payment_status} onValueChange={v => set({ payment_status: v })}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid" className="text-xs">Unpaid</SelectItem>
                    <SelectItem value="partially_paid" className="text-xs">Partially Paid</SelectItem>
                    <SelectItem value="paid" className="text-xs">Paid</SelectItem>
                    <SelectItem value="overdue" className="text-xs">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select value={form.payment_method} onValueChange={v => set({ payment_method: v })}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash" className="text-xs">Cash</SelectItem>
                    <SelectItem value="bank_transfer" className="text-xs">Bank Transfer</SelectItem>
                    <SelectItem value="payid" className="text-xs">PayID</SelectItem>
                    <SelectItem value="stripe" className="text-xs">Stripe (Needs Setup)</SelectItem>
                    <SelectItem value="other" className="text-xs">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Amount Paid ($)</Label>
                <Input type="number" className="h-8 text-xs mt-1" value={form.amount_paid || ''} min={0}
                  onChange={e => set({ amount_paid: Number(e.target.value) })} placeholder="0.00" />
              </div>
              <div className="flex flex-col justify-end">
                <p className="text-xs text-muted-foreground">Balance Due</p>
                <p className="text-lg font-bold text-red-600">${Math.max(0, liveTotals.total - (Number(form.amount_paid) || 0)).toFixed(2)}</p>
              </div>
            </div>
            {form.payment_method === 'stripe' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-700">
                ⚠️ <strong>Needs API connection / setup required</strong> — Stripe payment links require Stripe integration setup. Contact your developer or use the Stripe dashboard manually.
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-3 border-t mt-2">
          <div className="text-sm font-bold">Total: ${liveTotals.total.toFixed(2)}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={handlePreview} disabled={!form.client_name}>
              <Eye className="w-3.5 h-3.5 mr-1" /> Preview
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="text-xs h-8" onClick={handleSave} disabled={saving || !form.client_name}>
              {saving ? 'Saving...' : invoice ? 'Save Changes' : 'Save Invoice'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}