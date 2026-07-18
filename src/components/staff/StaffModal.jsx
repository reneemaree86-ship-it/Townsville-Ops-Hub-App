import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Trash2 } from 'lucide-react';

const EMPTY_FORM = { full_name: '', phone: '', role: '', status: 'active', notes: '' };

export default function StaffModal({ staff, business, onSaved, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (staff) {
      setForm({
        full_name: staff.full_name || '',
        phone: staff.phone || '',
        role: staff.role || '',
        status: staff.status || 'active',
        notes: staff.notes || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError('');
  }, [staff]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.full_name) return;
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, business_id: business.id };
      if (staff) {
        await base44.entities.Staff.update(staff.id, payload);
      } else {
        await base44.entities.Staff.create(payload);
      }
      onSaved();
    } catch (e) {
      setError(e.message || 'Failed to save staff member');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setError('');
    try {
      await base44.entities.Staff.delete(staff.id);
      onSaved();
    } catch (e) {
      setError(e.message || 'Failed to delete staff member');
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">{staff ? 'Edit Staff Member' : 'New Staff Member'}</DialogTitle>
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
              <Label className="text-xs">Role</Label>
              <Input className="h-8 text-xs mt-1" value={form.role} onChange={e => set('role', e.target.value)} placeholder="e.g. Cleaner, Supervisor" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active" className="text-xs">Active</SelectItem>
                <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea className="text-xs mt-1 min-h-[60px]" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Availability, skills, etc." />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-between pt-3 border-t mt-3">
          {staff ? (
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs" onClick={handleDelete} disabled={saving}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="text-xs h-8" onClick={handleSave} disabled={saving || !form.full_name}>
              {saving ? 'Saving...' : staff ? 'Save Changes' : 'Add Staff'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}