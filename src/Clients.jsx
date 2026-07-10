import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/card';
import { Button } from '@/button';
import { Input } from '@/input';
import { Label } from '@/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/select';
import { Textarea } from '@/textarea';
import { Badge } from '@/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/dialog';
import { Plus, Pencil, Trash2, Search, Phone, Mail, MapPin } from 'lucide-react';

// Client schema fields: full_name, phone, email, address, suburb,
// client_type (enum: residential, commercial, airbnb, other), notes, status
const CLIENT_TYPES = ['residential', 'commercial', 'airbnb', 'other'];
const STATUSES = ['active', 'inactive'];

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-muted text-muted-foreground',
};

const emptyForm = {
  full_name: '',
  phone: '',
  email: '',
  address: '',
  suburb: '',
  client_type: 'residential',
  notes: '',
  status: 'active',
};

function ClientFormModal({ open, onClose, onSave, existing, saving }) {
  const [form, setForm] = useState(existing ? { ...emptyForm, ...existing } : emptyForm);

  useEffect(() => {
    setForm(existing ? { ...emptyForm, ...existing } : emptyForm);
  }, [existing, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Client' : 'New Client'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs">Full Name *</Label>
            <Input required className="mt-1 text-sm" value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Phone</Label>
              <Input className="mt-1 text-sm" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" className="mt-1 text-sm" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Address</Label>
            <Input className="mt-1 text-sm" value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Suburb</Label>
            <Input className="mt-1 text-sm" value={form.suburb}
              onChange={e => setForm(f => ({ ...f, suburb: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Client Type</Label>
              <Select value={form.client_type} onValueChange={v => setForm(f => ({ ...f, client_type: v }))}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea className="mt-1 text-sm" rows={3} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Client'}</Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Clients() {
  const { activeBusiness } = useOutletContext();
  const bid = activeBusiness?.id;
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (!bid) { setClients([]); setLoading(false); return; }
    setLoading(true);
    try {
      const cli = await base44.entities.Client.filter({ business_id: bid }, '-created_date', 500);
      setClients(cli);
    } catch (e) {
      console.error(e);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [bid]);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      const payload = { ...data, business_id: bid };
      if (editingClient) {
        await base44.entities.Client.update(editingClient.id, payload);
      } else {
        await base44.entities.Client.create(payload);
      }
      setShowForm(false);
      setEditingClient(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this client? This cannot be undone.')) {
      await base44.entities.Client.delete(id);
      await loadData();
    }
  };

  const filtered = clients.filter(c =>
    !search ||
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.suburb?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  // No active business — show empty state instead of crashing
  if (!activeBusiness) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No business selected. Please select or create a business first.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground">{clients.length} total clients</p>
        </div>
        <Button onClick={() => { setEditingClient(null); setShowForm(true); }} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Client
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9 text-sm" placeholder="Search by name, suburb, phone" value={search}
          onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading clients...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {clients.length === 0
              ? 'No clients yet. Add your first client to start creating invoices for them.'
              : 'No clients match your search.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{c.full_name}</CardTitle>
                  <Badge className={STATUS_COLORS[c.status] || ''}>{c.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {c.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3.5 h-3.5" />{c.phone}</div>}
                {c.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-3.5 h-3.5" />{c.email}</div>}
                {(c.address || c.suburb) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />{[c.address, c.suburb].filter(Boolean).join(', ')}
                  </div>
                )}
                <div className="flex flex-wrap gap-1 pt-1">
                  <Badge variant="outline" className="text-xs">{c.client_type}</Badge>
                </div>
                <div className="flex gap-2 pt-2 border-t border-border mt-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditingClient(c); setShowForm(true); }} className="flex items-center gap-1">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)} className="flex items-center gap-1 text-destructive hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ClientFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingClient(null); }}
        onSave={handleSave}
        existing={editingClient}
        saving={saving}
      />
    </div>
  );
}
