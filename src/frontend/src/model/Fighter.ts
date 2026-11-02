import { EventBus } from '../eventBus.ts';
import type { ControlledFighter } from '../controller/contracts.ts';
import type { PlayerId } from '../types.ts';

// Game-balance constants (all values are per-frame at 60 fps)
const MOVE_SPEED      = 4;    // px per frame
const JUMP_VELOCITY   = -15;  // px per frame (negative = upward)
const ATTACK_DAMAGE    = 10;
const ATTACK_COOLDOWN  = 30;   // frames (~0.5 s)
const ATTACK_DURATION  = 20;   // frames the attacking state is shown
const BLOCK_REDUCTION  = 0.5;  // damage multiplier while blocking (50%)

// Hitbox: the rectangle projected in front of the attacker.
const HITBOX_WIDTH     = 60;   // px, reach of the swing
const HITBOX_HEIGHT    = 50;   // px, vertical coverage of the swing
const HITBOX_OFFSET_Y  = 30;   // px, upward offset from feet (mid-body level)

export type FighterState = 'idle' | 'walking' | 'jumping' | 'blocking' | 'attacking';

export interface FighterOptions {
  id: PlayerId;
  name: string;
  color: string;
  startX: number;
  startY: number;
  eventBus?: EventBus;
}

/**
 * Core game entity. Implements ControlledFighter (Controller contract) and
 * also exposes the extra fields required by FighterRenderState so that no
 * View adapter is needed.
 *
 * Auto-stop: moveLeft/moveRight set velocityX for ONE frame only.
 * PhysicsEngine resets velocityX = 0 before applying motion each frame,
 * so the fighter stops naturally when no move key is held.
 */
export class Fighter implements ControlledFighter {
  // ControlledFighter contract
  readonly id: PlayerId;
  readonly name: string;
  readonly color: string;
  hp: number;
  readonly maxHp: number = 100;

  // FighterRenderState extras (read by FighterRenderer)
  x: number;
  y: number;
  facing: 'left' | 'right';
  currentState: FighterState;
  readonly width  = 34;
  readonly height = 76;
  attackProgress  = 0;

  // Physics state (read/written by PhysicsEngine)
  velocityX = 0;
  velocityY = 0;
  isGrounded = false;

  private attackCooldownTimer = 0;
  private attackDurationTimer = 0;
  private readonly startX: number;
  private readonly startY: number;
  private readonly bus: EventBus;

  constructor(options: FighterOptions) {
    this.id     = options.id;
    this.name   = options.name;
    this.color  = options.color;
    this.x      = options.startX;
    this.y      = options.startY;
    this.startX = options.startX;
    this.startY = options.startY;
    this.hp     = this.maxHp;
    this.facing = options.id === 1 ? 'right' : 'left';
    this.currentState = 'idle';
    this.bus    = options.eventBus ?? EventBus.getInstance();
  }

  // --- movement ---

  /** Sets velocity leftward for this frame. PhysicsEngine resets it next frame. */
  moveLeft(): void {
    if (!this.canMove()) return;
    this.velocityX = -MOVE_SPEED;
    if (this.isGrounded) this.currentState = 'walking';
  }

  /** Sets velocity rightward for this frame. PhysicsEngine resets it next frame. */
  moveRight(): void {
    if (!this.canMove()) return;
    this.velocityX = MOVE_SPEED;
    if (this.isGrounded) this.currentState = 'walking';
  }

  /**
   * Sets or clears the blocking state. Called every frame by PlayerController
   * to mirror the held/released state of the block key.
   */
  setBlocking(blocking: boolean): void {
    if (this.isDead()) return;
    if (blocking) {
      this.velocityX = 0;
      this.currentState = 'blocking';
    } else {
      if (this.currentState === 'blocking') this.currentState = 'idle';
    }
  }

  jump(): void {
    if (!this.isGrounded || !this.canMove()) return;
    this.velocityY = JUMP_VELOCITY;
    this.isGrounded = false;
    this.currentState = 'jumping';
  }

  // --- combat ---

