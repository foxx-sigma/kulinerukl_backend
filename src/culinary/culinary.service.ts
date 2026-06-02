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
      // object `user` agar frontend bisa akses rev.user?.name
      user: rv.user
        ? { id: rv.user.id, name: rv.user.name }
        : null,
      userName: rv.user?.name || 'Unknown User',
      userAvatar: rv.user?.avatar || '',
      rating: rv.rating,
      comment: rv.comment || '',
      // createdAt (ISO string) agar frontend bisa: new Date(rev.createdAt)
      createdAt: rv.createdAt instanceof Date
        ? rv.createdAt.toISOString()
        : rv.createdAt,
      date: rv.createdAt instanceof Date
        ? rv.createdAt.toISOString().split('T')[0]
        : (rv.createdAt ? String(rv.createdAt).split('T')[0] : ''),
    })) || [];

    // category dikembalikan sebagai object { id, name, slug }
    // agar frontend bisa akses: restaurant.category?.name  dan  restaurant.category?.slug
    const categoryObj = place.category
      ? { id: place.category.id, name: place.category.name, slug: place.category.slug }
      : { id: '', name: 'Lainnya', slug: 'indonesian' };

    return {
      ...place,
      category: categoryObj,
      categories: place.category ? [place.category.slug] : ['indonesian'],
      ambiance: ambianceArr,
      priceRange: place.priceRange ? place.priceRange.toLowerCase() : 'mid',
      menu: place.menus || [],
      reviews,
      reviewCount: reviews.length,
      // Hapus relasi asli yang sudah digantikan
      menus: undefined,
      categoryId: undefined,
    };
  }

  async findAll(query: QueryCulinaryDto) {
    const { search, categoryId, minPrice, maxPrice, district, ambiance, minRating, page = 1, limit = 5 } = query;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (categoryId) {
      const isCuid = categoryId.startsWith('c') && categoryId.length >= 25;
      if (isCuid) {
        where.categoryId = categoryId;
      } else {
        where.category = { slug: categoryId };
      }
    }
    if (minPrice !== undefined) where.priceMin = { gte: minPrice };
    if (maxPrice !== undefined) where.priceMax = { lte: maxPrice };
    if (district) where.district = district;
    if (ambiance) where.ambiance = { contains: ambiance, mode: 'insensitive' };
    if (minRating !== undefined) where.rating = { gte: minRating };

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

    // Cek duplikat slug/name dengan kuliner LAIN (bukan dirinya sendiri)
    if (dto.slug || dto.name) {
      const orConditions: any[] = [];
      if (dto.slug) orConditions.push({ slug: dto.slug });
      // name bukan @unique di DB, tapi slug-nya unique — cek slug saja sudah cukup

      if (orConditions.length > 0) {
        const conflict = await this.prisma.culinaryPlace.findFirst({
          where: { OR: orConditions, NOT: { id } },
        });
        if (conflict) {
          if (dto.slug && conflict.slug === dto.slug) {
            throw new ConflictException(
              'Nama restoran ini sudah terdaftar (slug duplikat). Gunakan nama yang berbeda.',
            );
          }
        }
      }
    }

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
