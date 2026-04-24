import { useContext } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { Box, Avatar, Typography,  useTheme, alpha } from '@mui/material'
import { PersonOutline, LockReset, Edit, ReceiptLong, LocationOn } from '@mui/icons-material'
import { AppContext } from '~/contexts/app.context'
import path from '~/constants/path'

export default function UserSideNav() {
  const { profile } = useContext(AppContext)
  const theme = useTheme()
    const navigate = useNavigate()
    
  return (
    <Box sx={{ width: '100%', position: 'sticky', top: 0 }}>
      
      {/* 1. INFO USER CARD (Hiệu ứng kính mờ) */}
      <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          p: 2, 
          mb: 3,
          // --- GLASSMORPHISM STYLE ---
          background: alpha(theme.palette.background.paper, 0.6), 
          backdropFilter: 'blur(10px)', 
          borderRadius: '16px', 
          border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`, 
          boxShadow: `0 4px 30px ${alpha(theme.palette.common.black, 0.1)}`, 
      }}>
        <Avatar 
            src={profile?.avatar} 
            sx={{ 
                width: 54, height: 54, 
                border: `2px solid ${theme.palette.primary.main}`, 
                boxShadow: `0 0 10px ${alpha(theme.palette.primary.main, 0.5)}` 
            }} 
        />
        <Box sx={{ ml: 2, overflow: 'hidden', flex: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold" noWrap sx={{ color: 'text.primary' }}>
             {profile?.name || 'Tài khoản'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mt: 0.5,
            cursor: window.location.pathname !== path.profile ? 'pointer': 'default',
            '&:hover': {
              color:  window.location.pathname !== path.profile ? theme.palette.primary.main :theme.palette.text.secondary
            }
          }}
            
            onClick = {() => {
              if(window.location.pathname !== path.profile) navigate(path.profile)
            }}
          >
             <Edit sx={{ fontSize: 14, mr: 0.5 }} />
             <Typography variant="body2">Sửa hồ sơ</Typography>
          </Box>
        </Box>
      </Box>

      {/* 2. MENU NAVIGATION */}
      <Box component="nav" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        
        <GlassItem 
            to= {path.profile} 
            icon={<PersonOutline />} 
            label="Hồ sơ của tôi" 
        />

        <GlassItem 
            to= {path.changePassword} 
            icon={<LockReset />} 
            label="Đổi mật khẩu" 
        />

        <GlassItem 
            to= {path.address} 
            icon={<LocationOn />} 
            label="Địa chỉ" 
        />

        <GlassItem 
            to= {path.purchase} 
            icon={<ReceiptLong />} 
            label="Đơn mua" 
        />

      </Box>
    </Box>
  )
}

// --- COMPONENT CON: ITEM KÍNH ---
function GlassItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
    const theme = useTheme()
    
    return (
        <NavLink
            to={to}
            style={({ isActive } : { isActive: boolean }) => ({
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                padding: '14px 16px',
                borderRadius: '12px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                position: 'relative',
                overflow: 'hidden',
                color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                fontWeight: isActive ? 600 : 400,
                background: isActive 
                    ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`
                    : 'transparent',
                
                border: isActive
                    ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                    : `1px solid ${alpha(theme.palette.divider, 0.05)}`,

                // HIỆU ỨNG GLOW (Phát sáng)
                boxShadow: isActive 
                    ? `0 0 15px ${alpha(theme.palette.primary.main, 0.15)}, inset 0 0 10px ${alpha(theme.palette.primary.main, 0.05)}`
                    : 'none',

                backdropFilter: 'blur(5px)',
            })}
        >
            {/* ICON: Có hiệu ứng nổi lên */}
            <Box 
                component="span" 
                sx={{ 
                    mr: 2, display: 'flex',
                    // Icon phát sáng nhẹ khi active
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                    color: 'inherit'
                }}
            >
                {icon}
            </Box>

            <Typography variant="body2" sx={{ fontWeight: 'inherit', letterSpacing: '0.3px' }}>
                {label}
            </Typography>

            {/* HIỆU ỨNG "LẤP LÁNH" KHI HOVER (Ánh sáng quét qua) */}
            <Box
                component="span"
                sx={{
                    position: 'absolute',
                    top: 0, left: '-100%',
                    width: '50%', height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                    transform: 'skewX(-20deg)',
                    transition: 'left 0.5s',
                    pointerEvents: 'none',
                    '.active &': { left: '200%' }, // Chạy qua khi active
                    'a:hover &': { // Chạy qua khi hover
                        left: '100%',
                        transition: 'left 0.7s ease-in-out'
                    }
                }}
            />
        </NavLink>
    )
}