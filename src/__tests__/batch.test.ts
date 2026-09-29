import { batch, computed } from '../index';
import SSignal from '../ssignal';

describe('batch()', () => {
  it('should notify once with the final value', () => {
    const signal = new SSignal(0);
    const callback = jest.fn();
    signal.subscribe(callback);

    batch(() => {
      signal.value = 1;
      signal.value = 2;
      signal.value = 3;
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(3);
  });

  it('should defer notifications until the batch ends', () => {
    const signal = new SSignal(0);
    const callback = jest.fn();
    signal.subscribe(callback);

    batch(() => {
      signal.value = 1;
      expect(signal.value).toBe(1);
      expect(callback).not.toHaveBeenCalled();
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should return the value returned by the callback', () => {
    expect(batch(() => 42)).toBe(42);
  });

  it('should not notify when nothing changed', () => {
    const signal = new SSignal(0);
    const callback = jest.fn();
    signal.subscribe(callback);

    batch(() => {
      signal.value = 0;
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should fold mutate() and Map/Set changes into one event per signal', () => {
    const list = new SSignal<number[]>([]);
    const tags = new SSignal(new Set<string>());
    const listCallback = jest.fn();
    const tagsCallback = jest.fn();
    list.subscribe(listCallback);
    tags.subscribe(tagsCallback);

    batch(() => {
      list.mutate((items) => items.push(1));
      list.mutate((items) => items.push(2));
      tags.value.add('a');
      tags.value.add('b');
    });

    expect(listCallback).toHaveBeenCalledTimes(1);
    expect(listCallback).toHaveBeenCalledWith([1, 2]);
    expect(tagsCallback).toHaveBeenCalledTimes(1);
  });

  it('should only flush when the outermost batch ends', () => {
    const signal = new SSignal(0);
    const callback = jest.fn();
    signal.subscribe(callback);

    batch(() => {
      batch(() => {
        signal.value = 1;
      });
      expect(callback).not.toHaveBeenCalled();
      signal.value = 2;
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(2);
  });

  it('should update a computed with several changed sources only once', () => {
    const price = new SSignal(100);
    const qty = new SSignal(1);
    const total = computed([price, qty], ([p, q]) => p * q);
    const callback = jest.fn();
    total.subscribe(callback);

    batch(() => {
      price.value = 200;
      qty.value = 3;
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(600);
  });

  it('should not expose an inconsistent diamond value', () => {
    const count = new SSignal(1);
    const doubled = computed(count, (n) => n * 2);
    const sum = computed([count, doubled], ([c, d]) => c + d);
    const received: number[] = [];
    sum.subscribe((v) => received.push(v));

    batch(() => {
      count.value = 2;
    });

    expect(received).toEqual([6]);
  });

  it('should still flush pending notifications when the callback throws', () => {
    const signal = new SSignal(0);
    const callback = jest.fn();
    signal.subscribe(callback);

    expect(() =>
      batch(() => {
        signal.value = 1;
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(callback).toHaveBeenCalledWith(1);
  });

  it('should notify immediately again once the batch is over', () => {
    const signal = new SSignal(0);
    const callback = jest.fn();
    signal.subscribe(callback);

    batch(() => {
      signal.value = 1;
    });
    signal.value = 2;

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should notify every batched signal and rethrow the first flush error', () => {
    const looping = new SSignal(0);
    const other = new SSignal(0);
    const callback = jest.fn();
    looping.subscribe(() => {
      looping.value = (n) => n + 1;
    });
    other.subscribe(callback);

    expect(() =>
      batch(() => {
        looping.value = 1;
        other.value = 1;
      }),
    ).toThrow(/update loop/i);

    expect(callback).toHaveBeenCalledWith(1);
  });

  it('should rethrow only the first error when several signals fail to flush', () => {
    const first = new SSignal(0);
    const second = new SSignal(0);
    first.subscribe(() => {
      first.value = (n) => n + 1;
    });
    second.subscribe(() => {
      second.value = (n) => n + 1;
    });

    let thrown: unknown;
    try {
      batch(() => {
        first.value = 1;
        second.value = 1;
      });
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(first.value).toBeGreaterThan(1);
    expect(second.value).toBeGreaterThan(1);
  });
});

describe('batch() with computed signals', () => {
  it('should recompute an object-valued computed once when several sources change', () => {
    const price = new SSignal(100);
    const qty = new SSignal(1);
    const derive = jest.fn(([p, q]: [number, number]) => ({ total: p * q }));
    const order = computed([price, qty], derive);
    const callback = jest.fn();
    order.subscribe(callback);
    derive.mockClear();

    batch(() => {
      price.value = 200;
      qty.value = 3;
    });

    expect(derive).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ total: 600 });
  });

  it('should not recompute when a batch changes a source and restores it', () => {
    const count = new SSignal(1);
    const derive = jest.fn((n: number) => ({ n }));
    const wrapped = computed(count, derive);
    const callback = jest.fn();
    wrapped.subscribe(callback);
    derive.mockClear();

    batch(() => {
      count.value = 2;
      count.value = 1;
    });

    expect(derive).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
  });

  it('should still recompute for a source mutated in place inside the batch', () => {
    const items = new SSignal<number[]>([]);
    const label = new SSignal('items');
    const derive = jest.fn(([list, name]: [number[], string]) => `${name}: ${list.length}`);
    const summary = computed([items, label], derive);
    const callback = jest.fn();
    summary.subscribe(callback);

    batch(() => {
      items.mutate((list) => list.push(1, 2));
      label.value = 'rows';
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('rows: 2');
  });
});

describe('computed diamonds', () => {
  it('should recompute the join once per change, without batch()', () => {
    const count = new SSignal(1);
    const doubled = computed(count, (n) => n * 2);
    const derive = jest.fn(([c, d]: [number, number]) => ({ sum: c + d }));
    const sum = computed([count, doubled], derive);
    const received: Array<{ sum: number }> = [];
    sum.subscribe((value) => received.push(value));
    derive.mockClear();

    count.value = 2;

    expect(derive).toHaveBeenCalledTimes(1);
    expect(received).toEqual([{ sum: 6 }]);
  });
});
