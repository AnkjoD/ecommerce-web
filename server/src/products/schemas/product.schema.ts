// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document } from 'mongoose';

// @Schema({ _id: false })
// export class ProductDescription {
//   @Prop({ required: true })
//   short: string;

//   @Prop({ required: true })
//   full: string;

//   @Prop()
//   html?: string;
// }

// @Schema({ _id: false })
// export class ProductMedia {
//   @Prop({ type: [String], default: [] })
//   images: string[];

//   @Prop()
//   thumbnail?: string;

//   @Prop()
//   video_url?: string;
// }

// @Schema({ _id: false })
// export class ProductSeo {
//   @Prop()
//   title?: string;

//   @Prop()
//   meta_desc?: string;

//   @Prop({ type: [String], default: [] })
//   keywords: string[];
// }

// @Schema({ _id: false })
// export class ProductRatingSummary {
//   @Prop({ default: 0 })
//   average_rating: number;

//   @Prop({ default: 0 })
//   total_reviews: number;
// }

// @Schema({ _id: false })
// export class ProductVariantMetadata {
//   @Prop({ required: true })
//   sku: string;

//   @Prop()
//   color?: string;

//   @Prop()
//   size?: string;

//   @Prop({ type: Number })
//   price: number;

//   @Prop()
//   image_url?: string;
// }

// @Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'products' })
// export class Product extends Document {
//   @Prop({ required: true, index: true })
//   name: string;

//   @Prop({ required: true, unique: true, index: true })
//   slug: string;

//   @Prop({ type: [String], required: true, index: true })
//   category_path: string[];
//
//   @Prop({ type: ProductDescription, required: true })
//   description: ProductDescription;

//   @Prop({ type: Object, default: {} })
//   attributes: Record<string, any>;

//   @Prop({ type: [String], default: [], index: true })
//   tags: string[];

//   @Prop({ type: [ProductVariantMetadata], default: [] })
//   variants: ProductVariantMetadata[];

//   @Prop({ type: ProductMedia, default: {} })
//   media: ProductMedia;

//   @Prop({ type: ProductSeo, default: {} })
//   seo: ProductSeo;

//   @Prop({ type: ProductRatingSummary, default: { average_rating: 0, total_reviews: 0 } })
//   rating_summary: ProductRatingSummary;

//   @Prop({ default: 'active', index: true })
//   status: string;
// }

// export const ProductSchema = SchemaFactory.createForClass(Product);

// // Add text index for search
// ProductSchema.index({ name: 'text', 'description.short': 'text', brand: 'text', tags: 'text' });
