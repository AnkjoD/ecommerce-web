import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Layers, Wand2, X, Star, GripVertical } from 'lucide-react';
import ImageUpload from '@/components/ui/image-upload';
import { generateSKU, roundTo1000, calculateDiscount } from '@/utils/admin-utils';
import { cn } from '@/lib/utils';
import SmartAttributePopover from './SmartAttributePopover';
import { useAdminUniqueTags } from '@/hooks/use-admin-resources';

interface ProductDialogsProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  editOpen: boolean;
  setEditOpen: (open: boolean) => void;
  form: any;
  setForm: (form: any) => void;
  categories: any[];
  onSubmit: () => void;
  onEditSubmit: () => void;
  isPending: boolean;
  isEditPending: boolean;
}

export default function ProductDialogs({
  open,
  setOpen,
  editOpen,
  setEditOpen,
  form,
  setForm,
  categories,
  onSubmit,
  onEditSubmit,
  isPending,
  isEditPending
}: ProductDialogsProps) {
  const { data: uniqueTags = [] } = useAdminUniqueTags();
  
  const addFormVariant = () => {
    setForm((f: any) => ({ 
      ...f, 
      variants: [...f.variants, { 
        sku: '', price: '', price_before_discount: '', stock: '0', weight: '500', options: {}, image_url: '' 
      }] 
    }));
  };

  const updateFormVariant = (idx: number, field: string, value: any) => {
    setForm((f: any) => ({
      ...f,
      variants: f.variants.map((v: any, i: number) => i === idx ? { ...v, [field]: value } : v),
    }));
  };

  const removeFormVariant = (idx: number) => {
    setForm((f: any) => ({ ...f, variants: f.variants.filter((_: any, i: number) => i !== idx) }));
  };

  const handleAutoGenerateSKUs = () => {
    setForm((f: any) => ({
      ...f,
      variants: f.variants.map((v: any) => ({
        ...v,
        sku: generateSKU(f.name, v.options)
      }))
    }));
  };

  return (
    <>
      {/* 🚀 ADD PRODUCT DIALOG */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-4xl max-h-[95vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-foreground">Thêm sản phẩm mới</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-4">
            <div className="md:col-span-12 space-y-8">
              <div className="grid grid-cols-[auto_auto_1fr] gap-6 items-end bg-muted/20 p-6 rounded-3xl border border-border/50">
                <div className="flex flex-col items-center">
                  <Label className="text-[10px] font-black text-muted-foreground mb-2 block uppercase tracking-widest">Biểu tượng</Label>
                  <Input value={form.icon} onChange={e => setForm((f: any) => ({ ...f, icon: e.target.value }))} className="w-20 h-20 text-center text-4xl bg-background border-border rounded-2xl shadow-inner" />
                </div>
                <div className="flex flex-col items-center">
                  <Label className="text-[10px] font-black text-muted-foreground mb-2 block uppercase tracking-widest">Ảnh bìa</Label>
                  <ImageUpload value={form.imageUrl || undefined} onChange={url => setForm((f: any) => ({ ...f, imageUrl: url || '' }))} className="w-20 h-20" />
                </div>
                <div className="h-full flex flex-col justify-end">
                  <Label className="text-[10px] font-black text-muted-foreground mb-2 block uppercase tracking-widest">Tên sản phẩm *</Label>
                  <Input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="VD: MacBook Pro M3" className="bg-background border-border h-12 text-lg font-bold rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground mb-2 block">Slug định danh</Label>
                  <Input value={form.slug} onChange={e => setForm((f: any) => ({ ...f, slug: e.target.value }))} placeholder="macbook-pro-m3" className="bg-muted/30 border-border h-11" />
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground mb-2 block">Tên hãng (Brand)</Label>
                  <Input value={form.brand} onChange={e => setForm((f: any) => ({ ...f, brand: e.target.value }))} placeholder="VD: Apple" className="bg-muted/30 border-border h-11" />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-muted-foreground mb-2 block">Mô tả sản phẩm</Label>
                <Textarea value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="Mô tả tóm tắt tính năng sản phẩm..." className="bg-muted/30 border-border resize-none h-24" />
              </div>

              {/* 🚀 TAG SUGGESTIONS */}
              <div>
                <Label className="text-xs font-bold text-muted-foreground mb-2 block">Tags (Phân tách bằng dấu phẩy)</Label>
                <Input 
                  value={form.tags} 
                  onChange={e => setForm((f: any) => ({ ...f, tags: e.target.value }))} 
                  placeholder="VD: flagship, gaming, mobile" 
                  className="bg-muted/30 border-border h-11" 
                />
                {uniqueTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {uniqueTags.slice(0, 10).map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const current = form.tags.split(',').map(t => t.trim()).filter(Boolean);
                          if (!current.includes(tag)) {
                            setForm((f: any) => ({ ...f, tags: [...current, tag].join(', ') }));
                          }
                        }}
                        className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary border border-border transition-colors text-muted-foreground"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 🚀 ATTRIBUTE ORDER MANAGEMENT */}
              <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Cấu trúc thuộc tính Matrix</Label>
                    <p className="text-[10px] text-muted-foreground font-medium italic">Thứ tự này quyết định cách hiển thị trên trang chi tiết (VD: Màu sắc {"->"} Dung lượng)</p>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      const keys = Object.keys(form.variants[0]?.options || {});
                      setForm((f: any) => ({ ...f, attribute_order: keys }));
                    }}
                    className="text-[10px] font-black uppercase text-primary hover:bg-primary/10"
                  >
                    Tự động lấy
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {form.attribute_order.map((attr, i) => (
                    <div key={attr} className="flex items-center gap-2 bg-background border border-border px-4 py-2 rounded-xl shadow-sm group">
                      <span className="text-[10px] font-black text-foreground uppercase">{attr}</span>
                      <button 
                        onClick={() => setForm((f: any) => ({ ...f, attribute_order: f.attribute_order.filter((a: string) => a !== attr) }))}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <Input 
                    placeholder="Thêm nhóm + Enter" 
                    className="w-40 h-8 text-[10px] bg-transparent border-dashed" 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = e.currentTarget.value.trim();
                        if (val && !form.attribute_order.includes(val)) {
                          setForm((f: any) => ({ ...f, attribute_order: [...f.attribute_order, val] }));
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground mb-2 block">Danh mục *</Label>
                  <Select value={form.category_id} onValueChange={v => setForm((f: any) => ({ ...f, category_id: v }))}>
                    <SelectTrigger className="bg-muted/30 border-border h-11"><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground mb-2 block">Trạng thái phát hành *</Label>
                  <Select value={form.status} onValueChange={v => setForm((f: any) => ({ ...f, status: v }))}>
                    <SelectTrigger className="bg-muted/30 border-border h-11"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="active">🟢 Đang bán</SelectItem>
                      <SelectItem value="draft">🟡 Bản nháp</SelectItem>
                      <SelectItem value="archived">⚪ Ngừng kinh doanh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                      <Layers size={16} className="text-primary" /> PHIÊN BẢN BIẾN THỂ
                    </Label>
                    <p className="text-[10px] text-muted-foreground font-medium">Tùy chọn cấu hình, màu sắc, giá thành riêng biệt</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleAutoGenerateSKUs} className="h-8 text-[10px] uppercase font-black text-orange-500 border-orange-500/30 hover:bg-orange-500/5 px-4 rounded-lg">
                      <Wand2 size={14} className="mr-1.5" /> Auto SKU
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={addFormVariant} className="h-8 text-[10px] uppercase font-black border-primary/30 text-primary px-4 rounded-lg">
                      <Plus size={14} className="mr-1.5" /> Thêm bản thể
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 scrollbar-hide py-2">
                  {form.variants.map((v: any, idx: number) => (
                    <div key={idx} className="p-6 bg-muted/10 rounded-3xl border border-border/40 relative group/vitem hover:border-primary/20 transition-all shadow-sm">
                      <div className="grid grid-cols-12 gap-8">
                        <div className="col-span-12 md:col-span-9 space-y-6">
                          <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-2 flex items-end gap-3">
                              <div className="flex-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-2 block tracking-widest">Định danh SKU *</Label>
                                <Input value={v.sku} onChange={e => updateFormVariant(idx, 'sku', e.target.value)} placeholder="SKU-..." className="bg-background border-border text-sm h-11 font-mono uppercase" />
                              </div>
                              <button
                                type="button"
                                onClick={() => setForm((f: any) => ({ ...f, primary_variant_id: v.sku }))}
                                className={cn(
                                  "h-11 px-4 rounded-xl border transition-all flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest",
                                  form.primary_variant_id === v.sku 
                                    ? "bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10" 
                                    : "bg-muted/30 border-border text-muted-foreground hover:bg-primary/5"
                                )}
                              >
                                {form.primary_variant_id === v.sku ? <Star size={14} className="fill-primary" /> : <Star size={14} />}
                                {form.primary_variant_id === v.sku ? 'Chính' : 'Đặt Chính'}
                              </button>
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-2 block tracking-widest">Tồn kho</Label>
                              <Input type="number" value={v.stock} onChange={e => updateFormVariant(idx, 'stock', e.target.value)} className={`bg-background text-sm h-11 border-border font-bold ${parseInt(v.stock) < 5 ? 'text-destructive ring-1 ring-destructive/20' : ''}`} />
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-2 block tracking-widest">Cân nặng (G)</Label>
                              <Input type="number" value={v.weight} onChange={e => updateFormVariant(idx, 'weight', e.target.value)} className="bg-background border-border text-sm h-11" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground block tracking-widest">Giá gốc niêm yết</Label>
                              <div className="relative">
                                <Input 
                                  type="number" 
                                  value={v.price_before_discount} 
                                  onBlur={e => updateFormVariant(idx, 'price_before_discount', String(roundTo1000(e.target.value)))}
                                  onChange={e => updateFormVariant(idx, 'price_before_discount', e.target.value)} 
                                  className="bg-background border-border text-sm h-11 pl-7 opacity-60" 
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground opacity-50">₫</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-[10px] uppercase font-bold text-primary block tracking-widest">Giá bán thương mại *</Label>
                                {v.price && v.price_before_discount && parseFloat(v.price) < parseFloat(v.price_before_discount) && (
                                  <Badge variant="secondary" className="bg-green-500/10 text-green-500 text-[9px] h-4 font-black">-{calculateDiscount(parseFloat(v.price), parseFloat(v.price_before_discount))}%</Badge>
                                )}
                              </div>
                              <div className="relative">
                                <Input 
                                  type="number" 
                                  value={v.price} 
                                  onBlur={e => updateFormVariant(idx, 'price', String(roundTo1000(e.target.value)))}
                                  onChange={e => updateFormVariant(idx, 'price', e.target.value)} 
                                  className={`bg-background text-sm h-11 pl-7 font-black ${v.price && v.price_before_discount && parseFloat(v.price) > parseFloat(v.price_before_discount) ? 'border-destructive ring-2 ring-destructive/20' : 'border-border'}`} 
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-primary font-bold">₫</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-background/60 p-5 rounded-2xl border border-border/30 shadow-inner">
                            <div className="flex items-center justify-between mb-4">
                               <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-4 bg-primary rounded-full" />
                                  <Label className="text-[10px] uppercase font-black text-foreground tracking-widest">Kỹ thuật & Đặc tính</Label>
                               </div>
                               <SmartAttributePopover 
                                 onAdd={(key) => updateFormVariant(idx, 'options', { ...v.options, [key]: '' })}
                                 existingKeys={Object.keys(form.variants[0].options)}
                               />
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                               {Object.entries(v.options as Record<string, string>).map(([key, val]) => (
                                 <div key={key} className="flex gap-2 items-center bg-card p-2 rounded-xl border border-border/40 shadow-sm">
                                   <span className="text-[10px] font-black text-muted-foreground w-16 truncate border-r border-border/50 pr-2">{key}</span>
                                   <Input 
                                     value={val} 
                                     onChange={e => updateFormVariant(idx, 'options', { ...v.options, [key]: e.target.value })} 
                                     className="h-7 text-[10px] bg-transparent border-none p-0 focus-visible:ring-0 font-bold text-foreground" 
                                     placeholder="..."
                                   />
                                   <button onClick={() => {
                                     const newOpt = { ...v.options };
                                     delete newOpt[key];
                                     updateFormVariant(idx, 'options', newOpt);
                                   }} className="text-muted-foreground/40 hover:text-destructive transition-colors"><X size={12} /></button>
                                 </div>
                               ))}
                            </div>
                          </div>
                        </div>

                        <div className="col-span-12 md:col-span-3 border-l border-border/40 pl-8 flex flex-col items-center justify-center space-y-3">
                           <Label className="text-[10px] uppercase font-black text-muted-foreground block text-center tracking-widest">Visual Image</Label>
                           <ImageUpload 
                             value={v.image_url || undefined} 
                             onChange={url => updateFormVariant(idx, 'image_url', url || '')}
                             className="w-full aspect-square shadow-lg"
                           />
                        </div>
                      </div>

                      {form.variants.length > 1 && (
                        <button 
                          onClick={() => removeFormVariant(idx)} 
                          className="absolute -right-3 -top-3 w-8 h-8 bg-destructive text-white rounded-2xl flex items-center justify-center opacity-0 group-hover/vitem:opacity-100 transition-all shadow-xl z-20 hover:scale-110 active:scale-95"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={onSubmit} className="w-full h-16 text-lg font-black shadow-2xl shadow-primary/30 rounded-3xl uppercase tracking-[0.2em] transition-all hover:-translate-y-1 active:scale-[0.98]" disabled={isPending}>
                {isPending ? 'Đang khởi tạo danh mục...' : 'Kích hoạt kinh doanh sản phẩm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🚀 EDIT PRODUCT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-foreground">Metadata Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-8 mt-6">
            <div className="grid grid-cols-[auto_auto_1fr] gap-6 items-end bg-primary/[0.03] p-6 rounded-3xl border border-primary/10">
              <div className="flex flex-col items-center">
                <Label className="text-[10px] font-black text-muted-foreground mb-2 block uppercase tracking-widest opacity-60">Icon</Label>
                <Input value={form.icon} onChange={e => setForm((f: any) => ({ ...f, icon: e.target.value }))} className="w-20 h-20 text-center text-4xl bg-background border-border rounded-2xl" />
              </div>
              <div className="flex flex-col items-center">
                <Label className="text-[10px] font-black text-muted-foreground mb-2 block uppercase tracking-widest opacity-60">Cover</Label>
                <ImageUpload value={form.imageUrl || undefined} onChange={url => setForm((f: any) => ({ ...f, imageUrl: url || '' }))} className="w-20 h-20" />
              </div>
              <div className="h-full flex flex-col justify-end">
                <Label className="text-[10px] font-black text-muted-foreground mb-2 block uppercase tracking-widest opacity-60">Display Name *</Label>
                <Input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="VD: MacBook Pro M3" className="bg-background border-border h-12 text-lg font-black rounded-xl" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-xs font-bold text-muted-foreground mb-2 block">Slug & Permalinks</Label>
                <Input value={form.slug} onChange={e => setForm((f: any) => ({ ...f, slug: e.target.value }))} className="bg-muted/20 border-border h-11" />
              </div>
              <div>
                <Label className="text-xs font-bold text-muted-foreground mb-2 block">Brand Registry</Label>
                <Input value={form.brand} onChange={e => setForm((f: any) => ({ ...f, brand: e.target.value }))} className="bg-muted/20 border-border h-11" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-muted-foreground mb-2 block">Sourcing Description</Label>
              <Textarea value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} className="bg-muted/20 border-border resize-none h-32 rounded-xl" />
            </div>

            {/* 🚀 TAG SUGGESTIONS */}
            <div>
              <Label className="text-xs font-bold text-muted-foreground mb-2 block">Tags (Phân tách bằng dấu phẩy)</Label>
              <Input 
                value={form.tags} 
                onChange={e => setForm((f: any) => ({ ...f, tags: e.target.value }))} 
                placeholder="VD: flagship, gaming" 
                className="bg-muted/20 border-border h-11" 
              />
              {uniqueTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {uniqueTags.slice(0, 5).map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const current = form.tags.split(',').map(t => t.trim()).filter(Boolean);
                        if (!current.includes(tag)) {
                          setForm((f: any) => ({ ...f, tags: [...current, tag].join(', ') }));
                        }
                      }}
                      className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 🚀 ATTRIBUTE ORDER MANAGEMENT */}
            <div className="p-6 bg-primary/[0.03] rounded-[2rem] border border-primary/10">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Cấu trúc thuộc tính Matrix</Label>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    const keys = Object.keys(form.variants[0]?.options || {});
                    setForm((f: any) => ({ ...f, attribute_order: keys }));
                  }}
                  className="text-[10px] font-black uppercase text-primary hover:bg-primary/10 h-7"
                >
                  Tự động lấy
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.attribute_order.map((attr) => (
                  <div key={attr} className="flex items-center gap-2 bg-background border border-border px-3 py-1.5 rounded-lg shadow-sm">
                    <span className="text-[9px] font-black text-foreground uppercase tracking-wider">{attr}</span>
                    <button 
                      onClick={() => setForm((f: any) => ({ ...f, attribute_order: f.attribute_order.filter((a: string) => a !== attr) }))}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                <Input 
                  placeholder="Thêm nhóm..." 
                  className="w-32 h-7 text-[10px] bg-transparent border-dashed" 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = e.currentTarget.value.trim();
                      if (val && !form.attribute_order.includes(val)) {
                        setForm((f: any) => ({ ...f, attribute_order: [...f.attribute_order, val] }));
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-xs font-bold text-muted-foreground mb-2 block">Marketplace Category *</Label>
                <Select value={form.category_id} onValueChange={v => setForm((f: any) => ({ ...f, category_id: v }))}>
                  <SelectTrigger className="bg-muted/20 border-border h-11"><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold text-muted-foreground mb-2 block">Operational Status *</Label>
                <Select value={form.status} onValueChange={v => setForm((f: any) => ({ ...f, status: v }))}>
                  <SelectTrigger className="bg-muted/20 border-border h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="active">🟢 Đang hoạt động</SelectItem>
                    <SelectItem value="draft">🟡 Tạm ẩn nhà cung cấp</SelectItem>
                    <SelectItem value="archived">⚪ Lưu kho nội bộ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={onEditSubmit} className="w-full h-16 text-lg font-black shadow-2xl shadow-primary/20 rounded-[2rem] uppercase tracking-widest" disabled={isEditPending}>
              {isEditPending ? 'Đang thực thi biến động...' : 'Giao thoa Metadata'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
