import type { RegisterOptions } from 'react-hook-form'
import type { FormRegister } from '~/types/FormRegister.type'
import * as yup from 'yup'

export type Rules = {
  [key in keyof FormRegister]?: RegisterOptions<FormRegister>
}
const phoneRegExp = /^(0|\+84)[3-9][0-9]{8}$/
export const Schema = yup
  .object({
    email: yup.string().required('Vui lòng nhập email').email('Vui lòng nhập đúng định dạng email'),
    password: yup
      .string()
      .required('Vui lòng nhập mật khẩu')
      .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
      .max(160, 'Mật khẩu phải có nhiều nhất 160 ký tự'),
    fullname: yup.string().required('Vui lòng nhập tên').min(2, 'Tên phải có ít nhất 2 ký tự'),
    phone: yup.string().required('Vui lòng nhập số điện thoại').matches(phoneRegExp, 'Số điện thoại phải là số'),
    confirm_password: yup
      .string()
      .required('Vui lòng nhập lại mật khẩu')
      .oneOf([yup.ref('password')], 'Mật khẩu không khớp')
  })
  .required()

export const LoginSchema = yup
  .object({
    email: yup.string().required('Vui lòng nhập email').email('Vui lòng nhập đúng định dạng email'),
    password: yup.string().required('Vui lòng nhập mật khẩu')
  })
  .required()

export const userSchema = yup.object({
  name: yup
    .string()
    .required('Vui lòng nhập tên')
    .min(2, 'Tên phải có ít nhất 2 ký tự')
    .max(160, 'Độ dài tối đa là 160 ký tự'),
  phone: yup
    .string()
    .required('Vui lòng nhập số điện thoại')
    .max(20, 'Độ dài tối đa là 20 ký tự')
    .matches(phoneRegExp, 'Số điện thoại không đúng định dạng'),
  address: yup.string().max(160, 'Độ dài tối đa là 160 ký tự'),
  avatar: yup.string().max(1000, 'Độ dài tối đa là 1000 ký tự'),
  date_of_birth: yup.date().max(new Date(), 'Hãy chọn một ngày trong quá khứ'),

  day: yup.number().min(1).max(31).nullable(),
  month: yup.number().min(1).max(12).nullable(),
  year: yup.number().min(1900).max(new Date().getFullYear()).nullable(),

  gender: yup.string().oneOf(['male', 'female', 'other'])
})

export type UserSchema = yup.InferType<typeof userSchema>

export const changePasswordSchema = yup.object({
  password: yup
    .string()
    .required('Mật khẩu cũ là bắt buộc')
    .min(6, 'Độ dài từ 6 - 160 ký tự')
    .max(160, 'Độ dài từ 6 - 160 ký tự'),

  new_password: yup
    .string()
    .required('Mật khẩu mới là bắt buộc')
    .min(6, 'Độ dài từ 6 - 160 ký tự')
    .max(160, 'Độ dài từ 6 - 160 ký tự'),

  confirm_password: yup
    .string()
    .required('Nhập lại mật khẩu là bắt buộc')
    .min(6, 'Độ dài từ 6 - 160 ký tự')
    .max(160, 'Độ dài từ 6 - 160 ký tự')
    .oneOf([yup.ref('new_password')], 'Nhập lại mật khẩu không khớp') // 👈 Logic quan trọng
})

export type ChangePasswordSchema = yup.InferType<typeof changePasswordSchema>
