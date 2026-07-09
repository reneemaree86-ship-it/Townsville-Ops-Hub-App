import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { base44 } from '@/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/card';
import { Button } from '@/button';
import { Input } from '@/input';
import { Label } from '@/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/select';
import { Textarea } from '@/textarea';
import { Badge } from '@/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/dialog';
import { Separator } from '@/separator';
import { Switch } from '@/switch';
import { Plus, Eye, Save, Trash2, Send, FileText, ChevronDown, ChevronUp, X, Download, CheckCircle2, Undo2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import invoiceHeaderImg from '@/assets/invoice-logo-small.png';

const SERVICE_RATES = {
  'Standard Clean': 75,
  'Detailed Refresh Clean': 85,
  'Deep Clean': 95,
  'Office/Commercial': 98,
  'Pressure Washing': 90,
  'Pre-Sale/Rental Inspection Rescue': 92,
  'Airbnb Detailed Refresh & Restocking Clean': 85,
};

// Email sending requires a deployed /api/sendInvoiceEmail backend function.
// Flip this to true once that route is confirmed deployed and working.
const EMAIL_SENDING_ENABLED = false;

const ADD_ONS = [
  { label: 'Security Screen', price: 8 },
  { label: 'Sliding Glass Door', price: 25 },
  { label: 'Oven Clean', price: 85 },
  { label: 'Rangehood Clean', price: 65 },
  { label: 'Fridge Internal', price: 55 },
  { label: 'Fridge/Freezer Combo', price: 85 },
];

const STATUS_COLORS = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
};

const PAYMENT_METHOD_LABELS = {
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  card: 'Card',
  stripe: 'Stripe',
  dva_billing: 'DVA Billing',
  ndis_billing: 'NDIS Billing',
  other: 'Other',
};
const formatPaymentMethod = (v) => PAYMENT_METHOD_LABELS[v] || v;

