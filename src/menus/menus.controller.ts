import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MenusService } from './menus.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Menus')
@Controller()
export class MenusController {
  constructor(private menusService: MenusService) {}

  @Get('culinary/:culinaryId/menus')
  @ApiOperation({ summary: 'Daftar menu per kuliner' })
  findByCulinary(@Param('culinaryId') culinaryId: string) {
    return this.menusService.findByCulinary(culinaryId);
  }

  @Post('menus')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Tambah menu baru' })
  create(@Body() dto: CreateMenuDto) {
    return this.menusService.create(dto);
  }

  @Patch('menus/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: Partial<CreateMenuDto>) {
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
