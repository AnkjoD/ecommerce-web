import Header from '~/components/Header'
import { Box, useTheme, alpha } from '@mui/material'
import { Outlet, useLocation } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import AsideCart from '~/components/AsideCart'
import Footer from '~/components/Footer'
import { useState, useEffect } from 'react'
import ScrollToTop from '~/components/ScrollToTop'

const NavigationProgressBar = () => {
  const theme = useTheme()
  const location = useLocation()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
    setProgress(30)
    const timer1 = setTimeout(() => setProgress(70), 200)
    const timer2 = setTimeout(() => {
      setProgress(100)
      setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 400)
    }, 600)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [location.pathname])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            zIndex: 9999,
            background: `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            boxShadow: `0 0 10px ${alpha(theme.palette.primary.main, 0.5)}`
          }}
        >
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut', duration: 0.6 }}
            style={{ height: '100%', width: '100%' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const MainLayout = () => {
  const location = useLocation()

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <ScrollToTop />
      <NavigationProgressBar />
      <Header />
      <AsideCart />
      <Box component="main" sx={{ flexGrow: 1 }}>
        <AnimatePresence mode='wait'>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </Box>
      <Footer />
    </Box>
  )
}

export default MainLayout
