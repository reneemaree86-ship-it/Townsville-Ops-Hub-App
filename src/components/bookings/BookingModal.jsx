import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
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

const STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

const EMPTY_FORM = {
  client_id: '',
  client_name: '',
  client_phone: '',
  client_email: '',
  client_address: '',
  suburb: '',
  service_type: 'general_residential',
  date: new Date().toISOString().split('T')[0],
  start_time: '09:00',
  end_time: '',
  status: 'scheduled',
  notes: '',
  estimated_value: '',
  recurrence: 'one_off',
};

export default function BookingModal({ booking, business, clients = [], onSaved, onClose, onDelete }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (booking) {
      setForm({
        client_id: booking.client_id || '',
        client_name: booking.client_name || '',
        client_phone: booking.client_phone || '',
        client_email: booking.client_email || '',
        client_address: booking.client_address || '',
        suburb: booking.suburb || '',
        service_type: booking.service_type || 'general_residential',
        date: booking.date || EMPTY_FORM.date,
        start_time: booking.start_time || '09:00',
        end_time: booking.end_time || '',
        status: booking.status || 'scheduled',
        notes: booking.notes || '',
        estimated_value: booking.estimated_value || '',
        recurrence: booking.recurrence || 'one_off',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [booking]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setForm(f => ({
        ...f,
        client_id: clientId,
        client_name: client.full_name,
        client_phone: client.phone || '',
        client_email: client.email || '',
        client_address: client.address || '',
        suburb: client.suburb || '',
        service_type: client.preferred_service || f.service_type,
      }));
    }
  };

  const handleSave = async (repeatWeeks = null) => {
    if (!form.client_name || !form.date) return;
    setSaving(true);
    const basePayload = {
      ...form,
      business_id: business.id,
      estimated_value: form.estimated_value ? Number(form.estimated_value) : 0,
    };

    // Auto-save as a new client if this is a new booking with no existing client selected
    let resolvedClientId = form.client_id;
    if (!booking && !form.client_id && form.client_name) {
      const newClient = await base44.entities.Client.create({
        business_id: business.id,
        full_name: form.client_name,
        phone: form.client_phone || '',
        email: form.client_email || '',
        address: form.client_address || '',
        suburb: form.suburb || '',
        preferred_service: form.service_type || '',
        status: 'active',
        source: 'manual',
      });
      resolvedClientId = newClient.id;
      basePayload.client_id = resolvedClientId;
    }

    if (booking) {
      await base44.entities.Booking.update(booking.id, basePayload);
    } else if (repeatWeeks) {
      // Create one booking per Saturday for the given number of weeks
      const startDate = new Date(form.date + 'T12:00:00');
      const records = Array.from({ length: repeatWeeks }, (_, i) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i * 7);
        return { ...basePayload, date: d.toISOString().split('T')[0], recurrence: 'weekly' };
      });
      await base44.entities.Booking.bulkCreate(records);
    } else {
      await base44.entities.Booking.create(basePayload);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">{booking ? 'Edit Booking' : 'New Booking'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {clients.length > 0 && (
            <div>
              <Label className="text-xs">Select Existing Client</Label>
              <Select value={form.client_id} onValueChange={handleClientSelect}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="Choose a client (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">{c.full_name}{c.suburb ? ` — ${c.suburb}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Client Name *</Label>
              <Input className="h-8 text-xs mt-1" value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input className="h-8 text-xs mt-1" value={form.client_phone} onChange={e => set('client_phone', e.target.value)} placeholder="0400 000 000" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Email</Label>
            <Input type="email" className="h-8 text-xs mt-1" value={form.client_email} onChange={e => set('client_email', e.target.value)} placeholder="client@email.com" />
          </div>

          <div>
            <Label className="text-xs">Address</Label>
            <Input className="h-8 text-xs mt-1" value={form.client_address} onChange={e => set('client_address', e.target.value)} placeholder="Street address" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Suburb</Label>
              <Input className="h-8 text-xs mt-1" value={form.suburb} onChange={e => set('suburb', e.target.value)} placeholder="Suburb" />
            </div>
            <div>
              <Label className="text-xs">Service Type</Label>
              <Select value={form.service_type} onValueChange={v => set('service_type', v)}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(s => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Date *</Label>
              <Input type="date" className="h-8 text-xs mt-1" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Start Time</Label>
              <Input type="time" className="h-8 text-xs mt-1" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">End Time</Label>
              <Input type="time" className="h-8 text-xs mt-1" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Est. Value ($)</Label>
              <Input type="number" className="h-8 text-xs mt-1" value={form.estimated_value} onChange={e => set('estimated_value', e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs">Recurrence</Label>
              <Select value={form.recurrence} onValueChange={v => set('recurrence', v)}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_off" className="text-xs">One-off</SelectItem>
                  <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
                  <SelectItem value="fortnightly" className="text-xs">Fortnightly</SelectItem>
                  <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea className="text-xs mt-1 min-h-[60px]" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Access codes, special instructions, pets..." />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t mt-3">
          {onDelete ? (
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
            </Button>
          ) : <div />}
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={onClose}>Cancel</Button>
            {!booking && (
              <Button variant="outline" size="sm" className="text-xs h-8 text-blue-600 border-blue-300 hover:bg-blue-50"
                onClick={() => handleSave(12)}
                disabled={saving || !form.client_name || !form.date}
                title="Creates this booking every Saturday for 12 weeks">
                {saving ? 'Saving...' : '🔁 Repeat Every Sat (12wks)'}
              </Button>
            )}
            <Button size="sm" className="text-xs h-8" onClick={() => handleSave(null)} disabled={saving || !form.client_name || !form.date}>
              {saving ? 'Saving...' : booking ? 'Save Changes' : 'Book Clean'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}