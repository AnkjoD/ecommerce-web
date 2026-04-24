import { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Stack, IconButton, Dialog, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

// Icons
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
interface ProductLightboxProps {
  images: string[];
  productName?: string;
  open: boolean;
  initialIndex: number; // Vị trí ảnh bắt đầu khi mở modal
  onClose: () => void;
}

export default function ProductLightbox({ images, productName, open, initialIndex, onClose }: ProductLightboxProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State riêng của Lightbox
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const thumbnailRef = useRef<HTMLDivElement>(null);

  // Sync index khi mở modal
  useEffect(() => {
    if (open) {
      setActiveIndex(initialIndex);
    }
  }, [open, initialIndex]);

  const imageList = useMemo(() => images.length > 0 ? images : ['https://placehold.co/600x400'], [images]);
  const currentImage = imageList[activeIndex];

  // Logic chuyển ảnh
  const handleNext = () => {
    setActiveIndex((prev) => (prev === imageList.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? imageList.length - 1 : prev - 1));
  };

  // Logic cuộn thumbnail
  useEffect(() => {
    if (open && thumbnailRef.current) {
        const container = thumbnailRef.current;
        const activeThumb = container.children[activeIndex] as HTMLElement;
        if (activeThumb) {
            const scrollLeft = activeThumb.offsetLeft - (container.offsetWidth / 2) + (activeThumb.offsetWidth / 2);
            container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
    }
  }, [activeIndex, open]);

  return (
    <Dialog 
        fullScreen 
        open={open} 
        onClose={onClose}
        PaperProps={{ sx: { bgcolor: 'rgba(0,0,0,0.95)', boxShadow: 'none' } }}
    >
        {/* HEADER */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2, color: 'white', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
            <Typography variant="h6" sx={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', mr: 2 }}>
                {productName}
            </Typography>
            <IconButton onClick={onClose} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}>
                <CloseIcon fontSize="medium" />
            </IconButton>
        </Stack>

        {/* BODY (MAIN IMAGE) */}
        <Box sx={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
            
            {/* Nút Prev */}
            {!isMobile && (
                <IconButton onClick={handlePrev} sx={{ position: 'absolute', left: 20, color: 'white', bgcolor: 'rgba(255,255,255,0.1)', '&:hover':{bgcolor: 'rgba(255,255,255,0.2)'}, zIndex: 2 }}>
                    <ChevronLeftIcon sx={{ fontSize: 40 }} />
                </IconButton>
            )}

            {/* Ảnh Lớn */}
            <Box 
                
                onClick={handleNext} // Click ảnh để next
                sx={{ 
                    maxHeight: '80vh', maxWidth: '100%', objectFit: 'contain', 
                    transition: 'transform 0.3s', cursor: 'pointer',
                    userSelect: 'none', 
                    animation: 'fadeIn 0.3s ease-in',
                    '@keyframes fadeIn': { from: { opacity: 0.5 }, to: { opacity: 1 } }
                }}
            >
              <LazyLoadImage src = {currentImage} effect="blur" alt="fullscreen" />
            </Box>

             {/* Nút Next */}
             {!isMobile && (
                <IconButton onClick={handleNext} sx={{ position: 'absolute', right: 20, color: 'white', bgcolor: 'rgba(255,255,255,0.1)', '&:hover':{bgcolor: 'rgba(255,255,255,0.2)'}, zIndex: 2 }}>
                    <ChevronRightIcon sx={{ fontSize: 40 }} />
                </IconButton>
            )}
        </Box>

        {/* FOOTER (THUMBNAILS) */}
        <Box sx={{ p: 2, height: 100, display: 'flex', justifyContent: 'center' }}>
             <Stack 
                ref={thumbnailRef}
                direction="row" spacing={2} 
                sx={{ overflowX: 'auto', py: 1, '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}
            >
                 {imageList.map((img, idx) => (
                    <Box key={idx} 
                        onClick={() => setActiveIndex(idx)}
                        sx={{
                          width: 60, height: 60, flexShrink: 0, cursor: 'pointer', borderRadius: 1,
                          border: `2px solid ${activeIndex === idx ? theme.palette.primary.main : 'transparent'}`, 
                          backgroundSize: 'cover', backgroundPosition: 'center',
                          opacity: activeIndex === idx ? 1 : 0.5,
                          transition: 'all 0.2s', '&:hover': { opacity: 1 }
                        }}
                    >
                      <LazyLoadImage src = {img} effect="blur" alt="thumbnail" />
                    </Box>
                 ))}
             </Stack>
        </Box>
    </Dialog>
  );
}

