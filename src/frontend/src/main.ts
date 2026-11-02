import { Arena } from './model/Arena.ts';
import { Fighter } from './model/Fighter.ts';
import { PhysicsEngine } from './model/PhysicsEngine.ts';
import { ArenaRenderer } from './view/ArenaRenderer.ts';
import { FighterRenderer } from './view/FighterRenderer.ts';
import { HUDRenderer } from './view/HUDRenderer.ts';
import { InputManager, PLAYER_ONE_BINDINGS, PLAYER_TWO_BINDINGS } from './controller/InputManager.ts';
import { PlayerController } from './controller/PlayerController.ts';
import { MatchController } from './controller/MatchController.ts';
import { GameLoop } from './controller/GameLoop.ts';
import { EventBus } from './eventBus.ts';
import type { MatchStats } from './controller/contracts.ts';
import type { ControlledFighter } from './controller/contracts.ts';
import { ApiClient } from './controller/BackendApiClient.ts';

// ── Canvas ──────────────────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// ── Arena (layout + spawn points) ───────────────────────────────────────────
const arena = new Arena({ canvasWidth: canvas.width, canvasHeight: canvas.height });

// ── Fighters ─────────────────────────────────────────────────────────────────
const p1 = new Fighter({
  id: 1, name: 'P1', color: '#4caf50',
  startX: arena.p1StartX, startY: arena.groundY,
});
const p2 = new Fighter({
  id: 2, name: 'P2', color: '#f44336',
  startX: arena.p2StartX, startY: arena.groundY,
});

// ── Physics ───────────────────────────────────────────────────────────────────
const physics = new PhysicsEngine(arena.canvasWidth, arena.canvasHeight);

// ── Renderers ─────────────────────────────────────────────────────────────────
const arenaRenderer   = new ArenaRenderer();
const fighterRenderer = new FighterRenderer();
const hud             = new HUDRenderer(document);

// ── Input ─────────────────────────────────────────────────────────────────────
const input = new InputManager(window);

const backendApiClient = new ApiClient('http://localhost:8000');

// ── Stats tracker ─────────────────────────────────────────────────────────────
const bus = EventBus.getInstance();

const stats: MatchStats = (() => {
  let p1DamageDealt = 0, p1Hits = 0, p1Blocks = 0;
  let p2DamageDealt = 0, p2Hits = 0, p2Blocks = 0;

  bus.subscribe('DAMAGE_DEALT', e => {
    if (e.attackerId === 1) { p1DamageDealt += e.damage; p1Hits++; }
    else                    { p2DamageDealt += e.damage; p2Hits++; }
  });
  bus.subscribe('BLOCK_EXECUTED', e => {
    if (e.defenderId === 1) p1Blocks++;
    else                    p2Blocks++;
  });

  return {
    get p1DamageDealt() { return p1DamageDealt; },
    get p1Hits()        { return p1Hits; },
    get p1Blocks()      { return p1Blocks; },
    get p2DamageDealt() { return p2DamageDealt; },
    get p2Hits()        { return p2Hits; },
    get p2Blocks()      { return p2Blocks; },
    reset() {
      p1DamageDealt = p1Hits = p1Blocks = 0;
      p2DamageDealt = p2Hits = p2Blocks = 0;
    },
  };
})();

// ── Player controllers ────────────────────────────────────────────────────────
const pc1 = new PlayerController(p1, input, PLAYER_ONE_BINDINGS);
const pc2 = new PlayerController(p2, input, PLAYER_TWO_BINDINGS);

// ── Overlay helper ────────────────────────────────────────────────────────────
const overlay      = document.getElementById('overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlaySub   = document.getElementById('overlay-sub')!;

function showOverlay(title: string, sub: string): void {
  overlayTitle.textContent = title;
  overlaySub.textContent   = sub;
  overlay.classList.remove('hidden');
}
function hideOverlay(): void {
  overlay.classList.add('hidden');
}

// ── Match controller ─────────────────────────────────────────────────────────
const match = new MatchController({
  fighters:    [p1, p2],
  stats,
  input,
  resetWorld:  () => arena.reset(),
  hud,
  eventBus:    bus,
  api:         backendApiClient,
});

// ── Game loop ─────────────────────────────────────────────────────────────────
const loop = new GameLoop({
  controllers:       [pc1, pc2],
  input,
  matchController:   match,
  stats,

  updatePhysics: (fighter: ControlledFighter) =>
    physics.update(fighter, arena.platforms),

  updateProjectiles: (_fighters: readonly ControlledFighter[]) => {
    // No projectiles yet — placeholder for future feature.
  },

  drawArena: () =>
    arenaRenderer.draw(ctx, arena.platforms),

  drawProjectiles: () => {
    // No projectiles yet.
  },

  drawFighter: (fighter: ControlledFighter) =>
    fighterRenderer.draw(fighter, ctx),

  updateHUD: (fighters: readonly ControlledFighter[], elapsed: number, s: MatchStats) => {
    for (const f of fighters) hud.updateHP(f);
    hud.updateTimer(elapsed);
    hud.updateStats(s);

    if (match.isMatchOver) {
      const result = match.lastMatchPayload;
      const winnerName = result?.winner ?? 'Draw';
      showOverlay(winnerName === 'draw' ? 'DRAW!' : `${winnerName} wins!`, 'Press SPACE for next round');
    }
  },
});

// ── Boot: show start overlay, wait for SPACE to begin ────────────────────────
showOverlay('STICKMAN DOJO', 'Press SPACE to start');

// The GameLoop itself consumes SPACE to start the next round while running.
// Before the very first round we poll for SPACE here.
function waitForStart(): void {
  if (input.consume(' ')) {
    hideOverlay();
    match.startNewRound();
    loop.start();
    // From here the GameLoop drives everything; re-show the overlay via updateHUD above.
    // We also need to hide the overlay when a new round starts.
    bus.subscribe('ROUND_STARTED', () => hideOverlay());
    return;
  }
  requestAnimationFrame(waitForStart);
}
requestAnimationFrame(waitForStart);
