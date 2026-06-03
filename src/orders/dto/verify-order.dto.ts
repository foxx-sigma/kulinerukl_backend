import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class VerifyOrderDto {
  @ApiProperty({ example: 'approve', enum: ['approve', 'reject'] })
  @IsEnum(['approve', 'reject'])
  action: 'approve' | 'reject';

  @ApiPropertyOptional({ example: 'Bukti transfer palsu' })
  @IsOptional()
  @IsString()
  rejectionNote?: string;
}
