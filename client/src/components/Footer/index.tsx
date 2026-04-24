import { Box, Container, Grid, Typography, Stack, Link, IconButton, alpha, useTheme, Divider } from '@mui/material'
import { Link as RouterLink } from 'react-router'
import FacebookIcon from '@mui/icons-material/Facebook'
import InstagramIcon from '@mui/icons-material/Instagram'
import TwitterIcon from '@mui/icons-material/Twitter'
import GitHubIcon from '@mui/icons-material/GitHub'
import Logo from '~/components/Logo'

export default function Footer() {
  const theme = useTheme()
  const year = new Date().getFullYear()

  return (
    <Box 
      component="footer" 
      sx={{ 
        bgcolor: alpha(theme.palette.background.paper, 0.4),
        backdropFilter: 'blur(40px)',
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        pt: { xs: 8, md: 10 },
        pb: 4,
        mt: 'auto'
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={6}>
          {/* Brand Section */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ mb: 3 }}>
              <Logo />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 300, lineHeight: 1.8, fontWeight: 500 }}>
              Elite Boutique - Trải nghiệm mua sắm đẳng cấp với những sản phẩm được tuyển chọn kỹ lưỡng. Nâng tầm phong cách sống của bạn.
            </Typography>
            <Stack direction="row" spacing={1}>
              {[FacebookIcon, InstagramIcon, TwitterIcon, GitHubIcon].map((Icon, i) => (
                <IconButton 
                  key={i} 
                  size="small" 
                  sx={{ 
                    color: 'text.secondary', 
                    bgcolor: alpha(theme.palette.action.hover, 0.05),
                    transition: '0.3s',
                    '&:hover': { 
                      color: 'primary.main', 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      transform: 'translateY(-3px)'
                    } 
                  }}
                >
                  <Icon fontSize="small" />
                </IconButton>
              ))}
            </Stack>
          </Grid>

          {/* Links Sections */}
          {[
            {
              title: 'CỬA HÀNG',
              links: [
                { label: 'Tất cả sản phẩm', to: '/products' },
                { label: 'Sản phẩm mới', to: '/products?sort=createdAt&order=desc' },
                { label: 'Bestsellers', to: '/products?sort=sold_count&order=desc' },
                { label: 'Ưu đãi đặc biệt', to: '/products?sort=price&order=asc' },
              ]
            },
            {
              title: 'HỖ TRỢ',
              links: [
                { label: 'Trung tâm trợ giúp', to: '#' },
                { label: 'Chính sách bảo mật', to: '#' },
                { label: 'Điều khoản sử dụng', to: '#' },
                { label: 'Liên hệ chúng tôi', to: '#' },
              ]
            },
            {
              title: 'TÀI KHOẢN',
              links: [
                { label: 'Hồ sơ cá nhân', to: '/profile' },
                { label: 'Lịch sử mua hàng', to: '/purchase' },
                { label: 'Giỏ hàng', to: '/cart' },
                { label: 'Đổi mật khẩu', to: '/profile/password' },
              ]
            }
          ].map((section, idx) => (
            <Grid key={idx} size={{ xs: 6, sm: 4, md: 2.6 }}>
              <Typography variant="caption" fontWeight={900} color="primary.main" sx={{ letterSpacing: 2, mb: 3, display: 'block' }}>
                {section.title}
              </Typography>
              <Stack spacing={1.5}>
                {section.links.map((link, linkIdx) => (
                  <Link
                    key={linkIdx}
                    component={RouterLink}
                    to={link.to}
                    underline="none"
                    sx={{
                      fontSize: '0.85rem',
                      color: 'text.secondary',
                      fontWeight: 600,
                      transition: '0.2s',
                      '&:hover': { color: 'primary.main', pl: 0.5 }
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </Stack>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 6, opacity: 0.05 }} />

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            © {year} ELITE BOUTIQUE. ALL RIGHTS RESERVED.
          </Typography>
          <Stack direction="row" spacing={3}>
            <Typography variant="caption" color="text.secondary" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>Privacy Policy</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>Terms of Service</Typography>
          </Stack>
        </Box>
      </Container>
    </Box>
  )
}
