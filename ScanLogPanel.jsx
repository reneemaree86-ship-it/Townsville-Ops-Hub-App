import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const statusIcon = {
  completed: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />,
  error: <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />,
  manual_setup_required: <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />,
  running: <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 animate-pulse" />,
};

const statusColor = {
  completed: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  error: 'bg-red-500/10 text-red-700 border-red-500/20',
  manual_setup_required: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  running: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
};

export default function ScanLogPanel({ scanLog, scans }) {
  const [showHistory, setShowHistory] = useState(false);

  if (!scanLog && (!scans || scans.length === 0)) return null;

  return (
    <div className="space-y-3">
      {scanLog && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Latest Scan Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {scanLog.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg border bg-muted/20">
                {statusIcon[entry.status] || statusIcon.running}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium">{entry.source}</span>
                    <Badge variant="outline" className={`text-[9px] ${statusColor[entry.status] || ''}`}>
                      {entry.status?.replace(/_/g, ' ')}
                    </Badge>
                    {entry.count > 0 && (
                      <Badge variant="secondary" className="text-[9px]">{entry.count} lead{entry.count !== 1 ? 's' : ''}</Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{entry.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {scans && scans.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <button
              className="flex items-center justify-between w-full text-left"
              onClick={() => setShowHistory(!showHistory)}
            >
              <CardTitle className="text-sm">Scan History ({scans.length})</CardTitle>
              {showHistory ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
          </CardHeader>
          {showHistory && (
            <CardContent className="p-3 space-y-2">
              {scans.map(scan => (
                <div key={scan.id} className="p-2 rounded-lg border bg-muted/20 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-[9px] ${statusColor[scan.status] || ''}`}>{scan.status}</Badge>
                    <span className="text-muted-foreground">{new Date(scan.created_date).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })}</span>
                    {scan.leads_found > 0 && <span className="font-medium">{scan.leads_found} leads ({scan.hot_leads_found} hot)</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{scan.summary}</p>
                  {scan.sources_scanned?.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {scan.sources_scanned.map((s, i) => <Badge key={i} variant="secondary" className="text-[9px]">{s.replace(/_/g, ' ')}</Badge>)}
                    </div>
                  )}
                  {scan.error_message && <p className="text-[9px] text-amber-600 mt-1 whitespace-pre-wrap">{scan.error_message}</p>}
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}