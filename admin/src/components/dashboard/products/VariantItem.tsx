import { useState } from 'react';
import { Edit2, Trash2, Wand2, Calculator, X, AlertTriangle, Package, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ImageUpload from '@/components/ui/image-upload';
import { generateSKU, roundTo1000, calculateDiscount } from '@/utils/admin-utils';
import SmartAttributePopover from './SmartAttributePopover';

interface VariantItemProps {
  variant: any;
  productName: string;
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (data: any) => void;
  onDelete: () => void;
}

export default function VariantItem({ 
  variant, 
  productName, 
  isEditing, 
  onEdit, 
  onUpdate, 
  onDelete 
}: VariantItemProps) {
  const [form, setForm] = useState({
    sku: variant.sku,
    price: String(variant.price),
    price_before_discount: variant.price_before_discount ? String(variant.price_before_discount) : '',
    stock_quantity: String(variant.stock_quantity),
    weight: String(variant.weight || 500),
    options: variant.options || {},
    image_url: variant.image_url || '',
  });

  const isLowStock = parseInt(form.stock_quantity) > 0 && parseInt(form.stock_quantity) < 5;
  const isOutOfStock = parseInt(form.stock_quantity) === 0;

  return (
    <div className={`p-6 rounded-[2rem] border transition-all duration-500 group/variant ${isEditing ? 'bg-card border-primary ring-8 ring-primary/[0.03] shadow-2xl' : 'bg-background border-border/40 hover:bg-muted/10'}`}>
      {isEditing ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-top-6">
          <div className="grid grid-cols-12 gap-8">
            {/* Main Info */}
            <div className="col-span-12 lg:col-span-9 space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground mb-2 block tracking-widest opacity-60">Identity SKU Identity</Label>
                  <div className="relative">
                     <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} className="bg-muted/10 border-none shadow-inner text-xs h-11 pr-10 font-mono uppercase rounded-xl" />
                     <button onClick={() => setForm(f => ({ ...f, sku: generateSKU(productName, f.options) }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-orange-500 transition-colors" title="Regenerate SKU">
                        <Wand2 size={16} />
                     </button>
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-black text-muted-foreground mb-2 block tracking-widest opacity-60">Kho vận</Label>
                  <Input type="number" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} className={`bg-muted/10 border-none shadow-inner text-xs h-11 font-black rounded-xl ${isLowStock || isOutOfStock ? 'text-destructive ring-1 ring-destructive/20' : ''}`} />
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-black text-muted-foreground mb-2 block tracking-widest opacity-60">Khối lượng (G)</Label>
                  <Input type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} className="bg-muted/10 border-none shadow-inner text-xs h-11 rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <Label className="text-[10px] uppercase font-black text-muted-foreground mb-2 block tracking-widest opacity-60">Price Niêm yết</Label>
                  <div className="relative">
                    <Input type="number" 
                      value={form.price_before_discount} 
                      onBlur={e => setForm(f => ({ ...f, price_before_discount: String(roundTo1000(e.target.value)) }))}
                      onChange={e => setForm(f => ({ ...f, price_before_discount: e.target.value }))} 
                      className="bg-muted/10 border-none shadow-inner text-sm h-11 opacity-60 rounded-xl pl-7" 
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground opacity-30">₫</span>
                  </div>
                </div>
                <div>
                   <div className="flex items-center justify-between mb-2">
                      <Label className="text-[10px] uppercase font-black text-primary block tracking-widest">Deal Commercial *</Label>
                      {form.price && form.price_before_discount && parseFloat(form.price) < parseFloat(form.price_before_discount) && (
                        <div className="px-1.5 py-0.5 rounded-lg bg-green-500 text-white text-[9px] font-black animate-bounce">
                           -{calculateDiscount(parseFloat(form.price), parseFloat(form.price_before_discount))}% OFF
                        </div>
                      )}
                   </div>
                   <div className="relative">
                    <Input type="number" 
                      value={form.price} 
                      onBlur={e => setForm(f => ({ ...f, price: String(roundTo1000(e.target.value)) }))}
                      onChange={e => setForm(f => ({ ...f, price: e.target.value }))} 
                      className={`bg-muted/10 border-none shadow-inner text-sm h-11 font-black rounded-xl pl-7 ${form.price && form.price_before_discount && parseFloat(form.price) > parseFloat(form.price_before_discount) ? 'ring-2 ring-destructive ring-offset-background' : ''}`} 
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-primary font-bold">₫</span>
                  </div>
                </div>
                <div className="flex flex-col justify-end">
                   {form.price && form.price_before_discount && parseFloat(form.price) > parseFloat(form.price_before_discount) && (
                      <p className="text-[9px] text-destructive font-black flex items-center gap-1.5 animate-pulse uppercase tracking-widest"><AlertTriangle size={12} /> Lỗi: Giá chiến dịch cao hơn niêm yết!</p>
                   )}
                </div>
              </div>

              <div className="bg-background/80 p-6 rounded-3xl border border-border shadow-inner">
                 <div className="flex items-center justify-between mb-5">
                    <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
                       <Calculator size={14} /> KỸ THUẬT BIẾN THỂ
                    </span>
                    <SmartAttributePopover 
                      onAdd={(key) => setForm(f => ({ ...f, options: { ...f.options, [key]: '' } }))}
                      existingKeys={Object.keys(form.options)}
                    />
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(form.options).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2 bg-muted/20 p-2.5 rounded-2xl border border-border/40 group/opt shadow-sm hover:border-primary/20 transition-all">
                        <span className="text-[10px] font-black text-muted-foreground w-20 truncate opacity-40 uppercase tracking-widest">{key}</span>
                        <Input 
                          value={val as string} 
                          onChange={e => setForm(f => ({ ...f, options: { ...f.options, [key]: e.target.value } }))} 
                          className="h-7 text-[10px] bg-transparent border-none p-0 focus-visible:ring-0 font-black text-foreground" 
                          placeholder="..."
                        />
                        <button onClick={() => {
                          const newOpt = { ...form.options };
                          delete newOpt[key];
                          setForm(f => ({ ...f, options: newOpt }));
                        }} className="text-muted-foreground/40 hover:text-destructive transition-all group-hover/opt:opacity-100 opacity-0 px-1.5"><X size={14} /></button>
                      </div>
                    ))}
                    {Object.keys(form.options).length === 0 && (
                      <p className="col-span-full text-center py-4 text-[10px] text-muted-foreground italic opacity-30 flex flex-col items-center gap-2">
                        <Package size={16} /> Phiên bản hiện tại chưa được định nghĩa chi tiết thuộc tính kĩ thuật.
                      </p>
                    )}
                 </div>
              </div>
            </div>

            {/* Visual Media Overlay */}
            <div className="col-span-12 lg:col-span-3 lg:border-l border-border/40 lg:pl-8 space-y-4 flex flex-col items-center justify-center">
              <div className="w-full space-y-2">
                <Label className="text-[10px] uppercase font-black text-muted-foreground block text-center tracking-widest opacity-60">Sourcing Visual</Label>
                <div className="relative group/vimg">
                   <ImageUpload 
                    value={form.image_url || undefined} 
                    onChange={url => setForm(f => ({ ...f, image_url: url || '' }))}
                    className="w-full aspect-square shadow-2xl rounded-3xl overflow-hidden ring-4 ring-muted/20"
                  />
                  {form.image_url && (
                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover/vimg:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm rounded-3xl pointer-events-none">
                      <CheckCircle2 className="text-white" size={32} />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-primary/5 text-primary px-4 py-2 rounded-xl border border-primary/10">
                <ImageIcon size={14} /> {form.image_url ? 'Active Asset' : 'Missing Visual'}
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-8 border-t border-border/40">
            <Button size="sm" variant="ghost" className="h-14 text-[11px] font-black uppercase tracking-[0.25em] px-8 rounded-2xl" onClick={onEdit}>Hủy Bỏ Định Nghĩa</Button>
            <Button size="sm" className="h-14 text-[11px] font-black uppercase tracking-[0.25em] px-12 shadow-2xl shadow-primary/30 rounded-2xl transition-all hover:-translate-y-1 active:scale-[0.98]" onClick={() => onUpdate({
              name: productName,
              variants: [{
                sku: form.sku,
                price: parseFloat(form.price),
                price_before_discount: form.price_before_discount ? parseFloat(form.price_before_discount) : undefined,
                stock_quantity: parseInt(form.stock_quantity) || 0,
                weight: parseInt(form.weight) || 500,
                options: form.options,
                image_url: form.image_url || undefined,
              }]
            })}>Thực Thi Cập Nhật</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-7">
            <div className="relative group/hoverimg cursor-zoom-in">
              <div className="h-20 w-20 rounded-[1.75rem] bg-muted/20 flex items-center justify-center border border-border/40 overflow-hidden shadow-lg transition-transform hover:scale-110">
                 {variant.image_url ? (
                   <img src={variant.image_url} className="w-full h-full object-cover" />
                 ) : (
                   <ImageIcon size={28} className="text-muted-foreground/10" />
                 )}
              </div>
              {!variant.image_url && <div className="absolute inset-0 flex items-center justify-center"><Package size={20} className="text-muted-foreground/20" /></div>}
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-4">
                <span className="font-mono text-[10px] uppercase font-black text-muted-foreground bg-muted/60 px-3 py-1 rounded-xl tracking-widest border border-border/50 shadow-inner">{variant.sku}</span>
                <span className="font-black text-foreground text-xl tracking-tight">₫{Number(variant.price).toLocaleString()}</span>
                {variant.price_before_discount && (
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-muted-foreground line-through opacity-40 font-bold tracking-tight">₫{Number(variant.price_before_discount).toLocaleString()}</span>
                    <div className="bg-green-500 text-white text-[9px] font-black h-5 px-2 rounded-lg flex items-center shadow-lg shadow-green-500/20">
                      -{calculateDiscount(variant.price, variant.price_before_discount)}% OFF
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                {Object.entries(variant.options || {}).map(([key, val]) => (
                  <Badge key={key} variant="secondary" className="h-6 px-3 text-[10px] font-black rounded-xl bg-primary/[0.03] text-primary border border-primary/10 capitalize shadow-sm">
                    <span className="opacity-30 mr-1.5 font-bold uppercase tracking-widest text-[8px]">{key}:</span> {val as string}
                  </Badge>
                ))}
                <Separator orientation="vertical" className="h-3 w-px bg-border/50 mx-1" />
                <span className="text-[10px] font-black text-muted-foreground uppercase opacity-30 tracking-widest leading-none">{variant.weight || 500}G</span>
                
                {isOutOfStock ? (
                  <Badge variant="destructive" className="h-6 px-3 text-[9px] font-black uppercase border-none rounded-xl bg-destructive text-white shadow-lg shadow-destructive/20 ml-2">CHÁY HÀNG</Badge>
                ) : isLowStock ? (
                  <Badge variant="secondary" className="h-6 px-3 text-[9px] font-black uppercase border-none rounded-xl bg-orange-500 text-white animate-pulse shadow-lg shadow-orange-500/20 ml-2">KHẨN CẤP ({variant.stock_quantity})</Badge>
                ) : (
                  <Badge variant="outline" className="h-6 px-3 text-[9px] font-black uppercase border-border/60 rounded-xl bg-green-500/5 text-green-600 ml-2">AN TOÀN · {variant.stock_quantity} KHO</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover/variant:opacity-100 transition-all scale-90 group-hover/variant:scale-100 duration-300">
            <button onClick={onEdit} className="w-12 h-12 flex items-center justify-center rounded-[1.125rem] text-sidebar-foreground/60 hover:text-primary hover:bg-primary/5 transition-all border border-transparent hover:border-primary/20 bg-muted/5 shadow-sm">
              <Edit2 size={20} />
            </button>
            <button onClick={onDelete} className="w-12 h-12 flex items-center justify-center rounded-[1.125rem] text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/5 transition-all border border-transparent hover:border-destructive/20 bg-muted/5 shadow-sm">
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
