import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, createPaginationMeta } from '../common/dto/pagination.dto';

@Injectable()
export class BookmarksService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const where = { userId };

    const [data, total] = await Promise.all([
      this.prisma.bookmark.findMany({
        where,
        include: { culinaryPlace: { include: { category: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.bookmark.count({ where }),
    ]);

    return { data, meta: createPaginationMeta(total, page, limit) };
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
