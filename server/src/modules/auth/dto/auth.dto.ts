import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'A valid email address is required.' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters.' })
  @MaxLength(80)
  name!: string;

  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters.' })
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: 'Password must include at least one uppercase letter.' })
  @Matches(/[a-z]/, { message: 'Password must include at least one lowercase letter.' })
  @Matches(/[0-9]/, { message: 'Password must include at least one number.' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Password must include at least one special character.' })
  password!: string;

  @IsOptional()
  @IsBoolean()
  agreeTerms?: boolean;

  @IsOptional()
  @IsString()
  cfTurnstileToken?: string;

  @IsOptional()
  @IsString()
  turnstileToken?: string;

  @IsOptional()
  @IsString()
  acceptedTermsVersion?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'A valid email address is required.' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Password is required.' })
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @IsOptional()
  @IsBoolean()
  agreeTerms?: boolean;

  @IsOptional()
  @IsString()
  cfTurnstileToken?: string;

  @IsOptional()
  @IsString()
  turnstileToken?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500000)
  avatarUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  preferredTopics?: string[];
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Current password is required.' })
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(10, { message: 'New password must be at least 10 characters.' })
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: 'Password must include at least one uppercase letter.' })
  @Matches(/[a-z]/, { message: 'Password must include at least one lowercase letter.' })
  @Matches(/[0-9]/, { message: 'Password must include at least one number.' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Password must include at least one special character.' })
  newPassword!: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'A valid email address is required.' })
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsString()
  cfTurnstileToken?: string;

  @IsOptional()
  @IsString()
  turnstileToken?: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(1, { message: 'Reset token is required.' })
  token!: string;

  @IsString()
  @MinLength(10, { message: 'New password must be at least 10 characters.' })
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: 'Password must include at least one uppercase letter.' })
  @Matches(/[a-z]/, { message: 'Password must include at least one lowercase letter.' })
  @Matches(/[0-9]/, { message: 'Password must include at least one number.' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Password must include at least one special character.' })
  newPassword!: string;
}

export class VerifyEmailDto {
  @IsString()
  @MinLength(1, { message: 'Verification token is required.' })
  token!: string;
}

export class ResendVerificationDto {
  @IsOptional()
  @IsEmail({}, { message: 'A valid email address is required.' })
  email?: string;
}

export class ReauthenticateDto {
  @IsString()
  @MinLength(1, { message: 'Password is required.' })
  password!: string;

  @IsOptional()
  @IsString()
  cfTurnstileToken?: string;

  @IsOptional()
  @IsString()
  turnstileToken?: string;
}

export class GoogleAuthDto {
  @IsString()
  @MinLength(1, { message: 'Google ID token is required.' })
  idToken!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsBoolean()
  agreeTerms?: boolean;
}
