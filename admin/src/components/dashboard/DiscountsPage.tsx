import { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Power, 
  Tag, 
  Calendar, 
  AlertCircle, 
  Search, 
  Ticket, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Copy,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  useAdminCoupons, 
  useCreateCoupon, 
  useUpdateCoupon, 
  useDeleteCoupon 
} from '@/hooks/use-admin-resources';
import { toast } from 'sonner';
import { safeFormat } from '@/utils/date';

export default function DiscountsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  
  const { data: couponsData, isLoading } = useAdminCoupons(page, 20);
  const addCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: '', discount_type: 'percent' as string, discount_value: '',
    min_order_value: '', usage_limit: '', expires_at: '',
  });

  const coupons = useMemo(() => couponsData?.data || [], [couponsData]);

  // 🚀 SUMMARY STATS
  const stats = useMemo(() => {
    return {
      active: coupons.filter((c: any) => c.is_active && (!c.expires_at || new Date(c.expires_at) > new Date())).length,
      expiringSoon: coupons.filter((c: any) => {
        if (!c.expires_at) return false;
        const diff = new Date(c.expires_at).getTime() - new Date().getTime();
        return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000; // < 3 days
      }).length,
      totalUsage: coupons.reduce((s, c) => s + (c.used_count || 0), 0)
    };
  }, [coupons]);

  const handleSubmit = () => {
    if (!form.code || !form.discount_value) {
      toast.error('Vui lòng điền mã và giá trị giảm giá');
      return;
    }
    
    addCoupon.mutate({
      code: form.code.toUpperCase().trim(),
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      min_order_value: parseFloat(form.min_order_value) || 0,
      usage_limit: parseInt(form.usage_limit) || 999,
      is_active: true,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : undefined,
    }, {
      onSuccess: () => {
        setForm({ 
          code: '', discount_type: 'percent', discount_value: '', 
          min_order_value: '', usage_limit: '', expires_at: '' 
        });
        setOpen(false);
      }
    });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Đã sao chép mã!');
  };

  const filteredCoupons = coupons.filter((c: any) => 
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      {/* 🚀 ELITE SUMMARY BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Đang hoạt động', value: stats.active, icon: CheckCircle2, color: 'emerald' },
          { label: 'Sắp hết hạn', value: stats.expiringSoon, icon: Clock, color: 'amber' },
          { label: 'Tổng lượt dùng', value: stats.totalUsage, icon: TrendingUp, color: 'primary' }
        ].map((stat, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-6 bg-card border border-border rounded-[2.5rem] shadow-sm hover:border-primary/30 transition-all group"
          >
            <div className="flex items-center gap-5">
               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110
                 ${stat.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : 
                   stat.color === 'amber' ? 'bg-amber-500/10 text-amber-500' : 
                   'bg-primary/10 text-primary'}`}>
                  <stat.icon size={26} />
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50 mb-1">{stat.label}</p>
                  <h4 className="text-2xl font-black text-foreground tracking-tight">{stat.value}</h4>
               </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black font-display text-foreground tracking-tighter">Hệ thống Ưu đãi</h1>
          <p className="text-muted-foreground mt-1 font-medium italic">Marketing & Campaign Management Engine</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" size={20} />
            <Input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Truy vấn mã code..." 
              className="pl-12 w-64 h-14 bg-card border-border/60 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all font-bold" 
            />
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-14 px-8 gap-3 bg-primary hover:bg-primary/90 text-white font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95">
                <Plus size={20} /> Tạo mã voucher
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-xl p-8 rounded-[3rem] shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                 <Ticket size={200} strokeWidth={1} />
              </div>
              
              <DialogHeader>
                <DialogTitle className="font-display text-3xl font-black text-foreground tracking-tight">Cấu hình Đợt phát hành</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 mt-8 relative z-10">
                <div className="bg-muted/20 p-8 rounded-[2rem] border border-border space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Mã định danh (Voucher Code)</Label>
                    <Input 
                      value={form.code} 
                      onChange={e => setForm(f => ({ ...f, code: e.target.value }))} 
                      placeholder="VD: SUMMERSALE30" 
                      className="bg-background border-border h-14 uppercase font-mono font-black tracking-[0.25em] text-xl text-primary text-center rounded-2xl" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Hình thức chiết khấu</Label>
                      <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}>
                        <SelectTrigger className="bg-background border-border h-14 rounded-xl font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="percent">Tỉ lệ phần trăm (%)</SelectItem>
                          <SelectItem value="fixed">Số tiền trực tiếp (₫)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between ml-2">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Giá trị cụ thể</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger><Info size={12} className="text-muted-foreground opacity-40" /></TooltipTrigger>
                            <TooltipContent className="bg-foreground text-background font-bold text-[10px]">Tỉ lệ tối đa 100% hoặc số tiền VND cụ thể.</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input 
                        type="number" 
                        value={form.discount_value} 
                        onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} 
                        placeholder={form.discount_type === 'percent' ? '10' : '50000'} 
                        className="bg-background border-border h-14 font-black text-lg rounded-xl" 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 px-4">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Kích hoạt từ (Đơn tối thiểu)</Label>
                    <Input 
                      type="number" 
                      value={form.min_order_value} 
                      onChange={e => setForm(f => ({ ...f, min_order_value: e.target.value }))} 
                      placeholder="0" 
                      className="bg-background border-border h-12 rounded-xl font-bold" 
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Giới hạn số lượt dùng</Label>
                    <Input 
                      type="number" 
                      value={form.usage_limit} 
                      onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))} 
                      placeholder="Vô cực (999+)" 
                      className="bg-background border-border h-12 rounded-xl font-bold" 
                    />
                  </div>
                </div>

                <div className="space-y-3 px-4">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Thời điểm kết thúc đợt</Label>
                  <div className="relative group">
                    <Calendar size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <Input 
                      type="date" 
                      value={form.expires_at} 
                      onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} 
                      className="bg-background border-border h-14 pl-12 rounded-2xl font-bold" 
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    onClick={handleSubmit} 
                    className="w-full h-16 text-xs font-black uppercase tracking-[0.15em] bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-2xl shadow-primary/30 transition-all active:scale-95" 
                    disabled={addCoupon.isPending}
                  >
                    {addCoupon.isPending ? 'Đang thực thi lệnh...' : 'Xác thực & Phát hành Voucher'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 text-muted-foreground gap-6">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-black uppercase tracking-[0.2em] text-[10px] opacity-40">Đang quét cơ sở dữ liệu ưu đãi...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredCoupons.length === 0 ? (
              <div className="col-span-full text-center py-40 glass-card rounded-[3rem] border-dashed border-4 border-border/40 group">
                <Ticket size={80} className="mx-auto text-muted-foreground/10 mb-6 group-hover:scale-110 transition-transform duration-500" />
                <p className="text-muted-foreground font-black uppercase tracking-widest text-xs opacity-40">Chưa ghi nhận mã voucher nào trong hệ thống</p>
              </div>
            ) : filteredCoupons.map((coupon: any, i: number) => {
              const expires = coupon.expires_at ? new Date(coupon.expires_at) : null;
              const isExpired = expires && expires < new Date();
              const isFailing = coupon.used_count >= coupon.usage_limit;
              const diffDays = expires ? Math.ceil((expires.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
              
              return (
                <motion.div
                  key={coupon.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  className={`relative group bg-card border-2 rounded-[2.5rem] p-8 shadow-sm transition-all duration-500 overflow-hidden
                    ${!coupon.is_active || isExpired || isFailing ? 'border-border grayscale-[0.5] opacity-80' : 'border-border/60 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5'}`}
                >
                  {/* Voucher Card Decorative Edges */}
                  <div className="absolute top-1/2 -left-4 w-8 h-8 bg-background border-2 border-border/40 rounded-full -translate-y-1/2 z-10" />
                  <div className="absolute top-1/2 -right-4 w-8 h-8 bg-background border-2 border-border/40 rounded-full -translate-y-1/2 z-10" />

                  <div className="flex flex-col gap-6 relative z-0">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-6">
                        <div className={`w-20 h-20 rounded-[1.75rem] flex flex-col items-center justify-center border-2 transition-transform group-hover:rotate-6
                          ${coupon.is_active && !isExpired ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
                          <p className="text-[10px] font-black uppercase tracking-tighter opacity-60">{coupon.discount_type === 'percent' ? '%' : 'MAX'}</p>
                          <p className="text-3xl font-black font-display leading-none">
                             {coupon.discount_type === 'percent' ? coupon.discount_value : (Number(coupon.discount_value)/1000).toFixed(0)}
                          </p>
                          {coupon.discount_type !== 'percent' && <p className="text-[9px] font-black">VND</p>}
                        </div>
                        <div className="space-y-2">
                           <div className="flex items-center gap-3">
                              <h3 className="text-2xl font-black font-mono tracking-[0.15em] text-foreground uppercase">{coupon.code}</h3>
                              <Button 
                                variant="ghost" size="icon" 
                                className="h-8 w-8 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                onClick={() => copyCode(coupon.code)}
                              >
                                <Copy size={16} />
                              </Button>
                           </div>
                           <div className="flex items-center gap-2">
                              <Badge className={`h-6 text-[9px] font-black uppercase tracking-wider border-none px-3
                                ${isExpired || isFailing ? 'bg-rose-500/15 text-rose-500' : coupon.is_active ? 'bg-emerald-500/15 text-emerald-500' : 'bg-slate-500/15 text-slate-500'}`}>
                                {isExpired ? 'Hết hạn' : isFailing ? 'Đã hết lượt' : coupon.is_active ? 'Bán chạy/Hoạt động' : 'Tạm tắt'}
                              </Badge>
                              {coupon.min_order_value > 0 && (
                                <Badge variant="outline" className="h-6 text-[9px] font-black uppercase border-border/50 text-muted-foreground">Đơn từ ₫{Number(coupon.min_order_value).toLocaleString()}</Badge>
                              )}
                           </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateCoupon.mutate({ id: coupon.id, data: { is_active: !coupon.is_active } })}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border-2
                            ${coupon.is_active 
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20' 
                              : 'bg-muted text-muted-foreground border-border/50 hover:bg-muted/30'}`}
                        >
                          <Power size={20} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Xác nhận thu hồi voucher này vĩnh viễn?')) {
                              deleteCoupon.mutate(coupon.id);
                            }
                          }}
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all border-2 border-transparent hover:border-rose-500/20 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="bg-muted/20 p-6 rounded-[1.75rem] border border-border/40 space-y-4">
                       <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                          <p>Hiệu suất sử dụng</p>
                          <p className={isFailing ? 'text-rose-500' : 'text-primary'}>{coupon.used_count} / {coupon.usage_limit} UNITS</p>
                       </div>
                       <div className="h-3 bg-background border border-border/50 rounded-full overflow-hidden shadow-inner">
                          <motion.div 
                            initial={{ width: 0 }}
                            whileInView={{ width: `${Math.min((coupon.used_count / coupon.usage_limit) * 100, 100)}%` }}
                            transition={{ duration: 1, ease: 'circOut' }}
                            className={`h-full rounded-full shadow-[0_0_15px_rgba(var(--primary),0.3)]
                              ${isFailing ? 'bg-rose-500' : 'bg-primary'}`}
                          />
                       </div>
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <Calendar size={14} className="text-muted-foreground opacity-40" />
                             {expires ? (
                               <p className={`text-xs font-bold ${diffDays && diffDays < 3 && diffDays > 0 ? 'text-amber-500' : 'text-foreground/60'}`}>
                                 {isExpired ? 'Đã hết hạn vào: ' : 'Kết thúc: '} {safeFormat(coupon.expires_at)}
                                 {diffDays && diffDays < 3 && diffDays > 0 && ` (Chỉ còn ${diffDays} ngày)`}
                               </p>
                             ) : (
                               <p className="text-xs font-bold text-muted-foreground italic">Vô thời hạn</p>
                             )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                             View details <ChevronRight size={14} />
                          </div>
                       </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination Container */}
      {couponsData?.total_pages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-4">
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
            <span className="opacity-40">{couponsData.total_pages}</span>
          </div>
          <Button 
            variant="outline" size="sm" 
            disabled={page >= couponsData.total_pages} 
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
