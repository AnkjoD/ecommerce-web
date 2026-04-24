import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Rating,
  TextField,
  Typography,
  Stack,
  Box,
  alpha,
  useTheme,
  Avatar
} from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import reviewApi from '~/apis/review.api'
import type { OrderItem } from '~/types/purchase.type'

interface Props {
  open: boolean
  onClose: () => void
  purchase: OrderItem
}

export default function ReviewModal({ open, onClose, purchase }: Props) {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const [rating, setRating] = useState<number | null>(5)
  const [comment, setComment] = useState('')

  const createReviewMutation = useMutation({
    mutationFn: (body: { product_id: string; rating: number; comment: string }) =>
      reviewApi.createReview(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      toast.success('Cám ơn bạn đã đánh giá sản phẩm!')
      onClose()
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || 'Có lỗi xảy ra khi gửi đánh giá'
      toast.error(message)
    }
  })

  const handleSubmit = () => {
    if (!rating) {
      toast.warn('Vui lòng chọn số sao đánh giá')
      return
    }
    createReviewMutation.mutate({
      product_id: purchase.variant?.product?.id || '', // ID từ ProductMetadata
      rating,
      comment
    })
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth='sm' 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 6, p: 1 }
      }}
    >
      <DialogTitle sx={{ fontWeight: 1000, textAlign: 'center', fontSize: '1.5rem', pt: 3 }}>
        Đánh Giá Sản Phẩm
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Thông tin sản phẩm */}
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            p: 2, 
            borderRadius: 3, 
            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.4),
            border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.1)}`
          }}>
            <Avatar 
              src={purchase.variant?.product?.media?.thumbnail || purchase.variant?.product?.media?.images?.[0] || undefined} 
              variant="rounded" 
              sx={{ width: 64, height: 64, borderRadius: 2 }} 
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={800} noWrap>
                {purchase.product_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Phân loại: {purchase.variant_info}
              </Typography>
            </Box>
          </Box>

          {/* Chọn số sao */}
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h6" fontWeight={900} gutterBottom>
              Vui lòng đánh giá chất lượng sản phẩm
            </Typography>
            <Rating
              value={rating}
              onChange={(_, newValue) => setRating(newValue)}
              size="large"
              sx={{ fontSize: '3rem', color: 'warning.main' }}
            />
            {rating && (
                <Typography variant="body2" color="warning.main" fontWeight={1000} sx={{ mt: 1 }}>
                    {rating === 5 ? 'Tuyệt vời' : rating === 4 ? 'Hài lòng' : rating === 3 ? 'Bình thường' : rating === 2 ? 'Không hài lòng' : 'Rất tệ'}
                </Typography>
            )}
          </Box>

          {/* Bình luận */}
          <TextField
             fullWidth
             multiline
             rows={4}
             placeholder="Hãy chia sẻ nhận xét của bạn về sản phẩm này nhé..."
             value={comment}
             onChange={(e) => setComment(e.target.value)}
             sx={{ 
                '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: alpha(theme.palette.action.hover, 0.05) }
             }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 4, pt: 1, justifyContent: 'center', gap: 2 }}>
        <Button 
          onClick={onClose} 
          variant="text" 
          color="inherit" 
          sx={{ fontWeight: 900, px: 4 }}
        >
          TRỞ LẠI
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={createReviewMutation.isPending}
          sx={{ 
            px: 6, 
            borderRadius: 3, 
            fontWeight: 1000,
            boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}`
          }}
        >
          HOÀN TẤT
        </Button>
      </DialogActions>
    </Dialog>
  )
}
