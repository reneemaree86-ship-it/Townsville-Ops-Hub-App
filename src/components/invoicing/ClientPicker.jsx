import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';

export default function ClientPicker({ form, onChange, clients = [], business }) {
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');

  const handleSelectClient = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      onChange({
        client_id: clientId,
        client_name: client.full_name,
        client_email: client.email || '',
        client_phone: client.phone || '',
        client_address: client.address ? [client.address, client.suburb].filter(Boolean).join(', ') : '',
      });
    }
  };

  const handleSaveNew = async () => {
    if (!newName) return;
    const created = await base44.entities.Client.create({
      business_id: business.id,
      full_name: newName,
      email: newEmail,
      phone: newPhone,
      address: newAddress,
      status: 'active',
      source: 'manual',
    });
    onChange({
      client_id: created.id,
      client_name: newName,
      client_email: newEmail,
      client_phone: newPhone,
      client_address: newAddress,
    });
    setAddingNew(false);
    setNewName(''); setNewEmail(''); setNewPhone(''); setNewAddress('');
  };

  return (
    <div className="space-y-3">
      {!addingNew ? (
        <div className="space-y-2">
          {clients.length > 0 && (
            <div>
              <Label className="text-xs">Select Existing Client</Label>
              <Select value={form.client_id || ''} onValueChange={handleSelectClient}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="Choose a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Client Name *</Label>
              <Input className="h-8 text-xs mt-1" value={form.client_name || ''} onChange={e => onChange({ client_name: e.target.value })} placeholder="Full name" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input className="h-8 text-xs mt-1" value={form.client_phone || ''} onChange={e => onChange({ client_phone: e.target.value })} placeholder="0400 000 000" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input type="email" className="h-8 text-xs mt-1" value={form.client_email || ''} onChange={e => onChange({ client_email: e.target.value })} placeholder="client@email.com" />
          </div>
          <div>
            <Label className="text-xs">Client Address</Label>
            <Input className="h-8 text-xs mt-1" value={form.client_address || ''} onChange={e => onChange({ client_address: e.target.value })} placeholder="Street address" />
          </div>
          <Button type="button" variant="ghost" size="sm" className="text-xs h-7 mt-1" onClick={() => setAddingNew(true)}>
            <UserPlus className="w-3 h-3 mr-1" /> Save as new client
          </Button>
        </div>
      ) : (
        <div className="bg-muted/40 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold">New Client Details</p>
          <Input className="h-8 text-xs" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name *" />
          <Input className="h-8 text-xs" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email" />
          <Input className="h-8 text-xs" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Phone" />
          <Input className="h-8 text-xs" value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Address" />
          <div className="flex gap-2">
            <Button size="sm" className="text-xs h-8" onClick={handleSaveNew} disabled={!newName}>Save Client</Button>
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setAddingNew(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}