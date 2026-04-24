import { Box, Container } from '@mui/material'
import { Outlet } from 'react-router'
import Logo from '~/components/Logo'
import ThemeToggleBtn from '~/components/ThemeToggleBtn'
import ScrollToTop from '~/components/ScrollToTop'

const AuthLayout = () => {
  return (
    <Container
      component='main'
      maxWidth='sm'
      sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}
    >
      <ScrollToTop />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', width: '100%' }}>
        <Logo size='large' />
        <Outlet />
      </Box>
      <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
        <ThemeToggleBtn />
      </Box>
    </Container>
  )
}

export default AuthLayout
