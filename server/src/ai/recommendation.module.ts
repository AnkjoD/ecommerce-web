// // ai/recommendation.module.ts
// import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import { CacheModule } from '@nestjs/cache-manager';
// import { RecommendationController } from './recommendation.controller';
// import { RecommendationService } from './recommendation.service';
// import { EmbeddingService } from './embedding.service';
// import { VectorSearchService } from './vector-search.service';
// import { BehaviorService } from './behavior.service';
// import {
//   ProductEmbedding,
//   ProductEmbeddingSchema,
// } from './schemas/product-embedding.schema';
// import {
//   UserBehavior,
//   UserBehaviorSchema,
// } from './schemas/user-behavior.schema';

// @Module({
//   imports: [
//     MongooseModule.forFeature([
//       { name: ProductEmbedding.name, schema: ProductEmbeddingSchema },
//       { name: UserBehavior.name, schema: UserBehaviorSchema },
//     ]),
//     CacheModule.register({ ttl: 600 }),
//   ],
//   controllers: [RecommendationController],
//   providers: [
//     RecommendationService,
//     EmbeddingService,
//     VectorSearchService,
//     BehaviorService,
//   ],
//   exports: [
//     RecommendationService,
//     EmbeddingService,
//     VectorSearchService,
//     BehaviorService,
//   ],
// })
// export class RecommendationModule {}
