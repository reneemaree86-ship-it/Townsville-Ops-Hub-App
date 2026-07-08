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
import { Checkbox } from '@/checkbox';
import { Plus, Pencil, Trash2, Search, Phone, Mail, MapPin, AlertTriangle } from 'lucide-react';

const CLIENT_TYPES = ['residential', 'commercial', 'airbnb_shortstay', 'dva', 'ndis', 'other'];
const FUNDING_TYPES = ['private', 'dva', 'ndis', 'unknown'];
const STATUSES = ['active', 'inactive', 'flagged', 'manual_review'];
const FREQUENCIES = ['one_off', 'weekly', 'fortnightly', 'monthly', 'as_needed'];

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-muted text-muted-foreground',
  flagged: 'bg-destructive/10 text-destructive',
  manual_review: 'bg-amber-100 text-amber-700',
};

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  suburb: '',
  client_type: 'residential',
  funding_type: 'private',
  notes: '',
  status: 'active',
  manual_approval_required: false,
  preferred_day: '',
  preferred_time: '',
  frequency: 'one_off',
};

function needsManualApproval(clientType, fundingType) {
  return ['dva', 'ndis'].includes(clientType) || ['dva', 'ndis'].includes(fundingType);
}

function ClientFormModal({ open, onClose, onSave, existing, saving }) {
  const [form, setForm] = useState(existing ? { ...emptyForm, ...existing } : emptyForm);

  useEffect(() => {
    setForm(existing ? { ...emptyForm, ...existing } : emptyForm);
  }, [existing, open]);

  const handleTypeChange = (field, value) => {
    setForm(f => {
      const next = { ...f, [field]: value };
      if (needsManualApproval(next.client_type, next.funding_type)) {
        next.manual_approval_required = true;
      }
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Client' : 'New Client'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input required className="mt-1 text-sm" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Client Type</Label>
              <Select value={form.client_type} onValueChange={v => handleTypeChange('client_type', v)}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Funding Type</Label>
              <Select value={form.funding_type} onValueChange={v => handleTypeChange('funding_type', v)}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FUNDING_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Preferred Day</Label>
              <Input className="mt-1 text-sm" placeholder="e.g. Tuesday" value={form.preferred_day}
                onChange={e => setForm(f => ({ ...f, preferred_day: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Preferred Time</Label>
              <Input className="mt-1 text-sm" placeholder="e.g. Morning" value={form.preferred_time}
                onChange={e => setForm(f => ({ ...f, preferred_time: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Frequency</Label>
              <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Checkbox
              checked={form.manual_approval_required}
              onCheckedChange={v => setForm(f => ({ ...f, manual_approval_required: !!v }))}
            />
            <Label className="text-xs font-normal cursor-pointer" onClick={() => setForm(f => ({ ...f, manual_approval_required: !f.manual_approval_required }))}>
              Requires manual approval (bond clean, NDIS, DVA, hazardous, or hoarder/heavy clean)
            </Label>
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
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const cli = await base44.entities.Client.list('-created_date', 500);
      setClients(cli);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      const payload = { ...data, business_id: activeBusiness?.id || data.business_id };
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
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.suburb?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
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
        <Input className="pl-9 text-sm" placeholder="Search by name, suburb, phone..."
          value={search} onChange={e => setSearch(e.target.value)} />
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
                  <CardTitle className="text-base">{c.name}</CardTitle>
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
                  {c.frequency && c.frequency !== 'one_off' && <Badge variant="outline" className="text-xs">{c.frequency}</Badge>}
                  {c.manual_approval_required && (
                    <Badge className="text-xs bg-amber-100 text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Manual approval
                    </Badge>
                  )}
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
