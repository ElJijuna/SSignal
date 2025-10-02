export default class SSignal<T = unknown> extends EventTarget {
  #value: T;

  constructor(value: T) {
    super();

    if (value instanceof Map) {
      this.#value = this.#Map(value) as T;
    } else {
      this.#value = value;
    }
  }

  get value() {
    return this.#value;
  }

  set value(newValue: T) {
    const nextValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(this.#value) : newValue;

    if (Object.is(nextValue, this.#value)) {
      return;
    }

    this.#value = nextValue instanceof Map ? this.#Map(nextValue) as T : nextValue;
    this.dispatchEvent(new CustomEvent<T>('change', { detail: this.#value }));
  }

  subscribe(callback: (value: T) => void, options?: { signal?: AbortSignal }) {
    const handler = (event: Event) => callback((event as CustomEvent<T>).detail);
    this.addEventListener('change', handler);

    const unsubscribe = () => this.removeEventListener('change', handler);

    // Soporte para AbortSignal
    if (options?.signal) {
      if (options.signal.aborted) {
        unsubscribe();
      } else {
        const abortHandler = () => {
          unsubscribe();
          options.signal?.removeEventListener('abort', abortHandler);
        };
        options.signal.addEventListener('abort', abortHandler);
      }
    }

    return unsubscribe;
  }

  #Map(original: Map<any, any>): Map<any, any> {
    const self = this;

    return new Proxy(original, {
      get(target, prop) {
        const value = Reflect.get(target, prop);

        if (['set', 'delete', 'clear'].includes(String(prop))) {
          return function (...args: any[]) {
            const result = (target as any)[prop].apply(target, args);
            self.dispatchEvent(new CustomEvent<T>('change', { detail: self.#value }));

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