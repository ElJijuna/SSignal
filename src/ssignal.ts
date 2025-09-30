export default class SSignal<T=unknown> extends EventTarget {
  #value: T;

  constructor(value: T) {
    super();
    this.#value = value;
  }

  get value() {
    return this.#value;
  }

  set value(newValue: T) {
    const nextValue = typeof newValue === 'function' ? newValue(this.#value) : newValue;

    if (nextValue === this.#value) {
      return;
    }

    this.#value = newValue;
    this.dispatchEvent(new CustomEvent<T>('change', { detail: this.#value }));
  }

  subscribe(callback: (value: CustomEvent<T>) => void) {
    this.addEventListener('change', (event) => callback(event as CustomEvent<T>));
  }
}