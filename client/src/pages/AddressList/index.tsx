import { useState, useContext, useEffect } from 'react'
import { AppContext } from '~/contexts/app.context'
import {
  Box,
  Typography,
  Button,
  Stack,
  Paper,
  IconButton,
  Chip,
  alpha,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Skeleton,
  Autocomplete
} from '@mui/material'
import useProvinces from '~/hooks/useProvinces'
import { Add, LocationOn, Edit, Delete, CheckCircle } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { motion, AnimatePresence } from 'framer-motion'
import addressApi from '~/apis/address.api'
import type { AddressRequest } from '~/apis/address.api'
import type { Address, User } from '~/types/user.type'

export default function AddressList() {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const { profile } = useContext(AppContext)
  const [open, setOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)

  const { data: addressesRes, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressApi.getAddresses()
  })
  const addresses = addressesRes?.data.data || []

  const createAddressMutation = useMutation({
    mutationFn: (body: AddressRequest) => addressApi.createAddress(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      toast.success('Thêm địa chỉ thành công!')
      handleClose()
    }
  })

  const updateAddressMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<AddressRequest> }) =>
      addressApi.updateAddress(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      toast.success('Cập nhật địa chỉ thành công!')
      handleClose()
    }
  })

  const deleteAddressMutation = useMutation({
    mutationFn: (id: string) => addressApi.deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      toast.success('Đã xóa địa chỉ')
    }
  })

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => addressApi.setDefaultAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      toast.success('Đã đặt làm địa chỉ mặc định')
    }
  })

  const handleOpen = (address?: Address) => {
    if (address) setEditingAddress(address)
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setEditingAddress(null)
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) {
      deleteAddressMutation.mutate(id)
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant='h4' fontWeight={1000} sx={{ letterSpacing: '-0.02em', mb: 1 }}>
            Địa Chỉ Của Tôi
          </Typography>
          <Typography variant='body1' color='text.secondary' fontWeight={500}>
            Quản lý địa chỉ nhận hàng để việc mua sắm trở nên dễ dàng hơn.
          </Typography>
        </Box>
        <Button
          variant='contained'
          startIcon={<Add />}
          onClick={() => handleOpen()}
          sx={{
            borderRadius: 3,
            px: 3,
            py: 1.5,
            fontWeight: 1000,
            boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}`
          }}
        >
          THÊM ĐỊA CHỈ MỚI
        </Button>
      </Box>

      {isLoading ? (
        <Stack spacing={2}>
          {[1, 2].map((i) => (
            <Skeleton key={i} variant='rectangular' height={120} sx={{ borderRadius: 4 }} />
          ))}
        </Stack>
      ) : (
        <Stack spacing={2.5}>
          <AnimatePresence>
            {addresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                onEdit={() => handleOpen(address)}
                onDelete={() => handleDelete(address.id)}
                onSetDefault={() => setDefaultMutation.mutate(address.id)}
              />
            ))}
          </AnimatePresence>
          {addresses.length === 0 && (
            <Paper
              sx={{
                p: 10,
                textAlign: 'center',
                borderRadius: 6,
                bgcolor: alpha(theme.palette.background.paper, 0.4),
                border: `2px dashed ${alpha(theme.palette.divider, 0.1)}`
              }}
            >
              <LocationOn sx={{ fontSize: 60, color: 'text.disabled', mb: 2, opacity: 0.3 }} />
              <Typography variant='h6' color='text.secondary' fontWeight={800}>
                Bạn chưa có địa chỉ nào
              </Typography>
              <Typography variant='body2' color='text.disabled' sx={{ mt: 1 }}>
                Hãy thêm địa chỉ để bắt đầu mua sắm ngay nhé!
              </Typography>
            </Paper>
          )}
        </Stack>
      )}

      <AddressDialog
        open={open}
        onClose={handleClose}
        address={editingAddress}
        profile={profile}
        onSubmit={(data) => {
          if (editingAddress) {
            updateAddressMutation.mutate({ id: editingAddress.id, body: data })
          } else {
            createAddressMutation.mutate(data)
          }
        }}
        loading={createAddressMutation.isPending || updateAddressMutation.isPending}
      />
    </Box>
  )
}

function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault
}: {
  address: Address
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
}) {
  const theme = useTheme()
  return (
    <Paper
      component={motion.div}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      sx={{
        p: 3,
        borderRadius: 4,
        position: 'relative',
        border: `1px solid ${address.is_default ? alpha(theme.palette.primary.main, 0.3) : alpha(theme.palette.divider, 0.1)}`,
        bgcolor: address.is_default ? alpha(theme.palette.primary.main, 0.02) : 'background.paper',
        transition: '0.3s',
        '&:hover': {
          boxShadow: `0 10px 30px ${alpha(theme.palette.common.black, 0.05)}`,
          borderColor: theme.palette.primary.main
        }
      }}
    >
      <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
        <Stack spacing={1}>
          <Stack direction='row' spacing={1.5} alignItems='center'>
            <Typography variant='subtitle1' fontWeight={1000}>
              {address.recipient_name}
            </Typography>
            <Divider orientation='vertical' sx={{ height: 16, my: 'auto' }} />
            <Typography variant='body2' color='text.secondary' fontWeight={700}>
              {address.phone}
            </Typography>
            {address.is_default && (
              <Chip
                label='MẶC ĐỊNH'
                size='small'
                color='primary'
                onDelete={() => {}}
                deleteIcon={<CheckCircle />}
                sx={{
                  fontWeight: 900,
                  fontSize: '0.65rem',
                  height: 20,
                  '& .MuiChip-deleteIcon': { color: 'white', fontSize: 14 }
                }}
              />
            )}
          </Stack>
          <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.6 }}>
            {address.street}
            <br />
            {address.ward}, {address.district}, {address.province}
          </Typography>
        </Stack>

        <Stack direction='row' spacing={1}>
          <IconButton size='small' color='primary' onClick={onEdit} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
            <Edit fontSize='small' />
          </IconButton>
          <IconButton size='small' color='error' onClick={onDelete} sx={{ bgcolor: alpha(theme.palette.error.main, 0.1) }}>
            <Delete fontSize='small' />
          </IconButton>
        </Stack>
      </Stack>

      {!address.is_default && (
        <Button
          size='small'
          variant='outlined'
          onClick={onSetDefault}
          sx={{ mt: 2, borderRadius: 2, fontWeight: 900, fontSize: '0.75rem' }}
        >
          Thiết lập mặc định
        </Button>
      )}
    </Paper>
  )
}

function Divider({ orientation, sx }: { orientation?: 'vertical' | 'horizontal'; sx?: Record<string, any> }) {
  return <Box sx={{ width: orientation === 'vertical' ? '1px' : '100%', bgcolor: 'divider', height: orientation === 'vertical' ? '100%' : '1px', ...sx }} />
}

function AddressDialog({
  open,
  onClose,
  address,
  profile,
  onSubmit,
  loading
}: {
  open: boolean
  onClose: () => void
  address: Address | null
  profile: User | null
  onSubmit: (data: AddressRequest) => void
  loading: boolean
}) {
  const [formData, setFormData] = useState<AddressRequest>({
    recipient_name: '',
    phone: '',
    province: '',
    district: '',
    ward: '',
    street: '',
    is_default: false
  })

  const { data: vietnamData = [], isLoading: isProvincesLoading } = useProvinces()

  useEffect(() => {
    if (address) {
      setFormData({
        recipient_name: address.recipient_name,
        phone: address.phone,
        province: address.province,
        district: address.district,
        ward: address.ward,
        street: address.street,
        is_default: address.is_default
      })
    }
  }, [address])

  // Manual reset on open/close handled by top component calling us with different 'address' prop
  // But let's add an effect for better UX
  useEffect(() => {
    if (open && !address) {
       setFormData({
          recipient_name: profile?.full_name || '',
          phone: profile?.phone || '',
          province: '',
          district: '',
          ward: '',
          street: '',
          is_default: false
       })
    }
  }, [open, address, profile])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleProvinceChange = (_: any, value: string | null) => {
    setFormData((prev) => ({
      ...prev,
      province: value || '',
      district: '',
      ward: ''
    }))
  }

  const handleDistrictChange = (_: any, value: string | null) => {
    setFormData((prev) => ({
      ...prev,
      district: value || '',
      ward: ''
    }))
  }

  const handleWardChange = (_: any, value: string | null) => {
    setFormData((prev) => ({
      ...prev,
      ward: value || ''
    }))
  }

  const selectedProvince = vietnamData.find((p) => p.name === formData.province)
  const selectedDistrict = selectedProvince?.districts.find((d) => d.name === formData.district)

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth PaperProps={{ sx: { borderRadius: 5, p: 1 } }}>
      <form onSubmit={handleFormSubmit}>
        <DialogTitle sx={{ fontWeight: 1000, fontSize: '1.5rem' }}>
          {address ? 'Cập Nhật Địa Chỉ' : 'Thêm Địa Chỉ Mới'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Stack direction='row' spacing={2}>
              <TextField
                fullWidth
                label='Tên người nhận'
                name='recipient_name'
                value={formData.recipient_name}
                onChange={handleChange}
                required
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
              <TextField
                fullWidth
                label='Số điện thoại'
                name='phone'
                value={formData.phone}
                onChange={handleChange}
                required
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
            </Stack>
            <Autocomplete<string>
              fullWidth
              options={vietnamData.map((p) => p.name)}
              value={formData.province || null}
              loading={isProvincesLoading}
              onChange={handleProvinceChange}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label='Tỉnh / Thành phố' 
                  required 
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} 
                />
              )}
            />
            <Stack direction='row' spacing={2}>
              <Autocomplete<string>
                fullWidth
                options={selectedProvince?.districts.map((d) => d.name) || []}
                disabled={!formData.province}
                value={formData.district || null}
                onChange={handleDistrictChange}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label='Quận / Huyện' 
                    required 
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} 
                  />
                )}
              />
              <Autocomplete<string>
                fullWidth
                options={selectedDistrict?.wards.map((w) => w.name) || []}
                disabled={!formData.district}
                value={formData.ward || null}
                onChange={handleWardChange}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label='Phường / Xã' 
                    required 
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} 
                  />
                )}
              />
            </Stack>
            <TextField
              fullWidth
              label='Địa chỉ chi tiết (Số nhà, tên đường...)'
              name='street'
              multiline
              rows={2}
              value={formData.street}
              onChange={handleChange}
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            />
            <FormControlLabel
              control={<Checkbox name='is_default' checked={formData.is_default} onChange={handleChange} />}
              label={<Typography fontWeight={700}>Đặt làm địa chỉ mặc định</Typography>}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose} variant='text' color='inherit' sx={{ fontWeight: 900 }}>
            HỦY BỎ
          </Button>
          <Button
            type='submit'
            variant='contained'
            loading={loading}
            sx={{ px: 4, borderRadius: 3, fontWeight: 900 }}
          >
            {address ? 'CẬP NHẬT' : 'HOÀN TẤT'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
