import { Box, Button, Card, Divider, FormControl, Link, Typography } from '@mui/material'
import { GoogleIcon } from '~/components/CustomIcons'
import { useForm } from 'react-hook-form'
import { Schema } from '~/utils/rules'
import type { FormRegister } from '~/types/FormRegister.type'
import Input from '~/components/Input'
import { yupResolver } from '@hookform/resolvers/yup'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { registerAccount } from '~/apis/auth.api'
import type { ErrorResponseApi } from '~/types/utils.type'
import { isAxiosUnprocessableEntityError } from '~/utils/error'
import AuthButton from '~/components/AppButton'
import { AppContext } from '~/contexts/app.context'
import { toast } from 'react-toastify'
import { setProfileToLS } from '~/utils/auth'
import { useContext } from 'react'
import { useNavigate, useLocation } from 'react-router'

const Register = () => {
  const { setIsAuthenticated, setProfile } = useContext(AppContext)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<FormRegister>({
    resolver: yupResolver(Schema)
  })
  const registerAccountMutation = useMutation({
    mutationFn: (body: { full_name: string; email: string; password: string; phone: string }) => {
      return registerAccount(body)
    }
  })
  const onSubmit = handleSubmit((data) => {
    const body = {
      full_name: data.fullname,
      email: data.email,
      password: data.password,
      phone: data.phone || ''
    }
    registerAccountMutation.mutate(body, {
      onSuccess: (response) => {
        const user = response.data.data
        setIsAuthenticated(true)
        setProfile(user)
        setProfileToLS(user)
        queryClient.setQueryData(['me'], response)
        toast.success('Đăng ký tài khoản thành công!')
        
        // 🚀 REDIRECT BACK LOGIC
        const from = (location.state as any)?.from?.pathname || '/';
        navigate(from, { replace: true });
      },
      onError: (error) => {
        type FormError = Omit<FormRegister, 'confirm_password'>
        if (isAxiosUnprocessableEntityError<ErrorResponseApi<FormError>>(error)) {
          const formError = error.response?.data.data
          if (formError) {
            Object.keys(formError).forEach((key) => {
              setError(key as keyof FormError, {
                message: formError[key as keyof FormError],
                type: 'Server'
              })
            })
          } else {
            toast.error(error.response?.data.message || 'Dữ liệu không hợp lệ')
          }
        } else {
          toast.error('Đã có lỗi xảy ra. Vui lòng thử lại!')
        }
      }
    })
  })
  return (
    <Card variant='outlined' className='flex flex-col p-10 gap-4 w-[100%]'>
      <Typography variant='h4' sx={{ fontWeight: 'bold' }}>
        Sign Up
      </Typography>
      <Box
        component='form'
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          gap: 2
        }}
        noValidate
        onSubmit={onSubmit}
      >
        <FormControl sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Input
            type='text'
            name='fullname'
            error={errors.fullname ? true : false}
            helperText={errors.fullname?.message}
            placeholder='Fullname'
            label='Fullname'
            autoComplete='name'
            register={register}
          />

          <Input
            type='string'
            placeholder='Số điện thoại'
            autoComplete='phone'
            name='phone'
            error={errors.phone ? true : false}
            helperText={errors.phone?.message}
            label='Số điện thoại'
            register={register}
          />

          <Input
            type='text'
            placeholder='Email'
            autoComplete='email'
            name='email'
            error={errors.email ? true : false}
            helperText={errors.email?.message}
            label='Email'
            register={register}
          />

          <Input
            type='password'
            placeholder='Password'
            autoComplete='new-password'
            name='password'
            error={errors.password ? true : false}
            helperText={errors.password?.message}
            label='Password'
            register={register}
          />

          <Input
            type='password'
            placeholder='Confirm Password'
            autoComplete='neww-password'
            name='confirm_password'
            error={errors.confirm_password ? true : false}
            helperText={errors.confirm_password?.message}
            label='Confirm Password'
            register={register}
          />
        </FormControl>
        <AuthButton
          type='submit'
          variant='contained'
          size='large'
          fullWidth
          sx={{ mt: 2, mb: 2 }}
          loading={registerAccountMutation.isPending}
        >
          CREATE ACCOUNT
        </AuthButton>
        <Divider>or</Divider>
        <Button fullWidth variant='outlined' color='inherit' startIcon={<GoogleIcon />} sx={{ padding: 1 }}>
          Sign Up with Google
        </Button>
        <Typography sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
          Already have an account?
          <Link href='/login' color='inherit' sx={{ alignSelf: 'center', fontWeight: 'bold' }}>
            Sign In
          </Link>
        </Typography>
      </Box>
    </Card>
  )
}

export default Register
