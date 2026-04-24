import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Info, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type ConfirmType = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmPortalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  cancelText?: string;
  confirmText?: string;
  type?: ConfirmType;
  onConfirm: () => void;
  isPending?: boolean;
}

const typeConfigs = {
  danger: {
    icon: Trash2,
    iconClass: 'text-destructive bg-destructive/10',
    buttonClass: 'bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20',
    borderClass: 'border-destructive/20'
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-orange-500 bg-orange-500/10',
    buttonClass: 'bg-orange-500 hover:bg-orange-500/90 shadow-lg shadow-orange-500/20',
    borderClass: 'border-orange-500/20'
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-500 bg-blue-500/10',
    buttonClass: 'bg-blue-500 hover:bg-blue-500/90 shadow-lg shadow-blue-500/20',
    borderClass: 'border-blue-500/20'
  },
  success: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-500 bg-emerald-500/10',
    buttonClass: 'bg-emerald-500 hover:bg-emerald-500/90 shadow-lg shadow-emerald-500/20',
    borderClass: 'border-emerald-500/20'
  }
};

export function ConfirmPortal({
  open,
  onOpenChange,
  title,
  description,
  cancelText = 'Hủy bỏ',
  confirmText = 'Xác nhận',
  type = 'info',
  onConfirm,
  isPending = false
}: ConfirmPortalProps) {
  const config = typeConfigs[type];
  const Icon = config.icon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn(
        "bg-card border-border max-w-[400px] p-0 overflow-hidden rounded-[2rem]",
        config.borderClass
      )}>
        <div className="p-8 pb-4 flex flex-col items-center text-center">
          <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center mb-6", config.iconClass)}>
            <Icon size={32} />
          </div>
          
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-foreground tracking-tight leading-none mb-2">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium text-sm leading-relaxed px-2">
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        <AlertDialogFooter className="p-6 pt-2 bg-muted/20 gap-3 sm:gap-0 sm:flex-row flex-col">
          <AlertDialogCancel className="h-12 rounded-2xl flex-1 border-border font-bold text-xs uppercase tracking-widest hover:bg-muted transition-all">
            {cancelText}
          </AlertDialogCancel>
          <button
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className={cn(
              buttonVariants(),
              "h-12 rounded-2xl flex-1 font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95",
              config.buttonClass
            )}
          >
            {isPending ? <Loader2 className="animate-spin" size={18} /> : confirmText}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
