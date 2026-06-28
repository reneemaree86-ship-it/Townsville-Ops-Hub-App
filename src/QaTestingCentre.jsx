import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/base44Client';
import PageHeader from '@/PageHeader';
import StatusBadge from '@/StatusBadge';
import StatCard from '@/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/card';
import { Button } from '@/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/table';
import { TestTube, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function QaTestingCentre() {
  const qc = useQueryClient();

  const { data: tests = [] } = useQuery({
    queryKey: ['qa-tests'],
    queryFn: () => base44.entities.QaTest.list('-created_date', 100),
  });

  const runMutation = useMutation({
    mutationFn: () => base44.functions.invoke('runQaTests', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qa-tests'] }),
  });

  const batches = {};
  tests.forEach(t => { const k = t.test_batch_id || 'unknown'; if (!batches[k]) batches[k] = []; batches[k].push(t); });
  const batchKeys = Object.keys(batches).sort().reverse();
  const latestBatch = batchKeys[0] ? batches[batchKeys[0]] : [];
  const passed = latestBatch.filter(t => t.status === 'pass').length;
  const failed = latestBatch.filter(t => t.status === 'fail').length;
  const warnings = latestBatch.filter(t => t.status === 'warning').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin QA Testing Centre"
        description="Run diagnostic tests on the app and its connections"
        actions={
          <Button onClick={() => runMutation.mutate()} disabled={runMutation.isPending} className="gap-2">
            {runMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
            {runMutation.isPending ? 'Running Tests...' : 'Run Full QA Test Now'}
          </Button>
        }
      />

      {runMutation.isSuccess && (
        <Card className="border-emerald-500/30 bg-emerald-500/5"><CardContent className="p-3">
          <p className="text-xs text-emerald-600">Tests complete: {runMutation.data?.data?.passed} passed, {runMutation.data?.data?.failed} failed</p>
        </CardContent></Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Passed" value={passed} icon={CheckCircle} color="text-emerald-500" />
        <StatCard label="Failed" value={failed} icon={XCircle} color="text-red-500" />
        <StatCard label="Warnings" value={warnings} icon={AlertTriangle} color="text-amber-500" />
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Latest Test Results</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Status</TableHead>
                  <TableHead className="text-[10px]">Test</TableHead>
                  <TableHead className="text-[10px]">Area</TableHead>
                  <TableHead className="text-[10px]">Error</TableHead>
                  <TableHead className="text-[10px]">Fix</TableHead>
                  <TableHead className="text-[10px]">Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestBatch.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">No tests run yet.</TableCell></TableRow>
                ) : (
                  latestBatch.map(test => (
                    <TableRow key={test.id}>
                      <TableCell><StatusBadge status={test.status} /></TableCell>
                      <TableCell className="text-xs font-medium">{test.test_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{test.area_tested}</TableCell>
                      <TableCell className="text-[10px] max-w-[200px] truncate">{test.error_found || '—'}</TableCell>
                      <TableCell className="text-[10px] max-w-[200px] truncate">{test.recommended_fix || '—'}</TableCell>
                      <TableCell><StatusBadge status={test.severity} /></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {batchKeys.length > 1 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Test History</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {batchKeys.slice(0, 10).map(key => {
              const batch = batches[key];
              const p = batch.filter(t => t.status === 'pass').length;
              const f = batch.filter(t => t.status === 'fail').length;
              return (
                <div key={key} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <div>
                    <p className="text-xs font-medium">{batch.length} tests</p>
                    <p className="text-[10px] text-muted-foreground">{batch[0] ? format(new Date(batch[0].created_date), 'dd MMM yyyy HH:mm') : key}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] text-emerald-600">{p} passed</span>
                    {f > 0 && <span className="text-[10px] text-red-500">{f} failed</span>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}