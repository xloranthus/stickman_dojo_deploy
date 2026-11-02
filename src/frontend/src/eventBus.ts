import type { GameEvent, GameEvents } from './types.ts';

/** Synchronous delivery: model/statistics updates finish before the next frame. */
export class EventBus {
  private static instance: EventBus | undefined;
  private readonly listeners = new Map<keyof GameEvents, Set<(event: GameEvent) => void>>();

  static getInstance(): EventBus {
    return this.instance ??= new EventBus();
  }

  subscribe<K extends keyof GameEvents>(type: K, listener: (event: GameEvents[K]) => void): () => void {
    const wrapped = (event: GameEvent) => listener(event as GameEvents[K]);
    let listeners = this.listeners.get(type);
    if (!listeners) this.listeners.set(type, listeners = new Set());
    listeners.add(wrapped);
    let subscribed = true;
    return () => {
      if (!subscribed) return;
      subscribed = false;
      listeners.delete(wrapped);
      if (listeners.size === 0) this.listeners.delete(type);
    };
  }

  emit(event: GameEvent): void {
    for (const listener of [...(this.listeners.get(event.type) ?? [])]) listener(event);
  }
}
