import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Check } from 'lucide-react';
import { format, isPast } from 'date-fns';

export default function FollowUps() {
  const { activeBusiness } = useOutletContext();
  const bid = activeBusiness?.id;
  const qc = useQueryClient();

  const { data: followUps = [] } = useQuery({
    queryKey: ['followups-all', bid],
    queryFn: () => bid ? base44.entities.Lead.filter({ business_id: bid }, 'due_date', 100) : [],
    enabled: !!bid,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['followups-all'] }),
  });

  const pending = followUps.filter(f => f.status === 'pending');
  const overdue = pending.filter(f => isPast(new Date(f.due_date)));

  if (!activeBusiness) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Follow-up Reminders" description={`${pending.length} pending, ${overdue.length} overdue`} business={activeBusiness} />
      <div className="space-y-2">
        {followUps.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-xs text-muted-foreground">No follow-ups scheduled.</CardContent></Card>
        ) : (
          followUps.map(f => {
            const isOverdue = f.status === 'pending' && isPast(new Date(f.due_date));
            return (
              <Card key={f.id} className={isOverdue ? 'border-red-500/30 bg-red-500/5' : ''}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Clock className={`w-4 h-4 flex-shrink-0 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="text-xs font-medium">{f.note}</p>
                      <div className="flex gap-2 text-[10px] text-muted-foreground">
                        {f.lead_name && <span>{f.lead_name}</span>}
                        <span>Due: {format(new Date(f.due_date), 'dd MMM yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={isOverdue ? 'overdue' : f.status} />
                    {f.status === 'pending' && (
                      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => updateMutation.mutate({ id: f.id, data: { status: 'completed' } })}>
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
