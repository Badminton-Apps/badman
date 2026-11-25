import { Logging, Notification, NotificationOptionsTypes, Player } from "@badman/backend-database";
import { NotificationType } from "@badman/utils";
import { MailingService } from "@badman/backend-mailing";
import { Notifier } from "./notifier.base";
import { PushService } from "../services";

class TestNotifier extends Notifier<{ value: string }> {
  protected linkType = "encounterCompetition";
  protected type: keyof NotificationOptionsTypes = "encounterHasCommentNotification";
  protected override allowedThrottle = false;

  notifyPush = jest.fn().mockResolvedValue(undefined);
  notifyEmail = jest.fn().mockResolvedValue(undefined);
  notifySms = jest.fn().mockResolvedValue(undefined);
}

describe("Notifier (base)", () => {
  const buildPlayer = () =>
    ({
      id: "player-1",
      fullName: "Test Player",
      email: "player@test.be",
      getSetting: async () => ({
        encounterHasCommentNotification: NotificationType.EMAIL,
      }),
    }) as unknown as Player;

  let notifier: TestNotifier;
  let logAction: { meta: Record<string, unknown>; changed: jest.Mock; save: jest.Mock };

  beforeEach(() => {
    notifier = new TestNotifier({} as MailingService, {} as PushService);

    logAction = { meta: {}, changed: jest.fn(), save: jest.fn().mockResolvedValue(undefined) };
    jest.spyOn(Logging, "create").mockResolvedValue(logAction as never);
    jest.spyOn(Notification, "count").mockResolvedValue(1);
    jest.spyOn(Notification, "create").mockResolvedValue({ destroy: jest.fn() } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("skips the notification when the previous one has the same dedupe key", async () => {
    jest
      .spyOn(Notification, "findOne")
      .mockResolvedValue({ meta: JSON.stringify({ dedupeKey: "abc" }) } as never);

    await notifier.notify(buildPlayer(), "encounter-1", { value: "x" }, undefined, undefined, {
      dedupeKey: "abc",
    });

    expect(notifier.notifyEmail).not.toHaveBeenCalled();
    expect(logAction.meta["reason"]).toBe("Already sent for this content");
  });

  it("notifies again when the dedupe key changed", async () => {
    jest
      .spyOn(Notification, "findOne")
      .mockResolvedValue({ meta: JSON.stringify({ dedupeKey: "abc" }) } as never);

    await notifier.notify(buildPlayer(), "encounter-1", { value: "x" }, undefined, undefined, {
      dedupeKey: "def",
    });

    expect(notifier.notifyEmail).toHaveBeenCalledTimes(1);
  });

  it("notifies when there is no previous notification", async () => {
    jest.spyOn(Notification, "findOne").mockResolvedValue(null as never);

    await notifier.notify(buildPlayer(), "encounter-1", { value: "x" }, undefined, undefined, {
      dedupeKey: "abc",
    });

    expect(notifier.notifyEmail).toHaveBeenCalledTimes(1);
  });

  it("notifies when the stored meta cannot be parsed", async () => {
    jest.spyOn(Notification, "findOne").mockResolvedValue({ meta: "not json" } as never);

    await notifier.notify(buildPlayer(), "encounter-1", { value: "x" }, undefined, undefined, {
      dedupeKey: "abc",
    });

    expect(notifier.notifyEmail).toHaveBeenCalledTimes(1);
  });

  it("claims the content before sending, so an overlapping run sees it", async () => {
    jest.spyOn(Notification, "findOne").mockResolvedValue(null as never);
    const order: string[] = [];
    (Notification.create as jest.Mock).mockImplementation(async () => {
      order.push("save");
      return { destroy: jest.fn() };
    });
    notifier.notifyEmail.mockImplementation(async () => {
      order.push("email");
    });

    await notifier.notify(buildPlayer(), "encounter-1", { value: "x" }, undefined, undefined, {
      dedupeKey: "abc",
    });

    expect(order).toEqual(["save", "email"]);
  });

  it("releases the claim when every channel failed, so the next run retries", async () => {
    jest.spyOn(Notification, "findOne").mockResolvedValue(null as never);
    const destroy = jest.fn().mockResolvedValue(undefined);
    (Notification.create as jest.Mock).mockResolvedValue({ destroy });
    notifier.notifyEmail.mockRejectedValue(new Error("SMTP down"));

    await notifier.notify(buildPlayer(), "encounter-1", { value: "x" }, undefined, undefined, {
      dedupeKey: "abc",
    });

    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("keeps the claim when at least one channel delivered", async () => {
    jest.spyOn(Notification, "findOne").mockResolvedValue(null as never);
    const destroy = jest.fn().mockResolvedValue(undefined);
    (Notification.create as jest.Mock).mockResolvedValue({ destroy });
    const player = {
      ...buildPlayer(),
      getSetting: async () => ({
        encounterHasCommentNotification: NotificationType.EMAIL | NotificationType.PUSH,
      }),
    } as unknown as Player;
    notifier.notifyPush.mockRejectedValue(new Error("push expired"));

    await notifier.notify(player, "encounter-1", { value: "x" }, undefined, undefined, {
      dedupeKey: "abc",
    });

    expect(notifier.notifyEmail).toHaveBeenCalledTimes(1);
    expect(destroy).not.toHaveBeenCalled();
    expect(Notification.create).toHaveBeenCalledTimes(1);
  });

  it("without a dedupe key, still saves one record after sending even if sending failed", async () => {
    jest.spyOn(Notification, "findOne").mockResolvedValue(null as never);
    notifier.notifyEmail.mockRejectedValue(new Error("SMTP down"));

    await notifier.notify(buildPlayer(), "encounter-1", { value: "x" });

    expect(Notification.create).toHaveBeenCalledTimes(1);
  });

  it("notifies when no dedupe key is passed", async () => {
    jest
      .spyOn(Notification, "findOne")
      .mockResolvedValue({ meta: JSON.stringify({ dedupeKey: "abc" }) } as never);

    await notifier.notify(buildPlayer(), "encounter-1", { value: "x" });

    expect(notifier.notifyEmail).toHaveBeenCalledTimes(1);
  });
});
