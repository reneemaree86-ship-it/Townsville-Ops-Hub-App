import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { startOfWeek, addDays, addWeeks, subWeeks, format, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronLeft, ChevronRight, Calendar, Clock, User, MapPin, CheckCircle2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import BookingModal from '@/components/bookings/BookingModal';

const SERVICE_COLORS = {
  deep_clean: 'bg-purple-100 border-purple-300 text-purple-800',
  fortnightly: 'bg-blue-100 border-blue-300 text-blue-800',
  weekly: 'bg-cyan-100 border-cyan-300 text-cyan-800',
  office_cleaning: 'bg-indigo-100 border-indigo-300 text-indigo-800',
  inspection_rescue: 'bg-red-100 border-red-300 text-red-800',
  one_off_urgent: 'bg-orange-100 border-orange-300 text-orange-800',
  airbnb_shortstay: 'bg-pink-100 border-pink-300 text-pink-800',
  move_in: 'bg-green-100 border-green-300 text-green-800',
  general_residential: 'bg-teal-100 border-teal-300 text-teal-800',
  commercial: 'bg-slate-100 border-slate-300 text-slate-800',
  other: 'bg-gray-100 border-gray-300 text-gray-800',
};

export default function Bookings() {
  const { activeBusiness } = useOutletContext();
  const qc = useQueryClient();
  const [weekDate, setWeekDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editBooking, setEditBooking] = useState(null);

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', activeBusiness?.id],
    queryFn: () => activeBusiness ? base44.entities.Booking.filter({ business_id: activeBusiness.id }, 'date') : [],
    enabled: !!activeBusiness?.id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', activeBusiness?.id],
    queryFn: () => activeBusiness ? base44.entities.Client.filter({ business_id: activeBusiness.id }) : [],
    enabled: !!activeBusiness?.id,
  });

  const completeMutation = useMutation({
    mutationFn: (id) => base44.entities.Booking.update(id, { status: 'completed' }),
    onSuccess: () => qc.invalidateQueries(['bookings', activeBusiness?.id]),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Booking.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['bookings', activeBusiness?.id]);
      setShowModal(false);
      setEditBooking(null);
    },
  });

  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getBookingsForDay = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return bookings
      .filter(b => b.date === dateStr)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  };

  const todayBookings = getBookingsForDay(new Date());
  const weekEnd = addDays(weekStart, 6);
  const weekBookings = bookings.filter(b => b.date >= format(weekStart, 'yyyy-MM-dd') && b.date <= format(weekEnd, 'yyyy-MM-dd'));

  const upcomingBookings = bookings
    .filter(b => b.date >= format(new Date(), 'yyyy-MM-dd') && b.status !== 'cancelled' && b.status !== 'completed')
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start_time || '').localeCompare(b.start_time || ''));

  const handleSaved = () => {
    qc.invalidateQueries(['bookings', activeBusiness?.id]);
    setShowModal(false);
    setEditBooking(null);
  };

  const handleEdit = (booking) => {
    setEditBooking(booking);
    setShowModal(true);
  };

  const openNew = () => {
    setEditBooking(null);
    setShowModal(true);
  };

  return (
    <div>
      <PageHeader
        title="Bookings & Schedule"
        description="Track and manage all cleaning bookings"
        business={activeBusiness}
        actions={
          <Button size="sm" onClick={openNew}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Booking
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Today's Cleans", value: todayBookings.length, sub: `${todayBookings.filter(b => b.status === 'confirmed').length} confirmed` },
          { label: 'This Week', value: weekBookings.length, sub: `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}` },
          { label: 'Upcoming', value: upcomingBookings.length, sub: 'not yet complete' },
          { label: 'Active Clients', value: clients.filter(c => c.status !== 'inactive').length, sub: `${clients.length} total` },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold mt-0.5">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today's schedule highlight */}
      {todayBookings.length > 0 && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Today — {format(new Date(), 'EEEE, MMMM d')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-2">
              {todayBookings.map(b => (
                <div key={b.id}
                  className="flex items-center gap-3 bg-background rounded-lg p-3 border hover:border-primary/40 transition-colors">
                  <div className={`w-1 h-10 rounded-full flex-shrink-0 ${b.status === 'completed' ? 'bg-emerald-500' : 'bg-primary'}`} />
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleEdit(b)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{b.client_name}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {b.start_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.start_time}{b.end_time ? ` – ${b.end_time}` : ''}</span>}
                      {(b.suburb || b.client_address) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{b.client_address || b.suburb}</span>}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize flex-shrink-0">{(b.service_type || 'other').replace(/_/g, ' ')}</Badge>
                  {b.status !== 'completed' && b.status !== 'cancelled' && (
                    <Button size="sm" variant="outline" className="text-xs h-7 gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50 flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); completeMutation.mutate(b.id); }}
                      disabled={completeMutation.isPending}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Done
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Calendar */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm">Weekly Calendar</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setWeekDate(d => subWeeks(d, 1))}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs font-medium min-w-[130px] text-center">
                {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
              </span>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setWeekDate(d => addWeeks(d, 1))}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setWeekDate(new Date())}>Today</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 gap-1.5 min-w-[560px]">
              {weekDays.map((day, i) => {
                const dayBookings = getBookingsForDay(day);
                const today = isToday(day);
                return (
                  <div key={i} className={`min-h-[130px] rounded-lg border p-1.5 ${today ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <div className={`text-center mb-1.5 pb-1 border-b ${today ? 'border-primary/20' : 'border-border'}`}>
                      <p className={`text-[10px] font-medium uppercase ${today ? 'text-primary' : 'text-muted-foreground'}`}>{format(day, 'EEE')}</p>
                      <p className={`text-sm font-bold ${today ? 'text-primary' : ''}`}>{format(day, 'd')}</p>
                    </div>
                    <div className="space-y-1">
                      {dayBookings.map(b => (
                        <div key={b.id} onClick={() => handleEdit(b)}
                          className={`text-[9px] p-1 rounded border cursor-pointer truncate leading-tight ${SERVICE_COLORS[b.service_type] || SERVICE_COLORS.other}`}
                          title={`${b.client_name}${b.start_time ? ' at ' + b.start_time : ''}`}>
                          {b.start_time && <span className="font-bold">{b.start_time} </span>}
                          {b.client_name}
                        </div>
                      ))}
                      <button onClick={openNew}
                        className="w-full text-[9px] text-muted-foreground hover:text-primary py-0.5 text-center hover:bg-primary/5 rounded transition-colors">
                        + add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming list */}
      {upcomingBookings.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm">Upcoming Bookings</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-1.5">
              {upcomingBookings.slice(0, 12).map(b => (
                <div key={b.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/30 transition-colors">
                  <div className="text-center min-w-[44px] flex-shrink-0 cursor-pointer" onClick={() => handleEdit(b)}>
                    <p className="text-[10px] text-muted-foreground uppercase">{format(new Date(b.date + 'T12:00:00'), 'EEE')}</p>
                    <p className="text-sm font-bold">{format(new Date(b.date + 'T12:00:00'), 'd MMM')}</p>
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleEdit(b)}>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{b.client_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {b.start_time && <span>{b.start_time}{b.end_time ? ` – ${b.end_time}` : ''}</span>}
                      {b.suburb && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{b.suburb}</span>}
                      <span className="capitalize">{(b.service_type || '').replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={b.status} />
                    {b.estimated_value > 0 && <span className="text-xs font-semibold text-emerald-600">${b.estimated_value}</span>}
                    <Button size="sm" variant="outline" className="text-xs h-7 gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                      onClick={() => completeMutation.mutate(b.id)}
                      disabled={completeMutation.isPending}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Done
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {bookings.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold mb-1">No bookings yet</p>
            <p className="text-xs text-muted-foreground mb-4">Add your first booking to start tracking your schedule</p>
            <Button size="sm" onClick={openNew}><Plus className="w-3.5 h-3.5 mr-1" />Add First Booking</Button>
          </CardContent>
        </Card>
      )}

      {showModal && (
        <BookingModal
          booking={editBooking}
          business={activeBusiness}
          clients={clients}
          onSaved={handleSaved}
          onClose={() => { setShowModal(false); setEditBooking(null); }}
          onDelete={editBooking ? () => deleteMutation.mutate(editBooking.id) : null}
        />
      )}
    </div>
  );
}