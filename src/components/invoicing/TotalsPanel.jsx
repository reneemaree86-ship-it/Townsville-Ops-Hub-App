import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { calcTotals, calcTravel } from '@/lib/pricingData';

export default function TotalsPanel({ form, onChange }) {
  const travelFee = calcTravel(Number(form.travel_km) || 0);
  const totals = calcTotals({
    lineItems: form.line_items || [],
    travelFee,
    discountAmount: Number(form.discount_amount) || 0,
    discountType: form.discount_type || 'fixed',
    gstEnabled: form.gst_enabled || false,
  });

  // Sync calculated values up to parent if changed
  React.useEffect(() => {
    onChange({
      travel_fee: travelFee,
      subtotal: totals.subtotal,
      gst_amount: totals.gst,
      total: totals.total,
    });
  }, [form.line_items, form.travel_km, form.discount_amount, form.discount_type, form.gst_enabled]);

  return (
    <div className="space-y-3">
      {/* Travel */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Travel Distance (km)</Label>
          <Input type="number" className="h-8 text-xs mt-1" value={form.travel_km || ''} min={0}
            onChange={e => onChange({ travel_km: Number(e.target.value) })} placeholder="0" />
          <p className="text-[10px] text-muted-foreground mt-0.5">First 10 km free, then $1/km</p>
        </div>
        <div className="flex items-end pb-5">
          <span className="text-xs text-muted-foreground">Travel fee: </span>
          <span className="text-xs font-semibold ml-1">${travelFee.toFixed(2)}</span>
        </div>
      </div>

      {/* Discount */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Label className="text-xs">Discount</Label>
          <Input type="number" className="h-8 text-xs mt-1" value={form.discount_amount || ''} min={0}
            onChange={e => onChange({ discount_amount: Number(e.target.value) })} placeholder="0" />
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={form.discount_type || 'fixed'} onValueChange={v => onChange({ discount_type: v })}>
            <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed" className="text-xs">$ Fixed</SelectItem>
              <SelectItem value="percent" className="text-xs">% Percent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* GST */}
      <div className="flex items-center gap-3">
        <Switch checked={!!form.gst_enabled} onCheckedChange={v => onChange({ gst_enabled: v })} />
        <Label className="text-xs cursor-pointer">Include GST (10%)</Label>
      </div>

      {/* Totals summary */}
      <div className="bg-muted/40 rounded-lg p-3 space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>${totals.subtotal.toFixed(2)}</span>
        </div>
        {travelFee > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Travel Fee</span>
            <span>${travelFee.toFixed(2)}</span>
          </div>
        )}
        {totals.discount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Discount</span>
            <span>-${totals.discount.toFixed(2)}</span>
          </div>
        )}
        {form.gst_enabled && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">GST (10%)</span>
            <span>${totals.gst.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm border-t pt-1.5 mt-1">
          <span>Total</span>
          <span>${totals.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}