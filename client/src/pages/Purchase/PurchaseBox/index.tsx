import { useState } from 'react'
import { Box, Typography, Button, Avatar, alpha, Stack, Chip, Divider, Tooltip } from '@mui/material'
import { purchaseStatus } from '~/constants/purchase'
import type { Order, OrderItem } from '~/types/purchase.type'
import useAddToCart from '~/hooks/useAddToCart'
import { motion } from 'framer-motion'
import {
  LocalShipping,
  CheckCircle,
  PendingActions,
  Inventory,
  Cancel,
  Replay as ReplayIcon,
  Info,
  CreditCard,
  Payments,
  Article
} from '@mui/icons-material'
import ReviewModal from '../ReviewModal'

interface Props {
  order: Order
}

const getStatusConfig = (rawStatus: string) => {
  const status = (rawStatus || '').toLowerCase().trim();
  switch (status) {
    case 'pending':
    case purchaseStatus.waitForConfirmation:
      return { 
        label: 'Chờ xác nhận', 
        color: '#F9A825', 
        icon: <PendingActions sx={{ fontSize: 18 }} />,
        bg: alpha('#F9A825', 0.1)
      }
    case 'confirmed':
    case purchaseStatus.confirmed:
      return { 
        label: 'Đã xác nhận', 
        color: '#0288D1', 
        icon: <Article sx={{ fontSize: 18 }} />,
        bg: alpha('#0288D1', 0.1)
      }
    case 'processing':
    case purchaseStatus.waitForGetting:
      return { 
        label: 'Chờ lấy hàng', 
        color: '#00B0FF', 
        icon: <Inventory sx={{ fontSize: 18 }} />,
        bg: alpha('#00B0FF', 0.1)
      }
    case 'shipping':
    case purchaseStatus.inProgress:
      return { 
        label: 'Đang vận chuyển', 
        color: '#64DD17', 
        icon: <LocalShipping sx={{ fontSize: 18 }} />,
        bg: alpha('#64DD17', 0.1)
      }
    case 'delivered':
    case purchaseStatus.delivered:
      return { 
        label: 'Hoàn thành', 
        color: '#00C853', 
        icon: <CheckCircle sx={{ fontSize: 18 }} />,
        bg: alpha('#00C853', 0.1)
      }
    case 'cancelled':
    case purchaseStatus.cancelled:
      return { 
        label: 'Đã hủy', 
        color: '#D32F2F', 
        icon: <Cancel sx={{ fontSize: 18 }} />,
        bg: alpha('#D32F2F', 0.1)
      }
    case 'payment_failed':
    case purchaseStatus.paymentFailed:
      return { 
        label: 'Thanh toán lỗi', 
        color: '#EF6C00', 
        icon: <Cancel sx={{ fontSize: 18 }} />,
        bg: alpha('#EF6C00', 0.1)
      }
    default:
      return { 
        label: 'Không xác định', 
        color: '#757575', 
        icon: <Info sx={{ fontSize: 18 }} />,
        bg: alpha('#757575', 0.1)
      }
  }
}

