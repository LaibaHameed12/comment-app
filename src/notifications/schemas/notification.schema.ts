// src/notifications/schemas/notification.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationType = 'comment' | 'reply' | 'like' | 'follow' | 'dislike';

@Schema({ timestamps: true })
export class Notification {
    _id: Types.ObjectId;

    @Prop({ required: true, enum: ['comment', 'reply', 'like', 'follow', 'dislike'] })
    type: NotificationType;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    recipient: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    sender: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Comment', default: null })
    comment?: Types.ObjectId;

    @Prop({ default: false })
    read: boolean;

    @Prop()
    message?: string;

    // ✅ Add these so TypeScript is aware of Mongoose timestamps
    createdAt?: Date;
    updatedAt?: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);
