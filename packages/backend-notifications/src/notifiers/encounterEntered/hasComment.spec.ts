import { EncounterCompetition, Player } from "@badman/backend-database";
import { MailingService } from "@badman/backend-mailing";
import { PushService } from "../../services";
import { CompetitionEncounterHasCommentNotifier } from "./hasComment";

describe("CompetitionEncounterHasCommentNotifier push", () => {
  it("quotes the newest comment (toernooi.nl lists oldest first)", async () => {
    const push = { sendNotification: jest.fn().mockResolvedValue(undefined) };
    const notifier = new CompetitionEncounterHasCommentNotifier(
      {} as MailingService,
      push as unknown as PushService
    );
    const encounter = {
      home: { name: "Home 1G" },
      away: { name: "Away 2G" },
    } as EncounterCompetition;

    await notifier.notifyPush(
      { fullName: "Contact" } as Player,
      {
        encounter,
        comments: [
          { message: "Eerste", date: "za 4-9-2026 10:00" },
          { message: "Tweede", date: "zo 5-9-2026 11:00" },
        ],
      },
      { email: "contact@test.be", url: "https://www.toernooi.nl/sport/teammatch.aspx" }
    );

    const body = push.sendNotification.mock.calls[0][1].notification.body as string;
    expect(body).toContain("Tweede");
    expect(body).not.toContain("Eerste");
  });
});
