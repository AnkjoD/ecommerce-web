import React from 'react'
import Button, { type ButtonProps } from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { alpha, type SxProps, type Theme } from '@mui/material/styles'

// 1. STYLE OBJECT - Elite Vibrant Tech Style
const commonButtonStyle: SxProps<Theme> = {
  textTransform: 'uppercase', // Chuyển sang viết hoa để trông mạnh mẽ hơn
  fontWeight: 900,
  borderRadius: '12px', // Bo góc hiện đại hơn
  boxShadow: (theme) => `0 4px 14px 0 ${alpha(theme.palette.primary.main, 0.39)}`,
  paddingX: 4, 
  paddingY: 1.5,
  color: '#FFFFFF',
  bgcolor: (theme) => theme.palette.primary.main,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  border: '1px solid transparent',

  '&:hover': {
    bgcolor: (theme) => theme.palette.primary.dark,
    transform: 'translateY(-2px)',
    boxShadow: (theme) => `0 6px 20px 0 ${alpha(theme.palette.primary.main, 0.5)}`,
  },

  '&:active': {
    transform: 'translateY(0)',
  },

  // Style khi nút bị disable hoặc đang loading
  '&.Mui-disabled': {
    bgcolor: (theme) => alpha(theme.palette.action.disabledBackground, 0.1),
    color: (theme) => theme.palette.action.disabled,
    boxShadow: 'none',
    border: (theme) => `1px solid ${theme.palette.divider}`,
    cursor: 'not-allowed',
    pointerEvents: 'auto' // Cho phép hiện cursor not-allowed
  }
}

export interface IAppButtonProps extends ButtonProps {
  loading?: boolean
  rounded?: boolean
}

export const AppButton: React.FC<IAppButtonProps> = ({
  children,
  loading = false,
  rounded = false,
  sx,
  disabled,
  startIcon,
  ...props
}) => {
  return (
    <Button
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress color="inherit" size={20} thickness={6} /> : startIcon}
      sx={[
        commonButtonStyle, 
        rounded ? { borderRadius: '100px' } : {}, 
        ...(Array.isArray(sx) ? sx : [sx])
      ]}
      {...props}
    >
      {loading ? 'ĐANG XỬ LÝ...' : children}
    </Button>
  )
}

export default AppButton
