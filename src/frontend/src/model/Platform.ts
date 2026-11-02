/** A rectangular surface that fighters can stand on or collide with. */
export class Platform {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;

  constructor(x: number, y: number, width: number, height: number) {
    if (![x, y, width, height].every(Number.isFinite) || width < 0 || height < 0) {
      throw new RangeError('Platform requires finite coordinates and non-negative dimensions.');
    }
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  /** Top edge Y coordinate — the surface fighters land on. */
  get top(): number { return this.y; }
  /** Bottom edge Y coordinate. */
  get bottom(): number { return this.y + this.height; }
  /** Left edge X coordinate. */
  get left(): number { return this.x; }
  /** Right edge X coordinate. */
  get right(): number { return this.x + this.width; }
}
