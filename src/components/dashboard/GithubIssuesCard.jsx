import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GithubIssuesCard() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['github-issues'],
    queryFn: async () => {
      const res = await base44.functions.invoke('syncGithubIssues', {});
      return res.data.issues || [];
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <GitBranch className="w-4 h-4" /> Project Issues
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => refetch()}>
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Loading issues...</p>
        ) : isError ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Needs API connection / setup required.</p>
        ) : data.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No open issues. Repo is all clear.</p>
        ) : (
          data.slice(0, 8).map(issue => (
            <a
              key={issue.id}
              href={issue.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50 hover:bg-muted/70 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">#{issue.number} {issue.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {issue.assignee ? `Assigned: ${issue.assignee}` : 'Unassigned'}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {issue.labels.slice(0, 2).map(label => (
                  <Badge key={label} variant="outline" className="text-[10px]">{label}</Badge>
                ))}
              </div>
            </a>
          ))
        )}
      </CardContent>
    </Card>
  );
}