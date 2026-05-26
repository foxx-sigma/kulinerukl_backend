import { Controller, Post, Get, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GetUser } from '../decorators/get-user.decorator';

class CheckoutDto {
  @IsString()
  orderId: string;
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inisiasi pembayaran via Midtrans' })
  checkout(@GetUser('id') userId: string, @Body() dto: CheckoutDto) {
    return this.paymentsService.checkout(dto.orderId, userId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook callback dari Midtrans (jangan dipanggil manual)' })
  webhook(@Body() notification: any) {
    return this.paymentsService.handleWebhook(notification);
  }

  @Get(':orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cek status pembayaran berdasarkan orderId' })
  getStatus(@Param('orderId') orderId: string, @GetUser('id') userId: string) {
    return this.paymentsService.getPaymentStatus(orderId, userId);
  }
}
