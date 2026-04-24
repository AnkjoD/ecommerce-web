import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Users as UsersIcon, 
  Search, 
  ShieldCheck, 
  ShoppingCart, 
  UserPlus, 
  UserX, 
  Mail, 
  Phone, 
  Calendar,
  ChevronRight
} from 'lucide-react';
import { useAdminUsers, useToggleUserActive, useAdminOrders } from '@/hooks/use-admin-resources';
import { useDebounce } from '@/hooks/use-debounce';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { safeFormat } from '@/utils/date';

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: usersData, isLoading } = useAdminUsers(page, 20, debouncedSearch);
  const toggleActive = useToggleUserActive();
  const { data: userOrdersData } = useAdminOrders({ userId: selectedUserId || undefined, limit: 10 });

  const users = usersData?.data || [];
  const selectedUser = users.find((u: any) => u.id === selectedUserId);
  const userOrders = userOrdersData?.data || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display gradient-text">Quản lý người dùng</h1>
          <p className="text-muted-foreground mt-1">
            {usersData?.total || 0} người dùng trong hệ thống
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Tìm theo tên, email hoặc số điện thoại..." 
          className="pl-10 bg-muted/40 border-border h-11" 
        />
      </div>

      <div className="glass-card rounded-2xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="font-bold uppercase text-[11px] tracking-wider text-muted-foreground pl-6">Người dùng</TableHead>
              <TableHead className="font-bold uppercase text-[11px] tracking-wider text-muted-foreground">Liên hệ</TableHead>
              <TableHead className="font-bold uppercase text-[11px] tracking-wider text-muted-foreground">Vai trò</TableHead>
              <TableHead className="font-bold uppercase text-[11px] tracking-wider text-muted-foreground">Ngày tham gia</TableHead>
              <TableHead className="font-bold uppercase text-[11px] tracking-wider text-muted-foreground text-right pr-6">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />Đang tải dữ liệu...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground">Không tìm thấy người dùng nào</TableCell></TableRow>
            ) : users.map((user: any, i: number) => (
              <motion.tr
                key={user.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="border-border hover:bg-muted/20 transition-colors group"
              >
                <TableCell className="pl-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg border shadow-inner ${user.is_active ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border'}`}>
                      {user.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-bold text-foreground leading-tight">{user.full_name}</p>
                      <Badge variant="outline" className={`h-5 text-[9px] uppercase font-bold border-none mt-1 ${user.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                        {user.is_active ? 'Hoạt động' : 'Đã khóa'}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-foreground/80">
                      <Mail size={12} className="text-primary" /> {user.email}
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone size={12} /> {user.phone}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Badge className={`uppercase text-[10px] font-bold border-none ${user.role === 'ADMIN' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {user.role === 'ADMIN' && <ShieldCheck size={10} className="mr-1" />}
                      {user.role}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} />
                    {safeFormat(user.created_at)}
                  </div>
                </TableCell>
                <TableCell className="text-right pr-6">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 gap-2 border-primary/20 text-primary hover:bg-primary/5 px-3"
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <ShoppingCart size={14} /> Lịch sử
                    </Button>
                    <button
                      onClick={() => toggleActive.mutate(user.id)}
                      className={`p-2 rounded-lg transition-all border ${
                        user.is_active 
                          ? 'text-muted-foreground border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20' 
                          : 'bg-success/10 text-success border-success/20 hover:bg-success/20'
                      }`}
                      title={user.is_active ? 'Khóa tài khoản' : 'Mở khóa'}
                    >
                      {user.is_active ? <UserX size={16} /> : <UserPlus size={16} />}
                    </button>
                  </div>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {usersData?.total_pages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
          >
            Trước
          </Button>
          <span className="text-sm font-medium px-4 py-2 bg-muted/50 rounded-lg border border-border">
            Trang {page} / {usersData.total_pages}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page >= usersData.total_pages} 
            onClick={() => setPage(p => p + 1)}
          >
            Sau
          </Button>
        </div>
      )}

      {/* Order History Dialog */}
      <Dialog open={!!selectedUserId} onOpenChange={() => setSelectedUserId(null)}>
        <DialogContent className="glass-card border-border max-w-3xl shadow-2xl p-0 overflow-hidden">
          <div className="p-6 bg-muted/30 border-b border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <ShoppingCart size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-display text-foreground leading-tight">Lịch sử đơn hàng</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Khách hàng: <span className="font-bold text-foreground">{selectedUser?.full_name}</span></p>
                </div>
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-6 max-h-[60vh] overflow-auto">
            {!userOrders.length ? (
              <div className="text-center py-16 space-y-3">
                <ShoppingCart size={48} className="mx-auto text-muted-foreground/20" />
                <p className="text-muted-foreground font-medium">Chưa có giao dịch nào được ghi nhận</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20 hover:border-primary/30 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center font-mono text-[10px] font-bold text-muted-foreground group-hover:text-primary transition-colors">
                        ORD
                      </div>
                      <div>
                        <p className="text-xs font-mono font-bold text-foreground">{order.order_code}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{safeFormat(order.created_at, 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">₫{Number(order.total).toLocaleString()}</p>
                        <Badge variant="outline" className="h-5 text-[10px] lowercase font-medium border-none bg-primary/10 text-primary">
                          {order.status}
                        </Badge>
                      </div>
                      <ChevronRight size={18} className="text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-4 bg-muted/30 border-t border-border flex justify-end">
             <Button variant="ghost" onClick={() => setSelectedUserId(null)}>Đóng cửa sổ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
