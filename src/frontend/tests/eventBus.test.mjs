import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/eventBus.ts';

test('unsubscribe is idempotent and does not remove later subscribers', () => {
  const bus = new EventBus();
  const off = bus.subscribe('ROUND_STARTED', () => {});
  off();
  let calls = 0;
  bus.subscribe('ROUND_STARTED', () => calls++);
  off();
  bus.emit({ type: 'ROUND_STARTED', matchId: 'round-1' });
  assert.equal(calls, 1);
});
