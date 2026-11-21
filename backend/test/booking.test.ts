import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateBundles } from '../src/cinemas/bundles';

const examples = [
  { sizes: [1, 3, 4], group: 6, breakdown: [[3, 2]] },
  { sizes: [2, 5], group: 11, breakdown: [[5, 1], [2, 3]] },
  { sizes: [6, 9, 20], group: 44, breakdown: [[20, 1], [9, 2], [6, 1]] },
  { sizes: [4, 6], group: 7, breakdown: [] },
];

for (const { sizes, group, breakdown } of examples) {
  test(`quotes ${group} seats from ${sizes.join(', ')}`, () => {
    const result = calculateBundles(sizes, group);
    const total = breakdown.reduce((count, [, quantity]) => count + quantity, 0);
    assert.equal(result.possible, total > 0);
    assert.equal(result.totalBundles, total || null);
    assert.deepEqual(result.bundles, breakdown.map(([size, quantity]) => ({ size, quantity })));
  });
}

test('handles the largest party with ten available sizes', () => {
  const quote = calculateBundles([1, 2, 3, 5, 10, 20, 50, 100, 250, 500], 10_000);
  assert.equal(quote.totalBundles, 20);
  assert.deepEqual(quote.bundles, [{ size: 500, quantity: 20 }]);
});
