import { createContext } from 'react'
import { getAccessTokenFromLS, getProfileFromLS } from '~/utils/auth' 
import { type User } from '~/types/user.type'
// 1. Cập nhật Interface: Thêm profile và setProfile
export interface AppContextInterface {
  isAuthenticated: boolean
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>
  profile: User | null
  setProfile: React.Dispatch<React.SetStateAction<User | null>>
  reset: () => void 
  
  // 🛒 Cart States
  isOpenAsideCart: boolean
  setIsOpenAsideCart: React.Dispatch<React.SetStateAction<boolean>>
  cartIconRef: React.RefObject<HTMLButtonElement | null> | null
  cartBumpCount: number
  triggerCartBump: () => void
  refreshCart: () => void
  
  // ✈️ Flying Animation
  flyingData: { image: string; startPos: any } | null
  setFlyingData: React.Dispatch<React.SetStateAction<{ image: string; startPos: any } | null>>
}

// 2. Giá trị khởi tạo: Lấy từ LocalStorage ra để F5 không mất
export const initialAppContext: AppContextInterface = {
  isAuthenticated: Boolean(getProfileFromLS()),
  setIsAuthenticated: () => null,
  profile: getProfileFromLS(), 
  setProfile: () => null,
  reset: () => null,
  
  // 🛒 Cart Defaults
  isOpenAsideCart: false,
  setIsOpenAsideCart: () => null,
  cartIconRef: null,
  cartBumpCount: 0,
  triggerCartBump: () => null,
  refreshCart: () => null,
  flyingData: null,
  setFlyingData: () => null
}

export const AppContext = createContext<AppContextInterface>(initialAppContext)

