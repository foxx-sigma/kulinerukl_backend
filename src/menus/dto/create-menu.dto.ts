import { IsString, IsNumber, IsOptional, Min, IsBoolean, MinLength, MaxLength, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateMenuDto {
  @ApiProperty({ example: 'Bakso Campur' })
  @IsString()
  @MinLength(2, { message: 'Nama menu minimal 2 karakter' })
  @MaxLength(100, { message: 'Nama menu maksimal 100 karakter' })
  name: string;

  @ApiPropertyOptional({ example: 'Bakso isi daging sapi + tahu + mie' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Deskripsi maksimal 500 karakter' })
  description?: string;

  @ApiProperty({ example: 15000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Harga tidak boleh negatif' })
  price: number;

  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Stok tidak boleh negatif' })
  stock: number;

  @ApiPropertyOptional({ example: 'https://example.com/bakso.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 'culinary-place-id' })
  @IsString()
  culinaryPlaceId: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isAvailable?: boolean;
}


