import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCulinaryDto {
  @ApiProperty({ example: 'Bakso Pak Kumis' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Bakso legendaris sejak 1990' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Jl. Soekarno Hatta No. 5, Malang' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

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

  @ApiProperty({ example: 'category-id-here' })
  @IsString()
  categoryId: string;
}
