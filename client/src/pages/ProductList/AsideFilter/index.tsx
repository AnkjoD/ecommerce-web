import React, { useState, useMemo, useEffect } from 'react'
import {
  Box,
  Typography,
  Stack,
  TextField,
  Button,
  Rating,
  List,
  InputAdornment,
  alpha,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
} from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'
import CloseIcon from '@mui/icons-material/Close'
import RestartAltIcon from '@mui/icons-material/RestartAlt'

// Icons
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SearchIcon from '@mui/icons-material/Search'
import TuneIcon from '@mui/icons-material/Tune'

import type { Category } from '~/types/category.type'
import useQueryParams from '~/hooks/useQueryParams'
import { useForm, type SubmitHandler } from 'react-hook-form'

interface Props {
  categories: Category[] | undefined
  isMobile?: boolean
  onClose?: () => void
}
interface FilterPriceFormData {
  min_price: string
  max_price: string
}

// 🧩 Helper: Chuyển mảng phẳng thành cây danh mục
const buildCategoryTree = (flatList: Category[]) => {
  const map: Record<string, Category & { children: Category[] }> = {}
  const tree: (Category & { children: Category[] })[] = []

  flatList.forEach((item) => {
    map[item.id] = { ...item, children: [] }
  })

  flatList.forEach((item) => {
    if (item.parent_id && map[item.parent_id]) {
      map[item.parent_id].children.push(map[item.id])
    } else {
      tree.push(map[item.id])
    }
  })

  return tree
}

// 💎 PROFESSIONAL COMPONENT: Category Item with Thread-line Styling
const CategoryItem = React.memo(({ 
  item, 
  depth = 0, 
  activeCategory, 
  updateParams, 
  toggleParent, 
  openParents,
}: { 
  item: Category & { children?: Category[] }; 
  depth?: number;
  activeCategory: string | undefined;
  updateParams: (newParams: object) => void;
  toggleParent: (id: string | undefined) => void;
  openParents: Record<string, boolean>;
}) => {
  const theme = useTheme()
  const hasChildren = item.children && item.children.length > 0
  const isActive = (activeCategory || '') === (item.slug || '')
  const isOpen = openParents[item.id] || false

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        component={motion.div}
        whileHover={{ x: 4 }}
        transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          borderRadius: '8px',
          py: 1,
          px: 1.5,
          mb: 0.2,
          ml: depth > 0 ? depth * 2 : 0,
          position: 'relative',
          color: isActive ? 'primary.main' : alpha(theme.palette.text.primary, 0.6),
          bgcolor: isActive ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
          borderLeft: `2.5px solid ${isActive ? theme.palette.primary.main : 'transparent'}`,
          transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
          '&:hover': {
            bgcolor: isActive ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.action.hover, 0.03),
            color: isActive ? 'primary.main' : 'text.primary',
          }
        }}
        onClick={() => {
          updateParams({ page: '1', category: item.slug || null })
        }}
      >
        <Stack direction='row' alignItems='center' spacing={1.5} sx={{ minWidth: 0 }}>
          <Typography 
            variant='body2' 
            sx={{ 
                fontWeight: isActive ? 800 : 500,
                fontSize: depth === 0 ? '0.85rem' : '0.82rem', 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                letterSpacing: isActive ? '-0.2px' : 'normal'
            }}
          >
            {item.name}
          </Typography>
        </Stack>
        
        {hasChildren && (
          <Box 
            onClick={(e) => { 
                e.stopPropagation(); 
                toggleParent(item.id); 
            }}
            sx={{ 
              display: 'flex', alignItems: 'center', ml: 1, p: 0.3, borderRadius: '4px',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: '0.2s cubic-bezier(0.2, 0, 0, 1)',
              color: isOpen ? 'primary.main' : alpha(theme.palette.text.primary, 0.3),
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
            }}
          >
            <ExpandMoreIcon sx={{ fontSize: 14 }} />
          </Box>
        )}
      </Box>

      <AnimatePresence initial={false}>
        {hasChildren && isOpen && (
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                style={{ overflow: 'hidden' }}
            >
                <Box sx={{ 
                    position: 'absolute', 
                    left: (depth * 20) + 10, 
                    top: 35, 
                    bottom: 12, 
                    width: '1px', 
                    bgcolor: alpha(theme.palette.divider, 0.1), 
                    zIndex: 0 
                }} />
                
                <List component='div' disablePadding>
                    {item.children?.map((child) => (
                    <CategoryItem 
                        key={child.id} 
                        item={child} 
                        depth={depth + 1} 
                        activeCategory={activeCategory}
                        updateParams={updateParams}
                        toggleParent={toggleParent}
                        openParents={openParents}
                    />
                    ))}
                </List>
            </motion.div>
        )}
      </AnimatePresence>
    </Box>
  )
})

