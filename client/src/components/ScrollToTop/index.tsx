import { useEffect } from 'react'
import { useLocation } from 'react-router'

/**
 * ScrollToTop Component
 * Tự động cuộn lên đầu trang mỗi khi route (pathname) thay đổi.
 * Tích hợp vào các Layout chính.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    // Cuộn lên đầu trang với hiệu ứng tức thì để tránh nhấp nháy giao diện
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    })
  }, [pathname])

  return null
}

export default ScrollToTop
