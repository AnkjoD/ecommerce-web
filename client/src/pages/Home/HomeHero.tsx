import { Box, Container, Typography, Button, Stack, alpha, useTheme } from '@mui/material'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import { useRef } from 'react'
import { Link } from 'react-router'
import path from '~/constants/path'

const HomeHero = () => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const containerRef = useRef<HTMLDivElement>(null)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { damping: 25, stiffness: 150 }
  const mouseXSpring = useSpring(mouseX, springConfig)
  const mouseYSpring = useSpring(mouseY, springConfig)

  const mainX = useTransform(mouseXSpring, [-300, 300], [-30, 30])
  const mainY = useTransform(mouseYSpring, [-300, 300], [-30, 30])
  
  const vrX = useTransform(mouseXSpring, [-300, 300], [50, -50])
  const vrY = useTransform(mouseYSpring, [-300, 300], [50, -50])
  
  const droneX = useTransform(mouseXSpring, [-300, 300], [-80, 80])
  const droneY = useTransform(mouseYSpring, [-300, 300], [80, -80])

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      mouseX.set(e.clientX - (rect.left + rect.width / 2))
      mouseY.set(e.clientY - (rect.top + rect.height / 2))
    }
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  // ✨ Decorative Floating Elements (Digital Shards)
  const shards = [
    { size: 40, top: '20%', left: '10%', delay: 0 },
    { size: 20, top: '60%', left: '30%', delay: 2 },
    { size: 60, top: '15%', left: '70%', delay: 1.5 },
    { size: 30, top: '80%', left: '85%', delay: 3 },
  ]

  return (
    <Box
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      sx={{
        position: 'relative',
        width: '100%',
        minHeight: { xs: '450px', md: '750px' },
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        borderRadius: { xs: 0, md: 10 },
        mb: 8,
        background: isDark 
          ? `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.98)} 0%, ${alpha('#0F0E13', 1)} 100%)`
          : `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.2)} 0%, ${alpha('#FFFFFF', 1)} 100%)`,
      }}
    >
      {/* 🔮 Background Decorative Orbs */}
      <Box sx={{ position: 'absolute', top: '-10%', right: '-5%', width: 600, height: 600, background: alpha(theme.palette.primary.main, 0.05), filter: 'blur(120px)', borderRadius: '50%', zIndex: 0 }} />
      <Box sx={{ position: 'absolute', bottom: '-5%', left: '10%', width: 400, height: 400, background: alpha(theme.palette.secondary.main, 0.03), filter: 'blur(100px)', borderRadius: '50%', zIndex: 0 }} />

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 10 }}>
        <Stack spacing={4} sx={{ maxWidth: '750px', px: { xs: 1, sm: 2, md: 0 } }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, px: 2, py: 0.8, borderRadius: 10, bgcolor: alpha(theme.palette.primary.main, 0.1), border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`, color: 'primary.main', mb: { xs: 2, md: 3 } }}>
              <RocketLaunchIcon sx={{ fontSize: { xs: 16, md: 20 } }} />
              <Typography variant="caption" fontWeight={900} sx={{ letterSpacing: 1.5, textTransform: 'uppercase', fontSize: { xs: '0.65rem', md: '0.75rem' } }}>Revolutionary Mall</Typography>
            </Box>

            <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', sm: '3.5rem', md: '6rem' }, fontWeight: 900, mb: 3, lineHeight: 1, letterSpacing: '-0.05em', color: 'text.primary' }}>
              Style Meets <br />
              <Typography component="span" variant="h1" sx={{ fontSize: 'inherit', fontWeight: 'inherit', color: 'primary.main' }}>Pure Tech</Typography>
            </Typography>

            <Typography variant="h6" sx={{ color: 'text.secondary', mb: { xs: 4, md: 5 }, fontWeight: 400, maxWidth: '600px', fontSize: { xs: '1rem', md: '1.3rem' }, lineHeight: 1.6 }}>
              Kiến tạo phong cách sống vượt thời đại. Homura Mall là điểm đến của những tâm hồn khao khát sự hoàn mỹ trong công nghệ.
            </Typography>

            <Stack direction="row" spacing={3}>
              <Button 
                component={Link}
                to={path.products}
                variant="contained" 
                size="large" 
                startIcon={<ShoppingBagIcon />} 
                sx={{ 
                  height: { xs: 54, md: 64 }, 
                  px: { xs: 4, md: 6 }, 
                  borderRadius: 5, 
                  fontWeight: 900, 
                  fontSize: { xs: '1rem', md: '1.2rem' }, 
                  boxShadow: `0 20px 40px ${alpha(theme.palette.primary.main, 0.3)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: `0 25px 50px ${alpha(theme.palette.primary.main, 0.4)}`
                  }
                }}
              >
                Mua ngay
              </Button>
            </Stack>
          </motion.div>
        </Stack>
      </Container>

      {/* 🌌 CREATIVE GADGET UNIVERSE */}
      <Box sx={{ position: 'absolute', right: '0%', top: 0, bottom: 0, width: '50%', display: { xs: 'none', md: 'block' } }}>
        
        {/* 🛸 1. Main Hub */}
        <Box component={motion.div} style={{ x: mainX, y: mainY }} animate={{ y: [0, -25, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} sx={{ position: 'absolute', top: '20%', right: '15%', width: 500, height: 500, zIndex: 10, filter: 'drop-shadow(0 60px 100px rgba(0,0,0,0.4))' }}>
          <Box component="img" src="/assets/homu1.png" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </Box>

        {/* 🥽 2. VR World */}
        <Box component={motion.div} style={{ x: vrX, y: vrY, rotate: -20 }} animate={{ y: [0, 40, 0], rotate: [-20, -10, -20] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }} sx={{ position: 'absolute', top: '5%', left: '0%', width: 220, height: 220, zIndex: 8, filter: 'blur(0.5px) drop-shadow(0 30px 60px rgba(0,0,0,0.25))' }}>
          <Box component="img" src="/assets/homu2.png" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </Box>

        {/* 🛰 3. Drone Scout */}
        <Box component={motion.div} style={{ x: droneX, y: droneY, rotate: 15 }} animate={{ y: [0, -60, 0], x: [0, 30, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} sx={{ position: 'absolute', bottom: '10%', right: '5%', width: 280, height: 280, zIndex: 12, filter: 'drop-shadow(0 40px 80px rgba(108,92,231,0.3))' }}>
          <Box component="img" src="/assets/homu3.png" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </Box>

        {/* ✨ Digital Glass Shards (The Creativity Part) */}
        {shards.map((shard, i) => (
          <Box
            key={i}
            component={motion.div}
            animate={{ 
              y: [0, -40, 0], 
              rotate: [0, 180, 360],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 10 + i * 2, repeat: Infinity, ease: "linear", delay: shard.delay }}
            sx={{
              position: 'absolute',
              top: shard.top,
              left: shard.left,
              width: shard.size,
              height: shard.size,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha('#FFF', 0.2)}`,
              borderRadius: '20%',
              zIndex: 5
            }}
          />
        ))}
      </Box>
    </Box>
  )
}

export default HomeHero
