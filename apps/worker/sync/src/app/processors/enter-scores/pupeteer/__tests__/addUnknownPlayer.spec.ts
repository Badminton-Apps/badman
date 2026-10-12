import { waitForSelectors } from "@badman/backend-pupeteer";
import { findPlayerSuggestion } from "../addUnknownPlayer";

jest.mock("@badman/backend-pupeteer", () => ({
  waitForSelectors: jest.fn(),
}));

const waitForSelectorsMock = waitForSelectors as jest.Mock;

function makePage(suggestion: unknown = { id: "suggestion" }) {
  const input = { click: jest.fn(), type: jest.fn() };
  const page = {
    $: jest.fn(async (selector: string) =>
      selector === "#playersuggest"
        ? input
        : selector === "#ulSearchSuggest li a"
          ? suggestion
          : null
    ),
    keyboard: { press: jest.fn() },
  };
  return { page, input };
}

describe("findPlayerSuggestion", () => {
  beforeEach(() => waitForSelectorsMock.mockReset());

  it("returns the suggestion on the first attempt", async () => {
    waitForSelectorsMock.mockResolvedValue({});
    const { page, input } = makePage();

    await expect(findPlayerSuggestion(page as never, "50081774")).resolves.toEqual({
      id: "suggestion",
    });
    expect(input.type).toHaveBeenCalledTimes(1);
    expect(input.type).toHaveBeenCalledWith("50081774", { delay: 50 });
  });

  it("clears the field and retypes when the first attempt shows no suggestion", async () => {
    waitForSelectorsMock
      .mockResolvedValueOnce({}) // #playersuggest
      .mockRejectedValueOnce(new Error("Waiting failed: 10000ms exceeded"))
      .mockResolvedValueOnce({});
    const { page, input } = makePage();

    await expect(findPlayerSuggestion(page as never, "50081774")).resolves.toBeDefined();
    expect(input.type).toHaveBeenCalledTimes(2);
    expect(input.click).toHaveBeenCalledWith({ clickCount: 3 });
    expect(page.keyboard.press).toHaveBeenCalledWith("Backspace");
  });

  it("throws an error naming the memberId after all attempts fail", async () => {
    waitForSelectorsMock
      .mockResolvedValueOnce({})
      .mockRejectedValue(new Error("Waiting failed: 10000ms exceeded"));
    const { page, input } = makePage();

    await expect(findPlayerSuggestion(page as never, "50081774")).rejects.toThrow(
      "TS returned no player suggestion for memberId 50081774 after 3 attempts"
    );
    expect(input.type).toHaveBeenCalledTimes(3);
  });
});
