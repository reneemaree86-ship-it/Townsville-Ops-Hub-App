import React from 'react';
import { Badge } from '@/components/ui/badge';

const statusStyles = {
  pass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  fail: 'bg-red-500/10 text-red-600 border-red-500/20',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  running: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-600 border-red-500/20',
  critical: 'bg-red-500/10 text-red-600 border-red-500/20',
  info: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  new: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  hot: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  needs_approval: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  draft_ready: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  applied_responded: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  follow_up_due: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  won: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  lost: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  not_suitable: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  archived: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  open: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  fixed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  manual_action_required: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  waiting_approval: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  detected: 'bg-red-500/10 text-red-600 border-red-500/20',
  connected: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  not_connected: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  requires_authorised_connection: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  manual_monitoring_only: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  api_unavailable: 'bg-red-500/10 text-red-500 border-red-500/20',
  terms_restricted: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  fallback_active: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  low: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  medium: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  urgent: 'bg-red-500/10 text-red-600 border-red-500/20',
  draft: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  published: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  overdue: 'bg-red-500/10 text-red-600 border-red-500/20',
  cancelled: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  paused: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  error: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export default function StatusBadge({ status, className = '' }) {
  const style = statusStyles[status] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  const label = (status || 'unknown').replace(/_/g, ' ');
  return (
    <Badge variant="outline" className={`${style} text-[10px] font-medium capitalize ${className}`}>
      {label}
    </Badge>
  );
}