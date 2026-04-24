import { Container, Box, alpha, useTheme } from '@mui/material'
import Grid from '@mui/material/Grid'
import { Outlet } from 'react-router'
import Logo from '~/components/Logo'
import ThemeToggleBtn from '~/components/ThemeToggleBtn'
import UserSideNav from '~/components/UserSideNav'
import Footer from '~/components/Footer'
import ScrollToTop from '~/components/ScrollToTop'

export default function UserLayout() {
  const theme = useTheme()
  return (
     <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        <ScrollToTop />
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4, bgcolor: alpha(theme.palette.background.paper, 0.4), backdropFilter: 'blur(20px)', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}` }}>
            <Box sx={{ bgcolor: 'primary.main', p: 2, borderRadius: 6, boxShadow: `0 10px 30px ${alpha(theme.palette.primary.main, 0.3)}` }}>
              <Logo size = "large"/>
            </Box>
        </Box>
        <Box sx={{ flexGrow: 1, py: { xs: 4, md: 8 } }}>
          <Container maxWidth="lg">
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 3 }}>
                 <UserSideNav />
              </Grid>
              <Grid size={{ xs: 12, md: 9 }}>
                 <Outlet />
              </Grid>
            </Grid>
          </Container>
        </Box>
        <Footer />
        <ThemeToggleBtn />
     </Box>
  )
}