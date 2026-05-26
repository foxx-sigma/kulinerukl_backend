import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  private snap: any;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const midtransClient = require('midtrans-client');
    this.snap = new midtransClient.Snap({
      isProduction: this.config.get('MIDTRANS_IS_PRODUCTION') === 'true',
      serverKey: this.config.get('MIDTRANS_SERVER_KEY'),
      clientKey: this.config.get('MIDTRANS_CLIENT_KEY'),
    });
  }

  async checkout(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        user: { select: { name: true, email: true } },
        orderItems: { include: { menu: { select: { name: true } } } },
        payment: true,
      },
    });

    if (!order) throw new NotFoundException('Order tidak ditemukan');
    if (order.payment) throw new BadRequestException('Order sudah memiliki pembayaran');

    const parameter = {
      transaction_details: {
        order_id: order.id,
        gross_amount: order.totalPrice,
      },
      customer_details: {
        first_name: order.user.name,
        email: order.user.email,
      },
      item_details: order.orderItems.map((item) => ({
        id: item.menuId,
        price: item.price,
        quantity: item.quantity,
        name: item.menu.name,
      })),
    };

    const transaction = await this.snap.createTransaction(parameter);

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        transactionId: order.id,
        amount: order.totalPrice,
        snapToken: transaction.token,
        paymentUrl: transaction.redirect_url,
        paymentStatus: 'PENDING',
      },
    });

    return {
      snap_token: transaction.token,
      payment_url: transaction.redirect_url,
      payment_id: payment.id,
    };
  }

  async handleWebhook(notification: any) {
    const serverKey = this.config.get('MIDTRANS_SERVER_KEY');
    const hash = crypto
      .createHash('sha512')
      .update(
        notification.order_id +
          notification.status_code +
          notification.gross_amount +
          serverKey,
      )
      .digest('hex');

    if (hash !== notification.signature_key) {
      throw new UnauthorizedException('Signature tidak valid');
    }

    const { transaction_status, fraud_status, order_id } = notification;

    let paymentStatus: string;
    let orderStatus: string;

    if (
      transaction_status === 'capture' ||
      transaction_status === 'settlement'
    ) {
      if (fraud_status === 'accept' || !fraud_status) {
        paymentStatus = 'SUCCESS';
        orderStatus = 'CONFIRMED';
      } else {
        paymentStatus = 'FAILED';
        orderStatus = 'CANCELLED';
      }
    } else if (['cancel', 'deny'].includes(transaction_status)) {
      paymentStatus = 'FAILED';
      orderStatus = 'CANCELLED';
    } else if (transaction_status === 'expire') {
      paymentStatus = 'EXPIRED';
      orderStatus = 'CANCELLED';
    } else {
      return { message: 'Status pending, tidak ada perubahan' };
    }

    await this.prisma.payment.update({
      where: { transactionId: order_id },
      data: {
        paymentStatus: paymentStatus as any,
        paymentMethod: notification.payment_type,
        paidAt: paymentStatus === 'SUCCESS' ? new Date() : null,
      },
    });

    await this.prisma.order.update({
      where: { id: order_id },
      data: { status: orderStatus as any },
    });

    return { message: 'Webhook berhasil diproses' };
  }

  async getPaymentStatus(orderId: string, userId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { order: { id: orderId, userId } },
      include: { order: { select: { id: true, status: true, totalPrice: true } } },
    });
    if (!payment) throw new NotFoundException('Pembayaran tidak ditemukan');
    return payment;
  }
}
