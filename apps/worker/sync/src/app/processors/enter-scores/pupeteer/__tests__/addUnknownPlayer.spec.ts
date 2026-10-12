import { waitForSelectors } from "@badman/backend-pupeteer";
import { findPlayerSuggestion } from "../addUnknownPlayer";

jest.mock("@badman/backend-pupeteer", () => ({
  waitForSelectors: jest.fn(),
}));

const waitForSelectorsMock = waitForSelectors as jest.Mock;
const link = (text: string) => ({ text });

/** Each call to page.$$ returns the next list of suggestions (the last one repeats). */
function makePage(lists: { text: string }[][]) {
  const input = { click: jest.fn(), type: jest.fn() };
  let call = 0;
  const page = {
    $: jest.fn(async (selector: string) => (selector === "#playersuggest" ? input : null)),
    $$: jest.fn(async () => lists[Math.min(call++, lists.length - 1)]),
    evaluate: jest.fn(async (_fn: unknown, el: { text: string }) => el.text),
    keyboard: { press: jest.fn() },
  };
  return { page, input };
}

describe("findPlayerSuggestion", () => {
  beforeEach(() => waitForSelectorsMock.mockReset());

  it("returns the suggestion that shows the memberId", async () => {
    waitForSelectorsMock.mockResolvedValue({});
    const wanted = link("Soetemans, Nele (50081774)");
    const { page, input } = makePage([[wanted]]);

    await expect(findPlayerSuggestion(page as never, "50081774")).resolves.toBe(wanted);
    expect(input.type).toHaveBeenCalledWith("50081774", { delay: 50 });
  });

  it("picks the matching suggestion among several", async () => {
    waitForSelectorsMock.mockResolvedValue({});
    const wanted = link("Soetemans, Nele (50081774)");
    const { page } = makePage([[link("Peeters, Jan (50081700)"), wanted]]);

    await expect(findPlayerSuggestion(page as never, "50081774")).resolves.toBe(wanted);
  });

  it("does not match a longer memberId that contains the wanted one", async () => {
    waitForSelectorsMock.mockResolvedValue({});
    const wanted = link("Peeters, Jan (5012)");
    const { page } = makePage([[link("Soetemans, Nele (50123)"), wanted]]);

    await expect(findPlayerSuggestion(page as never, "5012")).resolves.toBe(wanted);
  });

  it("does not click a partial-match list that the autocomplete then replaces", async () => {
    waitForSelectorsMock.mockResolvedValue({});
    const wanted = link("Soetemans, Nele (50081774)");
    const { page } = makePage([[link("Peeters, Jan (5008)")], [wanted]]);

    await expect(findPlayerSuggestion(page as never, "50081774")).resolves.toBe(wanted);
  });

  it("uses a single suggestion without the memberId once the list is stable", async () => {
    waitForSelectorsMock.mockResolvedValue({});
    const only = link("Soetemans, Nele");
    const { page } = makePage([[only]]);

    await expect(findPlayerSuggestion(page as never, "50081774")).resolves.toBe(only);
  });

  it("never clicks an ambiguous list and fails with an error naming the memberId", async () => {
    waitForSelectorsMock.mockResolvedValue({});
    const { page, input } = makePage([[link("Peeters, Jan"), link("Janssens, An")]]);

    await expect(findPlayerSuggestion(page as never, "50081774")).rejects.toThrow(
      "TS returned no player suggestion for memberId 50081774 after 3 attempts"
    );
    expect(input.type).toHaveBeenCalledTimes(3);
  });

  it("clears the field and retypes when no suggestion appears", async () => {
    const wanted = link("Soetemans, Nele (50081774)");
    waitForSelectorsMock
      .mockResolvedValueOnce({}) // #playersuggest
      .mockRejectedValueOnce(new Error("Waiting failed: 10000ms exceeded"))
      .mockResolvedValueOnce({});
    const { page, input } = makePage([[wanted]]);

    await expect(findPlayerSuggestion(page as never, "50081774")).resolves.toBe(wanted);
    expect(input.type).toHaveBeenCalledTimes(2);
    expect(input.click).toHaveBeenCalledWith({ clickCount: 3 });
    expect(page.keyboard.press).toHaveBeenCalledWith("Backspace");
  });
});
