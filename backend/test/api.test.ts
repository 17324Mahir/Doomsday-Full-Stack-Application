import 'dotenv/config';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

interface Movie {
  id: number;
  title: string;
  releaseYear: number;
  runtime: number;
  watched: boolean;
  prerequisites: { prerequisiteId: number; prerequisite: { id: number } }[];
}

describe('Doomsday Ready API', () => {
  const schema = 'test_' + randomUUID().replaceAll('-', '');
  let admin: PrismaClient;
  let app: INestApplication;
  let apiUrl: string;

  before(async () => {
    const database = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    assert.ok(database, 'Set TEST_DATABASE_URL or DATABASE_URL to a PostgreSQL database with schema creation privileges.');
    const testUrl = new URL(database);
    testUrl.searchParams.set('schema', schema);
    process.env.DATABASE_URL = testUrl.toString();
    admin = new PrismaClient({ datasourceUrl: database });
    const cli = join(dirname(require.resolve('prisma/package.json')), 'build', 'index.js');
    execFileSync(process.execPath, [cli, 'migrate', 'deploy'], { env: process.env });
    const { createApp } = require('../dist/main.js');
    app = await createApp();
    await app.listen(0, '127.0.0.1');
    apiUrl = (await app.getUrl()) + '/api';
  });

  after(async () => {
    try {
      await app?.close();
    } finally {
      if (admin) {
        try {
          await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        } finally {
          await admin.$disconnect();
        }
      }
    }
  });

  function request(path: string, method = 'GET', body?: object) {
    return fetch(apiUrl + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async function read<T>(response: Response, expectedStatus = 200): Promise<T> {
    const body = await response.text();
    assert.equal(response.status, expectedStatus, body);
    return JSON.parse(body);
  }

  async function createMovie(title: string, prerequisites: number[] = []) {
    return read<Movie>(await request('/movies', 'POST', {
      title, runtime: 90, releaseYear: 2020, prerequisites,
    }), 201);
  }

  async function updateMovie(id: number, body: object) {
    return request('/movies/' + id, 'PATCH', body);
  }

  it('reports database readiness without exposing configuration', async () => {
    const response = await request('/health');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-powered-by'), null);
    assert.deepEqual(await read(response), { status: 'ok' });
  });

  it('validates catalog name lengths and limits request bodies', async () => {
    await createMovie('a'.repeat(200));
    await read(await request('/movies', 'POST', {
      title: 'a'.repeat(201), releaseYear: 2020, runtime: 90,
    }), 400);
    await read(await request('/cinemas', 'POST', { name: 'c'.repeat(200), bundleSizes: [2] }), 201);
    await read(await request('/cinemas', 'POST', { name: 'c'.repeat(201), bundleSizes: [2] }), 400);
    await read(await request('/movies', 'POST', {
      title: 'a'.repeat(33 * 1024), releaseYear: 2020, runtime: 90,
    }), 413);
  });

  it('keeps the title, runtime and release year fixed after creation', async () => {
    const prequel = await createMovie('Prologue');
    const film = await createMovie('Finale');
    const saved = await read<Movie>(await updateMovie(film.id, { watched: true, prerequisites: [prequel.id] }));
    assert.equal(saved.title, 'Finale');
    assert.equal(saved.runtime, 90);
    assert.equal(saved.releaseYear, 2020);
    assert.equal(saved.watched, true);
    assert.deepEqual(saved.prerequisites.map(({ prerequisiteId }) => prerequisiteId), [prequel.id]);

    for (const change of [{ title: 'Retitled' }, { runtime: 120 }, { releaseYear: 2021 }]) {
      await read(await updateMovie(film.id, change), 400);
      await read(await updateMovie(film.id, { ...change, watched: false, prerequisites: [] }), 400);
    }
    const movies = await read<Movie[]>(await request('/movies'));
    assert.deepEqual(movies.find(({ id }) => id === film.id), saved);
  });

  it('persists a watched change and leaves all fields intact after a rejected cycle', async () => {
    const first = await createMovie('First');
    const middle = await createMovie('Middle', [first.id]);
    const last = await createMovie('Last', [middle.id]);
    assert.equal(first.watched, false);
    await read(await updateMovie(first.id, { watched: true }));
    const plan = await read<{ movies: Movie[]; watchedCount: number; unwatchedRuntime: number }>(
      await request(`/movies/${last.id}/rewatch-order`),
    );
    assert.deepEqual(plan.movies.map(({ id }) => id), [first.id, middle.id]);
    assert.equal(plan.watchedCount, 1);
    assert.equal(plan.unwatchedRuntime, 90);

    for (const dependency of [last.id, first.id]) {
      const result = await read<{ code: string }>(
        await updateMovie(first.id, { watched: false, prerequisites: [dependency] }), 409,
      );
      assert.equal(result.code, 'CIRCULAR_DEPENDENCY');
    }
    await read(await updateMovie(last.id, { watched: true, prerequisites: [2147483647] }), 404);
    const movies = await read<Movie[]>(await request('/movies'));
    const saved = movies.find(({ id }) => id === first.id)!;
    assert.equal(saved.title, 'First');
    assert.equal(saved.watched, true);
    assert.deepEqual(saved.prerequisites, []);
    const savedLast = movies.find(({ id }) => id === last.id)!;
    assert.equal(savedLast.watched, false);
    assert.deepEqual(savedLast.prerequisites.map(({ prerequisiteId }) => prerequisiteId), [middle.id]);
    const cleared = await read<Movie>(await updateMovie(last.id, { prerequisites: [] }));
    assert.deepEqual(cleared.prerequisites, []);
  });

  it('rolls back a new movie that references its own allocated ID', async () => {
    const previous = await createMovie('Before self-reference');
    const body = { title: 'Self-reference', releaseYear: 2024, runtime: 105, prerequisites: [previous.id + 1] };
    const result = await read<{ code: string }>(await request('/movies', 'POST', body), 409);
    assert.equal(result.code, 'CIRCULAR_DEPENDENCY');
    const movies = await read<Movie[]>(await request('/movies'));
    assert.ok(!movies.some((movie) => movie.title === body.title));
  });

  it('allows exactly one of two simultaneous edits that would form a cycle', async () => {
    const left = await createMovie('Left');
    const right = await createMovie('Right');
    const responses = await Promise.all([
      updateMovie(left.id, { prerequisites: [right.id] }),
      updateMovie(right.id, { prerequisites: [left.id] }),
    ]);
    assert.deepEqual(responses.map(({ status }) => status).sort(), [200, 409]);
    const result = await read<{ code: string }>(responses.find(({ status }) => status === 409)!, 409);
    assert.equal(result.code, 'CIRCULAR_DEPENDENCY');
    const winner = responses[0].status === 200 ? left : right;
    const loser = winner.id === left.id ? right : left;
    const movies = await read<Movie[]>(await request('/movies'));
    assert.deepEqual(movies.find(({ id }) => id === loser.id)!.prerequisites, []);
    const plan = await read<{ movies: Movie[] }>(await request(`/movies/${winner.id}/rewatch-order`));
    assert.deepEqual(plan.movies.map(({ id }) => id), [loser.id]);
  });

  it('reads one committed version of the library and plan during prerequisite edits', async () => {
    const first = await createMovie('Opening act');
    const middle = await createMovie('Second act', [first.id]);
    const target = await createMovie('Third act', [middle.id]);

    async function edit() {
      for (let step = 0; step < 6; step++) {
        const watched = step % 2 === 0;
        await read(await updateMovie(middle.id, { watched, prerequisites: watched ? [] : [first.id] }));
      }
    }

    async function checkLists() {
      for (let step = 0; step < 6; step++) {
        const movies = await read<Movie[]>(await request('/movies'));
        const saved = movies.find(({ id }) => id === middle.id)!;
        const ids = saved.prerequisites.map(({ prerequisiteId }) => prerequisiteId);
        assert.deepEqual(ids, saved.watched ? [] : [first.id]);
      }
    }

    async function checkPlans() {
      for (let step = 0; step < 6; step++) {
        const plan = await read<{ movies: Movie[]; unwatchedRuntime: number }>(
          await request(`/movies/${target.id}/rewatch-order`),
        );
        const saved = plan.movies.find(({ id }) => id === middle.id)!;
        assert.deepEqual(plan.movies.map(({ id }) => id), saved.watched ? [middle.id] : [first.id, middle.id]);
        assert.equal(plan.unwatchedRuntime, saved.watched ? 0 : 180);
      }
    }

    await Promise.all([edit(), checkLists(), checkPlans()]);
  });

  it('accepts integer bounds and rejects invalid movie, cinema and booking inputs', async () => {
    for (const body of [{ runtime: 0 }, { runtime: 301 }, { title: '  ' }, { watched: 'true' }]) {
      await read(await request('/movies', 'POST', { title: 'Invalid', releaseYear: 2020, runtime: 90, ...body }), 400);
    }
    for (const sizes of [[], [1, 1], [0], [501], [2.5], Array.from({ length: 11 }, (_, i) => i + 1)]) {
      await read(await request('/cinemas', 'POST', { name: 'Invalid', bundleSizes: sizes }), 400);
    }
    await createMovie('Unique title');
    await read(await request('/movies', 'POST', { title: 'Unique title', releaseYear: 2020, runtime: 90 }), 409);
    await read(await request('/movies/2147483647/rewatch-order'), 404);
    await read(await updateMovie(2147483647, { watched: true }), 404);
    await read(await request('/cinemas/2147483647/booking?groupSize=10'), 404);

    const body = { name: 'Local cinema', bundleSizes: [1, 3, 4] };
    const cinema = await read<{ id: number }>(await request('/cinemas', 'POST', body), 201);
    await read(await request('/cinemas', 'POST', body), 409);
    const cinemas = await read<{ id: number; bundles: { size: number }[] }[]>(await request('/cinemas'));
    assert.deepEqual(cinemas.find(({ id }) => id === cinema.id)!.bundles.map(({ size }) => size).sort(), [1, 3, 4]);
    const booking = `/cinemas/${cinema.id}/booking`;
    for (const query of ['', '?groupSize=0', '?groupSize=2.5', '?groupSize=10001']) {
      await read(await request(booking + query), 400);
    }
    for (const [group, count] of [[1, 1], [6, 2], [10_000, 2_500]]) {
      const quote = await read<{ possible: boolean; totalBundles: number; bundles: { size: number; quantity: number }[] }>(
        await request(booking + '?groupSize=' + group),
      );
      assert.equal(quote.possible, true);
      assert.equal(quote.totalBundles, count);
      assert.equal(quote.bundles.reduce((seats, bundle) => seats + bundle.size * bundle.quantity, 0), group);
    }
  });
});
