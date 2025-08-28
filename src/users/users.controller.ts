// src/users/users.controller.ts
import { Controller, Get, Post, Body, Param, Patch, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // Create new user (public — signup)
  @Post()
  async create(@Body() userData: Partial<User>) {
    return this.usersService.create(userData);
  }

  // Get all users (public, optional)
  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  // ✅ Get current logged-in user's profile
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req) {
    console.log('REQ.USER:', req.user);
    return this.usersService.findById(req.user.userId);
  }

  // Get user by ID (public)
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  // Update user profile (private)
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateProfile(@Req() req, @Body() updateData: Partial<User>) {
    return this.usersService.updateProfile(req.user.userId, updateData);
  }

  // Follow user (private)
  @UseGuards(JwtAuthGuard)
  @Post('follow/:targetId')
  async followUser(@Req() req, @Param('targetId') targetUserId: string) {
    return this.usersService.followUser(req.user.userId, targetUserId);
  }

  // Unfollow user (private)
  @UseGuards(JwtAuthGuard)
  @Post('unfollow/:targetId')
  async unfollowUser(@Req() req, @Param('targetId') targetUserId: string) {
    return this.usersService.unfollowUser(req.user.userId, targetUserId);
  }
}
