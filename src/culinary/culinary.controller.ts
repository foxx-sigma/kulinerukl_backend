import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CulinaryService } from './culinary.service';
import { CreateCulinaryDto } from './dto/create-culinary.dto';
import { UpdateCulinaryDto } from './dto/update-culinary.dto';
import { QueryCulinaryDto } from './dto/query-culinary.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Culinary')
@Controller('culinary')
export class CulinaryController {
  constructor(private culinaryService: CulinaryService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar kuliner (search, filter, pagination)' })
  findAll(@Query() query: QueryCulinaryDto) {
    return this.culinaryService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail kuliner + menu + review' })
  findOne(@Param('id') id: string) {
    return this.culinaryService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Tambah kuliner baru' })
  create(@Body() dto: CreateCulinaryDto) {
    return this.culinaryService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: UpdateCulinaryDto) {
    return this.culinaryService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.culinaryService.remove(id);
  }
}
