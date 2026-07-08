import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/base44Client';
import PageHeader from '@/PageHeader';
import StatusBadge from '@/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/card';
import { Button } from '@/button';
import { Check, X } from 'lucide-react';

export default function ApprovalQueue() {
  const { activeBusiness } = useOutletContext();
  const bid = activeBusiness?.id;
  const qc = useQueryClient();

  const { data: leads = [] } = useQuery({
    queryKey: ['leads-approval', bid],
    queryFn: () => bid ? base44.entities.Lead.filter({ business_id: bid, status: 'needs_approval' }) : [],
    enabled: !!bid,
  });
  const { data: adDrafts = [] } = useQuery({
    queryKey: ['ads-approval', bid],
    queryFn: () => bid ? base44.entities.AdDraft.filter({ business_id: bid, status: 'needs_approval' }) : [],
    enabled: !!bid,
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads-approval'] }); qc.invalidateQueries({ queryKey: ['leads'] }); },
  });
  const updateAdMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AdDraft.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ads-approval'] }),
  });

  const totalItems = leads.length + adDrafts.length;
  if (!activeBusiness) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Approval Queue" description={`${totalItems} items awaiting approval`} business={activeBusiness} />

      {totalItems === 0 && <Card><CardContent className="p-8 text-center text-xs text-muted-foreground">Nothing awaiting approval. You are all caught up.</CardContent></Card>}

      {leads.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Lead Responses ({leads.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {leads.map(lead => (
              <div key={lead.id} className="p-3 rounded-lg bg-muted/40 border border-border/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium">{lead.service_type}</p>
                    <p className="text-[10px] text-muted-foreground">{lead.suburb} via {lead.source_platform} — Score: {lead.lead_score ?? '-'}/100</p>
                    {lead.response_draft && <p className="text-[10px] bg-card p-2 rounded mt-2 whitespace-pre-wrap">{lead.response_draft}</p>}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-emerald-600" onClick={() => updateLeadMutation.mutate({ id: lead.id, data: { status: 'contacted' } })}><Check className="w-3 h-3" /> Approve</Button>
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-red-500" onClick={() => updateLeadMutation.mutate({ id: lead.id, data: { status: 'rejected' } })}><X className="w-3 h-3" /> Reject</Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {adDrafts.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Ad Drafts ({adDrafts.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {adDrafts.map(ad => (
              <div key={ad.id} className="p-3 rounded-lg bg-muted/40 border border-border/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium capitalize">{ad.platform?.replace(/_/g, ' ')}</p>
                    {ad.copy_headline && <p className="text-xs mt-1">{ad.copy_headline}</p>}
                    {ad.copy_body && <p className="text-[10px] text-muted-foreground">{ad.copy_body}</p>}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-emerald-600" onClick={() => updateAdMutation.mutate({ id: ad.id, data: { status: 'approved' } })}><Check className="w-3 h-3" /> Approve</Button>
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-red-500" onClick={() => updateAdMutation.mutate({ id: ad.id, data: { status: 'rejected' } })}><X className="w-3 h-3" /> Reject</Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}