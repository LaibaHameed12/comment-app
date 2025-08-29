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

        const populated = await this.notificationModel.findById(saved._id)
            .populate('sender', 'username email')
            .populate('comment', 'content')
            .exec();

        // ✅ Send via WebSocket immediately
        this.notificationsGateway.sendNotification(recipient.toString(), populated);
        return populated;
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

    // src/notifications/notifications.service.ts
    async deleteNotification(id: string, userId: string) {
        const notification = await this.notificationModel.findById(id);
        if (!notification) {
            throw new Error('Notification not found');
        }

        // ✅ Only the recipient can delete their notification
        if (notification.recipient.toString() !== userId) {
            throw new Error('You are not authorized to delete this notification');
        }

        await this.notificationModel.findByIdAndDelete(id);
        return { message: 'Notification deleted successfully' };
    }

    // Optional: delete all notifications for a user
    async deleteAllForUser(userId: string) {
        await this.notificationModel.deleteMany({ recipient: new Types.ObjectId(userId) });
        return { message: 'All notifications cleared' };
    }

}
