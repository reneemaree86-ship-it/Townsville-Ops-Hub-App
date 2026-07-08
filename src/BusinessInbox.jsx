import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/base44Client';
import { Badge } from '@/badge';
import { Button } from '@/button';
import { Input } from '@/input';
import { Textarea } from '@/textarea';
import { ScrollArea } from '@/scroll-area';
import { Avatar, AvatarFallback } from '@/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/tabs';
import {
  Inbox, Send, Search, RefreshCw, Facebook,
  MessageCircle, Mail, AlertTriangle, Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const PLATFORM_COLORS = {
  'Facebook Groups': 'text-blue-500',
  facebook: 'text-blue-500',
  email: 'text-emerald-500',
  gumtree: 'text-orange-500',
  airtasker: 'text-purple-500',
  direct: 'text-primary',
};

const PLATFORM_ICONS = {
  'Facebook Groups': Facebook,
  facebook: Facebook,
  email: Mail,
  direct: MessageCircle,
};

const STATUS_BADGE = {
  new: { label: 'New', className: 'bg-primary text-primary-foreground' },
  contacted: { label: 'Contacted', className: 'bg-secondary text-secondary-foreground' },
  quoted: { label: 'Quoted', className: 'border border-amber-500 text-amber-600' },
  converted: { label: 'Booked', className: 'border border-emerald-500 text-emerald-600' },
  needs_approval: { label: 'Needs Approval', className: 'bg-destructive text-destructive-foreground' },
};

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
}

