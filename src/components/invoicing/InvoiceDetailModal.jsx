import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Edit, Trash2, CheckCircle, Send, ClipboardList } from 'lucide-react';
import { generatePDF } from '@/lib/pdfGenerator';
import { generateScopePDF } from '@/lib/scopePdfGenerator';
import { openPdfInNewWindow } from '@/lib/openPdf';
import { BUSINESS_INFO } from '@/lib/pricingData';

const STATUS_COLORS = {
  unpaid: 'bg-orange-100 text-orange-700',
  partially_paid: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
};

export default function InvoiceDetailModal({ invoice, onClose, onEdit, onDelete, onUpdated, business }) {
  const [markingPaid, setMarkingPaid] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sentOk, setSentOk] = useState(false);
  const [resendingScope, setResendingScope] = useState(false);
  const [scope, setScope] = useState(null);

  useEffect(() => {
    if (invoice.scope_of_work_id) {
      base44.entities.ScopeOfWork.get(invoice.scope_of_work_id).then(setScope).catch(() => setScope(null));
    } else {
      setScope(null);
    }
  }, [invoice.scope_of_work_id]);

  const handleSendEmail = async () => {
    if (!invoice.client_email) { setSendError('No client email on file for this invoice'); return; }
    setSending(true);
    setSendError('');
    setSentOk(false);
    try {
      const itemsList = (invoice.line_items || []).map(i => `- ${i.description} x${i.qty}: $${(i.total || 0).toFixed(2)}`).join('\n');
      const invoiceDoc = generatePDF({ ...invoice, type: 'invoice' });
      const invoiceBlob = invoiceDoc.output('blob');
      const invoiceFile = new File([invoiceBlob], `invoice-${invoice.invoice_number}.pdf`, { type: 'application/pdf' });
      const { file_url: invoiceUrl } = await base44.integrations.Core.UploadFile({ file: invoiceFile });

      let scopeLine = '';
      if (scope) {
        const scopeDoc = generateScopePDF(scope);
        const scopeBlob = scopeDoc.output('blob');
        const scopeFile = new File([scopeBlob], `scope-of-work-${invoice.client_name}.pdf`, { type: 'application/pdf' });
        const { file_url: scopeUrl } = await base44.integrations.Core.UploadFile({ file: scopeFile });
        scopeLine = `\nScope of Work: ${scopeUrl}\n`;
      }

      const body = `Hi ${invoice.client_name},\n\nHere is your invoice #${invoice.invoice_number} from Renee's Cleaning Services.\n\nInvoice PDF: ${invoiceUrl}\n${scopeLine}\n${itemsList ? itemsList + '\n\n' : ''}Total: $${(invoice.total || 0).toFixed(2)}\nBalance Due: $${(invoice.balance_due ?? invoice.total ?? 0).toFixed(2)}\n${invoice.due_date ? 'Due date: ' + invoice.due_date + '\n' : ''}\nPayment Details:\nAccount Name: Renee Butt\nBSB: 034668\nAccount No: 497518\nPayID: 35572084098\n\n${invoice.notes || ''}\n\nThanks,\nRenee's Cleaning Services`;
      await base44.integrations.Core.SendEmail({
        to: invoice.client_email,
        subject: `Invoice #${invoice.invoice_number} — Renee's Cleaning Services`,
        body,
        from_name: "Renee's Cleaning Services",
      });
      setSentOk(true);
    } catch (e) {
      setSendError(e.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleResendScope = async () => {
    if (!scope || !invoice.client_email) return;
    setResendingScope(true);
    setSendError('');
    try {
      const scopeDoc = generateScopePDF(scope);
      const scopeBlob = scopeDoc.output('blob');
      const scopeFile = new File([scopeBlob], `scope-of-work-${invoice.client_name}.pdf`, { type: 'application/pdf' });
      const { file_url: scopeUrl } = await base44.integrations.Core.UploadFile({ file: scopeFile });
      const body = `Hi ${invoice.client_name},\n\nHere is the Scope of Work for your service.\n\nView/Download: ${scopeUrl}\n\nThanks,\nRenee's Cleaning Services`;
      await base44.integrations.Core.SendEmail({
        to: invoice.client_email,
        subject: `Scope of Work — Renee's Cleaning Services`,
        body,
        from_name: "Renee's Cleaning Services",
      });
      setSentOk(true);
    } catch (e) {
      setSendError(e.message || 'Failed to resend scope of work');
    } finally {
      setResendingScope(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const doc = generatePDF({ ...invoice, type: 'invoice' });
      const clientSlug = (invoice.client_name || 'client').toLowerCase().replace(/\s+/g, '-');
      const dateSlug = invoice.invoice_date || 'date';
      await openPdfInNewWindow(doc, `invoice-${clientSlug}-${dateSlug}.pdf`);
    } catch (e) {
      alert('PDF error: ' + e.message);
    }
  };

  const handleDownloadScope = async () => {
    if (!scope) return;
    try {
      const doc = generateScopePDF(scope);
      const clientSlug = (invoice.client_name || 'client').toLowerCase().replace(/\s+/g, '-');
      await openPdfInNewWindow(doc, `scope-of-work-${clientSlug}.pdf`);
    } catch (e) {
      alert('PDF error: ' + e.message);
    }
  };

  const handleMarkPaid = async () => {
    await base44.entities.Invoice.update(invoice.id, {
      payment_status: 'paid',
      amount_paid: invoice.total,
      balance_due: 0,
    });
    onUpdated();
    onClose();
  };

  const handlePartialPayment = async () => {
    const amt = Number(partialAmount);
    if (!amt || amt <= 0) return;
    const newPaid = (invoice.amount_paid || 0) + amt;
    const newBalance = Math.max(0, (invoice.total || 0) - newPaid);
    const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';
    await base44.entities.Invoice.update(invoice.id, {
      payment_status: newStatus,
      amount_paid: newPaid,
      balance_due: newBalance,
    });
    setMarkingPaid(false);
    setPartialAmount('');
    onUpdated();
    onClose();
  };

  const items = invoice.line_items || [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-3">
            <span>Invoice #{invoice.invoice_number}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-medium capitalize ${STATUS_COLORS[invoice.payment_status] || ''}`}>
              {(invoice.payment_status || 'unpaid').replace('_', ' ')}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Client & dates */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-muted-foreground font-medium uppercase tracking-wide text-[10px] mb-1">Bill To</p>
            <p className="font-semibold">{invoice.client_name}</p>
            {invoice.client_email && <p className="text-muted-foreground">{invoice.client_email}</p>}
            {invoice.client_phone && <p className="text-muted-foreground">{invoice.client_phone}</p>}
            {invoice.client_address && <p className="text-muted-foreground">{invoice.client_address}</p>}
          </div>
          <div>
            <p className="text-muted-foreground font-medium uppercase tracking-wide text-[10px] mb-1">Invoice Details</p>
            <p>Issued: {invoice.invoice_date ? format(new Date(invoice.invoice_date + 'T12:00:00'), 'd MMM yyyy') : '—'}</p>
            {invoice.due_date && <p>Due: {format(new Date(invoice.due_date + 'T12:00:00'), 'd MMM yyyy')}</p>}
            {invoice.job_address && <p className="mt-1">Job: {invoice.job_address}</p>}
            {invoice.payment_method && <p className="mt-1 capitalize">Method: {invoice.payment_method.replace('_', ' ')}</p>}
          </div>
        </div>

        {scope && (
          <div className="text-xs bg-primary/5 border border-primary/20 rounded p-3 flex items-center gap-2">
            <ClipboardList className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span>Scope of Work attached — <span className="capitalize">{(scope.service_type || '').replace(/_/g, ' ')}</span></span>
          </div>
        )}

        {invoice.service_description && (
          <div className="text-xs bg-muted/20 rounded p-3">
            <p className="font-semibold mb-1">Service Description</p>
            <p className="text-muted-foreground whitespace-pre-wrap">{invoice.service_description}</p>
          </div>
        )}

        {/* Line items */}
        {items.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Line Items</p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2">Description</th>
                    <th className="text-right px-3 py-2">Qty</th>
                    <th className="text-right px-3 py-2">Rate</th>
                    <th className="text-right px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                      <td className="px-3 py-2">{item.description}</td>
                      <td className="px-3 py-2 text-right">{item.qty}</td>
                      <td className="px-3 py-2 text-right">${(item.unit_price || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-medium">${(item.total || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-xs mt-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${(invoice.subtotal || 0).toFixed(2)}</span></div>
          {(invoice.travel_fee || 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Travel Fee</span><span>${invoice.travel_fee.toFixed(2)}</span></div>}
          {(invoice.discount_amount || 0) > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>-${(invoice.discount_amount || 0).toFixed(2)}</span></div>}
          {invoice.gst_enabled && <div className="flex justify-between"><span className="text-muted-foreground">GST (10%)</span><span>${(invoice.gst_amount || 0).toFixed(2)}</span></div>}
          <div className="flex justify-between font-bold text-sm border-t pt-1.5"><span>Total</span><span>${(invoice.total || 0).toFixed(2)}</span></div>
          {(invoice.amount_paid || 0) > 0 && (
            <div className="flex justify-between text-emerald-600"><span>Paid</span><span>-${(invoice.amount_paid || 0).toFixed(2)}</span></div>
          )}
          {invoice.payment_status !== 'paid' && (
            <div className="flex justify-between font-bold text-red-600 border-t pt-1.5"><span>Balance Due</span><span>${(invoice.balance_due || invoice.total || 0).toFixed(2)}</span></div>
          )}
        </div>

        <div className="text-xs bg-muted/20 rounded p-3">
          <p className="font-semibold mb-1">Payment Details</p>
          <p className="text-muted-foreground">Account Name: {BUSINESS_INFO.account_name}</p>
          <p className="text-muted-foreground">BSB: {BUSINESS_INFO.bsb}</p>
          <p className="text-muted-foreground">Account No: {BUSINESS_INFO.account_number}</p>
          <p className="text-muted-foreground">PayID: {BUSINESS_INFO.payid}</p>
        </div>

        {invoice.notes && (
          <div className="text-xs bg-muted/20 rounded p-3">
            <p className="font-semibold mb-1">Notes</p>
            <p className="text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Record payment */}
        {invoice.payment_status !== 'paid' && (
          <div className="border rounded-lg p-3">
            {!markingPaid ? (
              <div className="flex gap-2">
                <Button size="sm" className="text-xs h-8 bg-green-600 hover:bg-green-700" onClick={handleMarkPaid}>
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark as Fully Paid
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setMarkingPaid(true)}>
                  Record Partial Payment
                </Button>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Amount Received ($)</Label>
                  <Input type="number" className="h-8 text-xs mt-1" value={partialAmount}
                    onChange={e => setPartialAmount(e.target.value)} placeholder="0.00" autoFocus />
                </div>
                <Button size="sm" className="text-xs h-8" onClick={handlePartialPayment}>Save</Button>
                <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setMarkingPaid(false)}>Cancel</Button>
              </div>
            )}
          </div>
        )}

        {sentOk && <p className="text-xs text-emerald-600">Email sent successfully to {invoice.client_email}.</p>}
        {sendError && <p className="text-xs text-red-600">{sendError}</p>}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={handleDownloadPDF}>
              <Download className="w-3.5 h-3.5 mr-1" /> Download Invoice PDF
            </Button>
            {scope && (
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={handleDownloadScope}>
                <ClipboardList className="w-3.5 h-3.5 mr-1" /> Download Scope of Work PDF
              </Button>
            )}
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={handleSendEmail} disabled={sending}>
              <Send className="w-3.5 h-3.5 mr-1" /> {sending ? 'Sending...' : scope ? 'Send Invoice + Scope to Client' : 'Send Invoice to Client'}
            </Button>
            {scope && (
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={handleResendScope} disabled={resendingScope}>
                <Send className="w-3.5 h-3.5 mr-1" /> {resendingScope ? 'Sending...' : 'Resend Scope Only'}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={onEdit}><Edit className="w-3.5 h-3.5 mr-1" />Edit</Button>
            <Button variant="ghost" size="sm" className="text-xs h-8 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />Archive
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}