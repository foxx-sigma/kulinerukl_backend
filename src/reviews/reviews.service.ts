import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { PaginationDto, createPaginationMeta } from '../common/dto/pagination.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async findByCulinary(culinaryPlaceId: string, pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { culinaryPlaceId },
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: { culinaryPlaceId } }),
    ]);

    // Normalisasi shape agar konsisten dengan yang diharapkan frontend
    const data = reviews.map((rv) => ({
      id: rv.id,
      userId: rv.userId,
      user: rv.user ? { id: rv.user.id, name: rv.user.name } : null,
      userName: rv.user?.name || 'Unknown User',
      userAvatar: (rv.user as any)?.avatar || '',
      rating: rv.rating,
      comment: rv.comment || '',
      createdAt: rv.createdAt.toISOString(),
      date: rv.createdAt.toISOString().split('T')[0],
    }));

    return { data, meta: createPaginationMeta(total, page, limit) };
  }

  async create(userId: string, dto: CreateReviewDto) {
    const place = await this.prisma.culinaryPlace.findUnique({
      where: { id: dto.culinaryPlaceId },
    });
    if (!place) throw new NotFoundException('Kuliner tidak ditemukan');

    // Cek duplikat: 1 user hanya boleh 1 review per kuliner
    const existingReview = await this.prisma.review.findFirst({
      where: { userId, culinaryPlaceId: dto.culinaryPlaceId },
    });
    if (existingReview) {
      throw new ConflictException(
        'Kamu sudah pernah memberikan review untuk kuliner ini. Setiap user hanya bisa review 1x per kuliner.',
      );
    }

    const review = await this.prisma.review.create({
      data: { userId, culinaryPlaceId: dto.culinaryPlaceId, rating: dto.rating, comment: dto.comment },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    // Recalculate average rating
    const reviews = await this.prisma.review.findMany({
      where: { culinaryPlaceId: dto.culinaryPlaceId },
      select: { rating: true },
    });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await this.prisma.culinaryPlace.update({
      where: { id: dto.culinaryPlaceId },
      data: { rating: Math.round(avgRating * 10) / 10 },
    });

    return {
      id: review.id,
      userId: review.userId,
      user: { id: review.user?.id, name: review.user?.name || 'Unknown User' },
      userName: review.user?.name || 'Unknown User',
      userAvatar: review.user?.avatar || '',
      rating: review.rating,
      comment: review.comment || '',
      createdAt: review.createdAt.toISOString(),
      date: review.createdAt.toISOString().split('T')[0],
    };
  }

  async remove(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review tidak ditemukan');
    await this.prisma.review.delete({ where: { id } });
    return { message: 'Review berhasil dihapus' };
  }
}
