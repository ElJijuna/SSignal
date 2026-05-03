import SSignal from './ssignal';

type ExtractValues<T extends readonly SSignal<any>[]> = {
  [K in keyof T]: T[K] extends SSignal<infer V> ? V : never;
};

const parentSetter = Object.getOwnPropertyDescriptor(SSignal.prototype, 'value')!.set!;

const registry = new FinalizationRegistry<() => void>((dispose) => dispose());

/**
 * A read-only signal whose value is automatically derived from one or more source signals.
 * Use `computed()` to create instances — do not instantiate directly.
 *
 * Call `dispose()` when the computed signal is no longer needed to remove all source subscriptions.
 */
export class ComputedSignal<T> extends SSignal<T> {
  #dispose: () => void;

  /** @internal */
  constructor(sources: SSignal<any>[], fn: (...values: any[]) => T) {
    const getValues = () => sources.map((s) => s.value);
    super(fn(...getValues()));

    const selfRef = new WeakRef(this);

    const unsubscribers = sources.map((s) =>
      s.subscribe(() => {
        const self = selfRef.deref();
        if (self) parentSetter.call(self, fn(...getValues()));
      })
    );

    this.#dispose = () => unsubscribers.forEach((u) => u());
    registry.register(this, this.#dispose, this);
  }

  override get value(): T {
    return super.value;
  }

  /**
   * @throws {TypeError} Always — computed signals are read-only.
   */
  override set value(_: never) {
    throw new TypeError('Cannot set the value of a computed signal. It is read-only.');
  }

  /**
   * Removes all subscriptions to source signals.
   * Call this when the computed signal is no longer needed to free memory.
   */
  dispose(): void {
    registry.unregister(this);
    this.#dispose();
  }
}

/**
 * Creates a read-only signal whose value is derived from a single source signal.
 *
 * @param source - The source signal to derive from.
 * @param fn - A function that receives the source value and returns the derived value.
 * @returns A `ComputedSignal` that updates whenever the source changes.
 *
 * @example
 * const count = new SSignal(5);
 * const doubled = computed(count, (n) => n * 2);
 * doubled.subscribe((v) => console.log(v)); // logs: 10
 * count.value = 10; // logs: 20
 */
export function computed<T, R>(source: SSignal<T>, fn: (value: T) => R): ComputedSignal<R>;

/**
 * Creates a read-only signal whose value is derived from multiple source signals.
 *
 * @param sources - Tuple of source signals to derive from.
 * @param fn - A function that receives the current values of all sources as a tuple.
 * @returns A `ComputedSignal` that updates whenever any source changes.
 *
 * @example
 * const price = new SSignal(100);
 * const qty   = new SSignal(3);
 * const total = computed([price, qty], ([p, q]) => p * q);
 * total.subscribe((v) => console.log(v)); // logs: 300
 * price.value = 200; // logs: 600
 */
export function computed<Sources extends readonly SSignal<any>[], R>(
  sources: [...Sources],
  fn: (values: ExtractValues<Sources>) => R
): ComputedSignal<R>;

export function computed<R>(
  sourceOrSources: SSignal<any> | SSignal<any>[],
  fn: (valueOrValues: any) => R
): ComputedSignal<R> {
  if (Array.isArray(sourceOrSources)) {
    return new ComputedSignal<R>(sourceOrSources, (...values: any[]) => fn(values));
  }
  return new ComputedSignal<R>([sourceOrSources], (v: any) => fn(v));
}
