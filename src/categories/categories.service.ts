import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { PaginationDto, createPaginationMeta } from '../common/dto/pagination.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.category.count(),
    ]);

    return { data, meta: createPaginationMeta(total, page, limit) };
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const exists = await this.prisma.category.findFirst({
      where: {
        OR: [
          { name: dto.name },
          { slug: dto.slug },
        ],
      },
    });

    if (exists) {
      if (exists.name === dto.name) {
        throw new ConflictException('Nama kategori sudah digunakan');
      }
      if (exists.slug === dto.slug) {
        throw new ConflictException('Slug sudah digunakan');
      }
    }

    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateCategoryDto>) {
    await this.findOne(id);

    // Cek duplikat nama/slug dengan kategori LAIN (bukan dirinya sendiri)
    if (dto.name || dto.slug) {
      const orConditions: any[] = [];
      if (dto.name) orConditions.push({ name: dto.name });
      if (dto.slug) orConditions.push({ slug: dto.slug });

      const conflict = await this.prisma.category.findFirst({
        where: { OR: orConditions, NOT: { id } },
      });

      if (conflict) {
        if (dto.name && conflict.name === dto.name) {
          throw new ConflictException('Nama kategori sudah digunakan oleh kategori lain');
        }
        if (dto.slug && conflict.slug === dto.slug) {
          throw new ConflictException('Slug sudah digunakan oleh kategori lain');
        }
      }
    }

    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);

    const hasCulinaryPlaces = await this.prisma.culinaryPlace.findFirst({
      where: { categoryId: id },
    });

    if (hasCulinaryPlaces) {
      throw new BadRequestException(
        'Kategori tidak bisa dihapus karena masih digunakan oleh beberapa tempat kuliner',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Kategori berhasil dihapus' };
  }
}
