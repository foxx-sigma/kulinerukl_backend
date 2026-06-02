import { Controller, Get, Post, Body, Patch, Param, UseGuards, Res, Header } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { GetUser } from '../decorators/get-user.decorator';
import type { Response } from 'express';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@GetUser() user: any, @Body() createOrderDto: CreateOrderDto) {
    const userId = createOrderDto.userId || user.id;
    return this.ordersService.create(userId, createOrderDto);
  }

  @Get()
  findAll(@GetUser() user: any) {
    return this.ordersService.findAll(user.id, user.role);
  }

  @Get('export/csv')
  @Roles('ADMIN')
  @Header('Content-Type', 'text/csv')
  async exportCsv(@Res({ passthrough: true }) res: Response) {
    const timestamp = new Date().getTime();
    res.setHeader('Content-Disposition', `attachment; filename="orders-export-${timestamp}.csv"`);
    
    const csvContent = await this.ordersService.exportCsv();
    res.send(csvContent);
  }

  @Get('export/pdf')
  @Roles('ADMIN')
  @Header('Content-Type', 'application/pdf')
  async exportPdf(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Content-Disposition', `attachment; filename="orders-export.pdf"`);
    
    const pdfBuffer = await this.ordersService.exportPdf();
    res.send(pdfBuffer);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser() user: any) {
    return this.ordersService.findOne(id, user.id, user.role);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderStatusDto: UpdateOrderStatusDto, @GetUser() user: any) {
    return this.ordersService.update(id, updateOrderStatusDto, user.id, user.role);
  }

  @Patch(':id/verify')
  @Roles('ADMIN')
  verifyPayment(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; rejectionNote?: string }
  ) {
    return this.ordersService.verifyPayment(id, body.action, body.rejectionNote);
  }

  @Get(':id/bill')
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
