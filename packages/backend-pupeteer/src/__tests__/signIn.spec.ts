import { signIn } from "../signIn";
import { waitForSelectors } from "../selectors";

jest.mock("../selectors", () => ({
  waitForSelectors: jest.fn(),
}));

const waitForSelectorsMock = waitForSelectors as jest.Mock;

function makePage(url = "https://www.toernooi.nl/cookiewall/") {
  return {
    isClosed: jest.fn().mockReturnValue(false),
    url: jest.fn().mockReturnValue(url),
    goto: jest.fn().mockResolvedValue(undefined),
    waitForSelector: jest.fn(),
    waitForNavigation: jest.fn().mockResolvedValue(null),
  };
}

const loginElement = { click: jest.fn(), type: jest.fn() };

describe("signIn", () => {
  beforeEach(() => {
    waitForSelectorsMock.mockReset();
    loginElement.click.mockReset();
    loginElement.type.mockReset();
  });

  it("returns early when already signed in", async () => {
    const page = makePage();
    page.waitForSelector.mockResolvedValue({});

    await signIn({ page: page as never, timeout: 100 }, { username: "u", password: "p" });

    expect(waitForSelectorsMock).not.toHaveBeenCalled();
    expect(page.goto).not.toHaveBeenCalled();
  });

  it("recovers from a page without the login link by going to the homepage", async () => {
    const page = makePage();
    page.waitForSelector.mockRejectedValue(new Error("no profile menu"));
    waitForSelectorsMock
      .mockRejectedValueOnce(new Error("Waiting failed: 20000ms exceeded")) // stuck page
      .mockResolvedValue(loginElement); // homepage login link + form fields

    await signIn({ page: page as never, timeout: 100 }, { username: "u", password: "p" });

    expect(page.goto).toHaveBeenCalledWith("https://www.toernooi.nl/", expect.any(Object));
    expect(loginElement.click).toHaveBeenCalled();
    expect(loginElement.type).toHaveBeenCalledWith("u");
    expect(loginElement.type).toHaveBeenCalledWith("p");
  });

  it("skips login when the profile menu is present on the homepage", async () => {
    const page = makePage();
    page.waitForSelector
      .mockRejectedValueOnce(new Error("no profile menu")) // initial check
      .mockRejectedValueOnce(new Error("no profile menu")) // re-check on stuck page
      .mockResolvedValueOnce({}); // homepage
    waitForSelectorsMock.mockRejectedValueOnce(new Error("Waiting failed: 20000ms exceeded"));

    await signIn({ page: page as never, timeout: 100 }, { username: "u", password: "p" });

    expect(page.goto).toHaveBeenCalledTimes(1);
    expect(loginElement.click).not.toHaveBeenCalled();
  });

  it("throws naming the stuck URL when the homepage has no login link either", async () => {
    const page = makePage();
    page.waitForSelector.mockRejectedValue(new Error("no profile menu"));
    waitForSelectorsMock.mockRejectedValue(new Error("Waiting failed: 20000ms exceeded"));

    await expect(
      signIn({ page: page as never, timeout: 100 }, { username: "u", password: "p" })
    ).rejects.toThrow("Login button not found on https://www.toernooi.nl/cookiewall/");
  });
});
