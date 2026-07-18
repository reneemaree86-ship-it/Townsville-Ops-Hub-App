import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/base44Client';
import PageHeader from '@/PageHeader';
import StatusBadge from '@/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/card';
import { Button } from '@/button';
import { Globe, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function WebsiteCrawlCentre() {
  const { activeBusiness, businesses } = useOutletContext();
  const qc = useQueryClient();

  const { data: allAudits = [] } = useQuery({
    queryKey: ['all-audits'],
    queryFn: () => base44.entities.SeoAudit.list('-created_date', 50),
  });

  const crawlMutation = useMutation({
    mutationFn: ({ business_id, website_url }) =>
      base44.functions.invoke('seoAudit', { business_id, website_url }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-audits'] }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Website Crawl Centre" description="Crawl and monitor all business websites" />
      <div className="grid gap-4">
        {(businesses || []).map(biz => {
          const websiteUrl = biz.website_url;
          const canCrawl = !!biz.id && !!websiteUrl;
          const bizAudits = allAudits.filter(a => a.business_id === biz.id);
          const latest = bizAudits[0];
          const isCrawling = crawlMutation.isPending && crawlMutation.variables?.business_id === biz.id;

          return (
            <Card key={biz.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">{biz.name}</CardTitle>
                    {websiteUrl ? (
                      <a
                        href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-0.5"
                      >
                        {websiteUrl} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <p className="text-[10px] text-muted-foreground mt-0.5">No website URL set</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs"
                    disabled={isCrawling || !canCrawl}
                    title={!canCrawl ? 'Add and save a Website URL in Business Settings first' : undefined}
                    onClick={() => crawlMutation.mutate({ business_id: biz.id, website_url: websiteUrl })}
                  >
                    {isCrawling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                    {isCrawling ? 'Crawling...' : 'Crawl Now'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* No website URL warning */}
                {!websiteUrl && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/30 mb-3">
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700">
                      Add and save a Website URL in <strong>Business Settings</strong> first before crawling.
                    </p>
                  </div>
                )}

                {latest ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {[
                        { label: 'Issues', value: latest.issues_found ?? 0, color: '' },
                        { label: 'Critical', value: latest.critical_count ?? 0, color: 'text-red-500' },
                        { label: 'High', value: latest.high_count ?? 0, color: 'text-orange-500' },
                        { label: 'Medium', value: latest.medium_count ?? 0, color: 'text-amber-500' },
                        { label: 'Low', value: latest.low_count ?? 0, color: 'text-blue-500' },
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
                            <span>{a.issues_found ?? 0} issues</span>
                            <StatusBadge status={a.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {canCrawl ? 'No crawls yet. Click "Crawl Now" to start.' : 'Set a Website URL in Business Settings to enable crawling.'}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
                }
