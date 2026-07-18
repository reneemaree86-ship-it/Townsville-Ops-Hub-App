import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ClientForm({ open, onClose, onSave, client }) {
  const blank = { name: '', phone: '', email: '', address: '', suburb: '', notes: '', status: 'active' };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(client ? { ...blank, ...client } : blank);
  }, [client, open]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">{client ? 'Edit Client' : 'New Client'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Full Name *</Label>
              <Input className="text-xs h-8" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input className="text-xs h-8" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input type="email" className="text-xs h-8" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Address</Label>
              <Input className="text-xs h-8" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Suburb</Label>
              <Input className="text-xs h-8" value={form.suburb} onChange={e => set('suburb', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea className="text-xs" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Allergies, access codes, preferences..." />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" className="text-xs flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" className="text-xs flex-1" disabled={saving}>
              {saving ? 'Saving...' : client ? 'Update Client' : 'Add Client'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}