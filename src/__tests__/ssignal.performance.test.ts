import SSignal from "../ssignal";

describe('SSignal Performance', () => {
  it('should be able to execute 200,000 value updates and notify 10 clients in less than 500 ms ', async () => {
    const iterations = 200_000;
    const listeners = 10;
    const signal = new SSignal(0);

    for (let i = 0; i < listeners; i++) {
      signal.subscribe(() => {});
    }

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      signal.value = i;
    }

    const executionTime = performance.now() - start;

    expect(executionTime).toBeLessThan(500);
  });
});