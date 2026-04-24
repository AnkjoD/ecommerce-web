import { Box, Tooltip, alpha, useTheme } from '@mui/material'
import { motion } from 'framer-motion'
import { useColorMode } from '~/contexts/colormode.context'
import soulGemImg from '~/assets/img/madoka_light_mode.webp'
import griefSeedImg from '~/assets/img/homura_dark_mode.webp'
import { LazyLoadImage } from 'react-lazy-load-image-component'

const ThemeToggleBtn = () => {
  const { mode, toggleColorMode } = useColorMode()
  const theme = useTheme()
  const isDark = mode === 'dark'

  return (
    <Tooltip title={isDark ? 'Thanh tẩy (Light Mode)' : 'Hóa thân (Dark Mode)'}>
      <Box
        onClick={toggleColorMode}
        sx={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: '50%',
          transition: 'all 0.3s ease',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            transform: 'scale(1.1)'
          }
        }}
      >
        <Box
          component={motion.div}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          sx={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            filter: isDark 
              ? 'drop-shadow(0 0 8px rgba(255, 128, 171, 0.7))' 
              : 'drop-shadow(0 0 6px rgba(213, 0, 249, 0.5))'
          }}
        >
          <LazyLoadImage
            src={isDark ? soulGemImg : griefSeedImg}
            alt={isDark ? 'Soul Gem' : 'Grief Seed'}
            width={30}
            height={30}
            effect='blur'
          />
        </Box>
      </Box>
    </Tooltip>
  )
}

export default ThemeToggleBtn