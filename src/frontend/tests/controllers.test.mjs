import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/eventBus.ts';
import { InputManager, PLAYER_ONE_BINDINGS, PLAYER_TWO_BINDINGS } from '../src/controller/InputManager.ts';
import { PlayerController } from '../src/controller/PlayerController.ts';
import { MatchController } from '../src/controller/MatchController.ts';
import { GameLoop } from '../src/controller/GameLoop.ts';

const key = (key, extra = {}) => ({ key, repeat: false, preventDefault() {}, ...extra });
function fixture(api) {
  const calls = [];
  const fighter = id => ({
    id, name: `Player ${id}`, color: id === 1 ? 'blue' : 'red', hp: 100,
    moveLeft() { calls.push(`${id}:left`); },
    moveRight() { calls.push(`${id}:right`); },
    stopHorizontal() { calls.push(`${id}:stop`); },
    jump() { calls.push(`${id}:jump`); },
    setBlocking(value) { calls.push(`${id}:block:${value}`); },
    attack() { calls.push(`${id}:attack`); },
    shootSpecial() { calls.push(`${id}:special`); },
    update() { calls.push(`${id}:update`); },
    reset() { this.hp = 100; },
  });
  const fighters = [fighter(1), fighter(2)];
  const input = new InputManager();
  const bus = new EventBus();
  const stats = {
    p1DamageDealt: 0, p1Hits: 0, p1Blocks: 0, p2DamageDealt: 0, p2Hits: 0, p2Blocks: 0,
    reset() { for (const name of Object.keys(this)) if (name !== 'reset') this[name] = 0; },
  };
  let now = 0;
  let ids = 0;
  const scores = [];
  const match = new MatchController({
    fighters, stats, input, api, eventBus: bus, now: () => now,
    createMatchId: () => `round-${++ids}`, timestamp: () => '2026-10-31T12:00:00.000Z',
    resetWorld: () => calls.push('resetWorld'),
    hud: { updateRoundScore: score => scores.push(score) },
  });
  const controllers = [new PlayerController(fighters[0], input, PLAYER_ONE_BINDINGS),
    new PlayerController(fighters[1], input, PLAYER_TWO_BINDINGS)];
  return { calls, fighters, input, bus, stats, match, controllers, scores, setNow: value => now = value };
}

function loopFixture() {
  const f = fixture();
  let nextId = 0;
  const pending = new Map();
  const loop = new GameLoop({
    ...f, matchController: f.match,
    scheduler: {
      request(callback) { pending.set(++nextId, callback); return nextId; },
      cancel(id) { pending.delete(id); },
    },
    updatePhysics: fighter => f.calls.push(`${fighter.id}:physics`),
    updateProjectiles: () => f.calls.push('projectiles:update'),
    drawArena: () => f.calls.push('arena:draw'),
    drawProjectiles: () => f.calls.push('projectiles:draw'),
    drawFighter: fighter => f.calls.push(`${fighter.id}:draw`),
    updateHUD: () => f.calls.push('hud'),
  });
  const frame = time => {
    assert.equal(pending.size, 1);
    const [id, callback] = pending.entries().next().value;
    pending.delete(id);
    callback(time);
  };
  f.match.startNewRound();
  f.calls.length = 0;
  return { ...f, loop, frame, pending };
}

test('consume ignores key repeat until release; keys normalize case', () => {
  const input = new InputManager();
  input.onKeyDown(key('G'));
  assert.equal(input.consume('g'), true);
  input.onKeyDown(key('g', { repeat: true }));
  assert.equal(input.isDown('g'), false);
  input.onKeyUp(key('G'));
  input.onKeyDown(key('g'));
  assert.equal(input.consume('G'), true);
});

test('keyboard listeners clear on blur/hidden and detach cleanly', () => {
  const target = new EventTarget();
  target.document = new EventTarget();
  const input = new InputManager(target);
  const press = () => target.dispatchEvent(Object.assign(new Event('keydown'), { key: 'a' }));
  press();
  assert.equal(input.isDown('a'), true);
  target.dispatchEvent(new Event('blur'));
  assert.equal(input.isDown('a'), false);
  press();
  target.document.hidden = true;
  target.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(input.isDown('a'), false);
  input.detach();
  press();
  assert.equal(input.isDown('a'), false);
});

test('editing fields and browser shortcuts are not captured', () => {
  const input = new InputManager();
  input.onKeyDown(key('a', { target: { tagName: 'INPUT' } }));
  input.onKeyDown(key('s', { ctrlKey: true }));
  assert.equal(input.isDown('a'), false);
  assert.equal(input.isDown('s'), false);
  let prevented = false;
  input.onKeyDown(key('ArrowUp', { preventDefault() { prevented = true; } }));
  assert.equal(prevented, true);
});

test('players use separate bindings, cancel opposing directions, and can rebind', () => {
  const f = fixture();
  f.input.onKeyDown(key('a'));
  f.input.onKeyDown(key('ArrowRight'));
  f.controllers[0].processInput(f.fighters[1]);
  f.controllers[1].processInput(f.fighters[0]);
  assert.ok(f.calls.includes('1:left'));
  assert.ok(f.calls.includes('2:right'));
  f.calls.length = 0;
  f.input.onKeyDown(key('d'));
  f.controllers[0].processInput(f.fighters[1]);
  assert.ok(f.calls.includes('1:stop'));
  f.controllers[0].setBindings({ ...PLAYER_ONE_BINDINGS, left: 'q' });
  f.calls.length = 0;
  f.input.onKeyDown(key('q'));
  f.controllers[0].processInput(f.fighters[1]);
  assert.ok(f.calls.includes('1:left'));
});

