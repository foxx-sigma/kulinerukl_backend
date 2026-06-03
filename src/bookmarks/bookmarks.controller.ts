import { Controller, Get, Post, Delete, Param, Query, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { BookmarksService } from './bookmarks.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GetUser } from '../decorators/get-user.decorator';

import { ApiProperty } from '@nestjs/swagger';

class CreateBookmarkDto {
  @ApiProperty({ example: 'culinary-place-id-here' })
  @IsString()
  culinaryPlaceId: string;
}

@ApiTags('Bookmarks')
@Controller('bookmarks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookmarksController {
  constructor(private bookmarksService: BookmarksService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar bookmark user (dengan pagination)' })
  findAll(@GetUser('id') userId: string, @Query() pagination: PaginationDto) {
    return this.bookmarksService.findAll(userId, pagination);
  }

  @Post()
  @ApiOperation({ summary: 'Tambah bookmark' })
  create(@GetUser('id') userId: string, @Body() dto: CreateBookmarkDto) {
    return this.bookmarksService.create(userId, dto.culinaryPlaceId);
  }

  @Delete(':culinaryPlaceId')
  @ApiOperation({ summary: 'Hapus bookmark' })
  remove(@GetUser('id') userId: string, @Param('culinaryPlaceId') culinaryPlaceId: string) {
    return this.bookmarksService.remove(userId, culinaryPlaceId);
  }
}
