import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, Loader2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function WebsiteCrawlCentre() {
  const { activeBusiness, businesses } = useOutletContext();
  const qc = useQueryClient();

  const { data: allAudits = [] } = useQuery({
    queryKey: ['all-audits'],
    queryFn: () => base44.entities.SeoAudit.list('-created_date', 50),
  });

  const crawlMutation = useMutation({
    mutationFn: ({ business_id, website_url }) => base44.functions.invoke('runSeoAudit', { business_id, website_url }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-audits'] }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Website Crawl Centre" description="Crawl and monitor both websites" />
      <div className="grid gap-4">
        {(businesses || []).map(biz => {
          const bizAudits = allAudits.filter(a => a.business_id === biz.id);
          const latest = bizAudits[0];
          const isCrawling = crawlMutation.isPending && crawlMutation.variables?.business_id === biz.id;
          return (
            <Card key={biz.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">{biz.name}</CardTitle>
                    <a href={biz.website_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-0.5">
                      {biz.website_url} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <Button size="sm" className="gap-1.5 text-xs" disabled={isCrawling}
                    onClick={() => crawlMutation.mutate({ business_id: biz.id, website_url: biz.website_url })}>
                    {isCrawling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                    {isCrawling ? 'Crawling...' : 'Crawl Now'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {latest ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {[
                        { label: 'Pages', value: latest.pages_crawled, color: '' },
                        { label: 'Issues', value: latest.issues_found, color: '' },
                        { label: 'Critical', value: latest.critical_issues, color: 'text-red-500' },
                        { label: 'Warnings', value: latest.warnings, color: 'text-amber-500' },
                        { label: 'Passed', value: latest.passed_checks, color: 'text-emerald-500' },
                      ].map(s => (
                        <div key={s.label} className="text-center p-2 bg-muted/40 rounded-lg">
                          <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-[9px] text-muted-foreground">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Last crawled: {format(new Date(latest.created_date), 'dd MMM yyyy HH:mm')}</span>
                      <StatusBadge status={latest.status} />
                    </div>
                    {bizAudits.length > 1 && (
                      <div className="space-y-1">
                        {bizAudits.slice(1, 5).map(a => (
                          <div key={a.id} className="flex items-center justify-between text-[10px] p-1.5 rounded bg-muted/30">
                            <span>{format(new Date(a.created_date), 'dd MMM HH:mm')}</span>
                            <span>{a.pages_crawled} pages · {a.issues_found} issues</span>
                            <StatusBadge status={a.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No crawls yet. Click "Crawl Now" to start.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}