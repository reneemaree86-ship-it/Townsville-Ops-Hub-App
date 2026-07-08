import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/base44Client';
import PageHeader from '@/PageHeader';
import StatusBadge from '@/StatusBadge';
import StatCard from '@/StatCard';
import { Card, CardContent } from '@/card';
import { Button } from '@/button';
import { Input } from '@/input';
import { Textarea } from '@/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/dialog';
import { Label } from '@/label';
import { Badge } from '@/badge';
import LeadDetailModal from '@/LeadDetailModal';
import ScanLogPanel from '@/ScanLogPanel';
import { UserSearch, Loader2, Plus, Clipboard, Search, Flame, AlertTriangle, CheckCircle2, XCircle, Settings } from 'lucide-react';

const STATUS_FILTERS = ['all','new','scored','needs_approval','draft_ready','contacted','follow_up_due','converted','closed','rejected'];

const URGENCY_OPTIONS = [
  { value: 'flexible', label: 'Flexible' },
  { value: 'this_week', label: 'This Week' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'unknown', label: 'Unknown' },
];

export default function LeadFinder() {
  const { activeBusiness } = useOutletContext();
  const bid = activeBusiness?.id;
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [parseOpen, setParseOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteSource, setPasteSource] = useState('Facebook');
  const [parsedResult, setParsedResult] = useState(null);
  const [latestScanLog, setLatestScanLog] = useState(null);
  const emptyManualForm = {
    name: '', contact_phone: '', contact_email: '',
    service_type: '', suburb: '', urgency: 'unknown',
    notes: '', source_url: '',
  };
  const [manualForm, setManualForm] = useState(emptyManualForm);

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', bid],
    queryFn: () => bid ? base44.entities.Lead.filter({ business_id: bid }, '-created_date', 200) : [],
    enabled: !!bid,
  });

  // Aggregate scan-session history lives on AgentRun (one row per scan run), not LeadScanResult
  // (LeadScanResult is a per-candidate log — see Scan History page fix).
  const { data: scans = [] } = useQuery({
    queryKey: ['agent-runs', bid],
    queryFn: () => bid ? base44.entities.AgentRun.filter({ business_id: bid }, '-started_at', 20) : [],
    enabled: !!bid,
  });

  const findMutation = useMutation({
    mutationFn: () => base44.functions.invoke('findLeads', { business_id: bid }),
    onSuccess: (res) => {
      setLatestScanLog(res.data?.scan_log || null);
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['agent-runs'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const parseMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('parseLead', data),
    onSuccess: (res) => setParsedResult(res.data),
  });

  const saveParsedMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      setParsedResult(null); setPasteText(''); setParseOpen(false);
    },
  });

  const saveManualMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.create({
      ...data,
      business_id: bid,
      source_platform: 'Manual Entry',
      lead_score: 50,
      status: 'new',
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); setImportOpen(false); setManualForm(emptyManualForm); },
  });

  const filteredLeads = leads.filter(l => statusFilter === 'all' || l.status === statusFilter);

  if (!activeBusiness) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Finder"
        description="Real cleaning lead detection and management for Townsville"
        business={activeBusiness}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Dialog open={parseOpen} onOpenChange={setParseOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Clipboard className="w-3.5 h-3.5" /> Paste and Parse
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle className="text-sm">Paste Lead Parser</DialogTitle></DialogHeader>
                <p className="text-[10px] text-muted-foreground">Copy a Facebook post, Gumtree listing, or message and paste it here. AI will extract and score the lead instantly.</p>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Source</Label>
                    <Select value={pasteSource} onValueChange={setPasteSource}>
                      <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Facebook">Facebook</SelectItem>
                        <SelectItem value="Facebook Groups">Facebook Group</SelectItem>
                        <SelectItem value="Gumtree">Gumtree</SelectItem>
                        <SelectItem value="Airtasker">Airtasker</SelectItem>
                        <SelectItem value="Community Noticeboard">Community Noticeboard</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Paste the post or message</Label>
                    <Textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={6} className="text-xs mt-1" placeholder="Paste the full post text here..." />
                  </div>
                  <Button onClick={() => parseMutation.mutate({ business_id: bid, text: pasteText, source: pasteSource })} disabled={parseMutation.isPending || !pasteText.trim()} className="w-full gap-2">
                    {parseMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {parseMutation.isPending ? 'Analysing...' : 'Analyse Lead'}
                  </Button>
                  {parseMutation.isError && (
                    <p className="text-[10px] text-red-600">{parseMutation.error?.message}</p>
                  )}
                  {parsedResult && (
                    <Card className="bg-muted/50">
                      <CardContent className="p-3 space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div><span className="text-muted-foreground">Name:</span> {parsedResult.name || 'Unknown'}</div>
                          <div><span className="text-muted-foreground">Service:</span> {parsedResult.service_type}</div>
                          <div><span className="text-muted-foreground">Suburb:</span> {parsedResult.suburb || 'Not specified'}</div>
                          <div><span className="text-muted-foreground">Score:</span> <strong>{parsedResult.lead_score}/100</strong></div>
                          <div><span className="text-muted-foreground">Urgency:</span> <StatusBadge status={parsedResult.urgency} /></div>
                          <div><span className="text-muted-foreground">Contact:</span> {parsedResult.contact_phone || parsedResult.contact_email || 'None found'}</div>
                        </div>
                        {parsedResult.budget_clues && <p className="text-[10px] text-muted-foreground italic">Budget signals: {parsedResult.budget_clues}</p>}
                        {parsedResult.score_rationale && <p className="text-[10px] text-muted-foreground italic">{parsedResult.score_rationale}</p>}
                        {parsedResult.manual_approval_required && (
                          <p className="text-[10px] text-amber-700 font-medium">Flagged for manual approval (bond/NDIS/DVA/hazardous/hoarder job).</p>
                        )}
                        {parsedResult.response_draft && (
                          <div>
                            <p className="text-muted-foreground mb-1 text-[10px]">Draft Response:</p>
                            <p className="bg-card p-2 rounded text-[10px] whitespace-pre-wrap">{parsedResult.response_draft}</p>
                          </div>
                        )}
                        <Button size="sm" className="w-full" disabled={saveParsedMutation.isPending} onClick={() => saveParsedMutation.mutate({
                          business_id: bid,
                          name: parsedResult.name || 'Unknown',
                          source_platform: pasteSource,
                          service_type: parsedResult.service_type || 'Cleaning',
                          suburb: parsedResult.suburb || '',
                          urgency: ['flexible','this_week','urgent','unknown'].includes(parsedResult.urgency) ? parsedResult.urgency : 'unknown',
                          original_text: pasteText,
                          budget_clues: parsedResult.budget_clues || '',
                          contact_phone: parsedResult.contact_phone || '',
                          contact_email: parsedResult.contact_email || '',
                          lead_score: parsedResult.lead_score || 50,
                          score_rationale: parsedResult.score_rationale || '',
                          status: 'new',
                          response_draft: parsedResult.response_draft || '',
                          manual_approval_required: !!parsedResult.manual_approval_required,
                          manual_approval_reason: parsedResult.manual_approval_required ? 'Flagged by AI parser -- review before contacting.' : '',
                        })}>
                          {saveParsedMutation.isPending ? 'Saving...' : 'Save Lead'}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Add Manually
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="text-sm">Add Lead Manually</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label className="text-xs">Name</Label><Input value={manualForm.name} onChange={e => setManualForm({...manualForm, name: e.target.value})} className="h-8 text-xs mt-1" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Contact Phone</Label><Input value={manualForm.contact_phone} onChange={e => setManualForm({...manualForm, contact_phone: e.target.value})} className="h-8 text-xs mt-1" /></div>
                    <div><Label className="text-xs">Contact Email</Label><Input value={manualForm.contact_email} onChange={e => setManualForm({...manualForm, contact_email: e.target.value})} className="h-8 text-xs mt-1" /></div>
                  </div>
                  <div><Label className="text-xs">Service Needed</Label><Input value={manualForm.service_type} onChange={e => setManualForm({...manualForm, service_type: e.target.value})} className="h-8 text-xs mt-1" placeholder="e.g. Weekly Cleaning, Deep Clean, Bond Clean" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Urgency</Label>
                      <Select value={manualForm.urgency} onValueChange={v => setManualForm({...manualForm, urgency: v})}>
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {URGENCY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Suburb</Label><Input value={manualForm.suburb} onChange={e => setManualForm({...manualForm, suburb: e.target.value})} className="h-8 text-xs mt-1" /></div>
                  </div>
                  <div><Label className="text-xs">Source URL</Label><Input value={manualForm.source_url} onChange={e => setManualForm({...manualForm, source_url: e.target.value})} className="h-8 text-xs mt-1" /></div>
                  <div><Label className="text-xs">Notes</Label><Textarea value={manualForm.notes} onChange={e => setManualForm({...manualForm, notes: e.target.value})} rows={3} className="text-xs mt-1" /></div>
                  <Button className="w-full" onClick={() => saveManualMutation.mutate(manualForm)} disabled={saveManualMutation.isPending || !manualForm.service_type}>
                    {saveManualMutation.isPending ? 'Saving...' : 'Save Lead'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button onClick={() => findMutation.mutate()} disabled={findMutation.isPending} className="gap-2">
              {findMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserSearch className="w-4 h-4" />}
              {findMutation.isPending ? 'Scanning...' : 'Check Lead Sources'}
            </Button>
          </div>
        }
      />

      {findMutation.isError && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-3"><p className="text-xs text-red-600">Scan error: {findMutation.error?.message}</p></CardContent>
        </Card>
      )}

      {findMutation.isSuccess && latestScanLog && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Source check complete -- see log below.</p>
          {latestScanLog.map((entry, i) => {
            const isError = entry.status === 'error';
            const isSetup = entry.status === 'manual_setup_required';
            return (
              <Card key={i} className={`border ${isError ? 'border-red-500/40 bg-red-500/5' : isSetup ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
                <CardContent className="p-3 flex items-start gap-2.5">
                  {isError ? <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" /> :
                   isSetup ? <Settings className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" /> :
                   <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${isError ? 'text-red-700' : isSetup ? 'text-amber-700' : 'text-emerald-700'}`}>{entry.source}</p>
                    <p className={`text-[10px] mt-0.5 ${isError ? 'text-red-600' : isSetup ? 'text-amber-600' : 'text-emerald-600'}`}>{entry.message}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-3 space-y-1.5">
          <p className="text-xs font-medium text-amber-800 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> How leads actually get found</p>
          <p className="text-[10px] text-amber-700">Real Facebook Group leads come from the scheduled daily AI lead scan (6am Brisbane), which reads public posts directly -- Meta does not grant Facebook Groups feed API access to business apps, so the button above can't pull them live. Gumtree requires a scraping service (SCRAPING_API_KEY) to extract listings automatically. Use "Paste and Parse" any time to instantly qualify a lead you've found manually.</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Leads" value={leads.length} icon={UserSearch} />
        <StatCard label="Hot Leads" value={leads.filter(l => (l.lead_score || 0) >= 70 || l.urgency === 'urgent').length} icon={Flame} color="text-orange-500" />
        <StatCard label="New" value={leads.filter(l => l.status === 'new').length} icon={Plus} color="text-blue-500" />
        <StatCard label="Won" value={leads.filter(l => l.status === 'converted').length} icon={Search} color="text-emerald-500" />
      </div>

      <ScanLogPanel scanLog={latestScanLog} scans={scans} />

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(s => (
          <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" className="text-xs h-7 capitalize" onClick={() => setStatusFilter(s)}>
            {s.replace(/_/g, ' ')}
            {s !== 'all' && leads.filter(l => l.status === s).length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[9px] px-1">{leads.filter(l => l.status === s).length}</Badge>
            )}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredLeads.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                {statusFilter === 'all'
                  ? 'No leads yet. Run a source check, or use Paste and Parse to manually import a lead.'
                  : `No leads with status "${statusFilter.replace(/_/g, ' ')}".`}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredLeads.map(lead => (
            <Card key={lead.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setSelectedLead(lead)}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold truncate">{lead.service_type}</span>
                      <StatusBadge status={lead.status} />
                      <StatusBadge status={lead.urgency} />
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground flex-wrap">
                      {lead.name && lead.name !== 'Unknown' && <span className="font-medium">{lead.name}</span>}
                      {lead.suburb && <span>{lead.suburb}</span>}
                      {lead.source_platform && <span>via {lead.source_platform}</span>}
                      <span>Score: {lead.lead_score ?? '-'}/100</span>
                    </div>
                    {lead.original_text && (
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{lead.original_text}</p>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex-shrink-0">
                    {new Date(lead.created_date).toLocaleDateString('en-AU')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selectedLead && (
        <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
}
