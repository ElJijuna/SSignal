import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { ComputedSignal, computed } from '../computed';
import SSignal from '../ssignal';

setFlagsFromString('--expose-gc');
const gc = runInNewContext('gc') as () => void;

// FinalizationRegistry callbacks run asynchronously, so give them a few turns after each collection.
const collectGarbage = async () => {
  for (let i = 0; i < 5; i++) {
    gc();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

describe('computed()', () => {
  it('should derive value from a single source', () => {
    const count = new SSignal(5);
    const doubled = computed(count, (n) => n * 2);

    expect(doubled.value).toBe(10);
  });

  it('should update when the source changes', () => {
    const count = new SSignal(1);
    const doubled = computed(count, (n) => n * 2);
    const callback = jest.fn();
    doubled.subscribe(callback);

    count.value = 3;

    expect(doubled.value).toBe(6);
    expect(callback).toHaveBeenCalledWith(6);
  });

  it('should derive value from multiple sources', () => {
    const price = new SSignal(100);
    const qty = new SSignal(3);
    const total = computed([price, qty], ([p, q]) => p * q);

    expect(total.value).toBe(300);
  });

  it('should update when any source in a multi-source computed changes', () => {
    const price = new SSignal(100);
    const qty = new SSignal(3);
    const total = computed([price, qty], ([p, q]) => p * q);
    const callback = jest.fn();
    total.subscribe(callback);

    price.value = 200;
    expect(total.value).toBe(600);
    expect(callback).toHaveBeenCalledWith(600);

    qty.value = 1;
    expect(total.value).toBe(200);
    expect(callback).toHaveBeenCalledWith(200);
  });

  it('should throw when trying to set value directly', () => {
    const count = new SSignal(1);
    const doubled = computed(count, (n) => n * 2);

    expect(() => {
      Object.getOwnPropertyDescriptor(ComputedSignal.prototype, 'value')?.set?.call(doubled, 99);
    }).toThrow(TypeError);
  });

  it('should throw when trying to mutate the value', () => {
    const list = new SSignal([1]);
    const copy = computed(list, (items) => [...items]);
    const asSignal: SSignal<number[]> = copy;

    expect(() => asSignal.mutate((items) => items.push(2))).toThrow(TypeError);
    expect(copy.value).toEqual([1]);
  });

  it('should be an instance of SSignal', () => {
    const count = new SSignal(0);
    const doubled = computed(count, (n) => n * 2);

    expect(doubled).toBeInstanceOf(SSignal);
    expect(doubled).toBeInstanceOf(ComputedSignal);
  });

  it('should stop updating after dispose()', () => {
    const count = new SSignal(1);
    const doubled = computed(count, (n) => n * 2);
    const callback = jest.fn();
    doubled.subscribe(callback);

    count.value = 2;
    expect(callback).toHaveBeenCalledTimes(1);

    doubled.dispose();
    count.value = 3;

    expect(callback).toHaveBeenCalledTimes(1);
    expect(doubled.value).toBe(4); // last computed value before dispose
  });

  it('should not dispatch when derived value does not change', () => {
    const count = new SSignal(2);
    const isEven = computed(count, (n) => n % 2 === 0);
    const callback = jest.fn();
    isEven.subscribe(callback);

    count.value = 4; // still even — no change
    expect(callback).not.toHaveBeenCalled();

    count.value = 3; // odd — changes
    expect(callback).toHaveBeenCalledWith(false);
  });

  it('should support subscribe with immediate option', () => {
    const count = new SSignal(7);
    const doubled = computed(count, (n) => n * 2);
    const callback = jest.fn();

    doubled.subscribe(callback, { immediate: true });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(14);
  });

  it('should not be affected by later changes to the sources array', () => {
    const a = new SSignal(1);
    const b = new SSignal(2);
    const sources: SSignal<number>[] = [a, b];
    const sum = computed(sources, (values) => values.reduce((acc, v) => acc + v, 0));

    sources.push(new SSignal(100));
    sources[0] = new SSignal(50);
    a.value = 10;

    expect(sum.value).toBe(12);
  });

  describe('in-place mutations of a source', () => {
    it('should notify when the derived value is the mutated source itself', () => {
      const list = new SSignal<number[]>([]);
      const same = computed(list, (items) => items);
      const callback = jest.fn();
      same.subscribe(callback);

      list.mutate((items) => items.push(1));

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([1]);
    });

    it('should notify when the derived value is a nested object mutated in place', () => {
      const state = new SSignal({ user: { name: 'Ana' } });
      const user = computed(state, (s) => s.user);
      const callback = jest.fn();
      user.subscribe(callback);

      state.mutate((s) => {
        s.user.name = 'Eva';
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ name: 'Eva' });
    });

    it('should propagate through a chain of computed signals', () => {
      const list = new SSignal<number[]>([]);
      const outer = computed(
        computed(list, (items) => items),
        (items) => items,
      );
      const callback = jest.fn();
      outer.subscribe(callback);

      list.mutate((items) => items.push(1));

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should notify for a multi-source computed when one source is mutated in place', () => {
      const list = new SSignal<number[]>([1]);
      const limit = new SSignal(10);
      const same = computed([list, limit], ([items]) => items);
      const callback = jest.fn();
      same.subscribe(callback);

      list.mutate((items) => items.push(2));

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should still skip primitive derived values that did not change', () => {
      const list = new SSignal<number[]>([1, 2]);
      const length = computed(list, (items) => items.length);
      const callback = jest.fn();
      length.subscribe(callback);

      list.mutate((items) => {
        items[0] = 5;
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should still skip an unchanged object when the source is replaced', () => {
      const state = new SSignal({ user: { name: 'Ana' }, count: 0 });
      const user = computed(state, (s) => s.user);
      const callback = jest.fn();
      user.subscribe(callback);

      state.value = (s) => ({ ...s, count: 1 });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should not notify when the mutation is skipped', () => {
      const list = new SSignal<number[]>([]);
      const same = computed(list, (items) => items);
      const callback = jest.fn();
      same.subscribe(callback);

      list.mutate(() => false);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('garbage collection', () => {
    it('should keep notifying a subscribed computed that is not referenced elsewhere', async () => {
      const count = new SSignal(1);
      const callback = jest.fn();
      computed(count, (n) => n * 2).subscribe(callback);

      await collectGarbage();
      count.value = 2;

      expect(callback).toHaveBeenCalledWith(4);
    });

    it('should keep a pending once() on an unreferenced computed alive', async () => {
      const count = new SSignal(1);
      const callback = jest.fn();
      computed(count, (n) => n * 2).once(callback);

      await collectGarbage();
      count.value = 2;

      expect(callback).toHaveBeenCalledWith(4);
    });

    it('should stay alive while at least one subscription remains', async () => {
      const count = new SSignal(1);
      const callback = jest.fn();

      (() => {
        const doubled = computed(count, (n) => n * 2);
        const unsubscribe = doubled.subscribe(() => {});
        doubled.subscribe(callback);
        unsubscribe();
      })();

      await collectGarbage();
      count.value = 2;

      expect(callback).toHaveBeenCalledWith(4);
    });

    it('should not be kept alive by listeners of other event types', async () => {
      const count = new SSignal(1);
      const listener = () => {};
      let ref: WeakRef<ComputedSignal<number>>;

      (() => {
        const doubled = computed(count, (n) => n * 2);
        doubled.addEventListener('other', listener);
        doubled.removeEventListener('other', listener);
        ref = new WeakRef(doubled);
      })();

      await collectGarbage();

      expect(ref?.deref()).toBeUndefined();
    });

    it('should allow collection once every subscription is removed', async () => {
      const count = new SSignal(1);
      let ref: WeakRef<ComputedSignal<number>>;

      (() => {
        const doubled = computed(count, (n) => n * 2);
        const unsubscribe = doubled.subscribe(() => {});
        unsubscribe();
        ref = new WeakRef(doubled);
      })();

      await collectGarbage();

      expect(ref?.deref()).toBeUndefined();
    });

    it('should allow collection after the subscription is aborted', async () => {
      const count = new SSignal(1);
      const controller = new AbortController();
      let ref: WeakRef<ComputedSignal<number>>;

      (() => {
        const doubled = computed(count, (n) => n * 2);
        doubled.subscribe(() => {}, { signal: controller.signal });
        ref = new WeakRef(doubled);
      })();

      controller.abort();
      await collectGarbage();

      expect(ref?.deref()).toBeUndefined();
    });

    it('should allow collection after dispose() even with active subscriptions', async () => {
      const count = new SSignal(1);
      let ref: WeakRef<ComputedSignal<number>>;

      (() => {
        const doubled = computed(count, (n) => n * 2);
        doubled.subscribe(() => {});
        doubled.dispose();
        ref = new WeakRef(doubled);
      })();

      await collectGarbage();

      expect(ref?.deref()).toBeUndefined();
    });
  });
});
