/** Maximum dispatch rounds a signal runs when its listeners keep updating it. */
const MAX_DISPATCH_ROUNDS = 100;

let batchDepth = 0;
const batchedSignals = new Set<SSignal<unknown>>();

/** @internal Dispatches a change event for `signal`, honoring batching and re-entrancy. */
export let notify: (signal: SSignal<unknown>) => void;

/** Options accepted by the `SSignal` constructor and `computed()`. */
export type SSignalOptions<T> = {
  /**
   * Decides whether a newly assigned value is equal to the current one. When it returns
   * `true` the assignment is ignored and no event is dispatched. Defaults to `Object.is`.
   * It is not consulted for `mutate()` or Map/Set mutations, which keep the same reference.
   */
  equals?: (prev: T, next: T) => boolean;
};

/**
 * A reactive signal that extends EventTarget to provide observable state management.
 * Supports any value type, including reactive Map and Set instances that emit change
 * events on mutation.
 *
 * @template T - The type of the value held by the signal.
 *
 * @example
 * const count = new SSignal(0);
 * count.subscribe((value) => console.log(value));
 * count.value = 1;        // logs: 1
 * count.value = (n) => n + 1; // logs: 2
 *
 * @example
 * // Skip updates that are equal by content
 * const point = new SSignal({ x: 0, y: 0 }, { equals: (a, b) => a.x === b.x && a.y === b.y });
 */
export default class SSignal<T = unknown> extends EventTarget {
  #value: T;
  // Typed loosely so T stays covariant: SSignal<number> must remain assignable to SSignal<unknown>.
  #equals: (prev: unknown, next: unknown) => boolean;
  #mutateDepth = 0;
  #dispatching = false;
  #pending = false;

  static {
    notify = (signal) => signal.#notify();
  }

  /**
   * Creates a new SSignal instance.
   * If the initial value is a Map or Set, it is wrapped in a reactive proxy that
   * dispatches change events on mutating calls.
   *
   * @param value - The initial value of the signal.
   * @param options.equals - Custom equality check for assignments. Defaults to `Object.is`.
   */
  constructor(value: T, options?: SSignalOptions<T>) {
    super();
    this.#equals = (options?.equals ?? Object.is) as (prev: unknown, next: unknown) => boolean;

    if (value instanceof Map || value instanceof Set) {
      this.#value = this.#wrapCollection(value) as T;
    } else {
      this.#value = value;
    }
  }

  /**
   * Returns the current value of the signal.
   */
  get value(): T {
    return this.#value;
  }

