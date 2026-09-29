import { batch, computed, effect } from '../index';
import SSignal from '../ssignal';

describe('effect()', () => {
  it('should run immediately with the current value', () => {
    const count = new SSignal(1);
    const fn = jest.fn();

    effect(count, fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);
  });

  it('should run again on every change', () => {
    const count = new SSignal(1);
    const fn = jest.fn();
    effect(count, fn);

    count.value = 2;
    count.value = 3;

    expect(fn.mock.calls).toEqual([[1], [2], [3]]);
  });

  it('should receive the values of multiple sources as a tuple', () => {
    const price = new SSignal(100);
    const qty = new SSignal(2);
    const totals: number[] = [];

    effect([price, qty], ([p, q]) => {
      totals.push(p * q);
    });
    qty.value = 3;

    expect(totals).toEqual([200, 300]);
  });

  it('should run the cleanup before each re-run and on dispose', () => {
    const count = new SSignal(1);
    const log: string[] = [];

    const dispose = effect(count, (n) => {
      log.push(`run ${n}`);
      return () => log.push(`cleanup ${n}`);
    });
    count.value = 2;
    dispose();

    expect(log).toEqual(['run 1', 'cleanup 1', 'run 2', 'cleanup 2']);
  });

  it('should stop running after dispose, and dispose only once', () => {
    const count = new SSignal(1);
    const cleanup = jest.fn();
    const fn = jest.fn(() => cleanup);

    const dispose = effect(count, fn);
    dispose();
    dispose();
    count.value = 2;

    expect(fn).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('should dispose when the AbortSignal aborts', () => {
    const count = new SSignal(1);
    const controller = new AbortController();
    const cleanup = jest.fn();
    const fn = jest.fn(() => cleanup);

    effect(count, fn, { signal: controller.signal });
    controller.abort();
    count.value = 2;

    expect(fn).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('should release the abort listener when disposed manually', () => {
    const controller = new AbortController();
    const removeSpy = jest.spyOn(controller.signal, 'removeEventListener');

    const dispose = effect(new SSignal(1), () => {}, { signal: controller.signal });
    dispose();

    expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('should never run when the AbortSignal is already aborted', () => {
    const count = new SSignal(1);
    const controller = new AbortController();
    controller.abort();
    const fn = jest.fn();

    const dispose = effect(count, fn, { signal: controller.signal });
    count.value = 2;

    expect(fn).not.toHaveBeenCalled();
    expect(() => dispose()).not.toThrow();
  });

  it('should run once for several sources changed inside batch()', () => {
    const a = new SSignal(1);
    const b = new SSignal(2);
    const fn = jest.fn();
    effect([a, b], fn);

    batch(() => {
      a.value = 10;
      b.value = 20;
    });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith([10, 20]);
  });

  it('should run again after an in-place mutation of a source', () => {
    const list = new SSignal<number[]>([]);
    const lengths: number[] = [];
    effect(list, (items) => {
      lengths.push(items.length);
    });

    list.mutate((items) => items.push(1));

    expect(lengths).toEqual([0, 1]);
  });

  it('should follow a computed source', () => {
    const count = new SSignal(1);
    const doubled = computed(count, (n) => n * 2);
    const fn = jest.fn();
    effect(doubled, fn);

    count.value = 5;

    expect(fn).toHaveBeenLastCalledWith(10);
  });
});
