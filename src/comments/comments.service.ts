import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { NotificationsService } from 'src/notifications/notifications.service';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';

@Injectable()
export class CommentsService {
    constructor(
        @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private readonly notificationsService: NotificationsService,
        private readonly notificationsGateway: NotificationsGateway,
    ) { }

    /** Create a new comment */
    async create(authorId: string, content: string): Promise<CommentDocument> {
        const comment = new this.commentModel({
            author: new Types.ObjectId(authorId),
            content,
        });

        const saved = await comment.save();

        // Notify all users except author
        const users = await this.userModel.find({ _id: { $ne: authorId } }).select('_id');
        for (const user of users) {
            const notification = await this.notificationsService.createNotification(
                'comment',
                user._id,
                new Types.ObjectId(authorId),
                'added a new comment',
                saved._id,
            );

            // Emit real-time notification to the user
            this.notificationsGateway.sendNotification(user._id.toString(), notification);
        }

        // Broadcast the new comment to all users for real-time UI update
        this.notificationsGateway.sendCommentUpdate(saved);

        return saved.populate('author', 'username email');
    }

    /** Reply to a comment */
    async reply(authorId: string, parentId: string, content: string): Promise<CommentDocument> {
        const parent = await this.commentModel.findById(parentId);
        if (!parent) throw new NotFoundException('Parent comment not found');

        const reply = new this.commentModel({
            author: new Types.ObjectId(authorId),
            content,
            parentComment: parent._id,
        });

        const saved = await reply.save();

        // Notify parent author if not self
        if (parent.author.toString() !== authorId.toString()) {
            const notification = await this.notificationsService.createNotification(
                'reply',
                parent.author as Types.ObjectId,
                new Types.ObjectId(authorId),
                'replied to your comment',
                saved._id,
            );
            this.notificationsGateway.sendNotification(parent.author.toString(), notification);
        }
        this.notificationsGateway.sendReplyUpdate(saved);
        return saved.populate('author', 'username email');
    }

    /** Get all top-level comments with nested replies */
    async findAll(): Promise<CommentDocument[]> {
        return this.commentModel
            .find({ parentComment: null })
            .populate('author', 'username email')
            .populate({
                path: 'replies',
                populate: { path: 'author', select: 'username email' },
            });
    }

    /** Get a single comment with replies */
    async findById(id: string): Promise<CommentDocument> {
        const comment = await this.commentModel
            .findById(id)
            .populate('author', 'username email')
            .populate({
                path: 'replies',
                populate: { path: 'author', select: 'username email' },
            });

        if (!comment) throw new NotFoundException('Comment not found');
        return comment;
    }

    async like(commentId: string, userId: string): Promise<CommentDocument> {
        const userObjectId = new Types.ObjectId(userId);

        const comment = await this.commentModel.findById(commentId);
        if (!comment) throw new NotFoundException('Comment not found');

        const hasLiked = comment.likes.some(id => id.equals(userObjectId));
        const hasDisliked = comment.unlikes.some(id => id.equals(userObjectId));

        let update: any = {};
        if (hasLiked) {
            update.$pull = { likes: userObjectId };
        } else {
            update.$addToSet = { likes: userObjectId };
            if (hasDisliked) {
                update.$pull = { ...update.$pull, unlikes: userObjectId };
            }
        }

        const updatedComment = await this.commentModel.findByIdAndUpdate(
            commentId,
            update,
            { new: true } // return updated doc
        )
            .populate('author', 'username email')
            .populate({
                path: 'replies',
                populate: { path: 'author', select: 'username email' },
            });

        if (!updatedComment) throw new NotFoundException('Comment not found');

        // Send notification if necessary
        if (!hasLiked && !comment.author.equals(userObjectId)) {
            const notification = await this.notificationsService.createNotification(
                'like',
                comment.author,
                userObjectId,
                'liked your comment',
                comment._id,
            );
            this.notificationsGateway.sendNotification(comment.author.toString(), notification);
        }

        this.notificationsGateway.likeComment(updatedComment);

        return updatedComment;
    }

    async unlike(commentId: string, userId: string): Promise<CommentDocument> {
        const userObjectId = new Types.ObjectId(userId);

        const comment = await this.commentModel.findById(commentId);
        if (!comment) throw new NotFoundException('Comment not found');

        const hasDisliked = comment.unlikes.some(id => id.equals(userObjectId));
        const hasLiked = comment.likes.some(id => id.equals(userObjectId));

        let update: any = {};
        if (hasDisliked) {
            update.$pull = { unlikes: userObjectId };
        } else {
            update.$addToSet = { unlikes: userObjectId };
            if (hasLiked) {
                update.$pull = { ...update.$pull, likes: userObjectId };
            }
        }

        const updatedComment = await this.commentModel.findByIdAndUpdate(
            commentId,
            update,
            { new: true } // return updated doc
        )
            .populate('author', 'username email')
            .populate({
                path: 'replies',
                populate: { path: 'author', select: 'username email' },
            });

        if (!updatedComment) throw new NotFoundException('Comment not found');

        // Send notification if necessary
        if (!hasDisliked && !comment.author.equals(userObjectId)) {
            const notification = await this.notificationsService.createNotification(
                'dislike',
                comment.author,
                userObjectId,
                'disliked your comment',
                comment._id,
            );
            this.notificationsGateway.sendNotification(comment.author.toString(), notification);
        }
        this.notificationsGateway.unlikeComment(updatedComment);

        return updatedComment;
    }

    /** Delete a comment */
    async delete(commentId: string, userId: string): Promise<{ message: string }> {
        const comment = await this.commentModel.findById(commentId);
        if (!comment) throw new NotFoundException('Comment not found');

        // Only allow the author to delete
        if (comment.author.toString() !== userId) {
            throw new Error('You are not authorized to delete this comment');
        }

        await this.commentModel.findByIdAndDelete(commentId);

        // Optionally, delete nested replies
        await this.commentModel.deleteMany({ parentComment: commentId });

        return { message: 'Comment deleted successfully' };
    }

}