  /**
   * Sets a new value for the signal. Accepts either a direct value or an updater
   * function that receives the previous value and returns the next one.
   * No event is dispatched when the new value is equal to the current one, according to
   * the `equals` option (`Object.is` by default).
   *
   * @param newValue - The next value, or a function `(prev: T) => T`.
   */
  set value(newValue: T | ((prev: T) => T)) {
    const nextValue =
      typeof newValue === 'function' ? (newValue as (prev: T) => T)(this.#value) : newValue;

    if (this.#equals(this.#value, nextValue)) {
      return;
    }

    this.#value =
      nextValue instanceof Map || nextValue instanceof Set
        ? (this.#wrapCollection(nextValue) as T)
        : nextValue;
    this.#notify();
  }

  /**
   * Mutates the current value in place and dispatches a single change event afterwards.
   * Use it for arrays, plain objects, or any value whose changes cannot be detected by
   * assignment. Map/Set mutations made inside the mutator are folded into that single event,
   * and nested `mutate()` calls only dispatch once, when the outermost call finishes.
   *
   * Return `false` from the mutator to skip the event (e.g. when nothing changed).
   * If the mutator throws, the event is still dispatched (the value may be partially
   * mutated) and the error is rethrown.
   *
   * @param mutator - Function that receives the current value and mutates it.
   *
   * @example
   * const todos = new SSignal<string[]>([]);
   * todos.mutate((list) => list.push('write docs')); // one change event
   *
   * @example
   * const user = new SSignal({ name: 'Ana' });
   * user.mutate((u) => {
   *   u.name = 'Eva';
   * });
   */
  mutate(mutator: (value: T) => unknown): void {
    this.#mutateDepth++;
    let skip = false;

    try {
      skip = mutator(this.#value) === false;
    } finally {
      this.#mutateDepth--;

      if (this.#mutateDepth === 0 && !skip) {
        this.#notify();
      }
    }
  }

  /**
   * Registers a callback that is invoked whenever the signal value changes.
   * Returns an unsubscribe function that removes the listener when called.
   *
   * Optionally accepts an AbortSignal to cancel the subscription automatically.
   * If the signal is already aborted at call time, the callback is never registered.
   *
   * @param callback - Function called with the new value on each change.
   * @param options.signal - Optional AbortSignal to cancel the subscription.
   * @param options.immediate - If true, fires the callback synchronously with the current value before returning.
   * @returns A function that removes the subscription when called.
   *
   * @example
   * const controller = new AbortController();
   * signal.subscribe((v) => console.log(v), { signal: controller.signal });
   * controller.abort(); // unsubscribes
   *
   * @example
   * signal.subscribe((v) => render(v), { immediate: true }); // render called immediately with current value
   */
  subscribe(callback: (value: T) => void, options?: { signal?: AbortSignal; immediate?: boolean }) {
    if (options?.signal?.aborted) {
      return () => {};
    }

    const handler = (event: Event) => callback((event as CustomEvent<T>).detail);
    this.addEventListener('change', handler);

    const unsubscribe = () => {
      this.removeEventListener('change', handler);
      options?.signal?.removeEventListener('abort', unsubscribe);
    };

    if (options?.signal) {
      options.signal.addEventListener('abort', unsubscribe, { once: true });
    }

    if (options?.immediate) {
      callback(this.#value);
    }

    return unsubscribe;
  }

  /**
   * Registers a callback that is invoked only on the next signal value change.
   * Returns an unsubscribe function that can cancel the pending callback before
   * it fires.
   *
   * Optionally accepts an AbortSignal to cancel the one-time subscription
   * automatically. If the signal is already aborted at call time, the callback is
   * never registered.
   *
   * @param callback - Function called with the new value on the next change.
   * @param options.signal - Optional AbortSignal to cancel the subscription.
   * @returns A function that removes the pending one-time subscription.
   *
   * @example
   * const unsubscribe = signal.once((v) => console.log('first change:', v));
   * unsubscribe(); // cancels if the signal has not changed yet
   */
  once(callback: (value: T) => void, options?: { signal?: AbortSignal }) {
    if (options?.signal?.aborted) {
      return () => {};
    }

    let active = true;

    const unsubscribe = () => {
      if (!active) {
        return;
      }

      active = false;
      this.removeEventListener('change', handler);
      options?.signal?.removeEventListener('abort', unsubscribe);
    };

    const handler = (event: Event) => {
      unsubscribe();
      callback((event as CustomEvent<T>).detail);
    };

    this.addEventListener('change', handler);

    if (options?.signal) {
      options.signal.addEventListener('abort', unsubscribe, { once: true });
    }

    return unsubscribe;
  }

  /**
   * Dispatches a change event with the current value. Inside `batch()` the signal is queued
   * instead. Changes made by listeners while an event is being dispatched are not dispatched
   * nested: once the current round reaches every listener, one more round runs with the latest
   * value, so listeners always see changes in order and finish on the current value.
   */
  #notify(): void {
    if (batchDepth > 0) {
      batchedSignals.add(this);
      return;
    }

    if (this.#dispatching) {
      this.#pending = true;
      return;
    }

    this.#dispatching = true;

    try {
      let rounds = 0;

      do {
        if (++rounds > MAX_DISPATCH_ROUNDS) {
          throw new Error(
            `SSignal update loop: listeners kept changing the value for ${MAX_DISPATCH_ROUNDS} rounds.`,
          );
        }

        this.#pending = false;
        this.dispatchEvent(new CustomEvent<T>('change', { detail: this.#value }));
      } while (this.#pending);
    } finally {
      this.#dispatching = false;
      this.#pending = false;
    }
  }

  /**
   * Wraps a Map or Set in a Proxy that dispatches a change event after any mutating
   * operation, keeping read methods working transparently.
   */
  #wrapCollection<C extends Map<unknown, unknown> | Set<unknown>>(original: C): C {
    const isMap = original instanceof Map;
    const mutatingMethods = new Set<PropertyKey>(
      isMap ? ['set', 'delete', 'clear'] : ['add', 'delete', 'clear'],
    );
    // Functions handed out per property, built once so repeated reads do not allocate.
    const methodCache = new Map<PropertyKey, { method: unknown; wrapper: unknown }>();

    const wrapMutation =
      (prop: PropertyKey, method: (...args: unknown[]) => unknown) =>
      (...args: unknown[]) => {
        const sizeBefore = original.size;
        const isMapSet = isMap && prop === 'set';
        const hadKey = isMapSet && original.has(args[0]);
        const previousEntry = hadKey ? (original as Map<unknown, unknown>).get(args[0]) : undefined;

        const result = method.apply(original, args);

        // Only notify when the collection actually changed: size moved, or Map.set() replaced a value.
        const changed =
          original.size !== sizeBefore || (hadKey && !Object.is(previousEntry, args[1]));

        // Inside mutate(), the single event is dispatched when the mutator finishes.
        if (changed && this.#mutateDepth === 0) {
          this.#notify();
        }

        // Map.set() and Set.add() return the collection; hand back the proxy so chained calls stay reactive.
        return result === original ? proxy : result;
      };

    const proxy = new Proxy(original, {
      get: (target, prop) => {
        const value = Reflect.get(target, prop);

        if (typeof value !== 'function') {
          return value;
        }

        const cached = methodCache.get(prop);
        if (cached?.method === value) {
          return cached.wrapper;
        }

        const wrapper = mutatingMethods.has(prop)
          ? wrapMutation(prop, value as (...args: unknown[]) => unknown)
          : value.bind(target);
        methodCache.set(prop, { method: value, wrapper });

        return wrapper;
      },
    });

    return proxy;
  }
}

/**
 * Runs `fn` and defers every change notification until it returns, so each signal changed
 * inside notifies once, with its final value. Nested batches flush when the outermost ends.
 * Values are updated immediately; only the events wait. If `fn` throws, pending notifications
 * are still delivered and the error is rethrown.
 *
 * @param fn - Function that updates one or more signals.
 * @returns The value returned by `fn`.
 *
 * @example
 * batch(() => {
 *   price.value = 200;
 *   qty.value = 3;
 * }); // computed([price, qty], ...) recomputes once
 */
export function batch<R>(fn: () => R): R {
  batchDepth++;

  try {
    return fn();
  } finally {
    batchDepth--;

    if (batchDepth === 0) {
      flushBatch();
    }
  }
}

function flushBatch(): void {
  let error: unknown;
  let failed = false;

  // Listeners may change further signals while flushing; keep going until the queue is empty.
  while (batchedSignals.size > 0) {
    const signals = [...batchedSignals];
    batchedSignals.clear();

    for (const signal of signals) {
      try {
        notify(signal);
      } catch (err) {
        if (!failed) {
          failed = true;
          error = err;
        }
      }
    }
  }

  if (failed) {
    throw error;
  }
}
