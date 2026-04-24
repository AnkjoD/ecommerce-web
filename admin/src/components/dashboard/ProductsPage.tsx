import { useState, useMemo } from 'react';
import { Plus, Package, RefreshCw, CheckCircle2, TrendingDown, AlertTriangle } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  useAdminProducts, 
  useCreateProduct, 
  useUpdateProduct, 
  useUpdateProductMetadata,
  useAddVariant,
  useDeleteProduct,
  useAdminCategories,
  useDeleteVariant,
  useSyncProducts
} from '@/hooks/use-admin-resources';
import { toast } from 'sonner';

// 🚀 MODULAR COMPONENT IMPORTS
import ProductFilters from './products/ProductFilters';
import ProductCard from './products/ProductCard';
import BulkActionBar from './products/BulkActionBar';
import ProductDialogs from './products/ProductDialogs';

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  const { data: productsData, isLoading } = useAdminProducts(page, 20, search);
  const { data: categories = [] } = useAdminCategories();
  
  const addProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();
  const updateProduct = useUpdateProduct();
  const updateMetadata = useUpdateProductMetadata();
  const addVariant = useAddVariant();
  const deleteVariant = useDeleteVariant();
  const syncProducts = useSyncProducts();

  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [form, setForm] = useState({
    name: '', description: '', slug: '', brand: '', status: 'active',
    category_id: '', tags: '', icon: '📦', imageUrl: '',
    primary_variant_id: null as string | null,
    attribute_order: [] as string[],
    variants: [{ 
      sku: '', price: '', price_before_discount: '', stock: '0', weight: '500', options: {} as Record<string, string>, image_url: '' 
    }],
  });

  // 🚀 FILTER & STATS LOGIC
  const { filteredProducts, stats } = useMemo(() => {
    let list = productsData?.data || [];
    const summary = {
      total: productsData?.total || 0,
      active: list.filter((p: any) => p.status === 'active').length,
      lowStock: list.filter((p: any) => p.variants?.some((v: any) => v.stock_quantity > 0 && v.stock_quantity < 5)).length,
      outOfStock: list.filter((p: any) => p.variants?.every((v: any) => v.stock_quantity === 0)).length
    };

    if (filterStatus === 'low_stock') {
      list = list.filter((p: any) => p.variants?.some((v: any) => v.stock_quantity > 0 && v.stock_quantity < 5));
    } else if (filterStatus === 'out_of_stock') {
      list = list.filter((p: any) => p.variants?.every((v: any) => v.stock_quantity === 0));
    } else if (filterStatus !== 'all') {
      list = list.filter((p: any) => p.status === filterStatus);
    }
    if (filterCategory !== 'all') {
      list = list.filter((p: any) => p.category_id === filterCategory);
    }
    return { filteredProducts: list, stats: summary };
  }, [productsData, filterStatus, filterCategory]);

  // 🚀 HANDLERS
  const handleSubmit = () => {
    if (!form.name || form.variants.some(v => !v.sku || !v.price)) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc (Tên và ít nhất 1 bản thể có SKU/Giá)');
      return;
    }
    addProduct.mutate({
      ...form,
      description: { text: form.description },
      media: { icon: form.icon, thumbnail: form.imageUrl || undefined },
      variants: form.variants.map(v => ({
        ...v,
        price: parseFloat(v.price),
        price_before_discount: v.price_before_discount ? parseFloat(v.price_before_discount) : undefined,
        stock_quantity: parseInt(v.stock) || 0,
        weight: parseInt(v.weight) || 500,
      }))
    }, {
      onSuccess: () => {
        setForm({ 
          name: '', description: '', slug: '', brand: '', status: 'active', 
          category_id: '', tags: '', icon: '📦', imageUrl: '', 
          primary_variant_id: null, attribute_order: [],
          variants: [{ sku: '', price: '', price_before_discount: '', stock: '0', weight: '500', options: {}, image_url: '' }] 
        });
        setOpen(false);
      }
    });
  };

  const handleEditSubmit = () => {
    if (!editingProduct || !form.name) return;
    updateMetadata.mutate({ 
      id: editingProduct.id, 
      data: { 
        ...form, 
        description: { text: form.description },
        media: { icon: form.icon, thumbnail: form.imageUrl || undefined }
      } 
    }, {
      onSuccess: () => {
        setEditingProduct(null);
        setEditOpen(false);
      }
    });
  };

  const openEdit = (product: any) => {
    const media = typeof product.media === 'string' ? JSON.parse(product.media) : product.media;
    const desc = typeof product.description === 'string' ? { text: product.description } : product.description;
    setEditingProduct(product);
    setForm({
      name: product.name,
      slug: product.slug,
      brand: product.brand || '',
      status: product.status,
      category_id: product.category_id || '',
      description: desc?.text || '',
      tags: product.tags?.join(', ') || '',
      icon: media?.icon || '📦',
      imageUrl: media?.thumbnail || '',
      primary_variant_id: product.primary_variant_id || null,
      attribute_order: product.attribute_order || [],
      variants: product.variants?.map((v: any) => ({
        id: v.id, sku: v.sku, price: String(v.price), stock: String(v.stock_quantity), options: v.options || {}, image_url: v.image_url || ''
      })) || []
    });
    setEditOpen(true);
  };

  const handleBulkStatus = (status: string) => {
    toast.promise(Promise.all(selectedIds.map(id => updateMetadata.mutateAsync({ id, data: { status } }))), {
      loading: 'Đang cập nhật...', success: 'Thành công', error: 'Thất bại'
    });
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    if (!confirm('Xóa vĩnh viễn các sản phẩm?')) return;
    toast.promise(Promise.all(selectedIds.map(id => deleteProduct.mutateAsync(id))), {
      loading: 'Đang xóa...', success: 'Thành công', error: 'Thất bại'
    });
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6">
      {/* 🚀 STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng Sản Phẩm', val: stats.total, color: 'primary', icon: Package, f: 'all' },
          { label: 'Đang Hoạt Động', val: stats.active, color: 'green-500', icon: CheckCircle2, f: 'active' },
          { label: 'Sắp Hết Hàng', val: stats.lowStock, color: 'orange-500', icon: TrendingDown, f: 'low_stock' },
          { label: 'Hết Hàng', val: stats.outOfStock, color: 'destructive', icon: AlertTriangle, f: 'out_of_stock' }
        ].map(s => (
          <div key={s.label} onClick={() => setFilterStatus(s.f)} className={`p-4 bg-background border border-border rounded-2xl hover:border-${s.color}/50 transition-all cursor-pointer group shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl bg-${s.color}/10 text-${s.color} group-hover:scale-110 transition-transform`}>
                <s.icon size={22} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-black text-muted-foreground opacity-60 tracking-widest">{s.label}</p>
                <h4 className="text-xl font-black text-foreground">{s.val}</h4>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Sản phẩm</h1>
          <p className="text-muted-foreground mt-1 text-sm">Quản lý kho hàng và các phiên bản biến thể</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2 border-primary/20 text-primary h-11 px-4 rounded-xl" onClick={() => syncProducts.mutate()} disabled={syncProducts.isPending}>
            <RefreshCw size={16} className={syncProducts.isPending ? 'animate-spin' : ''} /> Đồng bộ
          </Button>
          <Button className="h-11 px-6 gap-2 shadow-lg shadow-primary/20 rounded-xl font-black uppercase text-xs tracking-widest" onClick={() => setOpen(true)}>
            <Plus size={18} /> Thêm sản phẩm
          </Button>
        </div>
      </div>

      <ProductFilters 
        search={search} setSearch={setSearch}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        filterCategory={filterCategory} setFilterCategory={setFilterCategory}
        categories={categories}
        selectedIds={selectedIds}
        filteredLength={filteredProducts.length}
        onSelectAll={(checked) => checked ? setSelectedIds(filteredProducts.map((p: any) => p.id)) : setSelectedIds([])}
      />

      <div className="grid gap-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-6">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="font-black uppercase tracking-widest text-[10px]">Đang tải kho dữ liệu...</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredProducts.map((p: any, i: number) => (
              <ProductCard 
                key={p.id} product={p} index={i}
                isExpanded={expandedId === p.id} onExpand={setExpandedId}
                isSelected={selectedIds.includes(p.id)} onSelect={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                onEdit={openEdit} onDelete={(id) => confirm('Xóa sản phẩm?') && deleteProduct.mutate(id)}
                editingVariant={editingVariant} setEditingVariant={setEditingVariant}
                updateProduct={updateProduct} addVariant={addVariant} deleteVariant={deleteVariant}
              />
            ))}
          </AnimatePresence>
        )}
        {!isLoading && filteredProducts.length === 0 && (
          <div className="text-center py-40 glass-card rounded-[3rem] border-dashed border-2 border-border/50 bg-muted/5">
            <Package size={48} className="mx-auto mb-6 text-muted-foreground/20" />
            <h3 className="text-xl font-black">Không tìm thấy sản phẩm</h3>
            <Button variant="link" onClick={() => { setSearch(''); setFilterStatus('all'); }} className="mt-4 text-primary font-black uppercase text-[10px]">Xóa bộ lọc</Button>
          </div>
        )}
      </div>

      <BulkActionBar 
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        onBulkStatus={handleBulkStatus}
        onBulkDelete={handleBulkDelete}
      />

      <ProductDialogs 
        open={open} setOpen={setOpen}
        editOpen={editOpen} setEditOpen={setEditOpen}
        form={form} setForm={setForm}
        categories={categories}
        onSubmit={handleSubmit} onEditSubmit={handleEditSubmit}
        isPending={addProduct.isPending} isEditPending={updateMetadata.isPending}
      />
    </div>
  );
}
