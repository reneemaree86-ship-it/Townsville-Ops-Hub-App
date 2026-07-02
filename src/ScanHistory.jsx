import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/base44Client';
import PageHeader from '@/PageHeader';
import StatusBadge from '@/StatusBadge';
import { Card, CardContent } from '@/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/tabs';
import { format } from 'date-fns';

export default function ScanHistory() {
  const { activeBusiness } = useOutletContext();
  const bid = activeBusiness?.id;

  // Real aggregate lead-scan runs (daily 6am scan automation) live in AgentRun,
  // not LeadScanResult (which is a per-candidate log, not a scan session).
  const { data: leadScanRuns = [] } = useQuery({
    queryKey: ['lead-scan-runs', bid],
    queryFn: () => bid ? base44.entities.AgentRun.filter({ business_id: bid }, '-started_at', 50) : [],
    enabled: !!bid,
  });
  const { data: seoAudits = [] } = useQuery({
    queryKey: ['seo-audits', bid],
    queryFn: () => bid ? base44.entities.SeoScanResult.filter({ business_id: bid }, '-created_date', 50) : [],
    enabled: !!bid,
  });

  if (!activeBusiness) return null;

  const durationOf = (startedAt, completedAt) => {
    if (!startedAt || !completedAt) return null;
    const secs = Math.round((new Date(completedAt) - new Date(startedAt)) / 1000);
    return secs >= 0 ? secs : null;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Scan History" description="History of all scans and audits" business={activeBusiness} />
      <Tabs defaultValue="leads">
        <TabsList>
          <TabsTrigger value="leads" className="text-xs">Lead Scans ({leadScanRuns.length})</TabsTrigger>
          <TabsTrigger value="seo" className="text-xs">SEO Audits ({seoAudits.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="leads">
          <Card><CardContent className="p-0"><div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-[10px]">Date</TableHead>
                <TableHead className="text-[10px]">Status</TableHead>
                <TableHead className="text-[10px]">Leads Reviewed</TableHead>
                <TableHead className="text-[10px]">New Leads Saved</TableHead>
                <TableHead className="text-[10px]">Duration</TableHead>
                <TableHead className="text-[10px]">Summary</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {leadScanRuns.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">No lead scans yet.</TableCell></TableRow>
                : leadScanRuns.map(run => {
                  const dur = durationOf(run.started_at, run.completed_at);
                  return (
                    <TableRow key={run.id}>
                      <TableCell className="text-[10px]">{format(new Date(run.started_at || run.created_date), 'dd MMM HH:mm')}</TableCell>
                      <TableCell><StatusBadge status={run.status} /></TableCell>
                      <TableCell className="text-xs font-medium">{run.records_processed ?? 0}</TableCell>
                      <TableCell className="text-xs font-medium text-emerald-600">{run.records_saved ?? 0}</TableCell>
                      <TableCell className="text-[10px]">{dur !== null ? `${dur}s` : '—'}</TableCell>
                      <TableCell className="text-[10px] max-w-[320px] truncate" title={run.result_summary || run.error_message || ''}>
                        {run.result_summary || run.error_message || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div></CardContent></Card>
        </TabsContent>
        <TabsContent value="seo">
          <Card><CardContent className="p-0"><div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-[10px]">Date</TableHead>
                <TableHead className="text-[10px]">Website</TableHead>
                <TableHead className="text-[10px]">Status</TableHead>
                <TableHead className="text-[10px]">Issues</TableHead>
                <TableHead className="text-[10px]">Critical</TableHead>
                <TableHead className="text-[10px]">Duration</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {seoAudits.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">No SEO audits yet.</TableCell></TableRow>
                : seoAudits.map(audit => {
                  const dur = durationOf(audit.scan_started_at, audit.scan_completed_at);
                  return (
                    <TableRow key={audit.id}>
                      <TableCell className="text-[10px]">{format(new Date(audit.created_date), 'dd MMM HH:mm')}</TableCell>
                      <TableCell className="text-[10px] max-w-[150px] truncate">{audit.website}</TableCell>
                      <TableCell><StatusBadge status={audit.status} /></TableCell>
                      <TableCell className="text-xs">{audit.issues_found ?? 0}</TableCell>
                      <TableCell className="text-xs text-red-500">{audit.critical_count ?? 0}</TableCell>
                      <TableCell className="text-[10px]">{dur !== null ? `${dur}s` : '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
