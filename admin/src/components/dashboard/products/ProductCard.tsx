import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Edit2, ChevronDown, AlertTriangle, Package, CheckCircle2, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import VariantItem from './VariantItem';
import { generateSKU } from '@/utils/admin-utils';
import { ConfirmPortal } from '@/components/ui/ConfirmPortal';
import { useConfirm } from '@/hooks/use-confirm';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: any;
  index: number;
  isExpanded: boolean;
  onExpand: (id: string | null) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (product: any) => void;
  onDelete: (id: string) => void;
  editingVariant: string | null;
  setEditingVariant: (id: string | null) => void;
  updateProduct: any;
  addVariant: any;
  deleteVariant: any;
}

export default function ProductCard({
  product,
  index,
  isExpanded,
  onExpand,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  editingVariant,
  setEditingVariant,
  updateProduct,
  addVariant,
  deleteVariant
}: ProductCardProps) {
  const { confirm, confirmProps, closeConfirm } = useConfirm();
  const variants = product.variants || [];
  
  // 🎯 ELITE LOGIC: Find primary variant or fallback to first
  const primaryVariant = variants.find((v: any) => v.sku === product.primary_variant_id) || variants[0];
  
  const totalStock = variants.reduce((s: number, v: any) => s + v.stock_quantity, 0) ?? 0;
  const isLowStock = variants.some((v: any) => v.stock_quantity > 0 && v.stock_quantity < 5);
  const isOutOfStock = totalStock === 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className={`glass-card rounded-[2.5rem] overflow-hidden border transition-all duration-300 group ${isExpanded ? 'ring-4 ring-primary/5 border-primary/20 shadow-2xl' : 'border-border/40 hover:border-primary/20'} ${isSelected ? 'bg-primary/[0.03] border-primary/30' : ''}`}
    >
      <ConfirmPortal {...confirmProps} />

      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-6 flex-1">
          <div className="pl-2">
             <input 
               type="checkbox" 
               checked={isSelected}
               onChange={() => onSelect(product.id)}
               className="w-5 h-5 rounded-lg border-2 border-border accent-primary cursor-pointer transition-all hover:scale-110"
             />
          </div>

          <div className="flex items-center gap-8 flex-1 cursor-pointer" onClick={() => onExpand(isExpanded ? null : product.id)}>
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-muted/20 flex items-center justify-center text-5xl shadow-inner border border-border/30 overflow-hidden group-hover:scale-105 transition-transform">
                {product.media?.thumbnail || product.media?.icon
                  ? <img src={product.media.thumbnail || product.media.icon} alt="" className="w-full h-full object-cover" />
                  : '📦'}
              </div>
              {isLowStock && (
                <div className="absolute -top-1 -right-1 bg-orange-500 text-white p-1.5 rounded-full shadow-lg ring-4 ring-background">
                  <AlertTriangle size={14} />
                </div>
              )}
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-4">
                 <h3 className="font-display font-black text-xl text-foreground leading-none">{product.name}</h3>
                 {isOutOfStock && <Badge variant="destructive" className="h-5 text-[8px] px-2 font-black tracking-widest rounded-full uppercase">ĐÃ BÁN HẾT</Badge>}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1 opacity-60 font-medium max-w-xl">
                {product.description?.text || 'Hệ thống chưa đồng bộ mô tả chi tiết cho sản phẩm này'}
              </p>
              <div className="flex items-center gap-3 mt-4">
                <span className="text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-xl bg-muted/50 text-muted-foreground border border-border/50">
                  {product.category?.name || 'ROOT'}
                </span>
                {product.brand && (
                  <span className="text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-xl bg-primary/10 text-primary border border-primary/10">
                    {product.brand}
                  </span>
                )}
                {product.primary_variant_id && (
                  <Badge variant="outline" className="h-5 px-2 bg-primary/5 text-primary border-primary/20 text-[8px] font-black uppercase tracking-widest rounded-full">
                    <Star size={8} className="mr-1 fill-primary" /> Matrix Active
                  </Badge>
                )}
                <Separator orientation="vertical" className="h-3 w-px bg-border/50" />
                <span className="text-[10px] uppercase font-black text-muted-foreground opacity-40">
                   {variants.length} Phiên bản · {totalStock} Tồn kho
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right whitespace-nowrap hidden lg:block space-y-1">
            <p className="text-2xl font-black gradient-text tracking-tight">
              {primaryVariant ? `₫${Number(primaryVariant.price).toLocaleString()}` : '—'}
            </p>
            <div className="flex items-center justify-end gap-2">
               <span className={`w-2 h-2 rounded-full ${isOutOfStock ? 'bg-destructive' : isLowStock ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
               <p className={`text-[10px] font-black uppercase tracking-widest ${isLowStock ? 'text-orange-500' : 'text-muted-foreground opacity-60'}`}>
                 {isOutOfStock ? 'Ngừng bán' : isLowStock ? 'Sắp hết hàng' : 'Đang hoạt động'}
               </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                confirm({
                  title: 'Xóa sản phẩm?',
                  description: `Dữ liệu về "${product.name}" bao gồm ${variants.length} phiên bản sẽ bị gỡ bỏ vĩnh viễn khỏi hệ thống.`,
                  type: 'danger',
                  confirmText: 'Xác nhận xóa',
                  onConfirm: () => {
                    onDelete(product.id);
                    closeConfirm();
                  }
                });
              }}
              className="p-3.5 rounded-2xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all active:scale-95"
            >
              <Trash2 size={22} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(product);
              }}
              className="p-3.5 rounded-2xl text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-primary/20 active:scale-95"
            >
              <Edit2 size={22} />
            </button>
            <button 
              onClick={() => onExpand(isExpanded ? null : product.id)} 
              className={`w-14 h-14 flex items-center justify-center rounded-[1.25rem] transition-all duration-500 border-2 ${isExpanded ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20 -rotate-180' : 'bg-muted/10 hover:bg-muted/30 text-muted-foreground border-transparent'}`}
            >
              <ChevronDown size={28} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-muted/5 border-t border-border/40 overflow-hidden"
          >
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between px-2">
                 <h4 className="text-[10px] font-black text-foreground uppercase tracking-[0.3em] opacity-30 flex items-center gap-3">
                   <div className="w-12 h-px bg-border/50" />
                   Chi tiết phiên bản bản kinh doanh
                   <div className="w-12 h-px bg-border/50" />
                 </h4>
              </div>

              <div className="grid gap-6">
                {variants.map((v: any) => (
                  <VariantItem
                    key={v.id}
                    variant={v}
                    productName={product.name}
                    isEditing={editingVariant === v.id}
                    onEdit={() => setEditingVariant(editingVariant === v.id ? null : v.id)}
                    onUpdate={(data) => {
                      updateProduct.mutate({ id: v.id, data }, { 
                        onSuccess: () => setEditingVariant(null) 
                      });
                    }}
                    onDelete={() => {
                      confirm({
                        title: 'Loại bỏ biến thể?',
                        description: `Phiên bản với SKU "${v.sku}" sẽ bị xóa khỏi sản phẩm này.`,
                        type: 'warning',
                        confirmText: 'Xóa phiên bản',
                        onConfirm: () => {
                          deleteVariant.mutate(v.id);
                          closeConfirm();
                        }
                      });
                    }}
                  />
                ))}
                
                <Button 
                  variant="outline" 
                  className="dashed border-2 border-dashed border-border/60 py-14 flex flex-col gap-3 group hover:border-primary/50 hover:bg-primary/5 transition-all rounded-[2rem] bg-background/50"
                  onClick={() => {
                    const sku = generateSKU(product.name, {});
                    addVariant.mutate({ 
                      productId: product.id, 
                      data: { sku, price: 0, stock_quantity: 0, weight: 500, options: {} } 
                    });
                  }}
                >
                  <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-all text-muted-foreground scale-110">
                    <CheckCircle2 size={24} className="opacity-0 group-hover:opacity-100 absolute" />
                    <Package size={24} className="group-hover:opacity-0" />
                  </div>
                  <span className="text-[11px] font-black text-muted-foreground group-hover:text-primary transition-colors uppercase tracking-[0.2em] mt-1">Gia tăng cấu hình sản phẩm</span>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
