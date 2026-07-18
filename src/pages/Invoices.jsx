import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, isAfter, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Receipt, Eye, Edit } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import InvoiceForm from '@/components/invoicing/InvoiceForm';
import InvoiceDetailModal from '@/components/invoicing/InvoiceDetailModal';

const STATUS_COLORS = {
  unpaid: 'bg-orange-100 text-orange-700 border-orange-200',
  partially_paid: 'bg-blue-100 text-blue-700 border-blue-200',
  paid: 'bg-green-100 text-green-700 border-green-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
};

export default function Invoices() {
  const { activeBusiness } = useOutletContext();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', activeBusiness?.id],
    queryFn: () => activeBusiness ? base44.entities.Invoice.filter({ business_id: activeBusiness.id }, '-created_date') : [],
    enabled: !!activeBusiness?.id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', activeBusiness?.id],
    queryFn: () => activeBusiness ? base44.entities.Client.filter({ business_id: activeBusiness.id }) : [],
    enabled: !!activeBusiness?.id,
  });

  // Auto-mark overdue
  const activeInvoices = invoices.filter(i => i.status !== 'archived').map(inv => {
    if (inv.payment_status === 'unpaid' && inv.due_date && isAfter(new Date(), parseISO(inv.due_date))) {
      return { ...inv, payment_status: 'overdue' };
    }
    return inv;
  });

  const handleSaved = () => {
    qc.invalidateQueries(['invoices', activeBusiness?.id]);
    setShowForm(false);
    setEditInvoice(null);
  };

  const handleDelete = async (id) => {
    await base44.entities.Invoice.update(id, { status: 'archived' });
    qc.invalidateQueries(['invoices', activeBusiness?.id]);
    setViewInvoice(null);
  };

  const totals = {
    all: activeInvoices.length,
    unpaid: activeInvoices.filter(i => i.payment_status === 'unpaid').length,
    overdue: activeInvoices.filter(i => i.payment_status === 'overdue').length,
    paid: activeInvoices.filter(i => i.payment_status === 'paid').length,
    revenue: activeInvoices.filter(i => i.payment_status === 'paid').reduce((s, i) => s + (i.total || 0), 0),
    outstanding: activeInvoices.filter(i => i.payment_status !== 'paid').reduce((s, i) => s + (i.balance_due || i.total || 0), 0),
  };

  return (
    <div>
      <PageHeader
        title="Invoices"
        description={`$${totals.revenue.toFixed(2)} collected · $${totals.outstanding.toFixed(2)} outstanding`}
        business={activeBusiness}
        actions={
          <Button size="sm" onClick={() => { setEditInvoice(null); setShowForm(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Invoice
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Invoices', value: totals.all },
          { label: 'Unpaid', value: totals.unpaid, cls: 'text-orange-600' },
          { label: 'Overdue', value: totals.overdue, cls: 'text-red-600' },
          { label: 'Paid', value: totals.paid, cls: 'text-green-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${s.cls || ''}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeInvoices.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold mb-1">No invoices yet</p>
            <p className="text-xs text-muted-foreground mb-4">Create your first invoice to start tracking payments</p>
            <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-3.5 h-3.5 mr-1" />New Invoice</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {activeInvoices.map(inv => (
            <Card key={inv.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{inv.client_name}</span>
                      <span className="text-xs text-muted-foreground">#{inv.invoice_number}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-medium capitalize ${STATUS_COLORS[inv.payment_status] || ''}`}>
                        {(inv.payment_status || 'unpaid').replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span>Issued: {inv.invoice_date ? format(new Date(inv.invoice_date + 'T12:00:00'), 'd MMM yyyy') : '—'}</span>
                      {inv.due_date && <span>Due: {format(new Date(inv.due_date + 'T12:00:00'), 'd MMM yyyy')}</span>}
                      <span className="capitalize">{(inv.payment_method || '').replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-base">${(inv.total || 0).toFixed(2)}</p>
                      {inv.payment_status !== 'paid' && inv.balance_due > 0 && (
                        <p className="text-[10px] text-red-500">Due: ${(inv.balance_due || 0).toFixed(2)}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewInvoice(inv)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditInvoice(inv); setShowForm(true); }}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <InvoiceForm
          invoice={editInvoice}
          business={activeBusiness}
          clients={clients}
          onSaved={handleSaved}
          onClose={() => { setShowForm(false); setEditInvoice(null); }}
        />
      )}

      {viewInvoice && (
        <InvoiceDetailModal
          invoice={viewInvoice}
          onClose={() => setViewInvoice(null)}
          onEdit={() => { setEditInvoice(viewInvoice); setShowForm(true); setViewInvoice(null); }}
          onDelete={() => handleDelete(viewInvoice.id)}
          onUpdated={() => { qc.invalidateQueries(['invoices', activeBusiness?.id]); }}
          business={activeBusiness}
        />
      )}
    </div>
  );
}