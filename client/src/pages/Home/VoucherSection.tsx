import { useMemo } from 'react'
import { Box, Container, Typography, Stack, Button, Skeleton, Divider } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { motion } from 'framer-motion'
import LocalActivityIcon from '@mui/icons-material/LocalActivity'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useQuery } from '@tanstack/react-query'
import couponApi from '~/apis/coupon.api'
import { toast } from 'react-toastify'

export default function VoucherSection() {
  const theme = useTheme()

  const { data: couponsRes, isLoading } = useQuery({
    queryKey: ['active-coupons'],
    queryFn: () => couponApi.getActiveCoupons(),
    staleTime: 1000 * 60 * 10
  })

  const coupons = useMemo(() => couponsRes?.data.data || [], [couponsRes])

  const copyVoucher = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success(`Đã sao chép: ${code}`, { position: 'bottom-center' })
  }

  if (!isLoading && coupons.length === 0) return null

  return (
    <Box sx={{ py: 10, bgcolor: 'background.default', position: 'relative', overflow: 'hidden' }}>
      {/* 🔮 Background Decorations */}
      <Box 
        sx={{ 
            position: 'absolute', top: '10%', right: '-5%', width: 400, height: 400, 
            bgcolor: alpha(theme.palette.primary.main, 0.03), borderRadius: '50%', filter: 'blur(100px)' 
        }} 
      />

      <Container maxWidth="lg">
        <Stack spacing={4} sx={{ mb: 6, textAlign: 'center', alignItems: 'center' }}>
           <Typography 
             variant="caption" 
             fontWeight={900} 
             color="primary" 
             sx={{ letterSpacing: 5, fontSize: '0.8rem', textTransform: 'uppercase' }}
           >
              Exclusive Offers
           </Typography>
           <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: -1 }}>
              TRẠM VOUCHER ĐẶC QUYỀN
           </Typography>
           <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, fontWeight: 600, opacity: 0.7 }}>
              Săn ngay các mã giảm giá giới hạn từ Homura Global. Tiết kiệm lên tới 50% cho mọi đơn hàng của bạn.
           </Typography>
        </Stack>

        <Stack 
          direction="row" 
          spacing={3} 
          sx={{ 
            overflowX: 'auto', 
            pb: 4, px: 2, mx: -2,
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: alpha(theme.palette.divider, 0.1), borderRadius: 10 }
          }}
        >
          {isLoading ? (
            [1, 2, 3, 4].map(i => <Skeleton key={i} variant="rectangular" width={320} height={160} sx={{ borderRadius: 6, flexShrink: 0 }} />)
          ) : (
            coupons.map((coupon: any, i: number) => (
              <motion.div
                key={coupon.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <Box 
                    sx={{ 
                        width: 320,
                        height: 160,
                        flexShrink: 0,
                        bgcolor: 'background.paper',
                        borderRadius: 6,
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        position: 'relative',
                        display: 'flex',
                        overflow: 'hidden',
                        boxShadow: `0 10px 40px ${alpha(theme.palette.common.black, 0.03)}`,
                        transition: 'transform 0.3s ease, border-color 0.3s ease',
                        '&:hover': { 
                            transform: 'translateY(-10px)', 
                            borderColor: theme.palette.primary.main,
                            boxShadow: `0 20px 50px ${alpha(theme.palette.primary.main, 0.1)}`
                        }
                    }}
                >
                    {/* Perforated Edges */}
                    <Box sx={{ position: 'absolute', top: -10, left: 100, width: 20, height: 20, bgcolor: 'background.default', borderRadius: '50%', border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }} />
                    <Box sx={{ position: 'absolute', bottom: -10, left: 100, width: 20, height: 20, bgcolor: 'background.default', borderRadius: '50%', border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }} />
                    <Divider orientation="vertical" sx={{ position: 'absolute', left: 110, top: 15, bottom: 15, borderStyle: 'dashed', opacity: 0.1 }} />

                    <Box sx={{ width: 110, bgcolor: alpha(theme.palette.primary.main, 0.05), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                       <LocalActivityIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1, opacity: 0.3 }} />
                       <Typography variant="h4" fontWeight={900} color="primary" sx={{ lineHeight: 1 }}>
                          {coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : `${(coupon.discount_value/1000).toFixed(0)}k`}
                       </Typography>
                       <Typography variant="caption" fontWeight={900} sx={{ mt: 0.5, opacity: 0.5 }}>OFF</Typography>
                    </Box>

                    <Box sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                       <Typography variant="subtitle1" fontWeight={900} sx={{ letterSpacing: 1.5, textTransform: 'uppercase', mb: 0.5 }}>{coupon.code}</Typography>
                       <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 2, display: 'block', opacity: 0.7 }}>
                          Đơn từ {new Intl.NumberFormat('vi-VN').format(coupon.min_order_value)}đ
                       </Typography>
                       <Button 
                         variant="contained" 
                         size="small"
                         onClick={() => copyVoucher(coupon.code)}
                         startIcon={<ContentCopyIcon sx={{ fontSize: '10px !important' }} />}
                         sx={{ 
                            borderRadius: 100, fontSize: '0.65rem', fontWeight: 900, px: 2,
                            boxShadow: `0 8px 15px ${alpha(theme.palette.primary.main, 0.2)}` 
                         }}
                       >
                          SAO CHÉP
                       </Button>
                    </Box>
                </Box>
              </motion.div>
            ))
          )}
        </Stack>
      </Container>
    </Box>
  )
}
