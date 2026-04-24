import { motion, AnimatePresence } from 'framer-motion';
import { Package, FolderTree, Percent, ShoppingCart, Star, TrendingUp, Users } from 'lucide-react';
import StatCard from './StatCard';
import AnalyticsSection from './AnalyticsSection';
import { useAdminStats, useAdminProducts, useAdminCategories } from '@/hooks/use-admin-resources';

export default function OverviewPage() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: productsData, isLoading: productsLoading } = useAdminProducts(1, 5);
  const { data: categories = [] } = useAdminCategories();

  if (statsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">Đang nạp dữ liệu hệ thống...</p>
      </div>
    );
  }

  // Safety fallbacks for stats
  const safeStats = {
    total_revenue: stats?.total_revenue || 0,
    total_orders: stats?.total_orders || 0,
    total_users: stats?.total_users || 0,
    total_products: stats?.total_products || 0,
    today: {
      revenue: stats?.today?.revenue || 0,
      orders: stats?.today?.orders || 0
    },
    yesterday: {
      revenue: stats?.yesterday?.revenue || 0,
      orders: stats?.yesterday?.orders || 0
    }
  };

  const products = productsData?.data || [];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-6 border-b border-border/50">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-2"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-2 border border-primary/20 shadow-sm shadow-primary/5">
            <TrendingUp size={12} className="animate-pulse" /> Live Pulse Dashboard
          </div>
          <h1 className="text-5xl font-black font-display text-foreground tracking-tighter leading-none">
            Tổng quan <span className="text-primary italic">hệ thống</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium tracking-tight opacity-70">Theo dõi nhịp đập kinh doanh của bạn dưới lăng kính phân tích thời gian thực.</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-4 bg-card/40 backdrop-blur-xl border border-border/60 p-3 pr-6 rounded-[2rem] shadow-2xl"
        >
          <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center text-success border border-success/20">
             <div className="w-3 h-3 rounded-full bg-success animate-ping" />
          </div>
          <div className="flex flex-col">
             <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest leading-none mb-1">Status Report</span>
             <span className="text-sm font-black text-foreground">Máy chủ: Hoạt động ưu tiên</span>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <StatCard 
          title="Tổng doanh thu" 
          value={`₫${safeStats.total_revenue.toLocaleString()}`} 
          icon={TrendingUp} 
          trend={`${safeStats.today.revenue.toLocaleString()} VNĐ hôm nay`} 
          trendUp={safeStats.today.revenue >= safeStats.yesterday.revenue} 
        />
        <StatCard 
          title="Tổng đơn hàng" 
          value={safeStats.total_orders} 
          icon={ShoppingCart} 
          trend={`${safeStats.today.orders} đơn mới trong ngày`} 
          trendUp={safeStats.today.orders >= safeStats.yesterday.orders} 
        />
        <StatCard 
          title="Người dùng" 
          value={safeStats.total_users} 
          icon={Users} 
          trend="Số lượng khách hàng tiềm năng" 
          trendUp 
        />
        <StatCard 
          title="Sản phẩm" 
          value={safeStats.total_products} 
          icon={Package} 
          trend="Mặt hàng đang kinh doanh" 
          trendUp 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
           <AnalyticsSection stats={stats} />
        </div>
        
        <div className="lg:col-span-4 space-y-6">
          {/* 🚀 CUSTOMER LEADERBOARD */}
          <div className="glass-card rounded-3xl border border-border/50 overflow-hidden shadow-xl flex flex-col">
            <div className="p-6 bg-primary/5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
                   Bảng vàng khách hàng
                   <Star size={14} className="text-yellow-500 fill-yellow-500" />
                </h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Chi tiêu tích lũy</p>
              </div>
              <Users size={18} className="text-primary opacity-40" />
            </div>
            
            <div className="p-4 space-y-4">
              {stats?.top_customers?.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs italic">Chưa có dữ liệu giao dịch</div>
              ) : (
                stats?.top_customers?.map((customer: any, idx: number) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/30 transition-all border border-transparent hover:border-border/50 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden font-black text-xs">
                          {customer.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black border-2 border-background shadow-sm ${
                          idx === 0 ? 'bg-yellow-500 text-white' : idx === 1 ? 'bg-slate-300 text-slate-700' : 'bg-orange-400 text-white'
                        }`}>
                          {idx + 1}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-bold truncate max-w-[120px]">{customer.full_name || 'Người dùng ẩn danh'}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{customer.email}</p>
                      </div>
                    </div>
                    <p className="text-xs font-black text-primary group-hover:scale-110 transition-transform">
                      ₫{Number(customer.total_spent).toLocaleString()}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          <div className="glass-card rounded-3xl border border-border/50 overflow-hidden shadow-xl flex flex-col">

            <div className="p-6 bg-muted/30 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-display text-foreground">Sản phẩm mới</h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Cập nhật gần đây</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Package size={18} />
              </div>
            </div>
            
            <div className="divide-y divide-border/50">
              {productsLoading ? (
                <div className="p-12 text-center text-muted-foreground italic">Đang tải danh sách...</div>
              ) : products.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">Hệ thống chưa có sản phẩm nào.</div>
              ) : (
                products.map((product: any, idx: number) => {
                  const variant = product.variants?.[0];
                  let icon = '📦';
                  try {
                    const media = typeof product.media === 'string' ? JSON.parse(product.media) : product.media;
                    if (media?.icon) icon = media.icon;
                  } catch (e) {}

                  return (
                    <motion.div 
                      key={product.id} 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center justify-between p-4 hover:bg-muted/40 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">
                          {icon}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{product.name}</p>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5">
                            {product.category?.name || 'Phổ thông'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-foreground">
                          {variant ? `₫${Number(variant.price).toLocaleString()}` : '—'}
                        </p>
                        <div className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md mt-1 inline-block border ${
                          product.status === 'active' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'
                        }`}>
                          {product.status === 'active' ? 'Active' : 'Draft'}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
