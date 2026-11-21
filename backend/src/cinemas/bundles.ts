export function calculateBundles(bundleSizes: number[], groupSize: number) {
  const sizes = [...bundleSizes].sort((a, b) => b - a);
  const fewest: number[] = Array(groupSize + 1).fill(Infinity);
  const lastBundle: number[] = Array(groupSize + 1).fill(0);
  fewest[0] = 0;

  for (let seats = 1; seats <= groupSize; seats++) {
    for (const size of sizes) {
      if (size > seats) continue;
      const count = fewest[seats - size] + 1;
      if (count < fewest[seats]) {
        fewest[seats] = count;
        lastBundle[seats] = size;
      }
    }
  }

  if (!Number.isFinite(fewest[groupSize])) {
    return {
      possible: false, groupSize, totalBundles: null, bundles: [],
      message: 'Exact bundle combination is not possible',
    };
  }

  const counts = new Map<number, number>();
  for (let remaining = groupSize; remaining > 0;) {
    const size = lastBundle[remaining];
    counts.set(size, (counts.get(size) ?? 0) + 1);
    remaining -= size;
  }

  return {
    possible: true,
    groupSize,
    totalBundles: fewest[groupSize],
    bundles: sizes.filter((size) => counts.has(size)).map((size) => ({
      size, quantity: counts.get(size)!,
    })),
    message: 'Exact bundle combination found',
  };
}
