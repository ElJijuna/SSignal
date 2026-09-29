import { computed } from '../computed';
import SSignal from '../ssignal';

describe('SSignal.dispose()', () => {
  it('should remove every subscribe() and once() listener', () => {
    const signal = new SSignal(0);
    const first = jest.fn();
    const second = jest.fn();
    const onceCallback = jest.fn();
    signal.subscribe(first);
    signal.subscribe(second, { signal: new AbortController().signal });
    signal.once(onceCallback);

    signal.dispose();
    signal.value = 1;

    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    expect(onceCallback).not.toHaveBeenCalled();
  });

  it('should release the abort listeners of disposed subscriptions', () => {
    const controller = new AbortController();
    const removeSpy = jest.spyOn(controller.signal, 'removeEventListener');
    const signal = new SSignal(0);
    signal.subscribe(() => {}, { signal: controller.signal });
    signal.once(() => {}, { signal: controller.signal });

    signal.dispose();

    expect(removeSpy).toHaveBeenCalledTimes(2);
    expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('should keep unsubscribe functions and aborts harmless after dispose', () => {
    const signal = new SSignal(0);
    const controller = new AbortController();
    const unsubscribe = signal.subscribe(() => {}, { signal: controller.signal });
    const cancelOnce = signal.once(() => {});

    signal.dispose();

    expect(() => {
      unsubscribe();
      cancelOnce();
      controller.abort();
      signal.dispose();
    }).not.toThrow();
  });

  it('should keep the signal usable after dispose', () => {
    const signal = new SSignal(0);
    signal.subscribe(() => {});
    signal.dispose();
    const callback = jest.fn();

    signal.subscribe(callback);
    signal.value = 1;

    expect(signal.value).toBe(1);
    expect(callback).toHaveBeenCalledWith(1);
  });

  it('should not track subscriptions that already ended', () => {
    const signal = new SSignal(0);
    const onceCallback = jest.fn();
    const unsubscribe = signal.subscribe(() => {});
    signal.once(onceCallback);

    unsubscribe();
    signal.value = 1;
    signal.dispose();

    expect(onceCallback).toHaveBeenCalledTimes(1);
  });

  it('should leave listeners added directly with addEventListener', () => {
    const signal = new SSignal(0);
    const listener = jest.fn();
    signal.addEventListener('change', listener);

    signal.dispose();
    signal.value = 1;

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should dispose with a using declaration', () => {
    const callback = jest.fn();
    let captured: SSignal<number> | undefined;

    {
      using signal = new SSignal(0);
      signal.subscribe(callback);
      captured = signal;
    }

    if (captured) {
      captured.value = 1;
    }
    expect(callback).not.toHaveBeenCalled();
  });

  it('should still load and dispose on runtimes without Symbol.dispose', async () => {
    const originalSymbol = globalThis.Symbol;
    // Symbol.dispose is non-configurable, so stand in a Symbol that lacks it while the module loads.
    globalThis.Symbol = Object.assign(
      (description?: string | number) => originalSymbol(description),
      { iterator: originalSymbol.iterator },
    ) as unknown as SymbolConstructor;

    let Isolated: typeof SSignal | undefined;
    try {
      await jest.isolateModulesAsync(async () => {
        Isolated = (await import('../ssignal')).default;
      });
    } finally {
      globalThis.Symbol = originalSymbol;
    }

    if (!Isolated) {
      throw new Error('ssignal module did not load');
    }

    const signal = new Isolated(0);
    const callback = jest.fn();
    signal.subscribe(callback);

    expect(Object.hasOwn(Isolated.prototype, Symbol.dispose)).toBe(false);
    signal.dispose();
    signal.value = 1;
    expect(callback).not.toHaveBeenCalled();
  });
});

describe('ComputedSignal.dispose()', () => {
  it('should remove its own subscribers as well as its source subscriptions', () => {
    const count = new SSignal(1);
    const doubled = computed(count, (n) => n * 2);
    const callback = jest.fn();
    doubled.subscribe(callback);

    doubled.dispose();
    doubled.dispatchEvent(new CustomEvent('change', { detail: 0 }));
    count.value = 2;

    expect(callback).not.toHaveBeenCalled();
    expect(doubled.value).toBe(2);
  });

  it('should dispose with a using declaration', () => {
    const count = new SSignal(1);
    const callback = jest.fn();

    {
      using doubled = computed(count, (n) => n * 2);
      doubled.subscribe(callback);
    }

    count.value = 2;
    expect(callback).not.toHaveBeenCalled();
  });
});
