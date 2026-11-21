CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "movies" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "releaseYear" INTEGER NOT NULL,
    "runtime" INTEGER NOT NULL,
    "watched" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "movie_prerequisites" (
    "movieId" INTEGER NOT NULL,
    "prerequisiteId" INTEGER NOT NULL,

    CONSTRAINT "movie_prerequisites_pkey" PRIMARY KEY ("movieId","prerequisiteId")
);

CREATE TABLE "cinemas" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cinemas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cinema_bundles" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,

    CONSTRAINT "cinema_bundles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "movies_title_key" ON "movies"("title");

CREATE INDEX "movie_prerequisites_prerequisiteId_idx" ON "movie_prerequisites"("prerequisiteId");

CREATE UNIQUE INDEX "cinemas_name_key" ON "cinemas"("name");

CREATE UNIQUE INDEX "cinema_bundles_cinemaId_size_key" ON "cinema_bundles"("cinemaId", "size");

ALTER TABLE "movie_prerequisites" ADD CONSTRAINT "movie_prerequisites_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "movie_prerequisites" ADD CONSTRAINT "movie_prerequisites_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cinema_bundles" ADD CONSTRAINT "cinema_bundles_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "cinemas"("id") ON DELETE CASCADE ON UPDATE CASCADE;


CREATE UNIQUE INDEX "movies_title_lower_key" ON "movies" (lower("title"));
CREATE UNIQUE INDEX "cinemas_name_lower_key" ON "cinemas" (lower("name"));

ALTER TABLE "movies"
  ADD CONSTRAINT "movies_title_present" CHECK (length(trim("title")) > 0),
  ADD CONSTRAINT "movies_release_year" CHECK ("releaseYear" >= 1888),
  ADD CONSTRAINT "movies_runtime" CHECK ("runtime" BETWEEN 1 AND 300);

ALTER TABLE "movie_prerequisites"
  ADD CONSTRAINT "movie_prerequisites_different_movies" CHECK ("movieId" <> "prerequisiteId");

ALTER TABLE "cinemas"
  ADD CONSTRAINT "cinemas_name_present" CHECK (length(trim("name")) > 0);

ALTER TABLE "cinema_bundles"
  ADD CONSTRAINT "cinema_bundles_size" CHECK ("size" BETWEEN 1 AND 500);
