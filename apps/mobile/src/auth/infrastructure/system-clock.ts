import type {Clock} from '../application/clock';

// Shared across UI remounts so an old native operation cannot match a new root.
let generation = Date.now();

export const systemClock: Clock = {
  now: () => Date.now(),

  nextGeneration: () => {
    generation = Math.max(generation + 1, Date.now());

    return generation;
  },

  schedule: (callback, delayMs) => {
    const handle = setTimeout(callback, delayMs);

    return () => clearTimeout(handle);
  },
};
