import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ChevronLeft, ChevronRight, Calendar, Users, Clock, DollarSign, Trash2, Pencil, Phone, MapPin } from 'lucide-react';
import BookingForm from '@/components/bookings/BookingForm';
import ClientForm from '@/components/bookings/ClientForm';
import { useToast } from '@/components/ui/use-toast';
import moment from 'moment';

const STATUS_COLORS = {
  scheduled: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  confirmed: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  in_progress: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  completed: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
  no_show: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
};

const SERVICE_LABELS = {
  general_residential: 'General', deep_clean: 'Deep Clean', fortnightly: 'Fortnightly',
  weekly: 'Weekly', move_in: 'Move In/Out', inspection_rescue: 'Inspection',
  airbnb_shortstay: 'Airbnb', office_cleaning: 'Office', commercial: 'Commercial',
  window_cleaning: 'Windows', pressure_washing: 'Pressure Wash', hoarder_heavy: 'Hoarder',
  one_off_urgent: 'Urgent', other: 'Other',
};

export default function Scheduling() {
  const { activeBusiness } = useOutletContext();
  const { toast } = useToast();
  const qc = useQueryClient();
  const businessId = activeBusiness?.id;

  const [weekStart, setWeekStart] = useState(() => moment().startOf('isoWeek'));
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [editBooking, setEditBooking] = useState(null);
  const [editClient, setEditClient] = useState(null);
  const [defaultDate, setDefaultDate] = useState('');

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => weekStart.clone().add(i, 'days')), [weekStart]);

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', businessId],
    queryFn: () => base44.entities.Booking.filter({ business_id: businessId }),
    enabled: !!businessId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', businessId],
    queryFn: () => base44.entities.Client.filter({ business_id: businessId }),
    enabled: !!businessId,
  });

  const createBooking = useMutation({
    mutationFn: (data) => base44.entities.Booking.create({ ...data, business_id: businessId }),
    onSuccess: (booking) => {
      qc.invalidateQueries(['bookings', businessId]);
      // Create an in-app notification alert
      base44.entities.Notification.create({
        business_id: businessId,
        type: 'scan_complete',
        title: `Clean Scheduled: ${booking.client_name}`,
        message: `${SERVICE_LABELS[booking.service_type] || booking.service_type} at ${booking.client_address || 'TBC'} on ${moment(booking.date).format('ddd D MMM')} at ${booking.start_time}`,
        severity: 'medium',
        read: false,
        related_entity_type: 'Booking',
        related_entity_id: booking.id,
      });
      toast({ title: '✅ Booking added', description: `${booking.client_name} on ${moment(booking.date).format('ddd D MMM')} at ${booking.start_time}` });
    },
  });

  const updateBooking = useMutation({
    mutationFn: ({ id, ...data }) => base44.entities.Booking.update(id, data),
    onSuccess: () => qc.invalidateQueries(['bookings', businessId]),
  });

  const deleteBooking = useMutation({
    mutationFn: (id) => base44.entities.Booking.delete(id),
    onSuccess: () => qc.invalidateQueries(['bookings', businessId]),
  });

  const createClient = useMutation({
    mutationFn: (data) => base44.entities.Client.create({ ...data, business_id: businessId }),
    onSuccess: () => {
      qc.invalidateQueries(['clients', businessId]);
      toast({ title: '✅ Client added' });
    },
  });

  const updateClient = useMutation({
    mutationFn: ({ id, ...data }) => base44.entities.Client.update(id, data),
    onSuccess: () => qc.invalidateQueries(['clients', businessId]),
  });

  const deleteClient = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => qc.invalidateQueries(['clients', businessId]),
  });

  const handleSaveBooking = async (data) => {
    if (editBooking) {
      await updateBooking.mutateAsync({ id: editBooking.id, ...data });
    } else {
      await createBooking.mutateAsync(data);
    }
    setEditBooking(null);
  };

  const handleSaveClient = async (data) => {
    if (editClient) {
      await updateClient.mutateAsync({ id: editClient.id, ...data });
    } else {
      await createClient.mutateAsync(data);
    }
    setEditClient(null);
  };

  const getBookingsForDay = (day) =>
    bookings
      .filter(b => b.date === day.format('YYYY-MM-DD') && b.status !== 'cancelled')
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

  const todayStr = moment().format('YYYY-MM-DD');
  const todayBookings = bookings.filter(b => b.date === todayStr && b.status !== 'cancelled');
  const weekBookings = bookings.filter(b => {
    const d = moment(b.date);
    return d.isSameOrAfter(weekStart) && d.isBefore(weekStart.clone().add(7, 'days')) && b.status !== 'cancelled';
  });
  const revenue = weekBookings.reduce((sum, b) => sum + (b.price || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Bookings & Scheduling</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{activeBusiness?.name}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-xs" onClick={() => { setShowClientForm(true); setEditClient(null); }}>
            <Users className="w-3.5 h-3.5 mr-1" /> Add Client
          </Button>
          <Button size="sm" className="text-xs" onClick={() => { setShowBookingForm(true); setEditBooking(null); setDefaultDate(moment().format('YYYY-MM-DD')); }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Booking
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Today's Cleans", value: todayBookings.length, icon: Calendar, color: 'text-blue-600' },
          { label: 'This Week', value: weekBookings.length, icon: Clock, color: 'text-emerald-600' },
          { label: 'Week Revenue', value: `$${revenue.toFixed(0)}`, icon: DollarSign, color: 'text-amber-600' },
          { label: 'Total Clients', value: clients.filter(c => c.status === 'active').length, icon: Users, color: 'text-violet-600' },
        ].map(s => (
          <Card key={s.label} className="p-3">
            <div className="flex items-center gap-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <div>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold leading-tight">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="calendar">
        <TabsList className="text-xs">
          <TabsTrigger value="calendar" className="text-xs">Weekly Calendar</TabsTrigger>
          <TabsTrigger value="list" className="text-xs">All Bookings</TabsTrigger>
          <TabsTrigger value="clients" className="text-xs">Clients</TabsTrigger>
        </TabsList>

        {/* ── CALENDAR TAB ── */}
        <TabsContent value="calendar">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  {weekStart.format('D MMM')} — {weekStart.clone().add(6, 'days').format('D MMM YYYY')}
                </CardTitle>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setWeekStart(w => w.clone().subtract(7, 'days'))}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => setWeekStart(moment().startOf('isoWeek'))}>
                    Today
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setWeekStart(w => w.clone().add(7, 'days'))}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map(day => {
                  const isToday = day.isSame(moment(), 'day');
                  const dayBookings = getBookingsForDay(day);
                  return (
                    <div key={day.format()} className={`rounded-lg border min-h-[120px] p-1.5 ${isToday ? 'border-primary bg-primary/5' : 'border-border'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <p className="text-[9px] text-muted-foreground uppercase">{day.format('ddd')}</p>
                          <p className={`text-sm font-bold leading-none ${isToday ? 'text-primary' : ''}`}>{day.format('D')}</p>
                        </div>
                        <button
                          className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          onClick={() => { setDefaultDate(day.format('YYYY-MM-DD')); setEditBooking(null); setShowBookingForm(true); }}
                          title="Add booking"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        {dayBookings.map(b => (
                          <button
                            key={b.id}
                            onClick={() => { setEditBooking(b); setShowBookingForm(true); }}
                            className="w-full text-left rounded p-1 bg-primary/10 hover:bg-primary/20 transition-colors"
                          >
                            <p className="text-[9px] font-semibold text-primary truncate">{b.client_name}</p>
                            <p className="text-[8px] text-muted-foreground">{b.start_time} · {SERVICE_LABELS[b.service_type] || b.service_type}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ALL BOOKINGS TAB ── */}
        <TabsContent value="list">
          <Card>
            <CardContent className="p-0">
              {bookings.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">No bookings yet. Add your first booking above.</div>
              ) : (
                <div className="divide-y divide-border">
                  {[...bookings].sort((a, b) => `${b.date}${b.start_time}`.localeCompare(`${a.date}${a.start_time}`)).map(b => (
                    <div key={b.id} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-semibold">{b.client_name}</p>
                          <Badge variant="outline" className={`text-[9px] ${STATUS_COLORS[b.status] || ''}`}>{b.status?.replace('_',' ')}</Badge>
                          {b.recurring && b.recurring !== 'none' && (
                            <Badge variant="outline" className="text-[9px] bg-violet-500/10 text-violet-600 border-violet-500/20">{b.recurring}</Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {moment(b.date).format('ddd D MMM YYYY')} · {b.start_time}{b.end_time ? ` – ${b.end_time}` : ''} · {SERVICE_LABELS[b.service_type] || b.service_type}
                        </p>
                        {b.client_address && <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5"><MapPin className="w-2.5 h-2.5" />{b.client_address}</p>}
                        {b.price > 0 && <p className="text-[10px] font-medium text-emerald-600 mt-0.5">${b.price}</p>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditBooking(b); setShowBookingForm(true); }}>
                          <Pencil className="w-3 h-3 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { if (confirm('Delete this booking?')) deleteBooking.mutate(b.id); }}>
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CLIENTS TAB ── */}
        <TabsContent value="clients">
          <div className="flex justify-end mb-3">
            <Button size="sm" className="text-xs" onClick={() => { setShowClientForm(true); setEditClient(null); }}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Client
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {clients.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">No clients yet. Add your first client above.</div>
              ) : (
                <div className="divide-y divide-border">
                  {clients.map(c => {
                    const clientBookings = bookings.filter(b => b.client_id === c.id);
                    const lastBooking = clientBookings.sort((a,b) => b.date.localeCompare(a.date))[0];
                    return (
                      <div key={c.id} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold">{c.name}</p>
                            <Badge variant="outline" className={`text-[9px] ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}>{c.status}</Badge>
                          </div>
                          {c.phone && <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5"><Phone className="w-2.5 h-2.5" />{c.phone}</p>}
                          {c.address && <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{c.address}{c.suburb ? `, ${c.suburb}` : ''}</p>}
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {clientBookings.length} booking{clientBookings.length !== 1 ? 's' : ''}
                            {lastBooking ? ` · Last: ${moment(lastBooking.date).format('D MMM YYYY')}` : ''}
                          </p>
                          {c.notes && <p className="text-[10px] text-muted-foreground italic mt-0.5 truncate">{c.notes}</p>}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditClient(c); setShowClientForm(true); }}>
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { if (confirm('Delete this client?')) deleteClient.mutate(c.id); }}>
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <BookingForm
        open={showBookingForm}
        onClose={() => { setShowBookingForm(false); setEditBooking(null); }}
        onSave={handleSaveBooking}
        clients={clients}
        booking={editBooking}
        defaultDate={defaultDate}
      />
      <ClientForm
        open={showClientForm}
        onClose={() => { setShowClientForm(false); setEditClient(null); }}
        onSave={handleSaveClient}
        client={editClient}
      />
    </div>
  );
}