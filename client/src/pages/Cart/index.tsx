import { Box, Button, Checkbox, Container, Divider, Grid, IconButton, Paper, Stack, Typography, alpha, useTheme, Skeleton } from '@mui/material'
import { Link, useNavigate } from 'react-router'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useContext } from 'react'
import { AppContext } from '~/contexts/app.context'
import purchaseApi from '~/apis/purchase.api'
import { purchaseStatus } from '~/constants/purchase'
import type { Purchase } from '~/types/purchase.type'
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import useUpdatePurchase from '~/hooks/useUpdatePurchase'
import formatCurrency from '~/utils/formatCurrency'
import SuccessMessage from '~/components/SuccessMessage'
import useBuyPurchases from '~/hooks/useBuyPurchases'
import path from '~/constants/path'
import { generateNameId } from '~/utils/url'
import CheckoutModal from './CheckoutModal'

const DEFAULT_PRODUCT_IMAGE = 'https://placehold.co/600x400?text=Homura+Mall'

interface ExtendedPurchase extends Purchase {
  checked: boolean
  disabled: boolean
}

function Cart() {
  const { isAuthenticated } = useContext(AppContext)
  const theme = useTheme()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(path.login)
    }
  }, [isAuthenticated, navigate])

  const [extendedPurchases, setExtendedPurchases] = useState<ExtendedPurchase[]>([])
  const { updatePurchase } = useUpdatePurchase()

  const { data: purchaseData, isLoading: isLoadingCart } = useQuery({
    queryKey: ['purchases', { status: purchaseStatus.inCart }],
    queryFn: () => purchaseApi.getPurchases({ status: purchaseStatus.inCart as any })
  })

  if (isLoadingCart) {
    return (
      <Box sx={{ bgcolor: 'background.default', pb: 15, pt: 6, minHeight: '100vh' }}>
        <Container maxWidth='lg'>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 5 }}>
            <Skeleton variant="rectangular" width={60} height={60} sx={{ borderRadius: 3 }} />
            <Box>
              <Skeleton variant="text" width={200} height={40} />
              <Skeleton variant="text" width={150} height={20} />
            </Box>
          </Stack>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Stack spacing={3}>
                <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 3 }} />
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rectangular" height={160} sx={{ borderRadius: 4 }} />
                ))}
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Skeleton variant="rectangular" height={450} sx={{ borderRadius: 6 }} />
            </Grid>
          </Grid>
        </Container>
      </Box>
    )
  }

  const { buyPurchases, isPending, isSuccessPopupOpen, handleClosePopup, isCheckoutModalOpen, setIsCheckoutModalOpen } = useBuyPurchases()

  const deleteMutation = useMutation({
    mutationFn: (variantId: string) => purchaseApi.deletePurchases(variantId),
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['purchases', { status: purchaseStatus.inCart }] })
    }
  })

  const cartItems: Purchase[] = useMemo(() => purchaseData?.data.data.items || [], [purchaseData])

  useEffect(() => {
    setExtendedPurchases(() => {
      return cartItems.map((item) => ({
        ...item,
        checked: false,
        disabled: false
      }))
    })
  }, [cartItems])

  const isAllChecked = useMemo(() => 
    extendedPurchases.length > 0 && extendedPurchases.every((item) => item.checked), 
  [extendedPurchases])

  const handleCheckAll = () => {
    setExtendedPurchases((prev) => prev.map((item) => ({ ...item, checked: !isAllChecked })))
  }

  const handleCheck = (id: string) => {
    setExtendedPurchases((prev) => prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)))
  }

  const handleQuantityChange = (purchaseIndex: number, value: number) => {
    const item = extendedPurchases[purchaseIndex]
    const newItems = [...extendedPurchases]
    newItems[purchaseIndex] = { ...item, quantity: value }
    setExtendedPurchases(newItems)
    updatePurchase(item.variant_id, value)
  }

  const handleDelete = (variantId: string) => {
    deleteMutation.mutate(variantId)
  }

  const handleDeleteSelected = () => {
    const checkedItems = extendedPurchases.filter((item) => item.checked)
    checkedItems.forEach((item) => {
      deleteMutation.mutate(item.variant_id)
    })
  }

  const handleBuyAll = () => {
    setIsCheckoutModalOpen(true)
  }

  const handleConfirmOrder = (data: { address_id: string; payment_method: string }) => {
    buyPurchases(data)
  }

  const totalCheckedPrice = useMemo(() => {
    return extendedPurchases.reduce((sum, item) => (item.checked ? sum + item.variant.price * item.quantity : sum), 0)
  }, [extendedPurchases])

  const totalCheckedCount = useMemo(() => {
    return extendedPurchases.reduce((sum, item) => (item.checked ? sum + item.quantity : sum), 0)
  }, [extendedPurchases])

  const totalSaving = useMemo(() => {
    return extendedPurchases.reduce((sum, item) => {
      if (item.checked) {
        const original = item.variant.price_before_discount || item.variant.price
        const sale = item.variant.price
        return sum + (original - sale) * item.quantity
      }
      return sum
    }, 0)
  }, [extendedPurchases])

  return (
    <Box sx={{ bgcolor: 'background.default', color: 'text.primary', minHeight: '100vh', pb: { xs: 15, md: 8 }, pt: { xs: 2, md: 6 } }}>
      <Container maxWidth='lg'>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: { xs: 3, md: 5 } }}>
            <Box sx={{ 
              p: 1.5, borderRadius: 3, 
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, 
              color: '#fff',
              boxShadow: `0 10px 25px ${alpha(theme.palette.primary.main, 0.3)}`
            }}>
              <ShoppingCartIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={1000} sx={{ letterSpacing: '-0.02em', fontSize: { xs: '1.8rem', md: '2.5rem' } }}>GIỎ HÀNG</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ letterSpacing: 1.5, opacity: 0.6 }}>{extendedPurchases.length} SẢN PHẨM ĐANG CHỜ THANH TOÁN</Typography>
            </Box>
          </Stack>
        </motion.div>

        {extendedPurchases.length === 0 ? (
          <Paper sx={{ p: 10, borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: alpha(theme.palette.background.paper, 0.4), border: `2px dashed ${alpha(theme.palette.divider, 0.1)}` }}>
             <ShoppingCartIcon sx={{ fontSize: 80, opacity: 0.1, mb: 3 }} />
             <Typography variant="h6" fontWeight={700} sx={{ opacity: 0.5, mb: 3 }}>Giỏ hàng của bạn đang trống</Typography>
             <Button component={Link} to={path.home} variant="contained" sx={{ borderRadius: 100, px: 6, py: 1.5 }}>MUA SẮM NGAY</Button>
          </Paper>
        ) : (
          <Grid container spacing={4}>
            {/* LEFT COLUMN - PRODUCTS LIST */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Stack spacing={3}>
                {/* SELECT ALL HEADER */}
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 2, borderRadius: 3, 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    bgcolor: alpha(theme.palette.background.paper, 0.3),
                    border: `1px solid ${alpha(theme.palette.divider, 0.05)}`
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox checked={isAllChecked} onChange={handleCheckAll} size="small" />
                    <Typography variant="caption" fontWeight={900} sx={{ letterSpacing: 1, ml: 1 }}>CHỌN TẤT CẢ SẢN PHẨM</Typography>
                  </Box>
                  
                  {extendedPurchases.some(item => item.checked) && (
                    <Button 
                      startIcon={<DeleteOutlineIcon fontSize="small" />}
                      onClick={handleDeleteSelected}
                      sx={{ 
                        color: 'error.main', fontWeight: 1000, fontSize: '0.7rem',
                        '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.05) }
                      }}
                    >
                      XÓA MỤC ĐÃ CHỌN
                    </Button>
                  )}
                </Paper>

                <AnimatePresence>
                  {extendedPurchases.map((item, index) => {
                    const product = item.variant.product
                    const variant = item.variant
                    return (
                      <motion.div 
                        key={item.id} 
                        layout 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Box sx={{ 
                          position: 'relative',
                          display: 'flex', 
                          gap: { xs: 2, sm: 3 }, 
                          p: { xs: 2, sm: 3 }, 
                          borderRadius: 4, 
                          bgcolor: alpha(theme.palette.background.paper, 0.5),
                          backdropFilter: 'blur(30px)',
                          border: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
                          transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': { 
                            bgcolor: alpha(theme.palette.background.paper, 0.8),
                            transform: 'translateY(-4px)',
                            boxShadow: `0 20px 40px ${alpha(theme.palette.common.black, 0.04)}`,
                            borderColor: alpha(theme.palette.primary.main, 0.2)
                          } 
                        }}>
                          <Stack direction="row" alignItems="center" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                            <Checkbox checked={item.checked} onChange={() => handleCheck(item.id)} size='small' />
                          </Stack>

                          {/* Image */}
                          <Box sx={{ 
                            width: { xs: 100, sm: 120 }, height: { xs: 100, sm: 120 }, 
                            flexShrink: 0, borderRadius: 3, overflow: 'hidden',
                            bgcolor: (theme) => theme.palette.mode === 'dark' ? '#111' : '#f9f9f9',
                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                          }}>
                            <img 
                              src={variant.image_url || product.media.thumbnail || DEFAULT_PRODUCT_IMAGE} 
                              alt={product.name} 
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                            />
                          </Box>

                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                              <Box>
                                <Typography variant="caption" fontWeight={900} color="primary.main" sx={{ letterSpacing: 1, mb: 0.5, display: 'block' }}>
                                  {product.category?.name?.toUpperCase() || 'SẢN PHẨM'}
                                </Typography>
                                <Link to={`${path.home}${generateNameId({ name: product.name, id: variant.id })}`} style={{ textDecoration: 'none' }}>
                                  <Typography variant='h6' sx={{ color: 'text.primary', fontWeight: 1000, lineHeight: 1.2, mb: 1.5, fontSize: { xs: '1rem', sm: '1.2rem' }, '&:hover': { color: 'primary.main' } }}>
                                    {product.name}
                                  </Typography>
                                </Link>
                              </Box>
                              <IconButton onClick={() => handleDelete(item.variant_id)} size="small" sx={{ opacity: 0.3, '&:hover': { opacity: 1, color: 'error.main' } }}>
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Stack>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2, sm: 4 }} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                              <Box sx={{ display: 'inline-flex', flexWrap: 'wrap', gap: 1, px: 1.5, py: 0.6, borderRadius: '100px', bgcolor: alpha(theme.palette.action.hover, 0.05), border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                                <Typography variant="caption" fontWeight={1000} sx={{ fontSize: '0.7rem', color: 'text.secondary', textTransform: 'uppercase' }}>
                                  {variant.options && Object.keys(variant.options).length > 0
                                    ? Object.entries(variant.options).map(([k, v]) => `${k}: ${v}`).join(' / ')
                                    : 'Mặc định'}
                                </Typography>
                              </Box>

                              <Stack direction="row" alignItems="center" spacing={2}>
                                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ bgcolor: alpha(theme.palette.action.hover, 0.04), borderRadius: '100px', px: 1.5, py: 0.5, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleQuantityChange(index, item.quantity - 1)} 
                                    disabled={item.quantity <= 1}
                                    sx={{ width: 24, height: 24, fontSize: 10 }}
                                  >
                                    <RemoveIcon sx={{ fontSize: 'inherit' }} />
                                  </IconButton>
                                  <Typography variant="body2" fontWeight={1000}>{item.quantity}</Typography>
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleQuantityChange(index, item.quantity + 1)}
                                    sx={{ width: 24, height: 24, fontSize: 10 }}
                                  >
                                    <AddIcon sx={{ fontSize: 'inherit' }} />
                                  </IconButton>
                                </Stack>
                              </Stack>
                              
                              <Box sx={{ ml: { sm: 'auto' }, textAlign: 'right' }}>
                                {variant.price_before_discount && variant.price_before_discount > variant.price && (
                                  <Typography variant='caption' sx={{ textDecoration: 'line-through', color: 'text.disabled', fontWeight: 700, display: 'block' }}>
                                    ₫{variant.price_before_discount.toLocaleString()}
                                  </Typography>
                                )}
                                <Typography variant='h6' fontWeight={1000} color="text.primary">
                                  ₫{(variant.price * item.quantity).toLocaleString()}
                                </Typography>
                              </Box>
                            </Stack>
                          </Box>
                        </Box>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </Stack>
            </Grid>

            {/* RIGHT COLUMN - STICKY SUMMARY */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ position: 'sticky', top: 100 }}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 4, borderRadius: 6, 
                    bgcolor: alpha(theme.palette.background.paper, 0.6),
                    backdropFilter: 'blur(40px)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    boxShadow: `0 30px 60px ${alpha(theme.palette.common.black, 0.05)}`
                  }}
                >
                  <Typography variant="h6" fontWeight={1000} sx={{ mb: 4, letterSpacing: '-0.01em' }}>TỔNG ĐƠN HÀNG</Typography>
                  
                  <Stack spacing={2.5} sx={{ mb: 4 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary" fontWeight={700}>Tạm tính ({totalCheckedCount} món)</Typography>
                      <Typography variant="body1" fontWeight={900}>{formatCurrency(totalCheckedPrice)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary" fontWeight={700}>Phí vận chuyển</Typography>
                      <Typography variant="body1" fontWeight={900} color="success.main">MIỄN PHÍ</Typography>
                    </Stack>
                    {totalSaving > 0 && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="primary.main" fontWeight={700}>Tổng tiết kiệm</Typography>
                        <Typography variant="body1" fontWeight={900} color="primary.main">-{formatCurrency(totalSaving)}</Typography>
                      </Stack>
                    )}
                    <Divider sx={{ my: 1, borderStyle: 'dashed', opacity: 0.5 }} />
                    <Stack direction="column" spacing={1} sx={{ pt: 1 }}>
                      <Typography variant="body1" fontWeight={1000}>Tổng thanh toán</Typography>
                      <Box sx={{ textAlign: 'left' }}>
                        <Typography variant="h4" fontWeight={1000} color="primary.main" sx={{ lineHeight: 1.1, fontSize: { xs: '1.8rem', md: '2.2rem' }, letterSpacing: '-0.03em' }}>
                          {formatCurrency(totalCheckedPrice)}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.4, fontWeight: 700 }}>Đã bao gồm thuế (nếu có)</Typography>
                      </Box>
                    </Stack>
                  </Stack>

                  <Button 
                    variant='contained' 
                    fullWidth
                    disabled={totalCheckedCount === 0 || isPending} 
                    onClick={handleBuyAll}
                    sx={{ 
                      height: 64, borderRadius: 3, 
                      fontWeight: 1000, fontSize: '1.1rem', letterSpacing: 2,
                      background: theme.palette.text.primary,
                      color: theme.palette.background.paper,
                      transition: '0.3s',
                      boxShadow: `0 15px 40px ${alpha(theme.palette.common.black, 0.2)}`,
                      '&:hover': { 
                        background: alpha(theme.palette.text.primary, 0.9),
                        transform: 'translateY(-3px)',
                        boxShadow: `0 20px 50px ${alpha(theme.palette.common.black, 0.3)}`
                      }
                    }}
                  >
                    {isPending ? 'ĐANG XỬ LÝ...' : 'THANH TOÁN AN TOÀN'}
                  </Button>

                  <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3, opacity: 0.3 }}>
                    {/* Add trust symbols here */}
                    <Box component="img" src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" sx={{ height: 12 }} />
                    <Box component="img" src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" sx={{ height: 20 }} />
                    <Box component="img" src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" sx={{ height: 15 }} />
                  </Stack>
                </Paper>

                {/* Return Policy Card */}
                <Box sx={{ 
                  mt: 3, p: 2.5, borderRadius: 4, 
                  bgcolor: alpha(theme.palette.success.main, 0.03),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                  display: 'flex', gap: 2
                }}>
                  <Box sx={{ color: 'success.main', mt: 0.5 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={1000} sx={{ display: 'block', mb: 0.5 }}>TRẢ HÀNG MIỄN PHÍ TRONG 30 NGÀY</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>Yên tâm mua sắm với chính sách đổi trả linh hoạt của chúng tôi.</Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        )}
      </Container>
      <SuccessMessage open={isSuccessPopupOpen} onClose={handleClosePopup} message={'Đặt hàng thành công!'} />
      <CheckoutModal 
        open={isCheckoutModalOpen} 
        onClose={() => setIsCheckoutModalOpen(false)} 
        onConfirm={handleConfirmOrder}
        loading={isPending}
        totalAmount={totalCheckedPrice}
      />

      {/* MOBILE FLOATING ACTION BAR */}
      <Box sx={{ 
        display: { xs: 'block', md: 'none' },
        position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 1000
      }}>
        {extendedPurchases.length > 0 && totalCheckedCount > 0 && (
           <Paper 
            elevation={10}
            sx={{ 
              p: 2, borderRadius: 5, 
              bgcolor: alpha(theme.palette.background.paper, 0.9),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              boxShadow: `0 20px 50px rgba(0,0,0,0.3)`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}
           >
              <Box>
                <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.5 }}>TỔNG CỘNG</Typography>
                <Typography variant="h6" fontWeight={1000} color="primary.main">{formatCurrency(totalCheckedPrice)}</Typography>
              </Box>
              <Button 
                variant="contained" 
                onClick={handleBuyAll}
                disabled={isPending}
                sx={{ 
                  borderRadius: 100, px: 4, height: 48, fontWeight: 1000, fontSize: '0.85rem',
                  background: theme.palette.text.primary,
                  color: theme.palette.background.paper
                }}
              >
                THANH TOÁN
              </Button>
           </Paper>
        )}
      </Box>
    </Box>
  )
}

export default Cart
