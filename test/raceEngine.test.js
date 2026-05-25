import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRacePlan,
  getRaceSnapshot,
  getFinalStandings,
  HORSES
} from '../src/raceEngine.js';

test('createRacePlan returns the same lanes and finish times for the same seed', () => {
  const first = createRacePlan({ seed: 12345, horses: HORSES, durationMs: 28000 });
  const second = createRacePlan({ seed: 12345, horses: HORSES, durationMs: 28000 });

  assert.deepEqual(second, first);
  assert.equal(first.runners.length, HORSES.length);
  assert.ok(first.runners.every((runner) => runner.finishMs >= 18000 && runner.finishMs <= 28000));
});

test('getRaceSnapshot advances runners by elapsed time without exceeding the finish line', () => {
  const plan = createRacePlan({ seed: 20260525, horses: HORSES.slice(0, 3), durationMs: 25000 });

  const beforeStart = getRaceSnapshot({ plan, startTime: 1_000_000, now: 999_000 });
  const midRace = getRaceSnapshot({ plan, startTime: 1_000_000, now: 1_012_500 });
  const finished = getRaceSnapshot({ plan, startTime: 1_000_000, now: 1_040_000 });

  assert.equal(beforeStart.status, 'waiting');
  assert.ok(beforeStart.runners.every((runner) => runner.progress === 0));
  assert.equal(midRace.status, 'running');
  assert.ok(midRace.runners.some((runner) => runner.progress > 0 && runner.progress < 1));
  assert.equal(finished.status, 'finished');
  assert.ok(finished.runners.every((runner) => runner.progress === 1));
});

test('getRaceSnapshot moves every runner once the race is underway', () => {
  const plan = createRacePlan({ seed: 9090, horses: HORSES, durationMs: 30000 });
  const snapshot = getRaceSnapshot({ plan, startTime: 5_000, now: 17_000 });

  assert.equal(snapshot.runners.length, HORSES.length);
  assert.ok(snapshot.runners.every((runner) => runner.progress > 0));
});

test('getFinalStandings sorts by finish time and uses horse ids as deterministic tie breaker', () => {
  const plan = {
    runners: [
      { id: 'late', finishMs: 23000 },
      { id: 'alpha', finishMs: 19000 },
      { id: 'beta', finishMs: 19000 }
    ]
  };

  assert.deepEqual(getFinalStandings(plan).map((runner) => runner.id), ['alpha', 'beta', 'late']);
});
