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

    signal.value = ((prev: number): number => prev * 2) as any satisfies number;

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

    signal.value = (originalMap) as any satisfies Map<string, number>;

    expect((signal.value as any satisfies Map<string, number>).get('a')).toBe(1);
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

  it('should call subscriptors when value has updated', () => {
    const mockCallback = jest.fn();
    const signal = new SSignal<number>(10);
    const unsubscritbe = signal.subscribe(mockCallback);

    signal.value = 12;
    unsubscritbe();
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
});