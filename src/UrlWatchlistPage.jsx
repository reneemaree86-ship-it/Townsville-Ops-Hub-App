import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/base44Client';
import PageHeader from '@/PageHeader';
import StatusBadge from '@/StatusBadge';
import { Card, CardContent } from '@/card';
import { Button } from '@/button';
import { Input } from '@/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/select';
import { Label } from '@/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/dialog';
import { Link2, Plus, Trash2, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function UrlWatchlistPage() {
  const { activeBusiness } = useOutletContext();
  const bid = activeBusiness?.id;
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ url: '', label: '', platform: '', check_frequency: 'daily' });

  const { data: urls = [] } = useQuery({
    queryKey: ['watchlist', bid],
    queryFn: () => bid ? base44.entities.UrlWatchlist.filter({ business_id: bid }) : [],
    enabled: !!bid,
  });

  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.UrlWatchlist.create({ ...data, business_id: bid, status: 'active' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['watchlist'] }); setAddOpen(false); setForm({ url: '', label: '', platform: '', check_frequency: 'daily' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.UrlWatchlist.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchlist'] }),
  });

  if (!activeBusiness) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="URL Watchlist" description="URLs to monitor for leads and opportunities" business={activeBusiness}
        actions={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1.5 text-xs"><Plus className="w-3.5 h-3.5" /> Add URL</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="text-sm">Add URL to Watch</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="text-xs">URL</Label><Input value={form.url} onChange={e => setForm({...form, url: e.target.value})} className="h-8 text-xs" placeholder="https://..." /></div>
                <div><Label className="text-xs">Label</Label><Input value={form.label} onChange={e => setForm({...form, label: e.target.value})} className="h-8 text-xs" /></div>
                <div><Label className="text-xs">Platform</Label><Input value={form.platform} onChange={e => setForm({...form, platform: e.target.value})} className="h-8 text-xs" placeholder="e.g. Gumtree, Facebook" /></div>
                <div>
                  <Label className="text-xs">Check Frequency</Label>
                  <Select value={form.check_frequency} onValueChange={v => setForm({...form, check_frequency: v})}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={() => addMutation.mutate(form)} disabled={!form.url}>Add to Watchlist</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="space-y-2">
        {urls.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-xs text-muted-foreground">No URLs being watched. Add one to start monitoring.</CardContent></Card>
        ) : (
          urls.map(u => (
            <Card key={u.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{u.label || u.url}</p>
                    <a href={u.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1 truncate">
                      {u.url} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <div className="flex gap-2 text-[10px] text-muted-foreground flex-wrap">
                      {u.platform && <span>{u.platform}</span>}
                      <span>{u.check_frequency}</span>
                      <span>{u.last_checked_at ? `Last checked ${formatDistanceToNow(new Date(u.last_checked_at), { addSuffix: true })}` : 'Never checked yet'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={u.status} />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => deleteMutation.mutate(u.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}