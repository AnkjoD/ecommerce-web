import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Checkbox,
  Paper,
  Box,
  alpha,
  useTheme,
  Divider,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress
} from '@mui/material'
import {
  LocationOn,
  LocalShipping,
  AccountBalanceWallet,
  LocalOffer,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material'
import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import addressApi from '~/apis/address.api'
import couponApi from '~/apis/coupon.api'
import { toast } from 'react-toastify'
import AppButton from '~/components/AppButton'
import { useNavigate } from 'react-router'
import path from '~/constants/path'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (data: { address_id: string; payment_method: string; coupon_code?: string; save_card?: boolean }) => void
  loading: boolean
  totalAmount: number
}

export default function CheckoutModal({ open, onClose, onConfirm, loading, totalAmount }: Props) {
  const theme = useTheme()
  const navigate = useNavigate()
  const [selectedAddress, setSelectedAddress] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('vnpay')
  const [saveCard, setSaveCard] = useState<boolean>(false)

  const { data: addressesRes, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressApi.getAddresses(),
    enabled: open
  })

  // 🚀 FETCH ACTIVE COUPONS FOR SELECTION
  const { data: couponsRes } = useQuery({
    queryKey: ['active-coupons'],
    queryFn: () => couponApi.getActiveCoupons(),
    enabled: open
  })

  const addresses = addressesRes?.data.data || []
  const availableCoupons = couponsRes?.data.data || []

  const [couponCode, setCouponCode] = useState<string>('')
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string, discount: number} | null>(null)

  const validateCouponMutation = useMutation({
    mutationFn: (code: string) => couponApi.validate({ code, order_total: totalAmount }),
    onSuccess: (res) => {
      setAppliedCoupon({ code: couponCode, discount: res.data.discount_amount })
      toast.success('Áp dụng mã giảm giá thành công!')
    },
    onError: (error: any) => {
      setAppliedCoupon(null)
      toast.error(error?.response?.data?.message || 'Mã giảm giá không hợp lệ')
    }
  })

  // Tự động chọn địa chỉ mặc định
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      const defaultAddr = addresses.find((a) => a.is_default) || addresses[0]
      setSelectedAddress(defaultAddr.id)
    }
  }, [addresses, selectedAddress])

  const handleConfirm = () => {
    if (!selectedAddress) return
    onConfirm({ 
      address_id: selectedAddress, 
      payment_method: paymentMethod,
      coupon_code: appliedCoupon?.code,
      save_card: saveCard
    })
  }

  const selectedAddressData = useMemo(() => addresses.find(a => a.id === selectedAddress), [addresses, selectedAddress])
  
  const shippingFee = useMemo(() => {
    if (!selectedAddressData) return 0
    let discountTarget = totalAmount
    if (appliedCoupon) discountTarget -= appliedCoupon.discount
    if (discountTarget >= 500000) return 0
    
    const p = selectedAddressData.province.toLowerCase()
    if (p.includes('hồ chí minh')) return 20000
    if (p.includes('hà nội') || p.includes('đà nẵng')) return 30000
    return 40000
  }, [totalAmount, selectedAddressData, appliedCoupon])

  const discountAmount = appliedCoupon ? appliedCoupon.discount : 0
  const grandTotal = totalAmount - discountAmount + shippingFee

  const applyVoucher = (code: string) => {
    setCouponCode(code)
    validateCouponMutation.mutate(code)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 8,
          p: 1,
          bgcolor: (theme) => alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(30px) saturate(180%)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: `0 40px 100px ${alpha(theme.palette.common.black, 0.1)}`,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ fontWeight: 1000, fontSize: '1.8rem', pb: 1, letterSpacing: -1 }}>
        Hoàn Tất Đặt Hàng
      </DialogTitle>
      
      <DialogContent sx={{ py: 2 }}>
        <Stack spacing={4}>
          {/* SECTION: ADDRESS */}
          <Box>
            <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 2 }}>
              <Stack direction='row' spacing={1.5} alignItems='center'>
                <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), p: 1, borderRadius: 1.5, display: 'flex' }}>
                   <LocationOn color='primary' sx={{ fontSize: 20 }} />
                </Box>
                <Typography variant='subtitle1' fontWeight={1000} sx={{ letterSpacing: 1 }}>ĐỊA CHỈ NHẬN HÀNG</Typography>
              </Stack>
              <Button 
                size='small' 
                onClick={() => navigate(path.address)}
                sx={{ fontWeight: 800, borderRadius: 2 }}
              >
                QUẢN LÝ
              </Button>
            </Stack>

            {isLoading ? (
              <Box sx={{ py: 2, textAlign: 'center' }}>
                 <CircularProgress size={20} />
              </Box>
            ) : addresses.length === 0 ? (
              <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 4, bgcolor: alpha(theme.palette.error.main, 0.05), border: `1px dashed ${alpha(theme.palette.error.main, 0.2)}` }}>
                <Typography variant='body2' color='error' fontWeight={700}>Bạn chưa có địa chỉ giao hàng nào.</Typography>
                <Button size='small' onClick={() => navigate(path.address)} sx={{ mt: 1, fontWeight: 900 }}>THÊM NGAY</Button>
              </Paper>
            ) : (
              <FormControl component='fieldset' sx={{ width: '100%' }}>
                <RadioGroup value={selectedAddress} onChange={(e) => setSelectedAddress(e.target.value)}>
                  <Stack spacing={1.5}>
                    {addresses.map((addr) => (
                      <Paper
                        key={addr.id}
                        elevation={0}
                        sx={{
                          p: 2.5,
                          borderRadius: 4,
                          cursor: 'pointer',
                          transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          border: `2px solid ${selectedAddress === addr.id ? theme.palette.primary.main : alpha(theme.palette.divider, 0.1)}`,
                          bgcolor: selectedAddress === addr.id ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                          '&:hover': { transform: 'translateY(-2px)', bgcolor: alpha(theme.palette.primary.main, 0.02) }
                        }}
                        onClick={() => setSelectedAddress(addr.id)}
                      >
                        <FormControlLabel
                          value={addr.id}
                          control={<Radio size='small' />}
                          label={
                            <Box sx={{ ml: 1 }}>
                              <Stack direction='row' spacing={1.5} alignItems='center'>
                                <Typography variant='body2' fontWeight={1000}>{addr.recipient_name}</Typography>
                                <Typography variant='caption' color='text.secondary' fontWeight={800} sx={{ opacity: 0.6 }}>{addr.phone}</Typography>
                                {addr.is_default && <Chip label='MẶC ĐỊNH' size='small' sx={{ height: 18, fontSize: '0.6rem', fontWeight: 1000, borderRadius: 1.5 }} color='primary' />}
                              </Stack>
                              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
                                {addr.street}, {addr.ward}, {addr.district}, {addr.province}
                              </Typography>
                            </Box>
                          }
                          sx={{ m: 0, width: '100%' }}
                        />
                      </Paper>
                    ))}
                  </Stack>
                </RadioGroup>
              </FormControl>
            )}
          </Box>

          <Divider sx={{ borderStyle: 'dashed', opacity: 0.5 }} />

          {/* SECTION: PAYMENT METHOD */}
          <Box>
            <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 2 }}>
              <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), p: 1, borderRadius: 1.5, display: 'flex' }}>
                 <AccountBalanceWallet color='primary' sx={{ fontSize: 20 }} />
              </Box>
              <Typography variant='subtitle1' fontWeight={1000} sx={{ letterSpacing: 1 }}>PHƯƠNG THỨC THANH TOÁN</Typography>
            </Stack>
            
            <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <Stack direction='row' spacing={2.5}>
                <Paper
                  elevation={0}
                  sx={{
                    flex: 1, p: 2.5, borderRadius: 4, cursor: 'pointer', textAlign: 'center',
                    border: `2px solid ${paymentMethod === 'vnpay' ? theme.palette.primary.main : alpha(theme.palette.divider, 0.1)}`,
                    bgcolor: paymentMethod === 'vnpay' ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                    transition: '0.3s'
                  }}
                  onClick={() => setPaymentMethod('vnpay')}
                >
                  <FormControlLabel
                    value='vnpay'
                    control={<Radio size='small' />}
                    label={
                      <Box>
                        <Box component='img' src='/assets/vnpay-logo.jpg' sx={{ height: 24, mb: 1, mx: 'auto' }} />
                        <Typography variant='caption' fontWeight={900} sx={{ display: 'block', letterSpacing: 1 }}>VNPAY-QR</Typography>
                      </Box>
                    }
                    labelPlacement='bottom'
                    sx={{ m: 0 }}
                  />
                </Paper>
                <Paper
                  elevation={0}
                  sx={{
                    flex: 1, p: 2.5, borderRadius: 4, cursor: 'pointer', textAlign: 'center',
                    border: `2px solid ${paymentMethod === 'cod' ? theme.palette.primary.main : alpha(theme.palette.divider, 0.1)}`,
                    bgcolor: paymentMethod === 'cod' ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                    transition: '0.3s'
                  }}
                  onClick={() => setPaymentMethod('cod')}
                >
                  <FormControlLabel
                    value='cod'
                    control={<Radio size='small' />}
                    label={
                      <Box>
                        <LocalShipping color='primary' sx={{ fontSize: 24, mb: 1, opacity: 0.6 }} />
                        <Typography variant='caption' fontWeight={900} sx={{ display: 'block', letterSpacing: 1 }}>TIỀN MẶT</Typography>
                      </Box>
                    }
                    labelPlacement='bottom'
                    sx={{ m: 0 }}
                  />
                </Paper>
              </Stack>
            </RadioGroup>
          </Box>

          <Divider sx={{ borderStyle: 'dashed', opacity: 0.5 }} />

          {/* SECTION: COUPON / ELITE SELECTION */}
          <Box>
            <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 2 }}>
              <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), p: 1, borderRadius: 1.5, display: 'flex' }}>
                 <LocalOffer color='primary' sx={{ fontSize: 20 }} />
              </Box>
              <Typography variant='subtitle1' fontWeight={1000} sx={{ letterSpacing: 1 }}>MÃ GIẢM GIÁ</Typography>
            </Stack>
            
            <Stack direction='row' spacing={2} sx={{ mb: 2 }}>
              <TextField 
                size="small" 
                fullWidth 
                placeholder="Nhập thủ công..." 
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={validateCouponMutation.isPending || !!appliedCoupon}
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: 3, height: 48, fontWeight: 800,
                    bgcolor: appliedCoupon ? alpha(theme.palette.success.main, 0.05) : 'transparent'
                  } 
                }}
                InputProps={{
                  endAdornment: appliedCoupon && (
                    <InputAdornment position="end">
                      <IconButton size="small" color="error" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}>
                        <Typography variant="caption" fontWeight={1000}>XÓA</Typography>
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <Button 
                variant="contained" 
                disabled={!couponCode || validateCouponMutation.isPending || !!appliedCoupon}
                onClick={() => validateCouponMutation.mutate(couponCode)}
                sx={{ borderRadius: 3, fontWeight: 1000, minWidth: 100, px: 3 }}
              >
                {validateCouponMutation.isPending ? <CircularProgress size={20} /> : 'ÁP DỤNG'}
              </Button>
            </Stack>

            {/* 🚀 QUICK SELECTION LIST */}
            {availableCoupons.length > 0 && !appliedCoupon && (
               <Box sx={{ mb: 1, animation: 'fade-in 0.5s ease' }}>
                  <Typography variant="caption" fontWeight={900} color="text.disabled" sx={{ letterSpacing: 1.5, mb: 1.5, display: 'block', ml: 1 }}>MÃ CÓ SẴN CHO BẠN:</Typography>
                  <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
                     {availableCoupons.map((coupon: any) => (
                        <Box 
                           key={coupon.id}
                           onClick={() => applyVoucher(coupon.code)}
                           sx={{ 
                             flexShrink: 0, p: 1.5, px: 2.5, borderRadius: 3,
                             bgcolor: alpha(theme.palette.primary.main, 0.04),
                             border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                             cursor: 'pointer', transition: '0.2s',
                             '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08), transform: 'translateY(-2px)' }
                           }}
                        >
                           <Typography variant="caption" fontWeight={1000} color="primary.main">{coupon.code}</Typography>
                           <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.6 }}>- {coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : `${(coupon.discount_value/1000).toFixed(0)}k`}</Typography>
                        </Box>
                     ))}
                  </Stack>
               </Box>
            )}

            {appliedCoupon && (
              <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.success.main, 0.05), border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                 <CheckCircleIcon color="success" sx={{ fontSize: 18 }} />
                 <Typography variant="caption" color="success.main" fontWeight={1000} sx={{ letterSpacing: 0.5 }}>
                    Mã {appliedCoupon.code} đã được kích hoạt (Giảm {appliedCoupon.discount.toLocaleString()}đ)
                 </Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ borderStyle: 'dashed', opacity: 0.5 }} />

          {/* SECTION: SUMMARY */}
          <Box sx={{ p: 4, borderRadius: 6, bgcolor: alpha(theme.palette.action.hover, 0.04), border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
             <Stack spacing={2}>
                <Stack direction='row' justifyContent='space-between'>
                  <Typography variant='body2' color='text.secondary' fontWeight={700}>Tạm tính:</Typography>
                  <Typography variant='body2' fontWeight={900}>₫{totalAmount.toLocaleString()}</Typography>
                </Stack>
                {discountAmount > 0 && (
                  <Stack direction='row' justifyContent='space-between'>
                    <Typography variant='body2' color='primary.main' fontWeight={700}>Giảm giá Voucher:</Typography>
                    <Typography variant='body2' fontWeight={1000} color='primary.main'>-₫{discountAmount.toLocaleString()}</Typography>
                  </Stack>
                )}
                <Stack direction='row' justifyContent='space-between'>
                  <Typography variant='body2' color='text.secondary' fontWeight={700}>Vận chuyển:</Typography>
                  <Typography variant='body2' fontWeight={900}>
                    {shippingFee === 0 ? <Box component="span" sx={{ color: 'success.main' }}>MIỄN PHÍ</Box> : `₫${shippingFee.toLocaleString()}`}
                  </Typography>
                </Stack>
                <Divider sx={{ my: 1, opacity: 0.5 }} />
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                    <Box>
                       <Typography variant='subtitle1' fontWeight={1000} sx={{ mb: -0.5 }}>TỔNG THANH TOÁN</Typography>
                       <Typography variant="caption" sx={{ opacity: 0.4, fontWeight: 800 }}>Dự kiến quyết toán</Typography>
                    </Box>
                    <Typography variant='h3' fontWeight={1000} color='primary.main' sx={{ letterSpacing: '-0.04em', fontSize: '2.4rem' }}>
                      ₫{grandTotal.toLocaleString()}
                    </Typography>
                </Stack>
             </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 4, pt: 0 }}>
        <Button 
          onClick={onClose} 
          color='inherit' 
          sx={{ fontWeight: 1000, px: 3, letterSpacing: 1 }}
        >
          HỦY BỎ
        </Button>
        <AppButton
          onClick={handleConfirm}
          variant='contained'
          loading={loading}
          disabled={!selectedAddress}
          sx={{ 
            borderRadius: 4, px: 6, height: 60, fontWeight: 1000, fontSize: '1rem',
            boxShadow: `0 15px 40px ${alpha(theme.palette.primary.main, 0.35)}`
          }}
        >
          XÁC NHẬN THANH TOÁN
        </AppButton>
      </DialogActions>
    </Dialog>
  )
}
