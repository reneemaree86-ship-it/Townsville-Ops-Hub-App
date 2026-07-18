import React, { useState } from 'react';
import { SERVICE_RATES, ADDONS } from '@/lib/pricingData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export default function LineItemEditor({ items, onChange }) {
  const [showAddonPicker, setShowAddonPicker] = useState(false);
  const [focusId, setFocusId] = useState(null);

  const update = (idx, field, val) => {
    const updated = items.map((it, i) => {
      if (i !== idx) return it;
      const next = { ...it, [field]: val };
      // recalculate total
      if (next.type === 'hourly') {
        next.total = (Number(next.unit_price) || 0) * (Number(next.qty) || 0);
      } else {
        next.total = (Number(next.unit_price) || 0) * (Number(next.qty) || 1);
      }
      return next;
    });
    onChange(updated);
  };

  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));

  const addService = () => {
    const svc = SERVICE_RATES[0];
    onChange([...items, {
      id: Date.now(),
      type: 'hourly',
      description: svc.label,
      service_id: svc.id,
      unit_price: svc.rate,
      qty: svc.min_hours,
      total: svc.rate * svc.min_hours,
    }]);
  };

  const addAddon = (addon) => {
    onChange([...items, {
      id: Date.now(),
      type: 'fixed',
      description: addon.label,
      addon_id: addon.id,
      unit_price: addon.price,
      qty: 1,
      total: addon.price,
    }]);
    setShowAddonPicker(false);
  };

  const addCustom = () => {
    const newId = Date.now();
    onChange([...items, {
      id: newId,
      type: 'fixed',
      description: '',
      unit_price: 0,
      qty: 1,
      total: 0,
    }]);
    setFocusId(newId);
  };

  const handleServiceChange = (idx, serviceId) => {
    const svc = SERVICE_RATES.find(s => s.id === serviceId);
    if (!svc) return;
    const it = items[idx];
    const qty = it.qty || svc.min_hours;
    const updated = items.map((item, i) => i === idx ? {
      ...item,
      description: svc.label,
      service_id: serviceId,
      unit_price: svc.rate,
      qty,
      total: svc.rate * qty,
    } : item);
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="hidden sm:grid grid-cols-12 gap-1 px-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        <div className="col-span-5">Description</div>
        <div className="col-span-2 text-right">Rate / Price</div>
        <div className="col-span-2 text-right">Qty / Hrs</div>
        <div className="col-span-2 text-right">Total</div>
        <div className="col-span-1" />
      </div>

      {items.map((item, idx) => {
        const isCustom = !item.service_id && !item.addon_id;
        return (
        <div key={item.id || idx} className="grid grid-cols-12 gap-1 items-center bg-muted/30 rounded-lg p-2">
          {/* Description */}
          <div className="col-span-12 sm:col-span-5">
            {!isCustom && item.type === 'hourly' ? (
              <Select value={item.service_id || ''} onValueChange={v => handleServiceChange(idx, v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select service..." />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_RATES.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">{s.label} — ${s.rate}/hr</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-1 items-center">
                <Input
                  className="h-8 text-xs"
                  value={item.description}
                  onChange={e => update(idx, 'description', e.target.value)}
                  placeholder="Custom item description"
                  autoFocus={item.id === focusId}
                />
                {isCustom && (
                  <div className="flex border rounded-md overflow-hidden flex-shrink-0">
                    <button type="button"
                      onClick={() => update(idx, 'type', 'fixed')}
                      className={`px-2 h-8 text-[10px] font-medium ${item.type === 'fixed' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground'}`}>
                      Fixed
                    </button>
                    <button type="button"
                      onClick={() => update(idx, 'type', 'hourly')}
                      className={`px-2 h-8 text-[10px] font-medium ${item.type === 'hourly' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground'}`}>
                      Hourly
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rate */}
          <div className="col-span-4 sm:col-span-2">
            <Input
              type="number"
              className="h-8 text-xs text-right"
              value={item.unit_price}
              onChange={e => update(idx, 'unit_price', Number(e.target.value))}
              placeholder="0.00"
            />
          </div>

          {/* Qty */}
          <div className="col-span-4 sm:col-span-2">
            <Input
              type="number"
              className="h-8 text-xs text-right"
              value={item.qty}
              min={!isCustom && item.type === 'hourly' ? (SERVICE_RATES.find(s => s.id === item.service_id)?.min_hours || 1) : 0}
              step={item.type === 'hourly' ? 0.5 : 1}
              onChange={e => update(idx, 'qty', Number(e.target.value))}
            />
          </div>

          {/* Total */}
          <div className="col-span-3 sm:col-span-2 text-right">
            <span className="text-xs font-semibold">${(item.total || 0).toFixed(2)}</span>
          </div>

          {/* Delete */}
          <div className="col-span-1 flex justify-end">
            <button onClick={() => remove(idx)} className="text-muted-foreground hover:text-destructive p-1">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        );
      })}

      {/* Add buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" className="text-xs h-8" onClick={addService}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Service
        </Button>
        <div className="relative">
          <Button type="button" variant="outline" size="sm" className="text-xs h-8" onClick={() => setShowAddonPicker(v => !v)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Add-on
            {showAddonPicker ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>
          {showAddonPicker && (
            <div className="absolute z-50 top-9 left-0 w-72 bg-card border rounded-lg shadow-lg p-2 max-h-64 overflow-y-auto">
              {ADDONS.map(addon => (
                <button key={addon.id} onClick={() => addAddon(addon)}
                  className="w-full text-left text-xs px-3 py-2 hover:bg-muted rounded-md flex justify-between items-center">
                  <span>{addon.label}</span>
                  <span className="text-muted-foreground font-medium">${addon.price} {addon.unit !== 'fixed' ? `/ ${addon.unit}` : ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button type="button" variant="ghost" size="sm" className="text-xs h-8" onClick={addCustom}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Custom / Other
        </Button>
      </div>
    </div>
  );
}