import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
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
import { Plus, Pencil, Trash2, PlayCircle, CheckCircle2, XCircle, CalendarClock, Receipt, FileText } from 'lucide-react';

const SERVICE_TYPES = [
  { value: 'standard_cleaning', label: 'Standard Cleaning' },
  { value: 'detailed_refresh', label: 'Detailed Refresh Clean' },
  { value: 'deep_clean', label: 'Deep Clean' },
  { value: 'office_commercial', label: 'Office/Commercial' },
  { value: 'pressure_washing', label: 'Pressure Washing' },
  { value: 'pre_sale_inspection', label: 'Pre-Sale/Rental Inspection Rescue' },
  { value: 'airbnb_shortstay', label: 'Airbnb / Short-Stay Clean' },
  { value: 'windows_screens', label: 'Windows & Screens' },
  { value: 'other', label: 'Other' },
];

const ADD_ONS = [
  { key: 'security_screen', label: 'Security Screen (ea)', price: 8 },
  { key: 'sliding_door', label: 'Sliding Glass Door (ea)', price: 25 },
  { key: 'oven', label: 'Oven Clean', price: 85 },
  { key: 'rangehood', label: 'Rangehood Clean', price: 65 },
  { key: 'fridge_internal', label: 'Fridge Internal', price: 55 },
  { key: 'fridge_freezer_combo', label: 'Fridge/Freezer Combo', price: 85 },
];

const FREQUENCIES = ['weekly', 'fortnightly', 'monthly', 'as_needed'];

function serviceLabel(value) {
  return SERVICE_TYPES.find(s => s.value === value)?.label || value || '—';
}

function toLocalInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm = {
  client_id: '',
  service_type: 'standard_cleaning',
  address: '',
  suburb: '',
  status: 'scheduled',
  scheduled_start: '',
  scheduled_end: '',
  quoted_range_min: '',
  quoted_range_max: '',
  final_price: '',
  add_ons: [],
  travel_fee: 0,
  staff_ids: [],
  notes: '',
  scope_confirmed: false,
  recurring: false,
  recurrence_frequency: '',
};

