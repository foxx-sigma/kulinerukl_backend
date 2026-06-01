import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { MenusService } from './menus.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SupabaseStorageService } from '../common/supabase/supabase-storage.service';

@ApiTags('Menus')
@Controller()
export class MenusController {
  constructor(
    private menusService: MenusService,
    private supabaseStorageService: SupabaseStorageService,
  ) {}

  @Get('culinary/:culinaryId/menus')
  @ApiOperation({ summary: 'Daftar menu per kuliner (dengan pagination)' })
  findByCulinary(@Param('culinaryId') culinaryId: string, @Query() pagination: PaginationDto) {
    return this.menusService.findByCulinary(culinaryId, pagination);
  }

  @Post('menus')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Tambah menu baru dengan upload gambar opsional' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() dto: CreateMenuDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      const publicUrl = await this.supabaseStorageService.uploadImage(file, 'kuliner-img');
      dto.imageUrl = publicUrl;
    }
    return this.menusService.create(dto);
  }

  @Patch('menus/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Update menu dengan upload gambar opsional' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMenuDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      const publicUrl = await this.supabaseStorageService.uploadImage(file, 'kuliner-img');
      dto.imageUrl = publicUrl;
    }
    return this.menusService.update(id, dto);
  }

  @Delete('menus/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.menusService.remove(id);
  }
}

