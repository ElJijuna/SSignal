import SSignal from '../ssignal';

describe('SSignal', () => {
  it('SSignal instance', () => {
    const signal = new SSignal(10);

    expect(signal.value).toBe(10);
  });

  it('should call subscriptors when value has updated', () => {
    const clientSubscriptor = jest.fn();
    const signal = new SSignal(10);

    signal.subscribe(clientSubscriptor);
    expect(signal.value).toBe(10);

    signal.value = 12;
    expect(clientSubscriptor).toHaveBeenCalledTimes(1);

    signal.value = 12;
    expect(clientSubscriptor).toHaveBeenCalledTimes(1);
  });
});