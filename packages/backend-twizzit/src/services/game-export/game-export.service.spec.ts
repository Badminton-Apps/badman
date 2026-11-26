import { alsoRunInTimezone } from "../../../../../jest.also-run-in-timezone";
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

  // Characterization (BAD-409): the export window for a season. Tests run with
  // TZ=Europe/Brussels, as production does, so 1 September 00:00 is 31 August
  // 22:00 UTC. These pin today's behaviour for the S3 groundwork.
  it("exports encounters from 1 September of the year up to and including 1 September of the next year", async () => {
    jest.spyOn(Club, "findByPk").mockResolvedValue({
      name: "Club 1",
      getTeams: jest.fn().mockResolvedValue([{ id: "team-1" }]),
    } as unknown as Club);
    const findAll = jest.spyOn(EncounterCompetition, "findAll").mockResolvedValue([]);

    await service.getGames(2026, "club-1");

    const [from, to] = (findAll.mock.calls[0][0] as { where: { date: Record<symbol, Date[]> } })
      .where.date[Op.between];
    expect(from.toISOString()).toBe("2026-08-31T22:00:00.000Z");
    expect(to.toISOString()).toBe("2027-08-31T22:00:00.000Z");
  });
});

// The season logic no longer depends on the server timezone (BAD-391).
alsoRunInTimezone(__filename, "UTC");
