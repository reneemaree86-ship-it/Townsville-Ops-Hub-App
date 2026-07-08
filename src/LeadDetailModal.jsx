import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/dialog';
import { Button } from '@/button';
import { Input } from '@/input';
import { Textarea } from '@/textarea';
import { Label } from '@/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/select';
import { Badge } from '@/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/tabs';
import { Card, CardContent } from '@/card';
import StatusBadge from '@/StatusBadge';
import { Copy, ExternalLink, CheckCircle2 } from 'lucide-react';

const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'scored', label: 'Scored' },
  { value: 'needs_approval', label: 'Needs Approval' },
  { value: 'draft_ready', label: 'Draft Ready' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'follow_up_due', label: 'Follow-Up Due' },
  { value: 'converted', label: 'Converted (Won)' },
  { value: 'closed', label: 'Closed (Lost)' },
  { value: 'rejected', label: 'Rejected (Not Suitable)' },
];

const URGENCY_OPTIONS = [
  { value: 'flexible', label: 'Flexible' },
  { value: 'this_week', label: 'This Week' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'unknown', label: 'Unknown' },
];

export default function LeadDetailModal({ lead, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: lead.name || '',
    contact_phone: lead.contact_phone || '',
    contact_email: lead.contact_email || '',
    suburb: lead.suburb || '',
    service_type: lead.service_type || '',
    urgency: lead.urgency || 'unknown',
    status: lead.status || 'new',
    notes: lead.notes || '',
    response_draft: lead.response_draft || '',
    manual_approval_required: !!lead.manual_approval_required,
    manual_approval_reason: lead.manual_approval_reason || '',
    follow_up_due_at: lead.follow_up_due_at ? lead.follow_up_due_at.substring(0, 10) : '',
  });
  const [copied, setCopied] = useState(false);
  const [followUpSaved, setFollowUpSaved] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.update(lead.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      onClose();
    },
  });

  // Follow-ups are tracked directly on the Lead record (follow_up_due_at / follow_up_attempts) --
  // there is no separate FollowUp entity. This is the same field the scheduled
  // "Lead Follow-Up Check" automation reads and updates.
  const scheduleFollowUpMutation = useMutation({
    mutationFn: () => base44.entities.Lead.update(lead.id, {
      follow_up_due_at: form.follow_up_due_at ? new Date(form.follow_up_due_at + 'T09:00:00').toISOString() : null,
      status: form.follow_up_due_at ? 'follow_up_due' : form.status,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      setFollowUpSaved(true);
    },
  });

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  const copyResponse = () => {
    navigator.clipboard.writeText(form.response_draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            Lead Detail
            <StatusBadge status={lead.status} />
            <StatusBadge status={lead.urgency} />
            <span className="ml-auto text-[10px] text-muted-foreground font-normal">Score: {lead.lead_score ?? '-'}/100</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList className="h-8">
            <TabsTrigger value="details" className="text-xs h-7">Details</TabsTrigger>
            <TabsTrigger value="response" className="text-xs h-7">Response Draft</TabsTrigger>
            <TabsTrigger value="followup" className="text-xs h-7">Follow-Up</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-8 text-xs mt-1" /></div>
              <div><Label className="text-xs">Suburb</Label><Input value={form.suburb} onChange={e => setForm({...form, suburb: e.target.value})} className="h-8 text-xs mt-1" /></div>
              <div><Label className="text-xs">Contact Phone</Label><Input value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} className="h-8 text-xs mt-1" /></div>
              <div><Label className="text-xs">Contact Email</Label><Input value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} className="h-8 text-xs mt-1" /></div>
            </div>
            <div><Label className="text-xs">Service Needed</Label><Input value={form.service_type} onChange={e => setForm({...form, service_type: e.target.value})} className="h-8 text-xs mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Urgency</Label>
                <Select value={form.urgency} onValueChange={v => setForm({...form, urgency: v})}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {URGENCY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} className="text-xs mt-1" placeholder="Internal notes about this lead..." /></div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="manual-approval"
                checked={form.manual_approval_required}
                onChange={e => setForm({...form, manual_approval_required: e.target.checked})}
                className="h-3.5 w-3.5"
              />
              <Label htmlFor="manual-approval" className="text-xs cursor-pointer">Requires manual approval (bond/NDIS/DVA/hazardous/hoarder job)</Label>
            </div>
            {form.manual_approval_required && (
              <Input value={form.manual_approval_reason} onChange={e => setForm({...form, manual_approval_reason: e.target.value})} className="h-8 text-xs" placeholder="Reason for manual approval..." />
            )}

            {lead.original_text && (
              <Card className="bg-muted/40">
                <CardContent className="p-3">
                  <p className="text-[10px] text-muted-foreground font-medium mb-1">Original Post</p>
                  <p className="text-[10px]">{lead.original_text}</p>
                  {lead.source_url && (
                    <a href={lead.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary flex items-center gap-1 mt-1">
                      <ExternalLink className="w-3 h-3" /> View source
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {lead.budget_clues && (
              <div className="flex gap-2 text-[10px]">
                <span className="text-muted-foreground">Budget signals:</span>
                <span>{lead.budget_clues}</span>
              </div>
            )}

            {lead.score_rationale && (
              <div className="flex gap-2 text-[10px]">
                <span className="text-muted-foreground">Score rationale:</span>
                <span>{lead.score_rationale}</span>
              </div>
            )}

            <div className="flex gap-2 text-[10px] flex-wrap">
              {lead.source_platform && <Badge variant="outline" className="text-[9px]">Source: {lead.source_platform}</Badge>}
              {lead.follow_up_attempts > 0 && <Badge variant="outline" className="text-[9px]">Follow-ups sent: {lead.follow_up_attempts}</Badge>}
            </div>
          </TabsContent>

          <TabsContent value="response" className="space-y-3 mt-3">
            <p className="text-[10px] text-muted-foreground">AI-generated response draft. Edit before sending. Never promise a price without full details.</p>
            <Textarea
              value={form.response_draft}
              onChange={e => setForm({...form, response_draft: e.target.value})}
              rows={12}
              className="text-xs font-mono"
            />
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={copyResponse}>
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
            <p className="text-[10px] text-amber-600">Copy and paste manually into Facebook, email, or messaging platform. Direct sending requires platform integration.</p>
          </TabsContent>

          <TabsContent value="followup" className="space-y-3 mt-3">
            <div>
              <Label className="text-xs">Follow-Up Due Date</Label>
              <Input type="date" value={form.follow_up_due_at} onChange={e => setForm({...form, follow_up_due_at: e.target.value})} className="h-8 text-xs mt-1 max-w-xs" />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-2"
              disabled={scheduleFollowUpMutation.isPending || followUpSaved}
              onClick={() => scheduleFollowUpMutation.mutate()}
            >
              {followUpSaved ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Follow-Up Set</> : 'Set Follow-Up Date'}
            </Button>
            <p className="text-[10px] text-muted-foreground">This sets follow_up_due_at directly on the lead -- the same field the scheduled Lead Follow-Up Check automation reads, and it will appear on the Follow-up Reminders page.</p>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="text-xs" onClick={handleSave} disabled={updateMutation.isPending}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