const FilterAccordion = ({ title, children, defaultExpanded = false }: { title: string, children: React.ReactNode, defaultExpanded?: boolean }) => (
    <Accordion 
        defaultExpanded={defaultExpanded}
        disableGutters 
        elevation={0} 
        sx={{ 
            bgcolor: 'transparent',
            '&:before': { display: 'none' },
            mb: 1
        }}
    >
        <AccordionSummary 
            expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}
            sx={{ 
                px: 1, 
                minHeight: 48,
                '& .MuiAccordionSummary-content': { my: 0 }
            }}
        >
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: 'text.secondary' }}>
                {title}
            </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 0.5, py: 0 }}>
            {children}
        </AccordionDetails>
    </Accordion>
)

const FilterContent = ({ 
    theme, activeCategory, updateParams, toggleParent, openParents, categoryTree, register, handleSubmit, onSubmit, isMobile, queryParams, onClose 
}: any) => (
    <>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ 
            fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px',
            color: alpha(theme.palette.text.primary, 0.4), mb: 1.5, ml: 1
        }}>DANH MỤC</Typography>
        
        <CategoryItem 
          item={{ id: 'all', name: 'Tất cả sản phẩm', slug: '', children: [] } as any} 
          activeCategory={activeCategory}
          updateParams={updateParams}
          toggleParent={toggleParent}
          openParents={openParents}
        />
        {categoryTree.map((cat: any) => (
          <CategoryItem 
            key={cat.id} 
            item={cat} 
            activeCategory={activeCategory}
            updateParams={updateParams}
            toggleParent={toggleParent}
            openParents={openParents}
          />
        ))}
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography sx={{ 
            fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px',
            color: alpha(theme.palette.text.primary, 0.4), mb: 1.5, ml: 1
        }}>KHOẢNG GIÁ</Typography>
        <Box component='form' onSubmit={handleSubmit(onSubmit)}>
            <Stack direction='row' spacing={1.5} sx={{ mb: 2 }}>
                <TextField 
                    {...register('min_price')} 
                    type='number' 
                    placeholder='Từ' 
                    size='small' 
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: alpha(theme.palette.background.paper, 0.3) } }} 
                />
                <TextField 
                    {...register('max_price')} 
                    type='number' 
                    placeholder='Đến' 
                    size='small' 
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: alpha(theme.palette.background.paper, 0.3) } }} 
                />
            </Stack>
            {!isMobile && (
                <Button variant='contained' fullWidth type='submit' size="small" sx={{ borderRadius: 2, fontWeight: 800, py: 1, boxShadow: 'none' }}>
                    Áp dụng
                </Button>
            )}
        </Box>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography sx={{ 
            fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px',
            color: alpha(theme.palette.text.primary, 0.4), mb: 1.5, ml: 1
        }}>ĐÁNH GIÁ</Typography>
        <Stack spacing={0.5}>
          {[5, 4, 3, 2, 1].map((star: any) => (
            <Box
                key={star}
                onClick={() => {
                  updateParams({ page: 1, rating_filter: String(star) })
                }}
                sx={{
                   cursor: 'pointer', px: 2, py: 1, borderRadius: 2, transition: '0.2s',
                   color: queryParams.rating_filter === String(star) ? 'primary.main' : 'inherit',
                   bgcolor: queryParams.rating_filter === String(star) ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                   display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                   '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.05) }
                }}
            >
                <Stack direction='row' alignItems='center' spacing={1.5}>
                    <Rating value={star} readOnly size='small' sx={{ fontSize: 14, '& .MuiRating-iconFilled': { color: 'warning.main' } }} />
                    {star < 5 && <Typography variant='caption' sx={{ opacity: 0.6, fontWeight: 700, fontSize: '0.75rem' }}>Trở lên</Typography>}
                </Stack>
                {queryParams.rating_filter === String(star) && (
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
                )}
            </Box>
          ))}
        </Stack>
      </Box>
    </>
)

