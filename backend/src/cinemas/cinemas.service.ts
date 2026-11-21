import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calculateBundles } from './bundles';
import { CreateCinemaDto } from './cinema.dto';

const cinemaDetails = {
  bundles: { orderBy: { size: 'asc' } },
} satisfies Prisma.CinemaInclude;

@Injectable()
export class CinemasService {
  constructor(private readonly db: PrismaService) {}

  create({ name, bundleSizes }: CreateCinemaDto) {
    return this.db.cinema.create({
      data: { name, bundles: { create: bundleSizes.map((size) => ({ size })) } },
      include: cinemaDetails,
    });
  }

  findAll() {
    return this.db.cinema.findMany({ include: cinemaDetails, orderBy: { id: 'asc' } });
  }

  async booking(id: number, groupSize: number) {
    if (!Number.isInteger(groupSize) || groupSize < 1 || groupSize > 10000) {
      throw new BadRequestException('Group size must be a whole number between 1 and 10000');
    }
    const cinema = await this.db.cinema.findUnique({ where: { id }, include: cinemaDetails });
    if (!cinema) throw new NotFoundException('Cinema not found');

    return {
      cinema: { id: cinema.id, name: cinema.name },
      ...calculateBundles(cinema.bundles.map((bundle) => bundle.size), groupSize),
    };
  }
}