test('block suppresses movement/jump/attacks and special fires once per press', () => {
  const f = fixture();
  for (const value of ['s', 'a', 'w', 'f', 'g']) f.input.onKeyDown(key(value));
  f.controllers[0].processInput(f.fighters[1]);
  assert.deepEqual(f.calls, ['1:block:true', '1:stop']);
  f.input.clear();
  f.calls.length = 0;
  f.input.onKeyDown(key('g'));
  f.controllers[0].processInput(f.fighters[1]);
  f.controllers[0].processInput(f.fighters[1]);
  assert.equal(f.calls.filter(call => call === '1:special').length, 1);
});

test('round end freezes time, scores once, saves a snapshot, and rematch resets state', async () => {
  const posted = [];
  const f = fixture({ postMatch: async payload => posted.push(payload) });
  let starts = 0;
  f.bus.subscribe('ROUND_STARTED', () => starts++);
  f.match.startNewRound();
  f.setNow(2500);
  f.stats.p1DamageDealt = 100;
  f.fighters[1].hp = 0;
  f.bus.emit({ type: 'MATCH_ENDED', winnerId: 1 });
  const saved = f.match.saveCompleted;
  f.bus.emit({ type: 'MATCH_ENDED', winnerId: 1 });
  f.setNow(9000);
  assert.equal(f.match.getElapsedSeconds(), 2.5);
  assert.deepEqual(f.match.roundScores, { p1: 1, p2: 0 });
  const result = f.match.lastMatchPayload;
  result.players.p1.name = 'modified';
  f.input.onKeyDown(key('a'));
  f.match.startNewRound();
  await saved;
  assert.equal(posted.length, 1);
  assert.equal(posted[0].players.p1.name, 'Player 1');
  assert.equal(posted[0].players.p1.damageDealt, 100);
  assert.equal(posted[0].players.p2.remainingHp, 0);
  assert.equal(posted[0].durationSeconds, 2.5);
  assert.equal(starts, 2);
  assert.equal(f.stats.p1DamageDealt, 0);
  assert.equal(f.fighters[1].hp, 100);
  assert.equal(f.input.isDown('a'), false);
  assert.deepEqual(f.match.roundScores, { p1: 1, p2: 0 });
});

test('draws do not award points; save errors are observable without blocking rematches', async () => {
  const f = fixture({ postMatch() { throw new Error('offline'); } });
  const errors = [];
  f.bus.subscribe('MATCH_SAVE_FAILED', event => errors.push(event));
  f.match.startNewRound();
  f.bus.emit({ type: 'MATCH_ENDED', winnerId: null });
  await f.match.saveCompleted;
  assert.equal(f.match.lastMatchPayload.winner, 'draw');
  assert.deepEqual(f.match.roundScores, { p1: 0, p2: 0 });
  assert.equal(errors[0].error.message, 'offline');
  f.match.startNewRound();
  assert.equal(f.match.isPlaying, true);
  f.match.dispose();
  f.bus.emit({ type: 'MATCH_ENDED', winnerId: 2 });
  assert.deepEqual(f.match.roundScores, { p1: 0, p2: 0 });
});

test('loop orders input, physics, fighter/projectile updates, canvas, then HUD', () => {
  const f = loopFixture();
  f.loop.start();
  f.loop.start();
  f.frame(0);
  f.calls.length = 0;
  f.frame(1000 / 60);
  assert.deepEqual(f.calls, ['1:block:false', '1:stop', '2:block:false', '2:stop',
    '1:physics', '2:physics', '1:update', '2:update', 'projectiles:update',
    'arena:draw', 'projectiles:draw', '1:draw', '2:draw', 'hud']);
  f.loop.stop();
  assert.equal(f.pending.size, 0);
  f.loop.start();
  f.calls.length = 0;
  f.frame(10000);
  assert.ok(!f.calls.includes('1:physics'));
  f.loop.stop();
});

test('60 Hz and 144 Hz displays simulate the same number of steps', () => {
  for (const hz of [60, 144]) {
    const f = loopFixture();
    f.loop.start();
    for (let frame = 0; frame <= hz; frame++) f.frame(frame * 1000 / hz);
    assert.equal(f.calls.filter(call => call === '1:physics').length, 60);
    f.loop.stop();
  }
});

test('long gaps have bounded catch-up', () => {
  const f = loopFixture();
  f.loop.start();
  f.frame(0);
  f.frame(60000);
  assert.equal(f.calls.filter(call => call === '1:physics').length, 15);
  f.loop.stop();
});

test('lethal input ends simulation immediately; rendering and Space rematch still work', () => {
  const f = loopFixture();
  f.fighters[0].attack = () => {
    f.fighters[1].hp = 0;
    f.bus.emit({ type: 'MATCH_ENDED', winnerId: 1 });
  };
  f.input.onKeyDown(key('f'));
  f.input.onKeyDown(key('g'));
  f.loop.start();
  f.frame(0);
  f.calls.length = 0;
  f.frame(20);
  assert.ok(!f.calls.includes('2:block:false'));
  assert.ok(!f.calls.includes('1:special'));
  assert.ok(!f.calls.includes('1:physics'));
  assert.ok(f.calls.includes('hud'));
  f.input.onKeyDown(key(' '));
  f.frame(40);
  assert.equal(f.match.isPlaying, true);
  assert.equal(f.fighters[1].hp, 100);
  assert.equal(f.input.isDown('f'), false);
  f.loop.stop();
});
