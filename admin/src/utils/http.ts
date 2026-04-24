import { clearLS } from './auth';

class Http {
  private baseURL = '/api';

  async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseURL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Xử lý lỗi 401 - Để AuthContext và Router tự điều phối thay vì reload trang cứng
    if (response.status === 401) {
      if (!url.includes('/auth/login')) {
        // Có thể emit event hoặc đơn giản là để component catch lỗi 401
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Đã xảy ra lỗi hệ thống' }));
      // Extract specific message from backend standard error response
      throw new Error(error.message || 'Lỗi không xác định');
    }

    const json = await response.json();
    // Tự động unwrap thuộc tính 'data' nếu tồn tại (từ TransformInterceptor)
    return json && typeof json === 'object' && 'data' in json ? json.data : json;
  }

  get<T>(url: string, options?: RequestInit) {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  post<T>(url: string, body?: any, options?: RequestInit) {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  patch<T>(url: string, body?: any, options?: RequestInit) {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete<T>(url: string, options?: RequestInit) {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }
}

const http = new Http();
export default http;
