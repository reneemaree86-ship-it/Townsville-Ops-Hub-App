import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44, base44Agent } from '@/base44Client';
import PageHeader from '@/PageHeader';
import StatusBadge from '@/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/card';
import { Button } from '@/button';
import { Input } from '@/input';
import { Textarea } from '@/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/dialog';
import { Wifi, WifiOff, Plus, Pencil, Trash2, AlertTriangle, RefreshCw, Facebook, Loader2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Matches the real PlatformConnection entity schema exactly:
// platform (enum), status (enum), last_checked_at, last_successful_at,
// error_message, scopes (array), account_label, notes, business_id, external_id, access_token

const PLATFORM_LABELS = {
  facebook: 'Facebook',
  google: 'Google (Search/Analytics)',
  gumtree: 'Gumtree',
  airtasker: 'Airtasker',
  townsville_noticeboard: 'Townsville Noticeboard',
  instagram: 'Instagram',
  stripe: 'Stripe',
  google_sheets: 'Google Sheets',
  google_search_console: 'Google Search Console',
  gmail: 'Gmail',
  github: 'GitHub',
  other: 'Other',
};

const PLATFORM_OPTIONS = Object.keys(PLATFORM_LABELS);

const STATUS_OPTIONS = ['connected', 'disconnected', 'error', 'pending'];

const KNOWN_PLATFORM_DEFAULTS = [
  { platform: 'gumtree', notes: 'No public API available. Monitored manually via URL Watchlist.' },
  { platform: 'google_search_console', notes: 'Requires Google Search Console OAuth for organic traffic and SEO data.' },
  { platform: 'google', notes: 'Google Search / Analytics for lead scanning and traffic insights.' },
  { platform: 'airtasker', notes: 'No public API available. Monitored manually via URL Watchlist.' },
  { platform: 'townsville_noticeboard', notes: 'Manual monitoring only. Add URLs to Watchlist.' },
  { platform: 'stripe', notes: 'Requires Stripe secret key for invoicing and financial reporting.' },
  { platform: 'google_sheets', notes: 'Requires Google Sheets OAuth for quarterly financial reports.' },
  { platform: 'gmail', notes: 'Requires Gmail OAuth for sending lead replies and notifications.' },
  { platform: 'github', notes: 'Requires GitHub OAuth for app code sync and backups.' },
  { platform: 'instagram', notes: 'Requires Instagram/Meta OAuth for DMs and lead monitoring.' },
];

const empty = { platform: '', status: 'pending', account_label: '', notes: '', error_message: '', business_id: '' };

const FB_APP_ID = '1836147090686861';
const FB_SCOPES = 'pages_show_list,leads_retrieval,pages_messaging,pages_read_engagement,pages_manage_metadata,pages_utility_messaging,business_management';
// Must exactly match the URI whitelisted in Meta Developer Console.
// Using window.location.origin so it works on both townsvillebusinesshub.online
// and the pages.dev preview URL — both must be listed in Meta App Dashboard > OAuth settings.
const FB_REDIRECT_URI = (typeof window !== 'undefined' ? window.location.origin : 'https://townsvillebusinesshub.online') + '/';

function FacebookConnectCard({ bid }) {
  const qc = useQueryClient();
  const [pagePicker, setPagePicker] = useState({ open: false, pages: [] });

  const { data: fbConnection } = useQuery({
    queryKey: ['platform-connections', 'facebook'],
    queryFn: async () => {
      const all = await base44.entities.PlatformConnection.filter({ platform: 'facebook' });
      return all?.[0] || null;
    },
  });

  const exchangeMutation = useMutation({
    mutationFn: (code) => base44Agent.functions.invoke('facebookOAuthExchange', {
      code,
      redirect_uri: FB_REDIRECT_URI,
    }),
    onSuccess: (res) => {
      // Base44 SDK: axios response body is in res.data; our function returns { pages: [...] }
      const pages = res?.data?.pages ?? res?.pages ?? [];
      if (!pages.length) {
        toast.error("No Facebook Pages found. Make sure you are an admin of the Renee's Cleaning Services Facebook Page.");
        return;
      }
      setPagePicker({ open: true, pages });
    },
    onError: (err) => {
      // Extract the real error from the axios response body (Base44 SDK wraps it in err.response.data)
      const detail = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Unknown error';
      toast.error('Facebook connection failed: ' + detail);
    },
  });

  useEffect(() => {
    const pendingCode = sessionStorage.getItem('fb_oauth_code');
    if (!pendingCode) return;
    // Guard: remove BEFORE calling mutate so a double-fire (React StrictMode) is a no-op
    sessionStorage.removeItem('fb_oauth_code');
    exchangeMutation.mutate(pendingCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectPageMutation = useMutation({
    mutationFn: async (page) => {
      // Step 1: Use the agent app function to verify token + subscribe FB webhooks
      const result = await base44Agent.functions.invoke('facebookConnectPage', {
        page_id: page.id,
        page_name: page.name,
        page_access_token: page.access_token,
        business_id: bid,
      });
      const res = result?.data ?? result;

      // Step 2: Write the PlatformConnection record to THIS app's (Ops Hub) database
      const connectionData = {
        business_id: bid || null,
        platform: 'facebook',
        status: 'connected',
        external_id: page.id,
        account_label: page.name,
        access_token: page.access_token,
        token_expires_at: res?.token_expires_at || null,
        scopes: res?.scopes || [],
        notes: `Connected ${new Date().toISOString()}. Webhooks: ${res?.webhooks_subscribed ?? false}. Fans: ${res?.fan_count ?? 'unknown'}.`,
        last_successful_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
        error_message: null,
      };
      const existing = await base44.entities.PlatformConnection.filter({ platform: 'facebook', external_id: page.id });
      if (existing?.length > 0) {
        await base44.entities.PlatformConnection.update(existing[0].id, connectionData);
      } else {
        await base44.entities.PlatformConnection.create(connectionData);
      }
      return res;
    },
    onSuccess: () => {
      toast.success('Facebook Page connected — leads and Messenger events will now flow in.');
      setPagePicker({ open: false, pages: [] });
      qc.invalidateQueries({ queryKey: ['platform-connections'] });
    },
    onError: (err) => {
      const detail = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Unknown error';
      toast.error('Failed to connect Page: ' + detail);
    },
  });

  const startOAuth = () => {
    const redirectUri = FB_REDIRECT_URI;
    const url = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(FB_SCOPES)}&response_type=code&state=fb_connect`;
    window.location.href = url;
  };

  const isConnected = fbConnection?.status === 'connected';

  return (
    <Card className={isConnected ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-blue-500/30 bg-blue-500/5'}>
      <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Facebook className={`w-5 h-5 flex-shrink-0 ${isConnected ? 'text-emerald-600' : 'text-blue-600'}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Facebook Login</p>
              {fbConnection && <StatusBadge status={fbConnection.status} />}
            </div>
            {isConnected ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                Connected Page: <span className="font-medium">{fbConnection.account_label}</span>
                {fbConnection.last_successful_at && ` · since ${format(new Date(fbConnection.last_successful_at), 'dd MMM yyyy HH:mm')}`}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect your Renee's Cleaning Services Facebook Page to receive Lead Ads and Messenger messages directly in the Business Inbox.
              </p>
            )}
            {fbConnection?.status === 'error' && fbConnection.error_message && (
              <p className="text-[10px] text-red-500 mt-0.5">Error: {fbConnection.error_message}</p>
            )}
          </div>
        </div>
        <Button
          size="sm"
          className="text-xs gap-1.5 flex-shrink-0"
          onClick={startOAuth}
          disabled={exchangeMutation.isPending || connectPageMutation.isPending}
        >
          {(exchangeMutation.isPending || connectPageMutation.isPending) ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting…</>
          ) : isConnected ? (
            <><RefreshCw className="w-3.5 h-3.5" /> Reconnect Facebook</>
          ) : (
            <><Facebook className="w-3.5 h-3.5" /> Connect Facebook</>
          )}
        </Button>
      </CardContent>

      <Dialog open={pagePicker.open} onOpenChange={(v) => setPagePicker(p => ({ ...p, open: v }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Select the Facebook Page to connect</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {pagePicker.pages.map((p) => (
              <button
                key={p.id}
                onClick={() => connectPageMutation.mutate(p)}
                disabled={connectPageMutation.isPending}
                className="w-full text-left p-3 rounded-lg border hover:border-primary hover:bg-accent transition-colors flex items-center justify-between gap-2"
              >
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.category} · ID {p.id}</p>
                </div>
                {connectPageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-muted-foreground" />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

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

  const invalidate = () => qc.invalidateQueries({ queryKey: ['platform-connections'] });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PlatformConnection.create({ ...data, business_id: bid, last_checked_at: new Date().toISOString() }),
    onSuccess: () => { invalidate(); setOpen(false); setForm(empty); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlatformConnection.update(id, { ...data, last_checked_at: new Date().toISOString() }),
    onSuccess: () => { invalidate(); setOpen(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PlatformConnection.delete(id),
    onSuccess: invalidate,
  });

  const refreshCheckMutation = useMutation({
    mutationFn: (conn) => {
      const now = new Date().toISOString();
      const patch = { last_checked_at: now };
      if (conn.status === 'connected') patch.last_successful_at = now;
      return base44.entities.PlatformConnection.update(conn.id, patch);
    },
    onSuccess: invalidate,
  });

  const openEdit = (conn) => {
    setEditing(conn);
    setForm({
      platform: conn.platform || '',
      status: conn.status || 'pending',
      account_label: conn.account_label || '',
      notes: conn.notes || '',
      error_message: conn.error_message || '',
    });
    setOpen(true);
  };

  const openNew = (preset = null) => {
    setEditing(null);
    setForm(preset ? { ...empty, platform: preset.platform, notes: preset.notes } : empty);
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.platform) return;
    const data = {
      platform: form.platform,
      status: form.status,
      account_label: form.account_label,
      notes: form.notes,
      error_message: form.status === 'error' ? form.error_message : '',
    };
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  const nonFacebookConnections = connections.filter(c => c.platform !== 'facebook');
  const connectedCount = connections.filter(c => c.status === 'connected').length;
  const issueCount = connections.filter(c => c.status !== 'connected').length;

  const availablePresets = KNOWN_PLATFORM_DEFAULTS.filter(
    p => !connections.some(c => c.platform === p.platform)
  );

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
          <p className="text-[10px] text-muted-foreground">Needs Attention</p>
        </div>
      </div>

      <FacebookConnectCard bid={bid} />

      {connections.length === 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700"><AlertTriangle className="w-4 h-4" /> No other platforms configured yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-amber-700 mb-3">Add the platforms you use so you can track connection status. Quick-add known platforms below:</p>
            <div className="flex flex-wrap gap-2">
              {KNOWN_PLATFORM_DEFAULTS.map(p => (
                <Button key={p.platform} size="sm" variant="outline" className="text-xs h-7" onClick={() => openNew(p)}>{PLATFORM_LABELS[p.platform]}</Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {connections.length > 0 && availablePresets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Quick-add:</span>
          {availablePresets.map(p => (
            <Button key={p.platform} size="sm" variant="outline" className="text-xs h-6 px-2" onClick={() => openNew(p)}>
              + {PLATFORM_LABELS[p.platform]}
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-3">
        {nonFacebookConnections.map(conn => (
          <Card key={conn.id}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {conn.status === 'connected'
                  ? <Wifi className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <WifiOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{PLATFORM_LABELS[conn.platform] || conn.platform}</p>
                    {conn.account_label && <span className="text-[10px] text-muted-foreground">· {conn.account_label}</span>}
                  </div>
                  {conn.notes && <p className="text-[10px] text-muted-foreground mt-0.5 max-w-xl">{conn.notes}</p>}
                  {conn.status === 'error' && conn.error_message && (
                    <p className="text-[10px] text-red-500 mt-0.5">Error: {conn.error_message}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {conn.last_checked_at ? `Last checked: ${format(new Date(conn.last_checked_at), 'dd MMM yyyy HH:mm')}` : 'Never checked'}
                    {conn.last_successful_at ? ` · Last successful: ${format(new Date(conn.last_successful_at), 'dd MMM yyyy HH:mm')}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge status={conn.status} />
                <Button size="icon" variant="ghost" className="h-7 w-7" title="Refresh check timestamp" onClick={() => refreshCheckMutation.mutate(conn)}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Platform</label>
                <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))} disabled={!!editing}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select platform" /></SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map(p => (
                      <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Account Label</label>
              <Input value={form.account_label} onChange={e => setForm(f => ({ ...f, account_label: e.target.value }))} placeholder="e.g. reneescleaningservices.tsv@gmail.com" className="h-8 text-xs" />
            </div>
            {form.status === 'error' && (
              <div>
                <label className="text-xs font-medium mb-1 block">Error Message</label>
                <Input value={form.error_message} onChange={e => setForm(f => ({ ...f, error_message: e.target.value }))} placeholder="What's going wrong" className="h-8 text-xs" />
              </div>
            )}
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
