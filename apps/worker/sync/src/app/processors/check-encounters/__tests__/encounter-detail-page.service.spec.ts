/**
 * Unit tests for EncounterDetailPageService (guard lifecycle and delegation).
 */

jest.mock("@badman/backend-pupeteer", () => ({
  getPage: jest.fn(),
  acceptCookies: jest.fn(),
  signIn: jest.fn(),
  createProtocolTimeoutGuard: jest.fn(),
}));

import { getPage, createProtocolTimeoutGuard } from "@badman/backend-pupeteer";
import { EncounterDetailPageService } from "../encounter-detail-page.service";

function makeFakePage(closed = false) {
  return {
    setDefaultTimeout: jest.fn(),
    setViewport: jest.fn().mockResolvedValue(undefined),
    isClosed: jest.fn().mockReturnValue(closed),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

describe("EncounterDetailPageService", () => {
  let service: EncounterDetailPageService;
  let mockGuard: { install: jest.Mock; remove: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGuard = { install: jest.fn(), remove: jest.fn() };
    (createProtocolTimeoutGuard as jest.Mock).mockReturnValue(mockGuard);
    service = new EncounterDetailPageService();
  });

  describe("open()", () => {
    it("calls getPage, installs protocol timeout guard, sets timeout and viewport", async () => {
      const fakePage = makeFakePage();
      (getPage as jest.Mock).mockResolvedValue(fakePage);

      await service.open();

      expect(getPage).toHaveBeenCalledWith();
      expect(mockGuard.install).toHaveBeenCalledTimes(1);
      expect(fakePage.setDefaultTimeout).toHaveBeenCalledWith(10000);
      expect(fakePage.setViewport).toHaveBeenCalledWith({ width: 1691, height: 1337 });
    });

    it("throws when getPage returns null", async () => {
      (getPage as jest.Mock).mockResolvedValue(null);

      await expect(service.open()).rejects.toThrow("Failed to create browser page");
      expect(mockGuard.install).not.toHaveBeenCalled();
    });
  });

  describe("close()", () => {
    it("removes guard then closes page when open", async () => {
      const fakePage = makeFakePage(false);
      (getPage as jest.Mock).mockResolvedValue(fakePage);
      await service.open();

      await service.close();

      expect(mockGuard.remove).toHaveBeenCalledTimes(1);
      expect(fakePage.close).toHaveBeenCalledTimes(1);
    });

    it("removes guard even when page already closed", async () => {
      const fakePage = makeFakePage(true);
      (getPage as jest.Mock).mockResolvedValue(fakePage);
      await service.open();

      await service.close();

      expect(mockGuard.remove).toHaveBeenCalledTimes(1);
      expect(fakePage.close).not.toHaveBeenCalled();
    });
  });
});
