import { Box, Container, Typography, Button, alpha, useTheme, Stack } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import productApi from '~/apis/product.api'
import { type ProductFull } from '~/types/product.type'
import HomeHero from './HomeHero'
import ProductShowcase from './ProductShowcase'
import VoucherSection from './VoucherSection'
import { useNavigate } from 'react-router'
import path from '~/constants/path'
import ProductListSkeleton from '../ProductList/ProductListSkeleton'
import { motion } from 'framer-motion'
import { type ProductsConfig } from '~/types/product.type'

const Home = () => {
  const navigate = useNavigate()
  const theme = useTheme()

  const { data, isLoading } = useQuery({
    queryKey: ['products-home'],
    queryFn: () => {
      return productApi.getProducts({ 
        limit: 10,
        sort: 'created_at',
        order: 'desc'
      } as ProductsConfig)
    },
    staleTime: 1000 * 60 * 5
  })

  const products = data?.data?.data.data as ProductFull[] || []

  return (
    <Box sx={{ bgcolor: 'background.default', pb: 10 }}>
      {/* 🚀 Hero Section */}
      <HomeHero />
      <VoucherSection />

      <Container maxWidth='xl'>

        {/* ✨ Showcase Section Header */}
        <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: -2, px: { xs: 2, md: 4 } }}>
          <Box>
            <Typography variant='h4' fontWeight={800} sx={{ mb: 1 }}>Sản phẩm mới nhất</Typography>
            <Typography variant='body1' color='text.secondary'>Khám phá những xu hướng công nghệ vừa cập bến Homura Mall</Typography>
          </Box>
          <Button 
            variant='text' 
            onClick={() => navigate(path.products)}
            sx={{ 
              fontWeight: 800, 
              color: 'primary.main',
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) }
            }}
          >
            Xem tất cả
          </Button>
        </Stack>

        {isLoading ? (
          <Box sx={{ py: 6 }}>
            <ProductListSkeleton />
          </Box>
        ) : (
          <ProductShowcase 
            products={products} 
          />
        )}

        {/* 🎨 Promotion Section (Premium Restored) */}
        <Box 
          component={motion.div}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          sx={{ 
            mt: 10, 
            p: { xs: 4, md: 8, lg: 10 }, 
            borderRadius: 10, 
            background: theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, ${alpha('#6200EA', 0.8)} 0%, ${alpha('#311B92', 0.9)} 100%)`
              : `linear-gradient(135deg, #6200EA 0%, #B388FF 100%)`,
            color: 'white',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: `0 40px 80px ${alpha('#6200EA', 0.3)}`
          }}
        >
          <Box sx={{ position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', filter: 'blur(60px)' }} />
          <Box sx={{ position: 'absolute', bottom: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', filter: 'blur(80px)' }} />

          <Typography variant='h2' fontWeight={900} sx={{ mb: 2, fontSize: { xs: '2rem', md: '3.5rem' } }}>
            Trải nghiệm tương lai số
          </Typography>
          <Typography variant='h6' sx={{ mb: 6, opacity: 0.8, maxWidth: '700px', mx: 'auto', fontWeight: 400 }}>
            Tham gia cộng đồng công nghệ cao cấp tại Homura Mall. Miễn phí vận chuyển toàn quốc cho tất cả đơn hàng từ 1.000.000 VNĐ.
          </Typography>
          <Button 
            variant='contained' 
            size='large' 
            sx={{ 
              bgcolor: 'white', 
              color: '#6200EA', 
              px: { xs: 4, md: 6 },
              py: 2,
              borderRadius: 4,
              fontSize: '1.2rem',
              fontWeight: 800,
              '&:hover': { bgcolor: '#F3E5F5', transform: 'translateY(-4px)' }
            }}
            onClick={() => navigate(path.products)}
          >
            Mua sắm ngay
          </Button>
        </Box>
      </Container>
    </Box>
  )
}

export default Home
