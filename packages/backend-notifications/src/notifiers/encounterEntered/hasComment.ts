import { EncounterCompetition, NotificationOptionsTypes, Player } from "@badman/backend-database";
import { EncounterComment } from "@badman/utils";
import { Notifier } from "../notifier.base";
import * as webPush from "web-push";

export class CompetitionEncounterHasCommentNotifier extends Notifier<
  {
    encounter: EncounterCompetition;
    comments?: EncounterComment[];
  },
  {
    email: string;
    url: string;
    externalLink?: boolean;
  }
> {
  protected linkType = "encounterCompetition";
  protected type: keyof NotificationOptionsTypes = "encounterHasCommentNotification";
  protected override allowedThrottle = false;

  private readonly options = (
    url: string,
    encounter: EncounterCompetition,
    comments?: EncounterComment[]
  ) => {
    const comment = comments?.[0]?.message;

    return {
      notification: {
        title: "Opmerking geplaatst",
        body: comment
          ? `Ontmoeting ${encounter.home?.name} tegen ${encounter.away?.name}: ${comment}`
          : `Ontmoeting ${encounter.home?.name} tegen ${encounter.away?.name} heeft een opmerking`,
        actions: [{ action: "goto", title: "Ga naar wedstrijd" }],
        data: {
          onActionClick: {
            default: { operation: "openWindow", url: url },
            goto: { operation: "openWindow", url: url },
          },
        },
      },
    } as webPush.RequestOptions;
  };

  async notifyPush(
    player: Player,
    data: { encounter: EncounterCompetition; comments?: EncounterComment[] },
    args?: { email: string; url: string; externalLink?: boolean }
  ): Promise<void> {
    this.logger.debug(`Sending Push to ${player.fullName}`);
    if (!args?.url) {
      throw new Error("No url provided");
    }

    await this.pushService.sendNotification(
      player,
      this.options(args.url, data.encounter, data.comments)
    );
  }

  async notifyEmail(
    player: Player,
    data: { encounter: EncounterCompetition; comments?: EncounterComment[] },
    args?: { email: string; url: string; externalLink?: boolean }
  ): Promise<void> {
    this.logger.debug(`Sending Email to ${player.fullName}`);
    const email = args?.email ?? player.email;
    if (!email) {
      this.logger.debug(`No email found for ${player.fullName}`);
      return;
    }

    if (!player?.slug) {
      this.logger.debug(`No slug found for ${player.fullName}`);
      return;
    }

    if (!args?.url) {
      throw new Error("No url provided");
    }

    await this.mailing.sendHasCommentMail(
      {
        fullName: player.fullName,
        email,
        slug: player.slug,
      },
      data.encounter,
      args.url,
      data.comments,
      args.externalLink
    );
  }

  notifySms(
    player: Player,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: { encounter: EncounterCompetition; comments?: EncounterComment[] },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args?: { email: string; url?: string; externalLink?: boolean }
  ): Promise<void> {
    this.logger.debug(`Sending Sms to ${player.fullName}`);
    return Promise.resolve();
  }
}
