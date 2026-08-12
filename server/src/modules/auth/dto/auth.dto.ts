export class RegisterDto {
  email!: string;
  name!: string;
  password!: string;
}

export class LoginDto {
  email!: string;
  password!: string;
  rememberMe?: boolean;
}

export class UpdateProfileDto {
  name?: string;
  bio?: string;
  avatarUrl?: string;
  preferredTopics?: string[];
}

export class ChangePasswordDto {
  currentPassword!: string;
  newPassword!: string;
}
