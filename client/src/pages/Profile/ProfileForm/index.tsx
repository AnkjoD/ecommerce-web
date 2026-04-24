import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Stack,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  Skeleton,
  useTheme,
  alpha,
  Divider,
  Paper,
  IconButton
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { omit } from 'lodash-es'
import { toast } from 'react-toastify'
import { motion, AnimatePresence } from 'framer-motion'
import EditIcon from '@mui/icons-material/Edit'
import CameraAltIcon from '@mui/icons-material/CameraAlt'

import { userSchema, type UserSchema } from '~/utils/rules'
import useUserProfile from '~/hooks/useUserProfile'
import type { UpdateUser } from '~/types/user.type'

const range = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i)

type FormData = UserSchema & {
  day?: number
  month?: number
  year?: number
}

export default function ProfileForm() {
  const { profile, updateUser, isUpdating } = useUserProfile()
  const theme = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isEditMode, setIsEditMode] = useState(false)
  const [file, setFile] = useState<File>()

  const previewImage = useMemo(() => {
    return file ? URL.createObjectURL(file) : ''
  }, [file])

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty }
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      phone: '',
      address: '',
      avatar: '',
      gender: 'other',
      day: 1,
      month: 1,
      year: 2000
    },
    resolver: yupResolver(userSchema) as never
  })

  useEffect(() => {
    if (profile) {
      const dob = profile.date_of_birth ? new Date(profile.date_of_birth) : new Date(2000, 0, 1)
      reset({
        name: profile.name || '',
        phone: profile.phone || '',
        address: profile.address || '',
        avatar: profile.avatar || '',
        gender: profile.gender || 'other',
        date_of_birth: dob,
        day: dob.getDate(),
        month: dob.getMonth() + 1,
        year: dob.getFullYear()
      })
    }
  }, [profile, reset])

  const handleFileChange = (fileFromLocal?: File) => {
    if (fileFromLocal && (fileFromLocal.size >= 1048576 || !fileFromLocal.type.includes('image'))) {
      toast.warning('Dụng lượng file tối đa 1MB và phải là định dạng ảnh')
    } else {
      setFile(fileFromLocal)
    }
  }

  const onSubmit = async (data: FormData) => {
    try {
      const dateOfBirth = new Date(data.year!, data.month! - 1, data.day!)
      const finalData = omit({ ...data, date_of_birth: dateOfBirth.toISOString() }, [
        'day',
        'month',
        'year'
      ]) as UpdateUser

      await updateUser(finalData as UpdateUser, file)

      setIsEditMode(false)
      setFile(undefined)
      toast.success('Cập nhật hồ sơ thành công!')
    } catch (error) {
      console.error(error)
    }
  }

  if (!profile)
    return (
      <Paper sx={{ p: 4, borderRadius: 6 }}>
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 4 }} />
      </Paper>
    )

  return (
    <Paper
      elevation={0}
      component={motion.div}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      sx={{
        p: { xs: 3, md: 5 },
        borderRadius: 6,
        bgcolor: alpha(theme.palette.background.paper, 0.6),
        backdropFilter: 'blur(40px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        boxShadow: `0 30px 60px ${alpha(theme.palette.common.black, 0.05)}`,
        overflow: 'hidden'
      }}
    >
      <Box sx={{ mb: 5 }}>
        <Typography variant='h4' fontWeight={1000} sx={{ letterSpacing: '-0.02em', mb: 1 }}>
          Hồ Sơ Của Tôi
        </Typography>
        <Typography variant='body1' color='text.secondary' fontWeight={500}>
          Quản lý thông tin cá nhân và cài đặt tài khoản bảo mật.
        </Typography>
      </Box>

      <Box component='form' onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={6}>
          {/* Avatar Section */}
          <Grid size={{ xs: 12, md: 4 }} sx={{ order: { xs: 1, md: 2 } }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                position: 'relative'
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={previewImage || profile.avatar || undefined}
                  sx={{ 
                    width: { xs: 140, md: 180 }, 
                    height: { xs: 140, md: 180 }, 
                    mb: 3, 
                    border: `6px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    boxShadow: `0 20px 40px ${alpha(theme.palette.common.black, 0.1)}`
                  }}
                />
                <AnimatePresence>
                  {isEditMode && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                    >
                      <IconButton
                        onClick={() => fileInputRef.current?.click()}
                        sx={{
                          position: 'absolute',
                          bottom: 25,
                          right: 15,
                          bgcolor: 'primary.main',
                          color: 'white',
                          boxShadow: theme.shadows[4],
                          '&:hover': { bgcolor: 'primary.dark' }
                        }}
                      >
                        <CameraAltIcon />
                      </IconButton>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Box>

              <input
                hidden
                ref={fileInputRef}
                accept='image/*'
                type='file'
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />
              
              <Stack alignItems="center" spacing={0.5} sx={{ opacity: isEditMode ? 1 : 0.5, transition: '0.3s' }}>
                <Typography variant='caption' fontWeight={800} color='text.secondary'>
                  DUNG LƯỢNG TỐI ĐA 1 MB
                </Typography>
                <Typography variant='caption' fontWeight={800} color='text.secondary'>
                  ĐỊNH DẠNG: .JPEG, .PNG
                </Typography>
              </Stack>
            </Box>
          </Grid>

          {/* Form Fields Section */}
          <Grid size={{ xs: 12, md: 8 }} sx={{ order: { xs: 2, md: 1 } }}>
            <Stack spacing={4}>
              <Box>
                <Typography variant="caption" fontWeight={900} color="primary.main" sx={{ letterSpacing: 1.5, mb: 1, display: 'block' }}>
                  THÔNG TIN CƠ BẢN
                </Typography>
                <Divider sx={{ mb: 3, opacity: 0.1 }} />
                
                <Stack spacing={3.5}>
                  {renderFormRow('Email', <Typography fontWeight={800} sx={{ opacity: 0.6 }}>{profile.email}</Typography>)}

                  {renderFormRow(
                    'Họ và tên',
                    <AnimatePresence mode='wait'>
                      {!isEditMode ? (
                        <Typography key="view" fontWeight={1000} variant="h6">{profile.name}</Typography>
                      ) : (
                        <Controller
                          key="edit"
                          name='name'
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              placeholder="Nhập họ và tên..."
                              error={!!errors.name}
                              helperText={errors.name?.message}
                              sx={{
                                '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: alpha(theme.palette.action.hover, 0.05) }
                              }}
                            />
                          )}
                        />
                      )}
                    </AnimatePresence>
                  )}

                  {renderFormRow(
                    'Số điện thoại',
                    <AnimatePresence mode='wait'>
                      {!isEditMode ? (
                        <Typography key="view" fontWeight={1000}>{profile.phone || 'Chưa cập nhật'}</Typography>
                      ) : (
                        <Controller
                          key="edit"
                          name='phone'
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              fullWidth
                              placeholder="Nhập số điện thoại..."
                              error={!!errors.phone}
                              helperText={errors.phone?.message}
                              sx={{
                                '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: alpha(theme.palette.action.hover, 0.05) }
                              }}
                            />
                          )}
                        />
                      )}
                    </AnimatePresence>
                  )}
                </Stack>
              </Box>

              <Box>
                <Typography variant="caption" fontWeight={900} color="primary.main" sx={{ letterSpacing: 1.5, mb: 1, display: 'block' }}>
                  CHI TIẾT CÁ NHÂN
                </Typography>
                <Divider sx={{ mb: 3, opacity: 0.1 }} />

                <Stack spacing={3.5}>
                  {renderFormRow(
                    'Giới tính',
                    <AnimatePresence mode='wait'>
                      {!isEditMode ? (
                        <Box key="view" sx={{ display: 'inline-flex', px: 2, py: 0.5, borderRadius: 100, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                          <Typography fontWeight={1000} sx={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
                            {profile.gender === 'male' ? 'Nam' : profile.gender === 'female' ? 'Nữ' : 'Khác'}
                          </Typography>
                        </Box>
                      ) : (
                        <Controller
                          key="edit"
                          name='gender'
                          control={control}
                          render={({ field }) => (
                            <RadioGroup row {...field}>
                              <FormControlLabel value='male' control={<Radio />} label={<Typography fontWeight={700}>Nam</Typography>} />
                              <FormControlLabel value='female' control={<Radio />} label={<Typography fontWeight={700}>Nữ</Typography>} />
                              <FormControlLabel value='other' control={<Radio />} label={<Typography fontWeight={700}>Khác</Typography>} />
                            </RadioGroup>
                          )}
                        />
                      )}
                    </AnimatePresence>
                  )}

                  {renderFormRow(
                    'Ngày sinh',
                    <AnimatePresence mode='wait'>
                      {!isEditMode ? (
                        <Typography key="view" fontWeight={1000}>{profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</Typography>
                      ) : (
                        <Stack key="edit" direction='row' spacing={1.5}>
                          {['day', 'month', 'year'].map((key) => (
                            <Controller
                              key={key}
                              name={key as 'year' | 'month' | 'day'}
                              control={control}
                              render={({ field }) => (
                                <Select 
                                  {...field} 
                                  fullWidth
                                  sx={{ borderRadius: 3, bgcolor: alpha(theme.palette.action.hover, 0.05) }}
                                  MenuProps={{ PaperProps: { sx: { maxHeight: 300, borderRadius: 3 } } }}
                                >
                                  {key === 'day' && range(1, 31).map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                                  {key === 'month' && range(1, 12).map((m) => <MenuItem key={m} value={m}>Tháng {m}</MenuItem>)}
                                  {key === 'year' && range(1950, 2025).reverse().map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                                </Select>
                              )}
                            />
                          ))}
                        </Stack>
                      )}
                    </AnimatePresence>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Grid>
        </Grid>

        <Box sx={{ mt: 8, pt: 4, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`, display: 'flex', justifyContent: 'flex-end' }}>
          <AnimatePresence mode='wait'>
            {!isEditMode ? (
              <Button 
                key="edit-btn"
                component={motion.button}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                variant='contained' 
                startIcon={<EditIcon />}
                onClick={() => setIsEditMode(true)} 
                sx={{ 
                  height: 56, px: 6, borderRadius: 3, 
                  fontWeight: 1000, letterSpacing: 1.5,
                  boxShadow: `0 15px 30px ${alpha(theme.palette.primary.main, 0.3)}`
                }}
              >
                SỬA HỒ SƠ
              </Button>
            ) : (
              <Stack key="action-btns" direction='row' spacing={2}>
                <Button
                  variant='outlined'
                  color='inherit'
                  onClick={() => {
                    setIsEditMode(false)
                    reset()
                    setFile(undefined)
                  }}
                  sx={{ height: 56, px: 4, borderRadius: 3, fontWeight: 900 }}
                >
                  HỦY BỎ
                </Button>
                <Button 
                  type='submit' 
                  variant='contained' 
                  disabled={!isDirty && !file}
                  loading={isUpdating} 
                  sx={{ 
                    height: 56, px: 6, borderRadius: 3, 
                    fontWeight: 1000, letterSpacing: 1.5,
                    boxShadow: !isDirty && !file ? 'none' : `0 15px 30px ${alpha(theme.palette.primary.main, 0.3)}`
                  }}
                >
                  LƯU THAY ĐỔI
                </Button>
              </Stack>
            )}
          </AnimatePresence>
        </Box>
      </Box>
    </Paper>
  )
}

function renderFormRow(label: string, content: React.ReactNode) {
  return (
    <Grid container alignItems='center'>
      <Grid size={{ xs: 12, sm: 3 }}>
        <Typography color='text.secondary' fontWeight={800} variant='body2' sx={{ letterSpacing: 0.5 }}>
          {label.toUpperCase()}
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, sm: 9 }}>{content}</Grid>
    </Grid>
  )
}
