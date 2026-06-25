import React, { useContext, useMemo } from 'react'
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Stack,
  Button,
  alpha,
  useTheme,
  Divider,
  Badge
} from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'
import CloseIcon from '@mui/icons-material/Close'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import { AppContext } from '~/contexts/app.context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import purchaseApi from '~/apis/purchase.api'
import { purchaseStatus } from '~/constants/purchase'
import formatCurrency from '~/utils/formatCurrency'
import { useNavigate } from 'react-router'
import path from '~/constants/path'

const AsideCart = () => {
    const theme = useTheme()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { isOpenAsideCart, setIsOpenAsideCart, isAuthenticated } = useContext(AppContext)

    // 1. Data Fetching
    const { data: purchaseData } = useQuery({
        queryKey: ['purchases', { status: Number(purchaseStatus.inCart) }],
        queryFn: () => purchaseApi.getPurchases({ status: Number(purchaseStatus.inCart) }),
        enabled: isAuthenticated && isOpenAsideCart
    })

    const cart = purchaseData?.data?.data
    const cartItems = cart?.items || []

    // 2. Mutations
    const updateCartMutation = useMutation({
        mutationFn: (body: { variantId: string, quantity: number }) => 
            purchaseApi.updatePurchase(body.variantId, body.quantity),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchases', { status: purchaseStatus.inCart }] })
        }
    })

    const deleteCartMutation = useMutation({
        mutationFn: (variantId: string) => purchaseApi.deletePurchases(variantId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchases', { status: purchaseStatus.inCart }] })
        }
    })

    const handleQuantity = (variantId: string, currentQty: number, change: number) => {
        const newQty = currentQty + change
        if (newQty < 1) return
        updateCartMutation.mutate({ variantId, quantity: newQty })
    }

    // 3. Animations
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const itemVariants = {
        hidden: { x: 20, opacity: 0 },
        visible: { x: 0, opacity: 1 }
    }

    return (
        <Drawer
            anchor="right"
            open={isOpenAsideCart}
            onClose={() => setIsOpenAsideCart(false)}
            PaperProps={{
                sx: {
                    width: { xs: '100%', sm: 400 },
                    bgcolor: alpha(theme.palette.background.default, 0.8),
                    backdropFilter: 'blur(30px) saturate(180%)',
                    backgroundImage: 'none',
                    boxShadow: '-10px 0 40px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column'
                }
            }}
        >
            {/* Header - Elite Minimalist */}
            <Box sx={{ 
                p: { xs: 2.5, sm: 3 }, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
                bgcolor: alpha(theme.palette.background.paper, 0.2)
            }}>
                <Box>
                    <Typography variant="h6" fontWeight={1000} sx={{ letterSpacing: '-0.02em', mb: -0.5, fontSize: { xs: '1.2rem', sm: '1.4rem' } }}>
                        YOUR CURATION
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ opacity: 0.5, letterSpacing: 1.5 }}>
                        {cartItems.length} ITEMS SELECTED
                    </Typography>
                </Box>
                <IconButton 
                    onClick={() => setIsOpenAsideCart(false)}
                    sx={{ 
                        width: 40, height: 40,
                        bgcolor: alpha(theme.palette.action.hover, 0.05),
                        '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main' }
                    }}
                >
                    <CloseIcon sx={{ fontSize: 20 }} />
                </IconButton>
            </Box>

            {/* Content Area - Clean Vertical Stack */}
            <Box sx={{ 
                flexGrow: 1, 
                overflowY: 'auto', 
                p: { xs: 2, sm: 2.5 },
                '&::-webkit-scrollbar': { width: 3 },
                '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                '&::-webkit-scrollbar-thumb': { bgcolor: alpha(theme.palette.divider, 0.1), borderRadius: 10 }
            }}>
                {cartItems.length === 0 ? (
                    <Stack sx={{ height: '100%', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }} spacing={3}>
                        <Box sx={{ 
                             width: 100, height: 100, borderRadius: '50%', 
                             display: 'flex', alignItems: 'center', justifyContent: 'center',
                             border: `1px dashed ${alpha(theme.palette.divider, 0.3)}`
                        }}>
                            <ShoppingCartOutlinedIcon sx={{ fontSize: 30, opacity: 0.2 }} />
                        </Box>
                        <Box>
                            <Typography variant="body1" fontWeight={800} sx={{ color: 'text.secondary' }}>Giỏ hàng bạn trống</Typography>
                        </Box>
                        <Button 
                            variant="outlined" 
                            onClick={() => { navigate(path.products); setIsOpenAsideCart(false) }}
                            sx={{ borderRadius: 0, px: 4, py: 1.5, fontWeight: 900, borderColor: 'text.primary', color: 'text.primary' }}
                        >
                            BROWSE COLLECTION
                        </Button>
                    </Stack>
                ) : (
                    <motion.div variants={containerVariants} initial="hidden" animate="visible">
                        <Stack spacing={3}>
                            {cartItems.map((item) => (
                                <motion.div key={item.id} variants={itemVariants} layout>
                                    <Box sx={{ 
                                        position: 'relative',
                                        display: 'flex', 
                                        gap: { xs: 2, sm: 2.5 }, 
                                        p: 2, 
                                        borderRadius: 0, 
                                        bgcolor: 'transparent',
                                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                                        transition: 'all 0.3s ease',
                                        '&:hover': { 
                                            bgcolor: alpha(theme.palette.action.hover, 0.02),
                                        }
                                    }}>
                                        {/* Minimalist Image */}
                                        <Box sx={{ 
                                            position: 'relative',
                                            width: { xs: 80, sm: 95 }, 
                                            height: { xs: 80, sm: 95 }, 
                                            flexShrink: 0, 
                                            bgcolor: (theme) => theme.palette.mode === 'dark' ? '#111' : '#f9f9f9',
                                            border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            p: 1
                                        }}>
                                            <img 
                                                src={item.variant.image_url || item.variant.product.media.thumbnail} 
                                                alt={item.variant.product.name} 
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                                            />
                                        </Box>

                                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                                                <Box sx={{ pr: 3 }}>
                                                    <Typography variant="caption" fontWeight={900} color="primary.main" sx={{ display: 'block', mb: 0.2, letterSpacing: 1 }}>
                                                        {item.variant.product.category?.name?.toUpperCase() || 'COLLECTION'}
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={1000} sx={{ fontSize: '0.95rem', lineHeight: 1.2 }}>
                                                        {item.variant.product.name}
                                                    </Typography>
                                                </Box>
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => deleteCartMutation.mutate(item.variant.id)}
                                                    sx={{ 
                                                        position: 'absolute', top: 5, right: 5,
                                                        opacity: 0, 
                                                        '.MuiBox-root:hover &': { opacity: 0.5 },
                                                        '&:hover': { opacity: 1, color: 'error.main' },
                                                        transition: '0.2s'
                                                    }}
                                                >
                                                    <CloseIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Stack>

                                            <Typography variant="caption" sx={{ display: 'flex', gap: 1, mb: 2, color: 'text.secondary', fontWeight: 700 }}>
                                                {item.variant.color && <span>{item.variant.color.toUpperCase()}</span>}
                                                {item.variant.size && <span>/ {item.variant.size.toUpperCase()}</span>}
                                            </Typography>
                                            
                                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 'auto' }}>
                                                {/* Boutique Pill Quantity Control */}
                                                <Box sx={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: 1.5, 
                                                    bgcolor: alpha(theme.palette.action.hover, 0.04), 
                                                    borderRadius: '100px', 
                                                    px: 1, py: 0.5,
                                                    border: `1px solid ${alpha(theme.palette.divider, 0.08)}`
                                                }}>
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={() => handleQuantity(item.variant.id, item.quantity, -1)} 
                                                        disabled={item.quantity <= 1 || updateCartMutation.isPending}
                                                        sx={{ width: 22, height: 22, fontSize: 10, color: 'text.secondary' }}
                                                    >
                                                        <RemoveIcon sx={{ fontSize: 'inherit' }} />
                                                    </IconButton>
                                                    <Typography variant="caption" fontWeight={1000} sx={{ minWidth: 15, textAlign: 'center' }}>
                                                        {item.quantity}
                                                    </Typography>
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={() => handleQuantity(item.variant.id, item.quantity, 1)}
                                                        disabled={updateCartMutation.isPending}
                                                        sx={{ width: 22, height: 22, fontSize: 10, color: 'text.secondary' }}
                                                    >
                                                        <AddIcon sx={{ fontSize: 'inherit' }} />
                                                    </IconButton>
                                                </Box>
                                                
                                                <Typography variant="subtitle2" fontWeight={1000} color="text.primary">
                                                    {formatCurrency(Number(item.variant.price) * item.quantity)}
                                                </Typography>
                                            </Stack>
                                        </Box>
                                    </Box>
                                </motion.div>
                            ))}
                        </Stack>
                    </motion.div>
                )}
            </Box>

            {/* Footer - Floating Clean Section */}
            {cartItems.length > 0 && (
                <Box sx={{ 
                    p: { xs: 3, sm: 4 }, 
                    bgcolor: 'background.paper',
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                }}>
                    <Stack spacing={3}>
                        <Box>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mb: 1 }}>
                                <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ letterSpacing: 2 }}>TỔNG TIỀN</Typography>
                                <Typography variant="h5" fontWeight={1000} color="primary.main" sx={{ lineHeight: 1 }}>
                                    {formatCurrency(cart?.subtotal || 0)}
                                </Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.4, fontStyle: 'italic' }}>
                                Đã tính thuế và giá sản phẩm
                            </Typography>
                        </Box>

                        <Button 
                            variant="contained" 
                            fullWidth 
                            size="large" 
                            onClick={() => { navigate(path.cart); setIsOpenAsideCart(false) }}
                            sx={{ 
                                borderRadius: 0, 
                                height: 56, 
                                fontWeight: 1000, 
                                fontSize: '0.9rem',
                                letterSpacing: 2,
                                background: theme.palette.text.primary,
                                color: theme.palette.background.paper,
                                boxShadow: 'none',
                                '&:hover': { 
                                    background: alpha(theme.palette.text.primary, 0.85),
                                    boxShadow: `0 10px 40px ${alpha(theme.palette.common.black, 0.2)}`,
                                    transform: 'translateY(-2px)'
                                }
                            }}
                        >
                           MUA NGAY
                        </Button>
                        <Button 
                            variant="text" 
                            fullWidth 
                            color="inherit" 
                            onClick={() => setIsOpenAsideCart(false)}
                            sx={{ fontWeight: 900, fontSize: '0.75rem', letterSpacing: 1, opacity: 0.4, '&:hover': { opacity: 1, bgcolor: 'transparent' } }}
                        >
                            TIẾP TỤC MUA SẮM
                        </Button>
                    </Stack>
                </Box>
            )}
        </Drawer>
    )
}

export default AsideCart
