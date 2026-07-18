import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, ClipboardList, Eye, Edit } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import ScopeOfWorkForm from '@/components/scope/ScopeOfWorkForm';
import ScopeOfWorkDetailModal from '@/components/scope/ScopeOfWorkDetailModal';

export default function ScopeOfWork() {
  const { activeBusiness } = useOutletContext();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editScope, setEditScope] = useState(null);
  const [duplicateData, setDuplicateData] = useState(null);
  const [viewScope, setViewScope] = useState(null);

  const { data: scopes = [] } = useQuery({
    queryKey: ['scopes', activeBusiness?.id],
    queryFn: () => activeBusiness ? base44.entities.ScopeOfWork.filter({ business_id: activeBusiness.id }, '-created_date') : [],
    enabled: !!activeBusiness?.id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', activeBusiness?.id],
    queryFn: () => activeBusiness ? base44.entities.Client.filter({ business_id: activeBusiness.id }) : [],
    enabled: !!activeBusiness?.id,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', activeBusiness?.id],
    queryFn: () => activeBusiness ? base44.entities.Booking.filter({ business_id: activeBusiness.id }) : [],
    enabled: !!activeBusiness?.id,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['scopeTemplates', activeBusiness?.id],
    queryFn: () => base44.entities.ScopeTemplate.list(),
  });

  const activeScopes = scopes.filter(s => s.status !== 'archived');

  const handleSaved = () => {
    qc.invalidateQueries(['scopes', activeBusiness?.id]);
    setShowForm(false);
    setEditScope(null);
    setDuplicateData(null);
  };

  const handleDelete = async (id) => {
    await base44.entities.ScopeOfWork.update(id, { status: 'archived' });
    qc.invalidateQueries(['scopes', activeBusiness?.id]);
    setViewScope(null);
  };

  const handleDuplicate = (scope) => {
    const { id, created_date, updated_date, created_by_id, invoice_id, client_acknowledged, client_acknowledgement_name, client_acknowledgement_date, ...rest } = scope;
    setDuplicateData({ ...rest, status: 'draft', service_date: format(new Date(), 'yyyy-MM-dd'), client_acknowledged: false, client_acknowledgement_name: '', client_acknowledgement_date: '' });
    setEditScope(null);
    setShowForm(true);
    setViewScope(null);
  };

  const clientFor = (scope) => clients.find(c => c.id === scope.client_id);

  return (
    <div>
      <PageHeader
        title="Scope of Work"
        description="Create and manage detailed scopes of work for each client and booking"
        business={activeBusiness}
        actions={
          <Button size="sm" onClick={() => { setEditScope(null); setDuplicateData(null); setShowForm(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Scope of Work
          </Button>
        }
      />

      {activeScopes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold mb-1">No scopes of work yet</p>
            <p className="text-xs text-muted-foreground mb-4">Create a scope of work to define exactly what's included for a client</p>
            <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-3.5 h-3.5 mr-1" />New Scope of Work</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {activeScopes.map(s => (
            <Card key={s.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{s.client_name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-muted font-medium capitalize">{s.status}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span className="capitalize">{(s.service_type || '').replace(/_/g, ' ')}</span>
                      {s.service_date && <span>{format(new Date(s.service_date + 'T12:00:00'), 'd MMM yyyy')}</span>}
                      {s.invoice_id && <span>Linked to invoice</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewScope(s)}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditScope(s); setDuplicateData(null); setShowForm(true); }}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <ScopeOfWorkForm
          scope={editScope || duplicateData}
          business={activeBusiness}
          clients={clients}
          bookings={bookings}
          templates={templates}
          onSaved={handleSaved}
          onClose={() => { setShowForm(false); setEditScope(null); setDuplicateData(null); }}
        />
      )}

      {viewScope && (
        <ScopeOfWorkDetailModal
          scope={viewScope}
          clientEmail={clientFor(viewScope)?.email}
          onClose={() => setViewScope(null)}
          onEdit={() => { setEditScope(viewScope); setShowForm(true); setViewScope(null); }}
          onDuplicate={() => handleDuplicate(viewScope)}
          onDelete={() => handleDelete(viewScope.id)}
          onUpdated={() => qc.invalidateQueries(['scopes', activeBusiness?.id])}
        />
      )}
    </div>
  );
}