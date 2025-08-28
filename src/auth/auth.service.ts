// src/auth/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    // Register user
    async register(username: string, email: string, password: string): Promise<{ message: string }> {
        // check if email exists
        const existing = await this.usersService.findByEmail(email);
        if (existing) throw new ConflictException('Email already in use');

        const hashed = await bcrypt.hash(password, 10);
        await this.usersService.create({
            username,
            email,
            password: hashed,
        } as Partial<User>);

        // 👇 ab yahan token generate nahi hoga
        return { message: 'User registered successfully', };
    }


    // Validate user (used during login)
    private async validateUser(email: string, password: string): Promise<User> {
        const user = await this.usersService.findByEmail(email);
        if (!user) throw new UnauthorizedException('Invalid credentials');

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) throw new UnauthorizedException('Invalid credentials');

        return user;
    }

    // Login user
    // auth.service.ts
    async login(email: string, password: string): Promise<{ token: string; user: Partial<User> }> {
        const user = await this.validateUser(email, password);
        const payload = { sub: user._id, email: user.email, username: user.username };
        return {
            token: this.jwtService.sign(payload),
            user: { _id: user._id, username: user.username, email: user.email }, 
        };
    }

}
