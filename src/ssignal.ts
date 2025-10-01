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

  subscribe(callback: (value: T) => void) {
    const handler = (event: Event) => callback((event as CustomEvent<T>).detail);

    this.addEventListener('change', (event) => handler(event));
    return () => this.removeEventListener('change', handler);
  }

  #Map(original: Map<any, any>): Map<any, any> {
    const self = this;

    return new Proxy(original, {
      get(target, prop, receiver) {
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