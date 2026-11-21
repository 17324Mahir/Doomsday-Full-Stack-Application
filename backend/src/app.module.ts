import { Module } from '@nestjs/common';
import { CinemasModule } from './cinemas/cinemas.module';
import { HealthController } from './health.controller';
import { MoviesModule } from './movies/movies.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({ imports: [PrismaModule, MoviesModule, CinemasModule], controllers: [HealthController] })
export class AppModule {}
