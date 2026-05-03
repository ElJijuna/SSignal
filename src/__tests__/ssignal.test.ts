import SSignal from '../ssignal';

describe('SSignal', () => {
  it('should instance number', () => {
    const signal = new SSignal<number>(10);

    expect(signal.value).toBe(10);
  });

  it('should update the value correctly when a function is provided', () => {
    const signal = new SSignal<number>(5);
    const mockCallback = jest.fn();
    signal.subscribe(mockCallback);

    signal.value = (prev: number): number => prev * 2;

    expect(signal.value).toBe(10);
    expect(mockCallback).toHaveBeenCalledWith(10);
  });

  it('initialize correctly with a Map and reflect changes', () => {
    const mockCallback = jest.fn();
    const originalMap = new Map([['a', 1]]);
    const signal = new SSignal(originalMap);
    signal.subscribe(mockCallback);

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('should update the value correctly when a Map is provided', () => {
    const signal = new SSignal<number>(5);
    const originalMap = new Map([['a', 1]]);
    const mockCallback = jest.fn();
    signal.subscribe(mockCallback);

    signal.value = originalMap as unknown as number;

    expect((signal.value as unknown as Map<string, number>).get('a')).toBe(1);
    expect(mockCallback).toHaveReturnedTimes(1);
  });

  it('should dispatch an event when modifying the wrapped Map', () => {
    const signalMap = new SSignal(new Map([['a', 1]]));
    const mockCallback = jest.fn();
    signalMap.subscribe(mockCallback);

    signalMap.value.set('b', 2);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(signalMap.value.get('b')).toBe(2);

    signalMap.value.delete('a');
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(signalMap.value.has('a')).toBe(false);

    signalMap.value.clear();
    expect(mockCallback).toHaveBeenCalledTimes(3);
    expect(signalMap.value.size).toBe(0);
  });

  it('should correctly call native Map methods like entries()', () => {
    const originalMap = new Map([['key1', 'value1'], ['key2', 'value2']]);
    const signalMap = new SSignal(originalMap);

    const entries = [...signalMap.value.entries()];
    expect(entries).toEqual([['key1', 'value1'], ['key2', 'value2']]);
  });

  it('should call subscriptors when value has updated', () => {
    class Person {
      constructor(public name: string) { }
    }
    const person1 = new Person('Ivan');
    const person2 = new Person('Junior');
    const mockCallback = jest.fn();
    const signal = new SSignal<unknown>(person1);

    signal.subscribe(mockCallback);
    expect(signal.value).toStrictEqual(person1);

    signal.value = person2;
    signal.value = person2;

    expect(signal.value).toStrictEqual(person2);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('should stop notifying after unsubscribe', () => {
    const mockCallback = jest.fn();
    const signal = new SSignal<number>(10);
    const unsubscribe = signal.subscribe(mockCallback);

    signal.value = 12;
    unsubscribe();
    signal.value = 12;

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('should cancel the subscription when the abortcontroller is aborted', () => {
    const signal = new SSignal<number>(0);
    const controller = new AbortController();
    const callback = jest.fn();

    signal.subscribe(callback, { signal: controller.signal });
    signal.value = 1;

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(1);

    controller.abort();
    signal.value = 2;

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not subscribe if the signal is already aborted', () => {
    const signal = new SSignal<number>(0);
    const controller = new AbortController();
    controller.abort();
    const callback = jest.fn();

    signal.subscribe(callback, { signal: controller.signal });
    signal.value = 1;

    expect(callback).not.toHaveBeenCalled();
  });

  it('should fire callback immediately with current value when immediate is true', () => {
    const signal = new SSignal<number>(42);
    const callback = jest.fn();

    signal.subscribe(callback, { immediate: true });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(42);
  });

  it('should fire immediate callback and then continue receiving changes', () => {
    const signal = new SSignal<number>(1);
    const callback = jest.fn();

    signal.subscribe(callback, { immediate: true });
    signal.value = 2;
    signal.value = 3;

    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenNthCalledWith(1, 1);
    expect(callback).toHaveBeenNthCalledWith(2, 2);
    expect(callback).toHaveBeenNthCalledWith(3, 3);
  });

  it('should not fire immediately when immediate is false or omitted', () => {
    const signal = new SSignal<number>(10);
    const callback = jest.fn();

    signal.subscribe(callback);
    signal.subscribe(callback, { immediate: false });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should work with immediate and AbortSignal together', () => {
    const signal = new SSignal<number>(5);
    const controller = new AbortController();
    const callback = jest.fn();

    signal.subscribe(callback, { signal: controller.signal, immediate: true });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(5);

    controller.abort();
    signal.value = 99;

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not dispatch when a primitive value is set to the same value', () => {
    const signal = new SSignal<number>(5);
    const callback = jest.fn();
    signal.subscribe(callback);

    signal.value = 5;
    signal.value = 5;

    expect(callback).not.toHaveBeenCalled();
  });

  it('should notify all subscribers on change', () => {
    const signal = new SSignal<number>(0);
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    const cb3 = jest.fn();
    signal.subscribe(cb1);
    signal.subscribe(cb2);
    signal.subscribe(cb3);

    signal.value = 1;

    expect(cb1).toHaveBeenCalledWith(1);
    expect(cb2).toHaveBeenCalledWith(1);
    expect(cb3).toHaveBeenCalledWith(1);
  });

  it('should wrap the new Map reactively when replacing a Map via setter', () => {
    const signal = new SSignal(new Map([['a', 1]]));
    const callback = jest.fn();
    signal.subscribe(callback);

    signal.value = new Map([['b', 2]]);
    expect(callback).toHaveBeenCalledTimes(1);

    signal.value.set('c', 3);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(signal.value.get('c')).toBe(3);
  });

  it('should not dispatch when an updater function returns the same value', () => {
    const signal = new SSignal<number>(10);
    const callback = jest.fn();
    signal.subscribe(callback);

    signal.value = (prev) => prev;

    expect(callback).not.toHaveBeenCalled();
    expect(signal.value).toBe(10);
  });

  it('should be safe to call unsubscribe multiple times', () => {
    const signal = new SSignal<number>(0);
    const callback = jest.fn();
    const unsubscribe = signal.subscribe(callback);

    unsubscribe();
    unsubscribe();
    signal.value = 1;

    expect(callback).not.toHaveBeenCalled();
  });

  it('should fire a once callback exactly once on the next value change', () => {
    const signal = new SSignal<number>(0);
    const callback = jest.fn();

    signal.once(callback);
    signal.value = 1;
    signal.value = 2;

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(1);
  });

  it('should allow a once callback to be canceled before it fires', () => {
    const signal = new SSignal<number>(0);
    const callback = jest.fn();
    const unsubscribe = signal.once(callback);

    unsubscribe();
    signal.value = 1;

    expect(callback).not.toHaveBeenCalled();
  });

  it('should cancel a once callback when the abortcontroller is aborted', () => {
    const signal = new SSignal<number>(0);
    const controller = new AbortController();
    const callback = jest.fn();

    signal.once(callback, { signal: controller.signal });
    controller.abort();
    signal.value = 1;

    expect(callback).not.toHaveBeenCalled();
  });

  it('should not register a once callback if the signal is already aborted', () => {
    const signal = new SSignal<number>(0);
    const controller = new AbortController();
    const callback = jest.fn();
    controller.abort();

    signal.once(callback, { signal: controller.signal });
    signal.value = 1;

    expect(callback).not.toHaveBeenCalled();
  });

  it('should be safe to call a once unsubscribe multiple times', () => {
    const signal = new SSignal<number>(0);
    const callback = jest.fn();
    const unsubscribe = signal.once(callback);

    unsubscribe();
    unsubscribe();
    signal.value = 1;

    expect(callback).not.toHaveBeenCalled();
  });

  it('should unsubscribe a once callback before invoking it', () => {
    const signal = new SSignal<number>(0);
    const callback = jest.fn((value: number) => {
      if (value === 1) {
        signal.value = 2;
      }
    });

    signal.once(callback);
    signal.value = 1;

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(1);
    expect(signal.value).toBe(2);
  });
});
