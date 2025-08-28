import { Controller, Post, Get, Param, Body, UseGuards, Req, Delete } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /** Create a top-level comment */
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: any, @Body('content') content: string) {
    return this.commentsService.create(req.user.userId, content);
  }

  /** Reply to a comment */
  @UseGuards(JwtAuthGuard)
  @Post(':id/reply')
  async reply(@Req() req: any, @Param('id') parentId: string, @Body('content') content: string) {
    return this.commentsService.reply(req.user.userId, parentId, content);
  }

  /** Get all top-level comments */
  @Get()
  async findAll() {
    return this.commentsService.findAll();
  }

  /** Get a single comment */
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.commentsService.findById(id);
  }

  /** Like a comment */
  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  async like(@Req() req: any, @Param('id') commentId: string) {
    return this.commentsService.like(commentId, req.user.userId);
  }

  /** Unlike a comment */
  @UseGuards(JwtAuthGuard)
  @Post(':id/unlike')
  async unlike(@Req() req: any, @Param('id') commentId: string) {
    return this.commentsService.unlike(commentId, req.user.userId);
  }

   /** Delete a comment */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Req() req: any, @Param('id') commentId: string) {
    return this.commentsService.delete(commentId, req.user.userId);
  }
}
