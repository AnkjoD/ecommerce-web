import { useState, useMemo } from 'react';
import { 
  Star, 
  MessageSquare, 
  CheckCircle, 
  Trash2, 
  Send, 
  Search, 
  Filter, 
  TrendingUp, 
  ThumbsUp, 
  ThumbsDown,
  UserCheck,
  Zap,
  Quote,
  MoreVertical,
  Reply,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  useAdminReviews, 
  useVerifyReview, 
  useUpdateReview,
  useDeleteReview 
} from '@/hooks/use-admin-resources';
import { toast } from 'sonner';
import { safeFormat } from '@/utils/date';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function ReviewsPage() {
  const [page, setPage] = useState(1);
  const { data: reviewsData, isLoading } = useAdminReviews(page, 20);
  const verifyReview = useVerifyReview();
  const updateReview = useUpdateReview();
  const deleteReview = useDeleteReview();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRating, setFilterRating] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');

  const reviews = useMemo(() => reviewsData?.data || [], [reviewsData]);

  // 🚀 ANALYTICS & SUMMARY
  const analytics = useMemo(() => {
    if (!reviews.length) return { avg: 0, dist: [0, 0, 0, 0, 0], verified: 0, pending: 0 };
    const total = reviews.length;
    const dist = [0, 0, 0, 0, 0];
    let sum = 0;
    let verified = 0;
    reviews.forEach((r: any) => {
      dist[r.rating - 1]++;
      sum += r.rating;
      if (r.is_verified) verified++;
    });
    return {
      avg: (sum / total).toFixed(1),
      dist: dist.reverse(), // 5 to 1
      verified,
      pending: total - verified
    };
  }, [reviews]);

  const filtered = reviews.filter((r: any) => {
    if (filterStatus === 'verified' && !r.is_verified) return false;
    if (filterStatus === 'pending' && r.is_verified) return false;
    if (filterRating !== 'all' && r.rating !== parseInt(filterRating)) return false;
    if (search && !(r.product?.name?.toLowerCase().includes(search.toLowerCase()) || 
                   r.user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                   r.comment?.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const handleApprove = (id: string) => {
    verifyReview.mutate(id);
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black font-display text-foreground tracking-tighter">Phản hồi Khách hàng</h1>
          <p className="text-muted-foreground mt-1 font-medium flex items-center gap-2 italic">
             Sentiment Analysis & Community Moderation Board
          </p>
        </div>
      </div>

      {/* 🚀 ANALYTICS DASHBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-4 glass-card bg-card border-2 border-border/60 rounded-[3rem] p-10 flex flex-col items-center justify-center text-center relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
             <Star size={160} fill="currentColor" />
          </div>
          <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-4 opacity-40">Chỉ số hài lòng</p>
          <div className="flex items-baseline gap-2">
             <h2 className="text-8xl font-black font-display text-foreground tracking-tighter">{analytics.avg}</h2>
             <Star className="text-amber-500 fill-amber-500 mb-4" size={40} />
          </div>
          <div className="mt-6 flex gap-1">
             {[1, 2, 3, 4, 5].map(n => (
               <Star key={n} size={20} className={n <= Math.round(Number(analytics.avg)) ? 'text-amber-500 fill-amber-500' : 'text-muted/40'} />
             ))}
          </div>
          <p className="mt-4 text-xs font-black text-muted-foreground/60 uppercase tracking-widest">Dựa trên {reviewsData?.total || 0} trải nghiệm thực tế</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-4 glass-card bg-card border-2 border-border/60 rounded-[3rem] p-10"
        >
           <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-8 opacity-40">Phân bổ xếp hạng</p>
           <div className="space-y-4">
              {analytics.dist.map((count, i) => {
                const stars = 5 - i;
                const percent = reviews.length ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={stars} className="flex items-center gap-4 group">
                    <span className="text-[10px] font-black text-muted-foreground w-4">{stars}</span>
                    <div className="flex-1 h-3 bg-muted/30 rounded-full overflow-hidden border border-border/40">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${percent}%` }}
                         transition={{ duration: 1, delay: i * 0.1 }}
                         className={`h-full rounded-full ${stars >= 4 ? 'bg-emerald-500' : stars === 3 ? 'bg-amber-500' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]'}`}
                       />
                    </div>
                    <span className="text-[10px] font-black text-foreground w-8 text-right opacity-40 group-hover:opacity-100 transition-opacity">{count}</span>
                  </div>
                )
              })}
           </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-4 flex flex-col gap-6"
        >
           <div className="flex-1 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-[2.5rem] p-8 flex items-center justify-between group">
              <div>
                 <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Đã xác minh</p>
                 <h4 className="text-4xl font-black text-emerald-600 font-display">{analytics.verified}</h4>
              </div>
              <ShieldCheck size={48} className="text-emerald-500 opacity-20 group-hover:rotate-12 transition-transform" />
           </div>
           <div className="flex-1 bg-amber-500/10 border-2 border-amber-500/20 rounded-[2.5rem] p-8 flex items-center justify-between group">
              <div>
                 <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Chờ kiểm duyệt</p>
                 <h4 className="text-4xl font-black text-amber-600 font-display">{analytics.pending}</h4>
              </div>
              <AlertCircle size={48} className="text-amber-500 opacity-20 group-hover:animate-pulse transition-transform" />
           </div>
        </motion.div>
      </div>

      {/* 🚀 ELITE FILTERS */}
      <div className="flex flex-col sm:flex-row gap-6 bg-card border-border border p-4 rounded-[2rem]">
        <div className="relative flex-1 group">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
          <Input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Truy vấn từ khóa, tên sản phẩm, người dùng..." 
            className="pl-12 h-14 bg-background border-border rounded-2xl font-bold transition-all focus:ring-4 focus:ring-primary/5" 
          />
        </div>
        <div className="flex gap-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48 h-14 bg-background border-border rounded-2xl font-black text-[10px] uppercase tracking-widest">
              <div className="flex items-center gap-3">
                <Filter size={16} className="text-primary" />
                <SelectValue placeholder="Trạng thái" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">TẤT CẢ PHẢN HỒI</SelectItem>
              <SelectItem value="verified">ĐÃ DUYỆT / CÔNG KHAI</SelectItem>
              <SelectItem value="pending">CHƯA DUYỆT / RIÊNG TƯ</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterRating} onValueChange={setFilterRating}>
            <SelectTrigger className="w-36 h-14 bg-background border-border rounded-2xl font-black text-[10px] uppercase tracking-widest">
               <SelectValue placeholder="Xếp hạng" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">TẤT CẢ SAO</SelectItem>
              {[5, 4, 3, 2, 1].map(n => (
                <SelectItem key={n} value={String(n)}>
                   <span className="flex items-center gap-2 font-black tracking-widest">{n} SAO</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 text-muted-foreground gap-6">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-black uppercase tracking-[0.2em] text-[10px] opacity-40">Đang thực thi truy vấn đánh giá...</p>
        </div>
      ) : (
        <div className="grid gap-8">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <div className="text-center py-40 glass-card rounded-[3rem] border-dashed border-4 border-border/40 group">
                <MessageSquare size={80} className="mx-auto text-muted-foreground/10 mb-6 group-hover:scale-110 transition-transform duration-500" />
                <p className="text-muted-foreground font-black uppercase tracking-widest text-xs opacity-40">Hệ thống chưa ghi nhận đánh giá nào phù hợp</p>
                <Button variant="link" onClick={() => { setSearch(''); setFilterStatus('all'); setFilterRating('all'); }} className="mt-4 text-primary font-black uppercase tracking-widest text-[10px]">Xóa toàn bộ bộ lọc</Button>
              </div>
            ) : filtered.map((review: any, i: number) => {
              const borderColors = review.rating >= 4 ? 'hover:border-emerald-500/30' : review.rating === 3 ? 'hover:border-amber-500/30' : 'hover:border-rose-500/30';
              const ringColor = review.rating >= 4 ? 'group-hover:ring-emerald-500/5' : review.rating === 3 ? 'group-hover:ring-amber-500/5' : 'group-hover:ring-rose-500/5';
              
              return (
                <motion.div
                  key={review.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  className={`glass-card rounded-[3rem] p-10 border border-border/60 transition-all duration-500 group relative overflow-hidden ${borderColors} ${ringColor} hover:ring-[20px]`}
                >
                  <div className="flex flex-col xl:flex-row gap-10 relative z-10">
                    <div className="flex-1 space-y-8">
                      <div className="flex flex-wrap items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                          <div className="flex gap-1.5 bg-muted/20 p-2.5 rounded-2xl border border-border/40">
                            {[1, 2, 3, 4, 5].map(n => (
                              <Star 
                                key={n} 
                                size={18} 
                                className={n <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-muted/20'} 
                              />
                            ))}
                          </div>
                          <div className="h-6 w-px bg-border/40" />
                          <Badge className={`h-8 font-black text-[9px] uppercase tracking-widest px-4 rounded-xl border-none shadow-sm
                            ${review.is_verified ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/20 text-amber-600'}`}>
                            {review.is_verified ? 'Đã duyệt công khai' : 'Đang chờ xử lý'}
                          </Badge>
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] opacity-40">
                             Thời gian: {safeFormat(review.created_at, 'HH:mm — dd/MM/yyyy')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-8">
                         <div className="relative group/avatar shrink-0">
                            <div className="w-20 h-20 rounded-[2rem] bg-muted/40 flex items-center justify-center font-display text-3xl font-black text-primary border-4 border-background shadow-xl ring-1 ring-border">
                               {review.user?.full_name?.charAt(0) || 'U'}
                            </div>
                            {review.is_verified && <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 border-4 border-background flex items-center justify-center text-white shadow-lg"><UserCheck size={14} /></div>}
                         </div>
                         
                         <div className="space-y-4 flex-1">
                            <div>
                               <p className="text-xl font-black text-foreground tracking-tight">{review.user?.full_name}</p>
                               <div className="flex items-center gap-2 mt-1.5 group/prod cursor-pointer">
                                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-60">Thẩm định cho:</p>
                                  <span className="text-xs font-black text-primary hover:underline">{review.product?.name || 'Sản phẩm không xác định'}</span>
                               </div>
                            </div>
                            
                            <div className="relative pt-2">
                               <Quote className="absolute -top-4 -left-6 text-primary/10" size={60} />
                               <div className="bg-muted/10 p-8 rounded-[2.5rem] border border-dashed border-border/60 relative z-10 group-hover:bg-primary/[0.01] transition-all duration-700">
                                  <p className="text-lg font-bold text-foreground/80 leading-relaxed italic">
                                     {review.comment ? `"${review.comment}"` : "Hệ thống: Khách hàng chỉ đánh giá bằng sao, không để lại nội dung chi tiết."}
                                  </p>
                               </div>
                            </div>
                         </div>
                      </div>

                      <AnimatePresence>
                        {review.admin_reply && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="ml-28 p-8 rounded-[2.5rem] bg-primary/[0.03] border-2 border-primary/10 relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                               <Zap size={100} strokeWidth={1} className="text-primary" />
                            </div>
                            <div className="flex items-center gap-4 mb-4">
                               <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                                  <Reply size={18} className="scale-x-[-1]" />
                               </div>
                               <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Hệ thống HQ Phản hồi</p>
                               <div className="h-px bg-primary/10 flex-1" />
                            </div>
                            <p className="text-base font-black text-foreground/70 leading-relaxed">{review.admin_reply}</p>
                            <p className="text-[9px] font-black text-muted-foreground/40 mt-6 uppercase tracking-widest pl-1 border-l-2 border-primary/20">
                               Phát hành lúc: {safeFormat(review.admin_reply_at, 'HH:mm — dd/MM/yyyy')}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="w-full xl:w-56 flex xl:flex-col gap-4 items-center justify-center border-t xl:border-t-0 xl:border-l border-border/40 pt-10 xl:pt-0 xl:pl-10">
                      {!review.is_verified && (
                        <Button 
                          onClick={() => handleApprove(review.id)} 
                          className="w-full h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-emerald-500/20 gap-3 active:scale-95 transition-all"
                          disabled={verifyReview.isPending}
                        >
                          <CheckCircle size={18} /> Duyệt ngay
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        onClick={() => setReplyingTo(review)}
                        className="w-full h-16 rounded-2xl border-primary/20 text-primary hover:bg-primary/5 font-black uppercase tracking-[0.22em] text-[10px] gap-3 transition-all"
                      >
                        <MessageSquare size={18} /> Phản hồi
                      </Button>
                      <button
                        onClick={() => {
                          if (confirm('Phân tích Rủi ro: Bạn xác nhận xóa bỏ phản hồi này vĩnh viễn?')) {
                            deleteReview.mutate(review.id);
                          }
                        }}
                        className="w-full h-12 flex items-center justify-center gap-3 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all font-black uppercase tracking-widest text-[9px] opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} /> Tiêu hủy
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination Container */}
      {reviewsData?.total_pages > 1 && (
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
            <span className="opacity-40">{reviewsData.total_pages}</span>
          </div>
          <Button 
            variant="outline" size="sm" 
            disabled={page >= reviewsData.total_pages} 
            onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="rounded-2xl px-6 h-12 border-border font-black text-[10px] uppercase tracking-widest bg-card"
          >
            Trang Kế
          </Button>
        </div>
      )}

      {/* Reply Dialog */}
      <Dialog open={!!replyingTo} onOpenChange={(open) => !open && setReplyingTo(null)}>
        <DialogContent className="bg-card border-border max-w-2xl p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
              <MessageSquare size={200} strokeWidth={1} />
           </div>
           
           <DialogHeader>
            <DialogTitle className="font-display text-3xl font-black tracking-tight">Cấu hình Phản hồi HQ</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-8 mt-8 relative z-10">
            <div className="p-8 rounded-[2.5rem] bg-muted/20 border border-dashed border-border italic flex items-start gap-4">
              <Quote className="text-primary opacity-30 shrink-0" size={24} />
              <p className="text-foreground/80 font-bold leading-relaxed whitespace-pre-wrap flex-1">
                 {replyingTo?.comment || "Hệ thống: Khách hàng không để lại bình luận chi tiết."}
              </p>
            </div>
            
            <div className="space-y-3 px-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-2">Thông điệp phản hồi từ Admin</Label>
              <Textarea 
                value={replyText} 
                onChange={e => setReplyText(e.target.value)} 
                placeholder="Nhập câu trả lời chuyên nghiệp của bạn..." 
                className="bg-card border-border rounded-[2rem] h-48 focus:ring-4 focus:ring-primary/5 text-lg font-bold p-8 resize-none"
              />
            </div>
            
            <div className="pt-2">
               <Button 
                onClick={() => {
                  if (!replyText.trim()) return;
                  updateReview.mutate({ 
                    id: replyingTo.id, 
                    data: { admin_reply: replyText, is_verified: true, admin_reply_at: new Date().toISOString() } 
                  }, {
                    onSuccess: () => {
                      setReplyingTo(null);
                      setReplyText('');
                    }
                  });
                }}
                className="w-full h-16 font-black uppercase tracking-[0.2em] text-[11px] bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-2xl shadow-primary/30 transition-all active:scale-95" 
                disabled={updateReview.isPending}
              >
                {updateReview.isPending ? 'Đang thực thi lệnh phát hành...' : 'Công khai Phản hồi & Duyệt bài'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
