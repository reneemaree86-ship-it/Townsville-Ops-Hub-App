import React, { useState } from 'react';
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
  MessageCircle, Clock, CheckCheck, ChevronRight,
  Star, Archive, Filter, Phone, Mail
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const PLATFORM_COLORS = {
  facebook: 'text-blue-500',
  email: 'text-emerald-500',
  whatsapp: 'text-green-500',
  sms: 'text-purple-500',
  direct: 'text-primary',
};

const PLATFORM_ICONS = {
  facebook: Facebook,
  email: Mail,
  whatsapp: Phone,
  sms: MessageCircle,
  direct: MessageCircle,
};

// Sample inbox threads to demonstrate to Meta
const SAMPLE_THREADS = [
  {
    id: '1',
    name: 'Sarah Mitchell',
    platform: 'facebook',
    avatar: 'SM',
    last_message: "Hi! I saw your post in the Townsville group. Do you do deep cleans? I've been injured and need help badly.",
    time: new Date(Date.now() - 1000 * 60 * 35),
    unread: true,
    starred: true,
    status: 'new',
    suburb: 'Kirwan',
    service: 'Deep Clean',
    messages: [
      { id: 'm1', from: 'Sarah Mitchell', text: "Hi! I saw your post in the Townsville group. Do you do deep cleans? I've been injured and need help badly.", time: new Date(Date.now() - 1000 * 60 * 35), outbound: false },
    ]
  },
  {
    id: '2',
    name: 'James Woodstock',
    platform: 'facebook',
    avatar: 'JW',
    last_message: "Looking for a reliable weekly cleaner — 4 hours every Wednesday. Budget is flexible for the right person.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 2),
    unread: true,
    starred: true,
    status: 'new',
    suburb: 'Townsville',
    service: 'Regular Weekly',
    messages: [
      { id: 'm1', from: 'James Woodstock', text: "Looking for a reliable weekly cleaner — 4 hours every Wednesday. Budget is flexible for the right person.", time: new Date(Date.now() - 1000 * 60 * 60 * 2), outbound: false },
    ]
  },
  {
    id: '3',
    name: 'Priya Sharma',
    platform: 'email',
    avatar: 'PS',
    last_message: "We have an open home inspection this Saturday. Need a full clean done Friday afternoon. Is that possible?",
    time: new Date(Date.now() - 1000 * 60 * 60 * 5),
    unread: false,
    starred: false,
    status: 'contacted',
    suburb: 'Castle Hill',
    service: 'Pre-Sale Clean',
    messages: [
      { id: 'm1', from: 'Priya Sharma', text: "We have an open home inspection this Saturday. Need a full clean done Friday afternoon. Is that possible?", time: new Date(Date.now() - 1000 * 60 * 60 * 5), outbound: false },
      { id: 'm2', from: 'Renee', text: "Hi Priya! Absolutely, we can fit you in Friday afternoon. I'll send through a quote shortly. What size is the property?", time: new Date(Date.now() - 1000 * 60 * 60 * 4), outbound: true },
    ]
  },
  {
    id: '4',
    name: 'Mark & Tanya Reeve',
    platform: 'facebook',
    avatar: 'MR',
    last_message: "Can you do Airbnb turnovers? We have a 3BR unit in the CBD that needs same-day cleans between guests.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 8),
    unread: false,
    starred: false,
    status: 'quoted',
    suburb: 'CBD',
    service: 'Airbnb Turnover',
    messages: [
      { id: 'm1', from: 'Mark & Tanya Reeve', text: "Can you do Airbnb turnovers? We have a 3BR unit in the CBD that needs same-day cleans between guests.", time: new Date(Date.now() - 1000 * 60 * 60 * 8), outbound: false },
      { id: 'm2', from: 'Renee', text: "Hi! Yes we definitely do Airbnb turnovers. For a 3BR CBD unit we're looking at around 3hrs per turn. Happy to discuss a regular arrangement!", time: new Date(Date.now() - 1000 * 60 * 60 * 7), outbound: true },
      { id: 'm3', from: 'Mark & Tanya Reeve', text: "That sounds great. Can you send us a quote for weekly turnovers? Sometimes it's 2x per week in peak season.", time: new Date(Date.now() - 1000 * 60 * 60 * 6), outbound: false },
    ]
  },
  {
    id: '5',
    name: 'Donna Pearce',
    platform: 'direct',
    avatar: 'DP',
    last_message: "Just wanted to say the team did an amazing job today. The house looks incredible. Will definitely book again!",
    time: new Date(Date.now() - 1000 * 60 * 60 * 24),
    unread: false,
    starred: false,
    status: 'converted',
    suburb: 'Idalia',
    service: 'Standard Clean',
    messages: [
      { id: 'm1', from: 'Donna Pearce', text: "Just wanted to say the team did an amazing job today. The house looks incredible. Will definitely book again!", time: new Date(Date.now() - 1000 * 60 * 60 * 24), outbound: false },
      { id: 'm2', from: 'Renee', text: "Thank you so much Donna! It was a pleasure. We'll get your next clean booked in — would fortnightly suit you?", time: new Date(Date.now() - 1000 * 60 * 60 * 23), outbound: true },
    ]
  },
];

const STATUS_BADGE = {
  new: { label: 'New', variant: 'default', className: 'bg-primary text-primary-foreground' },
  contacted: { label: 'Contacted', variant: 'secondary', className: 'bg-secondary text-secondary-foreground' },
  quoted: { label: 'Quoted', variant: 'outline', className: 'border-amber-500 text-amber-600' },
  converted: { label: 'Booked', variant: 'outline', className: 'border-emerald-500 text-emerald-600' },
};

