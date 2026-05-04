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
 */
export default class SSignal<T = unknown> extends EventTarget {
  #value: T;

  /**
   * Creates a new SSignal instance.
   * If the initial value is a Map or Set, it is wrapped in a reactive proxy that
   * dispatches change events on mutating calls.
   *
   * @param value - The initial value of the signal.
   */
  constructor(value: T) {
    super();

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
   * No event is dispatched when the new value is strictly equal to the current one.
   *
   * @param newValue - The next value, or a function `(prev: T) => T`.
   */
  set value(newValue: T | ((prev: T) => T)) {
    const nextValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(this.#value) : newValue;

    if (Object.is(nextValue, this.#value)) {
      return;
    }

    this.#value = nextValue instanceof Map || nextValue instanceof Set
      ? this.#wrapCollection(nextValue) as T
      : nextValue;
    this.dispatchEvent(new CustomEvent<T>('change', { detail: this.#value }));
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
    if (options?.signal?.aborted) return () => {};

    const handler = (event: Event) => callback((event as CustomEvent<T>).detail);
    this.addEventListener('change', handler);

    const unsubscribe = () => this.removeEventListener('change', handler);

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
    if (options?.signal?.aborted) return () => {};

    let active = true;

    const unsubscribe = () => {
      if (!active) return;

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
   * Wraps a Map or Set in a Proxy that dispatches a change event after any mutating
   * operation, keeping read methods working transparently.
   */
  #wrapCollection<C extends Map<unknown, unknown> | Set<unknown>>(original: C): C {
    const mutatingMethods = original instanceof Map
      ? ['set', 'delete', 'clear']
      : ['add', 'delete', 'clear'];

    return new Proxy(original, {
      get: (target, prop) => {
        const value = Reflect.get(target, prop);

        if (mutatingMethods.includes(String(prop))) {
          return (...args: unknown[]) => {
            const result = (value as (...args: unknown[]) => unknown).apply(target, args);
            this.dispatchEvent(new CustomEvent<T>('change', { detail: this.#value }));

            return result;
          };
        }

        if (typeof value === 'function') {
          return value.bind(target);
        }

        return value;
      },
    });
  }
}
