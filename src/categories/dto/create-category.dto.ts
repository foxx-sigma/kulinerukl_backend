import { IsString, MinLength, MaxLength, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Mie & Bakso' })
  @IsString()
  @IsNotEmpty({ message: 'Nama kategori tidak boleh kosong' })
  @MinLength(2, { message: 'Nama kategori minimal 2 karakter' })
  @MaxLength(50, { message: 'Nama kategori maksimal 50 karakter' })
  name: string;

  @ApiProperty({ example: 'mie-bakso' })
  @IsString()
  @IsNotEmpty({ message: 'Slug tidak boleh kosong' })
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug hanya boleh mengandung huruf kecil, angka, dan tanda hubung (-)' })
  slug: string;
}

