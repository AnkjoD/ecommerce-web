import { Box, Button, CircularProgress, Container, Paper, Stack, Typography, alpha, useTheme } from '@mui/material'
import { motion } from 'framer-motion'
import { Link, useSearchParams } from 'react-router'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import path from '~/constants/path'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { purchaseStatus } from '~/constants/purchase'
import paymentApi from '~/apis/payment.api'

export default function PaymentResult() {
  const [searchParams] = useSearchParams()
  const theme = useTheme()
  const queryClient = useQueryClient()

  const [isVerifying, setIsVerifying] = useState(true)
  const [verifyData, setVerifyData] = useState<{
    isSuccess: boolean;
    order_code: string;
    amount: number;
  } | null>(null)
  
  // Identify payment provider from URL
  const vnp_ResponseCode = searchParams.get('vnp_ResponseCode')
  const momo_ResultCode = searchParams.get('resultCode')
  const isVnPay = vnp_ResponseCode !== null
  const isMoMo = momo_ResultCode !== null

  useEffect(() => {
    const verifyPayment = async () => {
      // Nếu không có param nào -> Có thể là truy cập trực tiếp hoặc đã bị dọn dẹp
      if (!isVnPay && !isMoMo) {
        setIsVerifying(false)
        return
      }

      try {
        if (isVnPay) {
          const params: Record<string, string> = {}
          searchParams.forEach((value, key) => {
            params[key] = value
          })

          const res = await paymentApi.verifyVnpayCallback(params)
          setVerifyData(res.data.data)
        } 
        
        if (isMoMo) {
           // MoMo verification logic could be handled similarly if needed
           setVerifyData({
             isSuccess: momo_ResultCode === '0',
             order_code: searchParams.get('orderId') || '',
             amount: Number(searchParams.get('amount')) || 0
           })
        }

        // Làm sạch URL sau khi xác thực thành công (Real-world practice)
        window.history.replaceState({}, '', path.paymentResult)
        
        // Refresh lại giỏ hàng
        queryClient.invalidateQueries({ queryKey: ['purchases', { status: purchaseStatus.inCart }] })
      } catch (error) {
        console.error('Xác thực thất bại:', error)
        setVerifyData({
          isSuccess: false,
          order_code: searchParams.get('vnp_TxnRef') || searchParams.get('orderId') || '',
          amount: Number(searchParams.get('vnp_Amount')) / 100 || Number(searchParams.get('amount')) || 0
        })
      } finally {
        setIsVerifying(false)
      }
    }

    verifyPayment()
  }, [isMoMo, isVnPay, queryClient, searchParams])

  if (isVerifying) {
    return (
      <Box sx={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" fontWeight={700} color="text.secondary">
          Đang xác thực giao dịch...
        </Typography>
      </Box>
    )
  }

  const isSuccess = verifyData?.isSuccess ?? false
  const orderCode = verifyData?.order_code || 'N/A'
  const amount = verifyData?.amount || 0

  return (
    <Box sx={{ bgcolor: 'background.default', color: 'text.primary', minHeight: '80vh', pt: 10, pb: 15 }}>
      <Container maxWidth="sm">
        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5, type: 'spring' }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, md: 6 },
              borderRadius: 6,
              textAlign: 'center',
              bgcolor: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(30px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              boxShadow: `0 30px 60px ${alpha(theme.palette.common.black, 0.05)}`
            }}
          >
            {isSuccess ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}>
                <CheckCircleIcon sx={{ fontSize: 100, color: 'success.main', mb: 2 }} />
              </motion.div>
            ) : (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}>
                <CancelIcon sx={{ fontSize: 100, color: 'error.main', mb: 2 }} />
              </motion.div>
            )}

            <Typography variant="h4" fontWeight={1000} sx={{ mb: 1, color: isSuccess ? 'success.main' : 'error.main' }}>
              {isSuccess ? 'THANH TOÁN THÀNH CÔNG' : 'THANH TOÁN THẤT BẠI'}
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, px: { xs: 0, sm: 2 } }}>
              {isSuccess 
                ? 'Tuyệt vời! Đơn hàng của bạn đã được xác nhận thanh toán. Chúng tôi sẽ chuẩn bị giao hàng cho bạn trong thời gian sớm nhất.'
                : 'Rất tiếc! Giao dịch của bạn đã bị hủy hoặc xảy ra sự cố. Tiền trong tài khoản của bạn (nếu đã bị trừ) sẽ được hoàn lại.'}
            </Typography>

            <Box sx={{ 
              p: 3, 
              borderRadius: 4, 
              bgcolor: alpha(theme.palette.action.hover, 0.05),
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              mb: 4
            }}>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>Phương thức:</Typography>
                  <Typography variant="body2" fontWeight={900}>{isVnPay ? 'Ví VNPAY / ATM' : 'Ví điện tử MoMo'}</Typography>
                </Stack>
                {orderCode && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary" fontWeight={700}>Mã đơn hàng:</Typography>
                    <Typography variant="body2" fontWeight={900}>{orderCode}</Typography>
                  </Stack>
                )}
                {amount > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary" fontWeight={700}>Số tiền thanh toán:</Typography>
                    <Typography variant="body2" fontWeight={900} color="primary.main">
                      {amount.toLocaleString()}đ
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" mt={4}>
              <Button
                component={Link}
                to={path.purchase}
                variant={isSuccess ? 'outlined' : 'contained'}
                size="large"
                startIcon={<ReceiptLongIcon />}
                sx={{ 
                  borderRadius: 100, 
                  px: 4, 
                  fontWeight: 900,
                  height: 52 
                }}
              >
                 ĐƠN HÀNG CỦA TÔI
              </Button>
              <Button
                component={Link}
                to={path.home}
                variant={isSuccess ? 'contained' : 'outlined'}
                size="large"
                startIcon={<ShoppingBagIcon />}
                sx={{ 
                  borderRadius: 100, 
                  px: 4, 
                  fontWeight: 900,
                  height: 52 
                }}
              >
                TIẾP TỤC MUA SẮM
              </Button>
            </Stack>

          </Paper>
        </motion.div>
      </Container>
    </Box>
  )
}
