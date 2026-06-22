import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export default function ErrorFixLog() {
  const qc = useQueryClient();
  const { data: errors = [] } = useQuery({
    queryKey: ['error-logs'],
    queryFn: () => base44.entities.ErrorLog.list('-created_date', 100),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ErrorLog.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['error-logs'] }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Error / Fix Log" description="All detected errors and their fix status" />
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Severity</TableHead>
                  <TableHead className="text-[10px]">Type</TableHead>
                  <TableHead className="text-[10px]">Description</TableHead>
                  <TableHead className="text-[10px]">Source</TableHead>
                  <TableHead className="text-[10px]">Status</TableHead>
                  <TableHead className="text-[10px]">Date</TableHead>
                  <TableHead className="text-[10px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">No errors logged. Systems running normally.</TableCell></TableRow>
                ) : (
                  errors.map(err => (
                    <TableRow key={err.id}>
                      <TableCell><StatusBadge status={err.severity} /></TableCell>
                      <TableCell className="text-[10px] capitalize">{err.error_type?.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{err.description}</TableCell>
                      <TableCell className="text-[10px]">{err.source || '—'}</TableCell>
                      <TableCell><StatusBadge status={err.fix_status} /></TableCell>
                      <TableCell className="text-[10px]">{format(new Date(err.created_date), 'dd MMM HH:mm')}</TableCell>
                      <TableCell>
                        {err.fix_status !== 'fixed' && (
                          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => updateMutation.mutate({ id: err.id, data: { fix_status: 'fixed' } })}>Mark Fixed</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}