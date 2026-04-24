import { useState, useContext, useMemo } from 'react';
import { 
  Box, 
  Paper, 
  Tabs, 
  Tab, 
  Typography, 
  Stack, 
  Avatar, 
  Rating, 
  Divider, 
  Button,
  LinearProgress
} from '@mui/material';
import { 
  EditNote as EditNoteIcon, 
  CheckCircle as CheckCircleIcon,
  Reply as ReplyIcon,
  VerifiedUser as VerifiedUserIcon,
  AutoAwesome as AutoAwesomeIcon,
  FormatQuote as FormatQuoteIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { format, isValid } from 'date-fns';
import { AppContext } from '~/contexts/app.context';
import path from '~/constants/path';
import type { Product } from '~/types/product.type';
import reviewApi from '~/apis/review.api';
import SafeHtml from '~/components/SafeHtml';

interface Props {
  product: Product;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 4 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function ProductInfoTabs({ product }: Props) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AppContext);
  const [value, setValue] = useState(0);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');

  // FETCH REAL REVIEWS
  const { data: reviewsRes, isLoading: isLoadingReviews } = useQuery({
    queryKey: ['reviews', product.product.id, filterRating],
    queryFn: () => reviewApi.getReviewsByProduct(product.product.id, { 
        page: 1, 
        limit: 100, 
        rating: typeof filterRating === 'number' ? filterRating : undefined 
    }),
    enabled: !!product?.product?.id
  });

  const reviewsData = reviewsRes?.data.data;
  const reviews = reviewsData?.data || [];
  const stats = reviewsData?.stats;
  const ratingAvg = stats?.avg || product?.product?.rating_avg || 0;
  
  // DISTRIBUTION MAPPING (Logic: 5 to 1)
  const distribution = useMemo(() => {
    const raw = stats?.distribution || {};
    return [5, 4, 3, 2, 1].map(star => ({
      star,
      count: raw[star] || 0,
      percent: reviewsData?.total ? (raw[star] || 0) / reviewsData.total * 100 : 0
    }));
  }, [stats, reviewsData?.total]);

  const productMeta = product?.product;
  const descriptionHtml = productMeta?.description?.html || productMeta?.description?.full || '';

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Paper 
      elevation={0} 
      className="animate-in fade-in duration-700"
      sx={{ 
        mt: 4, 
        p: { xs: 3.5, md: 5 }, 
        borderRadius: 8, 
        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.4), 
        border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        backdropFilter: 'blur(40px) saturate(180%)',
        boxShadow: (theme) => `0 20px 60px ${alpha(theme.palette.common.black, 0.03)}`,
      }}
    >
      {/* 1. TAB NAVIGATION - ELITE LOOK */}
      <Box sx={{ borderBottom: 1, borderColor: (theme) => alpha(theme.palette.divider, 0.08), mx: { xs: -3.5, md: -5 }, px: { xs: 3.5, md: 5 }, mt: -3.5 }}>
        <Tabs 
            value={value} 
            onChange={handleChange} 
            textColor="primary" 
            indicatorColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            sx={{
                '& .MuiTab-root': { 
                    fontWeight: 900, 
                    fontSize: '0.9rem', 
                    textTransform: 'uppercase', 
                    py: 3,
                    letterSpacing: 2,
                    opacity: 0.5,
                    transition: 'all 0.3s ease',
                    '&.Mui-selected': { opacity: 1, color: 'primary.main' }
                },
                '& .MuiTabs-indicator': { height: 4, borderRadius: '4px 4px 0 0' }
            }}
        >
          <Tab label="Mô Tả Sản Phẩm" />
          <Tab label={`Đánh Giá ${reviewsData?.total ? `(${reviewsData.total})` : ''}`} />
          <Tab label="Thông Số Kỹ Thuật" />
        </Tabs>
      </Box>

      {/* 2. DESCRIPTION PANEL */}
      <TabPanel value={value} index={0}>
        <Stack spacing={4}>
           <Typography variant="h5" fontWeight={900} sx={{ color: 'text.primary', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 2 }}>
                <AutoAwesomeIcon color="primary" /> CHI TIẾT VÀ ỨNG DỤNG
           </Typography>
           
           <Box sx={{ 
               typography: 'body1', 
               color: 'text.secondary', 
               lineHeight: 2,
               fontSize: '1.05rem',
               '& img': { maxWidth: '100%', borderRadius: 4, my: 4, boxShadow: 10 },
               '& h2, & h3': { color: 'text.primary', fontWeight: 900, mt: 4, mb: 2 }
           }}>
               <SafeHtml html={descriptionHtml} />
           </Box>
        </Stack>
      </TabPanel>

      {/* 3. REVIEWS PANEL - CUSTOMER ANALYTICS */}
      <TabPanel value={value} index={1}>
         <Stack spacing={6}>
            {/* 🚀 ANALYTICS DASHBOARD CARD */}
            <Box 
                sx={{ 
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.03), 
                    p: { xs: 4, md: 6 }, 
                    borderRadius: 6, 
                    display: 'flex', 
                    alignItems: { xs: 'center', md: 'stretch' }, 
                    gap: { xs: 4, md: 8 }, 
                    flexDirection: { xs: 'column', md: 'row' }, 
                    border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.03, pointerEvents: 'none' }}>
                   <StarIcon sx={{ fontSize: 240 }} />
                </Box>

                <Box sx={{ textAlign: 'center', minWidth: { md: 240 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Typography variant="h1" color="primary.main" fontWeight={900} sx={{ fontSize: { xs: '4rem', md: '5rem' }, lineHeight: 1, letterSpacing: -2 }}>
                        {ratingAvg.toFixed(1)}
                    </Typography>
                    <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ my: 2 }}>
                       {[1, 2, 3, 4, 5].map(n => (
                         <StarIcon key={n} sx={{ color: n <= Math.round(ratingAvg) ? 'warning.main' : alpha(theme.palette.divider, 0.2), fontSize: 28 }} />
                       ))}
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 900, letterSpacing: 2, opacity: 0.6 }}>CHỈ SỐ HÀI LÒNG</Typography>
                </Box>
                
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' }, opacity: 0.5 }} />

                <Box sx={{ flex: 1, width: '100%' }}>
                   <Stack spacing={1.5}>
                      {distribution.map((item) => (
                        <Stack key={item.star} direction="row" alignItems="center" spacing={3}>
                           <Typography variant="caption" fontWeight={900} sx={{ minWidth: 40, letterSpacing: 1 }}>{item.star} SAO</Typography>
                           <Box sx={{ flex: 1 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={item.percent} 
                                sx={{ 
                                  height: 8, 
                                  borderRadius: 4, 
                                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                                  '& .MuiLinearProgress-bar': {
                                    borderRadius: 4,
                                    bgcolor: item.star >= 4 ? 'emerald.500' : item.star === 3 ? 'warning.main' : 'rose.500'
                                  }
                                }} 
                              />
                           </Box>
                           <Typography variant="caption" fontWeight={900} sx={{ minWidth: 40, textAlign: 'right', opacity: 0.4 }}>{item.count}</Typography>
                        </Stack>
                      ))}
                   </Stack>
                </Box>
            </Box>

            {/* 🎯 FILTER SYSTEM */}
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ gap: 1.5, justifyContent: 'center' }}>
                <Button 
                    variant={filterRating === 'all' ? "contained" : "outlined"} 
                    onClick={() => setFilterRating('all')}
                    sx={{ 
                      borderRadius: 100, fontWeight: 900, px: 3, height: 44, fontSize: '0.75rem', letterSpacing: 1,
                      ...(filterRating !== 'all' && { borderColor: alpha(theme.palette.divider, 0.2), color: 'text.secondary' }) 
                    }}
                >
                    Tất cả ({reviewsData?.total || 0})
                </Button>
                {[5, 4, 3, 2, 1].map((star) => (
                    <Button 
                        key={star}
                        variant={filterRating === star ? "contained" : "outlined"} 
                        onClick={() => setFilterRating(star)}
                        sx={{ 
                            borderRadius: 100, 
                            fontWeight: 900, 
                            px: 3, height: 44, fontSize: '0.75rem', letterSpacing: 1,
                            borderColor: filterRating === star ? 'primary.main' : alpha(theme.palette.divider, 0.2),
                            color: filterRating === star ? 'white' : 'text.secondary',
                            '&:hover': { borderColor: 'primary.main', color: filterRating === star ? 'white' : 'primary.main' }
                        }}
                    >
                        {star} Sao ({distribution.find(d => d.star === star)?.count || 0})
                    </Button>
                ))}
            </Stack>

            {/* 💬 REVIEW LIST - ELITE FEED */}
            <Stack spacing={4}>
                {isLoadingReviews ? (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                        <Typography color="text.secondary" fontWeight={900} sx={{ letterSpacing: 2 }}>ĐANG DỮ LIỆU PHẢN HỒI...</Typography>
                    </Box>
                ) : reviews.map((review) => (
                    <Box 
                      key={review.id} 
                      sx={{ 
                        p: 4, 
                        borderRadius: 6, 
                        border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.06)}`,
                        bgcolor: (theme) => alpha(theme.palette.action.hover, 0.02),
                        position: 'relative',
                        transition: 'all 0.3s ease',
                        '&:hover': { border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.01) }
                      }}
                    >
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                            <Avatar 
                                sx={{ 
                                    width: 64, height: 64, 
                                    border: (theme) => `3px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                    bgcolor: 'primary.main', fontWeight: 900, fontSize: '1.5rem'
                                }} 
                            >
                                {(review.user?.full_name || 'U').charAt(0)}
                            </Avatar>
                            
                            <Box flex={1}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                    <Stack direction="row" alignItems="center" spacing={1.5}>
                                       <Typography variant="subtitle1" fontWeight={900}>{review.user?.full_name || 'Khách hàng ẩn danh'}</Typography>
                                       {review.is_verified && (
                                           <Badge 
                                              variant="outlined" 
                                              icon={<VerifiedUserIcon sx={{ fontSize: '10px !important' }} />}
                                              sx={{ 
                                                bgcolor: 'emerald.500/10', color: 'emerald.600', border: 'none', 
                                                fontSize: '0.65rem', fontWeight: 900, px: 1, py: 0.5, borderRadius: 1 
                                              }}
                                           >
                                              CHÍNH CHỦ
                                           </Badge>
                                       )}
                                    </Stack>
                                    <Typography variant="caption" color="text.disabled" fontWeight={800} sx={{ letterSpacing: 1 }}>
                                        {review.created_at ? format(new Date(review.created_at), 'dd/MM/yyyy') : '---'}
                                    </Typography>
                                </Stack>
                                
                                <Rating 
                                  value={review.rating} 
                                  size="small" 
                                  readOnly 
                                  sx={{ color: review.rating >= 4 ? 'emerald.main' : review.rating === 3 ? 'warning.main' : 'rose.500', mb: 2 }} 
                                />
                                
                                <Box sx={{ position: 'relative', pl: 1 }}>
                                   <FormatQuoteIcon sx={{ position: 'absolute', top: -10, left: -20, opacity: 0.05, fontSize: 40 }} />
                                   <Typography variant="body1" sx={{ color: review.rating >= 4 ? 'text.secondary' : 'text.primary', fontStyle: 'italic', fontWeight: 600, lineHeight: 1.8 }}>
                                       {review.comment || 'Khách hàng không để lại nội dung.'}
                                   </Typography>
                                </Box>

                                {/* 🚀 PROFESSIONAL ADMIN REPLY UI */}
                                {review.admin_reply && (
                                   <motion.div 
                                     initial={{ opacity: 0, scale: 0.98 }}
                                     animate={{ opacity: 1, scale: 1 }}
                                     style={{ marginTop: 24 }}
                                   >
                                      <Box sx={{ 
                                        p: 3, 
                                        borderRadius: 4, 
                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                                        border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
                                        position: 'relative'
                                      }}>
                                         <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
                                            <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                                               <ReplyIcon sx={{ fontSize: 14, color: 'white', transform: 'scaleX(-1)' }} />
                                            </Avatar>
                                            <Typography variant="caption" fontWeight={900} color="primary" sx={{ letterSpacing: 1.5 }}>PHẢN HỒI TỪ HOMURA HQ</Typography>
                                         </Stack>
                                         <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, lineHeight: 1.6 }}>{review.admin_reply}</Typography>
                                         {review.admin_reply_at && (
                                           <Typography variant="caption" sx={{ display: 'block', mt: 1.5, opacity: 0.4, fontWeight: 800, fontSize: '0.6rem' }}>
                                              KẾT CHUYỂN: {format(new Date(review.admin_reply_at), 'HH:mm — dd/MM/yyyy')}
                                           </Typography>
                                         )}
                                      </Box>
                                   </motion.div>
                                )}
                            </Box>
                        </Stack>
                    </Box>
                ))}
            </Stack>
         </Stack>
      </TabPanel>

      {/* 4. SPECIFICATIONS PANEL */}
      <TabPanel value={value} index={2}>
        <Box sx={{ maxWidth: '100%', borderRadius: 6, overflow: 'hidden', border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Stack spacing={0}>
                {[
                    { label: 'Thương hiệu chiến lược', value: productMeta?.brand || 'Homura Global' },
                    { label: 'Phân loại danh mục', value: productMeta?.category?.name || 'Trụ cột chính' },
                    { label: 'Định danh SKU', value: product.sku },
                    { label: 'Trạng thái vận hành', value: 'Sẵn sàng giao hàng' }
                ].map((row, idx) => (
                    <Stack 
                        key={idx} 
                        direction="row" 
                        justifyContent="space-between" 
                        sx={{ 
                            p: 4, 
                            bgcolor: idx % 2 === 0 ? 'transparent' : alpha(theme.palette.action.hover, 0.03),
                            borderBottom: idx === 3 ? 'none' : (theme) => `1px solid ${alpha(theme.palette.divider, 0.05)}`
                        }}
                    >
                        <Typography variant="body2" color="text.secondary" fontWeight={900} sx={{ letterSpacing: 1 }}>{row.label.toUpperCase()}</Typography>
                        <Typography variant="body2" fontWeight={900} color="primary.main">{row.value}</Typography>
                    </Stack>
                ))}
            </Stack>
        </Box>
      </TabPanel>
    </Paper>
  );
}