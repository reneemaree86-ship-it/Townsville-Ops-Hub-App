import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Edit, Trash2, ArrowRight, Send } from 'lucide-react';
import { generatePDF } from '@/lib/pdfGenerator';
import { openPdfInNewWindow } from '@/lib/openPdf';
import InvoiceForm from './InvoiceForm';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700',
  converted: 'bg-purple-100 text-purple-700',
};

export default function QuoteDetailModal({ quote, onClose, onEdit, onDelete, onStatusChange, onConverted, business, clients }) {
  const [convertingToInvoice, setConvertingToInvoice] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sentOk, setSentOk] = useState(false);
  const qc = useQueryClient();

  const handleSendEmail = async () => {
    if (!quote.client_email) { setSendError('No client email on file for this quote'); return; }
    setSending(true);
    setSendError('');
    setSentOk(false);
    try {
      const itemsList = (quote.line_items || []).map(i => `- ${i.description} x${i.qty}: $${(i.total || 0).toFixed(2)}`).join('\n');
      const body = `Hi ${quote.client_name},\n\nHere is your quote #${quote.quote_number} from Renee's Cleaning Services.\n\n${itemsList ? itemsList + '\n\n' : ''}Total: $${(quote.total || 0).toFixed(2)}\n${quote.expiry_date ? 'Valid until: ' + quote.expiry_date + '\n' : ''}\n${quote.job_notes || ''}\n\nReply to this email to confirm or ask any questions.\n\nThanks,\nRenee's Cleaning Services`;
      await base44.integrations.Core.SendEmail({
        to: quote.client_email,
        subject: `Quote #${quote.quote_number} — Renee's Cleaning Services`,
        body,
        from_name: "Renee's Cleaning Services",
      });
      await base44.entities.Quote.update(quote.id, { status: 'sent' });
      qc.invalidateQueries(['quotes', business.id]);
      setSentOk(true);
    } catch (e) {
      setSendError(e.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const doc = generatePDF({ ...quote, type: 'quote' });
      const clientSlug = (quote.client_name || 'client').toLowerCase().replace(/\s+/g, '-');
      const dateSlug = quote.quote_date || 'date';
      await openPdfInNewWindow(doc, `quote-${clientSlug}-${dateSlug}.pdf`);
    } catch (e) {
      alert('PDF error: ' + e.message);
    }
  };

  const handleConvertToInvoice = () => setConvertingToInvoice(true);

  const handleInvoiceSaved = async () => {
    // Mark quote as converted
    await base44.entities.Quote.update(quote.id, { status: 'converted' });
    qc.invalidateQueries(['quotes', business.id]);
    qc.invalidateQueries(['invoices', business.id]);
    setConvertingToInvoice(false);
    onConverted();
  };

  const items = quote.line_items || [];

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-3">
              <span>Quote #{quote.quote_number}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-medium capitalize ${STATUS_COLORS[quote.status] || ''}`}>
                {quote.status}
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Client & dates */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground font-medium uppercase tracking-wide text-[10px] mb-1">Client</p>
              <p className="font-semibold">{quote.client_name}</p>
              {quote.client_email && <p className="text-muted-foreground">{quote.client_email}</p>}
              {quote.client_phone && <p className="text-muted-foreground">{quote.client_phone}</p>}
              {quote.client_address && <p className="text-muted-foreground">{quote.client_address}</p>}
            </div>
            <div>
              <p className="text-muted-foreground font-medium uppercase tracking-wide text-[10px] mb-1">Dates</p>
              <p>Quoted: {quote.quote_date ? format(new Date(quote.quote_date + 'T12:00:00'), 'd MMM yyyy') : '—'}</p>
              {quote.expiry_date && <p>Expires: {format(new Date(quote.expiry_date + 'T12:00:00'), 'd MMM yyyy')}</p>}
              {quote.job_address && <p className="mt-1">Job: {quote.job_address}</p>}
              {quote.property_condition && <p>Condition: <span className="capitalize">{quote.property_condition.replace('_', ' ')}</span></p>}
            </div>
          </div>

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
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${(quote.subtotal || 0).toFixed(2)}</span></div>
            {(quote.travel_fee || 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Travel Fee</span><span>${quote.travel_fee.toFixed(2)}</span></div>}
            {(quote.discount_amount || 0) > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>-${(quote.discount_amount || 0).toFixed(2)}</span></div>}
            {quote.gst_enabled && <div className="flex justify-between"><span className="text-muted-foreground">GST (10%)</span><span>${(quote.gst_amount || 0).toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-sm border-t pt-1.5"><span>Total</span><span>${(quote.total || 0).toFixed(2)}</span></div>
          </div>

          {quote.job_notes && (
            <div className="text-xs bg-muted/20 rounded p-3">
              <p className="font-semibold mb-1">Notes</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{quote.job_notes}</p>
            </div>
          )}

          {sentOk && <p className="text-xs text-emerald-600">Email sent successfully to {quote.client_email}.</p>}
          {sendError && <p className="text-xs text-red-600">{sendError}</p>}

          {/* Status buttons */}
          <div className="flex flex-wrap gap-1 pt-2">
            <p className="text-xs text-muted-foreground mr-1 self-center">Mark as:</p>
            {['sent', 'accepted', 'declined', 'expired'].map(s => (
              <button key={s} onClick={() => onStatusChange(s)}
                className={`text-[10px] px-2.5 py-1 rounded border capitalize font-medium transition-colors hover:opacity-80 ${quote.status === s ? STATUS_COLORS[s] + ' border-current' : 'bg-muted text-muted-foreground border-border'}`}>
                {s}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t flex-wrap gap-2">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={handleDownloadPDF}>
                <Download className="w-3.5 h-3.5 mr-1" /> Download PDF
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={handleSendEmail} disabled={sending}>
                <Send className="w-3.5 h-3.5 mr-1" /> {sending ? 'Sending...' : 'Send Quote to Client'}
              </Button>
              {quote.status !== 'converted' && (
                <Button size="sm" className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700" onClick={handleConvertToInvoice}>
                  <ArrowRight className="w-3.5 h-3.5 mr-1" /> Convert to Invoice
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-xs h-8" onClick={onEdit}><Edit className="w-3.5 h-3.5 mr-1" />Edit</Button>
              <Button variant="ghost" size="sm" className="text-xs h-8 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={onDelete}>
                <Trash2 className="w-3.5 h-3.5 mr-1" />Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {convertingToInvoice && (
        <InvoiceForm
          business={business}
          clients={clients}
          prefillData={{
            client_id: quote.client_id,
            client_name: quote.client_name,
            client_email: quote.client_email,
            client_phone: quote.client_phone,
            client_address: quote.client_address,
            job_address: quote.job_address,
            line_items: quote.line_items,
            travel_km: quote.travel_km,
            travel_fee: quote.travel_fee,
            discount_amount: quote.discount_amount,
            discount_type: quote.discount_type,
            gst_enabled: quote.gst_enabled,
            subtotal: quote.subtotal,
            gst_amount: quote.gst_amount,
            total: quote.total,
            notes: quote.job_notes,
            quote_id: quote.id,
          }}
          onSaved={handleInvoiceSaved}
          onClose={() => setConvertingToInvoice(false)}
        />
      )}
    </>
  );
}