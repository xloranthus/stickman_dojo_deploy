import type { ControlledFighter } from '../controller/contracts.ts';

// Physics constants (per-frame at 60 fps)
const GRAVITY        = 0.6;  // px/frame^2
const MAX_FALL_SPEED = 14;   // px/frame terminal velocity

/**
 * The subset of Fighter properties that PhysicsEngine needs to read and write.
 * Keeping this local interface decouples PhysicsEngine from Fighter internals.
 */
interface PhysicsFighter {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  isGrounded: boolean;
  readonly width: number;
  readonly height: number;
}

/**
 * Minimal platform shape PhysicsEngine needs -- compatible with both
 * Platform (Model) and ArenaPlatform (View/ArenaRenderer).
 */
export interface PhysicsPlatform {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Stateless per-frame physics service.
 *
 * Each call to update() performs, in order:
 *   1. Reset velocityX to 0  (auto-stop: Fighter.moveLeft/Right re-sets it if key held)
 *   2. Reset isGrounded to false
 *   3. Apply gravity to velocityY (capped at MAX_FALL_SPEED)
 *   4. Advance position by velocity
 *   5. Resolve platform collisions (AABB: top-landing, head-bonk, side-push)
 *   6. Hard-clamp all four canvas edges so fighters can never escape
 */
export class PhysicsEngine {
  private readonly arenaWidth: number;
  private readonly arenaHeight: number;

  constructor(arenaWidth: number, arenaHeight: number) {
    if (!Number.isFinite(arenaWidth) || arenaWidth <= 0 ||
        !Number.isFinite(arenaHeight) || arenaHeight <= 0) {
      throw new RangeError('PhysicsEngine requires finite positive arena dimensions.');
    }
    this.arenaWidth  = arenaWidth;
    this.arenaHeight = arenaHeight;
  }

  /**
   * Advances the fighter by one simulation step.
   * @param fighter   A Fighter instance (typed as ControlledFighter for the
   *                  controller boundary; cast internally to PhysicsFighter).
   * @param platforms The arena platform list.
   */
  update(fighter: ControlledFighter, platforms: readonly PhysicsPlatform[]): void {
    const f = fighter as unknown as PhysicsFighter;

    // 1. Apply gravity.
    f.velocityY = Math.min(f.velocityY + GRAVITY, MAX_FALL_SPEED);

    // 2. Advance position (uses velocityX set by processInput this frame).
    f.x += f.velocityX;
    f.y += f.velocityY;

    // 3. Auto-stop: zero velocityX so the fighter stops next frame unless a key is held.
    f.velocityX = 0;

    // 4. Reset grounded flag; will be re-set during platform resolution.
    f.isGrounded = false;

    // 5. Resolve platform collisions.
    for (const platform of platforms) {
      this.resolvePlatform(f, platform);
    }

    // 6. Hard-clamp to canvas boundaries.
    this.clampToBounds(f);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * AABB platform resolution.
   * Landing (top): snap feet onto platform top, clear downward velocity.
   * Head bonk (bottom): push down, clear upward velocity.
   * Side push: if horizontal penetration is smaller than vertical, push sideways.
   */
  private resolvePlatform(f: PhysicsFighter, p: PhysicsPlatform): void {
    const fLeft   = f.x - f.width / 2;
    const fRight  = f.x + f.width / 2;
    const fBottom = f.y;            // y is the feet baseline
    const fTop    = f.y - f.height;

    const pLeft   = p.x;
    const pRight  = p.x + p.width;
    const pTop    = p.y;
    const pBottom = p.y + p.height;

    // No overlap at all -- skip.
    if (fRight <= pLeft || fLeft >= pRight) return;
    if (fBottom <= pTop || fTop >= pBottom) return;

    const overlapBottom = fBottom - pTop;
    const overlapTop    = pBottom - fTop;
    const overlapLeft   = fRight  - pLeft;
    const overlapRight  = pRight  - fLeft;

    const minVertical   = Math.min(overlapBottom, overlapTop);
    const minHorizontal = Math.min(overlapLeft, overlapRight);

    if (minVertical <= minHorizontal) {
      if (overlapBottom <= overlapTop) {
        // Coming from above -- land on top.
        f.y = pTop;
        if (f.velocityY > 0) f.velocityY = 0;
        f.isGrounded = true;
      } else {
        // Coming from below -- head bonk.
        f.y = pBottom + f.height;
        if (f.velocityY < 0) f.velocityY = 0;
      }
    } else {
      // Push out to the nearer side.
      if (overlapLeft <= overlapRight) {
        f.x = pLeft - f.width / 2;
      } else {
        f.x = pRight + f.width / 2;
      }
    }
  }

  /**
   * Hard-clamps the fighter to the four canvas edges.
   * Fighters cannot leave through any side, cannot fall off the bottom,
   * and cannot jump through the ceiling.
   */
  private clampToBounds(f: PhysicsFighter): void {
    const halfW = f.width / 2;

    // Left wall.
    if (f.x - halfW < 0) {
      f.x = halfW;
      if (f.velocityX < 0) f.velocityX = 0;
    }

    // Right wall.
    if (f.x + halfW > this.arenaWidth) {
      f.x = this.arenaWidth - halfW;
      if (f.velocityX > 0) f.velocityX = 0;
    }

    // Ceiling.
    if (f.y - f.height < 0) {
      f.y = f.height;
      if (f.velocityY < 0) f.velocityY = 0;
    }

    // Floor safety net (in case a fighter escapes all platforms).
    if (f.y > this.arenaHeight) {
      f.y = this.arenaHeight;
      f.velocityY = 0;
      f.isGrounded = true;
    }
  }

}
