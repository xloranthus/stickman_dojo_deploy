import type { ControlledFighter } from '../controller/contracts.ts';

export interface FighterRenderState extends ControlledFighter {
  /** Horizontal center and ground-level baseline in canvas coordinates. */
  readonly x: number;
  readonly y: number;
  readonly facing: 'left' | 'right' | -1 | 1;
  readonly currentState: string;
  readonly width?: number;
  readonly height?: number;
  readonly attackProgress?: number;
}

const DEFAULT_WIDTH = 34;
const DEFAULT_HEIGHT = 76;

/** Draws a fighter from its current read-only model state. */
export class FighterRenderer {
  draw(fighter: ControlledFighter, ctx: CanvasRenderingContext2D): void {
    if (!this.hasRenderState(fighter)) {
      throw new Error(
        'FighterRenderer requires x, y, facing, and currentState; provide a view adapter for this fighter.',
      );
    }

    const width = fighter.width ?? DEFAULT_WIDTH;
    const height = fighter.height ?? DEFAULT_HEIGHT;
    if (![fighter.x, fighter.y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
      throw new RangeError('Fighter render coordinates and dimensions must be finite and positive.');
    }
    if (fighter.attackProgress !== undefined && !Number.isFinite(fighter.attackProgress)) {
      throw new RangeError('Fighter attack progress must be finite.');
    }

    const facing = fighter.facing === 'left' || fighter.facing === -1 ? -1 : 1;
    const state = fighter.currentState.toLowerCase();
    const attacking = state.includes('attack') || state.includes('slash');
    const blocking = state.includes('block');
    const hurt = state.includes('hit') || state.includes('hurt');

    ctx.save();
    try {
      ctx.translate(fighter.x, fighter.y);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(fighter.name, 0, -height - 12);

      ctx.scale(facing, 1);
      ctx.strokeStyle = fighter.color;
      ctx.fillStyle = fighter.color;
      ctx.lineWidth = Math.max(3, width * 0.13);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      this.drawHead(ctx, height);
      this.drawBody(ctx, height, hurt);
      if (blocking) {
        this.drawBlockPose(ctx, height);
      } else if (attacking) {
        this.drawSlashAnimation(ctx, height, fighter.attackProgress ?? 0.5);
      } else {
        this.drawStandingPose(ctx, height);
      }
    } finally {
      ctx.restore();
    }
  }

  private drawHead(ctx: CanvasRenderingContext2D, height: number): void {
    ctx.beginPath();
    ctx.arc(0, -height + 12, 9, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawBody(ctx: CanvasRenderingContext2D, height: number, hurt: boolean): void {
    const shoulderY = -height + 26;
    const hipY = -height * 0.43;
    ctx.beginPath();
    ctx.moveTo(0, -height + 22);
    ctx.lineTo(hurt ? -4 : 0, hipY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-12, shoulderY);
    ctx.lineTo(0, shoulderY + 4);
    ctx.lineTo(12, shoulderY);
    ctx.stroke();
  }

  private drawStandingPose(ctx: CanvasRenderingContext2D, height: number): void {
    const shoulderY = -height + 27;
    const hipY = -height * 0.43;
    ctx.beginPath();
    ctx.moveTo(-10, shoulderY + 2);
    ctx.lineTo(-16, -height * 0.57);
    ctx.lineTo(-12, -height * 0.38);
    ctx.moveTo(10, shoulderY + 2);
    ctx.lineTo(16, -height * 0.57);
    ctx.lineTo(12, -height * 0.38);
    ctx.moveTo(0, hipY);
    ctx.lineTo(-10, -height * 0.2);
    ctx.lineTo(-13, 0);
    ctx.moveTo(0, hipY);
    ctx.lineTo(10, -height * 0.2);
    ctx.lineTo(13, 0);
    ctx.stroke();
  }

  private drawSlashAnimation(ctx: CanvasRenderingContext2D, height: number, progress: number): void {
    const shoulderY = -height + 27;
    const hipY = -height * 0.43;
    const amount = Math.max(0, Math.min(1, progress));
    ctx.beginPath();
    ctx.moveTo(10, shoulderY + 2);
    ctx.lineTo(22 + amount * 12, shoulderY - 5);
    ctx.moveTo(-10, shoulderY + 2);
    ctx.lineTo(-16, -height * 0.57);
    ctx.moveTo(0, hipY);
    ctx.lineTo(-9, -height * 0.2);
    ctx.lineTo(-12, 0);
    ctx.moveTo(0, hipY);
    ctx.lineTo(10, -height * 0.2);
    ctx.lineTo(13, 0);
    ctx.stroke();

    ctx.strokeStyle = '#ffe27a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(26, shoulderY - 3, 18, -Math.PI * 0.8, Math.PI * (0.25 + amount * 0.4));
    ctx.stroke();
  }

  private drawBlockPose(ctx: CanvasRenderingContext2D, height: number): void {
    const shoulderY = -height + 27;
    const hipY = -height * 0.43;
    ctx.beginPath();
    ctx.moveTo(10, shoulderY + 2);
    ctx.lineTo(18, -height + 18);
    ctx.lineTo(4, -height + 10);
    ctx.moveTo(-10, shoulderY + 2);
    ctx.lineTo(-18, -height * 0.57);
    ctx.moveTo(0, hipY);
    ctx.lineTo(-9, -height * 0.2);
    ctx.lineTo(-12, 0);
    ctx.moveTo(0, hipY);
    ctx.lineTo(9, -height * 0.2);
    ctx.lineTo(12, 0);
    ctx.stroke();
  }

  private hasRenderState(fighter: ControlledFighter): fighter is FighterRenderState {
    return 'x' in fighter
      && typeof fighter.x === 'number'
      && 'y' in fighter
      && typeof fighter.y === 'number'
      && 'facing' in fighter
      && (fighter.facing === 'left' || fighter.facing === 'right' || fighter.facing === -1 || fighter.facing === 1)
      && 'currentState' in fighter
      && typeof fighter.currentState === 'string';
  }
}