import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CartItemDto {
  @IsString()
  menuId: string;

  @IsString()
  menuName: string;

  @IsOptional()
  @IsString()
  menuImage?: string;

  @IsNumber()
  price: number;

  @IsNumber()
  qty: number;

  @IsString()
  restaurantId: string;

  @IsString()
  restaurantName: string;
}

export class CreateOrderDto {
  // We get userId from req.user, but we can also allow it in body if needed.
  // The requirements say userId is in the payload, but usually it's better from auth.
  // We will expect it in DTO and if not provided, take it from auth token.
  @IsOptional()
  @IsString()
  userId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];

  @IsNumber()
  totalPrice: number;

  @IsEnum(['cash', 'transfer'], { message: 'Payment method must be cash or transfer' })
  paymentMethod: 'cash' | 'transfer';

  @IsOptional()
  @IsString()
  transferProofUrl?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
