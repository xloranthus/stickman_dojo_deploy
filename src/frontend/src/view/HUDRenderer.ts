import type { ControlledFighter, MatchHUD, MatchStats } from '../controller/contracts.ts';
import type { RoundScores } from '../types.ts';

const DEFAULT_MAX_HP = 100;
const DEFAULT_MAX_ENERGY = 100;

interface PlayerHudElements {
  readonly hpBar: HTMLElement;
  readonly hpValue: HTMLElement;
  readonly energyBar: HTMLElement;
  readonly damage: HTMLElement;
  readonly hits: HTMLElement;
  readonly blocks: HTMLElement;
}

/** Updates cached HUD DOM nodes; selectors are rooted in the supplied document/container. */
export class HUDRenderer implements MatchHUD {
  private readonly players: readonly [PlayerHudElements, PlayerHudElements];
  private readonly timer: HTMLElement;
  private readonly p1Score: HTMLElement;
  private readonly p2Score: HTMLElement;

  constructor(root: ParentNode = document) {
    this.players = [this.getPlayerElements(root, 1), this.getPlayerElements(root, 2)];
    this.timer = this.requireElement(root, '[data-hud="timer"]');
    this.p1Score = this.requireElement(root, '[data-hud="score-p1"]');
    this.p2Score = this.requireElement(root, '[data-hud="score-p2"]');
  }

  updateHP(fighter: ControlledFighter): void {
    const maxHp = 'maxHp' in fighter ? fighter.maxHp : DEFAULT_MAX_HP;
    if (typeof maxHp !== 'number' || !Number.isFinite(maxHp) || maxHp <= 0) {
      throw new RangeError('Fighter maxHp must be a finite positive number.');
    }
    if (!Number.isFinite(fighter.hp)) throw new RangeError('Fighter hp must be finite.');

    const hp = Math.max(0, Math.min(maxHp, fighter.hp));
    const elements = this.getPlayer(fighter.id);
    elements.hpBar.style.width = `${(hp / maxHp) * 100}%`;
    elements.hpBar.setAttribute('aria-valuenow', String(hp));
    elements.hpBar.setAttribute('aria-valuemax', String(maxHp));
    elements.hpValue.textContent = `${Math.ceil(hp)} / ${maxHp}`;
  }

  updateEnergy(fighter: ControlledFighter): void {
    if (!('energy' in fighter) || typeof fighter.energy !== 'number' || !Number.isFinite(fighter.energy)) {
      throw new Error('HUDRenderer requires a finite fighter.energy value to update the energy bar.');
    }
    const maxEnergy = 'maxEnergy' in fighter ? fighter.maxEnergy : DEFAULT_MAX_ENERGY;
    if (typeof maxEnergy !== 'number' || !Number.isFinite(maxEnergy) || maxEnergy <= 0) {
      throw new RangeError('Fighter maxEnergy must be a finite positive number.');
    }

    const energy = Math.max(0, Math.min(maxEnergy, fighter.energy));
    const bar = this.getPlayer(fighter.id).energyBar;
    bar.style.width = `${(energy / maxEnergy) * 100}%`;
    bar.setAttribute('aria-valuenow', String(energy));
    bar.setAttribute('aria-valuemax', String(maxEnergy));
  }

  updateTimer(elapsedSeconds: number): void {
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
      throw new RangeError('Elapsed match time must be a finite non-negative number.');
    }
    const totalSeconds = Math.floor(elapsedSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    this.timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  updateRoundScore(scores: Readonly<RoundScores>): void {
    this.assertScore(scores.p1);
    this.assertScore(scores.p2);
    this.p1Score.textContent = String(scores.p1);
    this.p2Score.textContent = String(scores.p2);
  }

  updateStats(stats: MatchStats): void {
    const values: readonly [keyof PlayerHudElements, number][] = [
      ['damage', stats.p1DamageDealt],
      ['hits', stats.p1Hits],
      ['blocks', stats.p1Blocks],
      ['damage', stats.p2DamageDealt],
      ['hits', stats.p2Hits],
      ['blocks', stats.p2Blocks],
    ];
    for (const [field, value] of values) {
      if (!Number.isFinite(value) || value < 0) {
        throw new RangeError(`Match statistic ${field} must be a finite non-negative number.`);
      }
    }

    for (const [index, playerStats] of [
      [stats.p1DamageDealt, stats.p1Hits, stats.p1Blocks],
      [stats.p2DamageDealt, stats.p2Hits, stats.p2Blocks],
    ].entries()) {
      const elements = this.players[index];
      if (!elements) throw new Error(`Missing HUD elements for player ${index + 1}.`);
      elements.damage.textContent = String(playerStats[0]);
      elements.hits.textContent = String(playerStats[1]);
      elements.blocks.textContent = String(playerStats[2]);
    }
  }

  private getPlayerElements(root: ParentNode, playerId: 1 | 2): PlayerHudElements {
    const player = `[data-player="${playerId}"]`;
    return {
      hpBar: this.requireElement(root, `${player}[data-hud="hp-bar"]`),
      hpValue: this.requireElement(root, `${player}[data-hud="hp-value"]`),
      energyBar: this.requireElement(root, `${player}[data-hud="energy-bar"]`),
      damage: this.requireElement(root, `${player}[data-stat="damage"]`),
      hits: this.requireElement(root, `${player}[data-stat="hits"]`),
      blocks: this.requireElement(root, `${player}[data-stat="blocks"]`),
    };
  }

  private getPlayer(playerId: number): PlayerHudElements {
    if (playerId !== 1 && playerId !== 2) throw new Error(`Unsupported player ID: ${playerId}.`);
    const elements = this.players[playerId - 1];
    if (!elements) throw new Error(`Missing HUD elements for player ${playerId}.`);
    return elements;
  }

  private requireElement(root: ParentNode, selector: string): HTMLElement {
    const element = root.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`HUD element not found: ${selector}`);
    return element;
  }

  private assertScore(score: number): void {
    if (!Number.isInteger(score) || score < 0) {
      throw new RangeError('Round scores must be non-negative integers.');
    }
  }
}