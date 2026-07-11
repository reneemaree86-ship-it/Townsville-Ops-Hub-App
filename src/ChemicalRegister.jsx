import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/base44Client';
import { Button } from '@/button';
import { Input } from '@/input';
import { Badge } from '@/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/select';
import { Textarea } from '@/textarea';
import { Label } from '@/label';
import { Switch } from '@/switch';
import {
  FlaskConical, Upload, AlertTriangle, CheckCircle2, XCircle,
  Clock, Plus, Search, Eye, Pencil, Trash2, FileText, ShieldAlert, Info
} from 'lucide-react';

const CATEGORIES = [
  'General Purpose', 'Disinfectant', 'Degreaser', 'Bathroom/Toilet',
  'Glass/Window', 'Floor Care', 'Carpet/Upholstery', 'Mould Treatment',
  'Pressure Washing', 'Specialised'
];

const DOC_STATUS_CONFIG = {
  current:        { label: 'Current',        color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  expiring_soon:  { label: 'Expiring Soon',  color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',   icon: Clock },
  expired:        { label: 'Expired',         color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',               icon: XCircle },
  missing:        { label: 'Missing',         color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',              icon: AlertTriangle },
};

function DocStatusBadge({ status }) {
  const cfg = DOC_STATUS_CONFIG[status] || DOC_STATUS_CONFIG.missing;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function computeDocStatus(url, expiry) {
  if (!url) return 'missing';
  if (!expiry) return 'current';
  const exp = new Date(expiry);
  const now = new Date();
  const daysLeft = (exp - now) / (1000 * 60 * 60 * 24);
  if (daysLeft < 0) return 'expired';
  if (daysLeft < 90) return 'expiring_soon';
  return 'current';
}

const EMPTY_FORM = {
  product_name: '', brand: '', category: '', common_use: '', hazards: '',
  ppe_required: '', dilution_ratio: '', storage_instructions: '', first_aid: '',
  sds_url: '', pds_url: '', sds_expiry: '', pds_expiry: '',
  sizes_available: '', active: true, notes: '',
};

export default function ChemicalRegister() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);
  const sdsInputRef = useRef();
  const pdsInputRef = useRef();

  // Get active business
  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => base44.entities.Business.filter({ status: 'active' }),
  });
  const bid = businesses[0]?.id;

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['chemical-products', bid],
    queryFn: () => bid ? base44.entities.ChemicalProduct.filter({ business_id: bid }, 'product_name', 200) : [],
    enabled: !!bid,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const sds_status = computeDocStatus(data.sds_url, data.sds_expiry);
      const pds_status = computeDocStatus(data.pds_url, data.pds_expiry);
      const payload = { ...data, business_id: bid, sds_status, pds_status };
      if (editingProduct) {
        return base44.entities.ChemicalProduct.update(editingProduct.id, payload);
      }
      return base44.entities.ChemicalProduct.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries(['chemical-products']);
      setDialogOpen(false);
      setEditingProduct(null);
      setForm(EMPTY_FORM);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ChemicalProduct.delete(id),
    onSuccess: () => qc.invalidateQueries(['chemical-products']),
  });

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingField(field);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, [field]: file_url }));
    } catch (err) {
      alert(`Upload failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setUploadingField(null);
    }
  };

  const openAdd = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (p) => {
    setEditingProduct(p);
    setForm({
      product_name: p.product_name || '',
      brand: p.brand || '',
      category: p.category || '',
      common_use: p.common_use || '',
      hazards: p.hazards || '',
      ppe_required: p.ppe_required || '',
      dilution_ratio: p.dilution_ratio || '',
      storage_instructions: p.storage_instructions || '',
      first_aid: p.first_aid || '',
      sds_url: p.sds_url || '',
      pds_url: p.pds_url || '',
      sds_expiry: p.sds_expiry || '',
      pds_expiry: p.pds_expiry || '',
      sizes_available: p.sizes_available || '',
      active: p.active !== false,
      notes: p.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.product_name.trim()) { alert('Product name is required.'); return; }
    setSaving(true);
    try { await saveMutation.mutateAsync(form); }
    catch (e) { alert(`Could not save: ${e?.message || 'Unknown error'}`); }
    finally { setSaving(false); }
  };

  const handleDelete = (p) => {
    if (!window.confirm(`Delete "${p.product_name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(p.id);
  };

  // Stats
  const totalActive = products.filter(p => p.active !== false).length;
  const missingDocs = products.filter(p =>
    (!p.sds_url || p.sds_status === 'missing') || (!p.pds_url || p.pds_status === 'missing')
  ).length;
  const expiredDocs = products.filter(p =>
    p.sds_status === 'expired' || p.pds_status === 'expired'
  ).length;
  const expiringSoon = products.filter(p =>
    p.sds_status === 'expiring_soon' || p.pds_status === 'expiring_soon'
  ).length;

  // Filter
  const filtered = products.filter(p => {
    const matchSearch = !search || p.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filterStatus === 'missing') return !p.sds_url || !p.pds_url || p.sds_status === 'missing' || p.pds_status === 'missing';
    if (filterStatus === 'expired') return p.sds_status === 'expired' || p.pds_status === 'expired';
    if (filterStatus === 'expiring_soon') return p.sds_status === 'expiring_soon' || p.pds_status === 'expiring_soon';
    if (filterStatus === 'current') return p.sds_status === 'current' && p.pds_status === 'current';
    if (filterStatus === 'inactive') return p.active === false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FlaskConical className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Chemical Register</h1>
            <p className="text-sm text-muted-foreground">Safety Data Sheets & Product Data Sheets</p>
          </div>
        </div>
        <Button onClick={openAdd} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Products', value: totalActive, icon: FlaskConical, color: 'text-primary' },
          { label: 'Missing Docs', value: missingDocs, icon: AlertTriangle, color: 'text-yellow-500', filter: 'missing' },
          { label: 'Expired Docs', value: expiredDocs, icon: XCircle, color: 'text-destructive', filter: 'expired' },
          { label: 'Expiring Soon', value: expiringSoon, icon: Clock, color: 'text-yellow-500', filter: 'expiring_soon' },
        ].map(stat => (
          <button
            key={stat.label}
            onClick={() => stat.filter && setFilterStatus(f => f === stat.filter ? 'all' : stat.filter)}
            className={`rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent ${filterStatus === stat.filter ? 'ring-2 ring-primary' : ''}`}
          >
            <stat.icon className={`w-5 h-5 mb-2 ${stat.color}`} />
            <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products, brands, categories..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="missing">Missing Docs</SelectItem>
            <SelectItem value="expired">Expired Docs</SelectItem>
            <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
            <SelectItem value="current">All Current</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products table */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading products...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-card">
          <FlaskConical className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground">
            {products.length === 0 ? 'No chemical products yet' : 'No products match this filter'}
          </p>
          {products.length === 0 && (
            <p className="text-sm text-muted-foreground mt-1">Add your first product to get started</p>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">SDS</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">PDS</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Hazards</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const liveSDSStatus = computeDocStatus(p.sds_url, p.sds_expiry);
                  const livePDSStatus = computeDocStatus(p.pds_url, p.pds_expiry);
                  return (
                    <tr key={p.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${p.active === false ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{p.product_name}</div>
                        {p.brand && <div className="text-xs text-muted-foreground">{p.brand}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.category || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <DocStatusBadge status={liveSDSStatus} />
                          {p.sds_url && (
                            <a href={p.sds_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                              <FileText className="w-3 h-3" /> View
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <DocStatusBadge status={livePDSStatus} />
                          {p.pds_url && (
                            <a href={p.pds_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                              <FileText className="w-3 h-3" /> View
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell max-w-[160px] truncate">{p.hazards || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewProduct(p)} title="View details">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)} title="Edit">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p)} title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Detail Dialog */}
      {viewProduct && (
        <Dialog open={!!viewProduct} onOpenChange={() => setViewProduct(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-primary" />
                {viewProduct.product_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              {/* Docs status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Safety Data Sheet</p>
                  <DocStatusBadge status={computeDocStatus(viewProduct.sds_url, viewProduct.sds_expiry)} />
                  {viewProduct.sds_expiry && <p className="text-xs text-muted-foreground mt-1">Expires: {viewProduct.sds_expiry}</p>}
                  {viewProduct.sds_url
                    ? <a href={viewProduct.sds_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"><FileText className="w-3 h-3" /> Download SDS</a>
                    : <p className="text-xs text-muted-foreground mt-1">No document uploaded</p>
                  }
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><FileText className="w-3 h-3" /> Product Data Sheet</p>
                  <DocStatusBadge status={computeDocStatus(viewProduct.pds_url, viewProduct.pds_expiry)} />
                  {viewProduct.pds_expiry && <p className="text-xs text-muted-foreground mt-1">Expires: {viewProduct.pds_expiry}</p>}
                  {viewProduct.pds_url
                    ? <a href={viewProduct.pds_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"><FileText className="w-3 h-3" /> Download PDS</a>
                    : <p className="text-xs text-muted-foreground mt-1">No document uploaded</p>
                  }
                </div>
              </div>
              {/* Details */}
              {[
                { label: 'Brand', value: viewProduct.brand },
                { label: 'Category', value: viewProduct.category },
                { label: 'Common Use', value: viewProduct.common_use },
                { label: 'Hazards', value: viewProduct.hazards },
                { label: 'PPE Required', value: viewProduct.ppe_required },
                { label: 'Dilution Ratio', value: viewProduct.dilution_ratio },
                { label: 'Storage', value: viewProduct.storage_instructions },
                { label: 'First Aid', value: viewProduct.first_aid },
                { label: 'Sizes Available', value: viewProduct.sizes_available },
                { label: 'Notes', value: viewProduct.notes },
              ].filter(r => r.value).map(r => (
                <div key={r.label} className="flex gap-3">
                  <span className="font-medium text-muted-foreground w-32 shrink-0">{r.label}</span>
                  <span className="text-foreground">{r.value}</span>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewProduct(null)}>Close</Button>
              <Button onClick={() => { setViewProduct(null); openEdit(viewProduct); }}>Edit Product</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) { setDialogOpen(false); setEditingProduct(null); setForm(EMPTY_FORM); } }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Chemical Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Product Name *</Label>
                <Input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} placeholder="e.g. Exit Mould" />
              </div>
              <div className="space-y-1.5">
                <Label>Brand</Label>
                <Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="e.g. Selleys" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sizes Available</Label>
                <Input value={form.sizes_available} onChange={e => setForm(f => ({ ...f, sizes_available: e.target.value }))} placeholder="e.g. 500ml, 1L, 5L" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Common Use</Label>
              <Textarea rows={2} value={form.common_use} onChange={e => setForm(f => ({ ...f, common_use: e.target.value }))} placeholder="What is this product used for?" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Hazards</Label>
                <Input value={form.hazards} onChange={e => setForm(f => ({ ...f, hazards: e.target.value }))} placeholder="e.g. Irritant, Corrosive" />
              </div>
              <div className="space-y-1.5">
                <Label>PPE Required</Label>
                <Input value={form.ppe_required} onChange={e => setForm(f => ({ ...f, ppe_required: e.target.value }))} placeholder="e.g. Gloves, Goggles" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Dilution Ratio</Label>
                <Input value={form.dilution_ratio} onChange={e => setForm(f => ({ ...f, dilution_ratio: e.target.value }))} placeholder="e.g. 1:10 with water" />
              </div>
              <div className="space-y-1.5">
                <Label>Storage Instructions</Label>
                <Input value={form.storage_instructions} onChange={e => setForm(f => ({ ...f, storage_instructions: e.target.value }))} placeholder="e.g. Store below 30°C" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>First Aid Instructions</Label>
              <Textarea rows={2} value={form.first_aid} onChange={e => setForm(f => ({ ...f, first_aid: e.target.value }))} placeholder="What to do in case of contact/ingestion..." />
            </div>

            {/* SDS Upload */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <p className="font-medium text-foreground flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-primary" /> Safety Data Sheet (SDS)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Expiry Date</Label>
                  <Input type="date" value={form.sds_expiry} onChange={e => setForm(f => ({ ...f, sds_expiry: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Document URL (or upload below)</Label>
                  <Input value={form.sds_url} onChange={e => setForm(f => ({ ...f, sds_url: e.target.value }))} placeholder="https://..." />
                </div>
              </div>
              <input ref={sdsInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => handleFileUpload(e, 'sds_url')} />
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => sdsInputRef.current?.click()} disabled={uploadingField === 'sds_url'}>
                <Upload className="w-3.5 h-3.5" />
                {uploadingField === 'sds_url' ? 'Uploading...' : 'Upload SDS Document'}
              </Button>
              {form.sds_url && <p className="text-xs text-emerald-600">✓ SDS document set</p>}
            </div>

            {/* PDS Upload */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <p className="font-medium text-foreground flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Product Data Sheet (PDS)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Expiry Date</Label>
                  <Input type="date" value={form.pds_expiry} onChange={e => setForm(f => ({ ...f, pds_expiry: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Document URL (or upload below)</Label>
                  <Input value={form.pds_url} onChange={e => setForm(f => ({ ...f, pds_url: e.target.value }))} placeholder="https://..." />
                </div>
              </div>
              <input ref={pdsInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => handleFileUpload(e, 'pds_url')} />
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => pdsInputRef.current?.click()} disabled={uploadingField === 'pds_url'}>
                <Upload className="w-3.5 h-3.5" />
                {uploadingField === 'pds_url' ? 'Uploading...' : 'Upload PDS Document'}
              </Button>
              {form.pds_url && <p className="text-xs text-emerald-600">✓ PDS document set</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." />
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} id="active-toggle" />
              <Label htmlFor="active-toggle">Product is currently active / in use</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingProduct(null); setForm(EMPTY_FORM); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : (editingProduct ? 'Save Changes' : 'Add Product')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
