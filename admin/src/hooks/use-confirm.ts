import { useState, useCallback } from 'react';
import { ConfirmType } from '@/components/ui/ConfirmPortal';

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  type: ConfirmType;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: '',
    description: '',
    type: 'info',
    onConfirm: () => {},
  });

  const confirm = useCallback((data: Omit<ConfirmState, 'open'>) => {
    setState({ ...data, open: true });
  }, []);

  const closeConfirm = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    confirm,
    confirmProps: {
      ...state,
      onOpenChange: (open: boolean) => setState((prev) => ({ ...prev, open })),
    },
    closeConfirm
  };
}
