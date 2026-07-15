import { Test, TestingModule } from "@nestjs/testing";
import { Comment, EncounterCompetition, Player, Team } from "@badman/backend-database";
import { NotificationService } from "@badman/backend-notifications";
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
