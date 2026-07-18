import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/base44Client';
import PageHeader from '@/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/card';
import { Button } from '@/button';
import { Input } from '@/input';
import { Textarea } from '@/textarea';
import { Label } from '@/label';
import { Badge } from '@/badge';
import { Save, Loader2, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

// Strip empty strings from optional fields so Base44 doesn't reject with 400.
// Keeps null/undefined/0/false and non-empty strings. Arrays are always kept as-is.
function sanitizePayload(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) {
      out[k] = v;
    } else if (v === '' || v === undefined) {
      // omit — don't send empty strings for optional string fields
    } else {
      out[k] = v;
    }
  }
  return out;
}

export default function BusinessSettings() {
  const { activeBusiness } = useOutletContext();
  const qc = useQueryClient();
  const [form, setForm] = useState({});
  const [newService, setNewService] = useState('');
  const [newSuburb, setNewSuburb] = useState('');

  useEffect(() => {
    if (activeBusiness) {
      setForm({
        name: activeBusiness.name || '',
        website_url: activeBusiness.website_url || '',
        second_website_url: activeBusiness.second_website_url || '',
        pricing_notes: activeBusiness.pricing_notes || '',
        response_tone: activeBusiness.response_tone || '',
        google_business_profile_url: activeBusiness.google_business_profile_url || '',
        facebook_page_url: activeBusiness.facebook_page_url || '',
        contact_email: activeBusiness.contact_email || '',
        contact_phone: activeBusiness.contact_phone || '',
        service_base_address: activeBusiness.service_base_address || '',
        service_radius_km: activeBusiness.service_radius_km ?? '',
        abn: activeBusiness.abn || '',
        bank_account_name: activeBusiness.bank_account_name || '',
        bank_bsb: activeBusiness.bank_bsb || '',
        bank_account_number: activeBusiness.bank_account_number || '',
        payment_reference: activeBusiness.payment_reference || '',
        services: activeBusiness.services || [],
        suburbs_served: activeBusiness.suburbs_served || [],
      });
    }
  }, [activeBusiness]);

  const saveMutation = useMutation({
    mutationFn: () => {
      // Sanitize service_radius_km: must be number or omitted, never empty string
      let radius = form.service_radius_km;
      if (radius === '' || radius === undefined || radius === null) {
        radius = undefined; // will be omitted by sanitizePayload
      } else if (typeof radius === 'string') {
        const parsed = Number(radius);
        radius = Number.isNaN(parsed) ? undefined : parsed;
      } else if (typeof radius === 'number' && Number.isNaN(radius)) {
        radius = undefined;
      }

      const payload = sanitizePayload({ ...form, service_radius_km: radius });
      return base44.entities.Business.update(activeBusiness.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['businesses'] });
      toast.success('Settings saved');
    },
    onError: (err) => {
      toast.error(`Save failed: ${err?.message || 'Unknown error'}`);
    },
  });

  if (!activeBusiness) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Settings"
        description={`Configure ${activeBusiness.name}`}
        business={activeBusiness}
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
            <div>
              <Label className="text-xs">Business Name</Label>
              <Input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Website URL</Label>
              <Input
                value={form.website_url || ''}
                onChange={e => setForm({...form, website_url: e.target.value})}
                placeholder="e.g. reneescleaningservicestsv.com"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Second Website URL (optional)</Label>
              <Input
                value={form.second_website_url || ''}
                onChange={e => setForm({...form, second_website_url: e.target.value})}
                placeholder="e.g. doneforyoutownsville.com"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Contact Email</Label>
              <Input value={form.contact_email || ''} onChange={e => setForm({...form, contact_email: e.target.value})} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Contact Phone</Label>
              <Input value={form.contact_phone || ''} onChange={e => setForm({...form, contact_phone: e.target.value})} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Service Base Address</Label>
              <Input value={form.service_base_address || ''} onChange={e => setForm({...form, service_base_address: e.target.value})} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Service Radius (km)</Label>
              <Input
                type="number"
                value={form.service_radius_km ?? ''}
                onChange={e => setForm({...form, service_radius_km: e.target.value === '' ? '' : Number(e.target.value)})}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">ABN</Label>
              <Input value={form.abn || ''} onChange={e => setForm({...form, abn: e.target.value})} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Bank Account Name</Label>
              <Input
                value={form.bank_account_name || ''}
                onChange={e => setForm({...form, bank_account_name: e.target.value})}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">BSB</Label>
              <Input
                value={form.bank_bsb || ''}
                onChange={e => setForm({...form, bank_bsb: e.target.value})}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Account Number</Label>
              <Input
                value={form.bank_account_number || ''}
                onChange={e => setForm({...form, bank_account_number: e.target.value})}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Payment Reference Instructions</Label>
              <Input
                value={form.payment_reference || ''}
                onChange={e => setForm({...form, payment_reference: e.target.value})}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Google Business Profile URL</Label>
              <Input value={form.google_business_profile_url || ''} onChange={e => setForm({...form, google_business_profile_url: e.target.value})} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Facebook Page URL</Label>
              <Input value={form.facebook_page_url || ''} onChange={e => setForm({...form, facebook_page_url: e.target.value})} className="h-8 text-xs" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Response Settings</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Response Tone</Label>
              <Textarea value={form.response_tone || ''} onChange={e => setForm({...form, response_tone: e.target.value})} rows={3} className="text-xs" />
            </div>
            <div>
              <Label className="text-xs">Pricing Notes</Label>
              <Textarea value={form.pricing_notes || ''} onChange={e => setForm({...form, pricing_notes: e.target.value})} rows={4} className="text-xs" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Services ({form.services?.length || 0})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {form.services?.map((s, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                  {s}
                  <button onClick={() => setForm({...form, services: form.services.filter((_, idx) => idx !== i)})}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newService}
                onChange={e => setNewService(e.target.value)}
                className="h-8 text-xs"
                placeholder="Add service..."
                onKeyDown={e => {
                  if (e.key === 'Enter' && newService.trim()) {
                    setForm({...form, services: [...(form.services||[]), newService.trim()]});
                    setNewService('');
                  }
                }}
              />
              <Button size="sm" variant="outline" className="h-8" onClick={() => {
                if (newService.trim()) {
                  setForm({...form, services: [...(form.services||[]), newService.trim()]});
                  setNewService('');
                }
              }}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Suburbs Served ({form.suburbs_served?.length || 0})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {form.suburbs_served?.map((s, i) => (
                <Badge key={i} variant="outline" className="text-[10px] gap-1">
                  {s}
                  <button onClick={() => setForm({...form, suburbs_served: form.suburbs_served.filter((_, idx) => idx !== i)})}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newSuburb}
                onChange={e => setNewSuburb(e.target.value)}
                className="h-8 text-xs"
                placeholder="Add suburb..."
                onKeyDown={e => {
                  if (e.key === 'Enter' && newSuburb.trim()) {
                    setForm({...form, suburbs_served: [...(form.suburbs_served||[]), newSuburb.trim()]});
                    setNewSuburb('');
                  }
                }}
              />
              <Button size="sm" variant="outline" className="h-8" onClick={() => {
                if (newSuburb.trim()) {
                  setForm({...form, suburbs_served: [...(form.suburbs_served||[]), newSuburb.trim()]});
                  setNewSuburb('');
                }
              }}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
                }
