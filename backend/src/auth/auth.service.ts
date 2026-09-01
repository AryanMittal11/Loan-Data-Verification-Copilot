import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(nameOrEmail?: string, password?: string, requestedRole?: string) {
    let user = null;

    if (nameOrEmail) {
      user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: nameOrEmail, mode: 'insensitive' } },
            { name: { equals: nameOrEmail, mode: 'insensitive' } },
          ],
        },
      });
    }

    if (!user && requestedRole) {
      user = await this.prisma.user.findFirst({
        where: { role: requestedRole as Role },
      });
    }

    if (!user) {
      // Fallback demo user creation for testing
      const targetRole = (requestedRole as Role) || Role.operator;
      const userName = nameOrEmail || (targetRole === 'operator' ? 'operator' : targetRole === 'reviewer' ? 'reviewer' : 'consumer');
      const email = `${userName.toLowerCase()}@example.com`;
      const hash = await bcrypt.hash(password || 'demo-password', 10);

      user = await this.prisma.user.create({
        data: {
          name: userName,
          email,
          role: targetRole,
          passwordHash: hash,
          organization: `${targetRole.toUpperCase()} Department`,
        },
      });
    }

    const payload = { sub: user.id, email: user.email, role: user.role, name: user.name };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization || undefined,
      },
    };
  }

  async register(data: { name: string; email: string; password?: string; role: Role; organization?: string }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new BadRequestException('An account with this email address already exists.');
    }

    const passwordHash = await bcrypt.hash(data.password || 'demo-password', 10);
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        passwordHash,
        organization: data.organization,
      },
    });

    const payload = { sub: user.id, email: user.email, role: user.role, name: user.name };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization || undefined,
      },
    };
  }
}
