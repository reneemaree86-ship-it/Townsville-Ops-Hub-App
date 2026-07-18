import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Trash2 } from 'lucide-react';

const SERVICE_TYPES = [
  { value: 'general_residential', label: 'General Residential' },
  { value: 'deep_clean', label: 'Deep Clean' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'office_cleaning', label: 'Office Cleaning' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'hoarder_heavy', label: 'Hoarder/Heavy' },
  { value: 'inspection_rescue', label: 'Inspection Rescue' },
  { value: 'one_off_urgent', label: 'One-off Urgent' },
  { value: 'airbnb_shortstay', label: 'Airbnb/Short Stay' },
  { value: 'window_cleaning', label: 'Window Cleaning' },
  { value: 'pressure_washing', label: 'Pressure Washing' },
  { value: 'move_in', label: 'Move In/Out' },
  { value: 'business_commercial', label: 'Business/Commercial' },
  { value: 'other', label: 'Other' },
];

const EMPTY_FORM = {
  full_name: '',
  phone: '',
  email: '',
  address: '',
  suburb: '',
  preferred_service: '',
  preferred_day: '',
  notes: '',
  status: 'active',
  source: 'manual',
};

export default function ClientModal({ client, business, onSaved, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (client) {
      setForm({
        full_name: client.full_name || '',
        phone: client.phone || '',
        email: client.email || '',
        address: client.address || '',
        suburb: client.suburb || '',
        preferred_service: client.preferred_service || '',
        preferred_day: client.preferred_day || '',
        notes: client.notes || '',
        status: client.status || 'active',
        source: client.source || 'manual',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [client]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.full_name) return;
    setSaving(true);
    const payload = { ...form, business_id: business.id };
    if (client) {
      await base44.entities.Client.update(client.id, payload);
    } else {
      await base44.entities.Client.create(payload);
    }
    setSaving(false);
    onSaved();
  };

  const handleDelete = async () => {
    await base44.entities.Client.delete(client.id);
    qc.invalidateQueries(['clients', business.id]);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">{client ? 'Edit Client' : 'New Client'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Full Name *</Label>
            <Input className="h-8 text-xs mt-1" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Full name" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Phone</Label>
              <Input className="h-8 text-xs mt-1" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0400 000 000" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input className="h-8 text-xs mt-1" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Address</Label>
            <Input className="h-8 text-xs mt-1" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street address" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Suburb</Label>
              <Input className="h-8 text-xs mt-1" value={form.suburb} onChange={e => set('suburb', e.target.value)} placeholder="Suburb" />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active" className="text-xs">Active</SelectItem>
                  <SelectItem value="vip" className="text-xs">VIP</SelectItem>
                  <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Preferred Service</Label>
              <Select value={form.preferred_service} onValueChange={v => set('preferred_service', v)}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(s => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Preferred Day</Label>
              <Select value={form.preferred_day} onValueChange={v => set('preferred_day', v)}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => (
                    <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea className="text-xs mt-1 min-h-[60px]" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Access codes, pets, special requirements..." />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t mt-3">
          {client ? (
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs" onClick={handleDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="text-xs h-8" onClick={handleSave} disabled={saving || !form.full_name}>
              {saving ? 'Saving...' : client ? 'Save Changes' : 'Add Client'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}