  attack(enemy: ControlledFighter): void {
    if (this.isDead() || this.isBlocking() || this.attackCooldownTimer > 0) return;

    this.currentState = 'attacking';
    this.attackDurationTimer = ATTACK_DURATION;
    this.attackCooldownTimer = ATTACK_COOLDOWN;
    this.attackProgress = 0;

    const enemyFighter = enemy as Fighter;
    if (this.hitboxOverlapsHurtbox(enemyFighter) && enemy.hp > 0) {
      const isEnemyBlocking = enemyFighter.currentState === 'blocking';
      const damage = isEnemyBlocking ? ATTACK_DAMAGE * BLOCK_REDUCTION : ATTACK_DAMAGE;

      enemyFighter.hp = Math.max(0, enemy.hp - damage);
      this.bus.emit({ type: 'DAMAGE_DEALT', attackerId: this.id, damage });

      if (isEnemyBlocking) {
        this.bus.emit({ type: 'BLOCK_EXECUTED', defenderId: enemy.id });
      }

      if (enemy.hp <= 0) {
        this.bus.emit({ type: 'MATCH_ENDED', winnerId: this.id });
      }
    }
  }

  // --- per-frame update ---

  /**
   * Advances timers and resolves state transitions.
   * Called by GameLoop after PhysicsEngine.update().
   */
  update(enemy: ControlledFighter): void {
    if (this.isDead()) return;

    if (this.attackCooldownTimer > 0) this.attackCooldownTimer--;
    if (this.attackDurationTimer > 0) {
      this.attackDurationTimer--;
      this.attackProgress = 1 - this.attackDurationTimer / ATTACK_DURATION;
      if (this.attackDurationTimer === 0) {
        this.attackProgress = 0;
        this.currentState = this.isGrounded ? 'idle' : 'jumping';
      }
    }

    // Auto-transition walking -> idle when not moving horizontally.
    if (this.currentState === 'walking' && this.velocityX === 0) {
      this.currentState = 'idle';
    }

    // Sync jumping state with grounded flag set by PhysicsEngine.
    if (!this.isGrounded &&
        this.currentState !== 'attacking' &&
        this.currentState !== 'blocking') {
      this.currentState = 'jumping';
    }
    if (this.isGrounded && this.currentState === 'jumping') {
      this.currentState = 'idle';
    }

    // Always face the enemy.
    const enemyFighter = enemy as Fighter;
    if (typeof enemyFighter.x === 'number') {
      this.facing = enemyFighter.x >= this.x ? 'right' : 'left';
    }
  }

  // --- round reset ---

  /** Restores the fighter to full health and starting position for a new round. */
  reset(): void {
    this.hp = this.maxHp;
    this.x  = this.startX;
    this.y  = this.startY;
    this.velocityX = 0;
    this.velocityY = 0;
    this.isGrounded = false;
    this.attackCooldownTimer = 0;
    this.attackDurationTimer = 0;
    this.attackProgress = 0;
    this.facing = this.id === 1 ? 'right' : 'left';
    this.currentState = 'idle';
  }

  // --- private helpers ---

  private isDead(): boolean {
    return this.hp <= 0;
  }

  private isBlocking(): boolean {
    return this.currentState === 'blocking';
  }

  /** Returns true when the fighter is allowed to initiate movement. */
  private canMove(): boolean {
    return !this.isDead() && !this.isBlocking();
  }

  /**
   * Returns true when the attacker's hitbox (a rectangle projected in front of
   * the attacker) overlaps the enemy's hurtbox (the enemy's body rectangle).
   *
   * Hitbox: anchored to the attacker's front edge, covers the mid-body area.
   * Hurtbox: the full body AABB of the enemy fighter.
   */
  private hitboxOverlapsHurtbox(enemy: Fighter): boolean {
    // Attacker hitbox
    const hitLeft   = this.facing === 'right'
      ? this.x + this.width / 2
      : this.x - this.width / 2 - HITBOX_WIDTH;
    const hitRight  = hitLeft + HITBOX_WIDTH;
    const hitBottom = this.y - HITBOX_OFFSET_Y;
    const hitTop    = hitBottom - HITBOX_HEIGHT;

    // Enemy hurtbox (full body)
    const hurtLeft   = enemy.x - enemy.width / 2;
    const hurtRight  = enemy.x + enemy.width / 2;
    const hurtBottom = enemy.y;
    const hurtTop    = enemy.y - enemy.height;

    return hitRight > hurtLeft &&
           hitLeft  < hurtRight &&
           hitBottom > hurtTop  &&
           hitTop    < hurtBottom;
  }
}
