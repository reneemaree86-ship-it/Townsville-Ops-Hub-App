import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { ADDONS } from '@/lib/pricingData';

const UNIT_LABELS = {
  fixed: 'flat fee',
  each: 'each',
  per_bed: 'per bed',
  per_basket: 'per basket',
  per_area: 'per area',
};

export default function CalculatorAddons({ addons, onChange }) {
  const [selectedId, setSelectedId] = useState('');

  const addAddon = () => {
    if (!selectedId) return;
    if (addons.find(a => a.id === selectedId)) return;
    onChange([...addons, { id: selectedId, qty: 1 }]);
    setSelectedId('');
  };

  const removeAddon = (id) => onChange(addons.filter(a => a.id !== id));
  const updateQty = (id, qty) => onChange(addons.map(a => a.id === id ? { ...a, qty } : a));

  const usedIds = addons.map(a => a.id);
  const availableAddons = ADDONS.filter(a => !usedIds.includes(a.id));

  const smallCount = addons.filter(a => {
    const found = ADDONS.find(x => x.id === a.id);
    return found && found.price <= 35;
  }).length;

  return (
    <div className="rounded-xl border-0 shadow-sm bg-white">
      <div className="px-4 pt-4 pb-2">
        <span className="text-sm font-semibold" style={{ color: '#1A3A2A' }}>Add-ons & Extras</span>
      </div>
      <div className="px-4 pb-4 space-y-3">
        <div className="flex gap-2">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="Select an add-on..." />
            </SelectTrigger>
            <SelectContent>
              {availableAddons.map(a => (
                <SelectItem key={a.id} value={a.id} className="text-xs">
                  {a.label} — ${a.price} {UNIT_LABELS[a.unit] || ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 text-xs" style={{ background: '#1A3A2A', color: '#fff' }} onClick={addAddon} disabled={!selectedId}>
            <Plus className="w-3.5 h-3.5 mr-1" />Add
          </Button>
        </div>

        {addons.length === 0 && (
          <p className="text-xs text-center py-2 text-gray-400">No add-ons selected</p>
        )}

        {addons.map(({ id, qty }) => {
          const addon = ADDONS.find(a => a.id === id);
          if (!addon) return null;
          const total = addon.price * Number(qty || 1);
          return (
            <div key={id} className="flex items-center gap-2 rounded-lg px-3 py-2 bg-gray-50 border border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-gray-800">{addon.label}</p>
                <p className="text-[10px] text-gray-400">${addon.price} {UNIT_LABELS[addon.unit]}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-400">Qty:</span>
                  <Input type="number" min={1} className="h-6 w-14 text-xs px-1" value={qty}
                    onChange={e => updateQty(id, Number(e.target.value))} />
                </div>
                <span className="text-xs font-medium w-14 text-right text-gray-800">${total.toFixed(2)}</span>
                <button onClick={() => removeAddon(id)} className="text-gray-400 hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {smallCount >= 3 && (
          <div className="rounded-lg p-2.5 text-xs bg-amber-50 text-amber-700 border border-amber-200">
            💡 Several small add-ons selected. Use manual adjustment if you want to bundle into a set time fee.
          </div>
        )}
      </div>
    </div>
  );
}