// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document } from 'mongoose';

// @Schema({ collection: 'product_embeddings' })
// export class ProductEmbedding extends Document {
//   @Prop({ required: true, index: true })
//   product_id: string;

//   @Prop({ type: [Number], required: true })
//   embedding: number[];

//   @Prop()
//   embedding_text: string;

//   @Prop({ default: 'text-embedding-3-small' })
//   model_version: string;

//   @Prop({ default: Date.now })
//   updated_at: Date;
// }

// export const ProductEmbeddingSchema =
//   SchemaFactory.createForClass(ProductEmbedding);

// // Index vector search (MongoDB Atlas)
// ProductEmbeddingSchema.index({ product_id: 1 }, { unique: true });
