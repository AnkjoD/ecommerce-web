import { type User } from '~/types/user.type'

export const LocalStorageEventTarget = new EventTarget()

// Elite Note: Không còn lưu AccessToken và RefreshToken vào LocalStorage nữa
// Chúng đã được cất giấu an toàn trong HttpOnly Cookies.

export const getAccessTokenFromLS = () => {
  // Trả về chuỗi rỗng vì JS không thể đọc được Cookie
  return ''
}

export const getRefreshTokenFromLS = () => {
  return ''
}

export const saveAccessTokenToLS = () => {}
export const saveRefreshTokenToLS = () => {}
export const removeAccessTokenFromLS = () => {}
export const removeRefreshTokenFromLS = () => {}

export const setProfileToLS = (profile: User) => {
  localStorage.setItem('profile', JSON.stringify(profile))
}

export const getProfileFromLS = (): User | null => {
  const result = localStorage.getItem('profile')
  if (result && result !== 'undefined') {
    try {
      return JSON.parse(result)
    } catch (error) {
      return null
    }
  }
  return null
}

export const removeProfileFromLS = () => {
  localStorage.removeItem('profile')
}

export const clearLS = () => {
  removeProfileFromLS()
  // Elite Note: Server sẽ lo việc xóa Cookie khi gọi API Logout
  const clearLSEvent = new Event('clearLS')
  LocalStorageEventTarget.dispatchEvent(clearLSEvent)
}
