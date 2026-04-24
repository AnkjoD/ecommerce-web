import axios, { type AxiosInstance, AxiosError } from 'axios'
import { LocalStorageEventTarget } from './auth'

const URL_REFRESH_TOKEN = '/auth/refresh'
const URL_LOGIN = '/auth/login'
const URL_REGISTER = '/auth/register'

/**
 * Http client với Silent Refresh và Race Condition protection.
 *
 * Race Condition fix:
 * - Nếu nhiều request 401 đến cùng lúc (ví dụ /auth/me + /cart),
 *   chỉ 1 request refresh được gửi đi.
 * - Các request còn lại được xếp vào hàng đợi (failedQueue).
 * - Sau khi refresh xong, tất cả request trong queue được retry.
 */
class Http {
  instance: AxiosInstance

  // Race condition protection
  private isRefreshing = false
  private failedQueue: Array<{
    resolve: (value?: unknown) => void
    reject: (err: unknown) => void
  }> = []

  constructor() {
    this.instance = axios.create({
      // Dùng relative URL → Vite proxy forward sang localhost:4000
      // → Cookie là same-origin → không bị block bởi browser
      baseURL: '/api',
      timeout: 10000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'X-HM-Secure': 'true'
      }
    })

    this.instance.interceptors.request.use(
      (config) => config,
      (error) => Promise.reject(error)
    )

    this.instance.interceptors.response.use(
      (res) => res,
      async (error: AxiosError) => {
        const isUnauthorized = error.response?.status === 401
        const isRefreshUrl = error.config?.url?.includes(URL_REFRESH_TOKEN)
        const isAuthUrl = error.config?.url?.includes(URL_LOGIN) || error.config?.url?.includes(URL_REGISTER)

        // Bỏ qua: không phải 401, hoặc là chính URL auth/refresh, hoặc là login/register
        if (!isUnauthorized || isRefreshUrl || isAuthUrl) {
          return Promise.reject(error)
        }

        // Nếu đang có refresh request khác đang xử lý → xếp vào queue, chờ
        if (this.isRefreshing) {
          return new Promise((resolve, reject) => {
            this.failedQueue.push({ resolve, reject })
          })
            .then(() => {
              // Sau khi refresh xong, retry request gốc
              return this.instance(error.config!)
            })
            .catch((err) => Promise.reject(err))
        }

        // Đây là request refresh đầu tiên
        this.isRefreshing = true

        try {
          await this.instance.post(URL_REFRESH_TOKEN)
          // Refresh thành công → unblock tất cả request đang chờ
          this.processQueue(null)
          // Retry request gốc
          return this.instance(error.config!)
        } catch (refreshError) {
          // Refresh thất bại → reject tất cả request đang chờ
          this.processQueue(refreshError)
          this.handleLogout()
          return Promise.reject(refreshError)
        } finally {
          this.isRefreshing = false
        }
      }
    )
  }

  /** Giải phóng tất cả request đang chờ trong queue */
  private processQueue(error: unknown) {
    this.failedQueue.forEach((p) => {
      if (error) {
        p.reject(error)
      } else {
        p.resolve()
      }
    })
    this.failedQueue = []
  }

  private handleLogout() {
    const clearLSEvent = new Event('clearLS')
    LocalStorageEventTarget.dispatchEvent(clearLSEvent)
  }
}

const http = new Http().instance
export default http
