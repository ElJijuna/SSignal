export default class SSignal<T = unknown> extends EventTarget {
  #value: T;

  constructor(value: T) {
    super();
    this.#value = value;
  }

  get value() {
    return this.#value;
  }

  set value(newValue: T) {
    const nextValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(this.#value) : newValue;

    if (Object.is(nextValue, this.#value)) {
      return;
    }

    this.#value = newValue;
    this.dispatchEvent(new CustomEvent<T>('change', { detail: this.#value }));
  }

  subscribe(callback: (value: T) => void) {
    const handler = (event: Event) => callback((event as CustomEvent<T>).detail);

    this.addEventListener('change', (event) => handler(event));
    return () => this.removeEventListener('change', handler);
  }
}