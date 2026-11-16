import { Player } from "@badman/backend-database";
import { ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { ChangeTransferGuard } from "./change-transfer.guard";

describe("ChangeTransferGuard", () => {
  const guard = new ChangeTransferGuard();

  const contextFor = (user: unknown) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  const buildUser = (allowed: boolean) =>
    ({
      id: "user-uuid",
      hasAnyPermission: jest.fn().mockResolvedValue(allowed),
    }) as unknown as Player;

  it("rejects a request without a user", async () => {
    await expect(guard.canActivate(contextFor(undefined))).rejects.toThrow(UnauthorizedException);
  });

  it("rejects a token payload that did not resolve to a player", async () => {
    await expect(guard.canActivate(contextFor({ sub: "auth0|unknown" }))).rejects.toThrow(
      UnauthorizedException
    );
  });

  it("rejects a user without change:transfer", async () => {
    const user = buildUser(false);
    await expect(guard.canActivate(contextFor(user))).rejects.toThrow(ForbiddenException);
    expect(user.hasAnyPermission).toHaveBeenCalledWith(["change:transfer"]);
  });

  it("allows a user with change:transfer", async () => {
    await expect(guard.canActivate(contextFor(buildUser(true)))).resolves.toBe(true);
  });
});
