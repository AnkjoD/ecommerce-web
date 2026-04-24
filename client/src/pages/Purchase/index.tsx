import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { 
  Box, Tabs, Tab, Typography, Button, Paper, 
  Stack,  useTheme,  Skeleton, alpha, InputBase, IconButton, Divider
} from '@mui/material'
import { LocalMall, Search, FilterList } from '@mui/icons-material'
import purchaseApi from '~/apis/purchase.api'
import type { PurchaseListStatus } from '~/types/purchase.type' 
import PurchaseBox from './PurchaseBox'
import { purchaseStatus as statusConst } from '~/constants/purchase'

// 2. CẤU HÌNH TABS (Mapping status -> Label hiển thị)
const purchaseTabs = [
  { status: statusConst.all, label: 'Tất cả' },
  { status: statusConst.waitForConfirmation, label: 'Chờ xác nhận' },
  { status: statusConst.waitForGetting, label: 'Chờ lấy hàng' },
  { status: statusConst.inProgress, label: 'Đang giao' },
  { status: statusConst.delivered, label: 'Đã hoàn thành' },
  { status: statusConst.cancelled, label: 'Đã hủy' },
  { status: statusConst.paymentFailed, label: 'Thanh toán lỗi' }
]

export default function PurchasePage() {
  const theme = useTheme()
  const [status, setStatus] = useState<string>(statusConst.all)
  const [searchQuery, setSearchQuery] = useState('')

  // 3. GỌI API
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['purchases', { status }],
    queryFn: () => purchaseApi.getOrders({ 
        status: status === statusConst.all ? undefined : (status === statusConst.waitForGetting ? 'processing,confirmed' : status) as PurchaseListStatus,
        limit: 20 
    })
  })
  
  const allOrders = ordersData?.data.data.data || []
  
  // Lọc chuẩn xác theo tab đang chọn và từ khóa tìm kiếm
  const orders = allOrders.filter(o => {
    // 1. Phải khớp trạng thái (trừ tab "Tất cả")
    const orderStatus = o.status.toLowerCase().trim();
    const activeTab = status.toLowerCase().trim();
    
    let isMatchStatus = activeTab === statusConst.all;
    if (!isMatchStatus) {
      if (activeTab === statusConst.waitForGetting) {
        isMatchStatus = ['processing', 'confirmed'].includes(orderStatus);
      } else {
        isMatchStatus = orderStatus === activeTab;
      }
    }

    if (!isMatchStatus) return false;

    // 2. Phải khớp mã đơn hàng (nếu có tìm kiếm)
    if (searchQuery && !o.order_code.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  })

  const handleChangeTab = (_: React.SyntheticEvent, newValue: string) => {
    setStatus(newValue)
  }

  return (
    <Box sx={{ width: '100%' }}>
      
      {/* --- THANH TÌM KIẾM --- */}
      <Paper
        elevation={0}
        sx={{
          p: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          mb: 3,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(20px)',
          boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.03)}`
        }}
      >
        <IconButton sx={{ p: '10px' }} aria-label="search">
          <Search />
        </IconButton>
        <InputBase
          sx={{ ml: 1, flex: 1, fontWeight: 500 }}
          placeholder="Tìm đơn hàng theo Mã đơn hàng..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
        <IconButton color="primary" sx={{ p: '10px' }} aria-label="filter">
          <FilterList />
        </IconButton>
      </Paper>
      
      {/* --- THANH TABS --- */}
      <Paper 
        elevation={0}
        sx={{ 
           mb: 3, position: 'sticky', top: 0, zIndex: 10,
           borderRadius: 4, 
           border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
           bgcolor: alpha(theme.palette.background.paper, 0.8), 
           backdropFilter: 'blur(30px)',
           boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.04)}`,
           overflow: 'hidden'
        }}
      >
         <Tabs 
            value={status} 
            onChange={handleChangeTab} 
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
                backgroundColor: theme.palette.primary.main
              },
              '& .MuiTab-root': {
                minHeight: 60,
                fontSize: '0.875rem',
                fontWeight: 700,
                textTransform: 'none',
                color: theme.palette.text.secondary,
                '&.Mui-selected': {
                  color: theme.palette.primary.main
                }
              }
            }}
         >
            {purchaseTabs.map(tab => (
                <Tab key={tab.status} label={tab.label} value={tab.status} />
            ))}
         </Tabs>
      </Paper>

      {/* --- DANH SÁCH ĐƠN HÀNG --- */}
      <Stack spacing={2.5}>
         {isLoading ? (
             // Loading Skeleton
             Array.from({ length: 3 }).map((_, index) => (
                 <Paper key={index} sx={{ p: 3, borderRadius: 2 }}><Skeleton variant="rectangular" height={150} /></Paper>
             ))
         ) : orders.length > 0 ? (
             orders.map((order) => (
                <PurchaseBox order={order} key={order.id} />
             ))
         ) : (
             // Empty State
             <Paper sx={{ p: 5, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2 }}>
                 <LocalMall sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
                 <Typography variant="h6" color="text.secondary">Chưa có đơn hàng</Typography>
                 <Button component={Link} to="/" variant="contained" sx={{ mt: 2 }}>Mua sắm ngay</Button>
             </Paper>
         )}
      </Stack>
    </Box>
  )
}