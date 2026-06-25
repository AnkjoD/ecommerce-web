// // ai/behavior.service.ts
// import { Injectable } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import { UserBehavior } from './schemas/user-behavior.schema';

// export type BehaviorEventType =
//   | 'view'
//   | 'click'
//   | 'add_cart'
//   | 'purchase'
//   | 'search'
//   | 'wishlist';

// export interface BehaviorEvent {
//   type: BehaviorEventType;
//   product_id?: string;
//   category?: string;
//   price?: number;
//   brand?: string;
//   query?: string;
//   meta?: Record<string, any>;
// }

// export interface UserPreference {
//   categories: Record<string, number>;  // { "Điện thoại": 5, "Laptop": 2 }
//   brands: Record<string, number>;
//   price_range: [number, number];
// }

// @Injectable()
// export class BehaviorService {
//   // Trọng số theo loại event
//   private readonly EVENT_WEIGHTS: Record<BehaviorEventType, number> = {
//     view: 1,
//     click: 2,
//     wishlist: 3,
//     add_cart: 4,
//     search: 2,
//     purchase: 5,
//   };

//   constructor(
//     @InjectModel(UserBehavior.name)
//     private userBehaviorModel: Model<UserBehavior>,
//   ) {}

//   async logEvent(userId: string, event: BehaviorEvent): Promise<void> {
//     const weight = this.EVENT_WEIGHTS[event.type] ?? 1;

//     await this.userBehaviorModel.findOneAndUpdate(
//       { user_id: userId },
//       {
//         $push: {
//           events: {
//             $each: [{ ...event, timestamp: new Date(), weight }],
//             $slice: -200, // giữ 200 event gần nhất
//           },
//         },
//         $set: { updated_at: new Date() },
//       },
//       { upsert: true, new: true },
//     );

//     // Cập nhật preference vector sau mỗi event có product
//     if (event.product_id || event.category) {
//       await this.updatePreferenceVector(userId, event);
//     }
//   }

//   async getUserPreferences(userId: string): Promise<UserPreference> {
//     const doc = await this.userBehaviorModel
//       .findOne({ user_id: userId })
//       .select('preference_vector');

//     if (!doc?.preference_vector) {
//       return { categories: {}, brands: {}, price_range: [0, Infinity] };
//     }
//     return doc.preference_vector as UserPreference;
//   }

//   async updatePreferenceVector(
//     userId: string,
//     newEvent: BehaviorEvent,
//   ): Promise<void> {
//     const doc = await this.userBehaviorModel
//       .findOne({ user_id: userId })
//       .select('events preference_vector');
//     if (!doc) return;

//     // Tính lại preference từ toàn bộ events (decay theo thời gian)
//     const prefs = this.computePreferences(doc.events ?? []);
//     await this.userBehaviorModel.findOneAndUpdate(
//       { user_id: userId },
//       { $set: { preference_vector: prefs } },
//     );
//   }

//   private computePreferences(events: any[]): UserPreference {
//     const categories: Record<string, number> = {};
//     const brands: Record<string, number> = {};
//     const prices: number[] = [];
//     const now = Date.now();

//     for (const e of events) {
//       // Time decay: event càng cũ càng ít quan trọng (half-life 7 ngày)
//       const ageMs = now - new Date(e.timestamp).getTime();
//       const decay = Math.exp(-ageMs / (7 * 24 * 60 * 60 * 1000));
//       const score = (e.weight ?? 1) * decay;

//       if (e.category) {
//         categories[e.category] = (categories[e.category] ?? 0) + score;
//       }
//       if (e.brand) {
//         brands[e.brand] = (brands[e.brand] ?? 0) + score;
//       }
//       if (e.price) prices.push(e.price);
//     }

//     return {
//       categories,
//       brands,
//       price_range: this.computePriceRange(prices),
//     };
//   }

//   private computePriceRange(prices: number[]): [number, number] {
//     if (prices.length === 0) return [0, Infinity];
//     const sorted = [...prices].sort((a, b) => a - b);
//     // Lấy khoảng p25 → p75 × 1.5 làm comfort zone
//     const p25 = sorted[Math.floor(sorted.length * 0.25)];
//     const p75 = sorted[Math.floor(sorted.length * 0.75)];
//     return [p25 * 0.5, p75 * 1.5];
//   }
// }
