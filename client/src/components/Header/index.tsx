//Ham mui
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import IconButton from '@mui/material/IconButton'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Badge from '@mui/material/Badge'

// Các icon giữ chỗ
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import { AppTooltip } from '~/components/AppTooltip'
import AccountMenu from './AccountMenu'
import Logo from '../Logo'
import { useNavigate } from 'react-router'
import purchaseApi from '~/apis/purchase.api'
import { purchaseStatus } from '~/constants/purchase'
import { useQuery } from '@tanstack/react-query'
import formatCurrency from '~/utils/formatCurrency'
import useUserProfile from '~/hooks/useUserProfile'
import { type User } from '~/types/user.type'
import path from '~/constants/path'
import { AppContext } from '~/contexts/app.context'
import { useContext, useEffect, useState } from 'react'
import SearchInput from './SearchInput'
import { alpha } from '@mui/material/styles'
import ThemeToggleBtn from '../ThemeToggleBtn'
import { motion, AnimatePresence } from 'framer-motion'

export default function Header() {
  const navigate = useNavigate()

  const { isAuthenticated, setIsOpenAsideCart, cartIconRef, cartBumpCount } = useContext(AppContext)
  const [displayCount, setDisplayCount] = useState(0)

  // 1. DATA FETCHING - NEW STRUCTURE
  const { data: purchaseData } = useQuery({
    queryKey: ['purchases', { status: purchaseStatus.inCart }],
    queryFn: () => {
      if (isAuthenticated) {
        return purchaseApi.getPurchases({ status: purchaseStatus.inCart })
      }
    },
    enabled: isAuthenticated,
    retry: 0 // Tắt tự động thử lại nếu 401
  })

  // Bóc tách cart từ response
  const cart = purchaseData?.data?.data
  const cartItems = cart?.items || []

  const { profile }: { profile: User | null } = useUserProfile()

  // 🔄 ĐỒNG BỘ SỐ LƯỢNG HIỂN THỊ (OPTIMISTIC UI)
  // Khi dữ liệu thật từ Server về, cập nhật lại số hiển thị
  useEffect(() => {
    if (cart?.total_items !== undefined) {
      setDisplayCount(cart.total_items)
    }
  }, [cart?.total_items])

  // Khi có hiệu ứng Bump (Sản phẩm chạm giỏ), tăng số hiển thị ngay lập tức (không đợi Server)
  useEffect(() => {
    if (cartBumpCount > 0) {
      setDisplayCount(prev => prev + 1)
    }
  }, [cartBumpCount])

  return (
    <AppBar
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1100,
        // The rest is handled by theme overrides (backdropFilter, bgcolor alpha)
      }}
    >
      <Container maxWidth='xl'>
        <Box sx={{ display: { md: 'none', xs: 'flex' }, justifyContent: 'center', pt: 2 }}>
          <Logo size='medium' sx={{ display: { md: 'none', xs: 'flex' } }} />
        </Box>

        <Toolbar disableGutters sx={{ minHeight: '80px', display: 'flex', alignItems: 'center' }}>
          {/* LOGO SECTION */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', mr: 2 }}>
            <Logo size='medium' />
          </Box>

          {/* NAV LINKS SECTION */}
          <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 2, mr: 4 }}>
            <Button 
              onClick={() => navigate(path.home)}
              sx={{ color: 'inherit', fontWeight: 700, textTransform: 'none', fontSize: '15px' }}
            >
              Trang Chủ
            </Button>
            <Button 
              onClick={() => navigate(path.products)}
              sx={{ color: 'inherit', fontWeight: 700, textTransform: 'none', fontSize: '15px' }}
            >
              Sản phẩm
            </Button>
          </Box>

          {/* SEARCH SECTION */}
          <SearchInput />

          {/* ACTIONS SECTION */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ThemeToggleBtn />
            </Box>
            
            {/* 🛒 ELITE CART ICON WITH BUMP (SHAKE) EFFECT */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton 
                ref={cartIconRef as any}
                color="inherit" 
                onClick={() => {
                  if (isAuthenticated) {
                    setIsOpenAsideCart(true)
                  } else {
                    navigate(path.login)
                  }
                }}
              >
                <Badge 
                  badgeContent={displayCount} 
                  color="error" 
                  sx={{ 
                    '& .MuiBadge-badge': { 
                      fontSize: 10, 
                      height: 18, 
                      minWidth: 18,
                      fontWeight: 900
                    } 
                  }}
                >
                  <AnimatePresence mode='wait'>
                    <Box
                      component={motion.div}
                      key={cartBumpCount}
                      initial={{ scale: 1 }}
                      animate={cartBumpCount > 0 ? { 
                        scale: [1, 1.3, 1],
                        rotate: [0, 15, -15, 10, -10, 0],
                        y: [0, -5, 0]
                      } : {}}
                      transition={{ 
                        duration: 0.5, 
                        ease: "easeInOut"
                      }}
                      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <ShoppingCartOutlinedIcon />
                    </Box>
                  </AnimatePresence>
                </Badge>
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AccountMenu profile={profile} />
            </Box>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  )
}
