import { useState, useEffect, useRef, useMemo, forwardRef } from 'react';
import { Box, Stack, IconButton } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// Import component Lightbox vừa tách

import ProductLightbox from './../ProductLightbox/index';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

interface ProductImagesProps {
  images: string[];
  productName?: string;
  slideInterval?: number;
}

const ProductImages = forwardRef<HTMLImageElement, ProductImagesProps>(({ images = [], productName = '', slideInterval = 3000 }, ref) => {
  const theme = useTheme();
  
  // State hiển thị Inline
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  
  // State điều khiển Lightbox
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const thumbnailContainerRef = useRef<HTMLDivElement>(null);

  const imageList = useMemo(() => images.length > 0 ? images : ['https://via.placeholder.com/500'], [images]);
  const currentImage = imageList[activeImgIndex];

  // Logic Auto Slide (Giữ nguyên)
  useEffect(() => {
    if (isHovering || imageList.length <= 1 || isLightboxOpen) return;
    const timer = setInterval(() => {
      setActiveImgIndex((prev) => (prev === imageList.length - 1 ? 0 : prev + 1));
    }, slideInterval);
    return () => clearInterval(timer);
  }, [isHovering, imageList.length, slideInterval, isLightboxOpen]);

  // Logic Auto Scroll Thumbnail Inline (Giữ nguyên)
  useEffect(() => {
    if (thumbnailContainerRef.current) {
        const container = thumbnailContainerRef.current;
        const activeThumb = container.children[activeImgIndex] as HTMLElement;
        if (activeThumb) {
            const scrollLeft = activeThumb.offsetLeft - (container.offsetWidth / 2) + (activeThumb.offsetWidth / 2);
            container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
    }
  }, [activeImgIndex]);

  const handleScrollThumbnail = (direction: 'left' | 'right') => {
      if (thumbnailContainerRef.current) {
          const container = thumbnailContainerRef.current;
          const scrollAmount = 150;
          container.scrollTo({
              left: direction === 'left' ? container.scrollLeft - scrollAmount : container.scrollLeft + scrollAmount,
              behavior: 'smooth'
          });
      }
  };

  return (
    <>
        <Stack spacing={{ xs: 1.5, md: 3 }}>
            {/* ẢNH LỚN INLINE - PREMIUM ZOOM EFFECT */}
            <Box 
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                onClick={() => setIsLightboxOpen(true)}
                sx={{ 
                    width: '100%', 
                    paddingTop: '100%', 
                    position: 'relative', 
                    borderRadius: 4, 
                    overflow: 'hidden', 
                    border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    bgcolor: (theme) => alpha(theme.palette.background.paper, 0.5),
                    backdropFilter: 'blur(10px)',
                    cursor: 'zoom-in',
                    boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 10px 40px rgba(0,0,0,0.4)' : '0 10px 40px rgba(0,0,0,0.05)'
                }}
            >
                <Box
                    ref={ref as any}
                    sx={{ 
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'transform 0.6s cubic-bezier(0.165, 0.84, 0.44, 1)', 
                        '&:hover': { transform: 'scale(1.1)' } 
                    }} 
                >
                    <LazyLoadImage 
                        effect="blur" 
                        src={currentImage} 
                        alt={productName}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '20px' }}
                    />
                </Box>
            </Box>

            {/* LIST THUMBNAILS INLINE - GLASS TRACK */}
            <Box sx={{ position: 'relative', px: 1 }}>
                <IconButton 
                    size="small" 
                    onClick={() => handleScrollThumbnail('left')} 
                    sx={{ 
                        position: 'absolute', left: -5, top: '50%', transform: 'translateY(-50%)', 
                        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(5px)',
                        zIndex: 2, 
                        border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        '&:hover': { bgcolor: 'primary.main', color: '#fff' } 
                    }}
                >
                    <ChevronLeftIcon fontSize="small" />
                </IconButton>
                
                <Stack 
                    ref={thumbnailContainerRef} 
                    direction="row" 
                    spacing={1.5} 
                    sx={{ 
                        overflowX: 'auto', py: 1, px: 0.5, 
                        '&::-webkit-scrollbar': { display: 'none' }, 
                        scrollbarWidth: 'none', 
                        scrollBehavior: 'smooth' 
                    }}
                >
                    {imageList.map((img, idx) => (
                        <Box 
                            key={idx} 
                            onMouseEnter={() => setActiveImgIndex(idx)}
                            sx={{
                                width: 72, height: 72, flexShrink: 0, cursor: 'pointer', borderRadius: 2,
                                border: (theme) => `2px solid ${activeImgIndex === idx ? theme.palette.primary.main : 'transparent'}`,
                                overflow: 'hidden',
                                bgcolor: 'background.paper',
                                opacity: activeImgIndex === idx ? 1 : 0.6, 
                                transform: activeImgIndex === idx ? 'scale(1.05)' : 'scale(1)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                                '&:hover': { opacity: 1 },
                                boxShadow: activeImgIndex === idx ? `0 8px 20px ${alpha(theme.palette.primary.main, 0.2)}` : 'none'
                            }}
                        >
                            <LazyLoadImage 
                                effect="blur" 
                                src={img} 
                                alt="product-thumb" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </Box>
                    ))}
                </Stack>

                <IconButton 
                    size="small" 
                    onClick={() => handleScrollThumbnail('right')} 
                    sx={{ 
                        position: 'absolute', right: -5, top: '50%', transform: 'translateY(-50%)', 
                        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(5px)',
                        zIndex: 2, 
                        border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        '&:hover': { bgcolor: 'primary.main', color: '#fff' } 
                    }}
                >
                    <ChevronRightIcon fontSize="small" />
                </IconButton>
            </Box>
        </Stack>

        {/* ✨ GỌI COMPONENT LIGHTBOX Ở ĐÂY */}
        <ProductLightbox 
            open={isLightboxOpen}
            onClose={() => setIsLightboxOpen(false)}
            images={imageList}
            productName={productName}
            initialIndex={activeImgIndex} // Mở đúng cái ảnh đang xem
        />
    </>
  );
})

export default ProductImages;