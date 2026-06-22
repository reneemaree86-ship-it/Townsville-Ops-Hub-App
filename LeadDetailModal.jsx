import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import StatusBadge from '@/components/shared/StatusBadge';
import { Copy, ExternalLink, CheckCircle2 } from 'lucide-react';

const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'hot', label: 'Hot' },
  { value: 'needs_approval', label: 'Needs Approval' },
  { value: 'draft_ready', label: 'Draft Ready' },
  { value: 'applied_responded', label: 'Responded' },
  { value: 'follow_up_due', label: 'Follow-Up Due' },
  { value: 'won', label: 'Won ✓' },
  { value: 'lost', label: 'Lost' },
  { value: 'not_suitable', label: 'Not Suitable' },
];

const SERVICE_TYPES = ['deep_clean','fortnightly','weekly','office_cleaning','commercial','hoarder_heavy','inspection_rescue','one_off_urgent','airbnb_shortstay','window_cleaning','pressure_washing','move_in','general_residential','business_commercial','other'];

export default function LeadDetailModal({ lead, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: lead.name || '',
    contact_details: lead.contact_details || '',
    suburb: lead.suburb || '',
    service_needed: lead.service_needed || '',
    service_type: lead.service_type || 'other',
    urgency: lead.urgency || 'medium',
    status: lead.status || 'new',
    notes: lead.notes || '',
    response_draft: lead.response_draft || '',
    estimated_value: lead.estimated_value || 0,
    follow_up_date: lead.follow_up_date ? lead.follow_up_date.substring(0, 10) : '',
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

  const scheduleFollowUpMutation = useMutation({
    mutationFn: async () => {
      if (form.follow_up_date) {
        await base44.entities.FollowUp.create({
          business_id: lead.business_id,
          lead_id: lead.id,
          lead_name: form.name || 'Unknown',
          service_type: form.service_type,
          due_date: new Date(form.follow_up_date + 'T09:00:00').toISOString(),
          note: `Follow up on ${form.service_needed} in ${form.suburb}`,
          status: 'pending',
        });
      }
    },
    onSuccess: () => setFollowUpSaved(true),
  });

  const handleSave = () => {
    const data = {
      ...form,
      estimated_value: Number(form.estimated_value) || 0,
      follow_up_date: form.follow_up_date ? new Date(form.follow_up_date + 'T09:00:00').toISOString() : null,
    };
    updateMutation.mutate(data);
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
            <span className="ml-auto text-[10px] text-muted-foreground font-normal">Score: {lead.score}/100</span>
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
              <div><Label className="text-xs">Contact Details</Label><Input value={form.contact_details} onChange={e => setForm({...form, contact_details: e.target.value})} className="h-8 text-xs mt-1" placeholder="Phone / email / FB profile" /></div>
              <div><Label className="text-xs">Suburb</Label><Input value={form.suburb} onChange={e => setForm({...form, suburb: e.target.value})} className="h-8 text-xs mt-1" /></div>
              <div><Label className="text-xs">Estimated Value ($)</Label><Input type="number" value={form.estimated_value} onChange={e => setForm({...form, estimated_value: e.target.value})} className="h-8 text-xs mt-1" /></div>
            </div>
            <div><Label className="text-xs">Service Needed</Label><Input value={form.service_needed} onChange={e => setForm({...form, service_needed: e.target.value})} className="h-8 text-xs mt-1" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Service Type</Label>
                <Select value={form.service_type} onValueChange={v => setForm({...form, service_type: v})}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{SERVICE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Urgency</Label>
                <Select value={form.urgency} onValueChange={v => setForm({...form, urgency: v})}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
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

            {lead.original_post_text && (
              <Card className="bg-muted/40">
                <CardContent className="p-3">
                  <p className="text-[10px] text-muted-foreground font-medium mb-1">Original Post</p>
                  <p className="text-[10px]">{lead.original_post_text}</p>
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

            <div className="flex gap-2 text-[10px] flex-wrap">
              <Badge variant="outline" className="text-[9px]">Source: {lead.source?.replace(/_/g, ' ')}</Badge>
              <Badge variant="outline" className="text-[9px]">Repeat: {lead.repeat_potential?.replace(/_/g, ' ')}</Badge>
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
            <p className="text-[10px] text-amber-600">⚠ Copy and paste manually into Facebook, email, or messaging platform. Direct sending requires platform integration.</p>
          </TabsContent>

          <TabsContent value="followup" className="space-y-3 mt-3">
            <div>
              <Label className="text-xs">Schedule Follow-Up Date</Label>
              <Input type="date" value={form.follow_up_date} onChange={e => setForm({...form, follow_up_date: e.target.value})} className="h-8 text-xs mt-1 max-w-xs" />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-2"
              disabled={!form.follow_up_date || scheduleFollowUpMutation.isPending || followUpSaved}
              onClick={() => scheduleFollowUpMutation.mutate()}
            >
              {followUpSaved ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Follow-Up Scheduled</> : 'Save to Follow-Ups'}
            </Button>
            <p className="text-[10px] text-muted-foreground">This will create a follow-up reminder in the Follow-Ups page.</p>
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