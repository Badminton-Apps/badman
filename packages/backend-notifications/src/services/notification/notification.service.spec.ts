import { EncounterCompetition, Player, Team } from "@badman/backend-database";
import { EncounterValidationService } from "@badman/backend-change-encounter";
import { MailingService } from "@badman/backend-mailing";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { I18nService } from "nestjs-i18n";
import {
  CompetitionEncounterChangeConfirmationRequestNotifier,
  CompetitionEncounterHasCommentNotifier,
} from "../../notifiers";
import { PushService } from "../push";
import { NotificationService } from "./notification.service";

describe("NotificationService", () => {
  let service: NotificationService;

  const CLIENT_URL = "http://test-client";

  const buildPlayer = (email: string) =>
    ({ id: `player-${email}`, fullName: email, email }) as unknown as Player;

  const buildTeam = (id: string, clubId: string, captain?: Player, email?: string) =>
    ({
      id,
      clubId,
      name: `Team ${id}`,
      email: email ?? `${id}@club.be`,
      captain,
    }) as unknown as Team;

  const buildEncounter = (homeTeamId: string, awayTeamId: string) =>
    ({
      id: "enc-1",
      homeTeamId,
      awayTeamId,
    }) as unknown as EncounterCompetition;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: MailingService,
          useValue: {},
        },
        {
          provide: PushService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => (key === "CLIENT_URL" ? CLIENT_URL : undefined),
          },
        },
        {
          provide: EncounterValidationService,
          useValue: {},
        },
        {
          provide: I18nService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── _loadEncounterTeams ────────────────────────────────────────────────────

  describe("_loadEncounterTeams", () => {
    it("returns null when home team is not found", async () => {
      jest
        .spyOn(Team, "findByPk")
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({} as Team);
      const encounter = buildEncounter("home-id", "away-id");
      const result = await (service as any)._loadEncounterTeams(encounter);
      expect(result).toBeNull();
    });

    it("returns null when away team is not found", async () => {
      jest
        .spyOn(Team, "findByPk")
        .mockResolvedValueOnce({} as Team)
        .mockResolvedValueOnce(null);
      const encounter = buildEncounter("home-id", "away-id");
      const result = await (service as any)._loadEncounterTeams(encounter);
      expect(result).toBeNull();
    });

    it("sets encounter.home and encounter.away and returns both teams", async () => {
      const homeTeam = buildTeam("home", "club-h");
      const awayTeam = buildTeam("away", "club-a");
      jest.spyOn(Team, "findByPk").mockResolvedValueOnce(homeTeam).mockResolvedValueOnce(awayTeam);
      const encounter = buildEncounter("home-id", "away-id");

      const result = await (service as any)._loadEncounterTeams(encounter);

      expect(result).toEqual({ homeTeam, awayTeam });
      expect(encounter.home).toBe(homeTeam);
      expect(encounter.away).toBe(awayTeam);
    });
  });

  // ── notifyEncounterChange ─────────────────────────────────────────────────

  describe("notifyEncounterChange", () => {
    it("returns early when teams cannot be loaded", async () => {
      jest.spyOn(Team, "findByPk").mockResolvedValue(null);
      const notifySpy = jest.spyOn(
        CompetitionEncounterChangeConfirmationRequestNotifier.prototype,
        "notify"
      );

      await service.notifyEncounterChange(buildEncounter("h", "a"), true);

      expect(notifySpy).not.toHaveBeenCalled();
    });

    it("notifies the away captain when home team requests (homeTeamRequests=true)", async () => {
      const homeCaptain = buildPlayer("home@club.be");
      const awayCaptain = buildPlayer("away@club.be");
      const homeTeam = buildTeam("home", "club-h", homeCaptain);
      const awayTeam = buildTeam("away", "club-a", awayCaptain, "away@team.be");

      jest.spyOn(Team, "findByPk").mockResolvedValueOnce(homeTeam).mockResolvedValueOnce(awayTeam);

      const notifySpy = jest
        .spyOn(CompetitionEncounterChangeConfirmationRequestNotifier.prototype, "notify")
        .mockResolvedValue(undefined);

      const encounter = buildEncounter("home-id", "away-id");
      await service.notifyEncounterChange(encounter, true);

      expect(notifySpy).toHaveBeenCalledTimes(1);
      expect(notifySpy).toHaveBeenCalledWith(
        awayCaptain,
        encounter.id,
        expect.objectContaining({ isHome: false }),
        { email: "away@team.be" }
      );
    });

    it("notifies the home captain when away team requests (homeTeamRequests=false)", async () => {
      const homeCaptain = buildPlayer("home@club.be");
      const awayCaptain = buildPlayer("away@club.be");
      const homeTeam = buildTeam("home", "club-h", homeCaptain, "home@team.be");
      const awayTeam = buildTeam("away", "club-a", awayCaptain);

      jest.spyOn(Team, "findByPk").mockResolvedValueOnce(homeTeam).mockResolvedValueOnce(awayTeam);

      const notifySpy = jest
        .spyOn(CompetitionEncounterChangeConfirmationRequestNotifier.prototype, "notify")
        .mockResolvedValue(undefined);

      const encounter = buildEncounter("home-id", "away-id");
      await service.notifyEncounterChange(encounter, false);

      expect(notifySpy).toHaveBeenCalledTimes(1);
      expect(notifySpy).toHaveBeenCalledWith(
        homeCaptain,
        encounter.id,
        expect.objectContaining({ isHome: true }),
        { email: "home@team.be" }
      );
    });

    it("skips notification when opposing team has no captain", async () => {
      const homeTeam = buildTeam("home", "club-h", buildPlayer("home@club.be"));
      const awayTeam = buildTeam("away", "club-a", undefined); // no captain

      jest.spyOn(Team, "findByPk").mockResolvedValueOnce(homeTeam).mockResolvedValueOnce(awayTeam);

      const notifySpy = jest.spyOn(
        CompetitionEncounterChangeConfirmationRequestNotifier.prototype,
        "notify"
      );

      await service.notifyEncounterChange(buildEncounter("h", "a"), true);

      expect(notifySpy).not.toHaveBeenCalled();
    });

    it("still notifies (in-platform) when opposing team has no email", async () => {
      const homeTeam = buildTeam("home", "club-h", buildPlayer("home@club.be"));
      const awayCaptain = buildPlayer("away@club.be");
      const awayTeam = {
        ...buildTeam("away", "club-a", awayCaptain),
        email: undefined,
      } as unknown as Team;

      jest.spyOn(Team, "findByPk").mockResolvedValueOnce(homeTeam).mockResolvedValueOnce(awayTeam);

      const notifySpy = jest
        .spyOn(CompetitionEncounterChangeConfirmationRequestNotifier.prototype, "notify")
        .mockResolvedValue(undefined);

      await service.notifyEncounterChange(buildEncounter("h", "a"), true);

      expect(notifySpy).toHaveBeenCalledTimes(1);
      expect(notifySpy).toHaveBeenCalledWith(
        awayCaptain,
        "enc-1",
        expect.objectContaining({ isHome: false }),
        { email: "" }
      );
    });

    it("builds a CLIENT_URL-based URL for the opposing team", async () => {
      const homeTeam = buildTeam("home", "club-h", buildPlayer("home@club.be"));
      const awayCaptain = buildPlayer("away@club.be");
      const awayTeam = buildTeam("away", "club-a", awayCaptain, "away@team.be");
      awayTeam.clubId = "club-a";

      jest.spyOn(Team, "findByPk").mockResolvedValueOnce(homeTeam).mockResolvedValueOnce(awayTeam);

      const notifySpy = jest
        .spyOn(CompetitionEncounterChangeConfirmationRequestNotifier.prototype, "notify")
        .mockResolvedValue(undefined);

      const encounter = buildEncounter("home-id", "away-id");
      await service.notifyEncounterChange(encounter, true);

      const callData = notifySpy.mock.calls[0][2] as { url: string };
      expect(callData.url).toBe(`${CLIENT_URL}/my-club/club-a/change-encounter/enc-1`);
    });
  });

  // ── notifyEncounterChangeMessage ──────────────────────────────────────────

  describe("notifyEncounterChangeMessage", () => {
    it("returns early when teams cannot be loaded", async () => {
      jest.spyOn(Team, "findByPk").mockResolvedValue(null);
      const notifySpy = jest.spyOn(CompetitionEncounterHasCommentNotifier.prototype, "notify");

      await service.notifyEncounterChangeMessage(buildEncounter("h", "a"), true);

      expect(notifySpy).not.toHaveBeenCalled();
    });

    it("notifies the away captain when home club comments (isHomeCommenting=true)", async () => {
      const homeCaptain = buildPlayer("home@club.be");
      const awayCaptain = buildPlayer("away@club.be");
      const homeTeam = buildTeam("home", "club-h", homeCaptain);
      const awayTeam = buildTeam("away", "club-a", awayCaptain, "away@team.be");

      jest.spyOn(Team, "findByPk").mockResolvedValueOnce(homeTeam).mockResolvedValueOnce(awayTeam);

      const notifySpy = jest
        .spyOn(CompetitionEncounterHasCommentNotifier.prototype, "notify")
        .mockResolvedValue(undefined);

      const encounter = buildEncounter("home-id", "away-id");
      await service.notifyEncounterChangeMessage(encounter, true);

      expect(notifySpy).toHaveBeenCalledTimes(1);
      expect(notifySpy).toHaveBeenCalledWith(
        awayCaptain,
        encounter.id,
        expect.objectContaining({ encounter }),
        expect.objectContaining({ email: "away@team.be" })
      );
    });

    it("notifies the home captain when away club comments (isHomeCommenting=false)", async () => {
      const homeCaptain = buildPlayer("home@club.be");
      const awayCaptain = buildPlayer("away@club.be");
      const homeTeam = buildTeam("home", "club-h", homeCaptain, "home@team.be");
      const awayTeam = buildTeam("away", "club-a", awayCaptain);

      jest.spyOn(Team, "findByPk").mockResolvedValueOnce(homeTeam).mockResolvedValueOnce(awayTeam);

      const notifySpy = jest
        .spyOn(CompetitionEncounterHasCommentNotifier.prototype, "notify")
        .mockResolvedValue(undefined);

      const encounter = buildEncounter("home-id", "away-id");
      await service.notifyEncounterChangeMessage(encounter, false);

      expect(notifySpy).toHaveBeenCalledTimes(1);
      expect(notifySpy).toHaveBeenCalledWith(
        homeCaptain,
        encounter.id,
        expect.objectContaining({ encounter }),
        expect.objectContaining({ email: "home@team.be" })
      );
    });

    it("skips notification when opposing team has no captain", async () => {
      const homeTeam = buildTeam("home", "club-h", buildPlayer("home@club.be"));
      const awayTeam = buildTeam("away", "club-a", undefined);

      jest.spyOn(Team, "findByPk").mockResolvedValueOnce(homeTeam).mockResolvedValueOnce(awayTeam);

      const notifySpy = jest.spyOn(CompetitionEncounterHasCommentNotifier.prototype, "notify");

      await service.notifyEncounterChangeMessage(buildEncounter("h", "a"), true);

      expect(notifySpy).not.toHaveBeenCalled();
    });

    it("still notifies (in-platform) when opposing team has no email", async () => {
      const homeTeam = buildTeam("home", "club-h", buildPlayer("home@club.be"));
      const awayCaptain = buildPlayer("away@club.be");
      const awayTeam = {
        ...buildTeam("away", "club-a", awayCaptain),
        email: undefined,
      } as unknown as Team;

      jest.spyOn(Team, "findByPk").mockResolvedValueOnce(homeTeam).mockResolvedValueOnce(awayTeam);

      const notifySpy = jest
        .spyOn(CompetitionEncounterHasCommentNotifier.prototype, "notify")
        .mockResolvedValue(undefined);

      await service.notifyEncounterChangeMessage(buildEncounter("h", "a"), true);

      expect(notifySpy).toHaveBeenCalledTimes(1);
      expect(notifySpy).toHaveBeenCalledWith(
        awayCaptain,
        "enc-1",
        expect.objectContaining({ encounter: expect.anything() }),
        expect.objectContaining({ email: "" })
      );
    });

    it("builds a CLIENT_URL-based URL for the opposing team", async () => {
      const homeTeam = buildTeam("home", "club-h", buildPlayer("home@club.be"));
      const awayCaptain = buildPlayer("away@club.be");
      const awayTeam = buildTeam("away", "club-a", awayCaptain, "away@team.be");
      awayTeam.clubId = "club-a";

      jest.spyOn(Team, "findByPk").mockResolvedValueOnce(homeTeam).mockResolvedValueOnce(awayTeam);

      const notifySpy = jest
        .spyOn(CompetitionEncounterHasCommentNotifier.prototype, "notify")
        .mockResolvedValue(undefined);

      const encounter = buildEncounter("home-id", "away-id");
      await service.notifyEncounterChangeMessage(encounter, true);

      const callArgs = notifySpy.mock.calls[0][3] as { url: string };
      expect(callArgs.url).toBe(`${CLIENT_URL}/my-club/club-a/change-encounter/enc-1`);
    });
  });
});
