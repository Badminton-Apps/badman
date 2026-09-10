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
    jest.spyOn(Notification.prototype, "save").mockResolvedValue(undefined as never);
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

  it("notifies when no dedupe key is passed", async () => {
    jest
      .spyOn(Notification, "findOne")
      .mockResolvedValue({ meta: JSON.stringify({ dedupeKey: "abc" }) } as never);

    await notifier.notify(buildPlayer(), "encounter-1", { value: "x" });

    expect(notifier.notifyEmail).toHaveBeenCalledTimes(1);
  });
});
