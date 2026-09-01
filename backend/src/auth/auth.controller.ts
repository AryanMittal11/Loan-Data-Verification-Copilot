import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Body('name') name?: string,
    @Body('email') email?: string,
    @Body('password') password?: string,
    @Body('role') role?: Role,
  ) {
    const identifier = name || email;
    return this.authService.login(identifier, password, role);
  }

  @Post('register')
  async register(@Body() body: { name: string; email: string; password?: string; role: Role; organization?: string }) {
    return this.authService.register(body);
  }
}
