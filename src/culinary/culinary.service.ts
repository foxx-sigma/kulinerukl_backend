import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCulinaryDto } from './dto/create-culinary.dto';
import { QueryCulinaryDto } from './dto/query-culinary.dto';
import { UpdateCulinaryDto } from './dto/update-culinary.dto';

@Injectable()
export class CulinaryService {
  constructor(private prisma: PrismaService) {}

  private mapToFrontendFormat(place: any) {
    let ambianceArr: string[] = [];
    try {
      ambianceArr = place.ambiance ? JSON.parse(place.ambiance) : [];
    } catch {
      ambianceArr = typeof place.ambiance === 'string' ? place.ambiance.split(',').map(s => s.trim()) : [];
    }

    const reviews = place.reviews?.map((rv: any) => ({
      id: rv.id,
      userId: rv.userId,
      userName: rv.user?.name || 'Unknown User',
      userAvatar: rv.user?.avatar || '',
      rating: rv.rating,
      comment: rv.comment || '',
      date: rv.createdAt.toISOString().split('T')[0], // format: YYYY-MM-DD
    })) || [];

    return {
      ...place,
      category: place.category?.slug || 'indonesian',
      categories: place.category ? [place.category.slug] : ['indonesian'],
      ambiance: ambianceArr,
      priceRange: place.priceRange ? place.priceRange.toLowerCase() : 'mid',
      menu: place.menus || [],
      reviews,
      reviewCount: reviews.length,
      // Remove original relations that are replaced
      menus: undefined,
      categoryId: undefined,
    };
  }

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
        include: { 
          category: true,
          menus: { where: { isAvailable: true } },
          reviews: { include: { user: { select: { id: true, name: true, avatar: true } } } }
        },
        orderBy: { rating: 'desc' },
      }),
      this.prisma.culinaryPlace.count({ where }),
    ]);

    const formattedData = data.map(place => this.mapToFrontendFormat(place));
    return { data: formattedData, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const place = await this.prisma.culinaryPlace.findUnique({
      where: { id },
      include: {
        category: true,
        menus: { where: { isAvailable: true } },
        reviews: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!place) throw new NotFoundException('Kuliner tidak ditemukan');
    return this.mapToFrontendFormat(place);
  }

  async create(dto: CreateCulinaryDto) {
    const dataToSave = { ...dto };
    if (Array.isArray(dataToSave.ambiance)) {
      dataToSave.ambiance = JSON.stringify(dataToSave.ambiance);
    }

    try {
      const place = await this.prisma.culinaryPlace.create({
        data: dataToSave,
        include: { category: true, menus: true, reviews: { include: { user: true } } },
      });
      return this.mapToFrontendFormat(place);
    } catch (err) {
      this.handleDuplicateError(err);
    }
  }

  async update(id: string, dto: UpdateCulinaryDto) {
    await this.findOne(id); // Check existence
    
    const dataToSave = { ...dto };
    if (Array.isArray(dataToSave.ambiance)) {
      dataToSave.ambiance = JSON.stringify(dataToSave.ambiance);
    }

    try {
      const place = await this.prisma.culinaryPlace.update({ 
        where: { id }, 
        data: dataToSave, 
        include: { category: true, menus: true, reviews: { include: { user: true } } } 
      });
      return this.mapToFrontendFormat(place);
    } catch (err) {
      this.handleDuplicateError(err);
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.culinaryPlace.update({ where: { id }, data: { isActive: false } });
    return { message: 'Kuliner berhasil dihapus' };
  }

  // ─── Helper: Prisma Unique Constraint Error ───────────────────────────────
  private handleDuplicateError(err: unknown): never {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      const fields = (err.meta?.target as string[]) ?? [];
      if (fields.includes('slug')) {
        throw new ConflictException(
          'Nama restoran ini sudah terdaftar (slug duplikat). Gunakan nama yang berbeda.'
        );
      }
      throw new ConflictException('Data ini sudah terdaftar sebelumnya (duplikat).');
    }
    throw err;
  }
}
