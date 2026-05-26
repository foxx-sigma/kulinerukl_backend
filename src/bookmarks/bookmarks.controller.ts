import { Controller, Get, Post, Delete, Param, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { BookmarksService } from './bookmarks.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GetUser } from '../decorators/get-user.decorator';

class CreateBookmarkDto {
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
  @ApiOperation({ summary: 'Daftar bookmark user' })
  findAll(@GetUser('id') userId: string) {
    return this.bookmarksService.findAll(userId);
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
