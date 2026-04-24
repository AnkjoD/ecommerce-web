import { LayoutDashboard, Package, FolderTree, Percent, ShoppingCart, Star, Users, History, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Page = 'overview' | 'products' | 'categories' | 'coupons' | 'orders' | 'reviews' | 'users' | 'audit-logs';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onSignOut: () => void;
  userEmail?: string;
}

const navItems: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'products', label: 'Sản phẩm', icon: Package },
  { id: 'categories', label: 'Danh mục', icon: FolderTree },
  { id: 'orders', label: 'Đơn hàng', icon: ShoppingCart },
  { id: 'coupons', label: 'Mã giảm giá', icon: Percent },
  { id: 'reviews', label: 'Đánh giá', icon: Star },
  { id: 'users', label: 'Người dùng', icon: Users },
  { id: 'audit-logs', label: 'Nhật ký', icon: History },
];

export default function Sidebar({ currentPage, onNavigate, onSignOut, userEmail }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="h-screen sticky top-0 flex flex-col bg-sidebar/80 backdrop-blur-xl border-r border-sidebar-border z-50 shadow-2xl"
    >
      <div className="flex items-center justify-between px-6 h-20">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <span className="text-white font-bold text-lg">H</span>
              </div>
              <h1 className="text-xl font-bold font-display gradient-text tracking-tight">
                Homura<span className="text-foreground/80 font-medium">HQ</span>
              </h1>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-xl bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground transition-all duration-300 border border-transparent hover:border-sidebar-border shadow-sm active:scale-95"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
        {navItems.map((item, i) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full group relative flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300
                ${isActive
                  ? 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(var(--primary),0.2)]'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                />
              )}
              
              <div className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-primary' : ''}`}>
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>

              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -5 }}
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              
              {!isActive && !collapsed && (
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={14} className="text-muted-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-sidebar-border bg-black/5">
        <div className={`flex items-center gap-4 ${collapsed ? 'justify-center' : 'px-2'}`}>
           {!collapsed && (
             <div className="flex-1 min-w-0">
               <p className="text-xs font-bold text-foreground truncate">{userEmail?.split('@')[0]}</p>
               <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest font-bold opacity-60">Administrator</p>
             </div>
           )}
           <button
             onClick={onSignOut}
             className="p-2.5 rounded-xl text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
             title="Đăng xuất"
           >
             <LogOut size={20} />
           </button>
        </div>
      </div>
    </motion.aside>
  );
}
