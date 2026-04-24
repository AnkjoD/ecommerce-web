import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

export default function StatCard({ title, value, icon: Icon, trend, trendUp }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="relative overflow-hidden group glass-card rounded-[2rem] p-7 border border-border/50 hover:border-primary/40 transition-all duration-500 shadow-xl bg-card/60 backdrop-blur-xl"
    >
      {/* 🚀 ELITE BACKGROUND GRADIENT */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      {/* Background Watermark Icon */}
      <div className="absolute -right-6 -bottom-6 text-primary/[0.03] group-hover:text-primary/[0.08] transition-all duration-700 transform group-hover:scale-125 group-hover:-rotate-12 pointer-events-none">
        <Icon size={140} strokeWidth={1.5} />
      </div>
      
      <div className="relative z-10 flex flex-col h-full space-y-6">
        <div className="flex items-center justify-between">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-inner group-hover:bg-primary group-hover:text-white group-hover:rotate-12 transition-all duration-500">
            <Icon size={28} />
          </div>
          
          {trend && (
            <div className={cn(
              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-500 group-hover:translate-x-[-4px]",
              trendUp 
                ? "bg-green-500/10 text-green-500 border-green-500/20" 
                : "bg-rose-500/10 text-rose-500 border-rose-500/20"
            )}>
              {trendUp ? "↑" : "↓"} {trend}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-black text-muted-foreground/60 tracking-[0.2em] uppercase leading-none">{title}</p>
          <h3 className="text-3xl font-black font-display text-foreground tracking-tighter leading-tight truncate">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </h3>
        </div>
      </div>
    </motion.div>
  );
}
