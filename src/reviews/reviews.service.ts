import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async findByCulinary(culinaryPlaceId: string) {
    return this.prisma.review.findMany({
      where: { culinaryPlaceId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateReviewDto) {
    const place = await this.prisma.culinaryPlace.findUnique({
      where: { id: dto.restaurantId },
    });
    if (!place) throw new NotFoundException('Kuliner tidak ditemukan');

    const review = await this.prisma.review.create({
      data: { userId, culinaryPlaceId: dto.restaurantId, rating: dto.rating, comment: dto.comment },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    // Recalculate average rating
    const reviews = await this.prisma.review.findMany({
      where: { culinaryPlaceId: dto.restaurantId },
      select: { rating: true },
    });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await this.prisma.culinaryPlace.update({
      where: { id: dto.restaurantId },
      data: { rating: Math.round(avgRating * 10) / 10 },
    });

    return {
      id: review.id,
      userId: review.userId,
      userName: review.user?.name || 'Unknown User',
      userAvatar: review.user?.avatar || '',
      rating: review.rating,
      comment: review.comment || '',
      date: review.createdAt.toISOString().split('T')[0], // format: YYYY-MM-DD
    };
  }

  async remove(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review tidak ditemukan');
    await this.prisma.review.delete({ where: { id } });
    return { message: 'Review berhasil dihapus' };
  }
}
