// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';

@Injectable()
export class UsersService {
    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>,
        private readonly notificationsService: NotificationsService,
        private readonly notificationsGateway: NotificationsGateway,
    ) { }

    async create(userData: Partial<User>): Promise<User> {
        const user = new this.userModel(userData);
        return user.save();
    }

    async findAll(): Promise<User[]> {
        return this.userModel.find().select('-password').exec();
    }

    async findById(id: string): Promise<User> {
        const user = await this.userModel.findById(id).select('-password').exec();
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.userModel.findOne({ email }).select('+password').exec();
    }

    async updateProfile(id: string, updateData: Partial<User>): Promise<User> {
        const updatedUser = await this.userModel
            .findByIdAndUpdate(id, updateData, { new: true })
            .select('-password')
            .exec();

        if (!updatedUser) throw new NotFoundException('User not found');
        return updatedUser;
    }

    async followUser(userId: string, targetUserId: string): Promise<User> {
        if (userId === targetUserId) throw new Error('You cannot follow yourself');

        const user = await this.userModel.findById(userId);
        const targetUser = await this.userModel.findById(targetUserId);

        if (!user || !targetUser) throw new NotFoundException('User not found');

        // Add to following if not already
        if (!user.following.includes(new Types.ObjectId(targetUserId))) {
            user.following.push(new Types.ObjectId(targetUserId));
            await user.save();
        }

        // Add to followers if not already
        if (!targetUser.followers.includes(new Types.ObjectId(userId))) {
            targetUser.followers.push(new Types.ObjectId(userId));
            await targetUser.save();

            // ✅ Create a notification in DB
            const notification = await this.notificationsService.createNotification(
                'follow',                   // type
                targetUser._id,              // recipient
                new Types.ObjectId(userId),  // sender
                'started following you',
            );

            // ✅ Emit real-time notification to the target user
            this.notificationsGateway.sendNotification(targetUser._id.toString(), notification);
        }

        return user;
    }


    async unfollowUser(userId: string, targetUserId: string): Promise<User> {
        const user = await this.userModel.findById(userId);
        const targetUser = await this.userModel.findById(targetUserId);

        if (!user || !targetUser) throw new NotFoundException('User not found');

        user.following = user.following.filter(
            (id) => id.toString() !== targetUserId,
        );
        targetUser.followers = targetUser.followers.filter(
            (id) => id.toString() !== userId,
        );

        await user.save();
        await targetUser.save();

        return user;
    }

}
