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

  it("throws TwizzitClientError with subkind max-pages-exceeded when maxPages is reached", async () => {
    const fetchPage = jest.fn().mockResolvedValue([1, 2]);
    await expect(paginate({ fetchPage, endpointLabel, pageSize: 2, maxPages: 2 })).rejects.toThrow(
      TwizzitClientError
    );

    const fetchPage2 = jest.fn().mockResolvedValue([1, 2]);
    try {
      await paginate({ fetchPage: fetchPage2, endpointLabel, pageSize: 2, maxPages: 2 });
    } catch (err) {
      expect(err).toBeInstanceOf(TwizzitClientError);
      expect((err as TwizzitClientError).subkind).toBe("max-pages-exceeded");
    }
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
