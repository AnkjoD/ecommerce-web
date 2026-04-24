import React, { useRef, useContext } from 'react';
import { Box, Paper, Typography, Stack, alpha, useTheme, IconButton, Tooltip } from '@mui/material';
import { type ProductFull, type ProductVariant } from '~/types/product.type';
import StarIcon from '@mui/icons-material/Star';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { motion } from 'framer-motion';
import QuickViewModal from '../QuickViewModal';


//thu vien khac
import path from '~/constants/path';
import { useNavigate } from 'react-router';
import { generateNameId } from '~/utils/url';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import useAddToCart from '~/hooks/useAddToCart';
import { AppContext } from '~/contexts/app.context';

interface ProductBoxProps {
  data: ProductFull;
}

const ProductBox: React.FC<ProductBoxProps> = ({ data }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { setFlyingData } = useContext(AppContext);
  const { addToCart } = useAddToCart();
  const [qvOpen, setQvOpen] = React.useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  
  const product = data as ProductFull
  const name = product.name || 'Sản phẩm không tên'
  const variants = product.variants || []
  const firstVariant = variants[0] as ProductVariant || {} as ProductVariant
  
  const price = firstVariant.price || 0
  const originalPrice = firstVariant.price_before_discount
  const rating = product.rating_avg || 0
  const sold = product.sold_count || 0
  const DEFAULT_PRODUCT_IMAGE = 'https://placehold.co/600x400?text=Homura+Mall'
  const imageUrl = firstVariant.image_url || product.media?.thumbnail || DEFAULT_PRODUCT_IMAGE
  const categoryName = product.category?.name || 'Chưa phân loại'
  const productId = firstVariant.id 

  const discount = (originalPrice && originalPrice > price) ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0

  const handleQuickAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 🚀 TRIGGER FLYING ANIMATION
    const rect = imageRef.current?.getBoundingClientRect();
    if (rect) {
      setFlyingData({
        image: imageUrl,
        startPos: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
      });
    }

    // 🛒 ADD TO DATABASE
    addToCart({ variant_id: productId, quantity: 1 } as any);
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Paper
        elevation={0}
        onClick={() => navigate(`${path.home}${generateNameId({ name, id: productId })}`)}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 4, // More rounded for Elite Boutique
          bgcolor: (theme) => theme.palette.mode === 'dark' 
            ? alpha(theme.palette.background.paper, 0.4) 
            : '#FFFFFF',
          border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          backdropFilter: 'blur(20px)',
          cursor: 'pointer',
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease',
          '&:hover': {
            transform: 'translateY(-10px)',
            borderColor: 'primary.main',
            boxShadow: theme.palette.mode === 'dark' 
              ? `0 25px 60px rgba(0,0,0,0.8)` 
              : `0 25px 50px ${alpha(theme.palette.primary.main, 0.15)}`,
            '& .quick-add-btn': {
                transform: 'translateY(0)',
                opacity: 1
            }
          }
        }}
      >
        {/* 🖼️ IMAGE AREA */}
        <Box sx={{ position: 'relative', p: 1.5 }}> 
          <Box sx={{ 
              position: 'relative', 
              borderRadius: 3, 
              overflow: 'hidden', 
              paddingTop: '100%',
              bgcolor: alpha(theme.palette.divider, 0.05)
          }}>
            <Box 
              ref={imageRef}
              sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            >
                <LazyLoadImage 
                  src={imageUrl}
                  alt={name}
                  effect="blur"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            </Box>
          </Box>

          {/* 🏷️ DISCOUNT BADGE */}
          {discount > 0 && (
            <Box sx={{
              position: 'absolute', top: 16, right: 16,
              bgcolor: 'error.main', color: '#fff',
              fontWeight: 900, fontSize: '10px',
              px: 1.2, py: 0.4, borderRadius: 1.5,
              boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.error.main, 0.3)}`,
              zIndex: 3
            }}>
              -{discount}%
            </Box>
          )}

          {/* 🛒 QUICK ACTIONS (ELITE STYLE) */}
          <Stack 
            className="quick-add-btn" 
            direction="column" 
            spacing={1.5}
            sx={{
              position: 'absolute', bottom: 20, right: 20, zIndex: 10,
              transform: 'translateY(10px)', opacity: 0,
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <Tooltip title="Xem nhanh" arrow placement="left">
                <IconButton 
                    onClick={(e) => { e.stopPropagation(); setQvOpen(true); }}
                    sx={{ 
                        bgcolor: 'background.paper', color: 'text.primary',
                        boxShadow: `0 8px 20px ${alpha(theme.palette.common.black, 0.1)}`,
                        width: 44, height: 44,
                        '&:hover': { bgcolor: 'primary.main', color: 'white', transform: 'scale(1.1)' }
                    }}
                >
                    <VisibilityIcon sx={{ fontSize: 20 }} />
                </IconButton>
            </Tooltip>
            <Tooltip title="Thêm nhanh vào giỏ" arrow placement="left">
                <IconButton 
                    onClick={handleQuickAddToCart}
                    sx={{ 
                        bgcolor: 'primary.main', color: 'white',
                        boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                        width: 44, height: 44,
                        '&:hover': { bgcolor: 'primary.dark', transform: 'scale(1.1)' }
                    }}
                >
                    <AddShoppingCartIcon sx={{ fontSize: 20 }} />
                </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* ... CONTENT ... */}


        {/* 📝 CONTENT AREA */}
        <Box sx={{ px: 2.5, pb: 3.5, pt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 900, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '10px', opacity: 0.8 }}>
            {categoryName}
          </Typography>

          <Typography 
            variant="body1" 
            sx={{
              fontWeight: 700, fontSize: '15px', lineHeight: 1.3, mb: 1, height: '40px',
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              color: 'text.primary'
            }}
          >
            {name}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <StarIcon sx={{ color: '#FFD700', fontSize: '15px' }} />
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary' }}>{rating.toFixed(1)}</Typography>
             </Box>
             <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', opacity: 0.6 }}>
                {sold} ĐÃ BÁN
             </Typography>
          </Box>

          {/* 💰 PRICE AREA */}
          <Box sx={{ mt: 'auto' }}>
            <Stack direction="row" alignItems="baseline" spacing={1}>
              <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main', fontSize: '20px' }}>
                ₫{Math.floor(price).toLocaleString('vi-VN')}
              </Typography>
              {originalPrice && originalPrice > price && (
                  <Typography variant="caption" sx={{ textDecoration: 'line-through', opacity: 0.4, fontWeight: 700, fontSize: '12px' }}>
                      ₫{Math.floor(originalPrice).toLocaleString('vi-VN')}
                  </Typography>
              )}
            </Stack>
          </Box>
        </Box>
      </Paper>
      <QuickViewModal 
        open={qvOpen} 
        onClose={() => setQvOpen(false)} 
        product={product} 
      />
    </motion.div>
  );
};

export default React.memo(ProductBox);