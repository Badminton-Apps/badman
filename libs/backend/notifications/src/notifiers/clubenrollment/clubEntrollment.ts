import {
  Club,
  Comment,
  Location,
  NotificationOptionsTypes,
  Player,
} from "@badman/backend-database";
import { RequestOptions } from "web-push";
import { Notifier } from "../notifier.base";
import { unitOfTime } from "moment";

export class ClubEnrollmentNotifier extends Notifier<
  {
    club: Club;
    locations: Location[];
    comments: Comment[];
  },
  {
    email: string;
    url: string;
  }
> {
  protected linkType = "club";
  protected type: keyof NotificationOptionsTypes = "clubEnrollmentNotification";
  protected override allowedInterval: unitOfTime.Diff = "minute";

  private readonly options = (club: Club) => {
    return {
      notification: {
        title: "Club Inschrijving",
        body: `De club ${club.name} heeft zich ingeschreven voor de competitie`,
      },
    } as RequestOptions;
  };

  async notifyPush(
    player: Player,
    data: { club: Club; locations: Location[]; comments: Comment[] }
  ): Promise<void> {
    this.logger.debug(`Sending Push to ${player.fullName}`);
    await this.pushService.sendNotification(player, this.options(data.club));
  }
  async notifyEmail(
    player: Player,
    data: { club: Club; locations: Location[]; comments: Comment[] },
    args?: { email: string; url: string }
  ): Promise<void> {
    this.logger.log(
      `[ClubEnrollmentNotifier] notifyEmail called — player: ${player.fullName} (${player.email}), target email: ${args?.email ?? "(none)"}`
    );

    const email = args?.email ?? player.email;

    if (!email) {
      this.logger.warn(
        `[ClubEnrollmentNotifier] Skipping email — no email address for player ${player.fullName} (id: ${player.id})`
      );
      return;
    }

    if (!player?.slug) {
      this.logger.warn(
        `[ClubEnrollmentNotifier] Skipping email — no slug for player ${player.fullName} (id: ${player.id})`
      );
      return;
    }

    this.logger.log(
      `[ClubEnrollmentNotifier] Sending enrollment email — to: ${email}, club: ${data.club.name}, locations: ${data.locations.length}, comments: ${data.comments.length}`
    );

    try {
      await this.mailing.sendEnrollmentMail(
        {
          fullName: player.fullName,
          email,
          slug: player.slug,
        },
        data.club,
        data.locations,
        data.comments
      );
      this.logger.log(
        `[ClubEnrollmentNotifier] Enrollment email sent successfully to ${email}`
      );
    } catch (e) {
      this.logger.error(
        `[ClubEnrollmentNotifier] Failed to send enrollment email to ${email}`,
        e
      );
      throw e;
    }
  }

  notifySms(
    player: Player,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: { club: Club; locations: Location[]; comments: Comment[] },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args?: { email: string }
  ): Promise<void> {
    this.logger.debug(`Sending Sms to ${player.fullName}`);
    return Promise.resolve();
  }
}
