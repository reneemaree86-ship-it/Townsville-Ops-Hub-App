import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

export default function ScanHistory() {
  const { activeBusiness } = useOutletContext();
  const bid = activeBusiness?.id;

  const { data: leadScans = [] } = useQuery({
    queryKey: ['lead-scans', bid],
    queryFn: () => bid ? base44.entities.LeadScan.filter({ business_id: bid }, '-created_date', 50) : [],
    enabled: !!bid,
  });
  const { data: seoAudits = [] } = useQuery({
    queryKey: ['seo-audits', bid],
    queryFn: () => bid ? base44.entities.SeoAudit.filter({ business_id: bid }, '-created_date', 50) : [],
    enabled: !!bid,
  });

  if (!activeBusiness) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Scan History" description="History of all scans and audits" business={activeBusiness} />
      <Tabs defaultValue="leads">
        <TabsList>
          <TabsTrigger value="leads" className="text-xs">Lead Scans ({leadScans.length})</TabsTrigger>
          <TabsTrigger value="seo" className="text-xs">SEO Audits ({seoAudits.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="leads">
          <Card><CardContent className="p-0"><div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-[10px]">Date</TableHead>
                <TableHead className="text-[10px]">Type</TableHead>
                <TableHead className="text-[10px]">Status</TableHead>
                <TableHead className="text-[10px]">Leads</TableHead>
                <TableHead className="text-[10px]">Hot</TableHead>
                <TableHead className="text-[10px]">Duration</TableHead>
                <TableHead className="text-[10px]">Summary</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {leadScans.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">No lead scans yet.</TableCell></TableRow>
                : leadScans.map(scan => (
                  <TableRow key={scan.id}>
                    <TableCell className="text-[10px]">{format(new Date(scan.created_date), 'dd MMM HH:mm')}</TableCell>
                    <TableCell className="text-[10px] capitalize">{scan.scan_type}</TableCell>
                    <TableCell><StatusBadge status={scan.status} /></TableCell>
                    <TableCell className="text-xs font-medium">{scan.leads_found}</TableCell>
                    <TableCell className="text-xs font-medium text-orange-500">{scan.hot_leads_found}</TableCell>
                    <TableCell className="text-[10px]">{scan.duration_seconds}s</TableCell>
                    <TableCell className="text-[10px] max-w-[200px] truncate">{scan.summary}</TableCell>
                  </TableRow>
                ))}
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
                <TableHead className="text-[10px]">Pages</TableHead>
                <TableHead className="text-[10px]">Issues</TableHead>
                <TableHead className="text-[10px]">Critical</TableHead>
                <TableHead className="text-[10px]">Duration</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {seoAudits.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">No SEO audits yet.</TableCell></TableRow>
                : seoAudits.map(audit => (
                  <TableRow key={audit.id}>
                    <TableCell className="text-[10px]">{format(new Date(audit.created_date), 'dd MMM HH:mm')}</TableCell>
                    <TableCell className="text-[10px] max-w-[150px] truncate">{audit.website_url}</TableCell>
                    <TableCell><StatusBadge status={audit.status} /></TableCell>
                    <TableCell className="text-xs">{audit.pages_crawled}</TableCell>
                    <TableCell className="text-xs">{audit.issues_found}</TableCell>
                    <TableCell className="text-xs text-red-500">{audit.critical_issues}</TableCell>
                    <TableCell className="text-[10px]">{audit.duration_seconds}s</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}