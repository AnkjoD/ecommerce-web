import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { safeFormat } from '@/utils/date';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Download, TrendingUp, TrendingDown, Target, Zap, Award, ShoppingBag, ArrowUpRight } from 'lucide-react';

const COLORS = [
  'hsl(var(--primary))', 
  'hsl(261, 80%, 70%)', 
  'hsl(150, 60%, 45%)', 
  'hsl(38, 90%, 55%)', 
  'hsl(0, 100%, 66%)'
];

export default function AnalyticsSection({ stats }: { stats: any }) {
  const revenueHistory = useMemo(() => stats?.history || [], [stats?.history]);
  const topProducts = useMemo(() => stats?.top_products || [], [stats?.top_products]);
  
  const statusDist = useMemo(() => {
    const labels: Record<string, string> = { 
      pending: 'Chờ xử lý', 
      confirmed: 'Xác nhận', 
      processing: 'Xử lý', 
      shipping: 'Giao hàng', 
      delivered: 'Đã giao', 
      cancelled: 'Đã hủy', 
      payment_failed: 'TT lỗi' 
    };
    return (stats?.status_distribution || []).map((s: any) => ({ 
      name: labels[s.status] || s.status, 
      value: s.count 
    }));
  }, [stats?.status_distribution]);

  const totalRevenue = stats?.total_revenue || 0;
  
  // 🚀 MOCK GROWTH TRENDS (Calculating from history if possible)
  const growth = useMemo(() => {
    if (revenueHistory.length < 2) return { value: 0, isPos: true };
    const latest = revenueHistory[revenueHistory.length - 1]?.revenue || 0;
    const previous = revenueHistory[revenueHistory.length - 2]?.revenue || 0;
    if (previous === 0) return { value: 100, isPos: true };
    const diff = ((latest - previous) / previous) * 100;
    return { value: Math.abs(diff).toFixed(1), isPos: diff >= 0 };
  }, [revenueHistory]);

  const exportCSV = useCallback(() => {
    const rows = [['Ngày', 'Doanh thu', 'Số đơn']];
    revenueHistory.forEach((d: any) => rows.push([d.label, String(d.revenue), String(d.count)]));
    rows.push([]);
    rows.push(['Sản phẩm bán chạy', 'Số lượng', 'Doanh thu']);
    topProducts.forEach((p: any) => rows.push([p.name, String(p.sold), String(p.revenue)]));
    rows.push([]);
    rows.push(['Trạng thái đơn', 'Số lượng']);
    statusDist.forEach(s => rows.push([s.name, String(s.value)]));

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-chien-luoc-${safeFormat(new Date(), 'dd-MM-yyyy')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [revenueHistory, topProducts, statusDist]);

  return (
    <div className="space-y-10 pb-10">
      {/* 🚀 ELITE REVENUE DASHBOARD */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "circOut" }}
        className="glass-card rounded-[3rem] p-10 border border-border bg-card relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none rotate-12">
          <Target size={300} strokeWidth={0.5} />
        </div>

        <div className="relative z-10">
          {/* Layer 1: Brand & Control */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-10 border-b border-border/40">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                <h2 className="text-3xl md:text-4xl font-black font-display text-foreground tracking-tighter uppercase leading-[0.8] mb-1">
                  Phân Tích Doanh Thu <span className="text-primary italic">Hệ Thống</span>
                </h2>
              </div>
              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 shadow-inner backdrop-blur-md">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest whitespace-nowrap">Live Intelligence</span>
                 </div>
                 <p className="text-xs text-muted-foreground font-medium opacity-40 max-w-sm hidden lg:block">Kiến trúc hóa dòng tiền qua lăng kính thời gian thực.</p>
              </div>
            </div>
            
            <Button onClick={exportCSV} className="h-14 px-10 rounded-2xl bg-foreground text-background hover:bg-foreground/90 transition-all font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 group border-none shrink-0 self-start md:self-end">
              <Download size={18} className="mr-3 group-hover:translate-y-1 transition-transform" /> Triết xuất báo cáo
            </Button>
          </div>
          
          {/* Layer 2: Core Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
             <div className="glass-card bg-muted/5 p-6 rounded-3xl border border-border/40 flex flex-col justify-between group hover:border-primary/30 transition-all duration-500 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 group-hover:scale-110 transition-transform">
                   <ShoppingBag size={80} />
                </div>
                <div className="space-y-1 relative z-10">
                   <p className="text-[9px] uppercase tracking-[0.3em] font-black text-muted-foreground mb-4 opacity-30">Vốn hóa tích lũy</p>
                   <div className="flex items-center gap-4">
                      <h3 className="text-4xl lg:text-5xl font-black text-foreground font-display tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground to-primary/50">
                        ₫{totalRevenue.toLocaleString()}
                      </h3>
                      <div className={cn(
                        "flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border shadow-sm",
                        growth.isPos ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                      )}>
                         {growth.isPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                         {growth.value}%
                      </div>
                   </div>
                </div>
                <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-muted-foreground opacity-40 uppercase tracking-widest">
                   <ArrowUpRight size={14} className="text-primary" /> Tổng kết dòng tiền thực tế
                </div>
             </div>

             <div className="glass-card bg-muted/5 p-6 rounded-3xl border border-border/40 flex flex-col justify-between group hover:border-primary/30 transition-all duration-500 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] -rotate-12 group-hover:scale-110 transition-transform">
                   <Target size={80} />
                </div>
                <div className="space-y-1 relative z-10">
                   <p className="text-[9px] uppercase tracking-[0.3em] font-black text-muted-foreground mb-4 opacity-30">Hiệu suất trung bình</p>
                   <h3 className="text-4xl lg:text-5xl font-black text-foreground font-display tracking-tighter leading-none">
                      {revenueHistory.length > 0 ? (totalRevenue / revenueHistory.length).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
                      <span className="text-sm ml-2 font-black text-muted-foreground opacity-30">/ NGÀY</span>
                   </h3>
                </div>
                <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-muted-foreground opacity-40 uppercase tracking-widest">
                   <Zap size={14} className="text-primary" /> Xung lực giao dịch hiện thời
                </div>
             </div>

             <div className="glass-card bg-muted/5 p-6 rounded-3xl border border-border/40 flex flex-col justify-between group hover:border-primary/30 transition-all duration-500 shadow-xl overflow-hidden relative lg:col-span-1">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-45 group-hover:scale-110 transition-transform">
                   <Award size={80} />
                </div>
                <div className="space-y-1 relative z-10">
                   <p className="text-[9px] uppercase tracking-[0.3em] font-black text-muted-foreground mb-4 opacity-30">Phân khúc cao cấp</p>
                   <h3 className="text-4xl lg:text-5xl font-black text-primary font-display tracking-tighter leading-none italic">
                      98<span className="text-xl ml-1">%</span>
                   </h3>
                </div>
                <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-muted-foreground opacity-40 uppercase tracking-widest">
                   <Award size={14} className="text-primary" /> Chỉ số hài lòng khách hàng
                </div>
             </div>
          </div>
          
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueHistory} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="5 5" stroke="hsla(var(--primary), 0.05)" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 900 }} 
                  dy={20}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 900 }} 
                  tickFormatter={v => `₫${(v / 1000).toFixed(0)}k`} 
                  dx={-10}
                />
                <Tooltip
                  cursor={{ stroke: 'hsla(var(--primary), 0.2)', strokeWidth: 2 }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-card/95 backdrop-blur-2xl border border-primary/20 p-5 rounded-[1.5rem] shadow-2xl animate-in zoom-in-95">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 pb-2 border-b border-border/50">{label}</p>
                          <div className="space-y-1">
                             <p className="text-xl font-black text-primary">₫{payload[0].value?.toLocaleString()}</p>
                             <p className="text-[9px] font-bold text-muted-foreground uppercase">Doanh thu kết chuyển</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={5} 
                  fillOpacity={1} 
                  fill="url(#revenueGradient)" 
                  activeDot={{ r: 8, fill: 'hsl(var(--primary))', strokeWidth: 4, stroke: 'hsl(var(--background))' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* 🚀 ELITE LOW STOCK ALERTS */}
      <AnimatePresence>
        {stats?.low_stock?.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-3xl p-6 border-2 border-warning/30 bg-warning/5 shadow-lg flex flex-col md:flex-row items-center gap-6"
          >
            <div className="w-14 h-14 rounded-2xl bg-warning flex items-center justify-center text-white shrink-0 shadow-xl animate-pulse">
               <Zap size={28} />
            </div>
            <div className="flex-1">
               <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Cảnh báo: Tồn kho sắp hết!</h3>
               <p className="text-sm text-muted-foreground font-medium italic">Hệ thống phát hiện {stats.low_stock.length} phiên bản sản phẩm có số lượng tồn kho dưới ngưỡng an toàn.</p>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 md:pb-0 no-scrollbar">
               {stats.low_stock.slice(0, 3).map((item: any) => (
                 <div key={item.id} className="flex-shrink-0 bg-card border border-border/50 px-4 py-2.5 rounded-xl flex items-center gap-4 hover:border-warning/50 transition-colors group">
                    <div>
                       <p className="text-[11px] font-black text-foreground truncate max-w-[120px]">{item.name}</p>
                       <p className="text-[9px] font-bold text-rose-500 uppercase">Còn lại: {item.stock} cái</p>
                    </div>
                    <ArrowUpRight size={14} className="text-muted-foreground group-hover:text-warning transition-colors" />
                 </div>
               ))}
               {stats.low_stock.length > 3 && (
                 <div className="px-4 text-[10px] font-black text-muted-foreground uppercase">+ {stats.low_stock.length - 3} nữa</div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* 🚀 BEST SELLERS LEADERBOARD */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-7 glass-card rounded-[2.5rem] p-10 border border-border shadow-2xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-8">
             <h2 className="text-xl font-black font-display text-foreground uppercase tracking-widest flex items-center gap-4">
               <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
               Xếp hạng sản phẩm
             </h2>
             <Award className="text-primary opacity-20" size={32} />
          </div>

          {topProducts.length === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-4 opacity-40">
               <ShoppingBag size={48} strokeWidth={1} />
               <p className="text-xs font-black uppercase tracking-widest">Hệ thống chưa ghi nhận giao dịch</p>
            </div>
          ) : (
            <div className="space-y-6">
               {topProducts.slice(0, 5).map((product: any, idx: number) => (
                 <div key={idx} className="flex items-center gap-6 group">
                    <div className="w-12 h-12 rounded-2xl bg-muted/20 flex items-center justify-center text-xs font-black text-primary border border-border/50 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                       {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-black text-foreground truncate max-w-[200px]">{product.name}</p>
                          <p className="text-xs font-black text-primary">₫{product.revenue?.toLocaleString() || '0'}</p>
                       </div>
                       <div className="h-2 w-full bg-muted/20 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            whileInView={{ width: `${(product.sold / topProducts[0].sold) * 100}%` }}
                            transition={{ duration: 1, delay: idx * 0.1 }}
                            className="h-full bg-primary rounded-full shadow-[0_0_10px_hsla(var(--primary),0.3)]"
                          />
                       </div>
                       <div className="flex items-center justify-between mt-2">
                          <p className="text-[9px] font-black text-muted-foreground uppercase opacity-40">Số lượng đã xuất kho</p>
                          <p className="text-[10px] font-black text-foreground flex items-center gap-1">
                             {product.sold} <ArrowUpRight size={12} className="text-green-500" />
                          </p>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </motion.div>

        {/* 🚀 STATUS DISTRIBUTION PIE */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-5 glass-card rounded-[2.5rem] p-10 border border-border shadow-2xl relative"
        >
          <div className="flex items-center gap-4 mb-10">
             <div className="w-1.5 h-6 bg-primary rounded-full" />
             <h2 className="text-xl font-black font-display text-foreground uppercase tracking-widest">Operational Ratio</h2>
          </div>

          <div className="h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={statusDist} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={75}
                  outerRadius={110} 
                  dataKey="value" 
                  paddingAngle={8}
                  stroke="none"
                >
                  {statusDist.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-card border border-border p-3 rounded-2xl shadow-xl">
                          <p className="text-[10px] font-black uppercase text-primary mb-1">{payload[0].name}</p>
                          <p className="text-lg font-black">{payload[0].value} <span className="text-[10px] text-muted-foreground opacity-40 uppercase">Orders</span></p>
                        </div>
                      );
                    }
                    return null;
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-2">
               <Zap className="text-primary mb-1 opacity-20" size={24} />
               <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Status Flow</p>
               <h4 className="text-2xl font-black text-foreground">{statusDist.reduce((a, b) => a + b.value, 0)}</h4>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-8">
             {statusDist.slice(0, 4).map((s, i) => (
               <div key={i} className="flex items-center gap-2.5 bg-muted/10 p-2.5 rounded-xl border border-border/40">
                  <div className="w-2 h-4 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[10px] font-black text-foreground uppercase tracking-wider">{s.name}</span>
                  <span className="ml-auto text-[10px] font-black text-primary opacity-60">{( (s.value / statusDist.reduce((a, b) => a + b.value, 0)) * 100 ).toFixed(0)}%</span>
               </div>
             ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
