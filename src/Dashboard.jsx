import React from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/base44Client';
import PageHeader from '@/PageHeader';
import StatCard from '@/StatCard';
import StatusBadge from '@/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/card';
import { Button } from '@/button';
import { Search, UserSearch, AlertTriangle, Bell, Clock, TestTube, TrendingUp, ArrowRight, Building2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { activeBusiness, businesses } = useOutletContext();
  const bid = activeBusiness?.id;

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', bid],
    queryFn: () => bid ? base44.entities.Lead.filter({ business_id: bid }) : [],
    enabled: !!bid,
  });

  const { data: audits = [] } = useQuery({
    queryKey: ['audits', bid],
    queryFn: () => bid ? base44.entities.SeoScanResult.filter({ business_id: bid }, '-created_date', 5) : [],
    enabled: !!bid,
  });

  const { data: errors = [] } = useQuery({
    queryKey: ['errors-recent'],
    queryFn: () => base44.entities.ErrorLog.list('-created_date', 10),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications-recent'],
    queryFn: () => base44.entities.NotificationQueue.filter({ read: false }, '-created_date', 10),
  });

  // No businesses at all — show a useful empty state, not a perpetual "loading"
  if (!activeBusiness && (!businesses || businesses.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
        <Building2 className="w-12 h-12 text-muted-foreground/50" />
        <div>
          <p className="text-sm font-medium text-foreground">No businesses yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create your first business in Business Settings to get started.
          </p>
        </div>
        <Link to="/settings">
          <Button variant="outline" size="sm" className="gap-1">
            <Building2 className="w-3.5 h-3.5" /> Create a Business
          </Button>
        </Link>
      </div>
    );
  }

  // Businesses exist but none selected yet (loading)
  if (!activeBusiness) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Loading businesses...</div>;
  }

  const hotLeads = leads.filter(l => (l.score || 0) >= 70 || l.urgency === 'Hot - Urgent');
  const followUps = leads.filter(l => !!l.follow_up_date && !['won','lost','not_suitable'].includes(l.status));
  const openErrors = errors.filter(e => e.fix_status !== 'fixed');
  const lastAudit = audits[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Control Centre"
        description="Overview of all systems and status"
        business={activeBusiness}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active Leads" value={leads.filter(l => !['won','lost','not_suitable'].includes(l.status)).length} icon={UserSearch} color="text-primary" subtext={`${hotLeads.length} hot`} />
        <StatCard label="SEO Audits" value={audits.length} icon={Search} color="text-blue-500" subtext={lastAudit ? `Last: ${lastAudit.issues_found} issues` : 'None yet'} />
        <StatCard label="Open Errors" value={openErrors.length} icon={AlertTriangle} color="text-red-500" subtext={`${errors.filter(e => e.severity === 'critical').length} critical`} />
        <StatCard label="Follow-ups Due" value={followUps.length} icon={Clock} color="text-amber-500" subtext={`${followUps.filter(f => new Date(f.follow_up_date) < new Date()).length} overdue`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Hot Leads</CardTitle>
              <Link to="/leads"><Button variant="ghost" size="sm" className="text-xs h-7 gap-1">View All <ArrowRight className="w-3 h-3" /></Button></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {hotLeads.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No hot leads yet. Run a lead scan to find some.</p>
            ) : (
              hotLeads.slice(0, 5).map(lead => (
                <div key={lead.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{lead.service_needed}</p>
                    <p className="text-[10px] text-muted-foreground">{lead.suburb} {lead.source ? `· ${lead.source}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary">{lead.score ?? '-'}/100</span>
                    <StatusBadge status={lead.urgency} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Notifications</CardTitle>
              <Link to="/notifications"><Button variant="ghost" size="sm" className="text-xs h-7 gap-1">View All <ArrowRight className="w-3 h-3" /></Button></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No queued notifications</p>
            ) : (
              notifications.slice(0, 5).map(n => (
                <div key={n.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <Bell className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{n.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{n.message}</p>
                  </div>
                  <StatusBadge status={n.severity} className="flex-shrink-0" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Error / Fix Log</CardTitle>
              <Link to="/errors"><Button variant="ghost" size="sm" className="text-xs h-7 gap-1">View All <ArrowRight className="w-3 h-3" /></Button></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {openErrors.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No open errors. Systems running normally.</p>
            ) : (
              openErrors.slice(0, 5).map(err => (
                <div key={err.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{err.description}</p>
                    <p className="text-[10px] text-muted-foreground">{err.source || err.error_type?.replace(/_/g, ' ')}</p>
                  </div>
                  <StatusBadge status={err.severity} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link to="/seo"><Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1 text-xs"><Search className="w-4 h-4" />Run SEO Audit</Button></Link>
            <Link to="/leads"><Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1 text-xs"><UserSearch className="w-4 h-4" />Find Leads Now</Button></Link>
            <Link to="/qa"><Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1 text-xs"><TestTube className="w-4 h-4" />Run QA Tests</Button></Link>
            <Link to="/traffic"><Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1 text-xs"><TrendingUp className="w-4 h-4" />Traffic Tips</Button></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
