import { Club, EncounterCompetition } from "@badman/backend-database";
import { Test, TestingModule } from "@nestjs/testing";
import { Op } from "sequelize";
import { GameExportService } from "./game-export.service";

describe("GameExportService", () => {
  let service: GameExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameExportService],
    }).compile();

    service = module.get<GameExportService>(GameExportService);
  });

  afterEach(() => jest.restoreAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // Characterization (BAD-409): the export window for a season. TZ is pinned to
  // UTC by jest.global-setup.js. These pin today's behaviour for the S3 groundwork.
  it("exports encounters from 1 September of the year up to and including 1 September of the next year", async () => {
    jest.spyOn(Club, "findByPk").mockResolvedValue({
      name: "Club 1",
      getTeams: jest.fn().mockResolvedValue([{ id: "team-1" }]),
    } as unknown as Club);
    const findAll = jest.spyOn(EncounterCompetition, "findAll").mockResolvedValue([]);

    await service.getGames(2026, "club-1");

    const [from, to] = (findAll.mock.calls[0][0] as { where: { date: Record<symbol, Date[]> } })
      .where.date[Op.between];
    expect(from.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2027-09-01T00:00:00.000Z");
  });
});
