import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/base44Client';
import PageHeader from '@/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/card';
import { Button } from '@/button';
import { Badge } from '@/badge';
import { TrendingUp, Loader2, AlertTriangle, BarChart2, Search } from 'lucide-react';

const priorityColors = { critical: 'bg-red-500/10 text-red-600 border-red-500/20', high: 'bg-orange-500/10 text-orange-600 border-orange-500/20', medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20', low: 'bg-sky-500/10 text-sky-600 border-sky-500/20' };
const effortColors = { low: 'bg-emerald-500/10 text-emerald-700', medium: 'bg-amber-500/10 text-amber-700', high: 'bg-red-500/10 text-red-700' };

export default function OrganicTraffic() {
  const { activeBusiness } = useOutletContext();
  const bid = activeBusiness?.id;
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const fetchMutation = useMutation({
    mutationFn: async () => {
      // Get fresh OAuth tokens from Base44 connectors
      let ga4_token = null;
      let gsc_token = null;
      try {
        const ga4Res = await base44.integrations.getToken('google_analytics');
        ga4_token = ga4Res?.access_token || null;
      } catch {}
      try {
        const gscRes = await base44.integrations.getToken('google_search_console');
        gsc_token = gscRes?.access_token || null;
      } catch {}
      return base44.functions.invoke('getTrafficRecommendations', { business_id: bid, ga4_token, gsc_token });
    },
    onSuccess: (res) => setResult(res.data),
  });

  if (!activeBusiness) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organic Traffic Recommendations"
        description="Live GA4 + Search Console data with AI-powered SEO analysis"
        business={activeBusiness}
        actions={
          <Button onClick={() => fetchMutation.mutate()} disabled={fetchMutation.isPending} className="gap-2">
            {fetchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            {fetchMutation.isPending ? 'Analysing...' : 'Generate Recommendations'}
          </Button>
        }
      />

      {fetchMutation.isError && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-3"><p className="text-xs text-red-600">Error: {fetchMutation.error?.message}</p></CardContent>
        </Card>
      )}

      {/* Live GA4 Stats */}
      {result?.live_ga4 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-600" /> Live GA4 — {result.live_ga4.period}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border bg-card text-center">
                <p className="text-[10px] text-muted-foreground">Sessions</p>
                <p className="text-xl font-bold">{result.live_ga4.totals.sessions.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg border bg-card text-center">
                <p className="text-[10px] text-muted-foreground">Users</p>
                <p className="text-xl font-bold">{result.live_ga4.totals.users.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg border bg-card text-center">
                <p className="text-[10px] text-muted-foreground">Page Views</p>
                <p className="text-xl font-bold">{result.live_ga4.totals.pageViews.toLocaleString()}</p>
              </div>
            </div>
            <div className="space-y-1">
              {result.live_ga4.channels.map((ch, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                  <span className="font-medium">{ch.channel}</span>
                  <div className="flex gap-3 text-muted-foreground">
                    <span>{ch.sessions} sessions</span>
                    <span>Bounce: {ch.bounceRate}</span>
                    <span>Avg: {ch.avgDuration}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live GSC Stats */}
      {result?.live_gsc && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" /> Search Console — Top Queries ({result.live_gsc.period})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {result.live_gsc.top_queries.map((q, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                  <span className="font-medium truncate max-w-[40%]">{q.query}</span>
                  <div className="flex gap-3 text-muted-foreground">
                    <span>{q.clicks} clicks</span>
                    <span>{q.impressions} impr</span>
                    <span>CTR {q.ctr}</span>
                    <span>Pos #{q.position}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Status */}
      {result?.data_sources && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border bg-card text-center">
            <p className="text-[10px] text-muted-foreground">SEO Issues Analysed</p>
            <p className="text-xl font-bold">{result.data_sources.seo_issues_analysed}</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center">
            <p className="text-[10px] text-muted-foreground">Leads Analysed</p>
            <p className="text-xl font-bold">{result.data_sources.leads_analysed}</p>
          </div>
          <div className={`p-3 rounded-lg border text-center ${result.data_sources.live_search_console ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-muted/40'}`}>
            <p className="text-[10px] text-muted-foreground">Search Console</p>
            <p className="text-xs font-semibold mt-1">{result.data_sources.live_search_console ? '✓ Connected' : '⚠ No Data Yet'}</p>
          </div>
          <div className={`p-3 rounded-lg border text-center ${result.data_sources.live_analytics ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-muted/40'}`}>
            <p className="text-[10px] text-muted-foreground">Google Analytics</p>
            <p className="text-xs font-semibold mt-1">{result.data_sources.live_analytics ? '✓ Connected' : '⚠ No Data Yet'}</p>
          </div>
        </div>
      )}

      {!result && !fetchMutation.isPending && (
        <Card><CardContent className="p-8 text-center text-xs text-muted-foreground">Click "Generate Recommendations" to pull live GA4 + Search Console data and get actionable SEO tips.</CardContent></Card>
      )}

      {result?.recommendations?.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">{result.recommendations.length} Actionable Recommendations</CardTitle></CardHeader>
          <CardContent className="space-y-3 p-3">
            {result.recommendations.map((rec, i) => (
              <div key={i} className="rounded-lg border border-border/60 overflow-hidden">
                <button
                  className="w-full text-left p-3 flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className={`text-[9px] ${priorityColors[rec.priority] || ''}`}>{rec.priority}</Badge>
                      <Badge variant="outline" className="text-[9px] capitalize">{rec.category?.replace(/_/g, ' ')}</Badge>
                      <Badge variant="outline" className={`text-[9px] ${effortColors[rec.effort] || ''}`}>Effort: {rec.effort}</Badge>
                    </div>
                    <p className="text-xs font-semibold">{rec.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{rec.description}</p>
                  </div>
                  <span className="text-muted-foreground text-xs flex-shrink-0">{expanded === i ? '▲' : '▼'}</span>
                </button>
                {expanded === i && (
                  <div className="px-3 pb-3 border-t border-border/40 bg-muted/20">
                    {rec.estimated_impact && (
                      <div className="mt-2">
                        <p className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Expected Impact</p>
                        <p className="text-[10px] text-muted-foreground">{rec.estimated_impact}</p>
                      </div>
                    )}
                    {rec.how_to && (
                      <div className="mt-2">
                        <p className="text-[10px] font-semibold">How to Implement</p>
                        <p className="text-[10px] text-muted-foreground whitespace-pre-line">{rec.how_to}</p>
                      </div>
                    )}
                    {rec.keywords_to_target?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[10px] font-semibold mb-1">Target Keywords</p>
                        <div className="flex flex-wrap gap-1">{rec.keywords_to_target.map((k, j) => <Badge key={j} variant="secondary" className="text-[9px]">{k}</Badge>)}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
