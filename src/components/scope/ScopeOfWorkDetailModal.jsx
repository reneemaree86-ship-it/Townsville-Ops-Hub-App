import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Edit, Trash2, Send, Copy } from 'lucide-react';
import { generateScopePDF } from '@/lib/scopePdfGenerator';
import { openPdfInNewWindow } from '@/lib/openPdf';

function Section({ title, children }) {
  if (!children) return null;
  return (
    <div className="text-xs bg-muted/20 rounded p-3">
      <p className="font-semibold mb-1">{title}</p>
      {children}
    </div>
  );
}

function BulletList({ items }) {
  if (!items || !items.length) return null;
  return (
    <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
      {items.map((i, idx) => <li key={idx}>{i}</li>)}
    </ul>
  );
}

export default function ScopeOfWorkDetailModal({ scope, clientEmail, onClose, onEdit, onDuplicate, onDelete, onUpdated }) {
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sentOk, setSentOk] = useState(false);

  const handleDownload = async () => {
    try {
      const doc = generateScopePDF(scope);
      const clientSlug = (scope.client_name || 'client').toLowerCase().replace(/\s+/g, '-');
      await openPdfInNewWindow(doc, `scope-of-work-${clientSlug}.pdf`);
    } catch (e) {
      alert('PDF error: ' + e.message);
    }
  };

  const handleResend = async () => {
    if (!clientEmail) { setSendError('No client email on file'); return; }
    setSending(true);
    setSendError('');
    setSentOk(false);
    try {
      const doc = generateScopePDF(scope);
      const blob = doc.output('blob');
      const file = new File([blob], `scope-of-work-${scope.client_name}.pdf`, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const body = `Hi ${scope.client_name},\n\nHere is the Scope of Work for your upcoming ${(scope.service_type || '').replace(/_/g, ' ')} service.\n\nView/Download: ${file_url}\n\nThanks,\nRenee's Cleaning Services`;
      await base44.integrations.Core.SendEmail({
        to: clientEmail,
        subject: `Scope of Work — Renee's Cleaning Services`,
        body,
        from_name: "Renee's Cleaning Services",
      });
      setSentOk(true);
    } catch (e) {
      setSendError(e.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const priceLabel = scope.pricing_type === 'fixed'
    ? `Agreed Price: $${(scope.agreed_price || 0).toFixed(2)}`
    : `Hourly Rate: $${(scope.hourly_rate || 0).toFixed(2)}/hr`;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-3">
            <span>{scope.client_name}</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-medium capitalize bg-muted">{scope.status}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-muted-foreground font-medium uppercase tracking-wide text-[10px] mb-1">Service</p>
            <p className="font-semibold capitalize">{(scope.service_type || '').replace(/_/g, ' ')}</p>
            <p className="text-muted-foreground">{scope.service_address}</p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium uppercase tracking-wide text-[10px] mb-1">Details</p>
            <p>Date: {scope.service_date ? format(new Date(scope.service_date + 'T12:00:00'), 'd MMM yyyy') : '—'}</p>
            <p className="capitalize">Frequency: {(scope.frequency || '').replace('_', ' ')}</p>
            {scope.estimated_hours && <p>Est. Hours: {scope.estimated_hours}</p>}
            <p>{priceLabel}</p>
          </div>
        </div>

        <Section title="Tasks Included"><BulletList items={scope.tasks_included} /></Section>
        <Section title="Optional Add-Ons"><BulletList items={scope.addons_selected} /></Section>
        <Section title="Excluded"><BulletList items={scope.tasks_excluded} /></Section>
        {scope.special_instructions && <Section title="Special Instructions"><p className="text-muted-foreground whitespace-pre-wrap">{scope.special_instructions}</p></Section>}
        {scope.cleaner_notes && <Section title="Cleaner Notes"><p className="text-muted-foreground whitespace-pre-wrap">{scope.cleaner_notes}</p></Section>}
        {scope.terms_conditions && <Section title="Terms & Payment"><p className="text-muted-foreground whitespace-pre-wrap">{scope.terms_conditions}</p></Section>}

        <Section title="Client Acknowledgement">
          {scope.client_acknowledged ? (
            <p className="text-emerald-600 font-medium">Approved by {scope.client_acknowledgement_name || scope.client_name} on {scope.client_acknowledgement_date ? format(new Date(scope.client_acknowledgement_date + 'T12:00:00'), 'd MMM yyyy') : '—'}</p>
          ) : (
            <p className="text-muted-foreground">Not yet acknowledged by client.</p>
          )}
        </Section>

        {sentOk && <p className="text-xs text-emerald-600">Scope of Work sent to {clientEmail}.</p>}
        {sendError && <p className="text-xs text-red-600">{sendError}</p>}

        <div className="flex items-center justify-between pt-3 border-t flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={handleDownload}>
              <Download className="w-3.5 h-3.5 mr-1" /> Download PDF
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={handleResend} disabled={sending}>
              <Send className="w-3.5 h-3.5 mr-1" /> {sending ? 'Sending...' : 'Resend to Client'}
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={onDuplicate}>
              <Copy className="w-3.5 h-3.5 mr-1" /> Duplicate
            </Button>
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