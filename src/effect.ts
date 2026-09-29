import { type ExtractValues, isObject } from './computed';
import SSignal, { type Unsubscribe } from './ssignal';

/** Function an effect may return to undo its work before the next run and on dispose. */
export type EffectCleanup = () => void;

// `void` lets callbacks such as `(v) => console.log(v)` type-check, like React's EffectCallback.
// biome-ignore lint/suspicious/noConfusingVoidType: an effect may return nothing or a cleanup.
type EffectResult = EffectCleanup | undefined | void;

/** Options accepted by `effect()`. */
export type EffectOptions = {
  /** Disposes the effect when this AbortSignal aborts. */
  signal?: AbortSignal;
};

/**
 * Runs `fn` with the current value of a source signal, then again after every change.
 * If `fn` returns a function, it is called before the next run and when the effect is disposed.
 *
 * @param source - The signal to follow.
 * @param fn - Side effect to run; may return a cleanup function.
 * @param options.signal - Optional AbortSignal that disposes the effect.
 * @returns A function that disposes the effect: it stops following the source and runs the last cleanup.
 *
 * @example
 * const title = new SSignal('Home');
 * const dispose = effect(title, (t) => {
 *   document.title = t;
 * });
 */
export function effect<T>(
  source: SSignal<T>,
  fn: (value: T) => EffectResult,
  options?: EffectOptions,
): Unsubscribe;

/**
 * Runs `fn` with the current values of several source signals, then again whenever any of
 * them changes. Sources changed together inside `batch()` cause a single run.
 * If `fn` returns a function, it is called before the next run and when the effect is disposed.
 *
 * @param sources - Tuple of signals to follow.
 * @param fn - Side effect to run with the values as a tuple; may return a cleanup function.
 * @param options.signal - Optional AbortSignal that disposes the effect.
 * @returns A function that disposes the effect: it stops following the sources and runs the last cleanup.
 *
 * @example
 * const dispose = effect([userId, token], ([id, auth]) => {
 *   const controller = new AbortController();
 *   fetch(`/users/${id}`, { headers: { auth }, signal: controller.signal });
 *   return () => controller.abort();
 * });
 */
export function effect<Sources extends readonly SSignal<unknown>[]>(
  sources: [...Sources],
  fn: (values: ExtractValues<Sources>) => EffectResult,
  options?: EffectOptions,
): Unsubscribe;

export function effect(
  sourceOrSources: SSignal<unknown> | readonly SSignal<unknown>[],
  fn: (valueOrValues: never) => EffectResult,
  options?: EffectOptions,
): Unsubscribe {
  if (options?.signal?.aborted) {
    return () => {};
  }

  const single = sourceOrSources instanceof SSignal;
  const sources = single ? [sourceOrSources] : [...sourceOrSources];
  const run = fn as (valueOrValues: unknown) => EffectResult;
  const getValues = () => sources.map((s) => s.value);

  // Last value each source delivered, to tell in-place mutations apart from replacements.
  const seenValues = getValues();
  // Values of the last run, to skip notifications that bring nothing new (e.g. a batch flush).
  let lastRunValues = seenValues;
  let cleanup: EffectResult;
  let active = true;

  const execute = (values: unknown[]) => {
    lastRunValues = values;
    cleanup?.();
    cleanup = run(single ? values[0] : values);
  };

  const unsubscribers = sources.map((source, index) =>
    source.subscribe((value) => {
      // Only an object can be mutated in place; the same primitive means it changed and was
      // restored inside a batch().
      const mutatedInPlace = isObject(value) && Object.is(value, seenValues[index]);
      seenValues[index] = value;

      const values = getValues();
      const unchanged = values.every((v, i) => Object.is(v, lastRunValues[i]));

      if (mutatedInPlace || !unchanged) {
        execute(values);
      }
    }),
  );

  const dispose = () => {
    if (!active) {
      return;
    }

    active = false;
    for (const unsubscribe of unsubscribers) {
      unsubscribe();
    }
    options?.signal?.removeEventListener('abort', dispose);
    cleanup?.();
    cleanup = undefined;
  };

  options?.signal?.addEventListener('abort', dispose, { once: true });
  execute(seenValues.slice());

  return dispose;
}
