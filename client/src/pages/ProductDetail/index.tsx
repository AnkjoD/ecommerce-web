// src/pages/ProductDetail/index.tsx
import { useContext, useMemo, useState, useRef } from 'react'
import {
  Box,
  Container,
  Typography,
  Stack,
  Button,
  Paper,
  Rating,
  Skeleton,
  Breadcrumbs,
  Link,
  Divider,
  Chip,
  IconButton,
  Collapse
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { motion, AnimatePresence } from 'framer-motion'

// Icons
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import LocalActivityIcon from '@mui/icons-material/LocalActivity'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'

// Components & API
import ProductImages from './ProductImages'
import InputNumber from '~/components/InputNumber'

import productApi from '~/apis/product.api'
import couponApi from '~/apis/coupon.api'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate, Link as RouterLink } from 'react-router'
import ProductInfoTabs from './ProductInfoTabs'
import { getIdFromNameId, generateNameId } from '~/utils/url'
import useBuyPurchases from '~/hooks/useBuyPurchases'
import useAddToCart from '~/hooks/useAddToCart'
import SuccessMessage from '~/components/SuccessMessage'
import NotFound from '~/pages/NotFound'
import SEO from '~/components/SEO'
import path from '~/constants/path'
import { AppContext } from '~/contexts/app.context'
import FlyingProduct from './FlyingProduct'
import { toast } from 'react-toastify'

const DEFAULT_PRODUCT_IMAGE = 'https://placehold.co/600x400?text=Homura+Mall'

