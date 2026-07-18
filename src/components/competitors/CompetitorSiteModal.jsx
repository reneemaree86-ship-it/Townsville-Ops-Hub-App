import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2 } from 'lucide-react';

const EMPTY_FORM = { business_name: '', website_url: '', notes: '' };

export default function CompetitorSiteModal({ competitor, business, onSaved, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (competitor) {
      setForm({
        business_name: competitor.business_name || '',
        website_url: competitor.website_url || '',
        notes: competitor.notes || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError('');
  }, [competitor]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.business_name) return;
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, business_id: business.id };
      if (competitor) {
        await base44.entities.CompetitorSite.update(competitor.id, payload);
      } else {
        await base44.entities.CompetitorSite.create(payload);
      }
      onSaved();
    } catch (e) {
      setError(e.message || 'Failed to save competitor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setError('');
    try {
      await base44.entities.CompetitorSite.delete(competitor.id);
      onSaved();
    } catch (e) {
      setError(e.message || 'Failed to delete competitor');
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">{competitor ? 'Edit Competitor' : 'New Competitor'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Business Name *</Label>
            <Input className="h-8 text-xs mt-1" value={form.business_name} onChange={e => set('business_name', e.target.value)} placeholder="Competitor business name" />
          </div>

          <div>
            <Label className="text-xs">Website URL</Label>
            <Input className="h-8 text-xs mt-1" value={form.website_url} onChange={e => set('website_url', e.target.value)} placeholder="https://example.com" />
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea className="text-xs mt-1 min-h-[60px]" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Pricing, services, strengths/weaknesses..." />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-between pt-3 border-t mt-3">
          {competitor ? (
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs" onClick={handleDelete} disabled={saving}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="text-xs h-8" onClick={handleSave} disabled={saving || !form.business_name}>
              {saving ? 'Saving...' : competitor ? 'Save Changes' : 'Add Competitor'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}