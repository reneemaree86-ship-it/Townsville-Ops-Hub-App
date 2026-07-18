import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye } from 'lucide-react';
import TaskListInput from './TaskListInput';
import { generateScopePDF } from '@/lib/scopePdfGenerator';
import { openPdfInNewWindow } from '@/lib/openPdf';

const SERVICE_TYPES = [
  ['general_maintenance_clean', 'General Maintenance Clean'],
  ['detailed_refresh_clean', 'Detailed Refresh Clean'],
  ['deep_spring_clean', 'Deep or Spring Clean'],
  ['office_commercial_cleaning', 'Office and Commercial Cleaning'],
  ['airbnb_shortstay_cleaning', 'Airbnb and Short-Stay Cleaning'],
  ['move_in_cleaning', 'Move-In Cleaning'],
  ['rental_inspection_rescue', 'Rental Inspection Rescue'],
  ['pre_sale_presentation_cleaning', 'Pre-Sale Presentation Cleaning'],
  ['window_cleaning', 'Window Cleaning'],
  ['pressure_washing', 'Pressure Washing'],
  ['custom', 'Custom'],
];

const EMPTY = {
  client_id: '', client_name: '', service_address: '', booking_id: '',
  service_type: 'general_maintenance_clean', service_date: format(new Date(), 'yyyy-MM-dd'),
  frequency: 'one_off', estimated_hours: '', pricing_type: 'hourly', hourly_rate: '', agreed_price: '',
  tasks_included: [], addons_selected: [], tasks_excluded: [],
  special_instructions: '', cleaner_notes: '', terms_conditions: '',
  client_acknowledged: false, client_acknowledgement_name: '', client_acknowledgement_date: '',
  status: 'draft', template_id: '',
};

