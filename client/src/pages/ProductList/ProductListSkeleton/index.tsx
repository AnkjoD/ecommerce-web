
import { Box, Grid, Skeleton, Paper} from '@mui/material';

// 1. COMPONENT CON: SKELETON CHO 1 SẢN PHẨM
const ProductItemSkeleton = () => {
  return (
    <Paper sx={{ 
      p: 1, 
      borderRadius: 2, 
      boxShadow: 'none', 
      bgcolor: 'background.paper',
      border: 1,
      borderColor: 'divider' 
    }}>
      {/* Ảnh vuông */}
      <Skeleton variant="rectangular" width="100%" sx={{ paddingTop: '100%', borderRadius: 1, mb: 1 }} />
      
      {/* Tên */}
      <Skeleton variant="text" height={20} sx={{ mb: 0.5 }} />
      <Skeleton variant="text" width="80%" height={20} sx={{ mb: 1 }} />
      
      {/* Giá */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mb: 1 }}>
        <Skeleton variant="text" width="50%" height={30} />
        <Skeleton variant="text" width="30%" height={20} />
      </Box>

      {/* Rating */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="20%" />
      </Box>
    </Paper>
  );
};

// 2. COMPONENT CHÍNH: PRODUCT LIST SKELETON (BAO GỒM SORT BAR)
export const ProductListSkeleton = () => {
  return (
    <Box>
      {/* --- A. SORT BAR SKELETON --- */}
      <Paper sx={{ 
        p: 2, 
        mb: 2, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2, 
        bgcolor: 'background.default', // Màu nền nhẹ (thường là xám nhạt)
        borderRadius: 1 
      }}>
        {/* Label: "Sắp xếp theo" */}
        <Skeleton variant="text" width={100} height={24} />

        {/* Các nút: Mới nhất, Phổ biến, Bán chạy */}
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1 }}>
            <Skeleton variant="rectangular" width={90} height={34} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" width={90} height={34} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" width={90} height={34} sx={{ borderRadius: 1 }} />
        </Box>

        {/* Dropdown: Giá */}
        <Skeleton variant="rectangular" width={120} height={34} sx={{ borderRadius: 1 }} />

        {/* Phân trang nhỏ góc phải (1/10 < >) */}
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Skeleton variant="text" width={40} height={24} />
            <Skeleton variant="rounded" width={30} height={30} />
            <Skeleton variant="rounded" width={30} height={30} />
        </Box>
      </Paper>

      {/* --- B. GRID PRODUCT SKELETON --- */}
      <Grid container spacing={1}>
        {[...Array(10)].map((_, index) => (
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={index}>
            <ProductItemSkeleton />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ProductListSkeleton;