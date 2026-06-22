import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Search, Globe, TrendingUp, TestTube,
  UserSearch, MapPin, Megaphone, Plug, AlertTriangle,
  History, Bell, Clock, CheckSquare, Settings, Link2, X, Bot
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'SEO Control Centre', icon: Search, path: '/seo' },
  { label: 'Website Crawl Centre', icon: Globe, path: '/crawl' },
  { label: 'Organic Traffic', icon: TrendingUp, path: '/traffic' },
  { label: 'QA Testing Centre', icon: TestTube, path: '/qa' },
  { label: 'AI Lead Finder', icon: UserSearch, path: '/leads' },
  { label: 'Townsville Leads', icon: MapPin, path: '/townsville-leads' },
  { label: 'Ad Generator', icon: Megaphone, path: '/ads' },
  { label: 'Platform Status', icon: Plug, path: '/platforms' },
  { label: 'Error/Fix Log', icon: AlertTriangle, path: '/errors' },
  { label: 'Scan History', icon: History, path: '/scan-history' },
  { label: 'Notifications', icon: Bell, path: '/notifications' },
  { label: 'Follow-up Reminders', icon: Clock, path: '/follow-ups' },
  { label: 'Approval Queue', icon: CheckSquare, path: '/approvals' },
  { label: 'URL Watchlist', icon: Link2, path: '/watchlist' },
  { label: 'Business Settings', icon: Settings, path: '/settings' },
  { label: 'Business Assistant', icon: Bot, path: '/agent' },
  { label: 'File Centre', icon: UserSearch, path: '/file-centre' },
];

export default function Sidebar({ activeBusiness, onBusinessChange, businesses, unreadCount, onClose }) {
  const location = useLocation();

  return (
    <aside className="h-screen w-64 bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold tracking-tight text-primary">BCC</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">Business Control Centre</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="p-3 border-b border-border">
        <Select value={activeBusiness?.id || ''} onValueChange={onBusinessChange}>
          <SelectTrigger className="w-full text-xs h-9 bg-muted/50">
            <SelectValue placeholder="Select business" />
          </SelectTrigger>
          <SelectContent>
            {businesses.map(b => (
              <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-0.5">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path} onClick={onClose}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}>
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.label === 'Notifications' && unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-auto h-4 text-[9px] px-1.5">{unreadCount}</Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="p-3 border-t border-border">
        <p className="text-[9px] text-muted-foreground text-center">Done For You Townsville</p>
      </div>
    </aside>
  );
}