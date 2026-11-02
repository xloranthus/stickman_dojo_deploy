import type { MatchPayload, PlayerId, RoundScores } from '../types.ts';

/** Implement these ports in Model/View, or provide adapters when their APIs differ. */
export interface ControlledFighter {
  readonly id: PlayerId;
  readonly name: string;
  readonly color: string;
  readonly hp: number;
  moveLeft(): void;
  moveRight(): void;
  jump(): void;
  setBlocking(blocking: boolean): void;
  attack(enemy: ControlledFighter): void;
  update(enemy: ControlledFighter): void;
  reset(): void;
}

export interface InputSource {
  isDown(key: string): boolean;
  consume(key: string): boolean;
  clear(): void;
}

export interface MatchStats {
  readonly p1DamageDealt: number;
  readonly p1Hits: number;
  readonly p1Blocks: number;
  readonly p2DamageDealt: number;
  readonly p2Hits: number;
  readonly p2Blocks: number;
  reset(): void;
}

export interface MatchHUD {
  updateRoundScore(scores: Readonly<RoundScores>): void;
}

export interface BackendApiClient {
  postMatch(payload: MatchPayload): Promise<unknown>;
}
