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
    const originalMap = new Map([
      ['key1', 'value1'],
      ['key2', 'value2'],
    ]);
    const signalMap = new SSignal(originalMap);

    const entries = [...signalMap.value.entries()];
    expect(entries).toEqual([
      ['key1', 'value1'],
      ['key2', 'value2'],
    ]);
  });

  it('should call subscriptors when value has updated', () => {
    class Person {
      constructor(public name: string) {}
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

  it('should remove its abort listener when unsubscribed manually', () => {
    const signal = new SSignal<number>(0);
    const controller = new AbortController();
    const addSpy = jest.spyOn(controller.signal, 'addEventListener');
    const removeSpy = jest.spyOn(controller.signal, 'removeEventListener');

    const unsubscribe = signal.subscribe(jest.fn(), { signal: controller.signal });
    const abortListener = addSpy.mock.calls.find(([type]) => type === 'abort')?.[1];

    unsubscribe();

    expect(abortListener).toBeDefined();
    expect(removeSpy).toHaveBeenCalledWith('abort', abortListener);
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

  it('should initialize correctly with a Set and not fire on subscription', () => {
    const signal = new SSignal(new Set([1, 2, 3]));
    const callback = jest.fn();
    signal.subscribe(callback);

    expect(callback).not.toHaveBeenCalled();
    expect(signal.value.has(1)).toBe(true);
  });

  it('should update the value correctly when a Set is provided via setter', () => {
    const signal = new SSignal<unknown>(0);
    const callback = jest.fn();
    signal.subscribe(callback);

    signal.value = new Set(['a', 'b']) as unknown as number;

    expect(callback).toHaveBeenCalledTimes(1);
    expect((signal.value as unknown as Set<string>).has('a')).toBe(true);
  });

  it('should dispatch an event when modifying the wrapped Set', () => {
    const signal = new SSignal(new Set([1, 2]));
    const callback = jest.fn();
    signal.subscribe(callback);

    signal.value.add(3);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(signal.value.has(3)).toBe(true);

    signal.value.delete(1);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(signal.value.has(1)).toBe(false);

    signal.value.clear();
    expect(callback).toHaveBeenCalledTimes(3);
    expect(signal.value.size).toBe(0);
  });

  it('should correctly call native Set methods like forEach() and values()', () => {
    const signal = new SSignal(new Set(['x', 'y', 'z']));
    const collected: string[] = [];

    signal.value.forEach((v) => {
      collected.push(v);
    });
    expect(collected).toEqual(['x', 'y', 'z']);

    const values = [...signal.value.values()];
    expect(values).toEqual(['x', 'y', 'z']);
  });

  it('should wrap the new Set reactively when replacing a Set via setter', () => {
    const signal = new SSignal(new Set([1]));
    const callback = jest.fn();
    signal.subscribe(callback);

    signal.value = new Set([2, 3]);
    expect(callback).toHaveBeenCalledTimes(1);

    signal.value.add(4);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(signal.value.has(4)).toBe(true);
  });

  it('should dispatch an event for each chained Map.set() call', () => {
    const signal = new SSignal(new Map<string, number>());
    const callback = jest.fn();
    signal.subscribe(callback);

    const returned = signal.value.set('a', 1).set('b', 2);

    expect(callback).toHaveBeenCalledTimes(2);
    expect(returned).toBe(signal.value);
    expect(signal.value.get('b')).toBe(2);
  });

  it('should dispatch an event for each chained Set.add() call', () => {
    const signal = new SSignal(new Set<number>());
    const callback = jest.fn();
    signal.subscribe(callback);

    const returned = signal.value.add(1).add(2);

    expect(callback).toHaveBeenCalledTimes(2);
    expect(returned).toBe(signal.value);
    expect(signal.value.has(2)).toBe(true);
  });

  it('should not dispatch when a Map mutation leaves the Map unchanged', () => {
    const signal = new SSignal(new Map([['a', 1]]));
    const callback = jest.fn();
    signal.subscribe(callback);

    signal.value.set('a', 1);
    expect(signal.value.delete('missing')).toBe(false);
    expect(callback).not.toHaveBeenCalled();

    signal.value.set('a', 2);
    expect(callback).toHaveBeenCalledTimes(1);

    signal.value.clear();
    signal.value.clear();
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should not dispatch when a Set mutation leaves the Set unchanged', () => {
    const signal = new SSignal(new Set([1]));
    const callback = jest.fn();
    signal.subscribe(callback);

    signal.value.add(1);
    expect(signal.value.delete(2)).toBe(false);
    expect(callback).not.toHaveBeenCalled();

    signal.value.clear();
    signal.value.clear();
    expect(callback).toHaveBeenCalledTimes(1);
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

describe('SSignal.mutate()', () => {
  it('should dispatch once after mutating an array in place', () => {
    const original = [1];
    const signal = new SSignal(original);
    const callback = jest.fn();
    signal.subscribe(callback);

    signal.mutate((list) => {
      list.push(2);
      list.push(3);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([1, 2, 3]);
    expect(signal.value).toBe(original);
  });

  it('should dispatch after mutating an object property', () => {
    const signal = new SSignal({ name: 'Ana', age: 30 });
    const callback = jest.fn();
    signal.subscribe(callback);

    signal.mutate((user) => {
      user.name = 'Eva';
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(signal.value.name).toBe('Eva');
  });

  it('should not dispatch when the mutator returns false', () => {
    const signal = new SSignal([1, 2]);
    const callback = jest.fn();
    signal.subscribe(callback);

    signal.mutate((list) => {
      if (!list.includes(2)) {
        list.push(2);
        return;
      }

      return false;
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should dispatch once for several Map/Set mutations inside mutate()', () => {
    const signal = new SSignal(new Map<string, number>());
    const callback = jest.fn();
    signal.subscribe(callback);

    signal.mutate((map) => {
      map.set('a', 1);
      map.set('b', 2);
      map.delete('a');
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect([...signal.value.keys()]).toEqual(['b']);

    signal.value.set('c', 3);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should dispatch once for nested mutate() calls', () => {
    const signal = new SSignal<number[]>([]);
    const callback = jest.fn();
    signal.subscribe(callback);

    signal.mutate((outer) => {
      outer.push(1);
      signal.mutate((inner) => {
        inner.push(2);
      });
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should still dispatch and rethrow when the mutator throws', () => {
    const signal = new SSignal<number[]>([]);
    const callback = jest.fn();
    signal.subscribe(callback);

    expect(() =>
      signal.mutate((list) => {
        list.push(1);
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([1]);

    signal.mutate((list) => {
      list.push(2);
    });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should keep structuredClone working on the value', () => {
    const signal = new SSignal({ items: [1] });

    signal.mutate((state) => {
      state.items.push(2);
    });

    expect(structuredClone(signal.value)).toEqual({ items: [1, 2] });
  });
});

describe('SSignal re-entrant updates', () => {
  it('should deliver the latest value last to every listener when a listener updates the signal', () => {
    const signal = new SSignal(0);
    const received: number[] = [];

    signal.subscribe((v) => {
      if (v === 1) {
        signal.value = 2;
      }
    });
    signal.subscribe((v) => received.push(v));

    signal.value = 1;

    expect(signal.value).toBe(2);
    expect(received).toEqual([1, 2]);
  });

  it('should coalesce several updates made during the same dispatch', () => {
    const signal = new SSignal(0);
    const received: number[] = [];

    signal.subscribe((v) => {
      if (v === 1) {
        signal.value = 2;
        signal.value = 3;
      }
    });
    signal.subscribe((v) => received.push(v));

    signal.value = 1;

    expect(received).toEqual([1, 3]);
  });

  it('should queue in-place mutations made during a dispatch', () => {
    const signal = new SSignal<number[]>([]);
    const lengths: number[] = [];

    signal.subscribe((items) => {
      if (items.length === 1) {
        signal.mutate((list) => list.push(2));
      }
    });
    signal.subscribe((items) => lengths.push(items.length));

    signal.mutate((list) => list.push(1));

    // Same array in both rounds: it already holds the queued push when the second listener reads it.
    expect(lengths).toEqual([2, 2]);
    expect(signal.value).toEqual([1, 2]);
  });

  it('should throw instead of looping forever when listeners keep updating the signal', () => {
    const signal = new SSignal(0);

    signal.subscribe(() => {
      signal.value = (n) => n + 1;
    });

    expect(() => {
      signal.value = 1;
    }).toThrow(/update loop/i);
  });

  it('should keep working after an update loop error', () => {
    const signal = new SSignal(0);
    let looping = true;
    const callback = jest.fn();

    signal.subscribe(() => {
      if (looping) {
        signal.value = (n) => n + 1;
      }
    });

    expect(() => {
      signal.value = 1;
    }).toThrow();

    looping = false;
    signal.subscribe(callback);
    signal.value = -1;

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(-1);
  });
});

describe('SSignal collection proxy methods', () => {
  it('should return the same function for repeated method reads', () => {
    const map = new SSignal(new Map<string, number>()).value;
    const set = new SSignal(new Set<string>()).value;

    expect(map.get).toBe(map.get);
    expect(map.set).toBe(map.set);
    expect(set.add).toBe(set.add);
    expect(set.has).toBe(set.has);
  });

  it('should keep cached mutating methods reactive when called detached', () => {
    const signal = new SSignal(new Set<string>());
    const callback = jest.fn();
    signal.subscribe(callback);

    const { add } = signal.value;
    add('a');
    add('b');

    expect(callback).toHaveBeenCalledTimes(2);
    expect([...signal.value]).toEqual(['a', 'b']);
  });
});

describe('SSignal already-aborted subscriptions', () => {
  it('should return a harmless unsubscribe from subscribe() and once()', () => {
    const signal = new SSignal(0);
    const controller = new AbortController();
    controller.abort();
    const callback = jest.fn();

    const unsubscribe = signal.subscribe(callback, { signal: controller.signal });
    const cancelOnce = signal.once(callback, { signal: controller.signal });

    expect(() => {
      unsubscribe();
      cancelOnce();
    }).not.toThrow();
    signal.value = 1;
    expect(callback).not.toHaveBeenCalled();
  });
});

describe('SSignal.once() with immediate', () => {
  it('should call the callback synchronously with the current value', () => {
    const signal = new SSignal(7);
    const callback = jest.fn();

    signal.once(callback, { immediate: true });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(7);
  });

  it('should count the immediate call as its only call', () => {
    const signal = new SSignal(0);
    const callback = jest.fn();

    signal.once(callback, { immediate: true });
    signal.value = 1;
    signal.value = 2;

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(0);
  });

  it('should leave no listener behind', () => {
    const signal = new SSignal(0);
    const addSpy = jest.spyOn(signal, 'addEventListener');
    const controller = new AbortController();
    const abortAddSpy = jest.spyOn(controller.signal, 'addEventListener');

    const unsubscribe = signal.once(() => {}, { immediate: true, signal: controller.signal });

    expect(addSpy).not.toHaveBeenCalled();
    expect(abortAddSpy).not.toHaveBeenCalled();
    expect(() => unsubscribe()).not.toThrow();
  });

  it('should not call the callback when the AbortSignal is already aborted', () => {
    const signal = new SSignal(0);
    const controller = new AbortController();
    controller.abort();
    const callback = jest.fn();

    signal.once(callback, { immediate: true, signal: controller.signal });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should wait for the next change when immediate is false', () => {
    const signal = new SSignal(0);
    const callback = jest.fn();

    signal.once(callback, { immediate: false });
    expect(callback).not.toHaveBeenCalled();

    signal.value = 1;
    expect(callback).toHaveBeenCalledWith(1);
  });
});
