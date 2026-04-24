import { useContext, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import purchaseApi from '~/apis/purchase.api';
import { purchaseStatus } from '~/constants/purchase';
import { AppContext } from '~/contexts/app.context';
import { toast } from 'react-toastify';

export default function useAddToCart() {
  const { refreshCart } = useContext(AppContext);
  const [isSuccessPopupOpen, setIsSuccessPopupOpen] = useState(false);
  const queryClient = useQueryClient();
  const addToCartMutation = useMutation({
    mutationFn: (body: { variant_id: string; quantity: number }) => purchaseApi.addToCart(body.variant_id, body.quantity),
    onSuccess: (_, variables: any) => {
      // 1. Nếu là "Mua ngay" (skipOpen), cần refresh ngay để sang trang Cart có dữ liệu mới
      if (variables.skipOpen) {
        refreshCart();
      }
      
      // Đối với thêm vào giỏ hàng thông thường, chúng ta không refresh ở đây.
      // Chúng ta sẽ đợi hiệu ứng "Bay vào giỏ" hoàn thành rồi mới refresh (để số Badge tăng đúng lúc bám vào icon).
    },
    onError: (error: any) => {
      console.error('Add to cart failed:', error);
      toast.error('Có lỗi xảy ra, vui lòng thử lại!');
    }
  });

  return {
    addToCart: addToCartMutation.mutate, // Hàm để gọi
    isPending: addToCartMutation.isPending, // Trạng thái loading
    isSuccessPopupOpen, // State popup
    handleClosePopup: () => setIsSuccessPopupOpen(false) // Hàm đóng popup
  };
}