import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovieDto, UpdateMovieDto } from './movie.dto';
import { buildRewatchPlan, CircularDependencyError, prerequisiteOrder, UnknownMovieError } from './rewatch';

function validateGraph<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof UnknownMovieError) throw new NotFoundException(error.message);
    if (error instanceof CircularDependencyError) {
      throw new ConflictException({ code: 'CIRCULAR_DEPENDENCY', message: error.message });
    }
    throw error;
  }
}

const movieDetails = {
  prerequisites: {
    include: { prerequisite: true },
    orderBy: { prerequisiteId: 'asc' },
  },
} satisfies Prisma.MovieInclude;

@Injectable()
export class MoviesService {
  constructor(private readonly db: PrismaService) {}

  findAll() {
    return this.db.$transaction(
      (tx) => tx.movie.findMany({ include: movieDetails, orderBy: { id: 'asc' } }),
      { isolationLevel: 'RepeatableRead' },
    );
  }

  create({ prerequisites = [], ...movie }: CreateMovieDto) {
    if (!prerequisites.length) {
      return this.db.movie.create({ data: movie, include: movieDetails });
    }

    return this.db.$transaction(async (tx) => {
      await this.lockDependencies(tx);
      const { id } = await tx.movie.create({ data: movie });
      return this.saveDependencies(tx, id, prerequisites);
    }, { isolationLevel: 'ReadCommitted' });
  }

  update(id: number, { prerequisites, watched }: UpdateMovieDto) {
    if (prerequisites === undefined) {
      return this.db.movie.update({ where: { id }, data: { watched }, include: movieDetails });
    }

    return this.db.$transaction(async (tx) => {
      await this.lockDependencies(tx);
      return this.saveDependencies(tx, id, prerequisites, watched);
    }, { isolationLevel: 'ReadCommitted' });
  }

  async rewatchOrder(targetId: number) {
    const movies = await this.db.$transaction(
      (tx) => tx.movie.findMany({
        select: {
          id: true,
          title: true,
          releaseYear: true,
          runtime: true,
          watched: true,
          prerequisites: {
            select: { prerequisiteId: true },
            orderBy: { prerequisiteId: 'asc' },
          },
        },
      }),
      { isolationLevel: 'RepeatableRead' },
    );
    return validateGraph(() => buildRewatchPlan(movies, targetId));
  }

  private lockDependencies(tx: Prisma.TransactionClient) {
    return tx.$executeRaw`LOCK TABLE movie_prerequisites IN SHARE ROW EXCLUSIVE MODE`;
  }

  private async saveDependencies(
    tx: Prisma.TransactionClient,
    id: number,
    prerequisites: number[],
    watched?: boolean,
  ) {
    const rows = await tx.movie.findMany({
      select: { id: true, prerequisites: { select: { prerequisiteId: true } } },
    });
    const graph = new Map(rows.map((row) => [
      row.id, row.prerequisites.map((link) => link.prerequisiteId),
    ]));

    if (!graph.has(id)) throw new NotFoundException('Movie not found');
    if (prerequisites.some((prerequisiteId) => !graph.has(prerequisiteId))) {
      throw new NotFoundException('One or more prerequisite movies do not exist');
    }

    graph.set(id, prerequisites);
    validateGraph(() => prerequisiteOrder(graph, id));

    await tx.moviePrerequisite.deleteMany({ where: { movieId: id } });
    if (prerequisites.length) {
      await tx.moviePrerequisite.createMany({
        data: prerequisites.map((prerequisiteId) => ({ movieId: id, prerequisiteId })),
      });
    }
    return tx.movie.update({
      where: { id },
      data: { watched, updatedAt: new Date() },
      include: movieDetails,
    });
  }
}
