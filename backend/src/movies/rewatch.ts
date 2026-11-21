export class UnknownMovieError extends Error {}

export class CircularDependencyError extends Error {}

export function prerequisiteOrder(graph: Map<number, number[]>, targetId: number): number[] {
  if (!graph.has(targetId)) throw new UnknownMovieError('Movie not found');

  const order: number[] = [];
  const complete = new Set<number>();
  const active = new Set([targetId]);
  const stack = [{ id: targetId, next: 0 }];

  while (stack.length) {
    const frame = stack[stack.length - 1];
    const prerequisites = graph.get(frame.id)!;

    if (frame.next === prerequisites.length) {
      stack.pop();
      active.delete(frame.id);
      complete.add(frame.id);
      if (frame.id !== targetId) order.push(frame.id);
      continue;
    }

    const id = prerequisites[frame.next++];
    if (active.has(id)) {
      throw new CircularDependencyError('This dependency would create a cycle.');
    }
    if (!complete.has(id)) {
      active.add(id);
      stack.push({ id, next: 0 });
    }
  }

  return order;
}

interface MovieNode {
  id: number;
  title: string;
  releaseYear: number;
  runtime: number;
  watched: boolean;
  prerequisites: { prerequisiteId: number }[];
}

export function buildRewatchPlan(movies: MovieNode[], targetId: number) {
  const byId = new Map(movies.map((movie) => [movie.id, movie]));
  const graph = new Map(movies.map((movie) => [
    movie.id,
    movie.prerequisites.map(({ prerequisiteId }) => prerequisiteId),
  ]));
  const order = prerequisiteOrder(graph, targetId);
  const target = byId.get(targetId)!;
  const plan = order.map((id) => {
    const { title, releaseYear, runtime, watched } = byId.get(id)!;
    return { id, title, releaseYear, runtime, watched };
  });
  const remaining = plan.filter((movie) => !movie.watched);

  return {
    target: { id: target.id, title: target.title },
    movies: plan,
    totalMovies: plan.length,
    watchedCount: plan.length - remaining.length,
    unwatchedCount: remaining.length,
    unwatchedRuntime: remaining.reduce((minutes, movie) => minutes + movie.runtime, 0),
  };
}
