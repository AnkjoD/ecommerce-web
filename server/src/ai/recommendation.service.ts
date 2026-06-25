// import { Injectable, Inject } from '@nestjs/common';
// import { CACHE_MANAGER } from '@nestjs/cache-manager';
// import { Cache } from 'cache-manager';
// import { EmbeddingService } from './embedding.service';
// import { VectorSearchService } from './vector-search.service';
// import { BehaviorService } from './behavior.service';

// @Injectable()
// export class RecommendationService {
//   constructor(
//     private embeddingService: EmbeddingService,
//     private vectorSearchService: VectorSearchService,
//     private behaviorService: BehaviorService,
//     @Inject(CACHE_MANAGER) private cacheManager: Cache,
//   ) {}

//   async getRecommendations(productId: string, userId?: string, limit = 8) {
//     const cacheKey = `rec:${productId}:${userId ?? 'guest'}`;
//     const cached = await this.cacheManager.get(cacheKey);
//     if (cached) return cached;

//     // 1. Lấy vector của sản phẩm hiện tại
//     const similar = await this.vectorSearchService
//       .similarByProductId(productId, limit * 3);

//     // 2. Nếu có user → rerank theo preference
//     if (userId) {
//       const prefs = await this.behaviorService.getUserPreferences(userId);
//       const reranked = this.rerank(similar, prefs, limit);
//       await this.cacheManager.set(cacheKey, reranked, 600_000); // 10 phút
//       return reranked;
//     }

//     const result = similar.slice(0, limit);
//     await this.cacheManager.set(cacheKey, result, 600_000);
//     return result;
//   }

//   private rerank(products: any[], prefs: any, limit: number) {
//     return products
//       .map(p => ({
//         ...p,
//         score: this.scoreProduct(p, prefs),
//       }))
//       .sort((a, b) => b.score - a.score)
//       .slice(0, limit);
//   }

//   private scoreProduct(product: any, prefs: any): number {
//     let score = product.similarity ?? 0.5; // vector similarity làm base
//     const cats = prefs?.categories ?? {};
//     if (cats[product.category_path?.[0]]) score += 0.2;
//     const [minP, maxP] = prefs?.price_range ?? [0, Infinity];
//     if (product.base_price >= minP && product.base_price <= maxP) score += 0.15;
//     if (prefs?.brands?.[product.brand]) score += 0.1;
//     return score;
//   }
// }
