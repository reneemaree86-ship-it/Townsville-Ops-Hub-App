import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link2, Unlink, RefreshCw, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function GoogleBusinessConnectionCard({ businessId }) {
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const { data: connection } = useQuery({
    queryKey: ['google-business-connection', businessId],
    queryFn: async () => {
      const all = await base44.entities.PlatformConnection.filter({ platform_name: 'Google Business Profile', business_id: businessId });
      return all[0] || null;
    },
    enabled: !!businessId,
  });

  const getStatus = () => {
    if (!connection || connection.connection_status === 'not_connected') return { label: 'Disconnected', color: 'bg-slate-100 text-slate-600 border-slate-300' };
    if (connection.connection_status === 'requires_authorised_connection') return { label: 'Action Required', color: 'bg-amber-50 text-amber-700 border-amber-300' };
    const expired = connection.token_expires_at && new Date(connection.token_expires_at).getTime() <= Date.now();
    if (expired) return { label: 'Expired', color: 'bg-red-50 text-red-600 border-red-300' };
    if (!connection.location_id) return { label: 'Action Required', color: 'bg-amber-50 text-amber-700 border-amber-300' };
    return { label: 'Connected', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' };
  };

  const status = getStatus();
  const isConnected = connection && connection.connection_status !== 'not_connected';

  const handleConnect = async () => {
    const redirect_uri = `${window.location.origin}/google-business-callback`;
    const res = await base44.functions.invoke('googleBusinessOAuthStart', { business_id: businessId, redirect_uri });
    if (res.data?.authUrl) window.location.href = res.data.authUrl;
    else toast.error(res.data?.error || 'Failed to start Google connection');
  };

  const disconnectMutation = useMutation({
    mutationFn: () => base44.functions.invoke('googleBusinessDisconnect', { business_id: businessId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['google-business-connection', businessId] }); toast.success('Disconnected from Google Business Profile'); },
    onError: (e) => toast.error(e.message || 'Failed to disconnect'),
  });

  const selectLocationMutation = useMutation({
    mutationFn: (loc) => base44.functions.invoke('googleBusinessSelectLocation', { business_id: businessId, account_name: loc.account_name, location_id: loc.location_id, location_name: loc.location_name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['google-business-connection', businessId] }); setPickerOpen(false); toast.success('Location saved'); },
    onError: (e) => toast.error(e.message || 'Failed to save location'),
  });

  const handleSelectLocation = async () => {
    setLoadingLocations(true);
    setPickerOpen(true);
    try {
      const res = await base44.functions.invoke('googleBusinessFetchLocations', { business_id: businessId });
      if (res.data?.error) {
        toast.error(res.data.error);
        setPickerOpen(false);
      } else {
        setLocations(res.data.locations || []);
      }
    } catch (e) {
      toast.error(e.message || 'Failed to fetch locations');
      setPickerOpen(false);
    } finally {
      setLoadingLocations(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Google Business Profile</span>
          <Badge variant="outline" className={`text-[10px] ${status.color}`}>{status.label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {connection?.location_name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" /> {connection.location_name}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {!isConnected && (
            <Button size="sm" className="gap-1.5 text-xs" onClick={handleConnect}>
              <Link2 className="w-3.5 h-3.5" /> Connect Google Business Profile
            </Button>
          )}
          {isConnected && (
            <>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleSelectLocation}>
                <MapPin className="w-3.5 h-3.5" /> {connection.location_id ? 'Change Location' : 'Select Location'}
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleConnect}>
                <RefreshCw className="w-3.5 h-3.5" /> Reconnect
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs text-destructive hover:text-destructive" onClick={() => disconnectMutation.mutate()} disabled={disconnectMutation.isPending}>
                {disconnectMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />} Disconnect
              </Button>
            </>
          )}
        </div>
      </CardContent>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Select Business Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {loadingLocations && <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
            {!loadingLocations && locations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No locations found on this Google account.</p>
            )}
            {!loadingLocations && locations.map((loc) => (
              <button
                key={loc.location_id}
                onClick={() => selectLocationMutation.mutate(loc)}
                disabled={selectLocationMutation.isPending}
                className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <p className="text-sm font-medium">{loc.location_name}</p>
                {loc.address && <p className="text-[10px] text-muted-foreground">{loc.address}</p>}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}