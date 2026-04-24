import type { Review } from '~/types/user.type';
import type { SuccessResponseApi } from '~/types/utils.type';
import http from '~/utils/http';

export interface CreateReviewRequest {
  product_id: string;
  rating: number;
  comment?: string;
}

export interface ReviewListResponse {
  data: Review[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  stats: {
    avg: number;
    distribution: Record<number, number>;
  };
}

const reviewApi = {
  getReviewsByProduct(productId: string, params?: { page?: number; limit?: number; rating?: number }) {
    return http.get<SuccessResponseApi<ReviewListResponse>>(`reviews/product/${productId}`, {
      params: params
    });
  },
  createReview(body: CreateReviewRequest) {
    return http.post<SuccessResponseApi<Review>>('reviews', body);
  },
  updateReview(id: string, body: Partial<Omit<CreateReviewRequest, 'product_id'>>) {
    return http.patch<SuccessResponseApi<Review>>(`reviews/${id}`, body);
  },
  deleteReview(id: string) {
    return http.delete(`reviews/${id}`);
  }
};

export default reviewApi;