export default function ScopeOfWorkForm({ scope, business, clients, bookings, templates, onSaved, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (scope) setForm({ ...EMPTY, ...scope });
    else setForm(EMPTY);
  }, [scope]);

  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  const handleClientChange = (clientId) => {
    const c = clients.find(cl => cl.id === clientId);
    set({
      client_id: clientId,
      client_name: c?.full_name || '',
      service_address: c?.address || form.service_address,
    });
  };

  const applyTemplate = (templateId) => {
    const t = templates.find(tp => tp.id === templateId);
    if (!t) return;
    set({
      template_id: t.id,
      service_type: t.service_type,
      tasks_included: t.default_tasks_included || [],
      addons_selected: t.default_addons || [],
      tasks_excluded: t.default_tasks_excluded || [],
      terms_conditions: t.default_terms_conditions || '',
    });
  };

  const clientBookings = (bookings || []).filter(b => !form.client_id || b.client_id === form.client_id);

  const handleSave = async () => {
    if (!form.client_name || !form.service_type) return;
    setSaving(true);
    const payload = { ...form, business_id: business.id };
    if (scope?.id) await base44.entities.ScopeOfWork.update(scope.id, payload);
    else await base44.entities.ScopeOfWork.create(payload);
    setSaving(false);
    onSaved();
  };

  const handlePreview = async () => {
    try {
      const doc = generateScopePDF(form);
      await openPdfInNewWindow(doc, `scope-of-work-${form.client_name || 'client'}.pdf`);
    } catch (e) {
      alert('Preview error: ' + e.message);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">{scope?.id ? 'Edit Scope of Work' : 'New Scope of Work'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList className="h-8">
            <TabsTrigger value="details" className="text-xs">Client & Job</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs">Tasks & Pricing</TabsTrigger>
            <TabsTrigger value="terms" className="text-xs">Notes & Terms</TabsTrigger>
            <TabsTrigger value="ack" className="text-xs">Acknowledgement</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Client *</Label>
                <Select value={form.client_id} onValueChange={handleClientChange}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Related Booking (optional)</Label>
                <Select value={form.booking_id || '__none'} onValueChange={v => set({ booking_id: v === '__none' ? '' : v })}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none" className="text-xs">None</SelectItem>
                    {clientBookings.map(b => <SelectItem key={b.id} value={b.id} className="text-xs">{b.date} — {b.client_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Client Name *</Label>
              <Input className="h-8 text-xs mt-1" value={form.client_name} onChange={e => set({ client_name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Service Address</Label>
              <Input className="h-8 text-xs mt-1" value={form.service_address} onChange={e => set({ service_address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Service Date</Label>
                <Input type="date" className="h-8 text-xs mt-1" value={form.service_date} onChange={e => set({ service_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Frequency</Label>
                <Select value={form.frequency} onValueChange={v => set({ frequency: v })}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_off" className="text-xs">One-off</SelectItem>
                    <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
                    <SelectItem value="fortnightly" className="text-xs">Fortnightly</SelectItem>
                    <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                    <SelectItem value="as_required" className="text-xs">As Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-3 pt-3">
            <div>
              <Label className="text-xs">Load a Template (customises this scope only)</Label>
              <Select value="" onValueChange={applyTemplate}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Choose a template to load..." /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Service Type</Label>
                <Select value={form.service_type} onValueChange={v => set({ service_type: v })}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(([v, l]) => <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Estimated Hours</Label>
                <Input type="number" className="h-8 text-xs mt-1" value={form.estimated_hours} onChange={e => set({ estimated_hours: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Pricing Type</Label>
                <Select value={form.pricing_type} onValueChange={v => set({ pricing_type: v })}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly" className="text-xs">Hourly Rate</SelectItem>
                    <SelectItem value="fixed" className="text-xs">Agreed Fixed Price</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.pricing_type === 'fixed' ? (
                <div>
                  <Label className="text-xs">Agreed Price ($)</Label>
                  <Input type="number" className="h-8 text-xs mt-1" value={form.agreed_price} onChange={e => set({ agreed_price: e.target.value })} />
                </div>
              ) : (
                <div>
                  <Label className="text-xs">Hourly Rate ($)</Label>
                  <Input type="number" className="h-8 text-xs mt-1" value={form.hourly_rate} onChange={e => set({ hourly_rate: e.target.value })} />
                </div>
              )}
            </div>
            <TaskListInput label="Included Cleaning Tasks" value={form.tasks_included} onChange={v => set({ tasks_included: v })} />
            <TaskListInput label="Optional Add-Ons" value={form.addons_selected} onChange={v => set({ addons_selected: v })} />
            <TaskListInput label="Excluded Tasks / Areas" value={form.tasks_excluded} onChange={v => set({ tasks_excluded: v })} />
          </TabsContent>

          <TabsContent value="terms" className="space-y-3 pt-3">
            <div>
              <Label className="text-xs">Special Instructions / Client Requests</Label>
              <Textarea className="text-xs mt-1 min-h-[70px]" value={form.special_instructions} onChange={e => set({ special_instructions: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Cleaner Notes</Label>
              <Textarea className="text-xs mt-1 min-h-[70px]" value={form.cleaner_notes} onChange={e => set({ cleaner_notes: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Terms, Conditions & Payment</Label>
              <Textarea className="text-xs mt-1 min-h-[90px]" value={form.terms_conditions} onChange={e => set({ terms_conditions: e.target.value })} />
            </div>
          </TabsContent>

          <TabsContent value="ack" className="space-y-3 pt-3">
            <div className="flex items-center gap-2">
              <Checkbox checked={form.client_acknowledged} onCheckedChange={v => set({ client_acknowledged: !!v })} />
              <Label className="text-xs">Client has acknowledged and approved this scope of work</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Acknowledged By (name)</Label>
                <Input className="h-8 text-xs mt-1" value={form.client_acknowledgement_name} onChange={e => set({ client_acknowledgement_name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Acknowledgement Date</Label>
                <Input type="date" className="h-8 text-xs mt-1" value={form.client_acknowledgement_date} onChange={e => set({ client_acknowledgement_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => set({ status: v })}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                  <SelectItem value="active" className="text-xs">Active</SelectItem>
                  <SelectItem value="archived" className="text-xs">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-end gap-2 pt-3 border-t mt-2">
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={handlePreview} disabled={!form.client_name}>
            <Eye className="w-3.5 h-3.5 mr-1" /> Preview PDF
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="text-xs h-8" onClick={handleSave} disabled={saving || !form.client_name}>
            {saving ? 'Saving...' : scope?.id ? 'Save Changes' : 'Save Scope of Work'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}