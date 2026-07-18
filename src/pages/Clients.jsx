import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Phone, MapPin, User, Mail, Calendar } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import ClientModal from '@/components/bookings/ClientModal';

export default function Clients() {
  const { activeBusiness } = useOutletContext();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

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

  const today = format(new Date(), 'yyyy-MM-dd');

  const getClientStats = (clientId) => {
    const cb = bookings.filter(b => b.client_id === clientId);
    const next = cb
      .filter(b => b.date >= today && b.status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    return { total: cb.length, next };
  };

  const filteredClients = clients.filter(c => {
    const matchSearch = !search ||
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.suburb?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSaved = () => {
    qc.invalidateQueries(['clients', activeBusiness?.id]);
    setShowModal(false);
    setEditClient(null);
  };

  const openEdit = (client) => {
    setEditClient(client);
    setShowModal(true);
  };

  const openNew = () => {
    setEditClient(null);
    setShowModal(true);
  };

  return (
    <div>
      <PageHeader
        title="Clients"
        description={`${clients.length} client${clients.length !== 1 ? 's' : ''} on file`}
        business={activeBusiness}
        actions={
          <Button size="sm" onClick={openNew}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Client
          </Button>
        }
      />

      {/* Search + filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            className="pl-9 h-9 text-xs"
            placeholder="Search by name, suburb, phone, or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {['all', 'active', 'vip', 'inactive'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors capitalize ${
                statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
        <span><span className="font-semibold text-foreground">{clients.filter(c => c.status === 'active').length}</span> active</span>
        <span><span className="font-semibold text-yellow-600">{clients.filter(c => c.status === 'vip').length}</span> VIP</span>
        <span><span className="font-semibold text-foreground">{clients.filter(c => c.status === 'inactive').length}</span> inactive</span>
      </div>

      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <User className="w-9 h-9 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold mb-1">{search ? 'No clients match your search' : 'No clients yet'}</p>
            <p className="text-xs text-muted-foreground mb-4">{!search && 'Add your first client to start tracking bookings'}</p>
            {!search && <Button size="sm" onClick={openNew}><Plus className="w-3.5 h-3.5 mr-1" />Add First Client</Button>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredClients.map(client => {
            const { total, next } = getClientStats(client.id);
            return (
              <Card key={client.id} onClick={() => openEdit(client)}
                className="hover:border-primary/30 cursor-pointer transition-colors hover:shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{client.full_name}</p>
                      {client.preferred_service && (
                        <Badge variant="outline" className="text-[10px] mt-0.5 capitalize">
                          {client.preferred_service.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </div>
                    <StatusBadge status={client.status || 'active'} />
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    {client.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {(client.address || client.suburb) && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{[client.address, client.suburb].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {client.preferred_day && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span>Prefers {client.preferred_day}s</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{total} booking{total !== 1 ? 's' : ''}</span>
                    {next ? (
                      <span className="text-xs font-medium text-primary">
                        Next: {format(new Date(next.date + 'T12:00:00'), 'd MMM')}
                        {next.start_time ? ` at ${next.start_time}` : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No upcoming</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showModal && (
        <ClientModal
          client={editClient}
          business={activeBusiness}
          onSaved={handleSaved}
          onClose={() => { setShowModal(false); setEditClient(null); }}
        />
      )}
    </div>
  );
}