import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 'culinary-place-id' })
  @IsString()
  culinaryPlaceId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Baksonya enak banget, kuahnya gurih!' })
  @IsOptional()
  @IsString()
  comment?: string;
}
