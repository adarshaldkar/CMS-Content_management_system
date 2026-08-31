import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { EnvConfig } from '../../config/env.schema';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './dto/auth.dto';
import { CurrentUser, Public } from '../../common/decorators/security.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import {
  clearAuthCookies,
  setAuthCookies,
} from '../../common/utils/cookie.util';
import type { AuthUser } from '../../domain/models';

@ApiTags('auth')
@Controller('auth')
@UseGuards(CsrfGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  private isProduction(): boolean {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }

  private isCookieSecure(): boolean {
    const nodeEnv = this.config.get('NODE_ENV', { infer: true });
    return (
      nodeEnv === 'production' ||
      this.config.get('COOKIE_SECURE', { infer: true }) === true
    );
  }

  private extractRefreshToken(req: Request): string | undefined {
    const cookies = req.cookies || {};
    return cookies['__Host-refresh'] || cookies['refresh_token'];
  }

  @Public()
  @Post('register')
  @Throttle({ 'auth-sensitive': { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new user account' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: AuthUser }> {
    const meta = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const result = await this.authService.register(dto, meta);
    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
      this.isProduction(),
      this.isCookieSecure(),
    );

    return { user: result.user };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ 'auth-sensitive': { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Log in with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: AuthUser }> {
    const meta = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const result = await this.authService.login(dto, meta);
    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
      this.isProduction(),
      this.isCookieSecure(),
      Boolean(dto.rememberMe),
    );

    return { user: result.user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ 'auth-relaxed': { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Rotate refresh token and issue new session' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: AuthUser }> {
    const rawRefreshToken = this.extractRefreshToken(req);
    if (!rawRefreshToken) {
      clearAuthCookies(res, this.isProduction(), this.isCookieSecure());
      throw new UnauthorizedException('Refresh token cookie missing.');
    }

    const meta = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const result = await this.authService.refresh(rawRefreshToken, meta);
    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
      this.isProduction(),
      this.isCookieSecure(),
    );

    return { user: result.user };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @Throttle({ 'auth-relaxed': { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Log out current session' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    const rawRefreshToken = this.extractRefreshToken(req);
    const meta = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    await this.authService.logout(rawRefreshToken, meta);
    clearAuthCookies(res, this.isProduction(), this.isCookieSecure());

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out all active sessions for current user' })
  async logoutAll(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    const meta = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    await this.authService.logoutAll(user.id, meta);
    clearAuthCookies(res, this.isProduction(), this.isCookieSecure());

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get profile and permissions of authenticated user' })
  async me(@CurrentUser() user: AuthUser): Promise<{ user: AuthUser }> {
    return { user };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiOperation({ summary: 'Update profile info of authenticated user' })
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
    @Req() req: Request,
  ): Promise<{ user: AuthUser }> {
    const meta = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
    const updated = await this.authService.updateProfile(user.id, dto, meta);
    return { user: updated };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @ApiOperation({ summary: 'Change password for authenticated user' })
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const meta = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
    await this.authService.changePassword(user.id, dto, meta);
    clearAuthCookies(res, this.isProduction(), this.isCookieSecure());
    return { message: 'Password changed successfully. Please log in again.' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ 'auth-sensitive': { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Request a password reset link (anti-enumeration: always returns 200)' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const meta = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
    // Always responds with the same message regardless of account existence
    await this.authService.forgotPassword(dto.email, meta);
    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ 'auth-sensitive': { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset password using a valid reset token' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const meta = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
    await this.authService.resetPassword(dto.token, dto.newPassword, meta);
    return { message: 'Password reset successfully. Please log in with your new password.' };
  }
}
