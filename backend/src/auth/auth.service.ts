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
    if (!nameOrEmail || !password) {
      throw new BadRequestException('Please provide both email/username and password.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: nameOrEmail.trim(), mode: 'insensitive' } },
          { name: { equals: nameOrEmail.trim(), mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password. Please check your credentials or register an account.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (requestedRole && user.role !== requestedRole) {
      throw new UnauthorizedException(
        `This account is registered as ${user.role.toUpperCase()}, not ${requestedRole.toUpperCase()}. Please select the ${user.role.toUpperCase()} portal to sign in.`,
      );
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
    if (!data.name || !data.email || !data.password) {
      throw new BadRequestException('Full name, email, and password are required to register.');
    }

    if (data.password.length < 4) {
      throw new BadRequestException('Password must be at least 4 characters long.');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: data.email.trim().toLowerCase() },
    });
    if (existing) {
      throw new BadRequestException('An account with this email address already exists. Please sign in instead.');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        role: data.role,
        passwordHash,
        organization: data.organization?.trim() || `${data.role.toUpperCase()} Department`,
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
