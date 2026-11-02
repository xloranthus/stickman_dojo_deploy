export interface ArenaPlatform {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const GROUND_COLORS = {
  fill: '#3b3028',
  top: '#8a6b45',
  stripe: 'rgba(255, 255, 255, 0.08)',
} as const;

/** Draws the arena background and its platform rectangles without changing them. */
export class ArenaRenderer {
  draw(ctx: CanvasRenderingContext2D, platforms: readonly ArenaPlatform[]): void {
    const { width, height } = ctx.canvas;
    this.drawBackground(ctx, width, height);

    for (const platform of platforms) {
      this.validatePlatform(platform);
      if (platform.y + platform.height >= height) {
        this.drawGround(ctx, platform);
      } else {
        this.drawFloatingPlatform(ctx, platform);
      }
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#17263d');
    sky.addColorStop(0.65, '#526b7b');
    sky.addColorStop(1, '#a98b69');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255, 220, 150, 0.16)';
    ctx.beginPath();
    ctx.arc(width * 0.78, height * 0.22, Math.min(width, height) * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(18, 31, 47, 0.28)';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.72);
    ctx.lineTo(width * 0.2, height * 0.46);
    ctx.lineTo(width * 0.39, height * 0.72);
    ctx.lineTo(width * 0.57, height * 0.5);
    ctx.lineTo(width * 0.82, height * 0.72);
    ctx.lineTo(width, height * 0.55);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
  }

  private drawGround(ctx: CanvasRenderingContext2D, platform: ArenaPlatform): void {
    ctx.fillStyle = GROUND_COLORS.fill;
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    ctx.fillStyle = GROUND_COLORS.top;
    ctx.fillRect(platform.x, platform.y, platform.width, Math.min(7, platform.height));
    ctx.fillStyle = GROUND_COLORS.stripe;
    for (let x = platform.x + 12; x < platform.x + platform.width; x += 32) {
      ctx.fillRect(x, platform.y + 9, 2, Math.max(0, platform.height - 9));
    }
  }

  private drawFloatingPlatform(ctx: CanvasRenderingContext2D, platform: ArenaPlatform): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(platform.x + 4, platform.y + 5, platform.width, platform.height);
    ctx.fillStyle = '#513b31';
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    ctx.fillStyle = '#bb8954';
    ctx.fillRect(platform.x, platform.y, platform.width, Math.min(6, platform.height));
    ctx.strokeStyle = 'rgba(255, 225, 175, 0.32)';
    ctx.lineWidth = 1;
    ctx.strokeRect(platform.x + 0.5, platform.y + 0.5, Math.max(0, platform.width - 1), Math.max(0, platform.height - 1));
  }

  private validatePlatform(platform: ArenaPlatform): void {
    const values = [platform.x, platform.y, platform.width, platform.height];
    if (!values.every(Number.isFinite) || platform.width < 0 || platform.height < 0) {
      throw new RangeError('Arena platforms require finite coordinates and non-negative dimensions.');
    }
  }
}