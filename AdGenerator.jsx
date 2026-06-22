import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Loader2, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const platforms = [
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'facebook_ads', label: 'Facebook Ads' },
  { value: 'instagram_ads', label: 'Instagram Ads' },
  { value: 'local_platform', label: 'Local Townsville Platform' },
  { value: 'marketplace', label: 'Marketplace Listing' },
  { value: 'google_business_profile', label: 'Google Business Profile' },
  { value: 'local_service_promo', label: 'Local Service Promo' },
];

export default function AdGenerator() {
  const { activeBusiness } = useOutletContext();
  const bid = activeBusiness?.id;
  const qc = useQueryClient();
  const [platform, setPlatform] = useState('google_ads');
  const [serviceFocus, setServiceFocus] = useState('');
  const [suburbs, setSuburbs] = useState('');
  const [notes, setNotes] = useState('');

  const { data: drafts = [] } = useQuery({
    queryKey: ['ad-drafts', bid],
    queryFn: () => bid ? base44.entities.AdDraft.filter({ business_id: bid }, '-created_date', 50) : [],
    enabled: !!bid,
  });

  const generateMutation = useMutation({
    mutationFn: () => base44.functions.invoke('generateAd', {
      business_id: bid,
      platform,
      service_targeting: serviceFocus ? serviceFocus.split(',').map(s => s.trim()).filter(Boolean) : [],
      suburb_targeting: suburbs ? suburbs.split(',').map(s => s.trim()).filter(Boolean) : [],
      notes,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ad-drafts'] }); setServiceFocus(''); setSuburbs(''); setNotes(''); },
  });

  const updateDraftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AdDraft.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad-drafts'] }),
  });

  const deleteDraftMutation = useMutation({
    mutationFn: (id) => base44.entities.AdDraft.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad-drafts'] }),
  });

  if (!activeBusiness) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Ad Listing Generator" description="Create ad drafts for multiple platforms" business={activeBusiness} />

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Generate New Ad</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{platforms.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Service Focus (optional)</Label><Input value={serviceFocus} onChange={e => setServiceFocus(e.target.value)} className="h-8 text-xs" placeholder="e.g. Deep cleaning, Bond cleaning" /></div>
          </div>
          <div><Label className="text-xs">Target Suburbs (optional)</Label><Input value={suburbs} onChange={e => setSuburbs(e.target.value)} className="h-8 text-xs" placeholder="e.g. Aitkenvale, Douglas, Kirwan" /></div>
          <div><Label className="text-xs">Additional Notes (optional)</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-xs" /></div>
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending || !bid} className="gap-2">
            {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
            {generateMutation.isPending ? 'Generating...' : 'Generate Ad Draft'}
          </Button>
          {!bid && <p className="text-xs text-amber-600">Select a business from the sidebar first.</p>}
          {generateMutation.isError && <p className="text-xs text-red-500">Failed: {generateMutation.error?.response?.data?.error || generateMutation.error?.message}</p>}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {drafts.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-xs text-muted-foreground">No ad drafts yet. Generate one above.</CardContent></Card>
        ) : (
          drafts.map(draft => (
            <Card key={draft.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm capitalize">{draft.platform?.replace(/_/g, ' ')}</CardTitle>
                    <StatusBadge status={draft.status} />
                  </div>
                  <div className="flex gap-1.5">
                    {draft.status === 'draft' && (
                      <Button size="sm" variant="outline" className="h-7 text-[10px] text-emerald-600" onClick={() => updateDraftMutation.mutate({ id: draft.id, data: { status: 'approved' } })}>Approve</Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 text-[10px] text-red-500" onClick={() => deleteDraftMutation.mutate(draft.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {draft.headline_options?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Headlines:</p>
                    {draft.headline_options.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-medium flex-1">{h}</p>
                        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => { navigator.clipboard.writeText(h); toast.success('Copied'); }}><Copy className="w-3 h-3" /></Button>
                      </div>
                    ))}
                  </div>
                )}
                {draft.short_description && <div><p className="text-[10px] text-muted-foreground">Short Description:</p><p className="text-xs">{draft.short_description}</p></div>}
                {draft.long_description && <div><p className="text-[10px] text-muted-foreground">Long Description:</p><p className="text-xs">{draft.long_description}</p></div>}
                {draft.call_to_action && <div><p className="text-[10px] text-muted-foreground">CTA:</p><p className="text-xs font-medium">{draft.call_to_action}</p></div>}
                <div className="flex flex-wrap gap-1">{draft.suggested_keywords?.map((k, i) => <Badge key={i} variant="secondary" className="text-[9px]">{k}</Badge>)}</div>
                {draft.suggested_budget_notes && <div><p className="text-[10px] text-muted-foreground">Budget Notes:</p><p className="text-[10px]">{draft.suggested_budget_notes}</p></div>}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}