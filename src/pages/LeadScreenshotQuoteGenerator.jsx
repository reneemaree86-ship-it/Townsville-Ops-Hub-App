import React, { useState, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Upload, ImageIcon, Loader2, Copy, CheckCircle, AlertTriangle,
  XCircle, FileText, DollarSign, Clock, MapPin, Star, ChevronDown, ChevronUp, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

const SERVICE_LABELS = {
  standard_residential: 'Standard Residential',
  detailed_refresh: 'Detailed Refresh',
  deep_spring_clean: 'Deep / Spring Clean',
  move_in_clean: 'Move-In Clean',
  pre_sale_clean: 'Pre-Sale Clean',
  rental_inspection_rescue: 'Rental Inspection Rescue',
  office_commercial: 'Office / Commercial',
  wall_washing: 'Wall Washing',
  pressure_washing: 'Pressure Washing',
  airbnb_standard: 'Airbnb Standard',
  airbnb_same_day: 'Airbnb Same-Day',
  airbnb_deep_reset: 'Airbnb Deep Reset',
  airbnb_post_guest: 'Airbnb Post-Guest',
  window_glass: 'Windows / Glass',
  decluttering: 'Decluttering',
  unknown: 'Unknown — Needs Review',
};

const STATUS_STYLES = {
  new: 'bg-blue-100 text-blue-800',
  needs_review: 'bg-amber-100 text-amber-800',
  quoted: 'bg-purple-100 text-purple-800',
  waiting_response: 'bg-sky-100 text-sky-800',
  booked: 'bg-green-100 text-green-800',
  not_suitable: 'bg-red-100 text-red-800',
  lost: 'bg-gray-100 text-gray-600',
};

const CONFIDENCE_STYLES = {
  high: 'text-green-700 bg-green-50 border-green-200',
  medium: 'text-amber-700 bg-amber-50 border-amber-200',
  low: 'text-orange-700 bg-orange-50 border-orange-200',
  needs_manual_review: 'text-red-700 bg-red-50 border-red-200',
};

function UploadZone({ onFile, uploading }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        capture="environment"
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
      />
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-sm text-gray-600 font-medium">Uploading & analysing screenshot…</p>
          <p className="text-xs text-gray-400">This may take 15–30 seconds</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Upload className="w-10 h-10 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">Drop screenshot here or tap to upload</p>
          <p className="text-xs text-gray-400">PNG, JPG, JPEG, WebP — from camera, gallery, or desktop</p>
        </div>
      )}
    </div>
  );
}

