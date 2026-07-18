import React from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, UserSearch, AlertTriangle, Bell, Clock, TestTube, TrendingUp, ArrowRight, Flame } from 'lucide-react';
import { format } from 'date-fns';
import GithubIssuesCard from '@/components/dashboard/GithubIssuesCard';

export default function Dashboard() {
  const { activeBusiness } = useOutletContext();
  const bid = activeBusiness?.id;

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', bid],
    queryFn: () => bid ? base44.entities.Lead.filter({ business_id: bid }) : [],
    enabled: !!bid,
  });

  const { data: audits = [] } = useQuery({
    queryKey: ['audits', bid],
    queryFn: () => bid ? base44.entities.SeoAudit.filter({ business_id: bid }, '-created_date', 5) : [],
    enabled: !!bid,
  });

  const { data: errors = [] } = useQuery({
    queryKey: ['errors-recent', bid],
    queryFn: () => bid ? base44.entities.ErrorLog.filter({ business_id: bid }, '-created_date', 10) : [],
    enabled: !!bid,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications-recent', bid],
    queryFn: () => bid ? base44.entities.Notification.filter({ business_id: bid, read: false }, '-created_date', 10) : [],
    enabled: !!bid,
  });

  const { data: followUps = [] } = useQuery({
    queryKey: ['followups', bid],
    queryFn: () => bid ? base44.entities.FollowUp.filter({ business_id: bid, status: 'pending' }) : [],
    enabled: !!bid,
  });

  const hotLeads = leads.filter(l => l.status === 'hot' || l.urgency === 'urgent');
  const openErrors = errors.filter(e => e.fix_status === 'detected' || e.fix_status === 'manual_action_required');
  const lastAudit = audits[0];

  if (!activeBusiness) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Loading businesses...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Control Centre"
        description="Overview of all systems and status"
        business={activeBusiness}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active Leads" value={leads.filter(l => !['won','lost','archived','not_suitable'].includes(l.status)).length} icon={UserSearch} color="text-primary" subtext={`${hotLeads.length} hot`} />
        <StatCard label="SEO Audits" value={audits.length} icon={Search} color="text-blue-500" subtext={lastAudit ? `Last: ${lastAudit.issues_found} issues` : 'None yet'} />
        <StatCard label="Open Errors" value={openErrors.length} icon={AlertTriangle} color="text-red-500" subtext={`${errors.filter(e => e.severity === 'critical').length} critical`} />
        <StatCard label="Follow-ups Due" value={followUps.length} icon={Clock} color="text-amber-500" subtext={`${followUps.filter(f => new Date(f.due_date) < new Date()).length} overdue`} />
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
                    <p className="text-[10px] text-muted-foreground">{lead.suburb} · {lead.source?.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary">{lead.score}/100</span>
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
              <p className="text-xs text-muted-foreground py-4 text-center">No unread notifications</p>
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

        <GithubIssuesCard />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
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