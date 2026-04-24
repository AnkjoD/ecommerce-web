import { useState } from 'react';
import { Box, Paper, Button, Typography, Stack, IconButton, MenuItem, Select, type SelectChangeEvent } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles'; // 🎨 Hook Theme

// Icons
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import useQueryParams from '~/hooks/useQueryParams';

const HEIGHT = '34px'; 
const BORDER_RADIUS = 1; // Dùng spacing theme (thường là 4px)

import TuneIcon from '@mui/icons-material/Tune'
import SwapVertIcon from '@mui/icons-material/SwapVert'

interface Props {
  pageSize: number
  onOpenFilter?: () => void
}

const SortProductList = ({ pageSize, onOpenFilter }: Props) => {
    const theme = useTheme(); // 🎨
    const { queryParams, updateParams } = useQueryParams();
    const sortBy = (queryParams.sort_by as any) || 'createdAt';
    const priceOrder = queryParams.order || '';
    const page = Number(queryParams['page']) || 1;

    const handlePageChange = (newPage: number) => updateParams({ page: newPage.toString() });

    const handlePriceChange = (event: SelectChangeEvent) => {
        updateParams({ sort_by: 'price', order: event.target.value });
    };

    // 🎨 Button Component Tái sử dụng
    const RenderSortBtn = ({ label, value }: { label: string, value: 'sold' | 'view' | 'createdAt' | 'price' }) => {
        const isActive = sortBy === value;
        return (
            <Button
                variant={isActive ? "contained" : "text"}
                onClick={() => { updateParams({ sort_by: value, order: null }); }}
                sx={{
                    textTransform: 'capitalize', 
                    boxShadow: 'none', 
                    borderRadius: 10, // Full rounded chips
                    height: HEIGHT, 
                    px: 3, 
                    minWidth: 'max-content',
                    flexShrink: 0,
                    fontWeight: isActive ? 900 : 600,
                    fontSize: '0.85rem',
                    
                    bgcolor: isActive ? 'primary.main' : 'transparent',
                    color: isActive ? 'white' : 'text.primary',
                    border: (theme) => isActive ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.3)}`,

                    '&:hover': {
                        bgcolor: isActive ? 'primary.dark' : alpha(theme.palette.primary.main, 0.08),
                        color: isActive ? 'white' : 'primary.main',
                        borderColor: 'primary.main'
                    },
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    whiteSpace: 'nowrap'
                }}
            >
                {label}
            </Button>
        );
    };

    return (
        <Paper 
            elevation={0} 
            sx={{
                py: { xs: 1, md: 1 }, 
                px: { xs: 1.5, md: 2 }, 
                mb: 2, 
                borderRadius: { xs: 3, md: 3 },
                display: 'flex', 
                flexDirection: 'row', 
                alignItems: 'center', 
                gap: { xs: 1, md: 2 }, 
                justifyContent: 'space-between',
                bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.3 : 0.6),
                border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                backdropFilter: 'blur(25px)',
                position: 'relative',
                boxShadow: (theme) => theme.palette.mode === 'dark' ? 'none' : '0 4px 30px rgba(0,0,0,0.05)'
            }}
        >
            {/* 🎯 CONTROL HUB TRACK */}
            <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                flexGrow: 1, 
                overflow: 'hidden',
                minWidth: 0 // Cần thiết để flex child co giãn đúng trong flex container
            }}>
                {/* Desktop Label */}
                <Typography variant="body2" sx={{ mr: 2, color: 'text.secondary', fontWeight: 800, whiteSpace: 'nowrap', display: { xs: 'none', md: 'block' }, letterSpacing: 0.5 }}>
                    SẮP XẾP THEO
                </Typography>
                
                <Stack 
                    direction="row" 
                    spacing={1.2} 
                    alignItems="center" 
                    sx={{ 
                        overflowX: 'auto', 
                        flexWrap: 'nowrap',
                        py: 0.5,
                        pr: 2,
                        '&::-webkit-scrollbar': { display: 'none' },
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                        maskImage: { 
                            xs: 'linear-gradient(to right, transparent, black 10%, black 85%, transparent)', 
                            md: 'none' 
                        } // Hiệu ứng fade 2 đầu trên mobile
                    }}
                >
                    {/* 🕵️ Nút Lọc & Sắp xếp Mobile */}
                    {onOpenFilter && (
                        <Button
                            onClick={onOpenFilter}
                            startIcon={<TuneIcon sx={{ fontSize: '1.1rem !important' }} />}
                            sx={{
                                display: { xs: 'flex', md: 'none' },
                                minWidth: 'max-content',
                                height: HEIGHT,
                                borderRadius: 10,
                                px: 2,
                                fontWeight: 900,
                                fontSize: '0.8rem',
                                color: 'primary.main',
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                border: (theme) => `1.5px solid ${theme.palette.primary.main}`,
                                flexShrink: 0
                            }}
                        >
                            Lọc
                        </Button>
                    )}

                    <RenderSortBtn label="Mới nhất" value="createdAt" />
                    <RenderSortBtn label="Phổ biến" value="view" />
                    <RenderSortBtn label="Bán chạy" value="sold" />

                    {/* DROPDOWN GIÁ */}
                    <Box sx={{ minWidth: { xs: '130px', md: '180px' }, flexShrink: 0 }}>
                        <Select
                            value={priceOrder} 
                            onChange={handlePriceChange} 
                            displayEmpty 
                            size="small"
                            IconComponent={SwapVertIcon}
                            sx={{
                                height: HEIGHT, 
                                width: '100%', 
                                borderRadius: 10,
                                bgcolor: (theme) => sortBy === 'price' ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                                color: sortBy === 'price' ? 'primary.main' : 'text.primary',
                                fontWeight: sortBy === 'price' ? 900 : 600,
                                fontSize: '0.8rem',
                                '& .MuiOutlinedInput-notchedOutline': { 
                                    borderColor: sortBy === 'price' ? theme.palette.primary.main : alpha(theme.palette.divider, 0.3),
                                    borderWidth: sortBy === 'price' ? 2 : 1
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                                '& .MuiSelect-select': { py: 0, pr: '24px !important', display: 'flex', alignItems: 'center' }
                            }}
                            MenuProps={{
                                PaperProps: {
                                    sx: {
                                        mt: 1, 
                                        borderRadius: 2,
                                        boxShadow: theme.shadows[8],
                                        '& .MuiMenuItem-root': { fontSize: '0.8rem', py: 1.5, fontWeight: 600 }
                                    }
                                }
                            }}
                        >
                            <MenuItem value="" sx={{ display: 'none' }}>Giá tiền</MenuItem>
                            <MenuItem value="asc">Giá: Thấp đến Cao</MenuItem>
                            <MenuItem value="desc">Giá: Cao đến Thấp</MenuItem>
                        </Select>
                    </Box>
                </Stack>
            </Box>

            {/* MINI PAGINATION (Mở cho cả Mobile) */}
            <Stack direction="row" alignItems="center" sx={{ flexShrink: 0, ml: { xs: 1, md: 2 } }}>
                <Box sx={{ mr: { xs: 1, md: 2 }, display: 'flex', alignItems: 'baseline' }}>
                    <Typography component="span" variant="body2" color="primary.main" fontWeight="900" sx={{ fontSize: { xs: '0.85rem', md: '1rem' } }}>{page}</Typography>
                    <Typography component="span" variant="body2" color="text.secondary" sx={{ opacity: 0.6, fontSize: '0.75rem' }}>/{pageSize}</Typography>
                </Box>

                <Box sx={{ display: { xs: 'none', sm: 'flex' }, borderRadius: 10, overflow: 'hidden', border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                    <IconButton disabled={page === 1} size="small" onClick={() => handlePageChange(page - 1)} sx={{ width: 34, height: 32, borderRadius: 0, borderRight: `1px solid ${theme.palette.divider}`, '&:hover': { color: 'primary.main' } }}>
                        <ChevronLeftIcon fontSize="small" />
                    </IconButton>
                    <IconButton disabled={page === pageSize} size="small" onClick={() => handlePageChange(page + 1)} sx={{ width: 34, height: 32, borderRadius: 0, '&:hover': { color: 'primary.main' } }}>
                        <ChevronRightIcon fontSize="small" />
                    </IconButton>
                </Box>
                
                {/* Mũi tên rút gọn cực đại trên Mobile cực nhỏ */}
                <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'flex', sm: 'none' } }}>
                     <IconButton disabled={page === 1} size="small" onClick={() => handlePageChange(page - 1)} sx={{ p: 0.5, color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                        <ChevronLeftIcon sx={{ fontSize: '1.2rem' }} />
                    </IconButton>
                    <IconButton disabled={page === pageSize} size="small" onClick={() => handlePageChange(page + 1)} sx={{ p: 0.5, color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                        <ChevronRightIcon sx={{ fontSize: '1.2rem' }} />
                    </IconButton>
                </Stack>
            </Stack>
        </Paper>
    );
};
export default SortProductList;