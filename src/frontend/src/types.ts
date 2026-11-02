export type PlayerId = 1 | 2;
export type Winner = PlayerId | null;

export interface KeyBindings {
  left: string;
  right: string;
  jump: string;
  block: string;
  primaryAttack: string;
  specialAttack: string;
}

export interface RoundScores { p1: number; p2: number }

export interface PlayerMatchData {
  name: string;
  color: string;
  damageDealt: number;
  hitsLanded: number;
  blocksExecuted: number;
  remainingHp: number;
}

/** Matches backend/main.py's MatchPayload. */
export interface MatchPayload {
  matchId: string;
  timestamp: string;
  durationSeconds: number;
  winner: string;
  players: { p1: PlayerMatchData; p2: PlayerMatchData };
  currentSeriesScore: RoundScores;
}

export interface GameEvents {
  ROUND_STARTED: { type: 'ROUND_STARTED'; matchId: string };
  MATCH_ENDED: { type: 'MATCH_ENDED'; winnerId: Winner };
  DAMAGE_DEALT: { type: 'DAMAGE_DEALT'; attackerId: PlayerId; damage: number };
  BLOCK_EXECUTED: { type: 'BLOCK_EXECUTED'; defenderId: PlayerId };
  PROJECTILE_SPAWNED: { type: 'PROJECTILE_SPAWNED'; ownerId: PlayerId };
  MATCH_SAVE_FAILED: { type: 'MATCH_SAVE_FAILED'; matchId: string; error: unknown };
}

export type GameEvent = GameEvents[keyof GameEvents];