function QuoteResultCard({ quote, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(true);
  const [editingReply, setEditingReply] = useState(false);
  const [replyText, setReplyText] = useState(quote.suggested_reply || '');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(quote.approval_notes || '');
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.LeadScreenshotQuote.update(quote.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['screenshot-quotes'] });
      toast.success('Updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.LeadScreenshotQuote.delete(quote.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['screenshot-quotes'] });
      toast.success('Deleted');
    },
  });

  const copyReply = () => {
    navigator.clipboard.writeText(replyText || quote.suggested_reply || '');
    toast.success('Reply copied to clipboard');
  };

  const saveReply = () => {
    updateMutation.mutate({ suggested_reply: replyText });
    setEditingReply(false);
  };

  const hasRedFlags = quote.red_flags?.length > 0;
  const hasMissing = quote.missing_information?.length > 0;

  return (
    <Card className={`border ${hasRedFlags ? 'border-red-300' : 'border-gray-200'}`}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[quote.quote_status] || STATUS_STYLES.new}`}>
              {quote.quote_status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded border ${CONFIDENCE_STYLES[quote.confidence_score] || CONFIDENCE_STYLES.low}`}>
              {quote.confidence_score === 'needs_manual_review' ? '⚠ Needs Manual Review' : `${quote.confidence_score?.charAt(0).toUpperCase() + quote.confidence_score?.slice(1)} Confidence`}
            </span>
            {hasRedFlags && <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700">🚩 {quote.red_flags.length} Red Flag{quote.red_flags.length > 1 ? 's' : ''}</span>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteMutation.mutate()}><Trash2 className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
          {quote.lead_name && <span className="font-medium">👤 {quote.lead_name}</span>}
          {quote.suburb && <span><MapPin className="w-3 h-3 inline mr-0.5" />{quote.suburb}</span>}
          {quote.service_type && <span>🧹 {SERVICE_LABELS[quote.service_type] || quote.service_type}</span>}
          {quote.bedrooms && <span>🛏 {quote.bedrooms} bed</span>}
          {quote.bathrooms && <span>🚿 {quote.bathrooms} bath</span>}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-4 space-y-4">
          {/* Image thumbnail */}
          {quote.uploaded_image_url && (
            <img src={quote.uploaded_image_url} alt="Lead screenshot" className="rounded-lg max-h-48 object-contain border border-gray-200 bg-gray-50" />
          )}

          {/* Red flags */}
          {hasRedFlags && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-xs font-bold text-red-700 mb-1.5 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Red Flags Detected</p>
              <ul className="space-y-0.5">{quote.red_flags.map((f, i) => <li key={i} className="text-xs text-red-700">• {f}</li>)}</ul>
            </div>
          )}

          {/* Missing info */}
          {hasMissing && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs font-bold text-amber-700 mb-1.5">Missing Information</p>
              <ul className="space-y-0.5">{quote.missing_information.map((m, i) => <li key={i} className="text-xs text-amber-700">• {m}</li>)}</ul>
            </div>
          )}

          {/* Quote summary */}
          {quote.confidence_score !== 'needs_manual_review' && quote.estimated_total_min > 0 && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <p className="text-xs font-bold text-green-800 mb-2 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Quote Estimate</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Hours:</span> <span className="font-semibold">{quote.recommended_hours_min}–{quote.recommended_hours_max} hrs</span></div>
                <div><span className="text-gray-500">Rate:</span> <span className="font-semibold">${quote.hourly_rate}/hr</span></div>
                <div><span className="text-gray-500">Range:</span> <span className="font-semibold">${quote.estimated_total_min}–${quote.estimated_total_max}</span></div>
                <div><span className="text-gray-500">Recommended:</span> <span className="font-bold text-green-800">${quote.recommended_quote_total}</span></div>
              </div>
              {quote.travel_fee_estimate > 0 && <p className="text-xs text-gray-500 mt-1">+ Travel fee: ~${quote.travel_fee_estimate}</p>}
              {quote.add_ons_detected?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500">Add-ons detected:</p>
                  <div className="flex flex-wrap gap-1 mt-1">{quote.add_ons_detected.map((a, i) => <span key={i} className="text-[10px] bg-white border border-green-200 rounded px-1.5 py-0.5 text-green-700">{a}</span>)}</div>
                </div>
              )}
            </div>
          )}

          {/* AI reasoning */}
          {quote.ai_reasoning && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="text-xs font-bold text-gray-700 mb-1">AI Reasoning</p>
              <p className="text-xs text-gray-600">{quote.ai_reasoning}</p>
            </div>
          )}

          {/* Extracted text */}
          {quote.extracted_text && (
            <details className="group">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 flex items-center gap-1"><FileText className="w-3 h-3" /> View extracted text</summary>
              <div className="mt-2 p-2 bg-gray-50 border rounded text-xs text-gray-600 whitespace-pre-wrap max-h-32 overflow-y-auto">{quote.extracted_text}</div>
            </details>
          )}

          {/* Suggested reply */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-700">Suggested Reply</p>
            {editingReply ? (
              <div className="space-y-2">
                <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={6} className="text-xs" />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={saveReply} disabled={updateMutation.isPending}>Save</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingReply(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-gray-50 border rounded text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{replyText || quote.suggested_reply}</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={copyReply}><Copy className="w-3 h-3" /> Copy Reply</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingReply(true)}>Edit Reply</Button>
                </div>
              </div>
            )}
          </div>

          {/* Status + actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-500">Status:</Label>
              <Select value={quote.quote_status} onValueChange={(v) => updateMutation.mutate({ quote_status: v })}>
                <SelectTrigger className="h-7 text-xs w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['new','needs_review','quoted','waiting_response','booked','not_suitable','lost'].map(s => (
                    <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 gap-1" onClick={() => updateMutation.mutate({ quote_status: 'quoted' })} disabled={updateMutation.isPending}>
              <CheckCircle className="w-3 h-3" /> Approve Quote
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs text-red-500 border-red-200" onClick={() => updateMutation.mutate({ quote_status: 'not_suitable' })} disabled={updateMutation.isPending}>
              <XCircle className="w-3 h-3 mr-1" /> Not Suitable
            </Button>
          </div>

          {/* Notes */}
          <div>
            {editingNotes ? (
              <div className="space-y-1">
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Internal notes..." className="text-xs" />
                <div className="flex gap-2">
                  <Button size="sm" className="h-6 text-[10px]" onClick={() => { updateMutation.mutate({ approval_notes: notes }); setEditingNotes(false); }}>Save Notes</Button>
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setEditingNotes(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <button className="text-xs text-gray-400 hover:text-gray-600 underline" onClick={() => setEditingNotes(true)}>
                {quote.approval_notes ? '📝 ' + quote.approval_notes : '+ Add internal note'}
              </button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function LeadScreenshotQuoteGenerator() {
  const { activeBusiness } = useOutletContext();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['screenshot-quotes'],
    queryFn: () => base44.entities.LeadScreenshotQuote.list('-created_date', 50),
  });

  const handleFile = async (file) => {
    setUploading(true);
    try {
      // Upload the image file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Analyse via backend function
      const response = await base44.functions.invoke('analyseLeadScreenshot', {
        image_url: file_url,
        business_id: activeBusiness?.id || null,
      });

      if (response.data?.error) {
        toast.error('Analysis failed: ' + response.data.error);
      } else {
        toast.success('Screenshot analysed — quote generated below');
        await qc.refetchQueries({ queryKey: ['screenshot-quotes'] });
      }
    } catch (err) {
      toast.error('Failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const filtered = filterStatus === 'all' ? quotes : quotes.filter(q => q.quote_status === filterStatus);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Lead Screenshot Quote Generator</h1>
        <p className="text-xs text-muted-foreground mt-1">Upload a screenshot from Facebook, Gumtree, SMS, or any platform — the AI reads it, classifies the job, and generates a quote using Renee's pricing.</p>
        {activeBusiness && <p className="text-[10px] text-blue-600 font-medium mt-1">{activeBusiness.name}</p>}
      </div>

      <UploadZone onFile={handleFile} uploading={uploading} />

      {quotes.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-xs text-gray-500">Filter:</Label>
          {['all','new','needs_review','quoted','waiting_response','booked','not_suitable','lost'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterStatus === s ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600 hover:border-gray-500'}`}
            >
              {s === 'all' ? 'All' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      )}

      {!isLoading && filtered.length === 0 && quotes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No screenshots analysed yet</p>
            <p className="text-xs text-gray-400 mt-1">Upload your first lead screenshot above to generate a quote.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {filtered.map(quote => (
          <QuoteResultCard key={quote.id} quote={quote} />
        ))}
      </div>
    </div>
  );
}