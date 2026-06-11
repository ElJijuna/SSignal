import { ComputedSignal, computed } from '../computed';
import SSignal from '../ssignal';

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
});
