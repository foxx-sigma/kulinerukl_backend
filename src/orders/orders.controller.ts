import { Controller, Get, Post, Body, Patch, Param, UseGuards, Res, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { VerifyOrderDto } from './dto/verify-order.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { GetUser } from '../decorators/get-user.decorator';
import type { Response } from 'express';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Buat pesanan baru' })
  create(@GetUser() user: any, @Body() createOrderDto: CreateOrderDto) {
    const userId = createOrderDto.userId || user.id;
    return this.ordersService.create(userId, createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Daftar semua pesanan (USER/ADMIN)' })
  findAll(@GetUser() user: any) {
    return this.ordersService.findAll(user.id, user.role);
  }

  @Get('export/csv')
  @Roles('ADMIN')
  @ApiOperation({ summary: '[ADMIN] Export pesanan ke CSV' })
  @Header('Content-Type', 'text/csv')
  async exportCsv(@Res({ passthrough: true }) res: Response) {
    const timestamp = new Date().getTime();
    res.setHeader('Content-Disposition', `attachment; filename="orders-export-${timestamp}.csv"`);
    
    const csvContent = await this.ordersService.exportCsv();
    res.send(csvContent);
  }

  @Get('export/pdf')
  @Roles('ADMIN')
  @ApiOperation({ summary: '[ADMIN] Export pesanan ke PDF' })
  @Header('Content-Type', 'application/pdf')
  async exportPdf(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Content-Disposition', `attachment; filename="orders-export.pdf"`);
    
    const pdfBuffer = await this.ordersService.exportPdf();
    res.send(pdfBuffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail pesanan' })
  findOne(@Param('id') id: string, @GetUser() user: any) {
    return this.ordersService.findOne(id, user.id, user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update status/info pesanan (USER/ADMIN)' })
  update(@Param('id') id: string, @Body() updateOrderStatusDto: UpdateOrderStatusDto, @GetUser() user: any) {
    return this.ordersService.update(id, updateOrderStatusDto, user.id, user.role);
  }

  @Patch(':id/verify')
  @Roles('ADMIN')
  @ApiOperation({ summary: '[ADMIN] Verifikasi pembayaran pesanan (approve/reject)' })
  verifyPayment(
    @Param('id') id: string,
    @Body() body: VerifyOrderDto
  ) {
    return this.ordersService.verifyPayment(id, body.action, body.rejectionNote);
  }

  @Get(':id/bill')
  @ApiOperation({ summary: 'Generate tagihan PDF untuk pesanan' })
  @Header('Content-Type', 'application/pdf')
  async generatePdfBill(
    @Param('id') id: string,
    @GetUser() user: any,
    @Res({ passthrough: true }) res: Response
  ) {
    res.setHeader('Content-Disposition', `attachment; filename="bill-${id}.pdf"`);
    const pdfBuffer = await this.ordersService.generatePdfBill(id, user.id, user.role);
    res.send(pdfBuffer);
  }
}
