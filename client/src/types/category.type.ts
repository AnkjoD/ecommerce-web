import type { SuccessResponseApi } from './utils.type'

export type Category = {
  _id: string
  id: string
  slug: string
  name: string
  parent_id?: string
}
export type SuccessCategoryListResponse = SuccessResponseApi<Category[]>