export default function ProductDetail() {
  const theme = useTheme()
  const { isAuthenticated, setFlyingData } = useContext(AppContext)
  const navigate = useNavigate()
  const imageRef = useRef<HTMLImageElement>(null)

  const handleAuthAction = (callback: () => void) => {
    if (!isAuthenticated) {
      navigate(path.login)
      return
    }
    callback()
  }
  const { nameId } = useParams()
  const currentVariantId = getIdFromNameId(nameId as string)

  const {
    data: variantResponse,
    isLoading: isLoadingVariant,
    isError
  } = useQuery({
    queryKey: ['product', currentVariantId],
    queryFn: () => productApi.getProduct(currentVariantId),
    enabled: !!currentVariantId,
    staleTime: 1000 * 60
  })

  // 🚀 FETCH ACTIVE COUPONS
  const { data: couponsRes } = useQuery({
    queryKey: ['active-coupons'],
    queryFn: () => couponApi.getActiveCoupons(),
    staleTime: 1000 * 60 * 10 // 10 mins
  })

  const coupons = useMemo(() => couponsRes?.data.data || [], [couponsRes])

  const fetchedVariant = variantResponse?.data.data
  const parentProductId = fetchedVariant?.product?.id

  const { data: variantsResponse } = useQuery({
    queryKey: ['variants', parentProductId],
    queryFn: () => productApi.getVariants(parentProductId as string),
    enabled: !!parentProductId,
    staleTime: 1000 * 60 * 5
  })

  const allVariants = useMemo(() => variantsResponse?.data.data || [], [variantsResponse])

  const currentVariant = useMemo(() => {
    // 🚀 INSTANT SWITCH: Find variant in pre-loaded allVariants first to avoid flickering
    const inAll = allVariants.find(v => v.id === currentVariantId)
    if (inAll) return inAll
    return fetchedVariant
  }, [allVariants, currentVariantId, fetchedVariant])

  // 🚀 ELITE DYNAMIC OPTIONS LOGIC
  const optionKeys = useMemo(() => {
    const normMap = new Map<string, string>()
    allVariants.forEach(v => {
      if (v.options) {
        Object.keys(v.options).forEach(origKey => {
          const norm = origKey.trim().toLowerCase()
          if (!normMap.has(norm)) normMap.set(norm, origKey)
        })
      }
    })
    
    const keys = Array.from(normMap.values())
    const order = fetchedVariant?.product?.attribute_order || []
    
    if (order.length === 0) return keys
    
    return keys.sort((a, b) => {
      const idxA = order.findIndex((o: string) => o.trim().toLowerCase() === a.trim().toLowerCase())
      const idxB = order.findIndex((o: string) => o.trim().toLowerCase() === b.trim().toLowerCase())
      if (idxA === -1 && idxB === -1) return 0
      if (idxA === -1) return 1
      if (idxB === -1) return -1
      return idxA - idxB
    })
  }, [allVariants, fetchedVariant])

  // 🚀 REDIRECT TO PRIMARY VARIANT
  useMemo(() => {
    if (fetchedVariant && allVariants.length > 0) {
      const primaryId = fetchedVariant.product?.primary_variant_id
      if (primaryId && currentVariant?.sku !== primaryId && !nameId?.includes('-v')) {
         const primary = allVariants.find(v => v.sku === primaryId)
         if (primary) {
           navigate(`${path.home}${generateNameId({ name: primary.product.name, id: primary.id })}`, { replace: true })
         }
      }
    }
  }, [fetchedVariant, allVariants, currentVariant, nameId, navigate])

  const getOptionsValues = (displayKey: string) => {
    const normKey = displayKey.trim().toLowerCase()
    const values = new Set<string>()
    allVariants.forEach(v => {
      const actualKey = Object.keys(v.options || {}).find(k => k.trim().toLowerCase() === normKey)
      if (actualKey && v.options[actualKey]) values.add(v.options[actualKey])
    })
    return Array.from(values)
  }

  const isOptionValueAvailable = (displayKey: string, value: string) => {
    const normTarget = displayKey.trim().toLowerCase()
    return allVariants.some(v => {
      const vOptions = v.options || {}
      const vMatchKey = Object.keys(vOptions).find(k => k.trim().toLowerCase() === normTarget)
      if (!vMatchKey || vOptions[vMatchKey] !== value) return false

      // Must have some stock
      if ((v.stock_quantity - (v.reserved_quantity || 0)) <= 0) return false

      // Check against current selections (excluding the one we are testing)
      return Object.entries(currentVariant?.options || {}).every(([selKey, selVal]) => {
        const normSelKey = selKey.trim().toLowerCase()
        if (normSelKey === normTarget) return true
        const vKeyMatch = Object.keys(vOptions).find(k => k.trim().toLowerCase() === normSelKey)
        return vKeyMatch && vOptions[vKeyMatch] === selVal
      })
    })
  }

  const handleSwitchOption = (displayKey: string, value: string) => {
    const normTarget = displayKey.trim().toLowerCase()
    const nextOptions = { ...(currentVariant?.options || {}) }
    
    // Update the specific option
    const targetKey = Object.keys(nextOptions).find(k => k.trim().toLowerCase() === normTarget) || displayKey
    nextOptions[targetKey] = value

    // Find best match
    let match = allVariants.find(v => {
      const vOptions = v.options || {}
      return Object.entries(nextOptions).every(([k, vVal]) => {
        const vKey = Object.keys(vOptions).find(key => key.trim().toLowerCase() === k.trim().toLowerCase())
        return vKey && vOptions[vKey] === vVal
      })
    })

    // If no perfect match, find a partial match (with this value at least)
    if (!match) {
      match = allVariants.find(v => {
        const vKey = Object.keys(v.options || {}).find(k => k.trim().toLowerCase() === normTarget)
        return vKey && v.options[vKey] === value
      })
    }

    if (match) {
      navigate(`${path.home}${generateNameId({ name: match.product.name, id: match.id })}`, { replace: true })
    }
  }

  const imageList = useMemo(() => {
    if (!currentVariant) return [DEFAULT_PRODUCT_IMAGE]
    const productMeta = currentVariant.product
    const baseImages = productMeta.media?.images?.length > 0 ? productMeta.media.images : [currentVariant.image_url || DEFAULT_PRODUCT_IMAGE]
    
    if (currentVariant.image_url) {
        const filtered = baseImages.filter(img => img !== currentVariant.image_url)
        return [currentVariant.image_url, ...filtered]
    }
    return baseImages
  }, [currentVariant])

  const { 
    addToCart: addToCartMutation, 
    isPending: isAddToCartPending 
  } = useAddToCart()

  const {
    isSuccessPopupOpen: isSuccessPopupOpenBP,
    handleClosePopup: handleClosePopupBP,
    isPending: isBuyNowPending
  } = useBuyPurchases()

  const [buyQuantity, setBuyQuantity] = useState(1)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)

  const productMeta = currentVariant?.product
  const stockAvailable = (currentVariant?.stock_quantity ?? 0) - (currentVariant?.reserved_quantity ?? 0)
  const price = currentVariant?.price ?? 0
  const originalPrice = currentVariant?.price_before_discount || 0

  const handleAddToCart = () => {
    handleAuthAction(() => {
	  const rect = imageRef.current?.getBoundingClientRect()
	  if (rect) {
		setFlyingData({
		  image: currentVariant?.image_url || productMeta?.media?.thumbnail || DEFAULT_PRODUCT_IMAGE,
		  startPos: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
		})
	  }
      addToCartMutation({ variant_id: currentVariantId as string, quantity: buyQuantity } as any)
    })
  }

  const handleBuyNow = () => {
    handleAuthAction(() => {
      addToCartMutation(
        { variant_id: currentVariantId as string, quantity: buyQuantity, skipOpen: true } as any,
        { onSuccess: () => { navigate(path.cart) } }
      )
    })
  }

  const copyVoucher = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success(`Đã sao chép mã: ${code}`, { position: 'bottom-center', autoClose: 2000 })
  }

  const variantButtonSx = (isActive: boolean, isAvailable: boolean) => ({
    borderRadius: 2, 
    px: 2.5, py: 1,
    flexShrink: 0,
    fontWeight: 700,
    minWidth: 80,
    height: 40,
    border: (theme: any) => `1px ${isAvailable ? 'solid' : 'dashed'} ${isActive ? theme.palette.primary.main : alpha(theme.palette.divider, 0.4)}`,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: isAvailable ? 1 : 0.4,
    pointerEvents: isAvailable ? 'auto' : 'none',
    cursor: isAvailable ? 'pointer' : 'not-allowed',
    bgcolor: isActive ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
    color: isActive ? 'primary.main' : (isAvailable ? 'text.primary' : 'text.disabled'),
    position: 'relative',
    overflow: 'hidden',
    '&:hover': {
      borderColor: (theme: any) => theme.palette.primary.main,
      bgcolor: (theme: any) => isActive ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.primary.main, 0.04),
      color: 'primary.main',
      transform: isAvailable ? 'translateY(-1px)' : 'none'
    },
    '&::after': isAvailable ? {} : {
      content: '""',
      position: 'absolute',
      width: '150%', height: '1px',
      background: (theme: any) => alpha(theme.palette.text.disabled, 0.6),
      top: '50%', left: '-25%',
      transform: 'rotate(-15deg)',
      zIndex: 1
    }
  })

  if (isError) return <NotFound />

  if (isLoadingVariant && !currentVariant && !allVariants.length) {
    return (
      <Box sx={{ bgcolor: 'background.default', pb: 5, pt: 2, minHeight: '100vh' }}>
        <Container maxWidth='lg'>
          <Box sx={{ pt: 3, mb: 2 }}>
            <Skeleton variant="text" width={200} height={20} />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
             <Skeleton variant="rectangular" height={500} sx={{ flex: 1, borderRadius: 6 }} />
             <Skeleton variant="rectangular" height={500} sx={{ flex: 1, borderRadius: 6 }} />
          </Box>
        </Container>
      </Box>
    )
  }

  if (!currentVariant) return null

  return (
    <Box sx={{ bgcolor: 'background.default', pb: { xs: 15, md: 8 }, minHeight: '100vh' }}>
      <SEO
        title={`${productMeta?.name || ''} | ${currentVariant?.options ? Object.values(currentVariant.options).join(' ') : ''}`}
        description={productMeta?.description?.short}
        image={currentVariant?.image_url || productMeta?.media?.thumbnail}
      />
      
      <Container maxWidth='lg' sx={{ pt: { xs: 0, md: 2 }, px: { xs: 0, sm: 2, md: 3 } }}>
        <Box sx={{ display: { xs: 'none', md: 'block' }, pt: 3 }}>
           <Breadcrumbs separator={<NavigateNextIcon fontSize='small' sx={{ opacity: 0.5 }} />} sx={{ mb: 2, fontSize: '0.85rem' }}>
             <Link component={RouterLink} to={path.home} underline='hover' color='inherit' sx={{ opacity: 0.7 }}>Trang chủ</Link>
             <Link component={RouterLink} to={path.products} underline='hover' color='inherit' sx={{ opacity: 0.7 }}>{productMeta?.category?.name || 'Sản phẩm'}</Link>
             <Typography color='text.primary' fontWeight={800}>{productMeta?.name?.substring(0, 30)}...</Typography>
           </Breadcrumbs>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 0, md: 5 } }}>
            <Box sx={{ 
                flex: { xs: '1 1 100%', md: '0 0 520px' }, // Fixed width on desktop to prevent squeezing
                maxWidth: { xs: '100%', md: '520px' },
                position: { md: 'sticky' },
                top: { md: 100 },
                height: 'fit-content'
            }}>
                <Paper elevation={0} sx={{ p: { xs: 0, md: 0 }, borderRadius: { xs: 0, md: 6 }, bgcolor: 'transparent' }}>
                    <ProductImages ref={imageRef} images={imageList} productName={productMeta?.name} />
                </Paper>
            </Box>

            <Box sx={{ flex: 1, mt: { xs: 2, md: 0 }, zIndex: 10 }}>
                <Paper 
                    elevation={0} 
                    sx={{ 
                        p: { xs: 3.5, md: 5 }, 
                        borderRadius: { xs: 4, md: 8 }, 
                        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.6), 
                        border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        backdropFilter: 'blur(40px) saturate(180%)',
                        boxShadow: (theme) => `0 20px 60px ${alpha(theme.palette.common.black, 0.03)}`,
                    }}
                >
                  <Typography variant='h4' fontWeight={900} sx={{ mb: 1.5, fontSize: { xs: '1.4rem', md: '2.2rem' }, lineHeight: 1.2, letterSpacing: -1 }}>{productMeta?.name}</Typography>

                  <Stack direction='row' alignItems='center' spacing={2} sx={{ mb: 2 }}>
                    <Stack direction='row' spacing={0.5} alignItems="center">
                       <Rating value={productMeta?.rating_avg || 0} readOnly size='small' precision={0.5} />
                    </Stack>
                    <Typography variant='caption' fontWeight={900} color='primary.main' sx={{ letterSpacing: 1 }}>{productMeta?.rating_avg?.toFixed(1) || '0.0'}</Typography>
                    <Divider orientation="vertical" flexItem sx={{ height: 12, my: 'auto', opacity: 0.2 }} />
                    <Typography variant='caption' fontWeight={900} color='text.secondary' sx={{ letterSpacing: 0.5, opacity: 0.6 }}>
                      {currentVariant?.sold_count || productMeta?.sold_count || 0} LƯỢT MUA
                    </Typography>
                  </Stack>

                  {/* 🏷️ TAGS SECTION */}
                  {productMeta?.tags && productMeta.tags.length > 0 && (
                    <Stack direction="row" spacing={1} sx={{ mb: 4, flexWrap: 'wrap', gap: 1 }}>
                        {productMeta.tags.map((tag: string) => (
                            <Chip 
                                key={tag} 
                                label={tag} 
                                size="small" 
                                variant="outlined"
                                sx={{ 
                                    borderRadius: 1, 
                                    fontSize: '0.65rem', 
                                    fontWeight: 800, 
                                    textTransform: 'uppercase',
                                    borderColor: (theme) => alpha(theme.palette.divider, 0.1),
                                    bgcolor: (theme) => alpha(theme.palette.divider, 0.03),
                                    color: 'text.secondary'
                                }} 
                            />
                        ))}
                    </Stack>
                  )}

                  <Stack direction='row' alignItems='baseline' spacing={2} sx={{ mb: 4, p: 3, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05), borderRadius: 4, border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.08)}` }}>
                    <Typography variant='h3' fontWeight={900} color='primary.main' sx={{ fontSize: { xs: '1.8rem', md: '2.8rem' }, letterSpacing: -1 }}>{formatCurrency(price)}</Typography>
                    {originalPrice > price && (
                      <Typography variant='body1' sx={{ textDecoration: 'line-through', opacity: 0.3, fontWeight: 700 }}>{formatCurrency(originalPrice)}</Typography>
                    )}
                  </Stack>

                  {/* 🚀 ELITE VOUCHER CENTER INTEGRATION */}
                  {coupons.length > 0 && (
                    <Box sx={{ mb: 5 }}>
                        <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ letterSpacing: 2, fontSize: '0.65rem', textTransform: 'uppercase', mb: 2, display: 'block', opacity: 0.5 }}>ƯU ĐÃI ĐẶC QUYỀN</Typography>
                        <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
                            {coupons.slice(0, 3).map((coupon) => (
                                <Box 
                                    key={coupon.id}
                                    onClick={() => copyVoucher(coupon.code)}
                                    sx={{ 
                                        flexShrink: 0,
                                        p: 1.5, px: 2,
                                        borderRadius: 2,
                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                                        border: (theme) => `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex', alignItems: 'center', gap: 1.5,
                                        '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1), transform: 'translateY(-2px)' }
                                    }}
                                >
                                    <LocalActivityIcon sx={{ fontSize: 18, color: 'primary.main', opacity: 0.6 }} />
                                    <Box>
                                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, color: 'primary.main', lineHeight: 1 }}>{coupon.code}</Typography>
                                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: 'text.secondary', mt: 0.3 }}>
                                           Giảm {coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : `${(coupon.discount_value/1000).toFixed(0)}k`}
                                        </Typography>
                                    </Box>
                                </Box>
                            ))}
                            <IconButton size="small" sx={{ bgcolor: alpha(theme.palette.divider, 0.05), border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                               <KeyboardArrowRightIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    </Box>
                  )}

                  <Stack spacing={4}>
                    {optionKeys.map(key => (
                      <Stack key={key} spacing={2}>
                        <Typography variant='caption' fontWeight={900} color='text.secondary' sx={{ letterSpacing: 2, fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.6 }}>{key}</Typography>
                        <Stack direction='row' spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
                          {getOptionsValues(key).map(value => {
                            const isAvailable = isOptionValueAvailable(key, value)
                            const isActive = currentVariant?.options?.[Object.keys(currentVariant.options).find(k => k.trim().toLowerCase() === key.trim().toLowerCase()) as string] === value
                            return (
                              <Button key={value} variant={isActive ? 'contained' : 'outlined'} onClick={() => handleSwitchOption(key, value)} sx={variantButtonSx(isActive, isAvailable)}>
                                {value}
                              </Button>
                            )
                          })}
                        </Stack>
                      </Stack>
                    ))}

                    <Stack direction='row' alignItems='center' spacing={3} sx={{ pt: 1 }}>
                      <Typography variant='caption' fontWeight={900} color='text.secondary' sx={{ minWidth: 80, letterSpacing: 1, opacity: 0.6 }}>SỐ LƯỢNG</Typography>
                      <Stack direction='row' alignItems='center' spacing={2}>
                        <InputNumber max={stockAvailable} value={buyQuantity} onChange={setBuyQuantity} />
                        <Typography variant='caption' color='text.secondary' fontWeight={800} sx={{ opacity: 0.6 }}>{stockAvailable} SP còn lại</Typography>
                      </Stack>
                    </Stack>
                  </Stack>

                  <Stack direction='row' spacing={2} sx={{ mt: 6, display: { xs: 'none', md: 'flex' } }}>
                    <Button 
                      fullWidth variant='outlined' 
                      disabled={isAddToCartPending}
                      onClick={handleAddToCart}
                      sx={{ borderRadius: 100, height: 64, fontWeight: 900, borderWidth: 2, fontSize: '0.9rem', boxShadow: 'none' }}
                    >
                      {isAddToCartPending ? '...' : 'THÊM VÀO GIỎ'}
                    </Button>
                    <Button 
                      fullWidth variant='contained' 
                      disabled={isBuyNowPending || isAddToCartPending}
                      onClick={handleBuyNow}
                      sx={{ 
                        borderRadius: 100, height: 64, fontWeight: 900, fontSize: '0.9rem', 
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                        boxShadow: `0 20px 50px ${alpha(theme.palette.primary.main, 0.3)}`,
                        '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 25px 60px ${alpha(theme.palette.primary.main, 0.4)}` }
                      }}
                    >
                      {isBuyNowPending ? '...' : 'MUA NGAY'}
                    </Button>
                  </Stack>
                </Paper>
            </Box>
        </Box>

        <Box sx={{ mt: { xs: 4, md: 10 } }}>
            <ProductInfoTabs product={currentVariant} />
        </Box>
      </Container>

      <SuccessMessage open={isSuccessPopupOpenBP} onClose={handleClosePopupBP} message='Đặt hàng thành công!' />
    </Box>
  )
}
