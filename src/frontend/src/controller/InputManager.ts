import type { KeyBindings } from '../types.ts';
import type { InputSource } from './contracts.ts';

export const PLAYER_ONE_BINDINGS: Readonly<KeyBindings> = Object.freeze({
  left: 'a', right: 'd', jump: 'w', block: 's', primaryAttack: 'f', specialAttack: 'g',
});
export const PLAYER_TWO_BINDINGS: Readonly<KeyBindings> = Object.freeze({
  left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', block: 'ArrowDown',
  primaryAttack: 'l', specialAttack: 'k',
});

/** Tracks physical key holds separately so consume() cannot be undone by auto-repeat. */
export class InputManager implements InputSource {
  private readonly keys = new Map<string, boolean>();
  private readonly held = new Set<string>();
  private target: Window | undefined;
  private readonly keyDown = (event: KeyboardEvent) => this.onKeyDown(event);
  private readonly keyUp = (event: KeyboardEvent) => this.onKeyUp(event);
  private readonly blur = () => this.clear();
  private readonly visibility = () => {
    if (this.target?.document.hidden) this.clear();
  };

  constructor(target: Window | undefined = typeof window === 'undefined' ? undefined : window) {
    if (target) this.attach(target);
  }

  attach(target: Window): void {
    this.detach();
    this.target = target;
    target.addEventListener('keydown', this.keyDown);
    target.addEventListener('keyup', this.keyUp);
    target.addEventListener('blur', this.blur);
    target.document.addEventListener('visibilitychange', this.visibility);
  }

  detach(): void {
    this.target?.removeEventListener('keydown', this.keyDown);
    this.target?.removeEventListener('keyup', this.keyUp);
    this.target?.removeEventListener('blur', this.blur);
    this.target?.document.removeEventListener('visibilitychange', this.visibility);
    this.target = undefined;
    this.clear();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.isEditing(event) || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = this.normalize(event.key);
    if (key.startsWith('arrow') || key === ' ') event.preventDefault();
    if (!event.repeat && !this.held.has(key)) {
      this.held.add(key);
      this.keys.set(key, true);
    }
  }

  onKeyUp(event: KeyboardEvent): void {
    const key = this.normalize(event.key);
    this.held.delete(key);
    this.keys.delete(key);
  }

  isDown(key: string): boolean {
    return this.keys.get(this.normalize(key)) ?? false;
  }

  consume(key: string): boolean {
    const down = this.isDown(key);
    this.keys.delete(this.normalize(key));
    return down;
  }

  clear(): void {
    this.keys.clear();
    this.held.clear();
  }

  private normalize(key: string): string {
    return key.toLowerCase();
  }

  private isEditing(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement | null;
    return !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
  }
}
