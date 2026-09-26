import { beforeAll } from 'vitest';

/**
 * aladin-lite eagerly starts its WASM/WebGL2 init as a top-level promise the moment the
 * module is first imported. Under jsdom that promise always rejects ("WebGL2 not supported"),
 * and it can settle before sky-map/sky-view's own `.catch()` has a chance to attach — a race
 * that surfaces as a Vitest "unhandled rejection" even though the component does handle it.
 * Importing and settling it here first, before any component runs, removes the race.
 */
beforeAll(async () => {
  const mod = await import('aladin-lite');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const A = (mod as any).default ?? mod;
  await Promise.resolve(A.init).catch(() => { /* expected under jsdom */ });
});
