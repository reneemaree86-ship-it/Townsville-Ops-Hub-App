import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/base44Client';
import PageHeader from '@/PageHeader';
import StatusBadge from '@/StatusBadge';
import { Card, CardContent } from '@/card';
import { Button } from '@/button';
import { Textarea } from '@/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/table';
import { format } from 'date-fns';

const STATUS_OPTIONS = ['detected', 'auto_fix_attempted', 'fixed', 'manual_action_required', 'failed', 'waiting_authorisation'];

export default function ErrorFixLog() {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const { data: errors = [] } = useQuery({
    queryKey: ['error-logs'],
    queryFn: () => base44.entities.ErrorLog.list('-created_date', 100),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ErrorLog.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['error-logs'] }),
  });

  const setStatus = (err, status) => {
    updateMutation.mutate({
      id: err.id,
      data: {
        fix_status: status,
      },
    });
  };

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
                  <TableHead className="text-[10px]">Page / Component</TableHead>
                  <TableHead className="text-[10px]">Message</TableHead>
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
                    <React.Fragment key={err.id}>
                      <TableRow
                        className={err.error_details ? 'cursor-pointer hover:bg-muted/40' : ''}
                        onClick={() => err.error_details && setExpandedId(expandedId === err.id ? null : err.id)}
                      >
                        <TableCell><StatusBadge status={err.severity} /></TableCell>
                        <TableCell className="text-[10px] capitalize">{err.error_type?.replace(/_/g, ' ') || '—'}</TableCell>
                        <TableCell className="text-[10px]">{err.source || '—'}</TableCell>
                        <TableCell className="text-xs max-w-[260px] truncate">{err.description || '—'}</TableCell>
                        <TableCell><StatusBadge status={err.fix_status} /></TableCell>
                        <TableCell className="text-[10px]">{err.created_date ? format(new Date(err.created_date), 'dd MMM HH:mm') : '—'}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1 flex-wrap">
                            {STATUS_OPTIONS.filter(s => s !== err.fix_status).map(s => (
                              <Button
                                key={s}
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] capitalize"
                                onClick={() => setStatus(err, s)}
                                disabled={updateMutation.isPending}
                              >
                                {s}
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedId === err.id && err.error_details && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30">
                            <Textarea readOnly value={err.error_details} className="text-[10px] font-mono h-24" />
                            {err.manual_fix_instructions && <p className="text-xs text-muted-foreground mt-2">Manual Fix Instructions: {err.manual_fix_instructions}</p>}
                            {err.auto_fix_result && <p className="text-[10px] text-muted-foreground mt-1">Auto-fix result: {err.auto_fix_result}</p>}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
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
