import { Test, TestingModule } from "@nestjs/testing";
import { Comment, EncounterCompetition, Player, Team } from "@badman/backend-database";
import { NotificationService } from "@badman/backend-notifications";
import { UnauthorizedException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";
import { PlayerLoaderService } from "../../loaders";
import { CommentResolver } from "./comment.resolver";

describe("CommentResolver", () => {
  let resolver: CommentResolver;
  let playerLoader: { load: jest.Mock };

  beforeEach(async () => {
    playerLoader = { load: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentResolver,
        {
          provide: Sequelize,
          useValue: {
            transaction: jest.fn().mockResolvedValue({
              commit: jest.fn(),
              rollback: jest.fn(),
            }),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            notifyEncounterChange: jest.fn(),
            notifyEncounterChangeMessage: jest.fn(),
          },
        },
        {
          provide: PlayerLoaderService,
          useValue: playerLoader,
        },
      ],
    }).compile();

    resolver = module.get<CommentResolver>(CommentResolver);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── encounterChangeComment notification routing ───────────────────────────

  describe("addComment — encounterChange linkType notification", () => {
    const homeClubId = "club-home";
    const awayClubId = "club-away";

    const buildSetup = (commentingClubId: string) => {
      const homeTeam = { id: "team-home", clubId: homeClubId } as unknown as Team;
      const awayTeam = { id: "team-away", clubId: awayClubId } as unknown as Team;
      const encounter = {
        id: "enc-1",
        getHome: jest.fn().mockResolvedValue(homeTeam),
        getAway: jest.fn().mockResolvedValue(awayTeam),
        addHomeCommentsChange: jest.fn().mockResolvedValue(undefined),
        addAwayCommentsChange: jest.fn().mockResolvedValue(undefined),
      } as unknown as EncounterCompetition;

      const comment = { clubId: commentingClubId, playerId: "player-1" } as unknown as Comment;
      const user = {
        id: "player-1",
        hasAnyPermission: jest.fn().mockResolvedValue(true),
      } as unknown as Player;

      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounter);

      return { encounter, comment, user };
    };

    it("calls notifyEncounterChangeMessage(encounter, true) when home club comments", async () => {
      const { encounter, comment, user } = buildSetup(homeClubId);
      const notificationService = resolver[
        "notificationService"
      ] as jest.Mocked<NotificationService>;

      await resolver["encounterChangeComment"](encounter, comment, user, {} as never);

      expect(notificationService.notifyEncounterChangeMessage).toHaveBeenCalledWith(
        encounter,
        true
      );
      expect(notificationService.notifyEncounterChange).not.toHaveBeenCalled();
    });

    it("calls notifyEncounterChangeMessage(encounter, false) when away club comments", async () => {
      const { encounter, comment, user } = buildSetup(awayClubId);
      const notificationService = resolver[
        "notificationService"
      ] as jest.Mocked<NotificationService>;

      await resolver["encounterChangeComment"](encounter, comment, user, {} as never);

      expect(notificationService.notifyEncounterChangeMessage).toHaveBeenCalledWith(
        encounter,
        false
      );
      expect(notificationService.notifyEncounterChange).not.toHaveBeenCalled();
    });
  });

  // ── comment side is scoped to the commenter's permission ──────────────────

  describe("addComment — permission is scoped to the commented side", () => {
    const homeTeam = { id: "team-home", clubId: "club-home" } as unknown as Team;
    const awayTeam = { id: "team-away", clubId: "club-away" } as unknown as Team;

    const buildEncounter = () =>
      ({
        id: "enc-1",
        gameLeaderId: "leader-1",
        getHome: jest.fn().mockResolvedValue(homeTeam),
        getAway: jest.fn().mockResolvedValue(awayTeam),
        addHomeComment: jest.fn(),
        addAwayComment: jest.fn(),
        addHomeCommentsChange: jest.fn(),
        addAwayCommentsChange: jest.fn(),
      }) as unknown as EncounterCompetition;

    // Only holds the home club's claim.
    const homeUser = {
      id: "player-1",
      hasAnyPermission: jest.fn(async (perms: string[]) =>
        perms.includes("club-home_change:encounter")
      ),
    } as unknown as Player;

    it.each(["encounterChangeComment", "encounterComment"] as const)(
      "%s rejects a home-club user posting on the away side",
      async (method) => {
        const encounter = buildEncounter();
        jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounter);
        const comment = { clubId: "club-away", playerId: "player-1" } as unknown as Comment;

        await expect(resolver[method](encounter, comment, homeUser, {} as never)).rejects.toThrow(
          UnauthorizedException
        );
        expect(encounter.addAwayComment).not.toHaveBeenCalled();
        expect(encounter.addAwayCommentsChange).not.toHaveBeenCalled();
      }
    );

    it("encounterComment still lets a home-club user post on the home side", async () => {
      const encounter = buildEncounter();
      jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(encounter);
      const comment = { clubId: "club-home", playerId: "player-1" } as unknown as Comment;

      await resolver["encounterComment"](encounter, comment, homeUser, {} as never);

      expect(encounter.addHomeComment).toHaveBeenCalledWith(comment, expect.any(Object));
    });
  });

  // ── player ResolveField ───────────────────────────────────────────────────

  describe("player", () => {
    it("calls playerLoader.load with comment.playerId", async () => {
      const comment = { playerId: "p1" } as unknown as Comment;
      const player = { id: "p1" } as unknown as Player;
      playerLoader.load.mockResolvedValue(player);

      const result = await resolver.player(comment);

      expect(playerLoader.load).toHaveBeenCalledWith("p1");
      expect(result).toBe(player);
    });

    it("returns null when playerId is null (anonymous comment)", async () => {
      const comment = { playerId: null } as unknown as Comment;
      playerLoader.load.mockResolvedValue(null);

      const result = await resolver.player(comment);

      expect(playerLoader.load).toHaveBeenCalledWith(null);
      expect(result).toBeNull();
    });

    it("returns null when playerId is undefined", async () => {
      const comment = { playerId: undefined } as unknown as Comment;
      playerLoader.load.mockResolvedValue(null);

      const result = await resolver.player(comment);

      expect(playerLoader.load).toHaveBeenCalledWith(undefined);
      expect(result).toBeNull();
    });

    it("batches N rows via a single playerLoader — no direct Player.findAll calls", async () => {
      const comments = Array.from({ length: 8 }, (_, i) => ({
        playerId: `p${i}`,
      })) as unknown as Comment[];

      const players = comments.map((c) => ({ id: c.playerId }) as unknown as Player);

      playerLoader.load.mockImplementation((id: string) =>
        Promise.resolve(players.find((p) => p.id === id) ?? null)
      );

      // Spy to confirm resolver does NOT call Player.findAll directly
      const findAllSpy = jest.spyOn(Player, "findAll").mockResolvedValue([]);

      const results = await Promise.all(comments.map((c) => resolver.player(c)));

      expect(results).toHaveLength(8);
      results.forEach((r, i) => expect(r?.id).toBe(`p${i}`));

      // Resolver must delegate to the loader, not call findAll directly
      expect(findAllSpy).not.toHaveBeenCalled();

      // load called once per comment (batching is internal to DataLoader)
      expect(playerLoader.load).toHaveBeenCalledTimes(8);
    });
  });
});
