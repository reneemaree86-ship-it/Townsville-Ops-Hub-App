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
import { Switch } from '@/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/dialog';
import PageHeader from '@/PageHeader';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

const PRICING_MODELS = [
  { value: 'hourly', label: 'Hourly rate' },
  { value: 'fixed_from', label: 'Fixed / "from" price' },
  { value: 'manual_quote_only', label: 'Manual quote only (no public rate)' },
];

const emptyForm = {
  name: '',
  hourly_rate: '',
  minimum_hours: '',
  fixed_starting_price: '',
  pricing_model: 'hourly',
  add_ons: [],
  travel_rules: 'First 10km free, then $1/km',
  notes: '',
  manual_approval_required: false,
  status: 'active',
};

function ServiceFormModal({ open, onClose, onSave, existing, saving }) {
  const [form, setForm] = useState(existing ? { ...emptyForm, ...existing } : emptyForm);
  const [newAddOnName, setNewAddOnName] = useState('');
  const [newAddOnPrice, setNewAddOnPrice] = useState('');

  useEffect(() => {
    setForm(existing ? { ...emptyForm, ...existing, add_ons: existing.add_ons || [] } : emptyForm);
    setNewAddOnName('');
    setNewAddOnPrice('');
  }, [existing, open]);

  const addAddOn = () => {
    if (!newAddOnName.trim()) return;
    setForm(f => ({
      ...f,
      add_ons: [...(f.add_ons || []), { name: newAddOnName.trim(), price: parseFloat(newAddOnPrice) || 0 }],
    }));
    setNewAddOnName('');
    setNewAddOnPrice('');
  };

  const removeAddOn = (idx) => {
    setForm(f => ({ ...f, add_ons: f.add_ons.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      hourly_rate: form.hourly_rate === '' ? null : Number(form.hourly_rate),
      minimum_hours: form.minimum_hours === '' ? null : Number(form.minimum_hours),
      fixed_starting_price: form.fixed_starting_price === '' ? null : Number(form.fixed_starting_price),
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Service' : 'New Service'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs">Service Name *</Label>
            <Input required className="mt-1 text-sm" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div>
            <Label className="text-xs">Pricing Model</Label>
            <Select value={form.pricing_model} onValueChange={v => setForm(f => ({ ...f, pricing_model: v }))}>
              <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRICING_MODELS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {form.pricing_model === 'hourly' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Hourly Rate ($)</Label>
                <Input type="number" step="0.01" className="mt-1 text-sm" value={form.hourly_rate}
                  onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Minimum Hours</Label>
                <Input type="number" step="0.5" className="mt-1 text-sm" value={form.minimum_hours}
                  onChange={e => setForm(f => ({ ...f, minimum_hours: e.target.value }))} />
              </div>
            </div>
          )}

          {form.pricing_model === 'fixed_from' && (
            <div>
              <Label className="text-xs">Fixed Starting Price ($)</Label>
              <Input type="number" step="0.01" className="mt-1 text-sm max-w-[160px]" value={form.fixed_starting_price}
                onChange={e => setForm(f => ({ ...f, fixed_starting_price: e.target.value }))} />
            </div>
          )}

          {form.pricing_model === 'manual_quote_only' && (
            <p className="text-[11px] text-muted-foreground bg-muted p-2 rounded-md">
              No public rate — this service is always quoted manually.
            </p>
          )}

          <div>
            <Label className="text-xs">Add-ons</Label>
            <div className="space-y-1.5 mt-1">
              {(form.add_ons || []).map((a, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-muted rounded-md px-2 py-1.5">
                  <span>{a.name} — ${parseFloat(a.price).toFixed(2)}</span>
                  <button type="button" onClick={() => removeAddOn(i)}><X className="w-3 h-3 text-muted-foreground" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input placeholder="Add-on name" className="h-8 text-xs" value={newAddOnName} onChange={e => setNewAddOnName(e.target.value)} />
              <Input placeholder="$" type="number" step="0.01" className="h-8 text-xs w-20" value={newAddOnPrice} onChange={e => setNewAddOnPrice(e.target.value)} />
              <Button type="button" size="sm" variant="outline" className="h-8" onClick={addAddOn}><Plus className="w-3.5 h-3.5" /></Button>
            </div>
          </div>

          <div>
            <Label className="text-xs">Travel Rules</Label>
            <Input className="mt-1 text-sm" value={form.travel_rules}
              onChange={e => setForm(f => ({ ...f, travel_rules: e.target.value }))} />
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea className="mt-1 text-sm" rows={2} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="flex items-center justify-between p-2 bg-muted rounded-md">
            <Label className="text-xs font-normal cursor-pointer">Always requires manual approval (e.g. DVA/NDIS/hazardous)</Label>
            <Switch checked={form.manual_approval_required} onCheckedChange={v => setForm(f => ({ ...f, manual_approval_required: v }))} />
          </div>

          <div className="flex items-center justify-between p-2 bg-muted rounded-md">
            <Label className="text-xs font-normal cursor-pointer">Active</Label>
            <Switch checked={form.status === 'active'} onCheckedChange={v => setForm(f => ({ ...f, status: v ? 'active' : 'inactive' }))} />
          </div>

          <div className="flex gap-2 pt-2 border-t border-border">
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Service'}</Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function priceLabel(s) {
  if (s.pricing_model === 'hourly') {
    return `$${parseFloat(s.hourly_rate || 0).toFixed(2)}/hr${s.minimum_hours ? ` (${s.minimum_hours}hr min)` : ''}`;
  }
  if (s.pricing_model === 'fixed_from') {
    return `from $${parseFloat(s.fixed_starting_price || 0).toFixed(2)}`;
  }
  return 'Manual quote only';
}

export default function ServicesCatalog() {
  const { activeBusiness } = useOutletContext();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const s = await base44.entities.Service.list('name', 500);
      setServices(s);
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
      if (editing) {
        await base44.entities.Service.update(editing.id, payload);
      } else {
        await base44.entities.Service.create(payload);
      }
      setShowForm(false);
      setEditing(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this service? This cannot be undone.')) {
      await base44.entities.Service.delete(id);
      await loadData();
    }
  };

  const toggleActive = async (svc) => {
    await base44.entities.Service.update(svc.id, { status: svc.status === 'active' ? 'inactive' : 'active' });
    await loadData();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services Catalog"
        description={`${services.length} service${services.length === 1 ? '' : 's'} configured`}
        actions={
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Service
          </Button>
        }
        business={activeBusiness}
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading services...</p>
      ) : services.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No services yet. Add your first service.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {services.map(s => (
            <Card key={s.id} className={s.status === 'inactive' ? 'opacity-60' : ''}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-foreground">{s.name}</span>
                      {s.manual_approval_required && (
                        <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600 dark:text-amber-400">Manual approval</Badge>
                      )}
                      <Badge variant={s.status === 'active' ? 'secondary' : 'outline'} className="text-[10px]">{s.status}</Badge>
                    </div>
                    <p className="text-sm font-semibold text-foreground mt-1">{priceLabel(s)}</p>
                    {s.travel_rules && <p className="text-[11px] text-muted-foreground mt-1">{s.travel_rules}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditing(s); setShowForm(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {(s.add_ons || []).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.add_ons.map((a, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">{a.name} ${parseFloat(a.price).toFixed(0)}</Badge>
                    ))}
                  </div>
                )}
                {s.notes && <p className="text-[11px] text-muted-foreground italic">{s.notes}</p>}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <Label className="text-[11px] font-normal cursor-pointer text-muted-foreground">Active</Label>
                  <Switch checked={s.status === 'active'} onCheckedChange={() => toggleActive(s)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ServiceFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSave={handleSave}
        existing={editing}
        saving={saving}
      />
    </div>
  );
}
