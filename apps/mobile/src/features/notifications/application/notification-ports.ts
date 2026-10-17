import type {
  NotificationContext,
  NotificationObservation,
  NotificationReadiness,
  NotificationState,
} from '../domain/notification-models';

export interface NotificationStateReader {
  getState(): NotificationState;
  getInitialState(): NotificationState;
  subscribe(listener: () => void): () => void;
}

export interface NotificationStateWriter extends NotificationStateReader {
  replace(state: NotificationState): void;
  dispose(): void;
}

export interface MonotonicClock {
  now(): number;
  schedule(callback: () => void, delayMs: number): () => void;
}

export interface NotificationPlatform {
  acquire(rootLease: string): void;
  observe(listener: (observation: NotificationObservation) => void): () => void;
  reconcile(
    context: NotificationContext | null,
    rootLease: string,
    generation: number,
  ): Promise<NotificationObservation>;
  enable(context: NotificationContext): Promise<NotificationObservation>;
  openSettings(context: NotificationContext): Promise<void>;
  checkReadiness(
    context: NotificationContext,
    revision: number,
    attemptId: string,
  ): Promise<NotificationReadiness>;
  release(rootLease: string): void;
}

export interface NotificationController {
  start(context: NotificationContext | null, generation?: number): void;
  refresh(): Promise<void>;
  enable(): Promise<void>;
  openSettings(): Promise<void>;
  setForeground(foreground: boolean): void;
  dispose(): void;
}
