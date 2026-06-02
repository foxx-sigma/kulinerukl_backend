import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsOptional()
  @IsEnum(['pending_payment', 'pending_validation', 'confirmed', 'rejected', 'completed'])
  status?: 'pending_payment' | 'pending_validation' | 'confirmed' | 'rejected' | 'completed';

  @IsOptional()
  @IsString()
  rejectionNote?: string;

  @IsOptional()
  @IsString()
  transferProofUrl?: string;
}
