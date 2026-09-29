import { computed } from '../computed';
import SSignal from '../ssignal';

type Point = { x: number; y: number };
const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

describe('equals option', () => {
  describe('SSignal', () => {
    it('should skip the event when equals reports the values as equal', () => {
      const point = new SSignal<Point>({ x: 0, y: 0 }, { equals: samePoint });
      const callback = jest.fn();
      point.subscribe(callback);

      point.value = { x: 0, y: 0 };

      expect(callback).not.toHaveBeenCalled();
    });

    it('should keep the previous value when the update is skipped', () => {
      const initial = { x: 0, y: 0 };
      const point = new SSignal<Point>(initial, { equals: samePoint });

      point.value = { x: 0, y: 0 };

      expect(point.value).toBe(initial);
    });

    it('should notify when equals reports a difference', () => {
      const point = new SSignal<Point>({ x: 0, y: 0 }, { equals: samePoint });
      const callback = jest.fn();
      point.subscribe(callback);

      point.value = { x: 1, y: 0 };

      expect(callback).toHaveBeenCalledWith({ x: 1, y: 0 });
    });

    it('should call equals with the previous and next values', () => {
      const equals = jest.fn(() => false);
      const count = new SSignal(1, { equals });

      count.value = (n) => n + 1;

      expect(equals).toHaveBeenCalledWith(1, 2);
    });

    it('should always notify when equals returns false, even for the same value', () => {
      const count = new SSignal(1, { equals: () => false });
      const callback = jest.fn();
      count.subscribe(callback);

      count.value = 1;

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not consult equals for mutate()', () => {
      const equals = jest.fn(() => true);
      const list = new SSignal<number[]>([], { equals });
      const callback = jest.fn();
      list.subscribe(callback);

      list.mutate((items) => items.push(1));

      expect(equals).not.toHaveBeenCalled();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not consult equals for Map/Set mutations', () => {
      const equals = jest.fn(() => true);
      const tags = new SSignal(new Set<string>(), { equals });
      const callback = jest.fn();
      tags.subscribe(callback);

      tags.value.add('a');

      expect(equals).not.toHaveBeenCalled();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should default to Object.is', () => {
      const count = new SSignal(Number.NaN);
      const callback = jest.fn();
      count.subscribe(callback);

      count.value = Number.NaN;

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('computed()', () => {
    it('should skip a derived object equal to the previous one (single source)', () => {
      const x = new SSignal(1);
      const point = computed(x, (value) => ({ x: value > 0 ? 1 : -1, y: 0 }), {
        equals: samePoint,
      });
      const callback = jest.fn();
      point.subscribe(callback);

      x.value = 5;
      expect(callback).not.toHaveBeenCalled();

      x.value = -5;
      expect(callback).toHaveBeenCalledWith({ x: -1, y: 0 });
    });

    it('should skip a derived object equal to the previous one (multiple sources)', () => {
      const x = new SSignal(1);
      const y = new SSignal(2);
      const point = computed([x, y], ([a, b]) => ({ x: Math.sign(a), y: Math.sign(b) }), {
        equals: samePoint,
      });
      const callback = jest.fn();
      point.subscribe(callback);

      x.value = 10;
      y.value = 20;

      expect(callback).not.toHaveBeenCalled();
    });

    it('should still notify after an in-place mutation of a source', () => {
      const list = new SSignal<number[]>([]);
      const same = computed(list, (items) => items, { equals: () => true });
      const callback = jest.fn();
      same.subscribe(callback);

      list.mutate((items) => items.push(1));

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
