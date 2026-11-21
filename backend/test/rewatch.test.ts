import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildRewatchPlan, CircularDependencyError, UnknownMovieError } from '../src/movies/rewatch';

function movie(id: number, title: string, runtime: number, prerequisites: number[] = []) {
  return {
    id, title, runtime, releaseYear: 2000, watched: false,
    prerequisites: prerequisites.map((prerequisiteId) => ({ prerequisiteId })),
  };
}

const movies = [
  movie(1, 'Iron Man', 126),
  movie(2, 'Captain America: The First Avenger', 124),
  movie(3, 'The Avengers', 143, [1, 2]),
  movie(4, 'Captain America: Civil War', 147, [3]),
  movie(5, 'Thor: Ragnarok', 130),
  movie(6, 'Avengers: Infinity War', 149, [4, 5]),
  movie(7, 'Avengers: Endgame', 181, [6]),
  movie(8, 'Avengers: Doomsday', 180, [7]),
];

test('distinguishes an unknown movie from a cycle', () => {
  assert.throws(() => buildRewatchPlan(movies, 999), UnknownMovieError);
  const cycle = [movie(1, 'First', 90, [2]), movie(2, 'Second', 90, [1])];
  assert.throws(() => buildRewatchPlan(cycle, 1), CircularDependencyError);
});

test('Doomsday includes every prerequisite once, before its dependents', () => {
  const plan = buildRewatchPlan(movies, 8);
  const ids = plan.movies.map(({ id }) => id);
  assert.deepEqual([...ids].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7]);
  for (const film of movies.slice(0, 7)) {
    for (const { prerequisiteId } of film.prerequisites) {
      assert.ok(ids.indexOf(prerequisiteId) < ids.indexOf(film.id));
    }
  }
  assert.equal(plan.unwatchedRuntime, 1_000);
});

test('Civil War has three prerequisites and Ragnarok has none', () => {
  const civilWar = buildRewatchPlan(movies, 4);
  assert.equal(civilWar.totalMovies, 3);
  assert.equal(civilWar.movies[2].id, 3);
  assert.deepEqual(new Set(civilWar.movies.slice(0, 2).map(({ id }) => id)), new Set([1, 2]));

  const ragnarok = buildRewatchPlan(movies, 5);
  assert.deepEqual(ragnarok.movies, []);
  assert.equal(ragnarok.watchedCount, 0);
  assert.equal(ragnarok.unwatchedRuntime, 0);
});

test('shared prerequisites count once in the order, progress and remaining time', () => {
  const films = [
    { ...movie(1, 'Prologue', 80), watched: true },
    movie(2, 'Part One', 90, [1]),
    movie(3, 'Part Two', 95, [1]),
    movie(4, 'Finale', 120, [2, 3]),
  ];
  const plan = buildRewatchPlan(films, 4);
  assert.equal(plan.movies[0].id, 1);
  assert.equal(plan.totalMovies, 3);
  assert.equal(plan.watchedCount, 1);
  assert.equal(plan.unwatchedCount, 2);
  assert.equal(plan.unwatchedRuntime, 185);
});
