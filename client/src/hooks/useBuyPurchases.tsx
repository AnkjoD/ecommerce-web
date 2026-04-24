import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import purchaseApi from '~/apis/purchase.api'
import paymentApi from '~/apis/payment.api'
import { purchaseStatus } from '~/constants/purchase'
import path from '~/constants/path'
import { useNavigate } from 'react-router'
import { toast } from 'react-toastify'

export default function useBuyPurchases() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [isSuccessPopupOpen, setIsSuccessPopupOpen] = useState(false)
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)

  const buyPurchasesMutation = useMutation({
    mutationFn: (body: { address_id: string; payment_method: string; coupon_code?: string; save_card?: boolean }) => 
      purchaseApi.buyPurchases(body),
    onSuccess: async (response, variables) => {
      const order = response.data.data
      
      // Nếu là VNPay -> Lấy link và redirect theo phương thức POST (với Params)
      if (variables.payment_method === 'vnpay') {
        try {
          const res = await paymentApi.createVnPayUrl(order.id, variables.save_card)
          const { url, params } = res.data.data

          // Tạo form ẩn và submit để chuyển hướng sang VNPAY theo phương thức POST
          const form = document.createElement('form')
          form.method = 'GET' // VNPAY 2.1.0 dùng GET redirect với tham số đã ký, nhưng PDF đề cập POST. 
          // Tuy nhiên, sandbox public thường dùng GET. Để bảo mật và hỗ trợ Token, ta dùng POST nếu URL yêu cầu.
          // Ở đây ta cứ submit dạng POST/GET tùy cấu hình VNPAY_URL.
          form.action = url

          Object.keys(params).forEach((key) => {
            const input = document.createElement('input')
            input.type = 'hidden'
            input.name = key
            input.value = params[key]
            form.appendChild(input)
          })

          document.body.appendChild(form)
          form.submit()
          return
        } catch (error) {
          toast.error('Không thể tạo liên kết thanh toán VNPay')
        }
      }

      // Nếu là MoMo -> Lấy link và redirect
      if (variables.payment_method === 'momo') {
        try {
          const res = await paymentApi.createMomoUrl(order.id)
          window.location.href = res.data.data // Redirect to MoMo
          return
        } catch (error) {
          toast.error('Không thể tạo liên kết thanh toán MoMo')
        }
      }

      // Nếu là COD hoặc VNPay lỗi quay lại -> Hiện popup thành công
      setIsSuccessPopupOpen(true)
      queryClient.invalidateQueries({ queryKey: ['purchases', { status: purchaseStatus.inCart }] })
    },
    onError: (error: any) => {
      console.error('Order creation failed:', error)
      toast.error('Đặt hàng không thành công. Vui lòng thử lại.')
    }
  })

  return {
    buyPurchases: buyPurchasesMutation.mutate,
    isPending: buyPurchasesMutation.isPending,
    isSuccessPopupOpen,
    isCheckoutModalOpen,
    setIsCheckoutModalOpen,
    handleClosePopup: () => {
      setIsSuccessPopupOpen(false)
      navigate(path.purchase)
    }
  }
}
