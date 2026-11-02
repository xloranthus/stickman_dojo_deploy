import { Platform } from './Platform.ts';

export interface ArenaOptions {
  canvasWidth?: number;
  canvasHeight?: number;
}

/**
 * Defines the static layout of the arena: canvas dimensions, platform positions,
 * and fighter spawn points. All coordinates are in logical canvas pixels.
 *
 * Default canvas size: 800 × 450 px.
 *
 * Platform layout (relative to canvas):
 *   - Ground:   full-width slab at the bottom
 *   - Left:     floating platform, left side, mid-height
 *   - Right:    floating platform, right side, mid-height (symmetric to Left)
 *   - Center:   narrow floating platform, horizontally centered, slightly higher
 */
export class Arena {
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly platforms: readonly Platform[];

  /** X center of Player 1's spawn position. */
  readonly p1StartX: number;
  /** X center of Player 2's spawn position. */
  readonly p2StartX: number;
  /** Y coordinate of the ground surface (top of the ground platform). */
  readonly groundY: number;

  constructor({ canvasWidth = 800, canvasHeight = 450 }: ArenaOptions = {}) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    const groundHeight = 30;
    const groundY = canvasHeight - groundHeight;
    this.groundY = groundY;

    const ground = new Platform(0, groundY, canvasWidth, groundHeight);

    const floatHeight = 16;

    // Left floating platform: starts at 8% from left, ends at 38% of canvas width,
    // sits at 60% of canvas height.
    const leftPlat = new Platform(
      Math.round(canvasWidth * 0.08),
      Math.round(canvasHeight * 0.60),
      Math.round(canvasWidth * 0.30),
      floatHeight,
    );

    // Right floating platform: mirror of the left one.
    const rightPlat = new Platform(
      Math.round(canvasWidth * 0.62),
      Math.round(canvasHeight * 0.60),
      Math.round(canvasWidth * 0.30),
      floatHeight,
    );

    // Center floating platform: narrow, horizontally centered, somewhat higher.
    const centerPlat = new Platform(
      Math.round(canvasWidth * 0.38),
      Math.round(canvasHeight * 0.38),
      Math.round(canvasWidth * 0.24),
      floatHeight,
    );

    this.platforms = [ground, leftPlat, rightPlat, centerPlat];

    // Spawn fighters symmetrically on the ground, a quarter of the way in from each side.
    this.p1StartX = Math.round(canvasWidth * 0.25);
    this.p2StartX = Math.round(canvasWidth * 0.75);
  }

  /**
   * No-op for now. Will be used to clear projectiles and other round-local state
   * when that feature is added.
   */
  reset(): void {
    // Future upgrade: clear projectiles here.
  }
}
