import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Loader2, AlertTriangle, CheckCircle2, Wrench } from 'lucide-react';

const priorityColors = { critical: 'bg-red-500/10 text-red-600 border-red-500/20', high: 'bg-orange-500/10 text-orange-600 border-orange-500/20', medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20', low: 'bg-sky-500/10 text-sky-600 border-sky-500/20' };
const effortColors = { low: 'bg-emerald-500/10 text-emerald-700', medium: 'bg-amber-500/10 text-amber-700', high: 'bg-red-500/10 text-red-700' };

export default function OrganicTraffic() {
  const { activeBusiness } = useOutletContext();
  const bid = activeBusiness?.id;
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const fetchMutation = useMutation({
    mutationFn: () => base44.functions.invoke('getTrafficRecommendations', { business_id: bid }),
    onSuccess: (res) => setResult(res.data),
  });

  if (!activeBusiness) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organic Traffic Recommendations"
        description={`AI-powered SEO and traffic analysis for ${activeBusiness.website_url}`}
        business={activeBusiness}
        actions={
          <Button onClick={() => fetchMutation.mutate()} disabled={fetchMutation.isPending} className="gap-2">
            {fetchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            {fetchMutation.isPending ? 'Analyzing...' : 'Generate Recommendations'}
          </Button>
        }
      />

      {fetchMutation.isError && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-3"><p className="text-xs text-red-600">Error: {fetchMutation.error?.message}</p></CardContent>
        </Card>
      )}

      {result?.setup_required?.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-4 h-4" /> Manual Setup Required — Live Traffic Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.setup_required.map((item, i) => (
              <div key={i} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs font-semibold text-amber-800">{item.name}</p>
                <p className="text-[10px] text-amber-700 mt-0.5"><strong>Why:</strong> {item.why}</p>
                <p className="text-[10px] text-amber-700 mt-1 whitespace-pre-line"><strong>How to set up:</strong> {item.how}</p>
                <p className="text-[10px] text-amber-800 mt-1 font-medium">Secret to add: <code className="bg-amber-100 px-1 rounded">{item.secret_needed}</code></p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
            <p className="text-xs font-semibold mt-1">{result.data_sources.live_search_console ? '✓ Connected' : '⚠ Not Connected'}</p>
          </div>
          <div className={`p-3 rounded-lg border text-center ${result.data_sources.live_analytics ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-muted/40'}`}>
            <p className="text-[10px] text-muted-foreground">Google Analytics</p>
            <p className="text-xs font-semibold mt-1">{result.data_sources.live_analytics ? '✓ Connected' : '⚠ Not Connected'}</p>
          </div>
        </div>
      )}

      {!result && !fetchMutation.isPending && (
        <Card><CardContent className="p-8 text-center text-xs text-muted-foreground">Click "Generate Recommendations" to analyse your website and get actionable SEO and traffic tips.</CardContent></Card>
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
                        <p className="text-[10px] font-semibold flex items-center gap-1"><Wrench className="w-3 h-3" /> How to Implement</p>
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