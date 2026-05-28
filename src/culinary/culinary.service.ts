import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCulinaryDto } from './dto/create-culinary.dto';
import { QueryCulinaryDto } from './dto/query-culinary.dto';
import { UpdateCulinaryDto } from './dto/update-culinary.dto';

@Injectable()
export class CulinaryService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryCulinaryDto) {
    const { search, categoryId, minPrice, maxPrice, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (categoryId) where.categoryId = categoryId;
    if (minPrice !== undefined) where.priceMin = { gte: minPrice };
    if (maxPrice !== undefined) where.priceMax = { lte: maxPrice };

    const [data, total] = await Promise.all([
      this.prisma.culinaryPlace.findMany({
        where,
        skip,
        take: limit,
        include: { category: true },
        orderBy: { rating: 'desc' },
      }),
      this.prisma.culinaryPlace.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const place = await this.prisma.culinaryPlace.findUnique({
      where: { id },
      include: {
        category: true,
        menus: { where: { isAvailable: true } },
        reviews: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!place) throw new NotFoundException('Kuliner tidak ditemukan');
    return place;
  }

  async create(dto: CreateCulinaryDto) {
    return this.prisma.culinaryPlace.create({
      data: dto,
      include: { category: true },
    });
  }

  async update(id: string, dto: UpdateCulinaryDto) {
    await this.findOne(id);
    return this.prisma.culinaryPlace.update({ where: { id }, data: dto, include: { category: true } });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.culinaryPlace.update({ where: { id }, data: { isActive: false } });
    return { message: 'Kuliner berhasil dihapus' };
  }
}
