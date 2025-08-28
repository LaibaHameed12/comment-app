// src/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
        private readonly notificationsGateway: NotificationsGateway,
    ) { }

    async createNotification(
        type: 'comment' | 'reply' | 'like' | 'follow' | 'dislike',
        recipient: Types.ObjectId,
        sender: Types.ObjectId,
        message?: string,
        comment?: Types.ObjectId,
    ) {
        const notification = new this.notificationModel({
            type,
            recipient,
            sender,
            message,
            comment: comment || null,
        });
        const saved = await notification.save();

        // ✅ Send via WebSocket immediately
        this.notificationsGateway.sendNotification(recipient.toString(), {
            id: saved._id,
            type,
            message,
            sender,
            referenceId: saved.comment,   // FIXED ✅
            createdAt: saved.createdAt,
        });

        return saved;
    }


    async findByRecipient(userId: string) {
        return this.notificationModel
            .find({ recipient: new Types.ObjectId(userId) }) // convert string to ObjectId
            .sort({ createdAt: -1 })
            .populate('sender', 'username')
            .populate('comment', 'content')
            .exec();
    }

    async markAsRead(id: string) {
        return this.notificationModel.findByIdAndUpdate(
            id,
            { read: true },
            { new: true },
        );
    }
}
