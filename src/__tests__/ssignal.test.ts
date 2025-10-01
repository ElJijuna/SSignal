import SSignal from '../ssignal';

describe('SSignal', () => {
  it('SSignal instance number', () => {
    const signal = new SSignal<number>(10);

    expect(signal.value).toBe(10);
  });

  it('SSignal instance function value', () => {
    const value = () => 66;
    const signal = new SSignal<any>(value);

    signal.value = value;

    expect(signal.value).toBe(value);
  });

  it('should call subscriptors when value has updated', () => {
    class Person {
      constructor(public name: string) { }
    }
    const person1 = new Person('Ivan');
    const person2 = new Person('Junior');
    const clientSubscriptor = jest.fn();
    const signal = new SSignal<unknown>(person1);

    signal.subscribe(clientSubscriptor);
    expect(signal.value).toStrictEqual(person1);

    signal.value = person2;
    signal.value = person2;

    expect(signal.value).toStrictEqual(person2);
    expect(clientSubscriptor).toHaveBeenCalledTimes(1);
  });

  it('should call subscriptors when value has updated', () => {
    const clientSubscriptor = jest.fn();
    const signal = new SSignal<number>(10);
    const unsubscritbe = signal.subscribe(clientSubscriptor);

    signal.value = 12;
    unsubscritbe();
    signal.value = 12;

    expect(clientSubscriptor).toHaveBeenCalledTimes(1);
  });
});