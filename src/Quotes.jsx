import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/base44Client';
import { Card, CardContent } from '@/card';
import { Button } from '@/button';
import { Input } from '@/input';
import { Label } from '@/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/select';
import { Textarea } from '@/textarea';
import { Checkbox } from '@/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/dialog';
import PageHeader from '@/PageHeader';
import StatusBadge from '@/StatusBadge';
import { Plus, Pencil, Trash2, Send, CheckCircle2, XCircle, ArrowRightCircle, FileText } from 'lucide-react';

const SERVICE_TYPES = [
  { value: 'standard_cleaning', label: 'Standard Cleaning', rate: 75 },
  { value: 'detailed_refresh', label: 'Detailed Refresh Clean', rate: 85 },
  { value: 'deep_clean', label: 'Deep Clean', rate: 95 },
  { value: 'office_commercial', label: 'Office/Commercial', rate: 98 },
  { value: 'pressure_washing', label: 'Pressure Washing', rate: 90 },
  { value: 'pre_sale_inspection', label: 'Pre-Sale/Rental Inspection Rescue', rate: 92 },
  { value: 'airbnb_shortstay', label: 'Airbnb / Short-Stay Clean', rate: null },
  { value: 'windows_screens', label: 'Windows & Screens', rate: null },
  { value: 'other', label: 'Other', rate: null },
];

const ADD_ONS = [
  { key: 'security_screen', label: 'Security Screen (ea)', price: 8 },
  { key: 'sliding_door', label: 'Sliding Glass Door (ea)', price: 25 },
  { key: 'oven', label: 'Oven Clean', price: 85 },
  { key: 'rangehood', label: 'Rangehood Clean', price: 65 },
  { key: 'fridge_internal', label: 'Fridge Internal', price: 55 },
  { key: 'fridge_freezer_combo', label: 'Fridge/Freezer Combo', price: 85 },
];

const QUOTE_STATUS_LABEL = (s) => (s || '').replace(/_/g, ' ');

function serviceLabel(value) {
  return SERVICE_TYPES.find(s => s.value === value)?.label || value || '—';
}

function computeRanges(form) {
  const rate = parseFloat(form.hourly_rate) || 0;
  const hMin = parseFloat(form.estimated_hours_min) || 0;
  const hMax = parseFloat(form.estimated_hours_max) || 0;
  const travel = parseFloat(form.travel_fee) || 0;
  const addOnsTotal = (form.add_ons || []).reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0);
  return {
    total_range_min: +(rate * hMin + travel + addOnsTotal).toFixed(2),
    total_range_max: +(rate * hMax + travel + addOnsTotal).toFixed(2),
  };
}

const emptyForm = {
  lead_id: '',
  client_id: '',
  service_type: 'standard_cleaning',
  hourly_rate: 75,
  estimated_hours_min: 2,
  estimated_hours_max: 3,
  add_ons: [],
  travel_fee: 0,
  status: 'draft',
  photos_received: false,
  scope_confirmed: false,
  notes: '',
  caveat: '',
  expires_at: '',
};

