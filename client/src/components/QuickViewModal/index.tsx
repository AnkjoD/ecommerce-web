import { 
  Dialog, 
  DialogContent, 
  Box, 
  IconButton, 
  Grid, 
  Typography, 
  Stack, 
  Rating, 
  Button,
  alpha,
  useTheme,
  CircularProgress
} from '@mui/material';
import { Close as CloseIcon, ShoppingBagOutlined as ShoppingBagIcon } from '@mui/icons-material';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import productApi from '~/apis/product.api';
import type { ProductFull, ProductVariant } from '~/types/product.type';
import useAddToCart from '~/hooks/useAddToCart';
import InputNumber from '~/components/InputNumber';
import { useNavigate } from 'react-router';
import { generateNameId } from '~/utils/url';
import path from '~/constants/path';
import { motion } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: () => void;
  product: ProductFull;
}

export default function QuickViewModal({ open, onClose, product }: Props) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(product.variants[0]?.id);

  // 🚀 Fetch all variants for detailed options
  const { data: variantsRes, isLoading } = useQuery({
    queryKey: ['variants', product.id],
    queryFn: () => productApi.getVariants(product.id),
    enabled: open
  });

  const allVariants = useMemo(() => variantsRes?.data.data || [], [variantsRes]);
  const currentVariant = useMemo(() => 
    allVariants.find(v => v.id === selectedVariantId) || (product.variants[0] as ProductVariant), 
  [allVariants, selectedVariantId, product.variants]);

  const { addToCart, isPending } = useAddToCart();

  const optionKeys = useMemo(() => {
    const keys = new Set<string>();
    allVariants.forEach(v => v.options && Object.keys(v.options).forEach(k => keys.add(k)));
    return Array.from(keys);
  }, [allVariants]);

  const getOptionsValues = (key: string) => {
    const values = new Set<string>();
    allVariants.forEach(v => v.options?.[key] && values.add(v.options[key]));
    return Array.from(values);
  };

  const handleSelectOption = (key: string, value: string) => {
    const nextOptions = { ...currentVariant.options, [key]: value };
    const match = allVariants.find(v => 
        Object.entries(nextOptions).every(([k, val]) => v.options?.[k] === val)
    );
    if (match) setSelectedVariantId(match.id);
  };

  const handleAddToCartConfirm = () => {
    addToCart({ variant_id: selectedVariantId, quantity } as any, {
      onSuccess: () => { onClose(); }
    });
  };

  const handleGoToDetail = () => {
    onClose();
    navigate(`${path.home}${generateNameId({ name: product.name, id: selectedVariantId })}`);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 8, 
          overflow: 'hidden', 
          bgcolor: (theme) => alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(30px) saturate(180%)',
          boxShadow: `0 40px 100px ${alpha(theme.palette.common.black, 0.2)}`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }
      }}
    >
      <Box sx={{ position: 'relative' }}>
          <IconButton 
            onClick={onClose} 
            sx={{ position: 'absolute', right: 16, top: 16, zIndex: 10, bgcolor: alpha(theme.palette.action.hover, 0.05) }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          <DialogContent sx={{ p: 0 }}>
             <Grid container>
                <Grid size={{ xs: 12, md: 6 }}>
                   <Box sx={{ p: 4, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(theme.palette.divider, 0.02) }}>
                      <motion.img 
                        key={currentVariant?.image_url}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        src={currentVariant?.image_url || product.media.thumbnail} 
                        alt={product.name}
                        style={{ width: '100%', borderRadius: 24, boxShadow: `0 20px 50px ${alpha(theme.palette.common.black, 0.1)}` }}
                      />
                   </Box>
                </Grid>
                
                <Grid size={{ xs: 12, md: 6 }}>
                   <Box sx={{ p: { xs: 4, md: 6 }, height: '100%' }}>
                      <Typography variant="caption" color="primary" fontWeight={900} sx={{ letterSpacing: 2, mb: 1, display: 'block' }}>QUICK VIEW</Typography>
                      <Typography variant="h4" fontWeight={900} sx={{ mb: 2, letterSpacing: -1, lineHeight: 1.2 }}>{product.name}</Typography>
                      
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                         <Rating value={product.rating_avg} readOnly size="small" precision={0.5} />
                         <Typography variant="caption" fontWeight={800} color="text.secondary">({product.sold_count} ĐÃ BÁN)</Typography>
                      </Stack>

                      <Box sx={{ p: 2, px: 3, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.05), border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`, mb: 4, display: 'inline-block' }}>
                         <Typography variant="h5" fontWeight={1000} color="primary.main">
                            ₫{Number(currentVariant?.price || 0).toLocaleString()}
                         </Typography>
                      </Box>

                      {isLoading ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={20} /></Box>
                      ) : (
                        <Stack spacing={3} sx={{ mb: 4 }}>
                           {optionKeys.map(key => (
                              <Box key={key}>
                                 <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ display: 'block', mb: 1.5, letterSpacing: 1 }}>{key.toUpperCase()}</Typography>
                                 <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ gap: 1.5 }}>
                                    {getOptionsValues(key).map(val => {
                                       const isActive = currentVariant.options?.[key] === val;
                                       return (
                                          <Button
                                             key={val}
                                             variant={isActive ? "contained" : "outlined"}
                                             size="small"
                                             onClick={() => handleSelectOption(key, val)}
                                             sx={{ 
                                                borderRadius: 2, fontWeight: 800, minWidth: 60, px: 2,
                                                borderColor: isActive ? 'primary.main' : alpha(theme.palette.divider, 0.3),
                                                bgcolor: isActive ? 'primary.main' : 'transparent',
                                                color: isActive ? 'white' : 'text.primary'
                                             }}
                                          >
                                             {val}
                                          </Button>
                                       )
                                    })}
                                 </Stack>
                              </Box>
                           ))}

                           <Stack direction="row" alignItems="center" spacing={3} sx={{ pt: 2 }}>
                              <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ minWidth: 80 }}>SỐ LƯỢNG</Typography>
                              <InputNumber value={quantity} onChange={setQuantity} max={(currentVariant?.stock_quantity ?? 0) - (currentVariant?.reserved_quantity ?? 0)} />
                           </Stack>
                        </Stack>
                      )}

                      <Stack direction="row" spacing={2}>
                         <Button 
                           fullWidth 
                           variant="contained" 
                           onClick={handleAddToCartConfirm}
                           disabled={isPending || isLoading}
                           startIcon={<ShoppingBagIcon />}
                           sx={{ 
                              height: 56, borderRadius: 3, fontWeight: 900, 
                              boxShadow: `0 15px 30px ${alpha(theme.palette.primary.main, 0.2)}` 
                           }}
                         >
                            THÊM VÀO GIỎ
                         </Button>
                         <Button 
                            variant="outlined" 
                            onClick={handleGoToDetail}
                            sx={{ height: 56, borderRadius: 3, fontWeight: 900, px: 3, minWidth: 140, borderColor: alpha(theme.palette.divider, 0.2) }}
                         >
                            CHI TIẾT
                         </Button>
                      </Stack>
                   </Box>
                </Grid>
             </Grid>
          </DialogContent>
      </Box>
    </Dialog>
  )
}