function JobFormModal({ open, onClose, onSave, existing, saving, clients, staff }) {
  const [form, setForm] = useState(existing ? { ...emptyForm, ...existing } : emptyForm);

  useEffect(() => {
    const initial = existing ? {
      ...emptyForm,
      ...existing,
      add_ons: existing.add_ons || [],
      staff_ids: existing.staff_ids || [],
      scheduled_start: toLocalInputValue(existing.scheduled_start),
      scheduled_end: toLocalInputValue(existing.scheduled_end),
    } : emptyForm;
    setForm(initial);
  }, [existing, open]);

  const handleClientChange = (id) => {
    const client = clients.find(c => c.id === id);
    setForm(f => ({ ...f, client_id: id, address: client?.address || f.address, suburb: client?.suburb || f.suburb }));
  };

  const toggleAddOn = (addon) => {
    setForm(f => {
      const exists = (f.add_ons || []).some(a => a.key === addon.key);
      const add_ons = exists ? f.add_ons.filter(a => a.key !== addon.key) : [...(f.add_ons || []), { key: addon.key, label: addon.label, price: addon.price }];
      return { ...f, add_ons };
    });
  };

  const toggleStaff = (id) => {
    setForm(f => {
      const exists = (f.staff_ids || []).includes(id);
      const staff_ids = exists ? f.staff_ids.filter(s => s !== id) : [...(f.staff_ids || []), id];
      return { ...f, staff_ids };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      quoted_range_min: form.quoted_range_min === '' ? null : parseFloat(form.quoted_range_min),
      quoted_range_max: form.quoted_range_max === '' ? null : parseFloat(form.quoted_range_max),
      final_price: form.final_price === '' ? null : parseFloat(form.final_price),
      travel_fee: parseFloat(form.travel_fee) || 0,
      scheduled_start: form.scheduled_start ? new Date(form.scheduled_start).toISOString() : null,
      scheduled_end: form.scheduled_end ? new Date(form.scheduled_end).toISOString() : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Job' : 'New Job'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {existing?.quote_id && (
            <div className="flex items-center gap-1.5 text-[10px] text-primary bg-primary/5 border border-primary/20 rounded-md px-2 py-1.5">
              <FileText className="w-3 h-3" /> Created from a quote
            </div>
          )}
          <div>
            <Label className="text-xs">Client *</Label>
            <Select value={form.client_id} onValueChange={handleClientChange}>
              <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Select a client" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.suburb ? ` — ${c.suburb}` : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Service Type</Label>
            <Select value={form.service_type} onValueChange={v => setForm(f => ({ ...f, service_type: v }))}>
              <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Address</Label>
              <Input className="mt-1 text-sm" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Suburb</Label>
              <Input className="mt-1 text-sm" value={form.suburb} onChange={e => setForm(f => ({ ...f, suburb: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Scheduled Start</Label>
              <Input type="datetime-local" className="mt-1 text-sm" value={form.scheduled_start} onChange={e => setForm(f => ({ ...f, scheduled_start: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Scheduled End</Label>
              <Input type="datetime-local" className="mt-1 text-sm" value={form.scheduled_end} onChange={e => setForm(f => ({ ...f, scheduled_end: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['scheduled', 'in_progress', 'completed', 'cancelled'].map(s => (
                  <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Quoted Min ($)</Label>
              <Input type="number" step="0.01" className="mt-1 text-sm" value={form.quoted_range_min}
                onChange={e => setForm(f => ({ ...f, quoted_range_min: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Quoted Max ($)</Label>
              <Input type="number" step="0.01" className="mt-1 text-sm" value={form.quoted_range_max}
                onChange={e => setForm(f => ({ ...f, quoted_range_max: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Final Price ($)</Label>
              <Input type="number" step="0.01" className="mt-1 text-sm" value={form.final_price}
                onChange={e => setForm(f => ({ ...f, final_price: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Add-ons</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
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
          </div>
          <div>
            <Label className="text-xs">Staff Assigned</Label>
            {staff.length === 0 ? (
              <p className="text-[10px] text-muted-foreground mt-1">No staff added yet — there's no Staff page yet to add team members. Ask me to build one if you need it.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {staff.map(s => (
                  <label key={s.id} className="flex items-center gap-2 text-xs p-2 border border-border rounded-md cursor-pointer">
                    <Checkbox checked={(form.staff_ids || []).includes(s.id)} onCheckedChange={() => toggleStaff(s.id)} />
                    {s.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <Checkbox checked={form.scope_confirmed} onCheckedChange={v => setForm(f => ({ ...f, scope_confirmed: !!v }))} />
              <Label className="text-xs font-normal cursor-pointer">Scope confirmed</Label>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <Checkbox checked={form.recurring} onCheckedChange={v => setForm(f => ({ ...f, recurring: !!v }))} />
              <Label className="text-xs font-normal cursor-pointer">Recurring job</Label>
            </div>
          </div>
          {form.recurring && (
            <div>
              <Label className="text-xs">Recurrence Frequency</Label>
              <Select value={form.recurrence_frequency} onValueChange={v => setForm(f => ({ ...f, recurrence_frequency: v }))}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Select frequency" /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea className="mt-1 text-sm" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button type="submit" disabled={saving || !form.client_id}>{saving ? 'Saving...' : 'Save Job'}</Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Jobs() {
  const { activeBusiness } = useOutletContext();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  if (!activeBusiness) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading business…</div>;
  }

  const loadData = async () => {
    setLoading(true);
    try {
      const [j, c, s] = await Promise.all([
        base44.entities.Job.list('-scheduled_start', 500),
        base44.entities.Client.list('-created_date', 500),
        base44.entities.Staff.list(),
      ]);
      setJobs(j);
      setClients(c);
      setStaff(s);
    } catch (e) {
      console.error(e);
      setErrorMsg('Could not load jobs, clients or staff. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const clientName = (id) => clients.find(c => c.id === id)?.name || 'Unknown client';
  const staffNames = (ids) => (ids || []).map(id => staff.find(s => s.id === id)?.name).filter(Boolean).join(', ');

  const filteredJobs = statusFilter === 'all' ? jobs : jobs.filter(j => j.status === statusFilter);

  const handleSave = async (data) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const payload = { ...data, business_id: activeBusiness?.id || data.business_id };
      if (editingJob) {
        await base44.entities.Job.update(editingJob.id, payload);
      } else {
        await base44.entities.Job.create(payload);
      }
      setShowForm(false);
      setEditingJob(null);
      await loadData();
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || 'Could not save the job. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this job? This cannot be undone.')) {
      setErrorMsg(null);
      try {
        await base44.entities.Job.delete(id);
        await loadData();
      } catch (e) {
        console.error(e);
        setErrorMsg(e?.message || 'Could not delete the job. Please try again.');
      }
    }
  };

  const setStatus = async (job, status) => {
    const patch = { status };
    if (status === 'in_progress') patch.actual_start = new Date().toISOString();
    if (status === 'completed') patch.actual_end = new Date().toISOString();
    setErrorMsg(null);
    try {
      await base44.entities.Job.update(job.id, patch);
      await loadData();
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || 'Could not update the job status. Please try again.');
    }
  };

  const handleCreateInvoice = (job) => {
    navigate(`/invoices?job_id=${job.id}&client_id=${job.client_id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description={`${jobs.length} total jobs`}
        actions={
          <Button onClick={() => { setEditingJob(null); setShowForm(true); }} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Job
          </Button>
        }
        business={activeBusiness}
      />

      {errorMsg && (
        <div className="text-xs text-destructive bg-destructive/10 rounded-md p-3 flex items-center justify-between">
          <span>{errorMsg}</span>
          <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setErrorMsg(null)}>Dismiss</Button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Label className="text-xs whitespace-nowrap">Filter by status:</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading jobs...</p>
      ) : filteredJobs.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">{jobs.length === 0 ? 'No jobs yet. Create one, or approve a Quote and convert it to a job.' : 'No jobs match this filter.'}</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map(j => (
            <Card key={j.id}>
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{clientName(j.client_id)}</span>
                    <StatusBadge status={j.status} />
                    {j.recurring && <span className="text-[10px] text-muted-foreground">🔁 {j.recurrence_frequency}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{serviceLabel(j.service_type)} {j.suburb ? `— ${j.suburb}` : ''}</p>
                  {j.scheduled_start && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" /> {new Date(j.scheduled_start).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  )}
                  {staffNames(j.staff_ids) && <p className="text-[10px] text-muted-foreground mt-1">Staff: {staffNames(j.staff_ids)}</p>}
                  <p className="text-sm font-semibold text-foreground mt-1">
                    {j.final_price ? `$${parseFloat(j.final_price).toFixed(2)}` : (j.quoted_range_min != null ? `$${parseFloat(j.quoted_range_min).toFixed(2)} – $${parseFloat(j.quoted_range_max || 0).toFixed(2)}` : '—')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(j.status === 'scheduled') && (
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setStatus(j, 'in_progress')}>
                      <PlayCircle className="w-3 h-3 mr-1" /> Start
                    </Button>
                  )}
                  {j.status === 'in_progress' && (
                    <Button size="sm" className="h-7 text-[11px]" onClick={() => setStatus(j, 'completed')}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                    </Button>
                  )}
                  {j.status === 'completed' && (
                    <Button size="sm" className="h-7 text-[11px]" onClick={() => handleCreateInvoice(j)}>
                      <Receipt className="w-3 h-3 mr-1" /> Create Invoice
                    </Button>
                  )}
                  {!['completed', 'cancelled'].includes(j.status) && (
                    <Button size="sm" variant="outline" className="h-7 text-[11px] text-destructive" onClick={() => setStatus(j, 'cancelled')}>
                      <XCircle className="w-3 h-3 mr-1" /> Cancel
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingJob(j); setShowForm(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(j.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <JobFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingJob(null); }}
        onSave={handleSave}
        existing={editingJob}
        saving={saving}
        clients={clients}
        staff={staff}
      />
    </div>
  );
}