function QuoteFormModal({ open, onClose, onSave, existing, saving, clients, leads }) {
  const [sourceType, setSourceType] = useState('client');
  const [form, setForm] = useState(existing ? { ...emptyForm, ...existing } : emptyForm);

  useEffect(() => {
    const initial = existing ? { ...emptyForm, ...existing, add_ons: existing.add_ons || [] } : emptyForm;
    setForm(initial);
    setSourceType(initial.lead_id && !initial.client_id ? 'lead' : 'client');
  }, [existing, open]);

  const handleServiceChange = (value) => {
    const svc = SERVICE_TYPES.find(s => s.value === value);
    setForm(f => ({ ...f, service_type: value, hourly_rate: svc?.rate ?? f.hourly_rate }));
  };

  const toggleAddOn = (addon) => {
    setForm(f => {
      const exists = (f.add_ons || []).some(a => a.key === addon.key);
      const add_ons = exists
        ? f.add_ons.filter(a => a.key !== addon.key)
        : [...(f.add_ons || []), { key: addon.key, label: addon.label, price: addon.price }];
      return { ...f, add_ons };
    });
  };

  const { total_range_min, total_range_max } = computeRanges(form);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      lead_id: sourceType === 'lead' ? form.lead_id : '',
      client_id: sourceType === 'client' ? form.client_id : '',
      hourly_rate: parseFloat(form.hourly_rate) || 0,
      estimated_hours_min: parseFloat(form.estimated_hours_min) || 0,
      estimated_hours_max: parseFloat(form.estimated_hours_max) || 0,
      travel_fee: parseFloat(form.travel_fee) || 0,
      total_range_min,
      total_range_max,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Quote' : 'New Quote'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs">Quote for</Label>
            <div className="flex gap-2 mt-1">
              <Button type="button" size="sm" variant={sourceType === 'client' ? 'default' : 'outline'} onClick={() => setSourceType('client')}>Existing Client</Button>
              <Button type="button" size="sm" variant={sourceType === 'lead' ? 'default' : 'outline'} onClick={() => setSourceType('lead')}>A Lead (not yet a client)</Button>
            </div>
          </div>
          {sourceType === 'client' ? (
            <div>
              <Label className="text-xs">Client *</Label>
              <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Select a client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.suburb ? `— ${c.suburb}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label className="text-xs">Lead *</Label>
              <Select value={form.lead_id} onValueChange={v => setForm(f => ({ ...f, lead_id: v }))}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Select a lead" /></SelectTrigger>
                <SelectContent>
                  {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.name} {l.suburb ? `— ${l.suburb}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">Convert this lead to a Client first if the quote is approved and needs to become a job.</p>
            </div>
          )}
          <div>
            <Label className="text-xs">Service Type</Label>
            <Select value={form.service_type} onValueChange={handleServiceChange}>
              <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}{s.rate ? ` — $${s.rate}/hr` : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Hourly Rate ($)</Label>
              <Input type="number" step="0.01" className="mt-1 text-sm" value={form.hourly_rate}
                onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Est. Hours Min</Label>
              <Input type="number" step="0.5" className="mt-1 text-sm" value={form.estimated_hours_min}
                onChange={e => setForm(f => ({ ...f, estimated_hours_min: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Est. Hours Max</Label>
              <Input type="number" step="0.5" className="mt-1 text-sm" value={form.estimated_hours_max}
                onChange={e => setForm(f => ({ ...f, estimated_hours_max: e.target.value }))} />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground -mt-2">2hr minimum applies to Standard Cleaning and Pressure Washing.</p>
          <div>
            <Label className="text-xs">Add-ons</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {ADD_ONS.map(a => (
                <label key={a.key} className="flex items-center gap-2 text-xs p-2 border border-border rounded-md cursor-pointer">
                  <Checkbox checked={(form.add_ons || []).some(x => x.key === a.key)} onCheckedChange={() => toggleAddOn(a)} />
                  {a.label} (${a.price})
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Travel Fee ($)</Label>
            <Input type="number" step="0.01" className="mt-1 text-sm max-w-[140px]" value={form.travel_fee}
              onChange={e => setForm(f => ({ ...f, travel_fee: e.target.value }))} />
            <p className="text-[10px] text-muted-foreground mt-1">First 10km free, then $1/km.</p>
          </div>
          <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
            <span className="text-xs font-medium">Estimated Total Range</span>
            <span className="text-sm font-bold text-foreground">${total_range_min.toFixed(2)} – ${total_range_max.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <Checkbox checked={form.photos_received} onCheckedChange={v => setForm(f => ({ ...f, photos_received: !!v }))} />
              <Label className="text-xs font-normal cursor-pointer">Photos received</Label>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <Checkbox checked={form.scope_confirmed} onCheckedChange={v => setForm(f => ({ ...f, scope_confirmed: !!v }))} />
              <Label className="text-xs font-normal cursor-pointer">Scope confirmed</Label>
            </div>
          </div>
          <div>
            <Label className="text-xs">Quote Expires</Label>
            <Input type="date" className="mt-1 text-sm max-w-xs" value={form.expires_at ? String(form.expires_at).slice(0, 10) : ''}
              onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Caveat (e.g. price may change if property condition differs)</Label>
            <Textarea className="mt-1 text-sm" rows={2} value={form.caveat}
              onChange={e => setForm(f => ({ ...f, caveat: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea className="mt-1 text-sm" rows={2} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button type="submit" disabled={saving || (sourceType === 'client' ? !form.client_id : !form.lead_id)}>
              {saving ? 'Saving...' : 'Save Quote'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Quotes() {
  const { activeBusiness } = useOutletContext();
  const [quotes, setQuotes] = useState([]);
  const [clients, setClients] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [q, c, l] = await Promise.all([
        base44.entities.Quote.list('-created_date', 500),
        base44.entities.Client.list('-created_date', 500),
        base44.entities.Lead.list('-created_date', 200),
      ]);
      setQuotes(q);
      setClients(c);
      setLeads(l);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const clientName = (id) => clients.find(c => c.id === id)?.name;
  const leadName = (id) => leads.find(l => l.id === id)?.name;

  const handleSave = async (data) => {
    setSaving(true);
    try {
      const payload = { ...data, business_id: activeBusiness?.id || data.business_id };
      if (editingQuote) {
        await base44.entities.Quote.update(editingQuote.id, payload);
      } else {
        await base44.entities.Quote.create(payload);
      }
      setShowForm(false);
      setEditingQuote(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this quote? This cannot be undone.')) {
      await base44.entities.Quote.delete(id);
      await loadData();
    }
  };

  const setStatus = async (quote, status) => {
    const patch = { status };
    if (status === 'sent') patch.sent_at = new Date().toISOString();
    if (status === 'approved') patch.approved_at = new Date().toISOString();
    await base44.entities.Quote.update(quote.id, patch);
    await loadData();
  };

  const handleConvertToJob = async (quote) => {
    if (!quote.client_id) {
      alert('This quote is linked to a lead, not a client yet. Edit the quote and select an existing client (create one on the Clients page first if needed) before converting to a job.');
      return;
    }
    setConverting(quote.id);
    try {
      const client = clients.find(c => c.id === quote.client_id);
      await base44.entities.Job.create({
        business_id: quote.business_id || activeBusiness?.id,
        client_id: quote.client_id,
        service_type: quote.service_type,
        address: client?.address || '',
        suburb: client?.suburb || '',
        status: 'draft',
        quoted_range_min: quote.total_range_min,
        quoted_range_max: quote.total_range_max,
        add_ons: quote.add_ons || [],
        travel_fee: quote.travel_fee || 0,
        notes: quote.notes || '',
        scope_confirmed: quote.scope_confirmed || false,
        quote_id: quote.id,
      });
      await base44.entities.Quote.update(quote.id, { status: 'converted_to_job' });
      await loadData();
      alert('Job created — go to the Jobs page to schedule it and assign staff.');
    } finally {
      setConverting(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotes"
        description={`${quotes.length} total quotes`}
        actions={
          <Button onClick={() => { setEditingQuote(null); setShowForm(true); }} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Quote
          </Button>
        }
        business={activeBusiness}
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading quotes...</p>
      ) : quotes.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No quotes yet. Create one to get started.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {quotes.map(q => (
            <Card key={q.id}>
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">
                      {q.client_id ? clientName(q.client_id) : (q.lead_id ? `${leadName(q.lead_id)} (lead)` : 'Unassigned')}
                    </span>
                    <StatusBadge status={q.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{serviceLabel(q.service_type)}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">
                    ${parseFloat(q.total_range_min || 0).toFixed(2)} – ${parseFloat(q.total_range_max || 0).toFixed(2)}
                  </p>
                  {q.expires_at && <p className="text-[10px] text-muted-foreground mt-1">Expires {new Date(q.expires_at).toLocaleDateString('en-AU')}</p>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {q.status === 'draft' && (
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setStatus(q, 'sent')}>
                      <Send className="w-3 h-3 mr-1" /> Send
                    </Button>
                  )}
                  {q.status === 'sent' && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setStatus(q, 'approved')}>
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setStatus(q, 'rejected')}>
                        <XCircle className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                  {q.status === 'approved' && (
                    <Button size="sm" className="h-7 text-[11px]" disabled={converting === q.id} onClick={() => handleConvertToJob(q)}>
                      <ArrowRightCircle className="w-3 h-3 mr-1" /> {converting === q.id ? 'Converting...' : 'Convert to Job'}
                    </Button>
                  )}
                  {q.status === 'converted_to_job' && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> Converted</span>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingQuote(q); setShowForm(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(q.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <QuoteFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingQuote(null); }}
        onSave={handleSave}
        existing={editingQuote}
        saving={saving}
        clients={clients}
        leads={leads}
      />
    </div>
  );
}