const AsideFilter = ({ categories = [], isMobile, onClose }: Props) => {
  const theme = useTheme()
  const { register, handleSubmit, reset, setValue } = useForm<FilterPriceFormData>()
  const { queryParams, updateParams } = useQueryParams()
  const [openParents, setOpenParents] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setValue('min_price', queryParams.min_price || '')
    setValue('max_price', queryParams.max_price || '')
  }, [queryParams.min_price, queryParams.max_price, setValue])

  const categoryTree = useMemo(() => {
    return buildCategoryTree(categories || [])
  }, [categories])

  const toggleParent = (id: string | undefined) => {
    if (!id) return
    setOpenParents((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const onSubmit: SubmitHandler<FilterPriceFormData> = (data) => {
    updateParams({ page: '1', min_price: data.min_price, max_price: data.max_price })
  }

  const handleReset = () => {
    reset()
    updateParams({ 
        page: 1, 
        min_price: null, 
        max_price: null, 
        rating_filter: null, 
        category: null,
        sort_by: null,
        order: null
    })
  }

  const handleApply = () => {
    handleSubmit(onSubmit)()
  }

  const activeCategory = queryParams.category

  return (
    <Box
      sx={{
        position: isMobile ? 'relative' : 'sticky', 
        top: isMobile ? 0 : '100px', 
        height: isMobile ? '100dvh' : 'calc(100vh - 120px)', 
        display: 'flex',
        flexDirection: 'column',
        width: '100%', 
        borderRadius: isMobile ? 0 : 3,
        bgcolor: isMobile ? 'background.default' : (theme) => alpha(theme.palette.background.paper, 0.6),
        backdropFilter: isMobile ? 'none' : 'blur(30px) saturate(150%)',
        border: isMobile ? 'none' : (theme) => `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        boxShadow: isMobile ? 'none' : (theme) => `0 20px 40px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.3 : 0.03)}`,
        overflow: 'hidden' 
      }}
    >
      {isMobile && (
        <Box sx={{ 
            p: 2, pt: 3, 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
            bgcolor: alpha(theme.palette.background.default, 0.95),
            backdropFilter: 'blur(10px)',
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ p: 0.8, borderRadius: 1.2, bgcolor: alpha(theme.palette.primary.main, 0.1), display: 'flex' }}>
                    <TuneIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                </Box>
                <Typography variant="h6" fontWeight={900} letterSpacing="-0.5px">Bộ lọc</Typography>
            </Stack>
            <IconButton onClick={onClose} sx={{ bgcolor: alpha(theme.palette.action.hover, 0.05) }}>
                <CloseIcon />
            </IconButton>
        </Box>
      )}

      <Box sx={{ 
        px: 2, 
        pt: !isMobile ? 0 : 2,
        pb: isMobile ? 12 : 2, 
        flexGrow: 1, 
        overflowY: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}>
        {!isMobile ? (
            <>
                <Stack direction='row' alignItems='center' spacing={1.5} sx={{ mb: 3, px: 1 }}>
                    <Box sx={{ 
                    p: 0.8, borderRadius: 1.5, 
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, 
                    display: 'flex', boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`
                    }}>
                        <TuneIcon sx={{ fontSize: 16, color: '#fff' }} />
                    </Box>
                    <Typography variant="body1" fontWeight={900} letterSpacing="-0.3px">Bộ lọc</Typography>
                </Stack>
                <FilterContent 
                    theme={theme}
                    activeCategory={activeCategory}
                    updateParams={updateParams}
                    toggleParent={toggleParent}
                    openParents={openParents}
                    categoryTree={categoryTree}
                    register={register}
                    handleSubmit={handleSubmit}
                    onSubmit={onSubmit}
                    isMobile={isMobile}
                    queryParams={queryParams}
                    onClose={onClose}
                />
            </>
        ) : (
            <Box sx={{ mt: 1 }}>
                <FilterAccordion title="Sắp xếp" defaultExpanded>
                    <Stack spacing={0.5} sx={{ mb: 1 }}>
                        {[
                            { label: 'Mới nhất', sort: 'createdAt', order: null },
                            { label: 'Phổ biến', sort: 'view', order: null },
                            { label: 'Bán chạy', sort: 'sold', order: null },
                            { label: 'Giá: Thấp đến Cao', sort: 'price', order: 'asc' },
                            { label: 'Giá: Cao đến Thấp', sort: 'price', order: 'desc' }
                        ].map((item) => {
                            const isActive = queryParams.sort_by === item.sort && (item.order === null || queryParams.order === item.order);
                            return (
                                <Box
                                    key={item.label}
                                    onClick={() => {
                                        updateParams({ page: '1', sort_by: item.sort, order: item.order })
                                    }}
                                    sx={{
                                        cursor: 'pointer', px: 2, py: 1.2, borderRadius: 2,
                                        bgcolor: isActive ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                                        color: isActive ? 'primary.main' : 'text.primary',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        transition: '0.2s',
                                        '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.05) }
                                    }}
                                >
                                    <Typography variant="body2" sx={{ fontWeight: isActive ? 900 : 600 }}>{item.label}</Typography>
                                    {isActive && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />}
                                </Box>
                            )
                        })}
                    </Stack>
                </FilterAccordion>

                <FilterAccordion title="Danh mục sản phẩm" defaultExpanded>
                    <CategoryItem 
                        item={{ id: 'all', name: 'Tất cả sản phẩm', slug: '', children: [] } as any} 
                        activeCategory={activeCategory}
                        updateParams={updateParams}
                        toggleParent={toggleParent}
                        openParents={openParents}
                    />
                    {categoryTree.map((cat: any) => (
                        <CategoryItem key={cat.id} item={cat} activeCategory={activeCategory} updateParams={updateParams} toggleParent={toggleParent} openParents={openParents} />
                    ))}
                </FilterAccordion>

                <FilterAccordion title="Khoảng giá (VND)">
                    <Stack direction='row' spacing={1.5} sx={{ mb: 2, px: 1 }}>
                        <TextField {...register('min_price')} type='number' placeholder='Từ' size='small' fullWidth />
                        <TextField {...register('max_price')} type='number' placeholder='Đến' size='small' fullWidth />
                    </Stack>
                </FilterAccordion>

                <FilterAccordion title="Đánh giá khách hàng">
                    <Stack spacing={0.5}>
                        {[5, 4, 3, 2, 1].map((star: any) => (
                            <Box
                                key={star}
                                onClick={() => {
                                    updateParams({ page: 1, rating_filter: String(star) })
                                }}
                                sx={{
                                    cursor: 'pointer', px: 2, py: 1.2, borderRadius: 2,
                                    bgcolor: queryParams.rating_filter === String(star) ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                }}
                            >
                                <Rating value={star} readOnly size='small' sx={{ '& .MuiRating-iconFilled': { color: 'warning.main' } }} />
                                {queryParams.rating_filter === String(star) && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />}
                            </Box>
                        ))}
                    </Stack>
                </FilterAccordion>
            </Box>
        )}
      </Box>

      {isMobile && (
        <Box sx={{ 
            p: 2, pb: 3, 
            bgcolor: alpha(theme.palette.background.default, 0.95),
            backdropFilter: 'blur(20px)',
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            display: 'flex', gap: 2,
            zIndex: 11
        }}>
            <Button 
                variant="outlined" color="inherit" fullWidth 
                startIcon={<RestartAltIcon />}
                onClick={handleReset}
                sx={{ borderRadius: 2.5, py: 1.2, fontWeight: 800, border: `1px solid ${alpha(theme.palette.divider, 0.3)}` }}
            >
                Làm mới
            </Button>
            <Button 
                variant="contained" fullWidth 
                onClick={handleApply}
                sx={{ borderRadius: 2.5, py: 1.2, fontWeight: 900, boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}` }}
            >
                Áp dụng
            </Button>
        </Box>
      )}

      {!isMobile && (
        <Box sx={{ p: 2, pt: 0 }}>
            <Button
                variant='outlined' color='error' fullWidth size="small"
                startIcon={<RestartAltIcon sx={{ fontSize: 16 }} />}
                onClick={handleReset}
                sx={{ 
                    borderRadius: 2, 
                    fontWeight: 800, 
                    fontSize: '0.7rem', 
                    py: 1,
                    border: (theme) => `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                    color: 'error.main',
                    transition: '0.2s',
                    '&:hover': {
                        bgcolor: (theme) => alpha(theme.palette.error.main, 0.05),
                        border: (theme) => `1px solid ${theme.palette.error.main}`,
                        boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.error.main, 0.1)}`
                    }
                }}
            >
                LÀM MỚI BỘ LỌC
            </Button>
        </Box>
      )}
    </Box>
  )
}

export default AsideFilter
