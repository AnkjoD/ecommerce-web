import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useContext } from 'react'
import { toast } from 'react-toastify'
import userApi from '~/apis/user.api'
import { AppContext } from '~/contexts/app.context'
import type { UpdateUser } from '~/types/user.type'
import { setProfileToLS, getProfileFromLS } from '~/utils/auth'
import {type AxiosError} from 'axios'
import type { ErrorResponseApi } from '~/types/utils.type'

export default function useUserProfile() {
  const queryClient = useQueryClient()
  const { setProfile, profile: profileFromContext, isAuthenticated } = useContext(AppContext)

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: userApi.getProfile,
    staleTime: 1000 * 60 * 5,
    retry: 0,
    enabled: isAuthenticated, // Dùng context thay vì hàm luôn return false
    initialData: () => {
      const profile = profileFromContext || getProfileFromLS()
      return profile ? { data: { data: profile } } : undefined
    }
  })

  const uploadAvatarMutation = useMutation({ mutationFn: userApi.uploadAvatar })
  const updateProfileMutation = useMutation({ mutationFn: userApi.updateProfile })

  const updateUser = async (data: UpdateUser, file?: File) => {
    try {
      let avatarName = data.avatar

      if (file) {
        const form = new FormData()
        form.append('image', file)
        const uploadRes = await uploadAvatarMutation.mutateAsync(form)
        avatarName = uploadRes.data.data
      }

      // 🛠️ FIX 422: Format date to YYYY-MM-DD which is strictly required by some backends
      const formattedDate = data.date_of_birth 
        ? new Date(data.date_of_birth).toISOString().split('T')[0] 
        : undefined

      // 🛠️ FIX 422: Backend expects 'full_name' but User type has 'name'
      // Also, 'address' is NOT whitelisted for profile updates
      const { name, address, ...restData } = data as any
      const body = {
        ...restData,
        full_name: name,
        date_of_birth: formattedDate,
        avatar: avatarName
      }

      const res = await updateProfileMutation.mutateAsync(body)

      const newProfile = res.data.data
      setProfile(newProfile)
      setProfileToLS(newProfile)
      queryClient.setQueryData(['profile'], res)

      toast.success('Cập nhật hồ sơ thành công!')
      return newProfile
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponseApi<{ [key: string]: string }>>
      const status = axiosError.response?.status
      
      // 🚀 Handle Timeout & Specific Cloudinary errors (499, 504)
      if (axiosError.code === 'ECONNABORTED' || status === 499 || status === 504) {
        toast.error('Yêu cầu quá hạn. Vui lòng kiểm tra kết nối mạng hoặc cấu hình Cloudinary (Server có thể đang bị treo).')
      } else {
        const message = axiosError.response?.data?.message || 'Lỗi cập nhật hồ sơ'
        toast.error(message)
      }
      
      // 🚀 Log detailed validation errors for debugging
      if (status === 422) {
        console.group('❌ [Elite Debug] Profile Update Failed (422)')
        console.error('Validation Error Details:', axiosError.response?.data)
        console.groupEnd()
      }

      throw error
    }
  }

  return {
    profile: profileQuery.data?.data.data || null,
    isUpdating: updateProfileMutation.isPending || uploadAvatarMutation.isPending,
    updateUser
  }
}