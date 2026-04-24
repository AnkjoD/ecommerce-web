import http from '~/utils/http'

export interface ValidateCouponReq {
  code: string
  order_total: number
}

export interface CouponResponse {
  valid: boolean
  coupon_id: string
  discount_amount: number
  coupon: {
    id: string
    code: string
    discount_type: 'percent' | 'fixed'
    discount_value: number
    min_order_value: number
    usage_limit: number
    used_count: number
    expires_at: string | null
    is_active: boolean
  }
}

const couponApi = {
  validate(data: ValidateCouponReq) {
    return http.post<CouponResponse>('/coupons/validate', data)
  },
  getActiveCoupons() {
    return http.get<SuccessResponseApi<CouponResponse['coupon'][]>>('/coupons/active')
  }
}

export default couponApi
