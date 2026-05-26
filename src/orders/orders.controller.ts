import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { GetUser } from '../decorators/get-user.decorator';
import { Role } from '@prisma/client';

class UpdateOrderStatusDto {
  @IsString()
  status: string;
}

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Buat order baru' })
  create(@GetUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(userId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Riwayat order user' })
  findMyOrders(@GetUser('id') userId: string) {
    return this.ordersService.findMyOrders(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail order' })
  findOne(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.ordersService.findOne(id, userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Semua order' })
  findAll() {
    return this.ordersService.findAll();
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Update status order' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }
}
