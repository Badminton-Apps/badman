import { enterEditMode } from "../enterEditMode";

const encounter = {
  visualCode: "106",
  drawCompetition: {
    subEventCompetition: { eventCompetition: { visualCode: "E0230E0A" } },
  },
} as never;

function makePage() {
  return {
    goto: jest.fn().mockResolvedValue(undefined),
    waitForSelector: jest.fn().mockResolvedValue({}),
    waitForNetworkIdle: jest.fn().mockResolvedValue(undefined),
  };
}

describe("enterEditMode", () => {
  it("opens the result page and waits for the form, not for network idle", async () => {
    const page = makePage();

    await enterEditMode({ page: page as never }, encounter);

    expect(page.goto).toHaveBeenCalledWith(
      "https://www.toernooi.nl/sport/matchresult.aspx?id=E0230E0A&match=106",
      expect.objectContaining({ waitUntil: "domcontentloaded" })
    );
    expect(page.waitForSelector).toHaveBeenCalledWith(
      'input[id^="match_"][id$="_set_1"]',
      expect.any(Object)
    );
  });

  it("carries on when the network never goes idle", async () => {
    const page = makePage();
    page.waitForNetworkIdle.mockRejectedValue(new Error("Timeout"));

    await expect(enterEditMode({ page: page as never }, encounter)).resolves.toBeUndefined();
  });

  it("fails when the form never appears", async () => {
    const page = makePage();
    page.waitForSelector.mockRejectedValue(new Error("Waiting for selector failed"));

    await expect(enterEditMode({ page: page as never }, encounter)).rejects.toThrow(
      "Waiting for selector failed"
    );
  });

  it("throws without a page", async () => {
    await expect(enterEditMode({ page: null }, encounter)).rejects.toThrow("No page provided");
  });
});
