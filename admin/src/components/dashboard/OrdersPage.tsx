import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, 
  ChevronDown, 
  Truck, 
  CreditCard, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Filter,
  User,
  MapPin,
  FileText,
  Printer,
  Copy,
  ExternalLink,
  ChevronRight,
  Calculator,
  CalendarCheck,
  Ban
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  useAdminOrders, 
  useUpdateOrderStatus, 
  useUpdatePaymentStatus 
} from '@/hooks/use-admin-resources';
import { OrderStatus, PaymentStatus } from '@/types/ecommerce';
import { safeFormat } from '@/utils/date';
import { useDebounce } from '@/hooks/use-debounce';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: React.ElementType; step: number }> = {
  pending: { label: 'Chờ xử lý', color: 'bg-amber-500/15 text-amber-500', icon: Clock, step: 0 },
  confirmed: { label: 'Đã xác nhận', color: 'bg-emerald-500/15 text-emerald-500', icon: CheckCircle, step: 1 },
  processing: { label: 'Đang chuẩn bị', color: 'bg-blue-500/15 text-blue-500', icon: Package, step: 2 },
  shipping: { label: 'Đang giao', color: 'bg-cyan-500/15 text-cyan-500', icon: Truck, step: 3 },
  delivered: { label: 'Đã hoàn thành', color: 'bg-teal-500/15 text-teal-500', icon: CheckCircle, step: 4 },
  cancelled: { label: 'Đã hủy', color: 'bg-rose-500/15 text-rose-500', icon: XCircle, step: -1 },
  payment_failed: { label: 'Thanh toán lỗi', color: 'bg-rose-500/15 text-rose-500', icon: AlertTriangle, step: -1 },
};

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string }> = {
  unpaid: { label: 'Chưa thanh toán', color: 'bg-amber-500/15 text-amber-500' },
  paid: { label: 'Đã thanh toán', color: 'bg-emerald-500/15 text-emerald-500' },
  failed: { label: 'Thanh toán lỗi', color: 'bg-rose-500/15 text-rose-500' },
  refunded: { label: 'Đã hoàn tiền', color: 'bg-slate-500/15 text-slate-400' },
};

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipping', 'delivered'];

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const { data: ordersData, isLoading } = useAdminOrders({ 
    page, 
    limit: 10, 
    status: filterStatus === 'all' ? undefined : filterStatus, 
    search: debouncedSearch || undefined 
  });
  
  const updateStatus = useUpdateOrderStatus();
  const updatePayment = useUpdatePaymentStatus();
  
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const orders = useMemo(() => ordersData?.data || [], [ordersData]);

  // 🚀 SUMMARY STATS (CLIENT-SIDE FOR RECENT)
  const stats = useMemo(() => {
    const list = ordersData?.data || [];
    return {
      total: ordersData?.total || 0,
      processing: list.filter((o: any) => ['pending', 'confirmed', 'processing', 'shipping'].includes(o.status)).length,
      revenueToday: list
        .filter((o: any) => o.status !== 'cancelled' && o.status !== 'payment_failed')
        .reduce((sum: number, o: any) => sum + Number(o.total), 0),
      cancelled: list.filter((o: any) => o.status === 'cancelled').length
    };
  }, [ordersData]);

  const getNextStatus = (current: OrderStatus): OrderStatus | null => {
    const idx = STATUS_FLOW.indexOf(current);
    return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
  };

  useEffect(() => { setPage(1); }, [filterStatus, debouncedSearch]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}`);
  };

  const handlePrint = (order: any) => {
    const printContent = document.getElementById(`invoice-${order.id}`);
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // Re-initialize React
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      {/* 🚀 ELITE SUMMARY BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng đơn hàng', value: stats.total, icon: ShoppingCart, color: 'primary' },
          { label: 'Đang xử lý', value: stats.processing, icon: Clock, color: 'amber' },
          { label: 'Doanh thu trang này', value: `₫${stats.revenueToday.toLocaleString()}`, icon: Calculator, color: 'emerald' },
          { label: 'Đơn đã hủy', value: stats.cancelled, icon: Ban, color: 'rose' }
        ].map((stat, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-5 bg-background border border-border rounded-[2rem] shadow-sm hover:border-primary/30 transition-all group"
          >
            <div className="flex items-center gap-4">
               <div className={`p-3 rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-500 group-hover:scale-110 transition-transform`}>
                  <stat.icon size={22} />
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{stat.label}</p>
                  <h4 className="text-xl font-black text-foreground">{stat.value}</h4>
               </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black font-display text-foreground tracking-tight">Hệ thống Đơn hàng</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2 font-medium">
             Hệ thống quản lý chuỗi cung ứng và vận hành kho
          </p>
        </div>
        
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" size={20} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Mã đơn, SĐT, Tên khách hàng..."
            className="pl-12 h-14 bg-card border-border/60 rounded-[1.25rem] focus:ring-4 focus:ring-primary/5 shadow-inner font-medium"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 bg-muted/20 p-2 rounded-2xl border border-border/40 w-fit overflow-x-auto no-scrollbar">
        {[
           { id: 'all', label: 'Tất cả đơn' },
           { id: 'pending', label: 'Chờ xử lý' },
           { id: 'confirmed', label: 'Đã xác nhận' },
           { id: 'shipping', label: 'Đang vận chuyển' },
           { id: 'delivered', label: 'Đã hoàn tất' },
           { id: 'cancelled', label: 'Rủi ro/Hủy' }
        ].map(tab => (
           <button 
             key={tab.id}
             onClick={() => setFilterStatus(tab.id)}
             className={`px-6 h-10 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap
               ${filterStatus === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-background hover:text-foreground'}`}
           >
             {tab.label}
           </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 text-muted-foreground gap-6">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-black uppercase tracking-[0.2em] text-[10px] opacity-40">Đang thực thi truy vấn đơn hàng...</p>
        </div>
      ) : (
        <div className="grid gap-6">
          <AnimatePresence mode="popLayout">
            {orders.map((order: any, i: number) => {
              const isExpanded = expandedId === order.id;
              const sc = STATUS_CONFIG[order.status as OrderStatus] || STATUS_CONFIG.pending;
              const pc = PAYMENT_STATUS_CONFIG[order.payment_status as PaymentStatus] || PAYMENT_STATUS_CONFIG.unpaid;
              const nextStatus = getNextStatus(order.status as OrderStatus);
              const StatusIcon = sc.icon;

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  className={`glass-card rounded-[2.5rem] overflow-hidden border transition-all duration-500 group ${isExpanded ? 'border-primary shadow-2xl ring-8 ring-primary/[0.03]' : 'border-border/60 hover:border-primary/30'}`}
                >
                  <div
                    className={`p-6 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-primary/[0.02]' : 'hover:bg-muted/10'}`}
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  >
                    <div className="flex items-center gap-8">
                      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg border-2 border-white/20 transition-transform group-hover:scale-105 ${sc.color}`}>
                        <StatusIcon size={32} />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-4">
                          <span className="font-mono font-black text-2xl tracking-[0.1em] text-foreground">{order.order_code}</span>
                          <Badge className={`${sc.color} border-none font-black px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest bg-opacity-100 shadow-sm`}>{sc.label}</Badge>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-2 text-sm font-black text-foreground/80">
                              {order.user?.full_name}
                           </div>
                           <span className="w-1.5 h-1.5 bg-muted-foreground/20 rounded-full" />
                           <span className="text-[11px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
                              {safeFormat(order.created_at, 'HH:mm — dd/MM/yyyy')}
                           </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-10">
                       <div className="hidden xl:flex flex-col items-end border-r border-border pr-10">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2 opacity-40">Kênh Giao Dịch</p>
                          <p className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                             <CreditCard size={14} className="text-primary" /> {order.payment_method}
                          </p>
                       </div>
                      <div className="hidden sm:block text-right border-r border-border pr-10">
                        <p className="text-[10px] text-muted-foreground font-black mb-2 uppercase tracking-[0.2em] opacity-40">Thanh Toán</p>
                        <Badge variant="outline" className={`${pc.color} border-none px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest`}>{pc.label}</Badge>
                      </div>
                      <div className="text-right flex flex-col items-end min-w-[150px]">
                        <p className="text-[10px] text-muted-foreground font-black mb-1 uppercase tracking-[0.2em] opacity-40">Giá trị tổng</p>
                        <p className="font-black text-3xl text-primary tracking-tighter">₫{Number(order.total).toLocaleString()}</p>
                      </div>
                      <div className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-500 border-2 ${isExpanded ? 'bg-primary text-white border-primary shadow-xl rotate-180' : 'bg-muted/30 text-muted-foreground border-transparent'}`}>
                        <ChevronDown size={24} />
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border/40"
                      >
                        <div className="p-8 bg-muted/[0.02]">
                          {/* 🚀 ELITE STATUS STEPPER */}
                          <div className="mb-14 px-10">
                             <div className="relative flex justify-between">
                                {/* Line */}
                                <div className="absolute top-1/2 left-0 w-full h-1 bg-muted/20 -translate-y-1/2 z-0 rounded-full" />
                                <div 
                                  className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 z-0 rounded-full transition-all duration-1000" 
                                  style={{ width: `${(sc.step / 4) * 100}%` }}
                                />
                                
                                {STATUS_FLOW.map((s, idx) => {
                                  const config = STATUS_CONFIG[s];
                                  const isDone = sc.step >= idx && sc.step !== -1;
                                  const isCurrent = sc.step === idx;
                                  const Icon = config.icon;
                                  
                                  return (
                                    <div key={s} className="relative z-10 flex flex-col items-center">
                                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-4 ${isDone ? 'bg-primary border-primary/20 text-white shadow-lg shadow-primary/20 scale-110' : 'bg-card border-muted text-muted-foreground opacity-40'}`}>
                                        <Icon size={20} />
                                      </div>
                                      <p className={`absolute -bottom-8 whitespace-nowrap text-[9px] font-black uppercase tracking-widest transition-all ${isDone ? 'text-primary' : 'text-muted-foreground opacity-30'}`}>
                                        {config.label}
                                      </p>
                                    </div>
                                  );
                                })}
                             </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-4">
                            {/* Left: Customer & Details */}
                            <div className="lg:col-span-4 space-y-10">
                              <div>
                                <h3 className="flex items-center gap-3 text-[11px] font-black text-foreground uppercase tracking-[0.3em] mb-6 opacity-30">
                                   <MapPin size={16} className="text-primary" /> Vận Chuyển & Tiếp Nhận
                                </h3>
                                <div className="space-y-6 bg-card p-8 rounded-[2rem] border border-border shadow-sm">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block opacity-50">Người nhận hàng</span>
                                      <p className="font-black text-foreground text-xl">{order.address?.recipient_name || order.user?.full_name}</p>
                                    </div>
                                    <button onClick={() => copyToClipboard(order.address?.recipient_name || order.user?.full_name, 'Tên người nhận')} className="p-2 hover:bg-muted rounded-lg text-muted-foreground"><Copy size={14} /></button>
                                  </div>
                                  <div>
                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block opacity-50">Kênh liên lạc</span>
                                    <p className="font-black text-emerald-500 tracking-[0.15em] text-lg">{order.address?.phone || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block opacity-50">Địa chỉ tọa độ</span>
                                    <p className="text-sm font-bold leading-relaxed text-foreground/70">
                                      {order.address 
                                        ? `${order.address.street}, ${order.address.ward}, ${order.address.district}, ${order.address.province}`
                                        : 'Chưa cập nhật tọa độ'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="group/note">
                                 <h3 className="flex items-center gap-3 text-[11px] font-black text-foreground uppercase tracking-[0.3em] mb-6 opacity-30">
                                    <FileText size={16} className="text-primary" /> Thông điệp từ người mua
                                 </h3>
                                 <div className="bg-muted/10 p-6 rounded-[2rem] border border-dashed border-border transition-all group-hover/note:border-primary/40 group-hover/note:bg-primary/[0.01]">
                                    <p className="text-xs text-muted-foreground italic leading-relaxed text-center">
                                       {order.note ? `"${order.note}"` : "Hệ thống: Khách hàng không để lại ghi chú kĩ thuật."}
                                    </p>
                                 </div>
                              </div>
                            </div>

                            {/* Right: Billable Items */}
                            <div className="lg:col-span-8 space-y-8">
                              <div>
                                <div className="flex items-center justify-between mb-6">
                                   <h3 className="flex items-center gap-3 text-[11px] font-black text-foreground uppercase tracking-[0.3em] opacity-30">
                                      <Package size={16} className="text-primary" /> Tóm lược giỏ hàng
                                   </h3>
                                   <Button 
                                     variant="ghost" 
                                     size="sm" 
                                     className="h-8 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 rounded-xl"
                                     onClick={() => handlePrint(order)}
                                   >
                                      <Printer size={14} className="mr-2" /> In Hóa Đơn (A4)
                                   </Button>
                                </div>
                                <div className="bg-card rounded-[2rem] border border-border overflow-hidden shadow-xl">
                                  <table className="w-full">
                                    <thead className="bg-muted/30 text-muted-foreground text-left text-[9px] uppercase font-black tracking-[0.2em]">
                                      <tr>
                                        <th className="px-8 py-5">Định danh vật phẩm</th>
                                        <th className="px-8 py-5 text-center">S.Lượng</th>
                                        <th className="px-8 py-5 text-right">Đơn giá</th>
                                        <th className="px-8 py-5 text-right">Giao dịch</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/20">
                                      {order.items.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-primary/[0.01] transition-colors group/item">
                                          <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                               <div className="w-14 h-14 rounded-2xl bg-muted/20 border border-border/50 overflow-hidden shadow-sm shrink-0 flex items-center justify-center">
                                                  {item.product_thumbnail ? (
                                                    <img src={item.product_thumbnail} className="w-full h-full object-cover" />
                                                  ) : (
                                                    <Package className="text-muted-foreground/20" size={24} />
                                                  )}
                                               </div>
                                               <div>
                                                  <p className="font-black text-foreground leading-tight group-hover/item:text-primary transition-colors">{item.product_name}</p>
                                                  {item.variant_info && <p className="text-[10px] text-muted-foreground font-semibold mt-1 uppercase tracking-widest opacity-60">{item.variant_info}</p>}
                                               </div>
                                            </div>
                                          </td>
                                          <td className="px-8 py-6 text-center font-mono font-black text-foreground/30 text-base">×{item.quantity}</td>
                                          <td className="px-8 py-6 text-right text-muted-foreground font-bold text-sm tracking-tight">₫{Number(item.unit_price).toLocaleString()}</td>
                                          <td className="px-8 py-6 text-right font-black text-foreground text-base tracking-tight">₫{Number(item.subtotal).toLocaleString()}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot className="bg-muted/10">
                                      <tr className="border-t border-border/10">
                                        <td colSpan={3} className="px-8 py-4 text-right text-muted-foreground font-black uppercase tracking-widest text-[9px] opacity-40">Tổng hàng hóa</td>
                                        <td className="px-8 py-4 text-right font-black text-foreground/60 font-mono italic">₫{Number(order.subtotal).toLocaleString()}</td>
                                      </tr>
                                      {Number(order.discount_amount) > 0 && (
                                        <tr>
                                          <td colSpan={3} className="px-8 py-3 text-right text-destructive font-black uppercase tracking-widest text-[9px]">Chiết khấu sự kiện</td>
                                          <td className="px-8 py-3 text-right font-black text-destructive font-mono">-₫{Number(order.discount_amount).toLocaleString()}</td>
                                        </tr>
                                      )}
                                      <tr>
                                        <td colSpan={3} className="px-8 py-3 text-right text-muted-foreground font-black uppercase tracking-widest text-[9px] opacity-40">Chi phí vận hành kho</td>
                                        <td className="px-8 py-3 text-right font-black text-foreground/60 font-mono italic">₫{Number(order.shipping_fee).toLocaleString()}</td>
                                      </tr>
                                      <tr className="bg-primary/[0.03]">
                                        <td colSpan={3} className="px-8 py-8 text-right text-foreground font-black uppercase tracking-[0.25em] text-xs">Doanh thu kết chuyển</td>
                                        <td className="px-8 py-8 text-right font-black text-4xl text-primary font-display tracking-tighter">₫{Number(order.total).toLocaleString()}</td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>

                              {/* Action Engine */}
                              <div className="flex flex-wrap gap-4 pt-6 items-center bg-card p-10 rounded-[3rem] border border-border shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                                   <Calculator size={140} strokeWidth={1} />
                                </div>

                                <div className="w-full flex items-center gap-4 mb-4">
                                   <div className="h-px bg-border flex-1" />
                                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em] opacity-40 italic">Business Logic Engine</p>
                                   <div className="h-px bg-border flex-1" />
                                </div>
                                
                                {nextStatus && order.status !== 'cancelled' && (
                                  <Button
                                    className="h-16 px-12 rounded-2xl font-black bg-primary hover:bg-primary/90 text-white shadow-[0_20px_40px_rgba(var(--primary),0.2)] transition-all active:scale-[0.98] flex-1 md:flex-none uppercase tracking-widest text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateStatus.mutate({ id: order.id, status: nextStatus });
                                    }}
                                    disabled={updateStatus.isPending}
                                  >
                                    TIẾN TRÌNH: {STATUS_CONFIG[nextStatus].label.toUpperCase()} <ChevronRight size={18} className="ml-2 mt-0.5" />
                                  </Button>
                                )}

                                {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                  <Button
                                    variant="outline"
                                    className="h-16 px-10 rounded-2xl font-black border-destructive/20 text-destructive hover:bg-destructive/10 transition-all flex-1 md:flex-none uppercase tracking-widest text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm('Phân tích Rủi ro: Bạn xác nhận hủy bỏ đơn hàng này?')) {
                                        updateStatus.mutate({ id: order.id, status: 'cancelled' as any });
                                      }
                                    }}
                                    disabled={updateStatus.isPending}
                                  >
                                    HỦY BỎ GIAO DỊCH
                                  </Button>
                                )}

                                <div className="h-12 w-px bg-border mx-4 hidden md:block" />

                                {order.payment_status === 'unpaid' && (
                                  <Button
                                    variant="outline"
                                    className="h-16 px-10 rounded-2xl font-black border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 transition-all flex items-center gap-3 flex-1 md:flex-none uppercase tracking-widest text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updatePayment.mutate({ id: order.id, status: 'paid' as any });
                                    }}
                                    disabled={updatePayment.isPending}
                                  >
                                    <CreditCard size={20} /> XÁC THỰC THANH TOÁN
                                  </Button>
                                )}

                                {order.status === 'cancelled' && order.payment_status === 'paid' && (
                                  <Button
                                    variant="outline"
                                    className="h-16 px-10 rounded-2xl font-black border-slate-400/30 text-slate-500 hover:bg-slate-100 transition-all flex-1 md:flex-none uppercase tracking-widest text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updatePayment.mutate({ id: order.id, status: 'refunded' as any });
                                    }}
                                    disabled={updatePayment.isPending}
                                  >
                                    HOÀN TIỀN CHO KHÁCH
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 🚀 HIDDEN INVOICE FOR PRINTING */}
                        <div id={`invoice-${order.id}`} className="hidden">
                           <div className="p-10 bg-white text-black font-sans" style={{ maxWidth: '800px', margin: '0 auto' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', borderBottom: '2px solid #000', paddingBottom: '20px' }}>
                                 <div>
                                    <h1 style={{ margin: 0, fontSize: '32px' }}>HOMURA HQ</h1>
                                    <p style={{ margin: '5px 0', opacity: 0.6 }}>Hóa đơn giá trị gia tăng</p>
                                 </div>
                                 <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: 0, fontWeight: 'bold' }}>Mã đơn: {order.order_code}</p>
                                    <p style={{ margin: '5px 0' }}>Ngày: {safeFormat(order.created_at, 'dd/MM/yyyy')}</p>
                                 </div>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
                                 <div>
                                    <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '5px' }}>THÔNG TIN GỬI</h3>
                                    <p style={{ fontWeight: 'bold' }}>HOMURA SHOP</p>
                                    <p>Số 1, Đại Cồ Việt, Hai Bà Trưng, Hà Nội</p>
                                    <p>SĐT: 0123 456 789</p>
                                 </div>
                                 <div>
                                    <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '5px' }}>THÔNG TIN NHẬN</h3>
                                    <p style={{ fontWeight: 'bold' }}>{order.address?.recipient_name || order.user?.full_name}</p>
                                    <p>{order.address 
                                        ? `${order.address.street}, ${order.address.ward}, ${order.address.district}, ${order.address.province}`
                                        : 'N/A'}</p>
                                    <p>SĐT: {order.address?.phone || 'N/A'}</p>
                                 </div>
                              </div>
                              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
                                 <thead style={{ background: '#f8f8f8' }}>
                                    <tr>
                                       <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Sản phẩm</th>
                                       <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>SL</th>
                                       <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Đơn giá</th>
                                       <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Thành tiền</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {order.items.map((item: any) => (
                                      <tr key={item.id}>
                                         <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                                            <p style={{ margin: 0, fontWeight: 'bold' }}>{item.product_name}</p>
                                            <p style={{ margin: 0, fontSize: '12px', opacity: 0.6 }}>{item.variant_info}</p>
                                         </td>
                                         <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #eee' }}>{item.quantity}</td>
                                         <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>₫{Number(item.unit_price).toLocaleString()}</td>
                                         <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #eee' }}>₫{Number(item.subtotal).toLocaleString()}</td>
                                      </tr>
                                    ))}
                                 </tbody>
                                 <tfoot>
                                    <tr>
                                       <td colSpan={3} style={{ padding: '12px', textAlign: 'right' }}>Tạm tính:</td>
                                       <td style={{ padding: '12px', textAlign: 'right' }}>₫{Number(order.subtotal).toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                       <td colSpan={3} style={{ padding: '12px', textAlign: 'right' }}>Vận chuyển:</td>
                                       <td style={{ padding: '12px', textAlign: 'right' }}>₫{Number(order.shipping_fee).toLocaleString()}</td>
                                    </tr>
                                    {Number(order.discount_amount) > 0 && (
                                       <tr>
                                          <td colSpan={3} style={{ padding: '12px', textAlign: 'right', color: 'red' }}>Giảm giá:</td>
                                          <td style={{ padding: '12px', textAlign: 'right', color: 'red' }}>-₫{Number(order.discount_amount).toLocaleString()}</td>
                                       </tr>
                                    )}
                                    <tr style={{ background: '#000', color: '#fff' }}>
                                       <td colSpan={3} style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>TỔNG CỘNG:</td>
                                       <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '20px' }}>₫{Number(order.total).toLocaleString()}</td>
                                    </tr>
                                 </tfoot>
                              </table>
                              <div style={{ textAlign: 'center', padding: '40px 0', borderTop: '1px dashed #ddd' }}>
                                 <p>Cảm ơn quý khách đã tin tưởng lựa chọn Homura HQ!</p>
                                 <p style={{ fontSize: '12px', opacity: 0.5 }}>Đây là chứng từ tự động từ hệ thống.</p>
                              </div>
                           </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination Container */}
      {ordersData?.total_pages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-12">
          <Button 
            variant="outline" size="sm" 
            disabled={page === 1} 
            onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="rounded-2xl px-6 h-12 border-border font-black text-[10px] uppercase tracking-widest bg-card"
          >
            Trang Trước
          </Button>
          <div className="flex items-center h-12 px-8 bg-muted/40 rounded-2xl border border-border/40 shadow-inner font-black text-xs tracking-widest">
            <span className="text-primary">{page}</span>
            <span className="mx-3 opacity-20">/</span>
            <span className="opacity-40">{ordersData.total_pages}</span>
          </div>
          <Button 
            variant="outline" size="sm" 
            disabled={page >= ordersData.total_pages} 
            onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="rounded-2xl px-6 h-12 border-border font-black text-[10px] uppercase tracking-widest bg-card"
          >
            Trang Kế
          </Button>
        </div>
      )}
    </div>
  );
}

