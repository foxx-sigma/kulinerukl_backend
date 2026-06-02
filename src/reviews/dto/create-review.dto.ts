import { IsString, IsNumber, IsOptional, Min, Max, IsNotEmpty, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 'culinary-place-id-here' })
  @IsString()
  @IsNotEmpty({ message: 'ID kuliner tidak boleh kosong' })
  culinaryPlaceId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Rating minimal 1' })
  @Max(5, { message: 'Rating maksimal 5' })
  rating: number;

  @ApiPropertyOptional({ example: 'Baksonya enak banget, kuahnya gurih!' })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Komentar maksimal 1000 karakter' })
  comment?: string;
}

