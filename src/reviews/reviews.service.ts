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
      where: { id: dto.culinaryPlaceId },
    });
    if (!place) throw new NotFoundException('Kuliner tidak ditemukan');

    const review = await this.prisma.review.create({
      data: { userId, culinaryPlaceId: dto.culinaryPlaceId, rating: dto.rating, comment: dto.comment },
      include: { user: { select: { id: true, name: true } } },
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

    return review;
  }

  async remove(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review tidak ditemukan');
    await this.prisma.review.delete({ where: { id } });
    return { message: 'Review berhasil dihapus' };
  }
}
