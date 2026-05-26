import { IsString, IsArray, IsNumber, IsOptional, Min, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({ example: 'menu-id-here' })
  @IsString()
  menuId: string;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'culinary-place-id' })
  @IsString()
  culinaryPlaceId: string;

  @ApiPropertyOptional({ example: 'Tidak pakai sambal' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
