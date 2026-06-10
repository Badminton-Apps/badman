import {
  Club,
  EventEntry,
  Location,
  Player,
  Team,
  TeamPlayerMembership,
} from "@badman/backend-database";
import { TeamAssociationService } from "./team-association.service";

describe("TeamAssociationService — request-scoped batching", () => {
  let service: TeamAssociationService;

  beforeEach(() => {
    service = new TeamAssociationService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("getCaptain: batches captainIds across teams into one Player.findAll", async () => {
    const findAll = jest
      .spyOn(Player, "findAll")
      .mockResolvedValue([{ id: "p1" } as Player, { id: "p2" } as Player]);

    const teams = [
      { id: "t1", captainId: "p1" } as Team,
      { id: "t2", captainId: "p2" } as Team,
      { id: "t3", captainId: "p1" } as Team, // duplicate id
    ];

    const results = await Promise.all(teams.map((t) => service.getCaptain(t)));

    expect(findAll).toHaveBeenCalledTimes(1);
    expect(results.map((r) => r?.id)).toEqual(["p1", "p2", "p1"]);
  });

  it("getCaptain: returns null when captainId is missing without querying", async () => {
    const findAll = jest.spyOn(Player, "findAll").mockResolvedValue([]);

    const result = await service.getCaptain({ id: "t1", captainId: undefined } as Team);

    expect(findAll).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("getCaptain: caches resolved ids so a second tick does not re-query", async () => {
    const findAll = jest.spyOn(Player, "findAll").mockResolvedValue([{ id: "p1" } as Player]);

    const team = { id: "t1", captainId: "p1" } as Team;

    await service.getCaptain(team);
    await service.getCaptain(team);

    expect(findAll).toHaveBeenCalledTimes(1);
  });

  it("getClub: batches by clubId", async () => {
    const findAll = jest.spyOn(Club, "findAll").mockResolvedValue([{ id: "c1" } as Club]);

    const teams = [
      { id: "t1", clubId: "c1" } as Team,
      { id: "t2", clubId: "c1" } as Team,
      { id: "t3", clubId: "c1" } as Team,
    ];

    const results = await Promise.all(teams.map((t) => service.getClub(t)));

    expect(findAll).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r?.id === "c1")).toBe(true);
  });

  it("getPrefferedLocation: batches by prefferedLocationId", async () => {
    const findAll = jest.spyOn(Location, "findAll").mockResolvedValue([{ id: "l1" } as Location]);

    const teams = [
      { id: "t1", prefferedLocationId: "l1" } as Team,
      { id: "t2", prefferedLocationId: "l1" } as Team,
    ];

    await Promise.all(teams.map((t) => service.getPrefferedLocation(t)));

    expect(findAll).toHaveBeenCalledTimes(1);
  });

  it("getEntry: batches by teamId and prefers entries with drawId", async () => {
    const findAll = jest
      .spyOn(EventEntry, "findAll")
      .mockResolvedValue([
        { teamId: "t1", drawId: null, id: "e1-no-draw" } as unknown as EventEntry,
        { teamId: "t1", drawId: "d1", id: "e1-with-draw" } as unknown as EventEntry,
        { teamId: "t2", drawId: null, id: "e2-fallback" } as unknown as EventEntry,
      ]);

    const [entry1, entry2] = await Promise.all([
      service.getEntry({ id: "t1" } as Team),
      service.getEntry({ id: "t2" } as Team),
    ]);

    expect(findAll).toHaveBeenCalledTimes(1);
    expect(entry1?.id).toBe("e1-with-draw");
    expect(entry2?.id).toBe("e2-fallback");
  });

  it("getPlayers: batches via Team M:N include and groups by teamId", async () => {
    const membership = { teamId: "t1" } as unknown as TeamPlayerMembership;
    const team1 = {
      id: "t1",
      players: [
        { id: "p1", TeamPlayerMembership: membership } as unknown as Player,
        { id: "p2" } as Player,
      ],
    };
    const team2 = {
      id: "t2",
      players: [{ id: "p3" } as Player],
    };
    const findAll = jest
      .spyOn(Team, "findAll")
      .mockResolvedValue([team1, team2] as unknown as Team[]);

    const [t1Players, t2Players] = await Promise.all([
      service.getPlayers({ id: "t1" } as Team),
      service.getPlayers({ id: "t2" } as Team),
    ]);

    expect(findAll).toHaveBeenCalledTimes(1);
    expect(t1Players.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(t2Players.map((p) => p.id)).toEqual(["p3"]);
    expect(
      (t1Players[0] as Player & { TeamPlayerMembership: TeamPlayerMembership }).TeamPlayerMembership
    ).toBe(membership);
  });
});
