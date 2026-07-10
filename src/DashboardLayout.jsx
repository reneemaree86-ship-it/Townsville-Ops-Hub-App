import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { base44 } from '@/base44Client';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/Sidebar';
import { Bell, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/button';
import { Badge } from '@/badge';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const [activeBusinessId, setActiveBusinessId] = useState(null);

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => base44.entities.Business.list(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => base44.entities.NotificationQueue.filter({ read: false }),
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (businesses.length > 0 && !activeBusinessId) {
      setActiveBusinessId(businesses[0].id);
    }
  }, [businesses, activeBusinessId]);

  const activeBusiness = businesses.find(b => b.id === activeBusinessId) || businesses[0];
  const unreadCount = notifications.length;

  const handleBusinessChange = (id) => {
    setActiveBusinessId(id);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[70] bg-card border-b border-border px-4 h-14 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
        <span className="text-sm font-bold text-primary">Townsville Ops Hub</span>
        <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/notifications')}>
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 text-[9px] px-1">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-screen z-[60] transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:z-40`}>
        <Sidebar
          activeBusiness={activeBusiness}
          onBusinessChange={handleBusinessChange}
          businesses={businesses}
          unreadCount={unreadCount}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-6">
          <Outlet context={{ activeBusiness, businesses }} />
        </div>
      </main>
    </div>
  );
}