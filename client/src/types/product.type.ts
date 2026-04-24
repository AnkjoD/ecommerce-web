import type { Category } from './category.type'

export interface ProductMetadata {
  id: string
  name: string
  description: {
    short: string
    full: string
    html?: string
  }
  media: {
    images: string[]
    video_url?: string
    thumbnail?: string
  }
  brand?: string
  tags: string[]
  min_price: number
  max_price: number
  sold_count: number
  view_count: number
  rating_avg: number
  category?: Category
  variants?: ProductVariant[]
}

export interface ProductVariant {
  id: string // ID của Variant
  sku: string
  price: number
  price_before_discount: number | null
  stock_quantity: number
  reserved_quantity: number
  sold_count: number
  view_count: number
  color?: string
  size?: string
  image_url?: string
  product: ProductMetadata
}

export interface ProductFull extends ProductMetadata {
  variants: ProductVariant[]
}

export type Product = ProductVariant

export type productList = Product[]

export type ProductsConfig = {
  page?: number
  limit?: number
  sort_by?: 'createdAt' | 'view_count' | 'sold_count' | 'price'
  order?: 'asc' | 'desc'
  price_max?: number
  price_min?: number
  min_price?: number
  max_price?: number
  name?: string
  category?: string
  exclude?: string
  rating_filter?: number
  sort?: string
}

export interface SuccessProductListResponse {
  message: string
  statusCode: number
  data: {
    data: ProductFull[]
    total: number
    page: number
    limit: number
    total_pages: number
  }
}

export interface SuccessVariantsResponse {
  message: string
  statusCode: number
  data: ProductVariant[]
}

export interface SuccessProductResponse {
  message: string
  data: ProductVariant
}
