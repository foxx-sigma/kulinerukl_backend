import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { GetUser } from '../decorators/get-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get('culinary/:culinaryId')
  @ApiOperation({ summary: 'Daftar review per kuliner' })
  findByCulinary(@Param('culinaryId') culinaryId: string) {
    return this.reviewsService.findByCulinary(culinaryId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tambah review kuliner' })
  create(@GetUser('id') userId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Hapus review' })
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }
}
