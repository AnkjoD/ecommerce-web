// import { Injectable } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import { EmbeddingService } from './embedding.service';
// import { ProductEmbedding } from './schemas/product-embedding.schema';

// @Injectable()
// export class VectorSearchService {
//   constructor(
//     @InjectModel(ProductEmbedding.name)
//     private productEmbeddingModel: Model<ProductEmbedding>,
//     private embeddingService: EmbeddingService,
//   ) {}

//   async similarByProductId(productId: string, limit = 10) {
//     const doc = await this.productEmbeddingModel.findOne({ product_id: productId });
//     if (!doc) return [];
//     return this.similarByVector(doc.embedding, limit, productId);
//   }

//   async similarByText(text: string, limit = 10) {
//     const vector = await this.embeddingService.embedText(text);
//     return this.similarByVector(vector, limit);
//   }

//   async similarByVector(
//     vector: number[],
//     limit = 10,
//     excludeId?: string,
//   ): Promise<any[]> {
//     const pipeline: any[] = [
//       {
//         $vectorSearch: {
//           index: 'product_embedding_index',
//           path: 'embedding',
//           queryVector: vector,
//           numCandidates: limit * 10,
//           limit: excludeId ? limit + 1 : limit,
//         },
//       },
//       { $addFields: { similarity: { $meta: 'vectorSearchScore' } } },
//     ];

//     if (excludeId) {
//       pipeline.push({ $match: { product_id: { $ne: excludeId } } });
//       pipeline.push({ $limit: limit });
//     }

//     return this.productEmbeddingModel.aggregate(pipeline);
//   }

//   async upsertEmbedding(
//     productId: string,
//     vector: number[],
//     embeddingText: string,
//   ): Promise<void> {
//     await this.productEmbeddingModel.findOneAndUpdate(
//       { product_id: productId },
//       {
//         $set: {
//           embedding: vector,
//           embedding_text: embeddingText,
//           updated_at: new Date(),
//         },
//       },
//       { upsert: true },
//     );
//   }
// }
