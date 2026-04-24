import { Box, Skeleton, Stack, Divider } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
const AsideFilterSkeleton = () => {
  const theme = useTheme();

  return (
    <Box sx={{
      width: '100%',
      p: 2,
      borderRadius: 2,
      bgcolor: alpha(theme.palette.background.paper, 0.6),
      backdropFilter: 'blur(12px)',
      border: `1px solid ${theme.palette.divider}`,
    }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Skeleton variant="circular" width={20} height={20} />
        <Skeleton variant="text" width={100} height={24} />
      </Stack>

      <Stack sx={{ mb: 3 }}>
        {[...Array(6)].map((_, index) => (
          <Skeleton 
            key={index} 
            variant="rounded" 
            height={36} 
            sx={{ mb: 0.5, borderRadius: 1 }} 
          />
        ))}
      </Stack>

      <Divider sx={{ mb: 3, borderColor: 'divider', borderStyle: 'dashed' }} />

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Skeleton variant="circular" width={20} height={20} />
        <Skeleton variant="text" width={80} height={24} />
      </Stack>

      <Box sx={{ mb: 3 }}>
        <Skeleton variant="text" width={120} sx={{ mb: 1 }} />
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Skeleton variant="rounded" width="100%" height={37} sx={{ borderRadius: 1 }} />
          <Box component="span" sx={{ alignSelf: 'center', color: 'text.disabled' }}>-</Box>
          <Skeleton variant="rounded" width="100%" height={37} sx={{ borderRadius: 1 }} />
        </Stack>
        <Skeleton variant="rounded" width="100%" height={36} sx={{ borderRadius: 1 }} />
      </Box>

      <Divider sx={{ mb: 3, borderColor: 'divider', borderStyle: 'dashed' }} />

      <Box sx={{ mb: 3 }}>
        <Skeleton variant="text" width={100} height={24} sx={{ mb: 1.5 }} />
        <Stack spacing={0.5}>
          {[...Array(5)].map((_, index) => (
            <Stack key={index} direction="row" alignItems="center" spacing={1} sx={{ py: 0.8 }}>
               <Skeleton variant="rounded" width={100} height={20} />
               <Skeleton variant="text" width={50} />
            </Stack>
          ))}
        </Stack>
      </Box>

      <Divider sx={{ mb: 3, borderColor: 'divider', borderStyle: 'dashed' }} />

      <Skeleton variant="rounded" width="100%" height={36} sx={{ borderRadius: 1 }} />
    </Box>
  );
};

export default AsideFilterSkeleton;