function InvoicePreviewModal({ invoice, client, onClose, onSendEmail, businessId, sending }) {
  const today = new Date();
  const invoiceDate = today.toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' });
  const handleSendClick = async () => {
    if (!onSendEmail) return;
    if (!client?.email) {
      alert('Client email address is required to send invoice.');
      return;
    }
    try {
      await onSendEmail(invoice.id, client.email, client.name);
    } catch (err) {
      console.error('Send invoice email failed', err);
      alert(`Could not send invoice: ${err?.message || 'Unknown error'}`);
    }
  };
  const dueDate = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Upon receipt';

  const lineItems = invoice.line_items || [];
  const subtotal = parseFloat(invoice.amount || 0);
  const gstEnabled = invoice.gst_enabled !== false;
  const gst = gstEnabled ? parseFloat(invoice.gst_amount || 0) : 0;
  const total = parseFloat(invoice.total_amount || 0);
  const travelFee = parseFloat(invoice.travel_fee || 0);

  const invoiceRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;

      // Always fit on exactly one page - scale down to fit if content is tall,
      // never tile across multiple pages.
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

      const fileName = `Invoice-${invoice.invoice_number || 'draft'}-${client?.name?.replace(/\s+/g, '-') || 'client'}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF generation failed', err);
      alert('Could not generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-4 h-4" /> Invoice Preview
          </DialogTitle>
        </DialogHeader>

        <div ref={invoiceRef} className="bg-card border border-border rounded-lg overflow-hidden font-sans">
          <div className="p-6 space-y-6">
          {/* Header: small logo top-left, invoice meta top-right */}
          <div className="flex justify-between items-start">
            <img
              src={invoiceHeaderImg}
              alt="Renee's Cleaning Services"
              crossOrigin="anonymous"
              className="h-14 w-auto object-contain"
            />
            <div className="text-right">
              <div className="text-lg font-bold text-primary">INVOICE</div>
              <p className="text-sm font-semibold text-foreground mt-1">
                #{invoice.invoice_number || 'DRAFT'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Date: {invoiceDate}</p>
              <p className="text-xs text-muted-foreground">Due: {dueDate}</p>
            </div>
          </div>

          <Separator />

          {/* Bill To */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Bill To</p>
            <p className="text-sm font-semibold text-foreground">{client?.name || 'Client Name'}</p>
            {client?.address && <p className="text-xs text-muted-foreground">{client.address}</p>}
            {client?.suburb && <p className="text-xs text-muted-foreground">{client.suburb}, QLD</p>}
            {client?.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
            {client?.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
          </div>

          <Separator />

          {/* Line Items */}
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase">Description</th>
                  <th className="text-right py-2 text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lineItems.length > 0 ? lineItems.map((item, i) => {
                  const qty = parseFloat(item.quantity) || 1;
                  const unitPrice = item.unit_price !== undefined ? parseFloat(item.unit_price) : parseFloat(item.amount || 0);
                  const lineTotal = item.amount !== undefined ? parseFloat(item.amount) : qty * unitPrice;
                  return (
                    <tr key={i}>
                      <td className="py-2 text-foreground">
                        {qty > 1 ? `${qty} x ${item.description} ($${unitPrice.toFixed(2)} ea)` : item.description}
                      </td>
                      <td className="py-2 text-right text-foreground">${lineTotal.toFixed(2)}</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td className="py-2 text-foreground">{invoice.service_type || 'Cleaning Service'}</td>
                    <td className="py-2 text-right text-foreground">${subtotal.toFixed(2)}</td>
                  </tr>
                )}
                {travelFee > 0 && (
                  <tr>
                    <td className="py-2 text-muted-foreground">Travel Fee</td>
                    <td className="py-2 text-right text-muted-foreground">${travelFee.toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{gstEnabled ? 'Subtotal (excl. GST)' : 'Subtotal'}</span>
              <span className="text-foreground">${subtotal.toFixed(2)}</span>
            </div>
            {gstEnabled && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST (10%)</span>
                <span className="text-foreground">${gst.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-1">
              <span className="text-foreground">{gstEnabled ? 'Total (incl. GST)' : 'Total'}</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          {invoice.payment_method && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Payment Method</p>
                  <p className="text-sm text-foreground">{formatPaymentMethod(invoice.payment_method)}</p>
                </div>
                {invoice.status === 'paid' && (
                  <div className="text-right">
                    <span className="inline-block text-emerald-600 dark:text-emerald-400 border-2 border-emerald-600/60 dark:border-emerald-400/60 rounded-md px-3 py-1 text-sm font-bold uppercase tracking-wide -rotate-6">
                      Paid
                    </span>
                    {invoice.paid_at && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(invoice.paid_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Notes */}
          {invoice.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
              </div>
            </>
          )}

          <div className="text-center text-xs text-muted-foreground pt-2">
            Thank you for your business! 💐
          </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Close Preview</Button>
          {onSendEmail && (
            <Button
              onClick={handleSendClick}
              disabled={sending || !client?.email || !EMAIL_SENDING_ENABLED}
              title={!EMAIL_SENDING_ENABLED ? 'Email sending setup required' : undefined}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Sending...' : (!EMAIL_SENDING_ENABLED ? 'Email sending setup required' : 'Send Invoice to Client')}
            </Button>
          )}
          <Button onClick={handleDownloadPDF} disabled={downloading} className="flex items-center gap-2">
            <Download className="w-4 h-4" /> {downloading ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceForm({ clients, businesses, activeBusiness, onSave, onCancel, existing }) {
  const seedLineItems = () => {
    if (existing?.line_items?.length) return existing.line_items.map((li, i) => ({
      id: `li-${i}`,
      description: li.description || '',
      quantity: li.quantity !== undefined ? li.quantity : 1,
      unit_price: li.unit_price !== undefined ? li.unit_price : (li.amount || 0),
    }));
    if (existing?.service_type) return [{ id: 'li-0', description: existing.service_type, quantity: 1, unit_price: existing.amount || 0 }];
    return [{ id: 'li-0', description: '', quantity: 1, unit_price: '' }];
  };

  const [lineItems, setLineItems] = useState(seedLineItems());
  const [travelFee, setTravelFee] = useState(existing?.travel_fee || 0);
  const [gstEnabled, setGstEnabled] = useState(existing?.gst_enabled !== false);
  const [form, setForm] = useState({
    invoice_number: existing?.invoice_number || `INV-${Date.now().toString().slice(-6)}`,
    client_id: existing?.client_id || '',
    due_date: existing?.due_date || '',
    payment_method: existing?.payment_method || 'bank_transfer',
    status: existing?.status || 'draft',
    notes: existing?.notes || '',
  });
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedClient = clients.find(c => c.id === form.client_id);

  const lineTotal = (li) => (parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0);

  const subtotal = lineItems.reduce((sum, li) => sum + lineTotal(li), 0) + (parseFloat(travelFee) || 0);
  const gst = gstEnabled ? subtotal * 0.1 : 0;
  const total = subtotal + gst;

  const addLineItem = (preset) => {
    const id = `li-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    if (preset) {
      setLineItems(items => [...items, { id, description: preset.description, quantity: 1, unit_price: preset.amount }]);
    } else {
      setLineItems(items => [...items, { id, description: '', quantity: 1, unit_price: '' }]);
    }
  };

  const updateLineItem = (id, field, value) => {
    setLineItems(items => items.map(li => li.id === id ? { ...li, [field]: value } : li));
  };

  const removeLineItem = (id) => {
    setLineItems(items => items.length > 1 ? items.filter(li => li.id !== id) : items);
  };

  const buildCleanedLineItems = () => lineItems
    .filter(li => li.description.trim() || parseFloat(li.unit_price) > 0)
    .map(li => ({
      description: li.description || 'Service',
      quantity: parseFloat(li.quantity) || 1,
      unit_price: parseFloat(li.unit_price) || 0,
      amount: lineTotal(li),
    }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanedLineItems = buildCleanedLineItems();

      const primaryDescription = cleanedLineItems.length === 1
        ? cleanedLineItems[0].description
        : cleanedLineItems.length > 1
          ? 'Multiple Services'
          : '';

      await onSave({
        ...form,
        business_id: activeBusiness?.id,
        service_type: primaryDescription,
        line_items: cleanedLineItems,
        travel_fee: parseFloat(travelFee) || 0,
        amount: subtotal.toFixed(2),
        gst_enabled: gstEnabled,
        gst_amount: gst.toFixed(2),
        total_amount: total.toFixed(2),
      });
    } catch (err) {
      console.error('Save invoice failed', err);
      alert(`Could not save invoice: ${err?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const previewInvoice = {
    ...form,
    line_items: buildCleanedLineItems(),
    travel_fee: parseFloat(travelFee) || 0,
    amount: subtotal.toFixed(2),
    gst_enabled: gstEnabled,
    gst_amount: gst.toFixed(2),
    total_amount: total.toFixed(2),
  };

  return (
    <div className="space-y-5">
      {showPreview && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          client={selectedClient}
          onClose={() => setShowPreview(false)}
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Invoice Number</Label>
          <Input className="mt-1 text-sm" value={form.invoice_number}
            onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Client</Label>
        <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
          <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Select client..." /></SelectTrigger>
          <SelectContent>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name} — {c.suburb || c.address}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Due Date</Label>
        <Input type="date" className="mt-1 text-sm max-w-xs" value={form.due_date}
          onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
      </div>

      {/* Line items editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold">Services & Add-ons</Label>
        </div>

        <div className="hidden md:grid grid-cols-[1fr_70px_100px_90px_32px] gap-2 px-1 mb-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Description</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Qty</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Unit Price</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide text-right">Line Total</span>
          <span />
        </div>

        <div className="space-y-2">
          {lineItems.map((li) => (
            <div key={li.id} className="grid grid-cols-[1fr_70px_100px_90px_32px] gap-2 items-center">
              <Input
                placeholder="Description (e.g. Deep Clean, Oven Clean...)"
                className="text-sm"
                value={li.description}
                onChange={e => updateLineItem(li.id, 'description', e.target.value)}
              />
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="1"
                className="text-sm"
                value={li.quantity}
                onChange={e => updateLineItem(li.id, 'quantity', e.target.value)}
              />
              <Input
                type="number"
                placeholder="$0.00"
                className="text-sm"
                value={li.unit_price}
                onChange={e => updateLineItem(li.id, 'unit_price', e.target.value)}
              />
              <span className="text-sm text-right text-foreground font-medium">
                ${lineTotal(li).toFixed(2)}
              </span>
              <Button
                variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"
                onClick={() => removeLineItem(li.id)}
                disabled={lineItems.length === 1}
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" className="mt-2 flex items-center gap-1.5" onClick={() => addLineItem(null)}>
          <Plus className="w-3.5 h-3.5" /> Add Line
        </Button>

        {/* Quick-add presets */}
        <div className="mt-3 p-3 bg-muted/40 rounded-lg border border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quick add — services</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Object.entries(SERVICE_RATES).map(([label, rate]) => (
              <button
                key={label}
                type="button"
                onClick={() => addLineItem({ description: label, amount: rate })}
                className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-card hover:bg-accent text-foreground transition-colors"
              >
                + {label} (${rate}/hr)
              </button>
            ))}
          </div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quick add — add-ons</p>
          <div className="flex flex-wrap gap-1.5">
            {ADD_ONS.map(addon => (
              <button
                key={addon.label}
                type="button"
                onClick={() => addLineItem({ description: addon.label, amount: addon.price })}
                className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-card hover:bg-accent text-foreground transition-colors"
              >
                + {addon.label} (${addon.price})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Travel Fee $</Label>
          <Input type="number" className="mt-1 text-sm" value={travelFee}
            onChange={e => setTravelFee(e.target.value)} />
          <p className="text-[10px] text-muted-foreground mt-1">First 10km free, then $1/km</p>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">GST (10%) $</Label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{gstEnabled ? 'Applied' : 'Not applied'}</span>
              <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
            </div>
          </div>
          <Input value={gst.toFixed(2)} readOnly className="mt-1 text-sm bg-muted cursor-not-allowed" />
        </div>
      </div>

      <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <span className="text-sm font-semibold text-foreground">{gstEnabled ? 'Total (incl. GST)' : 'Total'}</span>
        <span className="text-lg font-bold text-primary">${total.toFixed(2)}</span>
      </div>

      <div>
        <Label className="text-xs">Payment Method</Label>
        <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
          <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="dva_billing">DVA Billing</SelectItem>
            <SelectItem value="ndis_billing">NDIS Billing</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea className="mt-1 text-sm" rows={3} value={form.notes}
          placeholder="Any additional notes for the client..."
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
        <Button variant="outline" onClick={() => setShowPreview(true)} className="flex items-center gap-2">
          <Eye className="w-4 h-4" /> Preview Invoice
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Invoice'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
export default function Invoices() {
  const { activeBusiness } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [previewClient, setPreviewClient] = useState(null);
  const [sendingInvoiceId, setSendingInvoiceId] = useState(null);

  useEffect(() => {
    loadData();
  }, [activeBusiness]);

  useEffect(() => {
    const jobId = searchParams.get('job_id');
    const clientId = searchParams.get('client_id');
    if (jobId && clientId) {
      setPrefill({ job_id: jobId, client_id: clientId });
      setEditingInvoice(null);
      setShowForm(true);
      searchParams.delete('job_id');
      searchParams.delete('client_id');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [inv, cli, biz] = await Promise.all([
        base44.entities.Invoice.list(),
        base44.entities.Client.list(),
        base44.entities.Business.list(),
      ]);
      setInvoices(inv);
      setClients(cli);
      setBusinesses(biz);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data) => {
    try {
      if (editingInvoice) {
        await base44.entities.Invoice.update(editingInvoice.id, data);
      } else {
        const payload = prefill?.job_id ? { ...data, job_id: prefill.job_id } : data;
        await base44.entities.Invoice.create(payload);
      }
      setShowForm(false);
      setEditingInvoice(null);
      setPrefill(null);
      await loadData();
    } catch (err) {
      console.error('Save invoice failed', err);
      alert(`Could not save invoice: ${err?.message || 'Unknown error'}. Please try again.`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await base44.entities.Invoice.delete(id);
      await loadData();
    } catch (err) {
      console.error('Delete invoice failed', err);
      alert(`Could not delete invoice: ${err?.message || 'Unknown error'}. Please try again.`);
    }
  };

  const handleMarkPaid = async (inv) => {
    try {
      await base44.entities.Invoice.update(inv.id, {
        status: 'paid',
        paid_at: new Date().toISOString(),
      });
      await loadData();
    } catch (err) {
      console.error('Mark paid failed', err);
      alert(`Could not mark invoice as paid: ${err?.message || 'Unknown error'}. Please try again.`);
    }
  };

  const handleMarkUnpaid = async (inv) => {
    if (!window.confirm('Undo paid status for this invoice?')) return;
    try {
      await base44.entities.Invoice.update(inv.id, {
        status: 'sent',
        paid_at: null,
      });
      await loadData();
    } catch (err) {
      console.error('Mark unpaid failed', err);
      alert(`Could not undo paid status: ${err?.message || 'Unknown error'}. Please try again.`);
    }
  };

  const handleSendInvoiceEmail = async (invoiceId, clientEmail, clientName) => {
    if (!EMAIL_SENDING_ENABLED) {
      alert('Email sending setup required — this feature is not connected yet.');
      return;
    }
    setSendingInvoiceId(invoiceId);
    try {
      const response = await fetch('/api/sendInvoiceEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          clientEmail,
          clientName,
          businessId: activeBusiness?.id,
        }),
      });

      if (response.status === 404) {
        alert('Email sending setup required — the email service is not deployed yet.');
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        alert('Email sending setup required — unexpected response from server.');
        return;
      }

      if (data.success) {
        alert(`✅ Invoice sent to ${clientEmail}`);
        setInvoices(invoices.map(inv =>
          inv.id === invoiceId ? { ...inv, status: 'sent', sent_at: new Date().toISOString() } : inv
        ));
        setPreviewInvoice(null);
      } else {
        alert(`❌ Failed to send: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Send invoice email failed', err);
      alert(`❌ Error sending invoice: ${err?.message || 'Unknown error'}`);
    } finally {
      setSendingInvoiceId(null);
    }
  };

  const openPreview = (inv) => {
    const client = clients.find(c => c.id === inv.client_id);
    setPreviewInvoice(inv);
    setPreviewClient(client);
  };

  const totalsByStatus = invoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + parseFloat(inv.total_amount || 0);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      {/* Preview Modal */}
      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          client={previewClient}
          onClose={() => { setPreviewInvoice(null); setPreviewClient(null); }}
          onSendEmail={handleSendInvoiceEmail}
          businessId={activeBusiness?.id}
          sending={sendingInvoiceId === previewInvoice?.id}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Invoices</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Create, manage and preview invoices</p>
        </div>
        {!showForm && (
          <Button onClick={() => { setShowForm(true); setEditingInvoice(null); }}
            className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Invoice
          </Button>
        )}
      </div>

      {/* Payments Status — honest, real state (no fake "connected" claims) */}
      <Card className="border border-border bg-muted/30">
        <CardContent className="p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Online Payments — Setup required</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              There's no online payment collection wired up yet, so invoices can't be paid by card/Stripe
              automatically. The Stripe key on file is only used for the quarterly income/expense report — it
              is not connected to invoice payment processing or webhooks. "Mark as Paid" below is a manual
              record for bank transfer, cash, or card taken in person; it will never be set automatically until
              a real payment provider is connected.
            </p>
          </div>
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 whitespace-nowrap">
            Setup required
          </Badge>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['draft', 'sent', 'paid', 'overdue'].map(status => (
          <Card key={status} className="border border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground capitalize">{status}</p>
              <p className="text-lg font-bold text-foreground mt-1">
                ${(totalsByStatus[status] || 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {invoices.filter(i => i.status === status).length} invoice{invoices.filter(i => i.status === status).length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              {editingInvoice ? 'Edit Invoice' : 'New Invoice'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InvoiceForm
              clients={clients}
              businesses={businesses}
              activeBusiness={activeBusiness}
              existing={editingInvoice || (prefill ? { client_id: prefill.client_id } : null)}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditingInvoice(null); setPrefill(null); }}
            />
          </CardContent>
        </Card>
      )}

      {/* Invoice List */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4" /> All Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No invoices yet. Click <strong>New Invoice</strong> to create your first one.
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map(inv => {
                const client = clients.find(c => c.id === inv.client_id);
                return (
                  <div key={inv.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">#{inv.invoice_number}</span>
                        <Badge className={`text-[10px] px-1.5 ${STATUS_COLORS[inv.status] || ''}`}>
                          {inv.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {client?.name || 'Unknown Client'} · {inv.service_type || '—'} · Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-AU') : '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-sm font-bold text-foreground whitespace-nowrap">
                        ${parseFloat(inv.total_amount || 0).toFixed(2)}
                      </span>
                      {inv.status === 'paid' ? (
                        <Button size="sm" variant="ghost"
                          onClick={() => handleMarkUnpaid(inv)}
                          title={inv.paid_at ? `Paid ${new Date(inv.paid_at).toLocaleDateString('en-AU')} · click to undo` : 'Click to undo'}
                          className="flex items-center gap-1 text-xs h-7 px-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700">
                          <Undo2 className="w-3 h-3" /> Paid
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline"
                          onClick={() => handleMarkPaid(inv)}
                          className="flex items-center gap-1 text-xs h-7 px-2 border-emerald-600/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/10">
                          <CheckCircle2 className="w-3 h-3" /> Mark Paid
                        </Button>
                      )}
                      <Button size="sm" variant="outline"
                        onClick={() => openPreview(inv)}
                        className="flex items-center gap-1 text-xs h-7 px-2">
                        <Eye className="w-3 h-3" /> Preview
                      </Button>
                      <Button size="sm" variant="ghost"
                        onClick={() => { setEditingInvoice(inv); setShowForm(true); }}
                        className="text-xs h-7 px-2">Edit</Button>
                      <Button size="sm" variant="ghost"
                        onClick={() => handleDelete(inv.id)}
                        className="text-xs h-7 px-2 text-destructive hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
