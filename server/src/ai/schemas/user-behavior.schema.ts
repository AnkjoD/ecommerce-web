// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document } from 'mongoose';

// @Schema({ collection: 'user_behavior' })
// export class UserBehavior extends Document {
//   @Prop({ required: true, index: true })
//   user_id: string;

//   @Prop({ type: [Object], default: [] })
//   events: Record<string, any>[];

//   @Prop({ type: Object, default: {} })
//   preference_vector: Record<string, any>;

//   @Prop({ default: Date.now })
//   updated_at: Date;
// }

// export const UserBehaviorSchema = SchemaFactory.createForClass(UserBehavior);
