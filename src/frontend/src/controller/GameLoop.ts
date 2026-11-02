import type { ControlledFighter, InputSource, MatchStats } from './contracts.ts';
import type { MatchController } from './MatchController.ts';
import type { PlayerController } from './PlayerController.ts';

export interface FrameScheduler {
  request(callback: FrameRequestCallback): number;
  cancel(id: number): void;
}

export interface GameLoopOptions {
  controllers: readonly [PlayerController, PlayerController];
  input: InputSource;
  matchController: MatchController;
  stats: MatchStats;
  /** One simulation step, with the PDF's per-frame values (60 steps/second). */
  updatePhysics: (fighter: ControlledFighter) => void;
  updateProjectiles: (fighters: readonly ControlledFighter[]) => void;
  drawArena: () => void;
  drawProjectiles: () => void;
  drawFighter: (fighter: ControlledFighter) => void;
  updateHUD: (fighters: readonly ControlledFighter[], elapsed: number, stats: MatchStats) => void;
  scheduler?: FrameScheduler;
}

/** Coordinates the MVC layers; callbacks adapt the not-yet-implemented renderers. */
export class GameLoop {
  private readonly scheduler: FrameScheduler;
  private running = false;
  private frameId: number | null = null;
  private previousTime: number | null = null;
  private accumulator = 0;
  private readonly stepMs = 1000 / 60;
  private readonly maxFrameMs = 250;
  private readonly options: GameLoopOptions;

  constructor(options: GameLoopOptions) {
    this.options = options;
    this.scheduler = options.scheduler ?? {
      request: callback => requestAnimationFrame(callback),
      cancel: id => cancelAnimationFrame(id),
    };
  }

  get isRunning(): boolean { return this.running; }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.previousTime = null;
    this.accumulator = 0;
    this.frameId = this.scheduler.request(this.tick);
  }

  stop(): void {
    this.running = false;
    if (this.frameId !== null) this.scheduler.cancel(this.frameId);
    this.frameId = null;
    this.previousTime = null;
    this.accumulator = 0;
    this.options.input.clear();
  }

  private readonly tick = (timestamp: number): void => {
    if (!this.running) return;
    this.frameId = null;
    try {
      const delta = this.previousTime === null ? 0 : Math.max(0, timestamp - this.previousTime);
      this.previousTime = timestamp;
      const options = this.options;
      const match = options.matchController;
      if (match.isMatchOver && options.input.consume(' ')) {
        match.startNewRound();
        this.accumulator = 0;
      } else if (match.isPlaying) {
        this.accumulator += Math.min(delta, this.maxFrameMs);
        while (this.running && match.isPlaying && this.accumulator + 1e-8 >= this.stepMs) {
          this.accumulator = Math.max(0, this.accumulator - this.stepMs);
          this.update();
        }
      } else {
        this.accumulator = 0;
      }
      if (!this.running) return;
      const fighters = options.controllers.map(controller => controller.fighter);
      options.drawArena();
      options.drawProjectiles();
      for (const fighter of fighters) options.drawFighter(fighter);
      options.updateHUD(fighters, match.getElapsedSeconds(), options.stats);
      if (this.running) this.frameId = this.scheduler.request(this.tick);
    } catch (error) {
      this.stop();
      throw error;
    }
  };

  private update(): void {
    const options = this.options;
    const [p1, p2] = options.controllers;
    // A lethal attack may emit MATCH_ENDED synchronously; no later action may run.
    const steps = [
      () => p1.processInput(p2.fighter),
      () => p2.processInput(p1.fighter),
      () => options.updatePhysics(p1.fighter),
      () => options.updatePhysics(p2.fighter),
      () => p1.fighter.update(p2.fighter),
      () => p2.fighter.update(p1.fighter),
      () => options.updateProjectiles([p1.fighter, p2.fighter]),
    ];
    for (const step of steps) {
      if (!this.running || !options.matchController.isPlaying) break;
      step();
    }
  }
}
