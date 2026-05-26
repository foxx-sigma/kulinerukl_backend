import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookmarksService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.bookmark.findMany({
      where: { userId },
      include: { culinaryPlace: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, culinaryPlaceId: string) {
    const exists = await this.prisma.bookmark.findUnique({
      where: { userId_culinaryPlaceId: { userId, culinaryPlaceId } },
    });
    if (exists) throw new ConflictException('Sudah dibookmark');

    return this.prisma.bookmark.create({
      data: { userId, culinaryPlaceId },
      include: { culinaryPlace: true },
    });
  }

  async remove(userId: string, culinaryPlaceId: string) {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: { userId_culinaryPlaceId: { userId, culinaryPlaceId } },
    });
    if (!bookmark) throw new NotFoundException('Bookmark tidak ditemukan');
    await this.prisma.bookmark.delete({
      where: { userId_culinaryPlaceId: { userId, culinaryPlaceId } },
    });
    return { message: 'Bookmark berhasil dihapus' };
  }
}
