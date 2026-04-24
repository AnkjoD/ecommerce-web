import { useMutation, useQueryClient } from '@tanstack/react-query';
import purchaseApi from '~/apis/purchase.api';
import { purchaseStatus } from '~/constants/purchase';
import useDebounceFn from './useDebounceFn'; // Import hook vừa tạo

export default function useUpdatePurchase() {
  const queryClient = useQueryClient();

  // 1. Mutation gọi API Update
  const updateMutation = useMutation({
    mutationFn: (payload: { variant_id: string; quantity: number }) => 
      purchaseApi.updatePurchase(payload.variant_id, payload.quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases', { status: purchaseStatus.inCart }] });
    },
    onError: ()=>{
        queryClient.invalidateQueries({ queryKey: ['purchases', { status: purchaseStatus.inCart }] });
    }
  });

  
  const handleUpdateDebounce = useDebounceFn((variant_id: string, quantity: number) => {
      updateMutation.mutate({ variant_id, quantity });
  }, 500);

  return {
    updatePurchase: handleUpdateDebounce, 
    isUpdating: updateMutation.isPending
  };
}