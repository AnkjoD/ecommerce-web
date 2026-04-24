import { Box, Typography, alpha, useTheme, Stack } from '@mui/material'
import { motion } from 'framer-motion'
import { type ProductFull, type ProductVariant } from '~/types/product.type'
import { useNavigate } from 'react-router'
import path from '~/constants/path'
import { generateNameId } from '~/utils/url'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import StarIcon from '@mui/icons-material/Star'

interface ShowcaseCardProps {
  product: ProductFull
}

const ShowcaseCard = ({ product }: ShowcaseCardProps) => {
  const theme = useTheme()
  const navigate = useNavigate()
  const isDark = theme.palette.mode === 'dark'

  const variants = product.variants || []
  const firstVariant = variants[0] as ProductVariant || {} as ProductVariant
  const price = product.min_price || firstVariant.price || 0
  const originalPrice = firstVariant.price_before_discount
  const imageUrl = firstVariant.image_url || product.media?.thumbnail || '/C:/Users/Ankkun/.gemini/antigravity/brain/bc898d24-8d31-4709-82a8-8e3f51715c52/premium_tech_placeholder_1775796315000_1775796346079.png'
  const discount = (originalPrice && originalPrice > price) ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0

  return (
    <Box
      component={motion.div}
      whileHover={{ y: -8, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      sx={{
        width: { xs: 210, md: 250 }, // Thu nhỏ để trông gọn gàng và tinh tế hơn
        flexShrink: 0,
        position: 'relative',
        cursor: 'pointer',
        borderRadius: 2.5, // 20px - Mức bo hoàn hảo, không bị quá tròn
        overflow: 'hidden',
        bgcolor: isDark ? alpha(theme.palette.background.paper, 0.4) : '#FFFFFF',
        backdropFilter: 'blur(30px)',
        border: `1px solid ${isDark ? alpha('#FFFFFF', 0.08) : alpha('#000000', 0.06)}`,
        boxShadow: isDark 
          ? `0 10px 40px ${alpha('#000000', 0.4)}` 
          : `0 10px 40px ${alpha(theme.palette.primary.main, 0.06)}`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.4s ease',
        '&:hover': {
          borderColor: theme.palette.primary.main,
          transform: 'translateY(-10px)',
          boxShadow: isDark 
            ? `0 20px 50px ${alpha(theme.palette.primary.main, 0.2)}` 
            : `0 20px 50px ${alpha(theme.palette.primary.main, 0.1)}`,
          '& .showcase-img': { transform: 'scale(1.1)' }
        }
      }}
      onClick={() => navigate(`${path.home}${generateNameId({ name: product.name, id: firstVariant.id })}`)}
    >
      {/* 🖼 IMAGE AREA - Clean Full Width */}
      <Box sx={{ position: 'relative', height: '220px', overflow: 'hidden' }}>
        <Box 
          className="showcase-img"
          sx={{ 
            width: '100%', height: '100%',
            transition: 'transform 0.8s cubic-bezier(0.165, 0.84, 0.44, 1)' 
          }}
        >
          <LazyLoadImage 
            src={imageUrl}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </Box>

        {discount > 0 && (
          <Box sx={{
            position: 'absolute', top: 12, right: 12,
            bgcolor: 'error.main', color: 'white', px: 1.2, py: 0.4, borderRadius: 1.5,
            fontSize: '11px', fontWeight: 900, zIndex: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            -{discount}%
          </Box>
        )}
      </Box>

      {/* 📝 CONTENT AREA */}
      <Box sx={{ p: 2.5, pb: 3.5, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <Typography 
          variant='h6' 
          fontWeight={900} 
          sx={{ 
            mb: 1, 
            lineHeight: 1.25,
            height: '40px',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            fontSize: '15px',
            color: 'text.primary'
          }}
        >
          {product.name}
        </Typography>

        <Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 2 }}>
          <StarIcon sx={{ color: '#FFD700', fontSize: 14 }} />
          <Typography variant='caption' fontWeight={900}>{product.rating_avg.toFixed(1)}</Typography>
          <Typography variant='caption' color='text.secondary' fontWeight={700}>• {product.sold_count} sold</Typography>
        </Stack>

        <Box sx={{ mt: 'auto' }}>
          <Stack direction='row' alignItems='baseline' spacing={0.5}>
            <Typography variant='h5' fontWeight={900} color='primary.main' sx={{ fontSize: '20px', display: 'flex', alignItems: 'baseline' }}>
              <Box component="span" sx={{ fontSize: '0.7em', mr: 0.2 }}>₫</Box>
              {Math.floor(price).toLocaleString('vi-VN')}
            </Typography>
            {originalPrice && originalPrice > price && (
              <Typography variant='caption' sx={{ textDecoration: 'line-through', color: 'text.disabled', fontWeight: 700, opacity: 0.4 }}>
                ₫{Math.floor(originalPrice).toLocaleString('vi-VN')}
              </Typography>
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  )
}

export default ShowcaseCard
