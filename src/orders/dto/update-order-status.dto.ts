import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrderStatusDto {
  @ApiPropertyOptional({ enum: ['pending_payment', 'pending_validation', 'confirmed', 'rejected', 'completed'] })
  @IsOptional()
  @IsEnum(['pending_payment', 'pending_validation', 'confirmed', 'rejected', 'completed'])
  status?: 'pending_payment' | 'pending_validation' | 'confirmed' | 'rejected' | 'completed';

  @ApiPropertyOptional({ example: 'Bukti transfer tidak valid' })
  @IsOptional()
  @IsString()
  rejectionNote?: string;

  @ApiPropertyOptional({ example: 'https://example.com/proof2.jpg' })
  @IsOptional()
  @IsString()
  transferProofUrl?: string;
}

