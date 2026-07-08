import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/base44Client';
import PageHeader from '@/PageHeader';
import StatusBadge from '@/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/card';
import { Button } from '@/button';
import { Input } from '@/input';
import { Textarea } from '@/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/select';
import { Label } from '@/label';
import { Loader2, Copy, Trash2, Megaphone } from 'lucide-react';
import { toast } from 'sonner';

const PLATFORMS = [
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'facebook_marketplace', label: 'Facebook Marketplace' },
  { value: 'gumtree', label: 'Gumtree' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'local_seo', label: 'Local SEO / Google Business Profile' },
  { value: 'other', label: 'Other' },
];

const CAMPAIGN_TYPES = [
  { value: 'lead_gen', label: 'Lead Generation' },
  { value: 'brand_awareness', label: 'Brand Awareness' },
  { value: 'service_promo', label: 'Service Promo' },
  { value: 'suburb_targeting', label: 'Suburb Targeting' },
  { value: 'seasonal', label: 'Seasonal' },
];

export default function AdGenerator() {
  const { activeBusiness } = useOutletContext();
  const bid = activeBusiness?.id;
  const qc = useQueryClient();
  const [platform, setPlatform] = useState('google_ads');
  const [campaignType, setCampaignType] = useState('lead_gen');
  const [serviceType, setServiceType] = useState('');
  const [suburb, setSuburb] = useState('');
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
      campaign_type: campaignType,
      service_type: serviceType,
      suburb,
      notes,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ad-drafts'] }); setServiceType(''); setSuburb(''); setNotes(''); },
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
                <SelectContent>{PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Campaign Type</Label>
              <Select value={campaignType} onValueChange={setCampaignType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{CAMPAIGN_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Service Focus</Label><Input value={serviceType} onChange={e => setServiceType(e.target.value)} className="h-8 text-xs" placeholder="e.g. Deep cleaning, Bond cleaning" /></div>
            <div><Label className="text-xs">Target Suburb</Label><Input value={suburb} onChange={e => setSuburb(e.target.value)} className="h-8 text-xs" placeholder="e.g. Kirwan" /></div>
          </div>
          <div><Label className="text-xs">Additional Notes (optional)</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-xs" /></div>
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending || !bid || !serviceType.trim()} className="gap-2">
            {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
            {generateMutation.isPending ? 'Generating...' : 'Generate Ad Draft'}
          </Button>
          {!bid && <p className="text-xs text-amber-600">Select a business from the sidebar first.</p>}
          {!serviceType.trim() && <p className="text-[10px] text-muted-foreground">Enter a service focus to generate an ad.</p>}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-sm capitalize">{draft.platform?.replace(/_/g, ' ')}</CardTitle>
                    <StatusBadge status={draft.status} />
                    {draft.suburb && <span className="text-[10px] text-muted-foreground">{draft.suburb}</span>}
                  </div>
                  <div className="flex gap-1.5">
                    {(draft.status === 'draft' || draft.status === 'needs_approval') && (
                      <Button size="sm" variant="outline" className="h-7 text-[10px] text-emerald-600" onClick={() => updateDraftMutation.mutate({ id: draft.id, data: { status: 'approved' } })}>Approve</Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 text-[10px] text-red-500" onClick={() => deleteDraftMutation.mutate(draft.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {draft.copy_headline && (
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium flex-1">{draft.copy_headline}</p>
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => { navigator.clipboard.writeText(draft.copy_headline); toast.success('Copied'); }}><Copy className="w-3 h-3" /></Button>
                  </div>
                )}
                {draft.copy_body && <div><p className="text-[10px] text-muted-foreground">Body:</p><p className="text-xs whitespace-pre-wrap">{draft.copy_body}</p></div>}
                {draft.copy_cta && <div><p className="text-[10px] text-muted-foreground">CTA:</p><p className="text-xs font-medium">{draft.copy_cta}</p></div>}
                {draft.notes && <div><p className="text-[10px] text-muted-foreground">Notes:</p><p className="text-[10px]">{draft.notes}</p></div>}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
