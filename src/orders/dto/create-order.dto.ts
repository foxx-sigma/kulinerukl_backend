import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartItemDto {
  @ApiProperty({ example: 'menu-id-1' })
  @IsString()
  menuId: string;

  @ApiProperty({ example: 'Nasi Goreng' })
  @IsString()
  menuName: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString()
  menuImage?: string;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  price: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  qty: number;

  @ApiProperty({ example: 'resto-id-1' })
  @IsString()
  restaurantId: string;

  @ApiProperty({ example: 'Resto Makan Makan' })
  @IsString()
  restaurantName: string;
}

export class CreateOrderDto {
  // We get userId from req.user, but we can also allow it in body if needed.
  // The requirements say userId is in the payload, but usually it's better from auth.
  // We will expect it in DTO and if not provided, take it from auth token.
  @ApiPropertyOptional({ description: 'UserId opsional (default diambil dari token auth)', example: 'user-id-1' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ type: [CartItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];

  @ApiProperty({ example: 30000 })
  @IsNumber()
  totalPrice: number;

  @ApiProperty({ example: 'transfer', enum: ['cash', 'transfer'] })
  @IsEnum(['cash', 'transfer'], { message: 'Payment method must be cash or transfer' })
  paymentMethod: 'cash' | 'transfer';

  @ApiPropertyOptional({ example: 'https://example.com/proof.jpg' })
  @IsOptional()
  @IsString()
  transferProofUrl?: string;

  @ApiPropertyOptional({ example: 'pending_payment' })
  @IsOptional()
  @IsString()
  status?: string;
}
