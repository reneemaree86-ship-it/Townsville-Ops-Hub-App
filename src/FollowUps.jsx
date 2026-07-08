import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/base44Client';
import PageHeader from '@/PageHeader';
import StatusBadge from '@/StatusBadge';
import { Card, CardContent } from '@/card';
import { Button } from '@/button';
import { Clock, Check } from 'lucide-react';
import { format, isPast } from 'date-fns';

const CLOSED_STATUSES = ['converted', 'closed', 'rejected'];

export default function FollowUps() {
  const { activeBusiness } = useOutletContext();
  const bid = activeBusiness?.id;
  const qc = useQueryClient();

  // Follow-ups live directly on the Lead entity (follow_up_due_at / follow_up_attempts) --
  // there is no separate FollowUp entity. This is the same data the scheduled
  // "Lead Follow-Up Check" automation reads and updates.
  const { data: leads = [] } = useQuery({
    queryKey: ['followups-all', bid],
    queryFn: () => bid ? base44.entities.Lead.filter({ business_id: bid }, 'follow_up_due_at', 200) : [],
    enabled: !!bid,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['followups-all'] }),
  });

  const withFollowUp = leads.filter(l => !!l.follow_up_due_at);
  const pending = withFollowUp.filter(l => !CLOSED_STATUSES.includes(l.status));
  const overdue = pending.filter(l => isPast(new Date(l.follow_up_due_at)));

  const markDone = (lead) => updateMutation.mutate({ id: lead.id, data: { follow_up_due_at: null } });

  if (!activeBusiness) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Follow-up Reminders" description={`${pending.length} pending, ${overdue.length} overdue`} business={activeBusiness} />
      <div className="space-y-2">
        {withFollowUp.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-xs text-muted-foreground">No follow-ups scheduled. Set one from a lead's detail view on the Lead Finder page.</CardContent></Card>
        ) : (
          withFollowUp
            .sort((a, b) => new Date(a.follow_up_due_at) - new Date(b.follow_up_due_at))
            .map(lead => {
              const isDone = CLOSED_STATUSES.includes(lead.status);
              const isOverdue = !isDone && isPast(new Date(lead.follow_up_due_at));
              return (
                <Card key={lead.id} className={isOverdue ? 'border-red-500/30 bg-red-500/5' : ''}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Clock className={`w-4 h-4 flex-shrink-0 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="text-xs font-medium">{lead.service_type || 'Cleaning Service'}</p>
                        <div className="flex gap-2 text-[10px] text-muted-foreground flex-wrap">
                          {lead.name && <span>{lead.name}</span>}
                          {lead.suburb && <span>{lead.suburb}</span>}
                          <span>Due: {format(new Date(lead.follow_up_due_at), 'dd MMM yyyy')}</span>
                          {lead.follow_up_attempts > 0 && <span>{lead.follow_up_attempts} attempt{lead.follow_up_attempts !== 1 ? 's' : ''} so far</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={isOverdue ? 'overdue' : lead.status} />
                      {!isDone && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => markDone(lead)}>
                          <Check className="w-3 h-3" /> Done
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
        )}
      </div>
    </div>
  );
}
