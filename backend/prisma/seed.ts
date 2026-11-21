import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const movies = [
  { title: 'Iron Man', releaseYear: 2008, runtime: 126, prerequisites: [] },
  { title: 'Captain America: The First Avenger', releaseYear: 2011, runtime: 124, prerequisites: [] },
  { title: 'The Avengers', releaseYear: 2012, runtime: 143, prerequisites: ['Iron Man', 'Captain America: The First Avenger'] },
  { title: 'Captain America: Civil War', releaseYear: 2016, runtime: 147, prerequisites: ['The Avengers'] },
  { title: 'Thor: Ragnarok', releaseYear: 2017, runtime: 130, prerequisites: [] },
  { title: 'Avengers: Infinity War', releaseYear: 2018, runtime: 149, prerequisites: ['Captain America: Civil War', 'Thor: Ragnarok'] },
  { title: 'Avengers: Endgame', releaseYear: 2019, runtime: 181, prerequisites: ['Avengers: Infinity War'] },
  { title: 'Avengers: Doomsday', releaseYear: 2026, runtime: 180, prerequisites: ['Avengers: Endgame'] },
];

const cinemas = [
  { name: 'Star Cinema', sizes: [1, 3, 4] },
  { name: 'Grand Picture House', sizes: [2, 5] },
  { name: 'The Palisade', sizes: [6, 9, 20] },
  { name: 'Parkside Cinema', sizes: [4, 6] },
];

async function seedMovies(db: Prisma.TransactionClient) {
  const ids = new Map<string, number>();
  for (const { prerequisites, ...movie } of movies) {
    const saved = await db.movie.create({ data: movie });
    ids.set(movie.title, saved.id);
    for (const title of prerequisites) {
      const prerequisiteId = ids.get(title);
      if (prerequisiteId === undefined) throw new Error('Missing seed prerequisite: ' + title);
      await db.moviePrerequisite.create({ data: { movieId: saved.id, prerequisiteId } });
    }
  }
}

async function seed() {
  await prisma.$transaction(async (db) => {
    await db.$executeRaw`LOCK TABLE "movies", "cinemas" IN SHARE ROW EXCLUSIVE MODE`;
    if (await db.movie.count() === 0) await seedMovies(db);
    if (await db.cinema.count() === 0) {
      for (const { name, sizes } of cinemas) {
        await db.cinema.create({ data: { name, bundles: { create: sizes.map(size => ({ size })) } } });
      }
    }
  });
}

seed().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
