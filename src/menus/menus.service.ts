import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';

@Injectable()
export class MenusService {
  constructor(private prisma: PrismaService) {}

  async findByCulinary(culinaryPlaceId: string) {
    return this.prisma.menu.findMany({
      where: { culinaryPlaceId, isAvailable: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new NotFoundException('Menu tidak ditemukan');
    return menu;
  }

  async create(dto: CreateMenuDto) {
    return this.prisma.menu.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateMenuDto>) {
    await this.findOne(id);
    return this.prisma.menu.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.menu.update({ where: { id }, data: { isAvailable: false } });
    return { message: 'Menu berhasil dihapus' };
  }
}
