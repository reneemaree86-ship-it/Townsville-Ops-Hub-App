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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wifi, WifiOff, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const KNOWN_PLATFORMS = [
  { name: 'Facebook Groups', connection_type: 'api', notes: 'Requires FACEBOOK_ACCESS_TOKEN and FACEBOOK_GROUP_IDS secrets set in the platform.' },
  { name: 'Gumtree', connection_type: 'manual', notes: 'No API available. Monitored via URL Watchlist scraping.' },
  { name: 'Google Search Console', connection_type: 'api', notes: 'Requires GOOGLE_SEARCH_CONSOLE_KEY secret.' },
  { name: 'Google Analytics', connection_type: 'api', notes: 'Requires GOOGLE_ANALYTICS_KEY secret.' },
  { name: 'Airtasker', connection_type: 'manual', notes: 'No API available. Monitored via URL Watchlist.' },
  { name: 'Community Noticeboard', connection_type: 'manual', notes: 'Manual monitoring only. Add URLs to Watchlist.' },
];

const empty = { platform_name: '', connection_status: 'not_connected', connection_type: 'none', notes: '', business_id: '' };

export default function PlatformStatus() {
  const { activeBusiness } = useOutletContext();
  const bid = activeBusiness?.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const { data: connections = [] } = useQuery({
    queryKey: ['platform-connections', bid],
    queryFn: () => base44.entities.PlatformConnection.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PlatformConnection.create({ ...data, business_id: bid, last_checked: new Date().toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platform-connections'] }); setOpen(false); setForm(empty); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlatformConnection.update(id, { ...data, last_checked: new Date().toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platform-connections'] }); setOpen(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PlatformConnection.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-connections'] }),
  });

  const openEdit = (conn) => { setEditing(conn); setForm({ platform_name: conn.platform_name, connection_status: conn.connection_status, connection_type: conn.connection_type, notes: conn.notes || '' }); setOpen(true); };
  const openNew = (preset = null) => { setEditing(null); setForm(preset ? { platform_name: preset.name, connection_status: 'not_connected', connection_type: preset.connection_type, notes: preset.notes } : empty); setOpen(true); };

  const handleSave = () => {
    if (!form.platform_name) return;
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const connectedCount = connections.filter(c => ['connected', 'fallback_active'].includes(c.connection_status)).length;
  const issueCount = connections.filter(c => ['not_connected', 'error', 'api_unavailable'].includes(c.connection_status)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Connection Status"
        description="Track and manage connections to external platforms"
        actions={<Button size="sm" className="gap-1.5 text-xs" onClick={() => openNew()}><Plus className="w-3.5 h-3.5" /> Add Platform</Button>}
      />

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg border bg-card text-center">
          <p className="text-xl font-bold">{connections.length}</p>
          <p className="text-[10px] text-muted-foreground">Total Platforms</p>
        </div>
        <div className="p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20 text-center">
          <p className="text-xl font-bold text-emerald-600">{connectedCount}</p>
          <p className="text-[10px] text-muted-foreground">Connected</p>
        </div>
        <div className="p-3 rounded-lg border bg-red-500/5 border-red-500/20 text-center">
          <p className="text-xl font-bold text-red-500">{issueCount}</p>
          <p className="text-[10px] text-muted-foreground">Not Connected</p>
        </div>
      </div>

      {connections.length === 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700"><AlertTriangle className="w-4 h-4" /> No platforms configured yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-amber-700 mb-3">Add the platforms you use so you can track connection status. Quick-add known platforms below:</p>
            <div className="flex flex-wrap gap-2">
              {KNOWN_PLATFORMS.map(p => (
                <Button key={p.name} size="sm" variant="outline" className="text-xs h-7" onClick={() => openNew(p)}>{p.name}</Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {connections.map(conn => (
          <Card key={conn.id}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {['connected', 'fallback_active'].includes(conn.connection_status)
                  ? <Wifi className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <WifiOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{conn.platform_name}</p>
                  {conn.notes && <p className="text-[10px] text-muted-foreground truncate">{conn.notes}</p>}
                  {conn.last_checked && <p className="text-[10px] text-muted-foreground">Last updated: {format(new Date(conn.last_checked), 'dd MMM yyyy HH:mm')}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge status={conn.connection_status} />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(conn)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(conn.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(empty); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">{editing ? 'Edit Platform Connection' : 'Add Platform Connection'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium mb-1 block">Platform Name</label>
              <Input value={form.platform_name} onChange={e => setForm(f => ({ ...f, platform_name: e.target.value }))} placeholder="e.g. Facebook Groups" className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Status</label>
                <Select value={form.connection_status} onValueChange={v => setForm(f => ({ ...f, connection_status: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="connected">Connected</SelectItem>
                    <SelectItem value="not_connected">Not Connected</SelectItem>
                    <SelectItem value="requires_authorised_connection">Requires Auth</SelectItem>
                    <SelectItem value="manual_monitoring_only">Manual Only</SelectItem>
                    <SelectItem value="api_unavailable">API Unavailable</SelectItem>
                    <SelectItem value="terms_restricted">Terms Restricted</SelectItem>
                    <SelectItem value="fallback_active">Fallback Active</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Connection Type</label>
                <Select value={form.connection_type} onValueChange={v => setForm(f => ({ ...f, connection_type: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="oauth">OAuth</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="rss">RSS</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Notes / Setup Instructions</label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Requires API key set in secrets..." className="text-xs min-h-[80px]" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" className="text-xs" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? 'Save Changes' : 'Add Platform'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}