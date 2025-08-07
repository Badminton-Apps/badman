import { EncounterCompetition, NotificationOptionsTypes, Player } from "@badman/backend-database";
import { Notifier } from "../notifier.base";
import { RequestOptions } from "web-push";
import { unitOfTime } from "moment";
export class CompetitionEncounterChangeConfirmationRequestNotifier extends Notifier<{
  encounter: EncounterCompetition;
  isHome: boolean;
  url: string;
}> {
  protected linkType = "encounterCompetition";
  protected type: keyof NotificationOptionsTypes = "encounterChangeConfirmationNotification";
  protected override allowedInterval: unitOfTime.Diff = "second";

  private readonly options = (encounter: EncounterCompetition) => {
    return {
      notification: {
        title: "Nieuwe aanvraag",
        body: `Er is een nieuwe aanvraag voor de ontmoeting tussen ${encounter.home?.name} en ${encounter.away?.name} `,
      },
    } as RequestOptions;
  };

  async notifyPush(
    player: Player,

    data: { encounter: EncounterCompetition; isHome: boolean; url: string },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args?: { email: string }
  ): Promise<void> {
    this.logger.debug(`Sending Push to ${player.fullName}`);
    await this.pushService.sendNotification(player, this.options(data.encounter));
  }

  async notifyEmail(
    player: Player,

    data: { encounter: EncounterCompetition; isHome: boolean; url: string },

    args?: { email: string }
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

    await this.mailing.sendConfirmationRequestMail(
      {
        fullName: player.fullName,
        email,
        slug: player.slug,
      },
      data.encounter,
      data.isHome,
      data.url
    );
  }

  notifySms(
    player: Player,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: { encounter: EncounterCompetition; isHome: boolean; url: string },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args?: { email: string }
  ): Promise<void> {
    this.logger.debug(`Sending Sms to ${player.fullName}`);
    return Promise.resolve();
  }
}
