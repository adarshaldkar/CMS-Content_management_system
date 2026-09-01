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
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: 'Password must include at least one uppercase letter.' })
  @Matches(/[0-9]/, { message: 'Password must include at least one number.' })
  password!: string;
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
  @MinLength(8, { message: 'New password must be at least 8 characters.' })
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: 'Password must include at least one uppercase letter.' })
  @Matches(/[0-9]/, { message: 'Password must include at least one number.' })
  newPassword!: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'A valid email address is required.' })
  @MaxLength(254)
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(1, { message: 'Reset token is required.' })
  token!: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters.' })
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: 'Password must include at least one uppercase letter.' })
  @Matches(/[0-9]/, { message: 'Password must include at least one number.' })
  newPassword!: string;
}
