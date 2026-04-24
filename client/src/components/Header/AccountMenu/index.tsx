import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import { Box, Button, Divider, IconButton, Typography, type Theme, type SxProps, Skeleton } from '@mui/material'
import { AppTooltip } from '~/components/AppTooltip'
import { useContext } from 'react'
import { AppContext } from '~/contexts/app.context'
import { useNavigate } from 'react-router'
import { logoutAccount } from '~/apis/auth.api'
import { useMutation } from '@tanstack/react-query'
import type { User } from '~/types/user.type'
import path from '~/constants/path'
import 'react-lazy-load-image-component/src/effects/blur.css'
import { LazyLoadImage } from 'react-lazy-load-image-component'

// Component nút bấm trong dropdown menu
const MenuOptionButton = ({
  children,
  onClick,
  sx
}: {
  children: React.ReactNode
  onClick: () => void
  sx?: SxProps<Theme>
}) => {
  return (
    <Button
      onClick={onClick}
      color='inherit'
      sx={[
        (theme) => ({
          display: 'block',
          width: '100%',
          py: 1,
          px: 1.5,
          textAlign: 'left',
          fontSize: '1rem',
          fontWeight: 500,
          color: theme.palette.text.primary,
          textDecoration: 'none',
          transition: 'background-color 0.2s',
          textTransform: 'none',
          borderRadius: '0',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
          }
        }),
        ...(Array.isArray(sx) ? sx : [sx])
      ]}
    >
      {children}
    </Button>
  )
}

// Component nút Đăng nhập/Đăng ký trên thanh Header
const AuthActionButton = ({
  children,
  onClick,
  sx
}: {
  children: React.ReactNode
  onClick: () => void
  sx?: SxProps<Theme>
}) => {
  return (
    <Button
      onClick={onClick}
      variant='text'
      sx={[
        {
          color: 'inherit',
          fontWeight: 600,
          fontSize: '0.875rem'
        },
        ...(Array.isArray(sx) ? sx : [sx])
      ]}
    >
      {children}
    </Button>
  )
}

const AccountMenu = ({ profile }: { profile: User | null }) => {
  const { isAuthenticated, setIsAuthenticated, reset } = useContext(AppContext)
  const navigate = useNavigate()

  const logoutMutation = useMutation({
    mutationFn: logoutAccount,
    onSuccess: () => {
      setIsAuthenticated(false)
      reset()
    },
    onError: (error) => {
      console.error('Logout failed:', error)
    }
  })

  const handleLogout = () => {
    logoutMutation.mutate()
  }

  // Nội dung Menu Dropdown (Dùng chung cho cả Mobile và Desktop khi Login)
  const renderUserDropdownMenu = () => (
    <Box className='flex flex-col min-w-[160px] max-w-[220px]'>
      {/* Hiển thị tên trong dropdown (chỉ hiện ở mobile cho rõ, hoặc làm title) */}
      <Box className='p-2 overflow-hidden md:hidden'>
        <Typography
          variant='body1'
          noWrap // Tự động ... nếu dài
          sx={{ fontWeight: 'bold', textAlign: 'center' }}
        >
          {profile?.name}
        </Typography>
        <Divider sx={{ mt: 1 }} />
      </Box>

      <MenuOptionButton onClick={() => navigate(path.profile)} sx={{ borderTopLeftRadius: 4, borderTopRightRadius: 4 }}>
        Hồ Sơ
      </MenuOptionButton>

      <MenuOptionButton onClick={() => navigate(path.purchase)}>Đơn mua</MenuOptionButton>

      <MenuOptionButton onClick={handleLogout} sx={{ borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }}>
        Đăng xuất
      </MenuOptionButton>
    </Box>
  )

  return (
    <div>
      {/* ========================================================= */}
      {/* ============ GIAO DIỆN DESKTOP (Màn hình lớn) =========== */}
      {/* ========================================================= */}
      {/* Chỉ hiển thị khi màn hình >= md (medium) */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5 }}>
        {!isAuthenticated ? (
          // --- Desktop: Chưa đăng nhập ---
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AuthActionButton onClick={() => navigate('/login')}>
              Đăng nhập
            </AuthActionButton>
          </Box>
        ) : // --- Desktop: Đã đăng nhập ---
        profile ? (
          <AppTooltip title={renderUserDropdownMenu()}>
            <Box className='flex items-center gap-2 px-2 rounded hover:cursor-pointer max-w-[200px]'>
              {/* Avatar */}
              <LazyLoadImage
                src={profile.avatar}
                alt='User Avatar'
                width={32}
                height={32}
                effect='blur'
                className='rounded-full flex-shrink-0' // flex-shrink-0 để ảnh không bị bóp méo
              />

              {/* Tên User (Có xử lý cắt bớt tên dài) */}
              <Typography
                variant='body1'
                noWrap // PROPS QUAN TRỌNG: Tự động thêm ... khi hết chỗ
                sx={{
                  color: 'inherit',
                  maxWidth: '120px' // Giới hạn chiều rộng tối đa
                }}
              >
                {profile.name}
              </Typography>
            </Box>
          </AppTooltip>
        ) : (
          <Skeleton variant='circular' width={40} height={40} />
        )}
      </Box>

      {/* ========================================================= */}
      {/* ============ GIAO DIỆN MOBILE (Màn hình nhỏ) ============ */}
      {/* ========================================================= */}
      {/* Chỉ hiển thị khi màn hình < md (medium) */}
      <Box sx={{ display: { xs: 'inline-flex', md: 'none' } }}>
        {!isAuthenticated ? (
          // --- Mobile: Chưa đăng nhập ---
          <AppTooltip
            title={
              <Box className='flex flex-col'>
                <MenuOptionButton onClick={() => navigate('/register')} sx={{ borderRadius: 1 }}>
                  Đăng ký
                </MenuOptionButton>
                <MenuOptionButton onClick={() => navigate('/login')} sx={{ borderRadius: 1 }}>
                  Đăng nhập
                </MenuOptionButton>
              </Box>
            }
          >
            <IconButton color="inherit">
              <AccountCircleIcon />
            </IconButton>
          </AppTooltip>
        ) : // --- Mobile: Đã đăng nhập ---
        profile ? (
          <AppTooltip title={renderUserDropdownMenu()}>
            <Box sx={{ cursor: 'pointer', display: 'flex' }}>
              <LazyLoadImage
                src={profile.avatar}
                width={32}
                height={32}
                alt='profile'
                className='rounded-full'
                effect='blur'
              />
            </Box>
          </AppTooltip>
        ) : (
          <Skeleton variant='circular' width={40} height={40} />
        )}
      </Box>
    </div>
  )
}

export default AccountMenu