export default function BusinessInbox() {
  const { activeBusiness } = useOutletContext();
  const bid = activeBusiness?.id;
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['inbox-leads', bid],
    queryFn: () => bid ? base44.entities.Lead.filter({ business_id: bid }, '-created_date', 200) : [],
    enabled: !!bid,
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['platform-connections-inbox', bid],
    queryFn: () => base44.entities.PlatformConnection.list(),
    enabled: !!bid,
  });

  const fbConnection = connections.find(c => c.platform === 'facebook');
  const fbConnected = fbConnection?.status === 'connected';

  const replyMutation = useMutation({
    mutationFn: ({ lead_id, message }) => base44.functions.invoke('sendLeadReply', { lead_id, message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox-leads'] });
      setReplyText('');
    },
  });

  const threads = useMemo(() => leads.map(l => ({
    id: l.id,
    name: l.name || 'Unknown enquiry',
    platform: l.source_platform || 'direct',
    last_message: l.original_text || '(no message text captured)',
    time: l.created_date ? new Date(l.created_date) : new Date(),
    unread: l.status === 'new',
    status: l.status,
    suburb: l.suburb,
    service: l.service_type,
    contact_email: l.contact_email,
    contact_phone: l.contact_phone,
    notes: l.notes,
  })), [leads]);

  const filteredThreads = threads.filter(t => {
    const matchSearch = !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.service || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.suburb || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchTab = activeTab === 'all' || activeTab === t.status ||
      (activeTab === 'unread' && t.unread);
    return matchSearch && matchTab;
  });

  const selectedThread = threads.find(t => t.id === selectedId) || filteredThreads[0] || null;
  const unreadCount = threads.filter(t => t.unread).length;

  const handleSend = () => {
    if (!replyText.trim() || !selectedThread) return;
    replyMutation.mutate({ lead_id: selectedThread.id, message: replyText });
  };

  const canSendDirectly = selectedThread && !!selectedThread.contact_email;

  if (!activeBusiness) return null;

  return (
    <div className="flex flex-col gap-3">
      {!fbConnected && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-foreground">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">Facebook Page not connected.</span>{' '}
            Messages here come from Facebook Groups scanning and other lead sources — real Messenger conversations won't appear until your Facebook Page is connected with messaging permission (see Platform Status page). Replies to leads without a saved email will be logged in Notes only, not auto-sent.
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-11rem)] rounded-xl border border-border overflow-hidden bg-card">
        {/* LEFT PANEL — Thread list */}
        <div className="w-80 flex-shrink-0 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Inbox className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-sm text-foreground">Business Inbox</h2>
                {unreadCount > 0 && (
                  <Badge className="h-5 text-[10px] px-1.5 bg-primary text-primary-foreground">{unreadCount}</Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => qc.invalidateQueries({ queryKey: ['inbox-leads'] })}>
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                className="pl-8 h-8 text-xs"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="px-3 pt-2 pb-1 border-b border-border">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-7 w-full grid grid-cols-4 text-[10px]">
                <TabsTrigger value="all" className="text-[10px]">All</TabsTrigger>
                <TabsTrigger value="unread" className="text-[10px]">Unread</TabsTrigger>
                <TabsTrigger value="contacted" className="text-[10px]">Contacted</TabsTrigger>
                <TabsTrigger value="converted" className="text-[10px]">Booked</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="flex-1">
            <div className="divide-y divide-border">
              {isLoading && (
                <div className="p-6 text-center text-xs text-muted-foreground">Loading messages…</div>
              )}
              {!isLoading && filteredThreads.length === 0 && (
                <div className="p-6 text-center text-xs text-muted-foreground">No messages yet — new leads and enquiries will appear here.</div>
              )}
              {filteredThreads.map(thread => {
                const Icon = PLATFORM_ICONS[thread.platform] || MessageCircle;
                const isSelected = selectedThread?.id === thread.id;
                return (
                  <div
                    key={thread.id}
                    onClick={() => setSelectedId(thread.id)}
                    className={`p-3 cursor-pointer transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs bg-muted text-muted-foreground">{initials(thread.name)}</AvatarFallback>
                        </Avatar>
                        <Icon className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${PLATFORM_COLORS[thread.platform] || 'text-muted-foreground'} bg-card rounded-full p-0.5`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-xs font-medium truncate ${thread.unread ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {thread.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">
                            {formatDistanceToNow(thread.time, { addSuffix: true })}
                          </span>
                        </div>
                        <p className={`text-[11px] truncate mb-1 ${thread.unread ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {thread.last_message}
                        </p>
                        <div className="flex items-center gap-1">
                          {thread.suburb && <span className="text-[10px] text-muted-foreground">{thread.suburb}</span>}
                          {thread.suburb && <span className="text-[10px] text-muted-foreground">·</span>}
                          <Badge className={`h-4 text-[9px] px-1 ${(STATUS_BADGE[thread.status] || STATUS_BADGE.new).className}`}>
                            {(STATUS_BADGE[thread.status] || { label: thread.status }).label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* RIGHT PANEL — Thread detail */}
        <div className="flex-1 flex flex-col">
          {!selectedThread ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Select a message to view it
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-foreground">{selectedThread.name}</h3>
                    <Badge className={`h-4 text-[9px] px-1 ${(STATUS_BADGE[selectedThread.status] || STATUS_BADGE.new).className}`}>
                      {(STATUS_BADGE[selectedThread.status] || { label: selectedThread.status }).label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                    {selectedThread.suburb && <span>{selectedThread.suburb}</span>}
                    {selectedThread.service && <span>· {selectedThread.service}</span>}
                    {selectedThread.contact_email && <span>· {selectedThread.contact_email}</span>}
                    {selectedThread.contact_phone && <span>· {selectedThread.contact_phone}</span>}
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="rounded-lg bg-muted p-3 max-w-md text-xs text-foreground mb-3">
                  {selectedThread.last_message}
                </div>
                {selectedThread.notes && (
                  <div className="text-[11px] text-muted-foreground whitespace-pre-wrap border-t border-border pt-3 mt-3">
                    <span className="font-medium text-foreground">Reply history:</span>
                    {selectedThread.notes}
                  </div>
                )}
              </ScrollArea>

              <div className="p-3 border-t border-border">
                {!canSendDirectly && (
                  <p className="text-[10px] text-muted-foreground mb-1.5">
                    No email on file for this lead — your reply will be saved to Notes, not auto-sent. Contact them directly by phone/Facebook.
                  </p>
                )}
                <div className="flex gap-2">
                  <Textarea
                    placeholder={canSendDirectly ? "Type your reply — this will be emailed..." : "Type a note about how you followed up..."}
                    className="text-xs resize-none"
                    rows={2}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                  />
                  <Button size="icon" className="h-auto" onClick={handleSend} disabled={!replyText.trim() || replyMutation.isPending}>
                    {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                {replyMutation.data?.emailSent && (
                  <p className="text-[10px] text-emerald-600 mt-1">Email sent.</p>
                )}
                {replyMutation.data && !replyMutation.data.emailSent && !replyMutation.data.error && (
                  <p className="text-[10px] text-muted-foreground mt-1">Saved to Notes (no email on file).</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
