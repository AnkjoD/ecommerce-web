import { Box, IconButton, alpha, useTheme } from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'
import { useRef, useState } from 'react'
import { type ProductFull } from '~/types/product.type'
import ShowcaseCard from './ShowcaseCard'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'

interface ProductShowcaseProps {
  products: ProductFull[]
}

const ProductShowcase = ({ products }: ProductShowcaseProps) => {
  const theme = useTheme()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' })
    }
  }

  return (
    <Box 
      sx={{ position: 'relative', py: 4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 🎮 FLOATING CONTROLS - Lơ lửng hai bên sườn */}
      <AnimatePresence>
        {isHovered && (
          <>
            <IconButton 
              component={motion.button}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={() => scroll('left')}
              sx={{ 
                position: 'absolute', left: -20, top: '50%', transform: 'translateY(-50%)', zIndex: 20,
                width: 50, height: 50,
                border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                bgcolor: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(20px)',
                boxShadow: `0 10px 30px ${alpha('#000000', 0.2)}`,
                '&:hover': { bgcolor: theme.palette.primary.main, color: 'white' }
              }}
            >
              <ArrowBackIosNewIcon fontSize='small' />
            </IconButton>
            
            <IconButton 
              component={motion.button}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={() => scroll('right')}
              sx={{ 
                position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', zIndex: 20,
                width: 50, height: 50,
                border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                bgcolor: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(20px)',
                boxShadow: `0 10px 30px ${alpha('#000000', 0.2)}`,
                '&:hover': { bgcolor: theme.palette.primary.main, color: 'white' }
              }}
            >
              <ArrowForwardIosIcon fontSize='small' />
            </IconButton>
          </>
        )}
      </AnimatePresence>

      <Box
        ref={scrollRef}
        sx={{
          display: 'flex',
          gap: 4,
          overflowX: 'auto',
          px: { xs: 2, md: 4 },
          pb: 6,
          pt: 2,
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          maskImage: {
            md: 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)'
          }
        }}
      >
        {products.map((product, index) => (
          <Box
            key={product.id}
            component={motion.div}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.6 }}
            sx={{ scrollSnapAlign: 'start', flexShrink: 0 }}
          >
            <ShowcaseCard product={product} />
          </Box>
        ))}
        
        <Box sx={{ minWidth: { xs: 2, md: 40 }, flexShrink: 0 }} />
      </Box>
    </Box>
  )
}

export default ProductShowcase
