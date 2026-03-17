/**
 * Unit tests for selectors.ts (waitForSelector, waitForSelectors, querySelectorAll, etc.).
 * Page and ElementHandle are mocked; no real browser.
 */

import {
  waitForSelector,
  waitForSelectors,
  querySelectorAll,
  querySelectorsAll,
  waitForFunction,
  disposeElement,
} from "../selectors";

function makeMockElementHandle(overrides: Partial<{ $: jest.Mock; $$: jest.Mock; evaluateHandle: jest.Mock; dispose: jest.Mock }> = {}) {
  return {
    $(selector: string) {
      return overrides.$?.(selector) ?? Promise.resolve(null);
    },
    $$: jest.fn().mockResolvedValue([]),
    evaluateHandle: jest.fn().mockImplementation((fn: (el: unknown) => unknown) => {
      const handle = { asElement: () => makeMockElementHandle() };
      return Promise.resolve(handle);
    }),
    dispose: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeMockPage(overrides: Partial<{ waitForSelector: jest.Mock; $$: jest.Mock }> = {}) {
  return {
    waitForSelector: jest.fn().mockResolvedValue(makeMockElementHandle()),
    $$: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("waitForSelector", () => {
  it("string selector: returns element when frame.waitForSelector resolves", async () => {
    const el = makeMockElementHandle();
    const frame = makeMockPage({ waitForSelector: jest.fn().mockResolvedValue(el) });

    const result = await waitForSelector("#foo", frame as never, 5000);

    expect(result).toBe(el);
    expect(frame.waitForSelector).toHaveBeenCalledWith("#foo", { timeout: 5000 });
  });

  it("string selector: throws when element not found", async () => {
    const frame = makeMockPage({ waitForSelector: jest.fn().mockResolvedValue(null) });

    await expect(waitForSelector("#missing", frame as never)).rejects.toThrow(
      "Could not find element: #missing"
    );
  });

  it("array selector: chains parts and returns last element (shadow DOM)", async () => {
    const inner = makeMockElementHandle();
    const outer = makeMockElementHandle({
      $: jest.fn().mockResolvedValue(inner),
      evaluateHandle: jest.fn().mockImplementation(function (this: ReturnType<typeof makeMockElementHandle>) {
        return Promise.resolve({ asElement: () => this });
      }),
    });
    (inner as ReturnType<typeof makeMockElementHandle>).evaluateHandle = jest
      .fn()
      .mockImplementation(function (this: ReturnType<typeof makeMockElementHandle>) {
        return Promise.resolve({ asElement: () => this });
      });
    const frame = makeMockPage({ waitForSelector: jest.fn().mockResolvedValue(outer) });

    const result = await waitForSelector(["#host", "#slot"], frame as never);

    expect(result).toBe(inner);
    expect(frame.waitForSelector).toHaveBeenCalledWith("#host", expect.any(Object));
    expect(outer.$).toHaveBeenCalledWith("#slot");
  });

  it("array selector: throws when a part returns null", async () => {
    const frame = makeMockPage({ waitForSelector: jest.fn().mockResolvedValue(null) });

    await expect(waitForSelector(["#a", "#b"], frame as never)).rejects.toThrow(
      "Could not find element: #a"
    );
  });
});

describe("waitForSelectors", () => {
  it("returns first selector that matches", async () => {
    const el = makeMockElementHandle();
    (el as ReturnType<typeof makeMockElementHandle>).evaluateHandle = jest
      .fn()
      .mockResolvedValue({ asElement: () => el });
    const frame = makeMockPage({
      waitForSelector: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(el),
    });

    const result = await waitForSelectors([["#first"], ["#second"]], frame as never);

    expect(result).toBe(el);
    expect(frame.waitForSelector).toHaveBeenCalledTimes(2);
    expect(frame.waitForSelector).toHaveBeenNthCalledWith(1, "#first", expect.any(Object));
    expect(frame.waitForSelector).toHaveBeenNthCalledWith(2, "#second", expect.any(Object));
  });

  it("throws when all selectors fail", async () => {
    const frame = makeMockPage({ waitForSelector: jest.fn().mockResolvedValue(null) });
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    await expect(
      waitForSelectors([["#a"], ["#b"]], frame as never)
    ).rejects.toThrow("Could not find element for selectors:");

    consoleSpy.mockRestore();
  });
});

describe("querySelectorAll", () => {
  it("string selector: returns elements from frame.$$", async () => {
    const el1 = makeMockElementHandle();
    const el2 = makeMockElementHandle();
    const frame = makeMockPage({ $$: jest.fn().mockResolvedValue([el1, el2]) });

    const result = await querySelectorAll(".item", frame as never);

    expect(result).toEqual([el1, el2]);
    expect(frame.$$).toHaveBeenCalledWith(".item");
    expect(el1.dispose).toHaveBeenCalled();
    expect(el2.dispose).toHaveBeenCalled();
  });

  it("string selector: returns empty array when no match", async () => {
    const frame = makeMockPage({ $$: jest.fn().mockResolvedValue([]) });

    const result = await querySelectorAll(".none", frame as never);

    expect(result).toEqual([]);
  });

  it("array selector: chains with shadow DOM and disposes", async () => {
    const inner = makeMockElementHandle();
    const outer = makeMockElementHandle({
      $$: jest.fn().mockResolvedValue([inner]),
      evaluateHandle: jest.fn().mockImplementation(function (this: ReturnType<typeof makeMockElementHandle>) {
        return Promise.resolve({ asElement: () => this });
      }),
    });
    (inner as ReturnType<typeof makeMockElementHandle>).evaluateHandle = jest
      .fn()
      .mockImplementation(function (this: ReturnType<typeof makeMockElementHandle>) {
        return Promise.resolve({ asElement: () => this });
      });
    const frame = makeMockPage({ $$: jest.fn().mockResolvedValue([outer]) });

    const result = await querySelectorAll(["#host", ".slot"], frame as never);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(inner);
    expect(inner.dispose).toHaveBeenCalled();
  });
});

describe("querySelectorsAll", () => {
  it("returns first selector that has matches", async () => {
    const el = makeMockElementHandle();
    const frame = makeMockPage({
      $$: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([el]),
    });

    const result = await querySelectorsAll([".empty", ".found"], frame as never);

    expect(result).toEqual([el]);
  });

  it("returns empty array when all selectors match nothing", async () => {
    const frame = makeMockPage({ $$: jest.fn().mockResolvedValue([]) });

    const result = await querySelectorsAll([".a", ".b"], frame as never);

    expect(result).toEqual([]);
  });
});

describe("waitForFunction", () => {
  it("resolves when fn returns truthy", async () => {
    const fn = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await waitForFunction(fn, 5000);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws when timeout is reached", async () => {
    const fn = jest.fn().mockResolvedValue(false);

    await expect(waitForFunction(fn, 50)).rejects.toThrow("Timed out");

    expect(fn).toHaveBeenCalled();
  }, 5000);
});

describe("disposeElement", () => {
  it("calls element.dispose() when element is truthy", async () => {
    const element = makeMockElementHandle();

    await disposeElement(element as never);

    expect(element.dispose).toHaveBeenCalled();
  });

  it("does not throw when element is null/undefined", async () => {
    await expect(disposeElement(null as never)).resolves.toBeUndefined();
  });
});