export default function BusinessInbox() {
  const [selectedThread, setSelectedThread] = useState(SAMPLE_THREADS[0]);
  const [threads, setThreads] = useState(SAMPLE_THREADS);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const unreadCount = threads.filter(t => t.unread).length;

  const filteredThreads = threads.filter(t => {
    const matchSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.suburb.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTab = activeTab === 'all' || activeTab === t.status ||
      (activeTab === 'unread' && t.unread) ||
      (activeTab === 'starred' && t.starred);
    return matchSearch && matchTab;
  });

  const handleSelectThread = (thread) => {
    setSelectedThread(thread);
    // Mark as read
    setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, unread: false } : t));
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedThread) return;
    const newMsg = {
      id: `m${Date.now()}`,
      from: 'Renee',
      text: replyText,
      time: new Date(),
      outbound: true,
    };
    const updatedThreads = threads.map(t =>
      t.id === selectedThread.id
        ? { ...t, messages: [...t.messages, newMsg], last_message: replyText, time: new Date(), status: t.status === 'new' ? 'contacted' : t.status }
        : t
    );
    setThreads(updatedThreads);
    setSelectedThread(prev => ({ ...prev, messages: [...prev.messages, newMsg], status: prev.status === 'new' ? 'contacted' : prev.status }));
    setReplyText('');
  };

  const handleStar = (id) => {
    setThreads(prev => prev.map(t => t.id === id ? { ...t, starred: !t.starred } : t));
    if (selectedThread?.id === id) setSelectedThread(prev => ({ ...prev, starred: !prev.starred }));
  };

  const PlatformIcon = selectedThread ? (PLATFORM_ICONS[selectedThread.platform] || MessageCircle) : MessageCircle;

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-xl border border-border overflow-hidden bg-card">

      {/* LEFT PANEL — Thread list */}
      <div className="w-80 flex-shrink-0 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-sm text-foreground">Business Inbox</h2>
              {unreadCount > 0 && (
                <Badge className="h-5 text-[10px] px-1.5 bg-primary text-primary-foreground">{unreadCount}</Badge>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7">
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

        {/* Tabs */}
        <div className="px-3 pt-2 pb-1 border-b border-border">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-7 w-full grid grid-cols-4 text-[10px]">
              <TabsTrigger value="all" className="text-[10px]">All</TabsTrigger>
              <TabsTrigger value="unread" className="text-[10px]">Unread</TabsTrigger>
              <TabsTrigger value="starred" className="text-[10px]">⭐</TabsTrigger>
              <TabsTrigger value="converted" className="text-[10px]">Booked</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Thread list */}
        <ScrollArea className="flex-1">
          <div className="divide-y divide-border">
            {filteredThreads.length === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground">No messages found</div>
            )}
            {filteredThreads.map(thread => {
              const Icon = PLATFORM_ICONS[thread.platform] || MessageCircle;
              const isSelected = selectedThread?.id === thread.id;
              return (
                <div
                  key={thread.id}
                  onClick={() => handleSelectThread(thread)}
                  className={`p-3 cursor-pointer transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs bg-muted text-muted-foreground">{thread.avatar}</AvatarFallback>
                      </Avatar>
                      <Icon className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${PLATFORM_COLORS[thread.platform]} bg-card rounded-full p-0.5`} />
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
                        <span className="text-[10px] text-muted-foreground">{thread.suburb}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">{thread.service}</span>
                        {thread.unread && <span className="ml-auto w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* RIGHT PANEL — Conversation */}
      {selectedThread ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Conversation header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs bg-muted text-muted-foreground">{selectedThread.avatar}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{selectedThread.name}</span>
                  <Badge className={`h-4 text-[9px] px-1.5 border ${STATUS_BADGE[selectedThread.status]?.className}`}>
                    {STATUS_BADGE[selectedThread.status]?.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <PlatformIcon className={`w-3 h-3 ${PLATFORM_COLORS[selectedThread.platform]}`} />
                  <span className="text-[11px] text-muted-foreground capitalize">{selectedThread.platform}</span>
                  <span className="text-[11px] text-muted-foreground">· {selectedThread.suburb} · {selectedThread.service}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="icon" className="h-8 w-8"
                onClick={() => handleStar(selectedThread.id)}
              >
                <Star className={`w-4 h-4 ${selectedThread.starred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Archive className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {selectedThread.messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.outbound ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${msg.outbound ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'}`}>
                    {!msg.outbound && (
                      <p className="text-[10px] font-medium mb-1 opacity-70">{msg.from}</p>
                    )}
                    <p className="text-xs leading-relaxed">{msg.text}</p>
                    <div className={`flex items-center gap-1 mt-1 ${msg.outbound ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] opacity-60">{format(msg.time, 'h:mm a')}</span>
                      {msg.outbound && <CheckCheck className="w-3 h-3 opacity-60" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Reply box */}
          <div className="p-4 border-t border-border bg-card">
            {/* Quick reply suggestions */}
            <div className="flex gap-2 mb-2 flex-wrap">
              {[
                "Thanks for reaching out! I'd love to help. What suburb are you in?",
                "I can fit you in this week — what days work for you?",
                "I'll send through a quote shortly!",
              ].map(s => (
                <button
                  key={s}
                  onClick={() => setReplyText(s)}
                  className="text-[10px] px-2.5 py-1 rounded-full border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors truncate max-w-[200px]"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea
                placeholder={`Reply to ${selectedThread.name}...`}
                className="text-xs min-h-[60px] resize-none flex-1"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSendReply();
                }}
              />
              <Button
                onClick={handleSendReply}
                disabled={!replyText.trim()}
                className="self-end h-10 px-4"
              >
                <Send className="w-4 h-4 mr-1.5" />
                Send
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">Ctrl+Enter to send</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Inbox className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a conversation</p>
          </div>
        </div>
      )}
    </div>
  );
}
