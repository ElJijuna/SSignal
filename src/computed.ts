import SSignal, { notify, type SSignalOptions } from './ssignal';

export type ExtractValues<T extends readonly SSignal<unknown>[]> = {
  [K in keyof T]: T[K] extends SSignal<infer V> ? V : never;
};

const parentValueDescriptor = Object.getOwnPropertyDescriptor(SSignal.prototype, 'value');

// Defensive: only reachable if SSignal loses its value setter.
/* istanbul ignore next */
if (!parentValueDescriptor?.set) {
  throw new TypeError('SSignal value setter is not available.');
}

const parentSetter = parentValueDescriptor.set as (this: SSignal<unknown>, value: unknown) => void;

/** @internal Whether a value is a reference that can be mutated in place. */
export const isObject = (value: unknown): value is object =>
  (typeof value === 'object' && value !== null) || typeof value === 'function';

const registry = new FinalizationRegistry<() => void>((dispose) => dispose());

/**
 * A read-only signal whose value is automatically derived from one or more source signals.
 * Use `computed()` to create instances — do not instantiate directly.
 *
 * While it has `change` listeners, the computed signal is kept alive by its sources, so
 * `computed(source, fn).subscribe(cb)` keeps working without holding a reference to it.
 *
 * Call `dispose()` when the computed signal is no longer needed to remove all source subscriptions.
 */
export class ComputedSignal<T> extends SSignal<T> {
  #dispose: () => void;
  #retainer: { self?: ComputedSignal<T> };
  #listeners = new Set<EventListenerOrEventListenerObject>();

  /** @internal */
  constructor(
    sourceList: readonly SSignal<unknown>[],
    fn: (...values: unknown[]) => T,
    options?: SSignalOptions<T>,
  ) {
    // Copied so later changes to the caller's array cannot desync values from subscriptions.
    const sources = [...sourceList];
    const getValues = () => sources.map((s) => s.value);
    // Last value seen from each source, to tell in-place mutations apart from replacements.
    const sourceValues = getValues();
    // Source values of the last computation. A notification that brings none new, such as the
    // second changed source of a batch() flush or the second path of a diamond, is skipped.
    let computedValues = sourceValues.slice();
    super(fn(...sourceValues), options);

    const selfRef = new WeakRef(this);
    // Holds a strong reference from the source subscriptions while this signal has listeners,
    // so an unreferenced but subscribed computed is not garbage collected. It is only filled in
    // from methods: a closure here capturing `this` would pin it through the shared scope.
    const retainer: { self?: ComputedSignal<T> } = {};

    const unsubscribers = sources.map((s, index) =>
      s.subscribe((value) => {
        // A change event carrying the same object means the source was mutated in place. A
        // primitive cannot be: the same one means it changed and was restored inside a batch().
        const mutatedInPlace = isObject(value) && Object.is(value, sourceValues[index]);
        sourceValues[index] = value;

        const self = retainer.self ?? selfRef.deref();
        // Collected but not finalized yet: the registry will unsubscribe shortly. Not reproducible in tests.
        /* istanbul ignore next */
        if (!self) {
          return;
        }

        const values = getValues();

        if (!mutatedInPlace && values.every((v, i) => Object.is(v, computedValues[i]))) {
          return;
        }

        computedValues = values;
        const nextValue = fn(...values);

        // The derived object may be (or be reachable from) what was mutated, so an equal
        // reference does not mean it is unchanged: notify instead of letting the setter skip it.
        if (mutatedInPlace && isObject(nextValue) && Object.is(nextValue, self.value)) {
          notify(self);
        } else {
          parentSetter.call(self, nextValue);
        }
      }),
    );

    this.#retainer = retainer;
    this.#dispose = () => {
      retainer.self = undefined;
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
    registry.register(this, this.#dispose, this);
  }

  override addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean,
  ): void {
    super.addEventListener(type, callback, options);

    if (type === 'change' && callback) {
      this.#listeners.add(callback);
      this.#retainer.self = this;
    }
  }

  override removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean,
  ): void {
    super.removeEventListener(type, callback, options);

    if (type === 'change' && callback && this.#listeners.delete(callback)) {
      this.#retainer.self = this.#listeners.size > 0 ? this : undefined;
    }
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
   * @throws {TypeError} Always — computed signals are read-only.
   */
  override mutate(_: never): never {
    throw new TypeError('Cannot mutate the value of a computed signal. It is read-only.');
  }

  /**
   * Removes all subscriptions to source signals and every `subscribe()`/`once()` listener of
   * this signal. Call this when the computed signal is no longer needed to free memory.
   * Also runs at the end of a `using` block.
   */
  override dispose(): void {
    registry.unregister(this);
    super.dispose();
    this.#listeners.clear();
    this.#dispose();
  }
}

/**
 * Creates a read-only signal whose value is derived from a single source signal.
 *
 * @param source - The source signal to derive from.
 * @param fn - A function that receives the source value and returns the derived value.
 * @param options.equals - Custom equality check for derived values. Defaults to `Object.is`.
 * @returns A `ComputedSignal` that updates whenever the source changes.
 *
 * @example
 * const count = new SSignal(5);
 * const doubled = computed(count, (n) => n * 2);
 * doubled.subscribe((v) => console.log(v), { immediate: true }); // logs: 10
 * count.value = 10; // logs: 20
 */
export function computed<T, R>(
  source: SSignal<T>,
  fn: (value: T) => R,
  options?: SSignalOptions<R>,
): ComputedSignal<R>;

/**
 * Creates a read-only signal whose value is derived from multiple source signals.
 *
 * @param sources - Tuple of source signals to derive from.
 * @param fn - A function that receives the current values of all sources as a tuple.
 * @param options.equals - Custom equality check for derived values. Defaults to `Object.is`.
 * @returns A `ComputedSignal` that updates whenever any source changes.
 *
 * @example
 * const price = new SSignal(100);
 * const qty   = new SSignal(3);
 * const total = computed([price, qty], ([p, q]) => p * q);
 * total.subscribe((v) => console.log(v), { immediate: true }); // logs: 300
 * price.value = 200; // logs: 600
 */
export function computed<Sources extends readonly SSignal<unknown>[], R>(
  sources: [...Sources],
  fn: (values: ExtractValues<Sources>) => R,
  options?: SSignalOptions<R>,
): ComputedSignal<R>;

export function computed<R>(
  sourceOrSources: SSignal<unknown> | readonly SSignal<unknown>[],
  fn: (...args: never[]) => R,
  options?: SSignalOptions<R>,
): ComputedSignal<R> {
  const computeValue = fn as (valueOrValues: unknown) => R;

  if (sourceOrSources instanceof SSignal) {
    return new ComputedSignal<R>([sourceOrSources], (v: unknown) => computeValue(v), options);
  }

  return new ComputedSignal<R>(
    sourceOrSources,
    (...values: unknown[]) => computeValue(values),
    options,
  );
}
