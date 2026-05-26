import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Mie & Bakso' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'mie-bakso' })
  @IsString()
  slug: string;
}
