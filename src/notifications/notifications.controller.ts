// src/notifications/notifications.controller.ts
import { Controller, Get, Patch, Param, UseGuards, Req, Delete } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    // GET /notifications → fetch notifications for logged-in user
    @Get()
    async getMyNotifications(@Req() req) {
        return this.notificationsService.findByRecipient(req.user.userId);
    }

    // PATCH /notifications/:id/read → mark as read
    @Patch(':id/read')
    async markAsRead(@Param('id') id: string) {
        return this.notificationsService.markAsRead(id);
    }

    // DELETE /notifications/:id → delete a single notification
    @Delete(':id')
    async deleteOne(@Param('id') id: string, @Req() req) {
        return this.notificationsService.deleteNotification(id, req.user.userId);
    }

    // DELETE /notifications → delete all notifications for logged-in user
    @Delete()
    async deleteAll(@Req() req) {
        return this.notificationsService.deleteAllForUser(req.user.userId);
    }
}
