export interface Clock {
  now(): number;
  nextGeneration(): number;
  schedule(callback: () => void, delayMs: number): () => void;
}