const PurchaseBox = ({ order }: Props) => {
  const { addToCart } = useAddToCart()
  const [openReview, setOpenReview] = useState(false)
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null)
  const config = getStatusConfig(order.status)

  const isVnpay = order.payment_method === 'vnpay'

  const handleBuyAgain = (item: OrderItem) => {
    addToCart({ variant_id: item.variant_id, quantity: item.quantity })
  }

  const handleReview = (item: OrderItem) => {
    setSelectedItem(item)
    setOpenReview(true)
  }

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      sx={{
        p: { xs: 2, md: 4 },
        borderRadius: 6,
        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.7),
        backdropFilter: 'blur(40px)',
        border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        boxShadow: (theme) => `0 12px 34px ${alpha(theme.palette.common.black, 0.03)}`,
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        '&:hover': {
          bgcolor: (theme) => theme.palette.background.paper,
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.2),
          boxShadow: (theme) => `0 24px 60px ${alpha(theme.palette.primary.main, 0.08)}`,
          '& .order-header': {
            borderColor: (theme) => alpha(theme.palette.primary.main, 0.1)
          }
        }
      }}
    >
      {/* Header Area */}
      <Stack 
        className="order-header"
        direction="row" 
        justifyContent="space-between" 
        alignItems="center" 
        sx={{ 
          mb: 3, pb: 2, 
          borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 0.06)}`,
          transition: 'border-color 0.3s'
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="caption" fontWeight={900} sx={{ color: 'text.secondary', letterSpacing: 1, opacity: 0.8 }}>
            ORDER ID
          </Typography>
          <Typography variant="body2" fontWeight={1000} sx={{ letterSpacing: 0.5 }}>
            {order.order_code}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tooltip title={isVnpay ? 'Đã thanh toán qua VNPAY' : 'Thanh toán khi nhận hàng'}>
            <Chip 
              icon={isVnpay ? <CreditCard /> : <Payments />}
              label={isVnpay ? 'VNPAY' : 'COD'}
              size="small"
              sx={{ 
                height: 28,
                borderRadius: '8px', 
                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                fontWeight: 800,
                fontSize: '0.65rem',
                '& .MuiChip-icon': { fontSize: 14 }
              }}
            />
          </Tooltip>
          <Chip 
            icon={config.icon}
            label={config.label.toUpperCase()}
            sx={{ 
              height: 36,
              borderRadius: 3,
              bgcolor: config.bg,
              color: config.color,
              fontWeight: 1000,
              fontSize: '0.75rem',
              px: 1,
              border: `1px solid ${alpha(config.color, 0.2)}`,
              '& .MuiChip-icon': { color: 'inherit' }
            }}
          />
        </Stack>
      </Stack>

      {/* Items Area */}
      <Stack spacing={4}>
        {order.items.map((item) => (
          <Box key={item.id}>
            <Box sx={{ display: 'flex', gap: { xs: 2.5, md: 4 } }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={item.variant?.product?.media?.thumbnail || item.variant?.product?.media?.images?.[0] || '/placeholder-product.png'}
                  variant="rounded"
                  sx={{ 
                    width: { xs: 80, md: 100 }, 
                    height: { xs: 80, md: 100 }, 
                    borderRadius: 4, 
                    border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                  }}
                />
                <Box 
                  sx={{ 
                    position: 'absolute', top: -8, right: -8,
                    bgcolor: 'primary.main', color: 'primary.contrastText',
                    width: 24, height: 24, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 900,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                  }}
                >
                  {item.quantity}
                </Box>
              </Box>

              <Box sx={{ flex: 1, minWidth: 0, pt: 0.5 }}>
                <Typography variant="h6" fontWeight={850} noWrap sx={{ mb: 0.5, letterSpacing: -0.2 }}>
                  {item.product_name}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={650} sx={{ mb: 1.5, opacity: 0.7 }}>
                  {item.variant_info}
                </Typography>
                <Typography variant="subtitle2" color="primary.main" fontWeight={1000} sx={{ fontSize: '1.1rem' }}>
                  ₫{item.unit_price.toLocaleString()}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 1 }}>
                {order.status === purchaseStatus.delivered && (
                  <>
                    <Button 
                      size="small"
                      variant="contained" 
                      color="primary"
                      onClick={() => handleReview(item)}
                      sx={{ borderRadius: 2, fontWeight: 900, fontSize: '0.65rem', height: 32, minWidth: 100 }}
                    >
                      ĐÁNH GIÁ
                    </Button>
                    <Button 
                      size="small"
                      variant="outlined" 
                      startIcon={<ReplayIcon sx={{ fontSize: 13 }} />}
                      onClick={() => handleBuyAgain(item)}
                      sx={{ borderRadius: 2, fontWeight: 900, fontSize: '0.65rem', height: 32 }}
                    >
                      MUA LẠI
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          </Box>
        ))}
      </Stack>

      {/* Footer Area */}
      <Box 
        sx={{ 
          mt: 4, pt: 3, 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', md: 'center' },
          borderTop: (theme) => `1px dashed ${alpha(theme.palette.divider, 0.1)}`,
          gap: 2
        }}
      >
        <Stack direction="row" spacing={3}>
           <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" gutterBottom>PHÍ SHIP</Typography>
              <Typography variant="body2" fontWeight={800}>₫{order.shipping_fee.toLocaleString()}</Typography>
           </Box>
           <Box sx={{ borderLeft: (theme) => `1px solid ${alpha(theme.palette.divider, 0.1)}`, pl: 3 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" gutterBottom>GIẢM GIÁ</Typography>
              <Typography variant="body2" fontWeight={800} color="error.main">-₫{(order.discount_amount || 0).toLocaleString()}</Typography>
           </Box>
        </Stack>

        <Box sx={{ textAlign: { xs: 'left', md: 'right' }, width: { xs: '100%', md: 'auto' } }}>
          <Stack direction="row" spacing={1} alignItems="flex-end" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
             <Typography variant="body2" color="text.secondary" fontWeight={800} sx={{ mb: 0.5 }}>TỔNG THANH TOÁN:</Typography>
             <Typography variant="h4" color="primary.main" fontWeight={1000} sx={{ letterSpacing: -1 }}>
               ₫{order.total.toLocaleString()}
             </Typography>
          </Stack>
        </Box>
      </Box>

      {selectedItem && (
        <ReviewModal 
          open={openReview} 
          onClose={() => {
            setOpenReview(false)
            setSelectedItem(null)
          }} 
          purchase={selectedItem}
        />
      )}
    </Box>
  )
}

export default PurchaseBox