import { AppContext, initialAppContext } from "~/contexts/app.context"
import { purchaseStatus } from "~/constants/purchase"
import React, { useState } from 'react'
import type { User } from "~/types/user.type"
import { LocalStorageEventTarget, clearLS, setProfileToLS, getProfileFromLS } from "~/utils/auth"
import * as authApi from "~/apis/auth.api"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { isAxiosError } from 'axios'
import FlyingProduct from "~/pages/ProductDetail/FlyingProduct"

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(initialAppContext.isAuthenticated)
  const [profile, setProfile] = useState<User | null>(getProfileFromLS())
  const [isOpenAsideCart, setIsOpenAsideCart] = useState<boolean>(false)
  const cartIconRef = React.useRef<HTMLButtonElement>(null)
  const [cartBumpCount, setCartBumpCount] = useState<number>(0)
  const [flyingData, setFlyingData] = useState<{ image: string; startPos: any } | null>(null)

  const queryClient = useQueryClient()
  const triggerCartBump = React.useCallback(() => {
    setCartBumpCount(prev => prev + 1)
  }, [])
  
  const refreshCart = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['purchases', { status: purchaseStatus.inCart }] })
  }, [queryClient])

  /**
   * clearAppState() — Chỉ xóa React state trong AppProvider.
   * Không gọi clearLS() để tránh vòng lặp vô tận.
   */
  const clearAppState = React.useCallback(() => {
    setIsAuthenticated(false)
    setProfile(null)
  }, [])

  /**
   * reset() — Logout hoàn toàn: Xóa state + Xóa storage
   */
  const reset = React.useCallback(() => {
    clearAppState()
    clearLS()
  }, [clearAppState])

  /**
   * 🛡️ Elite Fix: Luôn cho phép getMe chạy 1 lần lúc Page Load
   * Ngay cả khi LS trống, app vẫn sẽ thử lấy profile từ Cookie (Silent Login)
   */
  const profileQuery = useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    staleTime: 1000 * 60 * 30, // 30 phút
    retry: 0,
    // Elite Fix: Luôn cho phép chạy lúc load để đồng bộ với Server
    // Nếu Server báo 401, hàm useEffect bên dưới sẽ tự động gọi reset()
    enabled: true, 
  })

  const { data: meData, status, error } = profileQuery

  React.useEffect(() => {
    const user = meData?.data?.data

    if (user) {
      setIsAuthenticated(true)
      setProfile(user)
      setProfileToLS(user)
    } else if (status === 'error') {
      if (isAxiosError(error) && error.response?.status === 401) {
        reset()
      }
    }
  }, [meData, status, error, reset])

  // 🔄 Cross-Tab Synchronization
  React.useEffect(() => {
    // 1. Lắng nghe event clearLS từ interceptor (nội bộ tab)
    LocalStorageEventTarget.addEventListener('clearLS', clearAppState)
    
    // 2. Lắng nghe event storage (từ các tab khác)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'profile' && !event.newValue) {
        // Nếu Tab khác xóa profile -> Tab này cũng xóa state
        clearAppState()
      }
    }
    window.addEventListener('storage', handleStorageChange)

    return () => {
      LocalStorageEventTarget.removeEventListener('clearLS', clearAppState)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [clearAppState])

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated,
        profile,
        setProfile,
        reset,
        isOpenAsideCart,
        setIsOpenAsideCart,
        cartIconRef,
        cartBumpCount,
        triggerCartBump,
        refreshCart,
        flyingData,
        setFlyingData
      }}
    >
      {children}
      {/* 🌠 GLOBAL FLYING ANIMATION PORTAL */}
      {flyingData && cartIconRef.current && (
        <FlyingProduct 
          image={flyingData.image}
          startPos={flyingData.startPos}
          endPos={{ 
            x: cartIconRef.current.getBoundingClientRect().left + cartIconRef.current.getBoundingClientRect().width / 2, 
            y: cartIconRef.current.getBoundingClientRect().top + cartIconRef.current.getBoundingClientRect().height / 2
          }}
          onComplete={() => setFlyingData(null)}
        />
      )}
    </AppContext.Provider>
  )
}