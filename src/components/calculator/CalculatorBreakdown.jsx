import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { QUOTE_DISCLAIMER, PAYMENT_TERMS } from '@/lib/pricingData';

export default function CalculatorBreakdown({ calc, form, selectedService, dirtyMeter, isQuoteRequired, savedQuote }) {
  if (!selectedService) {
    return (
      <div className="rounded-xl p-6 text-center bg-white shadow-sm">
        <p className="text-xs text-gray-400">Select a service to see live quote breakdown</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl shadow-sm overflow-hidden bg-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 border-b" style={{ background: '#1A3A2A' }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Live Quote Breakdown</span>
          {savedQuote && <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-green-600 text-white">✓ Saved</span>}
        </div>
        {form.client_name && <p className="text-xs mt-0.5 text-green-300">{form.client_name} — {form.suburb || form.client_address}</p>}
      </div>

      <div className="px-4 pb-4 pt-3 text-xs space-y-1">
        {isQuoteRequired ? (
          <div className="rounded-lg p-3 text-center bg-red-50 border border-red-200">
            <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <p className="font-bold text-xs text-red-700">Quote Required</p>
            <p className="text-[10px] mt-0.5 text-red-600">Manual review required. No instant price.</p>
          </div>
        ) : calc && (
          <div className="space-y-1.5">
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Service</span>
              <span className="font-medium text-right max-w-[60%] text-gray-800">{selectedService.label}</span>
            </div>
            <div className="flex justify-between"><span className="text-gray-500">Est. hours</span><span className="text-gray-800">{calc.estimatedHours.toFixed(2)} h</span></div>
            {calc.minimumApplied && (
              <div className="flex justify-between text-amber-600">
                <span>Min. hours applied</span><span>{calc.minHours} h minimum</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Condition — L{form.dirty_level}</span>
              <span className={calc.conditionMultiplier !== 1 ? 'text-amber-600' : 'text-gray-400'}>×{calc.conditionMultiplier.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium"><span className="text-gray-800">Chargeable hours</span><span className="text-gray-800">{calc.chargeableHours.toFixed(2)} h</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Rate</span><span className="text-gray-800">${selectedService.rate}/hr</span></div>
            <div className="flex justify-between pb-1.5 border-b border-gray-100">
              <span className="text-gray-500">Core subtotal</span><span className="text-gray-800">${calc.coreSubtotal.toFixed(2)}</span>
            </div>

            {calc.addonLines.length > 0 && (
              <>
                <p className="font-medium pt-0.5 text-gray-500">Add-ons:</p>
                {calc.addonLines.map((a, i) => (
                  <div key={i} className="flex justify-between pl-2">
                    <span className="text-gray-500">{a.label} ×{a.qty}</span>
                    <span className="text-gray-800">${a.total.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between pb-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Add-ons total</span><span className="text-gray-800">${calc.addonsTotal.toFixed(2)}</span>
                </div>
              </>
            )}

            {calc.travelKm > 0 && (
              <div className="flex justify-between pb-1.5 border-b border-gray-100">
                <span className="text-gray-500">Travel ({calc.travelKm} km)</span>
                <span className="text-gray-800">{calc.travelFee > 0 ? `$${calc.travelFee.toFixed(2)}` : 'Free (≤10 km)'}</span>
              </div>
            )}

            {Number(form.manual_adjustment) !== 0 && (
              <div className="flex justify-between pb-1.5 border-b border-gray-100">
                <span className="text-gray-500">Manual adj. ({form.manual_adjustment_reason || 'no reason'})</span>
                <span className={Number(form.manual_adjustment) < 0 ? 'text-red-500' : 'text-green-600'}>${Number(form.manual_adjustment).toFixed(2)}</span>
              </div>
            )}

            {calc.discountAmt > 0 && (
              <div className="flex justify-between pb-1.5 border-b border-gray-100 text-red-500">
                <span>Discount</span><span>-${calc.discountAmt.toFixed(2)}</span>
              </div>
            )}

            {form.gst_enabled && (
              <div className="flex justify-between"><span className="text-gray-500">GST (10%)</span><span className="text-gray-800">+${calc.gst.toFixed(2)}</span></div>
            )}
            {!form.gst_enabled && <div className="text-[10px] text-gray-400">GST not applied</div>}

            <div className="flex justify-between font-bold text-base pt-2 mt-1 border-t border-gray-200" style={{ color: '#1A3A2A' }}>
              <span>TOTAL</span><span>${calc.finalTotal.toFixed(2)}</span>
            </div>

            {form.deposit_enabled && calc.depositDue > 0 && (
              <>
                <div className="flex justify-between text-blue-600"><span>Deposit due</span><span>${calc.depositDue.toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Balance on completion</span><span>${calc.balanceDue.toFixed(2)}</span></div>
              </>
            )}
          </div>
        )}

        <div className="space-y-1 pt-2">
          {calc?.minimumApplied && <p className="text-[10px] text-amber-600">⚠️ Minimum {calc.minHours} hours applied.</p>}
          {calc?.dirtySurchargeAmt > 0 && <p className="text-[10px] text-amber-600">⚠️ Dirty Meter surcharge applied.</p>}
          {calc?.travelFee > 0 && <p className="text-[10px] text-amber-600">⚠️ Travel fee added after first 10 km.</p>}
          <p className="text-[9px] text-gray-400">Open the saved quote from the Quotes page to email it to the client.</p>
        </div>

        <div className="pt-2 mt-2 text-[9px] space-y-1 border-t border-gray-100 text-gray-400">
          <p className="font-semibold">Disclaimer</p>
          <p>{QUOTE_DISCLAIMER}</p>
          <p className="font-semibold pt-1">Payment Terms</p>
          <p>{PAYMENT_TERMS}</p>
        </div>
      </div>
    </div>
  );
}