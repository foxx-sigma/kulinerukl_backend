import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { PaginationDto, createPaginationMeta } from '../common/dto/pagination.dto';

@Injectable()
export class MenusService {
  constructor(private prisma: PrismaService) {}

  async findByCulinary(culinaryPlaceId: string, pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const where = { culinaryPlaceId, isAvailable: true };

    const [data, total] = await Promise.all([
      this.prisma.menu.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.menu.count({ where }),
    ]);

    return { data, meta: createPaginationMeta(total, page, limit) };
  }

  async findOne(id: string) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new NotFoundException('Menu tidak ditemukan');
    return menu;
  }

  async create(dto: CreateMenuDto) {
    // Cek duplikat: nama menu yang sama di restoran yang sama
    const duplicate = await this.prisma.menu.findFirst({
      where: {
        culinaryPlaceId: dto.culinaryPlaceId,
        name: { equals: dto.name, mode: 'insensitive' },
      },
    });
    if (duplicate) {
      throw new ConflictException(
        `Menu dengan nama "${dto.name}" sudah ada di restoran ini.`,
      );
    }

    const dataToSave = {
      ...dto,
      isAvailable: dto.stock > 0,
    };

    try {
      return await this.prisma.menu.create({ data: dataToSave });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('ID Tempat Kuliner tidak valid atau tidak ditemukan.');
      }
      throw error;
    }
  }

  async update(id: string, dto: Partial<CreateMenuDto>) {
    const existing = await this.findOne(id);

    // Cek duplikat nama menu di restoran yang sama (kecuali menu itu sendiri)
    if (dto.name) {
      const culinaryId = dto.culinaryPlaceId ?? existing.culinaryPlaceId;
      const duplicate = await this.prisma.menu.findFirst({
        where: {
          culinaryPlaceId: culinaryId,
          name: { equals: dto.name, mode: 'insensitive' },
          NOT: { id },
        },
      });
      if (duplicate) {
        throw new ConflictException(
          `Menu dengan nama "${dto.name}" sudah ada di restoran ini.`,
        );
      }
    }

    const dataToUpdate: any = { ...dto };
    if (dto.stock !== undefined) {
      dataToUpdate.isAvailable = dto.stock > 0;
    }

    try {
      return await this.prisma.menu.update({ where: { id }, data: dataToUpdate });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('ID Tempat Kuliner tidak valid atau tidak ditemukan.');
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.menu.delete({ where: { id } });
    return { message: 'Menu berhasil dihapus permanen' };
  }
}
