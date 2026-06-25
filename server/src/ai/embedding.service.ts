// // embedding.service.ts
// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';

// @Injectable()
// export class EmbeddingService {
//   private openai = new OpenAI();
//   private model = 'text-embedding-3-small';

//   async embedText(text: string): Promise<number[]> {
//     const res = await this.openai.embeddings.create({
//       model: this.model,
//       input: text,
//     });
//     return res.data[0].embedding;
//   }

//   async embedProduct(product: any): Promise<number[]> {
//     // Ghép text đủ ngữ cảnh để embedding chất lượng cao hơn
//     const text = [
//       product.name,
//       product.description?.short,
//       product.tags?.join(' '),
//       Object.entries(product.attributes ?? {})
//         .map(([k, v]) => `${k}: ${v}`)
//         .join(', '),
//     ]
//       .filter(Boolean)
//       .join(' | ');

//     return this.embedText(text);
//   }
// }
