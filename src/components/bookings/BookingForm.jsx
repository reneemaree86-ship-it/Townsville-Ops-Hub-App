import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AddressAutocomplete from '@/components/shared/AddressAutocomplete';

const SERVICE_TYPES = [
  { value: 'general_residential', label: 'General Residential' },
  { value: 'deep_clean', label: 'Deep Clean' },
  { value: 'fortnightly', label: 'Fortnightly Regular' },
  { value: 'weekly', label: 'Weekly Regular' },
  { value: 'move_in', label: 'Move In/Out' },
  { value: 'inspection_rescue', label: 'Inspection Rescue' },
  { value: 'airbnb_shortstay', label: 'Airbnb / Short Stay' },
  { value: 'office_cleaning', label: 'Office Cleaning' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'window_cleaning', label: 'Window Cleaning' },
  { value: 'pressure_washing', label: 'Pressure Washing' },
  { value: 'hoarder_heavy', label: 'Hoarder / Heavy Clean' },
  { value: 'one_off_urgent', label: 'One-Off Urgent' },
  { value: 'other', label: 'Other' },
];

const RECURRING_OPTIONS = [
  { value: 'none', label: 'One-off' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function BookingForm({ open, onClose, onSave, clients, booking, defaultDate }) {
  const blank = {
    client_id: '', client_name: '', client_phone: '', client_address: '',
    service_type: 'general_residential', date: defaultDate || '', start_time: '09:00',
    end_time: '11:00', status: 'scheduled', price: '', notes: '', recurring: 'none',
  };

  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (booking) {
      setForm({ ...blank, ...booking, price: booking.price ?? '' });
    } else {
      setForm({ ...blank, date: defaultDate || '' });
    }
  }, [booking, defaultDate, open]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      set('client_id', clientId);
      set('client_name', client.name);
      set('client_phone', client.phone || '');
      set('client_address', client.address || '');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      ...form,
      price: form.price ? Number(form.price) : undefined,
    });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">{booking ? 'Edit Booking' : 'New Booking'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          {/* Client */}
          <div className="space-y-1">
            <Label className="text-xs">Client</Label>
            <Select value={form.client_id} onValueChange={handleClientSelect}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Select existing client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Client Name *</Label>
              <Input className="text-xs h-8" value={form.client_name} onChange={e => set('client_name', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input className="text-xs h-8" value={form.client_phone} onChange={e => set('client_phone', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Address</Label>
            <AddressAutocomplete
              value={form.client_address}
              onChange={val => set('client_address', val)}
              onSelect={({ formatted_address, suburb }) => {
                set('client_address', formatted_address);
                if (suburb && !form.suburb) set('suburb', suburb);
              }}
              placeholder="Start typing street address..."
              inputClassName="text-xs h-8"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Service Type *</Label>
              <Select value={form.service_type} onValueChange={v => set('service_type', v)}>
                <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(s => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Recurring</Label>
              <Select value={form.recurring} onValueChange={v => set('recurring', v)}>
                <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECURRING_OPTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Date *</Label>
              <Input type="date" className="text-xs h-8" value={form.date} onChange={e => set('date', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Start Time *</Label>
              <Input type="time" className="text-xs h-8" value={form.start_time} onChange={e => set('start_time', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Time</Label>
              <Input type="time" className="text-xs h-8" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Price ($)</Label>
              <Input type="number" className="text-xs h-8" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['scheduled','confirmed','in_progress','completed','cancelled','no_show'].map(s => (
                    <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace('_',' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea className="text-xs" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Access instructions, special requests..." />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" className="text-xs flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" className="text-xs flex-1" disabled={saving}>
              {saving ? 'Saving...' : booking ? 'Update Booking' : 'Add Booking'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}