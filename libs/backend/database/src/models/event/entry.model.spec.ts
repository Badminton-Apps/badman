import "reflect-metadata";
import { SaveOptions } from "sequelize";
import { EventEntry } from "./entry.model";

const PLAYER_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const ENTRY_UUID = "b1ffcd00-0d1c-5fg9-cc7e-7cc0ce491b23";
const SUBEVENT_UUID = "c2ggde11-1e2d-6gh0-dd8f-8dd1df502c34";

const makeInstance = (overrides?: {
  changed?: boolean;
  hasMeta?: boolean;
  team?: { type: string } | null;
  subEventId?: string;
}): EventEntry => {
  const opts = {
    changed: true,
    hasMeta: true,
    team: { type: "M" },
    subEventId: SUBEVENT_UUID,
    ...overrides,
  };
  return {
    id: ENTRY_UUID,
    changed: jest.fn().mockReturnValue(opts.changed),
    getTeam: jest.fn().mockResolvedValue(opts.team),
    subEventId: opts.subEventId,
    meta: opts.hasMeta
      ? {
          competition: {
            players: [{ id: PLAYER_UUID, single: 8, double: 8, mix: 12 }],
            teamIndex: 0,
          },
        }
      : null,
  } as unknown as EventEntry;
};

const makeService = (tag: "success" | "failure" = "success") => ({
  calculateOne: jest.fn().mockResolvedValue(
    tag === "success"
      ? {
          _tag: "success",
          index: 64,
          resolvedPlayers: [{ id: PLAYER_UUID, single: 8, double: 8, mix: 12 }],
        }
      : {
          _tag: "failure",
          error: { code: "PLAYER_NOT_FOUND", message: "player missing" },
        }
  ),
});

describe("EventEntry.recalculateCompetitionIndex", () => {
  afterEach(() => {
    EventEntry.setIndexCalculationService(null as never);
    jest.restoreAllMocks();
  });

  it("skips when meta has not changed", async () => {
    const svc = makeService();
    EventEntry.setIndexCalculationService(svc);
    const instance = makeInstance({ changed: false });

    await EventEntry.recalculateCompetitionIndex(instance, {} as SaveOptions);

    expect(svc.calculateOne).not.toHaveBeenCalled();
  });

  it("skips when meta has no competition block", async () => {
    const svc = makeService();
    EventEntry.setIndexCalculationService(svc);
    const instance = makeInstance({ hasMeta: false });

    await EventEntry.recalculateCompetitionIndex(instance, {} as SaveOptions);

    expect(svc.calculateOne).not.toHaveBeenCalled();
  });

  it("skips when team cannot be resolved", async () => {
    const svc = makeService();
    EventEntry.setIndexCalculationService(svc);
    const instance = makeInstance({ team: null });

    await EventEntry.recalculateCompetitionIndex(instance, {} as SaveOptions);

    expect(svc.calculateOne).not.toHaveBeenCalled();
  });

  it("throws when IndexCalculationService is not registered", async () => {
    const instance = makeInstance();

    await expect(
      EventEntry.recalculateCompetitionIndex(instance, {} as SaveOptions)
    ).rejects.toThrow("IndexCalculationService is not registered");
  });

  it("calls service.calculateOne once with correct shape on meta change", async () => {
    const svc = makeService();
    EventEntry.setIndexCalculationService(svc);
    const instance = makeInstance();
    const tx = { id: "tx-1" };

    await EventEntry.recalculateCompetitionIndex(instance, {
      transaction: tx,
    } as unknown as SaveOptions);

    expect(svc.calculateOne).toHaveBeenCalledTimes(1);
    expect(svc.calculateOne).toHaveBeenCalledWith(
      {
        key: ENTRY_UUID,
        type: "M",
        // `season` intentionally omitted — the service derives it from
        // SubEventCompetition.eventCompetition when subEventCompetitionId is set.
        subEventCompetitionId: SUBEVENT_UUID,
        players: [{ id: PLAYER_UUID }],
      },
      { transaction: tx, caller: "EventEntry.recalculateCompetitionIndex" }
    );
  });

  it("writes teamIndex from service result on success", async () => {
    EventEntry.setIndexCalculationService(makeService("success"));
    const instance = makeInstance();

    await EventEntry.recalculateCompetitionIndex(instance, {} as SaveOptions);

    expect(instance.meta!.competition!.teamIndex).toBe(64);
  });

  it("updates player ranking components from resolvedPlayers on success", async () => {
    const svc = {
      calculateOne: jest.fn().mockResolvedValue({
        _tag: "success",
        index: 32,
        resolvedPlayers: [{ id: PLAYER_UUID, single: 4, double: 4, mix: 6 }],
      }),
    };
    EventEntry.setIndexCalculationService(svc);
    const instance = makeInstance();

    await EventEntry.recalculateCompetitionIndex(instance, {} as SaveOptions);

    const player = instance.meta!.competition!.players![0];
    expect(player.single).toBe(4);
    expect(player.double).toBe(4);
    expect(player.mix).toBe(6);
  });

  it("throws when service returns a failure", async () => {
    EventEntry.setIndexCalculationService(makeService("failure"));
    const instance = makeInstance();

    await expect(
      EventEntry.recalculateCompetitionIndex(instance, {} as SaveOptions)
    ).rejects.toThrow("Index recalculation failed");
  });
});
