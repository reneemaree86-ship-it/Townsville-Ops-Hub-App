import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import StatCard from '@/components/shared/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import LeadDetailModal from '@/components/leads/LeadDetailModal';
import ScanLogPanel from '@/components/leads/ScanLogPanel';
import { UserSearch, Loader2, Plus, Clipboard, Search, Flame, AlertTriangle, CheckCircle2, XCircle, Settings } from 'lucide-react';

const SERVICE_TYPES = ['deep_clean','fortnightly','weekly','office_cleaning','commercial','hoarder_heavy','inspection_rescue','one_off_urgent','airbnb_shortstay','window_cleaning','pressure_washing','move_in','general_residential','business_commercial','other'];
const STATUS_FILTERS = ['all','new','hot','needs_approval','draft_ready','applied_responded','follow_up_due','won','lost'];

export default function LeadFinder() {
  const { activeBusiness } = useOutletContext();
  const bid = activeBusiness?.id;
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [parseOpen, setParseOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteSource, setPasteSource] = useState('facebook');
  const [parsedResult, setParsedResult] = useState(null);
  const [latestScanLog, setLatestScanLog] = useState(null);
  const [manualForm, setManualForm] = useState({
    name: '', contact_details: '', source: 'manual_import',
    service_needed: '', service_type: 'other',
    suburb: '', urgency: 'medium', notes: '', source_url: '',
  });


  const { data: leads = [] } = useQuery({
    queryKey: ['leads', bid],
    queryFn: () => bid ? base44.entities.Lead.filter({ business_id: bid }, '-created_date', 200) : [],
    enabled: !!bid,
  });

  const { data: scans = [] } = useQuery({
    queryKey: ['scans', bid],
    queryFn: () => bid ? base44.entities.LeadScan.filter({ business_id: bid }, '-created_date', 20) : [],
    enabled: !!bid,
  });

  const findMutation = useMutation({
    mutationFn: () => base44.functions.invoke('findLeads', { business_id: bid }),
    onSuccess: (res) => {
      setLatestScanLog(res.data?.scan_log || null);
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['scans'] });
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

  const emptyManualForm = {
    name: '', contact_details: '', source: 'manual_import',
    service_needed: '', service_type: 'other',
    suburb: '', urgency: 'medium', notes: '', source_url: '',
  };

  const saveManualMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.create({ ...data, business_id: bid, score: 50, status: 'new' }),
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
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="facebook_groups">Facebook Group</SelectItem>
                        <SelectItem value="gumtree">Gumtree</SelectItem>
                        <SelectItem value="airtasker">Airtasker</SelectItem>
                        <SelectItem value="community_noticeboard">Community Noticeboard</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
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
                  {parsedResult && (
                    <Card className="bg-muted/50">
                      <CardContent className="p-3 space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div><span className="text-muted-foreground">Name:</span> {parsedResult.name || 'Unknown'}</div>
                          <div><span className="text-muted-foreground">Service:</span> {parsedResult.service_needed}</div>
                          <div><span className="text-muted-foreground">Suburb:</span> {parsedResult.suburb || 'Not specified'}</div>
                          <div><span className="text-muted-foreground">Score:</span> <strong>{parsedResult.lead_score}/100</strong></div>
                          <div><span className="text-muted-foreground">Urgency:</span> <StatusBadge status={parsedResult.urgency} /></div>
                          <div><span className="text-muted-foreground">Est. Value:</span> ${parsedResult.estimated_value || 0}</div>
                        </div>
                        {parsedResult.score_reasoning && <p className="text-[10px] text-muted-foreground italic">{parsedResult.score_reasoning}</p>}
                        {parsedResult.response_draft && (
                          <div>
                            <p className="text-muted-foreground mb-1 text-[10px]">Draft Response:</p>
                            <p className="bg-card p-2 rounded text-[10px] whitespace-pre-wrap">{parsedResult.response_draft}</p>
                          </div>
                        )}
                        <Button size="sm" className="w-full" disabled={saveParsedMutation.isPending} onClick={() => saveParsedMutation.mutate({
                          business_id: bid,
                          name: parsedResult.name || 'Unknown',
                          source: pasteSource,
                          service_needed: parsedResult.service_needed || 'Cleaning',
                          service_type: parsedResult.service_type || 'other',
                          suburb: parsedResult.suburb || '',
                          urgency: ['low','medium','high','urgent'].includes(parsedResult.urgency) ? parsedResult.urgency : 'medium',
                          original_post_text: pasteText,
                          budget_clues: parsedResult.budget_clues || '',
                          contact_method: parsedResult.contact_method || '',
                          contact_details: parsedResult.contact_details || '',
                          estimated_value: parsedResult.estimated_value || 0,
                          repeat_potential: parsedResult.repeat_potential || 'one_off',
                          score: parsedResult.lead_score || 50,
                          status: (parsedResult.lead_score || 50) >= 70 ? 'hot' : 'new',
                          response_draft: parsedResult.response_draft || '',
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
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Name</Label><Input value={manualForm.name} onChange={e => setManualForm({...manualForm, name: e.target.value})} className="h-8 text-xs mt-1" /></div>
                    <div><Label className="text-xs">Contact</Label><Input value={manualForm.contact_details} onChange={e => setManualForm({...manualForm, contact_details: e.target.value})} className="h-8 text-xs mt-1" placeholder="Phone / email" /></div>
                  </div>
                  <div><Label className="text-xs">Service Needed</Label><Input value={manualForm.service_needed} onChange={e => setManualForm({...manualForm, service_needed: e.target.value})} className="h-8 text-xs mt-1" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Service Type</Label>
                      <Select value={manualForm.service_type} onValueChange={v => setManualForm({...manualForm, service_type: v})}>
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{SERVICE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Urgency</Label>
                      <Select value={manualForm.urgency} onValueChange={v => setManualForm({...manualForm, urgency: v})}>
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Suburb</Label><Input value={manualForm.suburb} onChange={e => setManualForm({...manualForm, suburb: e.target.value})} className="h-8 text-xs mt-1" /></div>
                    <div><Label className="text-xs">Source URL</Label><Input value={manualForm.source_url} onChange={e => setManualForm({...manualForm, source_url: e.target.value})} className="h-8 text-xs mt-1" /></div>
                  </div>
                  <div><Label className="text-xs">Notes</Label><Textarea value={manualForm.notes} onChange={e => setManualForm({...manualForm, notes: e.target.value})} rows={3} className="text-xs mt-1" /></div>
                  <Button className="w-full" onClick={() => saveManualMutation.mutate(manualForm)} disabled={saveManualMutation.isPending || !manualForm.service_needed}>
                    {saveManualMutation.isPending ? 'Saving...' : 'Save Lead'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button onClick={() => findMutation.mutate()} disabled={findMutation.isPending} className="gap-2">
              {findMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserSearch className="w-4 h-4" />}
              {findMutation.isPending ? 'Scanning...' : 'Run Lead Scan'}
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
          <p className="text-xs font-semibold">
            Last Scan: {findMutation.data?.data?.leads_found || 0} lead{findMutation.data?.data?.leads_found !== 1 ? 's' : ''} found
            {findMutation.data?.data?.hot_leads_found > 0 && <span className="text-orange-600"> ({findMutation.data.data.hot_leads_found} hot)</span>}
          </p>
          {latestScanLog.map((entry, i) => {
            const isError = entry.status === 'error';
            const isSetup = entry.status === 'manual_setup_required';
            const isOk = entry.status === 'completed' && !isError;
            return (
              <Card key={i} className={`border ${isError ? 'border-red-500/40 bg-red-500/5' : isSetup ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
                <CardContent className="p-3 flex items-start gap-2.5">
                  {isError ? <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" /> :
                   isSetup ? <Settings className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" /> :
                   <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${isError ? 'text-red-700' : isSetup ? 'text-amber-700' : 'text-emerald-700'}`}>{entry.source}</p>
                    <p className={`text-[10px] mt-0.5 ${isError ? 'text-red-600' : isSetup ? 'text-amber-600' : 'text-emerald-600'}`}>{entry.message}</p>
                    {isError && entry.source === 'Facebook Group 899656876764631' && (
                      <p className="text-[10px] text-red-700 font-medium mt-1">⚠ Your Facebook access token has expired. Generate a new one at developers.facebook.com and update the FACEBOOK_ACCESS_TOKEN secret in Dashboard → Settings → Environment Variables.</p>
                    )}
                    {isSetup && entry.source === 'Gumtree' && (
                      <p className="text-[10px] text-amber-700 font-medium mt-1">Get a free API key at scrapingbee.com and add it as SCRAPING_API_KEY in Dashboard → Settings → Environment Variables.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!findMutation.isSuccess && !findMutation.isPending && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-3 space-y-2">
            <p className="text-xs font-medium text-amber-800 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Lead source setup status</p>
            <div className="space-y-1.5 text-[10px] text-amber-700">
              <p><strong>✓ URL Watchlist:</strong> Active — but no URLs added yet. Go to the Watchlist page and add Gumtree, Facebook, or community board URLs to monitor.</p>
              <p><strong>⚠ Facebook Groups:</strong> Requires a valid FACEBOOK_ACCESS_TOKEN + FACEBOOK_GROUP_IDS in Settings → Environment Variables. Current token is expired.</p>
              <p><strong>⚠ Gumtree:</strong> Requires SCRAPING_API_KEY from scrapingbee.com in Settings → Environment Variables.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Leads" value={leads.length} icon={UserSearch} />
        <StatCard label="Hot Leads" value={leads.filter(l => l.status === 'hot').length} icon={Flame} color="text-orange-500" />
        <StatCard label="New" value={leads.filter(l => l.status === 'new').length} icon={Plus} color="text-blue-500" />
        <StatCard label="Won" value={leads.filter(l => l.status === 'won').length} icon={Search} color="text-emerald-500" />
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
                  ? 'No leads yet. Run a Lead Scan, or use Paste and Parse to manually import a lead.'
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
                      <span className="text-sm font-semibold truncate">{lead.service_needed}</span>
                      <StatusBadge status={lead.status} />
                      <StatusBadge status={lead.urgency} />
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground flex-wrap">
                      {lead.name && lead.name !== 'Unknown' && <span className="font-medium">{lead.name}</span>}
                      {lead.suburb && <span>{lead.suburb}</span>}
                      <span>via {lead.source?.replace(/_/g, ' ')}</span>
                      {lead.estimated_value > 0 && <span className="text-emerald-600 font-medium">${lead.estimated_value}</span>}
                      <span>Score: {lead.score}/100</span>
                    </div>
                    {lead.original_post_text && (
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{lead.original_post_text}</p>
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