import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, X, Plus, UserPlus, Shield } from 'lucide-react';
import { toast } from 'sonner';
import GoogleBusinessConnectionCard from '@/components/settings/GoogleBusinessConnectionCard';

export default function BusinessSettings() {
  const { activeBusiness } = useOutletContext();
  const qc = useQueryClient();
  const [form, setForm] = useState({});
  const [newService, setNewService] = useState('');
  const [newSuburb, setNewSuburb] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: currentUser?.role === 'admin',
  });

  const inviteMutation = useMutation({
    mutationFn: () => base44.users.inviteUser(inviteEmail, inviteRole),
    onSuccess: () => { toast.success(`Invite sent to ${inviteEmail}`); setInviteEmail(''); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: (e) => toast.error('Failed to invite: ' + (e?.message || 'Unknown error')),
  });

  useEffect(() => {
    if (activeBusiness) {
      setForm({
        name: activeBusiness.name || '',
        website_url: activeBusiness.website_url || '',
        second_website_url: activeBusiness.second_website_url || '',
        service_base_address: activeBusiness.service_base_address || '',
        service_radius_km: activeBusiness.service_radius_km != null ? String(activeBusiness.service_radius_km) : '',
        pricing_notes: activeBusiness.pricing_notes || '',
        response_tone: activeBusiness.response_tone || '',
        google_business_profile_url: activeBusiness.google_business_profile_url || '',
        facebook_page_url: activeBusiness.facebook_page_url || '',
        contact_email: activeBusiness.contact_email || '',
        contact_phone: activeBusiness.contact_phone || '',
        services: activeBusiness.services || [],
        suburbs_served: activeBusiness.suburbs_served || [],
      });
    }
  }, [activeBusiness]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form.name?.trim() || !form.website_url?.trim()) {
        throw new Error('Business Name and Website URL are required');
      }
      const payload = {
        ...form,
        service_radius_km: form.service_radius_km !== '' && form.service_radius_km != null
          ? Number(form.service_radius_km)
          : null,
      };
      return base44.entities.Business.update(activeBusiness.id, payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['businesses'] }); toast.success('Settings saved'); },
    onError: (e) => toast.error(e?.response?.data?.error || e.message || 'Failed to save settings'),
  });

  if (!activeBusiness) return null;

  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="space-y-6">
        <PageHeader title="Business Settings" description="Admin access required" business={activeBusiness} />
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <Shield className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium">Access Restricted</p>
            <p className="text-xs text-muted-foreground">Only admins can view or edit business settings. Contact your administrator if you need access.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Business Settings" description={`Configure ${activeBusiness.name}`} business={activeBusiness}
        actions={
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </Button>
        }
      />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Basic Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="text-xs">Business Name</Label><Input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Website URL</Label><Input value={form.website_url || ''} onChange={e => setForm({...form, website_url: e.target.value})} className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Second Website URL</Label><Input value={form.second_website_url || ''} onChange={e => setForm({...form, second_website_url: e.target.value})} className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Service Base Address</Label><Input value={form.service_base_address || ''} onChange={e => setForm({...form, service_base_address: e.target.value})} className="h-8 text-xs" placeholder="e.g. Mount Low, Townsville" /></div>
            <div><Label className="text-xs">Service Radius (km)</Label><Input type="number" min={0} value={form.service_radius_km || ''} onChange={e => setForm({...form, service_radius_km: e.target.value})} className="h-8 text-xs" placeholder="e.g. 30" /></div>
            <div><Label className="text-xs">Contact Email</Label><Input value={form.contact_email || ''} onChange={e => setForm({...form, contact_email: e.target.value})} className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Contact Phone</Label><Input value={form.contact_phone || ''} onChange={e => setForm({...form, contact_phone: e.target.value})} className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Google Business Profile URL</Label><Input value={form.google_business_profile_url || ''} onChange={e => setForm({...form, google_business_profile_url: e.target.value})} className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Facebook Page URL</Label><Input value={form.facebook_page_url || ''} onChange={e => setForm({...form, facebook_page_url: e.target.value})} className="h-8 text-xs" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Response Settings</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="text-xs">Response Tone</Label><Textarea value={form.response_tone || ''} onChange={e => setForm({...form, response_tone: e.target.value})} rows={3} className="text-xs" /></div>
            <div><Label className="text-xs">Pricing Notes</Label><Textarea value={form.pricing_notes || ''} onChange={e => setForm({...form, pricing_notes: e.target.value})} rows={4} className="text-xs" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Services ({form.services?.length || 0})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {form.services?.map((s, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] gap-1">{s}
                  <button onClick={() => setForm({...form, services: form.services.filter((_, idx) => idx !== i)})}><X className="w-2.5 h-2.5" /></button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newService} onChange={e => setNewService(e.target.value)} className="h-8 text-xs" placeholder="Add service..." onKeyDown={e => { if (e.key === 'Enter' && newService.trim()) { setForm({...form, services: [...(form.services||[]), newService.trim()]}); setNewService(''); }}} />
              <Button size="sm" variant="outline" className="h-8" onClick={() => { if (newService.trim()) { setForm({...form, services: [...(form.services||[]), newService.trim()]}); setNewService(''); }}}><Plus className="w-3.5 h-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
        <GoogleBusinessConnectionCard businessId={activeBusiness.id} />
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Suburbs Served ({form.suburbs_served?.length || 0})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {form.suburbs_served?.map((s, i) => (
                <Badge key={i} variant="outline" className="text-[10px] gap-1">{s}
                  <button onClick={() => setForm({...form, suburbs_served: form.suburbs_served.filter((_, idx) => idx !== i)})}><X className="w-2.5 h-2.5" /></button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newSuburb} onChange={e => setNewSuburb(e.target.value)} className="h-8 text-xs" placeholder="Add suburb..." onKeyDown={e => { if (e.key === 'Enter' && newSuburb.trim()) { setForm({...form, suburbs_served: [...(form.suburbs_served||[]), newSuburb.trim()]}); setNewSuburb(''); }}} />
              <Button size="sm" variant="outline" className="h-8" onClick={() => { if (newSuburb.trim()) { setForm({...form, suburbs_served: [...(form.suburbs_served||[]), newSuburb.trim()]}); setNewSuburb(''); }}}><Plus className="w-3.5 h-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {currentUser?.role === 'admin' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> User Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-3">Invite team members to access this app. Admins have full access; users have standard access.</p>
              <div className="flex gap-2 flex-wrap">
                <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="h-8 text-xs flex-1 min-w-[180px]" placeholder="Email address" type="email" />
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="h-8 text-xs border border-input rounded-md px-2 bg-background">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending || !inviteEmail.trim()}>
                  {inviteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />} Invite
                </Button>
              </div>
            </div>
            {users.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Current Users</p>
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs">
                    <div>
                      <span className="font-medium">{u.full_name || u.email}</span>
                      {u.full_name && <span className="text-muted-foreground ml-2">{u.email}</span>}
                    </div>
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="text-[10px] capitalize">{u.role || 'user'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}