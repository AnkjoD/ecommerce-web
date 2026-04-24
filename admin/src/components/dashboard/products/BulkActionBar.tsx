import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onBulkStatus: (status: string) => void;
  onBulkDelete: () => void;
}

export default function BulkActionBar({
  selectedCount,
  onClear,
  onBulkStatus,
  onBulkDelete
}: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-8 py-5 glass-card rounded-[3rem] border border-primary/30 bg-primary/10 backdrop-blur-3xl shadow-[0_25px_60px_rgba(0,0,0,0.4)] flex items-center gap-10 min-w-[600px]"
        >
           <div className="flex flex-col">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] opacity-60 font-display">Bulk Operations Active</span>
              <span className="text-xl font-black text-foreground">Đã chọn {selectedCount} sản phẩm</span>
           </div>

           <Separator orientation="vertical" className="h-10 w-px bg-primary/20" />

           <div className="flex items-center gap-4">
              <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={() => onBulkStatus('active')}
                 className="h-12 px-6 rounded-2xl bg-white/5 border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest hover:bg-primary hover:text-white transition-all"
              >
                 🟢 Kích hoạt bán
              </Button>
              <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={() => onBulkStatus('draft')}
                 className="h-12 px-6 rounded-2xl bg-white/5 border-orange-500/20 text-orange-500 font-black uppercase text-[10px] tracking-widest hover:bg-orange-500 hover:text-white transition-all"
              >
                 🟡 Chuyển nháp
              </Button>
              <Button 
                 variant="destructive" 
                 size="sm" 
                 onClick={onBulkDelete}
                 className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-destructive/20"
              >
                 <Trash2 size={16} className="mr-2" /> Xóa tất cả
              </Button>
           </div>

           <button 
             onClick={onClear} 
             className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 text-foreground ml-auto transition-all active:scale-95 border border-white/10 shadow-lg"
           >
              <X size={20} />
           </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
