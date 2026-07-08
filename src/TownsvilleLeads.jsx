import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/base44Client';
import PageHeader from '@/PageHeader';
import StatusBadge from '@/StatusBadge';
import { Card, CardContent } from '@/card';
import { Button } from '@/button';
import { Input } from '@/input';
import { MapPin } from 'lucide-react';

export default function TownsvilleLeads() {
  const { activeBusiness } = useOutletContext();
  const bid = activeBusiness?.id;
  const [suburbFilter, setSuburbFilter] = useState('');
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', bid],
    queryFn: () => bid ? base44.entities.Lead.filter({ business_id: bid }, '-created_date', 200) : [],
    enabled: !!bid,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });

  const filtered = leads.filter(l => {
    if (suburbFilter && l.suburb?.toLowerCase() !== suburbFilter.toLowerCase()) return false;
    if (search && !l.service_type?.toLowerCase().includes(search.toLowerCase()) && !l.suburb?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const bySuburb = {};
  filtered.forEach(l => { const s = l.suburb || 'Unknown'; if (!bySuburb[s]) bySuburb[s] = []; bySuburb[s].push(l); });
  const suburbsWithLeads = Object.keys(bySuburb).sort();

  if (!activeBusiness) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Townsville Leads by Suburb" description="Leads grouped by location" business={activeBusiness} />
      <div className="flex gap-2 flex-wrap">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="h-8 text-xs max-w-xs" />
        <Button variant={!suburbFilter ? 'default' : 'outline'} size="sm" className="text-xs h-8" onClick={() => setSuburbFilter('')}>All</Button>
        {suburbsWithLeads.map(s => (
          <Button key={s} variant={suburbFilter === s ? 'default' : 'outline'} size="sm" className="text-xs h-8" onClick={() => setSuburbFilter(suburbFilter === s ? '' : s)}>
            {s} <span className="ml-1 opacity-60">({bySuburb[s].length})</span>
          </Button>
        ))}
      </div>
      <div className="grid gap-4">
        {suburbsWithLeads.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-xs text-muted-foreground">No leads with suburb data yet.</CardContent></Card>
        ) : (
          suburbsWithLeads.map(suburb => (
            <Card key={suburb}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">{suburb}</span>
                  <span className="text-[10px] text-muted-foreground">({bySuburb[suburb].length} leads)</span>
                </div>
                <div className="space-y-2">
                  {bySuburb[suburb].map(lead => (
                    <div key={lead.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{lead.service_type}</p>
                        <div className="flex gap-2 text-[10px] text-muted-foreground">
                          {lead.source_platform && <span>{lead.source_platform}</span>}
                          <span>Score: {lead.lead_score ?? '-'}/100</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={lead.urgency} />
                        <StatusBadge status={lead.status} />
                        {lead.status === 'new' && lead.urgency !== 'urgent' && <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => updateMutation.mutate({ id: lead.id, data: { urgency: 'urgent' } })}>Mark Urgent</Button>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}