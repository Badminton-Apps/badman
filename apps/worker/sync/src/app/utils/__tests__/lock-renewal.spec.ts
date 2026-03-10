import { startLockRenewal } from "../lock-renewal";

describe("startLockRenewal", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function mockJob() {
    return { extendLock: jest.fn().mockResolvedValue(undefined) } as unknown as import("bull").Job;
  }

  it("should call extendLock after the renewal interval (2 min)", () => {
    const job = mockJob();

    startLockRenewal(job);

    expect(job.extendLock).not.toHaveBeenCalled();

    jest.advanceTimersByTime(2 * 60 * 1000);

    expect(job.extendLock).toHaveBeenCalledTimes(1);
    expect(job.extendLock).toHaveBeenCalledWith(5 * 60 * 1000);
  });

  it("should call extendLock repeatedly on each interval", () => {
    const job = mockJob();

    startLockRenewal(job);

    jest.advanceTimersByTime(6 * 60 * 1000); // 3 intervals

    expect(job.extendLock).toHaveBeenCalledTimes(3);
  });

  it("should stop calling extendLock after stopRenewal is called", () => {
    const job = mockJob();

    const stopRenewal = startLockRenewal(job);

    jest.advanceTimersByTime(2 * 60 * 1000);
    expect(job.extendLock).toHaveBeenCalledTimes(1);

    stopRenewal();

    jest.advanceTimersByTime(4 * 60 * 1000);
    expect(job.extendLock).toHaveBeenCalledTimes(1); // no more calls
  });

  it("should silently ignore extendLock errors", () => {
    const job = mockJob();
    (job.extendLock as jest.Mock).mockRejectedValue(new Error("job completed"));

    startLockRenewal(job);

    // Should not throw
    expect(() => jest.advanceTimersByTime(2 * 60 * 1000)).not.toThrow();
  });
});
