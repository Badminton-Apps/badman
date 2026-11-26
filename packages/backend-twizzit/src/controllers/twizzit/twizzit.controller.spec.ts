import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { FastifyReply } from "fastify";
import { GameExportService } from "../../services";
import { TwizzitController } from "./twizzit.controller";

describe("TwizzitController", () => {
  let controller: TwizzitController;
  let gamesExport: jest.Mock;

  const reply = () =>
    ({
      header: jest.fn().mockReturnThis(),
      send: jest.fn(),
    }) as unknown as FastifyReply;

  beforeEach(async () => {
    gamesExport = jest.fn().mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwizzitController],
      providers: [{ provide: GameExportService, useValue: { gamesExport } }],
    }).compile();

    controller = module.get<TwizzitController>(TwizzitController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("passes the year as a number when the query string has it as text", async () => {
    // Fastify hands query parameters over as strings; there is no transform pipe.
    await controller.getTwizzitGames(reply(), { year: "2026", clubId: "club-1" });

    expect(gamesExport).toHaveBeenCalledWith(2026, "club-1");
  });

  it.each([["abc"], [""], ["  "], ["2026.5"], ["0x7EA"], ["1e3"], ["-5"], [" 2026 "], [undefined]])(
    "rejects year %p with a bad request",
    async (year) => {
      await expect(
        controller.getTwizzitGames(reply(), { year: year as string, clubId: "club-1" })
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(gamesExport).not.toHaveBeenCalled();
    }
  );
});
