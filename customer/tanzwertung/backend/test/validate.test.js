const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidScore, isValidRating } = require('../src/validate');

test('accepts null score', () => {
  assert.equal(isValidScore(null), true);
});

test('accepts scores within 0-100', () => {
  assert.equal(isValidScore(0), true);
  assert.equal(isValidScore(100), true);
  assert.equal(isValidScore(55.5), true);
});

test('rejects out-of-range or malformed scores', () => {
  assert.equal(isValidScore(-1), false);
  assert.equal(isValidScore(100.1), false);
  assert.equal(isValidScore(NaN), false);
  assert.equal(isValidScore('50'), false);
  assert.equal(isValidScore(undefined), false);
});

test('validates a full rating payload', () => {
  const refs = ['referee1', 'referee2', 'referee3'];
  assert.equal(isValidRating({ competitorId: 1, refereeId: 'referee1', score: 80 }, 100, refs), true);
  assert.equal(isValidRating({ competitorId: 100, refereeId: 'referee3', score: null }, 100, refs), true);
});

test('rejects out-of-range competitor ids', () => {
  const refs = ['referee1', 'referee2', 'referee3'];
  assert.equal(isValidRating({ competitorId: 0, refereeId: 'referee1', score: 80 }, 100, refs), false);
  assert.equal(isValidRating({ competitorId: 101, refereeId: 'referee1', score: 80 }, 100, refs), false);
  assert.equal(isValidRating({ competitorId: NaN, refereeId: 'referee1', score: 80 }, 100, refs), false);
});

test('rejects unknown referees and invalid scores', () => {
  const refs = ['referee1', 'referee2', 'referee3'];
  assert.equal(isValidRating({ competitorId: 1, refereeId: 'referee9', score: 80 }, 100, refs), false);
  assert.equal(isValidRating({ competitorId: 1, refereeId: 'referee1', score: 200 }, 100, refs), false);
});
