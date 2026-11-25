import {
  Club,
  ClubPlayerMembership,
  DatabaseModule,
  Player,
  RankingSystem,
  SubEventCompetition,
  Team,
} from "@badman/backend-database";
import { SubEventTypeEnum } from "@badman/utils";
import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { EnrollmentValidationData } from "../../models";
import { IndexCalculationService } from "../index-calculation/index-calculation.service";
import { EnrollmentValidationService } from "./enrollment.service";
import { PlayerClubRule } from "./rules/player-club.rule";

/**
 * Characterization tests (BAD-409) for the season logic of enrollment
 * validation. They pin today's behaviour so the S3 groundwork (BAD-390/391)
 * can prove it changes nothing by accident. Tests run with TZ=Europe/Brussels,
 * as production does (jest.global-setup.js).
 */
const at = (iso: string) => new Date(iso);

describe("enrollment validation season handling (characterization)", () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [EnrollmentValidationService, IndexCalculationService],
      imports: [DatabaseModule, ConfigModule.forRoot({ envFilePath: ".env.test" })],
    }).compile();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("getValidationData without a season", () => {
    const validationDataAt = async (now: string) => {
      jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate"] }).setSystemTime(at(now));
      jest
        .spyOn(RankingSystem, "findByPk")
        .mockResolvedValue({ id: "system-1", amountOfLevels: 12 } as RankingSystem);
      jest.spyOn(Club, "findByPk").mockResolvedValue(new Club({ id: "club-1", name: "Club 1" }));
      const teamFindAll = jest.spyOn(Team, "findAll").mockResolvedValue([]);
      jest.spyOn(SubEventCompetition, "findAll").mockResolvedValue([]);
      jest.spyOn(Player, "findAll").mockResolvedValue([]);

      const data = await module.get(EnrollmentValidationService).getValidationData({
        clubId: "club-1",
        systemId: "system-1",
        teams: [
          { id: "team-1", name: "Team A", type: SubEventTypeEnum.M, teamNumber: 1, link: "link-1" },
        ],
      });

      const previousSeasonLookup = teamFindAll.mock.calls[0]?.[0] as {
        where: { season: number };
      };
      return { data, previousSeason: previousSeasonLookup?.where?.season };
    };

    it("uses season 2026 on 30 April 2027 and looks up last season's teams in 2025", async () => {
      const { data, previousSeason } = await validationDataAt("2027-04-30T12:00:00.000Z");
      expect(data.season).toBe(2026);
      expect(previousSeason).toBe(2025);
    });

    it("uses season 2027 from 1 May 2027 and looks up last season's teams in 2026", async () => {
      const { data, previousSeason } = await validationDataAt("2027-05-01T12:00:00.000Z");
      expect(data.season).toBe(2027);
      expect(previousSeason).toBe(2026);
    });
  });

  describe("PlayerClubRule: membership checked on 1 July of the season", () => {
    const CLUB = { id: "club-1", name: "Club 1" };

    const membership = (
      clubId: string,
      start: string,
      end?: string,
      confirmed = true
    ): ClubPlayerMembership =>
      new ClubPlayerMembership({
        clubId,
        playerId: "player-1",
        start: at(start),
        end: end ? at(end) : undefined,
        confirmed,
      });

    const validateWith = async (
      memberships: ClubPlayerMembership[],
      options: { loans?: string[]; transfers?: string[] } = {}
    ) => {
      const clubs = memberships.map((m) => ({
        id: m.clubId,
        name: m.clubId,
        ClubPlayerMembership: m,
      }));
      jest.spyOn(Player, "findAll").mockResolvedValue([
        {
          id: "player-1",
          fullName: "Player One",
          getClubs: jest.fn().mockResolvedValue(clubs),
        } as unknown as Player,
      ]);

      const [result] = await new PlayerClubRule().validate({
        club: CLUB,
        season: 2026,
        loans: options.loans ?? [],
        transfers: options.transfers ?? [],
        teams: [{ team: { id: "team-1" }, basePlayers: [{ id: "player-1" }] }],
      } as unknown as EnrollmentValidationData);

      return result.errors.map((e) => e.message);
    };

    const NONE = "all.v1.entryTeamDrawer.validation.errors.player-club-none";
    const OTHER = "all.v1.entryTeamDrawer.validation.errors.player-club";

    it("accepts a membership that starts exactly on 1 July 00:00", async () => {
      expect(await validateWith([membership("club-1", "2026-07-01T00:00:00.000+02:00")])).toEqual(
        []
      );
    });

    it("rejects a membership that starts 1 ms after 1 July 00:00", async () => {
      expect(await validateWith([membership("club-1", "2026-07-01T00:00:00.001+02:00")])).toEqual([
        NONE,
      ]);
    });

    it("rejects a membership that ends exactly on 1 July 00:00", async () => {
      expect(
        await validateWith([
          membership("club-1", "2020-07-01T00:00:00.000Z", "2026-07-01T00:00:00.000+02:00"),
        ])
      ).toEqual([NONE]);
    });

    it("accepts a membership that ends 1 ms after 1 July 00:00", async () => {
      expect(
        await validateWith([
          membership("club-1", "2020-07-01T00:00:00.000Z", "2026-07-01T00:00:00.001+02:00"),
        ])
      ).toEqual([]);
    });

    it("counts an unconfirmed membership", async () => {
      expect(
        await validateWith([
          membership("club-1", "2026-07-01T00:00:00.000+02:00", undefined, false),
        ])
      ).toEqual([]);
    });

    it("reports the other club when the player is only active elsewhere", async () => {
      expect(await validateWith([membership("club-2", "2020-07-01T00:00:00.000Z")])).toEqual([
        OTHER,
      ]);
    });

    it("accepts a player active elsewhere who is listed as a loan or transfer", async () => {
      const elsewhere = [membership("club-2", "2020-07-01T00:00:00.000Z")];
      expect(await validateWith(elsewhere, { loans: ["player-1"] })).toEqual([]);
      expect(await validateWith(elsewhere, { transfers: ["player-1"] })).toEqual([]);
    });
  });
});
