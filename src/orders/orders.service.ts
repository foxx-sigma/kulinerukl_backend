import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import * as PDFDocument from 'pdfkit';
// @ts-ignore
const PDFDoc = PDFDocument.default || PDFDocument;
import { createObjectCsvStringifier } from 'csv-writer';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrderDto) {
    // Validasi items tidak boleh kosong
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Pesanan harus memiliki minimal 1 item.');
    }

    const status = dto.paymentMethod === 'cash' ? 'pending_payment' : 'pending_validation';
    
    // Parse items to JSON for Prisma Json field
    const itemsJson = dto.items as any;

    return this.prisma.order.create({
      data: {
        userId,
        items: itemsJson,
        totalPrice: dto.totalPrice,
        paymentMethod: dto.paymentMethod,
        transferProofUrl: dto.transferProofUrl,
        status,
      },
    });
  }

  async findAll(userId: string, role: string) {
    if (role === 'ADMIN') {
      return this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }
    
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, role: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (role !== 'ADMIN' && order.userId !== userId) {
      throw new ForbiddenException('You are not allowed to access this order');
    }

    return order;
  }

  async update(id: string, dto: UpdateOrderStatusDto, userId: string, role: string) {
    const order = await this.findOne(id, userId, role);

    if (role === 'ADMIN') {
      // Admin can update anything
      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: {
          status: dto.status ?? order.status,
          rejectionNote: dto.rejectionNote ?? order.rejectionNote,
          transferProofUrl: dto.transferProofUrl ?? order.transferProofUrl,
        },
      });

      // ── Kurangi stok menu saat pesanan dikonfirmasi ──────────────────────────
      if (dto.status === 'confirmed' && order.status !== 'confirmed') {
        const items = order.items as any[];
        if (Array.isArray(items) && items.length > 0) {
          await this.prisma.$transaction(
            items.map((item: { menuId: string; qty: number }) =>
              this.prisma.menu.update({
                where: { id: item.menuId },
                data: {
                  stock: { decrement: item.qty },
                },
              })
            )
          );

          // Set isAvailable=false removed per user request so menus don't disappear when stock is 0
        }
      }

      return updatedOrder;
    }

    // User can only update transferProofUrl and change status from pending_payment to pending_validation
    const dataToUpdate: any = {};
    if (dto.transferProofUrl) {
      dataToUpdate.transferProofUrl = dto.transferProofUrl;
    }

    if (dto.status === 'pending_validation' && order.status === 'pending_payment') {
      dataToUpdate.status = 'pending_validation';
    } else if (dto.status && dto.status !== order.status) {
      throw new ForbiddenException('You are not allowed to update this status');
    }

    return this.prisma.order.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async verifyPayment(id: string, action: 'approve' | 'reject', rejectionNote?: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'pending_validation') {
      throw new BadRequestException('Order status is not pending_validation');
    }

    if (action === 'approve') {
      return this.prisma.order.update({
        where: { id },
        data: { status: 'confirmed' },
      });
    } else {
      return this.prisma.order.update({
        where: { id },
        data: { 
          status: 'rejected',
          rejectionNote,
        },
      });
    }
  }

  async generatePdfBill(id: string, userId: string, role: string): Promise<Buffer> {
    const order = await this.findOne(id, userId, role);
    
    return new Promise((resolve, reject) => {
      const doc = new (PDFDoc as any)({ size: 'A5', margin: 30 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(14).font('Helvetica-Bold').text('Local Taste Hub', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('Rekomendasi Kuliner Lokal Terbaik', { align: 'center' });
      doc.moveDown();

      // Section: Informasi Pesanan
      doc.fontSize(12).font('Helvetica-Bold').text('Informasi Pesanan');
      doc.fontSize(10).font('Helvetica');
      doc.text(`No. Order: #${order.id.slice(-8).toUpperCase()}`);
      doc.text(`Tanggal: ${order.createdAt.toLocaleDateString('id-ID')}`);
      doc.text(`Metode Pembayaran: ${order.paymentMethod}`);
      doc.text(`Status: ${order.status}`);
      doc.moveDown();

      // Section: Daftar Item
      doc.fontSize(12).font('Helvetica-Bold').text('Daftar Item');
      doc.fontSize(10).font('Helvetica');
      const items = order.items as any[];
      if (Array.isArray(items)) {
        items.forEach(item => {
          const subtotal = item.qty * item.price;
          doc.text(`${item.menuName} | ${item.qty} x Rp ${item.price}`);
          // doc.text(`Rp ${subtotal}`, { align: 'right' }); 
          // PDFKit alignment doesn't work well inline like this without columns. 
          // We can just print the subtotal in the same line or next line.
          doc.text(`Subtotal: Rp ${subtotal}`, { align: 'right' });
          doc.moveDown(0.5);
        });
      }
      doc.moveDown();

      // Section: Total
      doc.fontSize(12).font('Helvetica-Bold').text(`TOTAL: Rp ${order.totalPrice}`, { align: 'right' });
      doc.moveDown(2);

      // Footer
      doc.fontSize(9).font('Helvetica-Oblique').text('Terima kasih telah menggunakan Local Taste Hub', { align: 'center' });
      doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, { align: 'center' });

      doc.end();
    });
  }

  async exportCsv(): Promise<string> {
    const orders = await this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'id', title: 'Order ID' },
        { id: 'date', title: 'Tanggal' },
        { id: 'userId', title: 'User ID' },
        { id: 'paymentMethod', title: 'Payment Method' },
        { id: 'totalPrice', title: 'Total Price' },
        { id: 'status', title: 'Status' },
        { id: 'rejectionNote', title: 'Rejection Note' },
      ],
    });

    const records = orders.map(o => ({
      id: o.id,
      date: o.createdAt.toISOString(),
      userId: o.userId,
      paymentMethod: o.paymentMethod,
      totalPrice: o.totalPrice,
      status: o.status,
      rejectionNote: o.rejectionNote || '',
    }));

    return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
  }

  async exportPdf(): Promise<Buffer> {
    const orders = await this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return new Promise((resolve, reject) => {
      // Landscape A4 for wide table
      const doc = new (PDFDoc as any)({ size: 'A4', layout: 'landscape', margin: 30 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(16).font('Helvetica-Bold').text('Local Taste Hub — Laporan Semua Pesanan', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text(`Tanggal export: ${new Date().toLocaleDateString('id-ID')}`, { align: 'center' });
      
      const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
      doc.text(`Total pesanan: ${orders.length}`, { align: 'center' });
      doc.text(`Total revenue: Rp ${totalRevenue}`, { align: 'center' });
      doc.moveDown();

      // Table Header
      // No | Order ID | Tanggal | Metode | Total | Status
      const columnPositions = [30, 60, 200, 350, 450, 550];
      const startY = doc.y;
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('No', columnPositions[0], startY);
      doc.text('Order ID', columnPositions[1], startY);
      doc.text('Tanggal', columnPositions[2], startY);
      doc.text('Metode', columnPositions[3], startY);
      doc.text('Total', columnPositions[4], startY);
      doc.text('Status', columnPositions[5], startY);
      doc.moveDown();
      
      doc.moveTo(30, doc.y).lineTo(750, doc.y).stroke();
      doc.moveDown(0.5);

      // Table Rows
      doc.font('Helvetica').fontSize(9);
      orders.forEach((order, index) => {
        // Prevent page break in middle of row
        if (doc.y > 500) {
          doc.addPage();
          doc.moveTo(30, doc.y).lineTo(750, doc.y).stroke();
          doc.moveDown(0.5);
        }

        const currentY = doc.y;
        doc.text((index + 1).toString(), columnPositions[0], currentY);
        doc.text(order.id.slice(0, 16) + '...', columnPositions[1], currentY);
        doc.text(order.createdAt.toLocaleDateString('id-ID'), columnPositions[2], currentY);
        doc.text(order.paymentMethod, columnPositions[3], currentY);
        doc.text(`Rp ${order.totalPrice}`, columnPositions[4], currentY);
        doc.text(order.status, columnPositions[5], currentY);
        doc.moveDown(0.5);
      });

      doc.end();
    });
  }
}
