import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useLocation } from 'react-router'
import { 
  Box, TextField, Typography, Avatar, Paper, 
  MenuItem, Skeleton, alpha, useTheme, InputAdornment,
  IconButton, Stack, Chip
} from '@mui/material'
import { 
  Search as SearchIcon, 
  History as HistoryIcon,
  TrendingUp as TrendingIcon,
  Clear as ClearIcon,
  KeyboardReturn as ReturnIcon
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import useDebounce from '~/hooks/useDebounce'
import useQueryParams from '~/hooks/useQueryParams'
import productApi from '~/apis/product.api'
import { generateNameId } from '~/utils/url'
import type { ProductFull } from '~/types/product.type'
import { motion, AnimatePresence } from 'framer-motion'

interface FormData {
  name: string
}

const RECENT_SEARCHES_KEY = 'homura_recent_searches'
const TRENDING_KEYWORDS = ['iPhone 15', 'Macbook M3', 'Gaming Chair', 'Mechanical Keyboard', 'Sony WH-1000XM5']

export default function SearchInput() {
  const theme = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const queryParams = useQueryParams()
  const [isOpen, setIsOpen] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const { register, setValue, watch, handleSubmit } = useForm<FormData>({
    defaultValues: { name: '' }
  })

  const nameValue = watch('name')
  const debouncedName = useDebounce(nameValue, 400)

  const { data: suggestionsData, isLoading } = useQuery({
    queryKey: ['search_suggestions', debouncedName],
    queryFn: () => productApi.getProducts({ name: debouncedName, limit: 6 }),
    enabled: debouncedName.length >= 2,
    staleTime: 60 * 1000
  })

  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY)
    if (saved) setRecentSearches(JSON.parse(saved))
  }, [])

  const saveSearch = (term: string) => {
    const trimmed = term.trim()
    if (!trimmed) return
    const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  }

  const clearRecent = (term: string) => {
    const updated = recentSearches.filter(s => s !== term)
    setRecentSearches(updated)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  }

  const suggestions = suggestionsData?.data?.data?.data || []
  const showPopup = isOpen && (debouncedName.length >= 2 || recentSearches.length > 0)

  const handleSearch = handleSubmit((data) => {
    if (!data.name.trim()) return
    saveSearch(data.name)
    setIsOpen(false)
    if (location.pathname.startsWith('/products')) {
      queryParams.updateParams({ name: data.name, page: '1' })
    } else {
      navigate(`/products?name=${encodeURIComponent(data.name)}&page=1`)
    }
    setValue('name', '')
  })

  const handleClickSuggestion = (product: ProductFull) => {
    saveSearch(product.name)
    const nameId = generateNameId({ name: product.name, id: product.variants?.[0]?.id || product.id })
    navigate(`/${nameId}`)
    setIsOpen(false)
    setValue('name', '')
  }

  const handleQuickSearch = (term: string) => {
    setValue('name', term)
    saveSearch(term)
    setIsOpen(false)
    navigate(`/products?name=${encodeURIComponent(term)}&page=1`)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <Box ref={containerRef} sx={{ position: 'relative', flexGrow: 1, maxWidth: { md: 600 }, mx: { xs: 0, md: 4 } }}>
      <Box component='form' onSubmit={handleSearch} sx={{ width: '100%' }}>
        <TextField
          fullWidth
          size="small"
          placeholder='Khám phá công nghệ tại Homura...'
          autoComplete='off'
          {...register('name')}
          onFocus={() => setIsOpen(true)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'primary.main', ml: 1, opacity: 0.6 }} />
              </InputAdornment>
            ),
            endAdornment: nameValue && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setValue('name', '')}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
            sx: {
              height: 48,
              borderRadius: 999,
              bgcolor: alpha(theme.palette.background.paper, 0.5),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              px: 1,
              '&:hover': {
                bgcolor: alpha(theme.palette.background.paper, 0.8),
                borderColor: alpha(theme.palette.primary.main, 0.3)
              },
              '&.Mui-focused': {
                bgcolor: theme.palette.background.paper,
                borderColor: theme.palette.primary.main,
                boxShadow: `0 12px 30px ${alpha(theme.palette.primary.main, 0.15)}`,
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
              },
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
            }
          }}
        />
      </Box>

      <AnimatePresence>
        {showPopup && (
          <Paper
            component={motion.div}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            elevation={0}
            sx={{
              position: 'absolute',
              top: '120%',
              left: 0,
              width: '100%',
              bgcolor: alpha(theme.palette.background.paper, 0.95),
              backdropFilter: 'blur(40px)',
              borderRadius: 5,
              zIndex: 1000,
              p: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              boxShadow: `0 30px 60px ${alpha(theme.palette.common.black, 0.15)}`,
              overflow: 'hidden'
            }}
          >
            {/* 1. RECENT & TRENDING (Show when input short) */}
            {nameValue.length < 2 && (
              <Stack spacing={3}>
                {recentSearches.length > 0 && (
                  <Box>
                    <Typography variant='caption' fontWeight={900} color="text.disabled" sx={{ letterSpacing: 2, mb: 2, display: 'block' }}>TÌM KIẾM GẦN ĐÂY</Typography>
                    <Stack spacing={0.5}>
                      {recentSearches.map((term) => (
                        <MenuItem 
                          key={term} 
                          sx={{ 
                            borderRadius: 2, px: 2, py: 1, 
                            display: 'flex', justifyContent: 'space-between',
                            '&:hover .clear-btn': { opacity: 1 }
                          }}
                        >
                          <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }} onClick={() => handleQuickSearch(term)}>
                             <HistoryIcon sx={{ fontSize: 18, opacity: 0.3 }} />
                             <Typography variant="body2" fontWeight={600}>{term}</Typography>
                          </Stack>
                          <IconButton className="clear-btn" size="small" sx={{ opacity: 0, transition: '0.2s' }} onClick={(e) => { e.stopPropagation(); clearRecent(term); }}>
                            <ClearIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </MenuItem>
                      ))}
                    </Stack>
                  </Box>
                )}

                <Box>
                  <Typography variant='caption' fontWeight={900} color="primary" sx={{ letterSpacing: 2, mb: 2, display: 'block' }}>XU HƯỚNG TÌM KIẾM</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
                    {TRENDING_KEYWORDS.map((tag) => (
                      <Chip 
                        key={tag} 
                        label={tag} 
                        size="small" 
                        onClick={() => handleQuickSearch(tag)}
                        icon={<TrendingIcon sx={{ fontSize: '14px !important' }} />}
                        sx={{ 
                          fontWeight: 900, fontSize: '0.7rem', py: 2, px: 1, borderRadius: 2,
                          bgcolor: alpha(theme.palette.primary.main, 0.05),
                          borderColor: alpha(theme.palette.primary.main, 0.1),
                          '&:hover': { bgcolor: 'primary.main', color: 'white', '& .MuiSvgIcon-root': { color: 'white' } }
                        }} 
                      />
                    ))}
                  </Stack>
                </Box>
              </Stack>
            )}

            {/* 2. LIVE SUGGESTIONS (Show when input >= 2 chars) */}
            {nameValue.length >= 2 && (
              <Box>
                <Box sx={{ px: 1, py: 1, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='caption' fontWeight={900} color="primary" sx={{ letterSpacing: 1.5 }}>
                    {isLoading ? 'ĐANG PHÂN TÍCH...' : 'GỢI Ý SẢN PHẨM'}
                  </Typography>
                  <ReturnIcon sx={{ fontSize: 16, opacity: 0.2 }} />
                </Box>

                <Box sx={{ maxHeight: 350, overflowY: 'auto', py: 1, mt: 1 }}>
                  {isLoading
                    ? Array.from(new Array(3)).map((_, index) => (
                        <Box key={index} sx={{ display: 'flex', gap: 2, py: 1.5, px: 1 }}>
                          <Skeleton variant='rounded' width={48} height={48} sx={{ borderRadius: 2 }} />
                          <Box sx={{ flex: 1 }}><Skeleton variant='text' width='90%' /><Skeleton variant='text' width='40%' /></Box>
                        </Box>
                      ))
                    : suggestions.length > 0 ? suggestions.map((product) => (
                        <MenuItem
                          key={product.id}
                          onClick={() => handleClickSuggestion(product)}
                          sx={{ 
                            display: 'flex', gap: 2, py: 1.5, px: 1, borderRadius: 3,
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) }
                          }}
                        >
                          <Avatar 
                            src={product.media.thumbnail || product.media.images[0]} 
                            variant='rounded' 
                            sx={{ width: 48, height: 48, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }} 
                          />
                          <Box sx={{ flex: 1, overflow: 'hidden' }}>
                            <Typography variant='body2' noWrap sx={{ fontWeight: 800 }}>{product.name}</Typography>
                            <Typography variant='caption' fontWeight={900} color='primary.main'>
                               {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.min_price)}
                            </Typography>
                          </Box>
                        </MenuItem>
                      )) : (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={900}>KHÔNG TÌM THẤY SẢN PHẨM PHÙ HỢP</Typography>
                        </Box>
                      )}
                </Box>
              </Box>
            )}
          </Paper>
        )}
      </AnimatePresence>
    </Box>
  )
}
