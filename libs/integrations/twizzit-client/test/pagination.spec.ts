import { paginate } from "../src/pagination";
import { TwizzitClientError } from "../src/errors";

describe("paginate", () => {
  const endpointLabel = "GET /test";

  it("returns all items from a single page", async () => {
    const fetchPage = jest.fn().mockResolvedValueOnce([1, 2, 3]);
    const result = await paginate({ fetchPage, endpointLabel, pageSize: 10 });
    expect(result).toEqual([1, 2, 3]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(0, 10);
  });

  it("loops multiple pages until exhausted", async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce([1, 2, 3])
      .mockResolvedValueOnce([4, 5, 6])
      .mockResolvedValueOnce([7]);
    const result = await paginate({ fetchPage, endpointLabel, pageSize: 3 });
    expect(result).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 3);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 3, 3);
    expect(fetchPage).toHaveBeenNthCalledWith(3, 6, 3);
  });

  it("terminates when page is shorter than pageSize", async () => {
    const fetchPage = jest.fn().mockResolvedValueOnce([1, 2]).mockResolvedValueOnce([3]);
    const result = await paginate({ fetchPage, endpointLabel, pageSize: 2 });
    expect(result).toEqual([1, 2, 3]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("terminates when page is empty", async () => {
    const fetchPage = jest.fn().mockResolvedValueOnce([1, 2]).mockResolvedValueOnce([]);
    const result = await paginate({ fetchPage, endpointLabel, pageSize: 2 });
    expect(result).toEqual([1, 2]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("truncates and logs a warning when maxPages is reached (no error thrown)", async () => {
    const fetchPage = jest.fn().mockResolvedValue([1, 2]);
    const warn = jest.fn();
    const logger = { debug: jest.fn(), info: jest.fn(), warn, error: jest.fn() };

    const result = await paginate({
      fetchPage,
      endpointLabel,
      pageSize: 2,
      maxPages: 2,
      logger,
    });

    // 2 pages fetched, each returning 2 items → 4 total.
    expect(result).toEqual([1, 2, 1, 2]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/maxPages reached/);
    expect(warn.mock.calls[0][1]).toMatchObject({ pages: 2, items: 4, maxPages: 2 });
  });

  it("with no maxPages, fetches until exhausted (federation full-sync mode)", async () => {
    // Simulate 5 full pages of 100 items, then an empty page → 500 items total.
    const FULL_PAGE = Array.from({ length: 100 }, (_, i) => i);
    let calls = 0;
    const fetchPage = jest.fn().mockImplementation(async () => {
      calls++;
      return calls <= 5 ? FULL_PAGE : [];
    });
    const result = await paginate({ fetchPage, endpointLabel, pageSize: 100 });
    expect(result).toHaveLength(500);
    expect(fetchPage).toHaveBeenCalledTimes(6); // 5 full + 1 empty
  });

  it("throws TwizzitClientError with subkind bad-pagination-arg for invalid pageSize", async () => {
    const fetchPage = jest.fn();
    try {
      await paginate({ fetchPage, endpointLabel, pageSize: 0 });
    } catch (err) {
      expect(err).toBeInstanceOf(TwizzitClientError);
      expect((err as TwizzitClientError).subkind).toBe("bad-pagination-arg");
    }
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it("uses default pageSize of 100 when not specified", async () => {
    const fetchPage = jest.fn().mockResolvedValueOnce([]);
    await paginate({ fetchPage, endpointLabel });
    expect(fetchPage).toHaveBeenCalledWith(0, 100);
  });

  it("forwards custom pageSize in limit param", async () => {
    const fetchPage = jest.fn().mockResolvedValueOnce([1, 2]);
    await paginate({ fetchPage, endpointLabel, pageSize: 50 });
    expect(fetchPage).toHaveBeenCalledWith(0, 50);
  });
});
