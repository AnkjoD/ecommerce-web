import { Box, Typography, TextField, Button, Stack, useTheme } from '@mui/material'
import Grid from '@mui/material/Grid'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { changePasswordSchema, type ChangePasswordSchema } from '~/utils/rules'
import { toast } from 'react-toastify'
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import userApi from '~/apis/user.api'

export default function ChangePassword() {
  const theme = useTheme()
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ChangePasswordSchema>({
    defaultValues: { password: '', new_password: '', confirm_password: '' },
    resolver: yupResolver(changePasswordSchema)
  })

  const updatePasswordMutation = useMutation({
    mutationFn: (body: ChangePasswordSchema) => userApi.changePassword(body),
    onSuccess: (data) => {
      toast.success(data.data.message)
      reset()
    },
    onError: () => {
      reset()
    }
  })

  const onSubmit = async (data: ChangePasswordSchema) => {
    updatePasswordMutation.mutate(data)
  }

  return (
    <Box
      sx={{
        p: 4,
        borderRadius: 3,
        bgcolor: 'background.paper',
        boxShadow: theme.shadows[1],
        border: `1px solid ${theme.palette.divider}`
      }}
    >
      {/* HEADER */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', pb: 2, mb: 4 }}>
        <Typography variant='h5' fontWeight={600}>
          Đổi Mật Khẩu
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
          Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác
        </Typography>
      </Box>

      {/* FORM */}
      <Box component='form' onSubmit={handleSubmit(onSubmit)} sx={{ maxWidth: 700 }}>
        <Stack spacing={3}>
          <FormRow label='Mật khẩu hiện tại' error={errors.password} register={register('password')} />

          <FormRow label='Mật khẩu mới' error={errors.new_password} register={register('new_password')} />

          <FormRow label='Xác nhận mật khẩu' error={errors.confirm_password} register={register('confirm_password')} />

          {/* BUTTON GROUP */}
          <Grid container>
            <Grid size={{ xs: 12, sm: 4 }} />
            <Grid size={{ xs: 12, sm: 8 }}>
              <Button type='submit' variant='contained' sx={{ minWidth: 120, py: 1 }}>
                Lưu
              </Button>
            </Grid>
          </Grid>
        </Stack>
      </Box>
    </Box>
  )
}

// Component con để render dòng input cho gọn
function FormRow({ label, error, register }: { label: string; error?: FieldError; register: UseFormRegisterReturn }) {
  return (
    <Grid container alignItems='center'>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Typography color='text.secondary' variant='body2'>
          {label}
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, sm: 8 }}>
        <TextField fullWidth size='small' type='password' {...register} error={!!error} helperText={error?.message} />
      </Grid>
    </Grid>
  )
}
