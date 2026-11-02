import { EventBus } from '../eventBus.ts';
import type { GameEvents, MatchPayload, PlayerMatchData, RoundScores } from '../types.ts';
import type { BackendApiClient, ControlledFighter, InputSource, MatchHUD, MatchStats } from './contracts.ts';

export interface MatchControllerOptions {
  fighters: readonly [ControlledFighter, ControlledFighter];
  stats: MatchStats;
  input: InputSource;
  /** Clear projectiles and other round-local model state. */
  resetWorld: () => void;
  eventBus?: EventBus;
  hud?: MatchHUD;
  api?: BackendApiClient;
  now?: () => number;
  createMatchId?: () => string;
  timestamp?: () => string;
}

export class MatchController {
  private scores: RoundScores = { p1: 0, p2: 0 };
  private startTime = 0;
  private elapsed = 0;
  private state: 'ready' | 'playing' | 'ended' = 'ready';
  private matchId = '';
  private timestamp = '';
  private result: MatchPayload | null = null;
  private disposed = false;
  private readonly bus: EventBus;
  private readonly now: () => number;
  private readonly unsubscribe: () => void;
  private save: Promise<void> = Promise.resolve();
  private readonly options: MatchControllerOptions;

  constructor(options: MatchControllerOptions) {
    this.options = options;
    if (options.fighters[0].id !== 1 || options.fighters[1].id !== 2) {
      throw new Error('MatchController requires fighters in P1, P2 order.');
    }
    this.bus = options.eventBus ?? EventBus.getInstance();
    this.now = options.now ?? (() => performance.now());
    this.unsubscribe = this.bus.subscribe('MATCH_ENDED', event => this.onMatchEnded(event));
  }

  get roundScores(): Readonly<RoundScores> { return { ...this.scores }; }
  get matchStartTime(): number { return this.startTime; }
  get isMatchOver(): boolean { return this.state === 'ended'; }
  get isPlaying(): boolean { return this.state === 'playing' && !this.disposed; }
  get saveCompleted(): Promise<void> { return this.save; }
  get lastMatchPayload(): MatchPayload | null {
    return this.result ? structuredClone(this.result) : null;
  }

  startNewRound(): void {
    if (this.disposed) throw new Error('MatchController has been disposed.');
    this.state = 'ready';
    for (const fighter of this.options.fighters) fighter.reset();
    this.options.stats.reset();
    this.options.resetWorld();
    this.options.input.clear();
    this.matchId = (this.options.createMatchId ?? (() => crypto.randomUUID()))();
    this.timestamp = (this.options.timestamp ?? (() => new Date().toISOString()))();
    this.startTime = this.now();
    this.elapsed = 0;
    this.result = null;
    this.state = 'playing';
    this.options.hud?.updateRoundScore(this.roundScores);
    this.bus.emit({ type: 'ROUND_STARTED', matchId: this.matchId });
  }

  onMatchEnded(event: GameEvents['MATCH_ENDED']): void {
    if (!this.isPlaying) return;
    if (event.winnerId !== 1 && event.winnerId !== 2 && event.winnerId !== null) {
      throw new Error('Invalid winner ID.');
    }
    this.elapsed = this.getElapsedSeconds();
    this.state = 'ended'; // Guard duplicate events and freeze the timer before notifying observers.
    if (event.winnerId === 1) this.scores.p1++;
    if (event.winnerId === 2) this.scores.p2++;
    const [p1, p2] = this.options.fighters;
    const stats = this.options.stats;
    const player = (fighter: ControlledFighter, damage: number, hits: number, blocks: number): PlayerMatchData => ({
      name: fighter.name, color: fighter.color, damageDealt: damage,
      hitsLanded: hits, blocksExecuted: blocks, remainingHp: Math.max(0, fighter.hp),
    });
    const payload: MatchPayload = {
      matchId: this.matchId, timestamp: this.timestamp, durationSeconds: this.elapsed,
      winner: event.winnerId === null ? 'draw' : (event.winnerId === 1 ? p1.name : p2.name),
      players: {
        p1: player(p1, stats.p1DamageDealt, stats.p1Hits, stats.p1Blocks),
        p2: player(p2, stats.p2DamageDealt, stats.p2Hits, stats.p2Blocks),
      },
      currentSeriesScore: { ...this.scores },
    };
    this.result = payload;
    this.options.hud?.updateRoundScore(this.roundScores);
    const api = this.options.api;
    if (api) {
      // Capture this round before a rematch can reset fighters or statistics.
      this.save = Promise.resolve().then(() => api.postMatch(structuredClone(payload))).then(
        () => undefined,
        error => this.bus.emit({ type: 'MATCH_SAVE_FAILED', matchId: payload.matchId, error }),
      );
    }
  }

  getElapsedSeconds(): number {
    return this.isPlaying ? Math.max(0, (this.now() - this.startTime) / 1000) : this.elapsed;
  }

  dispose(): void {
    this.elapsed = this.getElapsedSeconds();
    this.disposed = true;
    this.unsubscribe();
  }
}
