import type { KeyBindings } from '../types.ts';
import type { ControlledFighter, InputSource } from './contracts.ts';

export class PlayerController {
  private bindings: KeyBindings;
  readonly fighter: ControlledFighter;
  private readonly input: InputSource;

  constructor(
    fighter: ControlledFighter,
    input: InputSource,
    bindings: Readonly<KeyBindings>,
  ) {
    this.fighter = fighter;
    this.input = input;
    this.bindings = { ...bindings };
  }

  setBindings(bindings: Readonly<KeyBindings>): void {
    this.bindings = { ...bindings };
    this.input.clear();
  }

  getBindings(): Readonly<KeyBindings> {
    return { ...this.bindings };
  }

  processInput(enemy: ControlledFighter): void {
    const { fighter, input, bindings } = this;
    if (fighter.hp <= 0) return;

    const blocking = input.isDown(bindings.block);
    fighter.setBlocking(blocking);
    const left = input.isDown(bindings.left);
    const right = input.isDown(bindings.right);
    if (!blocking && left !== right) {
      if (left) fighter.moveLeft();
      else fighter.moveRight();
    }

    // Special attacks fire once per press, even if that press happened while blocking.
    // const special = input.consume(bindings.specialAttack);
    if (blocking) return;
    if (input.isDown(bindings.jump)) fighter.jump();
    if (input.isDown(bindings.primaryAttack)) fighter.attack(enemy);
    // if (special && enemy.hp > 0 && fighter.hp > 0) fighter.shootSpecial(enemy);
    // Grounding, cooldowns, energy and hit-stun restrictions belong to the Model.
  }
}
