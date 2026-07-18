import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Download, ArrowRight, Edit, Trash2, Eye } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import QuoteForm from '@/components/invoicing/QuoteForm';
import QuoteDetailModal from '@/components/invoicing/QuoteDetailModal';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  sent: 'bg-blue-100 text-blue-700 border-blue-200',
  accepted: 'bg-green-100 text-green-700 border-green-200',
  declined: 'bg-red-100 text-red-700 border-red-200',
  expired: 'bg-orange-100 text-orange-700 border-orange-200',
  converted: 'bg-purple-100 text-purple-700 border-purple-200',
};

export default function Quotes() {
  const { activeBusiness } = useOutletContext();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editQuote, setEditQuote] = useState(null);
  const [viewQuote, setViewQuote] = useState(null);

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes', activeBusiness?.id],
    queryFn: () => activeBusiness ? base44.entities.Quote.filter({ business_id: activeBusiness.id }, '-created_date') : [],
    enabled: !!activeBusiness?.id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', activeBusiness?.id],
    queryFn: () => activeBusiness ? base44.entities.Client.filter({ business_id: activeBusiness.id }) : [],
    enabled: !!activeBusiness?.id,
  });

  const handleSaved = () => {
    qc.invalidateQueries(['quotes', activeBusiness?.id]);
    setShowForm(false);
    setEditQuote(null);
  };

  const handleDelete = async (id) => {
    await base44.entities.Quote.delete(id);
    qc.invalidateQueries(['quotes', activeBusiness?.id]);
    setViewQuote(null);
  };

  const handleStatusChange = async (id, status) => {
    await base44.entities.Quote.update(id, { status });
    qc.invalidateQueries(['quotes', activeBusiness?.id]);
    setViewQuote(q => q ? { ...q, status } : q);
  };

  const totals = {
    all: quotes.length,
    draft: quotes.filter(q => q.status === 'draft').length,
    sent: quotes.filter(q => q.status === 'sent').length,
    accepted: quotes.filter(q => q.status === 'accepted').length,
  };

  return (
    <div>
      <PageHeader
        title="Quotes"
        description={`${totals.all} total — ${totals.accepted} accepted`}
        business={activeBusiness}
        actions={
          <Button size="sm" onClick={() => { setEditQuote(null); setShowForm(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Quote
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Quotes', value: totals.all },
          { label: 'Draft', value: totals.draft },
          { label: 'Sent', value: totals.sent },
          { label: 'Accepted', value: totals.accepted },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-0.5">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quotes list */}
      {quotes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold mb-1">No quotes yet</p>
            <p className="text-xs text-muted-foreground mb-4">Create your first quote to get started</p>
            <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-3.5 h-3.5 mr-1" />New Quote</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {quotes.map(q => (
            <Card key={q.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{q.client_name}</span>
                      <span className="text-xs text-muted-foreground">#{q.quote_number}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-medium capitalize ${STATUS_COLORS[q.status] || ''}`}>
                        {q.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span>Quoted: {q.quote_date ? format(new Date(q.quote_date + 'T12:00:00'), 'd MMM yyyy') : '—'}</span>
                      {q.expiry_date && <span>Expires: {format(new Date(q.expiry_date + 'T12:00:00'), 'd MMM yyyy')}</span>}
                      {q.job_address && <span>📍 {q.job_address}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-base">${(q.total || 0).toFixed(2)}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewQuote(q)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditQuote(q); setShowForm(true); }}>
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
        <QuoteForm
          quote={editQuote}
          business={activeBusiness}
          clients={clients}
          onSaved={handleSaved}
          onClose={() => { setShowForm(false); setEditQuote(null); }}
        />
      )}

      {viewQuote && (
        <QuoteDetailModal
          quote={viewQuote}
          onClose={() => setViewQuote(null)}
          onEdit={() => { setEditQuote(viewQuote); setShowForm(true); setViewQuote(null); }}
          onDelete={() => handleDelete(viewQuote.id)}
          onStatusChange={(status) => handleStatusChange(viewQuote.id, status)}
          onConverted={() => { qc.invalidateQueries(['quotes', activeBusiness?.id]); setViewQuote(null); }}
          business={activeBusiness}
          clients={clients}
        />
      )}
    </div>
  );
}