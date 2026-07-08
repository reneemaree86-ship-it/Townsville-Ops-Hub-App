import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/base44Client';
import PageHeader from '@/PageHeader';
import StatusBadge from '@/StatusBadge';
import { Card, CardContent } from '@/card';
import { Button } from '@/button';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function Notifications() {
  const qc = useQueryClient();
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications-all'],
    queryFn: () => base44.entities.NotificationQueue.list('-created_date', 100),
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.NotificationQueue.update(id, { status: 'sent' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications-all'] }); qc.invalidateQueries({ queryKey: ['notifications-unread'] }); },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => { for (const n of notifications.filter(n => n.status === 'queued')) await base44.entities.NotificationQueue.update(n.id, { status: 'sent' }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications-all'] }); qc.invalidateQueries({ queryKey: ['notifications-unread'] }); },
  });

  const unreadCount = notifications.filter(n => n.status === 'queued').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description={`${unreadCount} unread`}
        actions={unreadCount > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => markAllReadMutation.mutate()}>
            <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
          </Button>
        )}
      />
      <div className="space-y-2">
        {notifications.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-xs text-muted-foreground">No notifications yet.</CardContent></Card>
        ) : (
          notifications.map(n => (
            <Card key={n.id} className={n.status === 'queued' ? 'border-primary/30 bg-primary/5' : ''}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <Bell className={`w-4 h-4 mt-0.5 flex-shrink-0 ${n.status === 'queued' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${n.status === 'queued' ? '' : 'text-muted-foreground'}`}>{n.title}</p>
                    <p className="text-[10px] text-muted-foreground">{n.message}</p>
                    <p className="text-[9px] text-muted-foreground mt-1">{format(new Date(n.created_date), 'dd MMM yyyy HH:mm')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={n.priority} />
                  <StatusBadge status={n.channel} />
                  {n.status === 'queued' && <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => markReadMutation.mutate(n.id)}><Check className="w-3 h-3" /></Button>}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
