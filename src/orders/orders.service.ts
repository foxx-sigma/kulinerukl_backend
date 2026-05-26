import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrderDto) {
    // Validasi semua menu dan stok
    const menuIds = dto.items.map((i) => i.menuId);
    const menus = await this.prisma.menu.findMany({
      where: { id: { in: menuIds }, culinaryPlaceId: dto.culinaryPlaceId, isAvailable: true },
    });

    if (menus.length !== menuIds.length) {
      throw new BadRequestException('Beberapa menu tidak ditemukan atau tidak tersedia');
    }

    // Hitung total harga & validasi stok
    let totalPrice = 0;
    const itemsWithPrice = dto.items.map((item) => {
      const menu = menus.find((m) => m.id === item.menuId)!;
      if (menu.stock < item.quantity) {
        throw new BadRequestException(`Stok menu "${menu.name}" tidak mencukupi`);
      }
      totalPrice += menu.price * item.quantity;
      return { menuId: item.menuId, quantity: item.quantity, price: menu.price };
    });

    // Buat order dalam satu transaksi
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          culinaryPlaceId: dto.culinaryPlaceId,
          totalPrice,
          note: dto.note,
          orderItems: { create: itemsWithPrice },
        },
        include: {
          orderItems: { include: { menu: true } },
          culinaryPlace: { select: { id: true, name: true } },
        },
      });

      // Kurangi stok
      for (const item of dto.items) {
        await tx.menu.update({
          where: { id: item.menuId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return newOrder;
    });

    return order;
  }

  async findMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        culinaryPlace: { select: { id: true, name: true, imageUrl: true } },
        orderItems: { include: { menu: { select: { id: true, name: true, imageUrl: true } } } },
        payment: { select: { paymentStatus: true, paymentUrl: true, paidAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId?: string) {
    const where: any = { id };
    if (userId) where.userId = userId;

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        culinaryPlace: true,
        orderItems: { include: { menu: true } },
        payment: true,
      },
    });
    if (!order) throw new NotFoundException('Order tidak ditemukan');
    return order;
  }

  async findAll() {
    return this.prisma.order.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        culinaryPlace: { select: { id: true, name: true } },
        payment: { select: { paymentStatus: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order tidak ditemukan');
    return this.prisma.order.update({ where: { id }, data: { status: status as any } });
  }
}
