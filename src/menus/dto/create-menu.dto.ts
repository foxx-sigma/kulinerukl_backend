import { IsString, IsNumber, IsOptional, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMenuDto {
  @ApiProperty({ example: 'Bakso Campur' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Bakso isi daging sapi + tahu + mie' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 15000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ example: 'https://example.com/bakso.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 'culinary-place-id' })
  @IsString()
  culinaryPlaceId: string;
}
