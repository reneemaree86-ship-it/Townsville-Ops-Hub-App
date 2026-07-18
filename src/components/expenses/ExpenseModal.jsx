import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Paperclip, Loader2 } from 'lucide-react';

const CATEGORIES = [
  { value: 'supplies', label: 'Supplies' },
  { value: 'fuel_travel', label: 'Fuel / Travel' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'wages', label: 'Wages' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'software_subscriptions', label: 'Software / Subscriptions' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'other', label: 'Other' },
];

const todayStr = () => new Date().toISOString().split('T')[0];

const EMPTY_FORM = { date: todayStr(), category: 'supplies', description: '', amount: '', receipt_url: '' };

export default function ExpenseModal({ expense, business, onSaved, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (expense) {
      setForm({
        date: expense.date || todayStr(),
        category: expense.category || 'supplies',
        description: expense.description || '',
        amount: expense.amount ?? '',
        receipt_url: expense.receipt_url || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError('');
  }, [expense]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('receipt_url', file_url);
    } catch (e2) {
      setError('Failed to upload receipt');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.date || !form.amount) return;
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, amount: parseFloat(form.amount) || 0, business_id: business.id };
      if (expense) {
        await base44.entities.Expense.update(expense.id, payload);
      } else {
        await base44.entities.Expense.create(payload);
      }
      onSaved();
    } catch (e) {
      setError(e.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setError('');
    try {
      await base44.entities.Expense.delete(expense.id);
      onSaved();
    } catch (e) {
      setError(e.message || 'Failed to delete expense');
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">{expense ? 'Edit Expense' : 'New Expense'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date *</Label>
              <Input type="date" className="h-8 text-xs mt-1" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Amount ($) *</Label>
              <Input type="number" step="0.01" className="h-8 text-xs mt-1" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Category</Label>
            <Select value={form.category} onValueChange={v => set('category', v)}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Input className="h-8 text-xs mt-1" value={form.description} onChange={e => set('description', e.target.value)} placeholder="What was this for?" />
          </div>

          <div>
            <Label className="text-xs">Receipt (optional)</Label>
            <div className="mt-1 flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border cursor-pointer hover:bg-muted">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                {uploading ? 'Uploading...' : 'Upload receipt'}
                <input type="file" className="hidden" onChange={handleFile} disabled={uploading} accept="image/*,application/pdf" />
              </label>
              {form.receipt_url && (
                <a href={form.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">View</a>
              )}
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-between pt-3 border-t mt-3">
          {expense ? (
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs" onClick={handleDelete} disabled={saving}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="text-xs h-8" onClick={handleSave} disabled={saving || !form.date || !form.amount}>
              {saving ? 'Saving...' : expense ? 'Save Changes' : 'Add Expense'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}