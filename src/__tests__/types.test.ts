import SSignal, {
  type OnceOptions,
  type SSignalOptions,
  type SubscribeOptions,
  type Unsubscribe,
} from '../index';

describe('exported types', () => {
  it('should type subscribe() options and its unsubscribe function', () => {
    const signal = new SSignal(0);
    const callback = jest.fn();
    const options: SubscribeOptions = { immediate: true, signal: new AbortController().signal };

    const unsubscribe: Unsubscribe = signal.subscribe(callback, options);
    unsubscribe();
    signal.value = 1;

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(0);
  });

  it('should type once() options and its unsubscribe function', () => {
    const signal = new SSignal(0);
    const callback = jest.fn();
    const options: OnceOptions = { signal: new AbortController().signal };

    const unsubscribe: Unsubscribe = signal.once(callback, options);
    unsubscribe();
    signal.value = 1;

    expect(callback).not.toHaveBeenCalled();
  });

  it('should type the constructor options', () => {
    const options: SSignalOptions<number> = { equals: (a, b) => Math.abs(a - b) < 1 };
    const signal = new SSignal(0, options);
    const callback = jest.fn();
    signal.subscribe(callback);

    signal.value = 0.5;

    expect(callback).not.toHaveBeenCalled();
  });
});
