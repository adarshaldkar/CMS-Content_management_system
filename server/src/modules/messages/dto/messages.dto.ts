// server/src/modules/messages/dto/messages.dto.ts

import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  ConversationType,
  MessagePriority,
  BroadcastTargetRole,
  MessageAttachment,
} from '../../../domain/models';

export class CreateConversationDtoClass {
  @ApiProperty({ example: 'DIRECT', enum: ['DIRECT', 'EDITORIAL_INQUIRY', 'SUPPORT_TICKET', 'SECURITY_BULLETIN', 'DMCA_DISPUTE'] })
  @IsNotEmpty()
  @IsString()
  type: ConversationType;

  @ApiProperty({ example: 'Manuscript Review: Quantum Computing Breakthrough' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject: string;

  @ApiProperty({ example: ['c1000000-0000-0000-0000-000000000001'] })
  @IsArray()
  recipientIds: string[];

  @ApiProperty({ example: 'Hello, please review the revised paragraphs in chapter 2.' })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  initialMessage: string;

  @ApiPropertyOptional({ example: 'NORMAL', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] })
  @IsOptional()
  @IsString()
  priority?: MessagePriority;

  @ApiPropertyOptional({ example: 'https://gazette.io/articles/quantum-computing' })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({ example: 'View Manuscript' })
  @IsOptional()
  @IsString()
  actionLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class SendMessageDtoClass {
  @ApiProperty({ example: 'The suggested changes have been applied to section 3.' })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentMessageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actionLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  attachments?: MessageAttachment[];
}

export class CreateBroadcastDtoClass {
  @ApiProperty({ example: 'Platform Scheduled Maintenance & Upgrade' })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'The Gazette will undergo database upgrades tonight at 02:00 UTC.' })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body: string;

  @ApiPropertyOptional({ example: 'ALL', enum: ['ALL', 'SUPER_ADMIN', 'ADMIN', 'EDITOR', 'AUTHOR', 'SUBSCRIBER', 'USER'] })
  @IsOptional()
  @IsString()
  targetRole?: BroadcastTargetRole;

  @ApiPropertyOptional({ example: 'NORMAL', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] })
  @IsOptional()
  @IsString()
  priority?: MessagePriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actionLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ArchiveConversationDtoClass {
  @ApiProperty({ example: true })
  @IsNotEmpty()
  isArchived: boolean;
}
