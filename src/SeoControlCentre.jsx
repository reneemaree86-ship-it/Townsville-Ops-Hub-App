import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import StatCard from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, AlertTriangle, Info } from 'lucide-react';
import { format } from 'date-fns';

export default function SeoControlCentre() {
  const { activeBusiness } = useOutletContext();
  const bid = activeBusiness?.id;
  const qc = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: audits = [] } = useQuery({
    queryKey: ['audits', bid],
    queryFn: () => bid ? base44.entities.SeoScanResult.filter({ business_id: bid }, '-created_date', 20) : [],
    enabled: !!bid,
  });

  const { data: issues = [] } = useQuery({
    queryKey: ['seo-issues', bid],
    queryFn: () => bid ? base44.entities.SeoIssue.filter({ business_id: bid }, '-created_date', 100) : [],
    enabled: !!bid,
  });

  const auditMutation = useMutation({
    mutationFn: () => base44.functions.invoke('runSeoAudit', { business_id: bid, website_url: activeBusiness.website_url }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audits'] });
      qc.invalidateQueries({ queryKey: ['seo-issues'] });
    },
  });

  const updateIssueMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SeoIssue.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seo-issues'] }),
  });

  const filteredIssues = issues.filter(i => {
    if (severityFilter !== 'all' && i.severity !== severityFilter) return false;
    if (typeFilter !== 'all' && i.issue_type !== typeFilter) return false;
    return true;
  });

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const openCount = issues.filter(i => i.fix_status === 'open').length;
  const lastAudit = audits[0];

  if (!activeBusiness) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="SEO Control Centre"
        description={`Audit and monitor SEO for ${activeBusiness.website_url}`}
        business={activeBusiness}
        actions={
          <Button onClick={() => auditMutation.mutate()} disabled={auditMutation.isPending} className="gap-2">
            {auditMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {auditMutation.isPending ? 'Crawling...' : 'Run SEO Audit'}
          </Button>
        }
      />

      {auditMutation.isError && <Card className="border-red-500/30 bg-red-500/5"><CardContent className="p-3"><p className="text-xs text-red-600">Audit failed: {auditMutation.error?.message}</p></CardContent></Card>}
      {auditMutation.isSuccess && (
        <Card className="border-emerald-500/30 bg-emerald-500/5"><CardContent className="p-3">
          <p className="text-xs text-emerald-600">Audit complete: {auditMutation.data?.data?.pages_crawled} pages crawled, {issues.length} issues found</p>
        </CardContent></Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Issues" value={issues.length} icon={AlertTriangle} color="text-red-500" />
        <StatCard label="Critical" value={criticalCount} icon={AlertTriangle} color="text-red-600" />
        <StatCard label="Warnings" value={warningCount} icon={Info} color="text-amber-500" />
        <StatCard label="Open Issues" value={openCount} icon={Search} color="text-blue-500" />
      </div>

      {lastAudit && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Latest Audit</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={lastAudit.status} /></div>
              <div><span className="text-muted-foreground">Pages:</span> <span className="font-medium ml-1">{lastAudit.pages_crawled}</span></div>
              <div><span className="text-muted-foreground">Issues:</span> <span className="font-medium ml-1">{lastAudit.issues_found}</span></div>
              <div><span className="text-muted-foreground">Duration:</span> <span className="font-medium ml-1">{lastAudit.duration_seconds}s</span></div>
              <div><span className="text-muted-foreground">Date:</span> <span className="font-medium ml-1">{format(new Date(lastAudit.created_date), 'dd MMM yyyy HH:mm')}</span></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm">SEO Issues</CardTitle>
            <div className="flex gap-2">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="meta_title">Meta Title</SelectItem>
                  <SelectItem value="meta_description">Meta Description</SelectItem>
                  <SelectItem value="heading_structure">Headings</SelectItem>
                  <SelectItem value="image_alt">Image Alt</SelectItem>
                  <SelectItem value="schema_markup">Schema</SelectItem>
                  <SelectItem value="local_seo">Local SEO</SelectItem>
                  <SelectItem value="sitemap">Sitemap</SelectItem>
                  <SelectItem value="robots_txt">Robots.txt</SelectItem>
                  <SelectItem value="mobile_usability">Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Severity</TableHead>
                  <TableHead className="text-[10px]">Type</TableHead>
                  <TableHead className="text-[10px]">Description</TableHead>
                  <TableHead className="text-[10px]">Page</TableHead>
                  <TableHead className="text-[10px]">Recommended Fix</TableHead>
                  <TableHead className="text-[10px]">Status</TableHead>
                  <TableHead className="text-[10px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIssues.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">
                    {issues.length === 0 ? 'No issues found yet. Run an SEO audit to start.' : 'No issues match filters.'}
                  </TableCell></TableRow>
                ) : (
                  filteredIssues.map(issue => (
                    <TableRow key={issue.id}>
                      <TableCell><StatusBadge status={issue.severity} /></TableCell>
                      <TableCell className="text-[10px] capitalize">{issue.issue_type?.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="text-xs max-w-[200px]">
                        <p className="truncate">{issue.description}</p>
                        {issue.current_value && <p className="text-[10px] text-muted-foreground truncate">Current: {issue.current_value}</p>}
                      </TableCell>
                      <TableCell className="text-[10px] max-w-[120px] truncate">{issue.page_url}</TableCell>
                      <TableCell className="text-[10px] max-w-[180px]"><p className="truncate">{issue.recommended_fix}</p></TableCell>
                      <TableCell><StatusBadge status={issue.fix_status} /></TableCell>
                      <TableCell>
                        {issue.fix_status === 'open' && (
                          <Button variant="outline" size="sm" className="h-6 text-[10px]"
                            onClick={() => updateIssueMutation.mutate({ id: issue.id, data: { fix_status: 'manual_action_required' } })}>
                            Mark Task
                          </Button>
                        )}
                        {issue.fix_status === 'manual_action_required' && (
                          <Button variant="outline" size="sm" className="h-6 text-[10px] text-emerald-600"
                            onClick={() => updateIssueMutation.mutate({ id: issue.id, data: { fix_status: 'fixed', date_fixed: new Date().toISOString() } })}>
                            Mark Fixed
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
