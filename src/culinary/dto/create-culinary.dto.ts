import { IsString, IsOptional, IsNumber, Min, IsEnum, IsBoolean } from 'class-validator'; // IsNumber still used by priceMin/priceMax
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PriceRange } from '@prisma/client';

export class CreateCulinaryDto {
  @ApiProperty({ example: 'Bakso Pak Kumis' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'bakso-pak-kumis' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ example: 'Bakso legendaris sejak 1990' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Jl. Soekarno Hatta No. 5' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ example: 'Lowokwaru' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ example: 'Malang' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '08123456789' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Senin-Minggu: 10.00-22.00' })
  @IsOptional()
  @IsString()
  openHours?: string;

  @ApiPropertyOptional({ enum: PriceRange, example: PriceRange.BUDGET })
  @IsOptional()
  @IsEnum(PriceRange)
  priceRange?: PriceRange;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @ApiPropertyOptional({ example: ['indoor', 'lively'] })
  @IsOptional()
  ambiance?: any;

  @ApiPropertyOptional({ example: 'https://example.com/cover.jpg' })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ example: 'https://example.com/thumb.jpg' })
  @IsOptional()
  @IsString()
  thumbnailImage?: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'https://maps.google.com' })
  @IsOptional()
  @IsString()
  mapUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 'category-id-here' })
  @IsString()
  categoryId: string;
}
