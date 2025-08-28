// src/notifications/notifications.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: '*', // for dev, allow all origins
    },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private onlineUsers = new Map<string, string>(); // userId -> socketId

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
        for (const [userId, socketId] of this.onlineUsers.entries()) {
            if (socketId === client.id) {
                this.onlineUsers.delete(userId);
            }
        }
    }

    // User will call this to register themselves
    @SubscribeMessage('register')
    handleRegister(client: Socket, userId: string) {
        this.onlineUsers.set(userId, client.id);
        console.log(`User ${userId} registered with socket ${client.id}`);
    }

    // User-specific notification (already exists)
    sendNotification(userId: string, payload: any) {
        const socketId = this.onlineUsers.get(userId);
        if (socketId) {
            this.server.to(socketId).emit('notification', payload);
        }
    }

    // Broadcast comment to all users
    sendCommentUpdate(comment: any) {
        this.server.emit('commentCreated', comment);
    }

    // Optional: broadcast other things to all users
    sendReplyUpdate(reply: any) {
        this.server.emit('replyCreated', reply);
    }

}
