import "reflect-metadata";
import { Player } from './player.model';

type MutablePlayer = Player & {
  getClaims: jest.Mock;
  getRoles: jest.Mock;
};

const makePlayer = (
  claimsImpl: () => unknown,
  rolesImpl: () => unknown = () => []
): MutablePlayer => {
  const player = Object.create(Player.prototype) as MutablePlayer;
  player.getClaims = jest.fn(claimsImpl as () => never);
  player.getRoles = jest.fn(rolesImpl as () => never);
  return player;
};

describe("Player.getPermissions — memoization", () => {
  it("loads claims and roles once across multiple getPermissions calls", async () => {
    const player = makePlayer(() => Promise.resolve([{ name: "edit:any" }]));

    const a = await player.getPermissions();
    const b = await player.getPermissions();
    const c = await player.getPermissions();

    expect(a).toEqual(["edit:any"]);
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(player.getClaims).toHaveBeenCalledTimes(1);
    expect(player.getRoles).toHaveBeenCalledTimes(1);
  });

  it("coalesces concurrent calls into a single load", async () => {
    const player = makePlayer(() => Promise.resolve([{ name: "a" }]));

    const [a, b, c] = await Promise.all([
      player.getPermissions(),
      player.getPermissions(),
      player.getPermissions(),
    ]);

    expect(a).toEqual(["a"]);
    expect(b).toEqual(["a"]);
    expect(c).toEqual(["a"]);
    expect(player.getClaims).toHaveBeenCalledTimes(1);
    expect(player.getRoles).toHaveBeenCalledTimes(1);
  });

  it("hasAnyPermission reuses the cached permission set", async () => {
    const player = makePlayer(() => Promise.resolve([{ name: "edit:player" }]));

    const r1 = await player.hasAnyPermission(["edit:player"]);
    const r2 = await player.hasAnyPermission(["edit:player"]);
    const r3 = await player.hasAnyPermission(["nope"]);

    expect(r1).toBe(true);
    expect(r2).toBe(true);
    expect(r3).toBe(false);
    expect(player.getClaims).toHaveBeenCalledTimes(1);
    expect(player.getRoles).toHaveBeenCalledTimes(1);
  });

  it("clears cache on failure so next call retries", async () => {
    const player = Object.create(Player.prototype) as MutablePlayer;
    player.getClaims = jest
      .fn()
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValueOnce([{ name: "ok" }]);
    player.getRoles = jest.fn().mockResolvedValue([]);

    await expect(player.getPermissions()).rejects.toThrow("db down");
    const result = await player.getPermissions();

    expect(result).toEqual(["ok"]);
    expect(player.getClaims).toHaveBeenCalledTimes(2);
  });
});
