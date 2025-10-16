import { Player, Notification, NotificationOptionsTypes, Logging } from "@badman/backend-database";
import { MailingService } from "@badman/backend-mailing";
import { LoggingAction, NotificationType } from "@badman/utils";
import { Logger } from "@nestjs/common";
import { PushService } from "../services";
import { unitOfTime } from "moment";
import moment from "moment";

export abstract class Notifier<T, A = { email: string }> {
  protected readonly logger = new Logger(Notifier.name);
  protected abstract type: keyof NotificationOptionsTypes;
  protected abstract linkType: string;
  protected allowedInterval: unitOfTime.Diff = "day";
  protected allowedIntervalUnit = 1;
  protected allowedAmount?: number = undefined;

  constructor(
    protected mailing: MailingService,
    protected pushService: PushService
  ) {}

  abstract notifyPush(player: Player, data?: T, args?: A): Promise<void>;
  abstract notifyEmail(player: Player, data?: T, args?: A): Promise<void>;
  abstract notifySms(player: Player, data?: T, args?: A): Promise<void>;

  async notify(
    player?: Player,
    linkId?: string,
    data?: T,
    args?: A,
    force?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
    }
  ): Promise<void> {
    try {
      if (!player) {
        this.logger.warn(`Player not found`);
        return;
      }

      // Safely get settings with error handling for dev/system users
      let settings;
      try {
        if (typeof player.getSetting === "function") {
          settings = await player.getSetting();
        } else {
          this.logger.debug(
            `Player ${player.fullName || "unknown"} does not have getSetting method, treating as dev/system user`
          );
          settings = null;
        }
      } catch (error) {
        this.logger.warn(
          `Failed to get settings for player ${player.fullName || "unknown"}:`,
          error
        );
        settings = null;
      }

      if (!settings && !force) {
        this.logger.debug(
          `Player ${player.fullName || "unknown"} has no settings and no force flags, skipping notification`
        );
        return;
      }

      const type = settings?.[this.type] as NotificationType;

      if (!type && !force) {
        this.logger.debug(`Notification ${this.type} disabled for ${player.fullName}`);
        return;
      }

      const notification = await Notification.findOne({
        where: {
          sendToId: player.id,
          linkId,
          linkType: this.linkType,
          type: this.type,
        },
        order: [["createdAt", "DESC"]],
      });
      const totalAmount = await Notification.count({
        where: {
          sendToId: player.id,
          linkId,
          linkType: this.linkType,
          type: this.type,
        },
      });

      const logAction = await Logging.create({
        action: LoggingAction.SendNotification,
        playerId: player.id,
        meta: { linkId, linkType: this.linkType, type: NotificationType[type] },
      });

      if (notification) {
        const lastSend = moment(notification.createdAt);
        if (moment().diff(lastSend, this.allowedInterval) < this.allowedIntervalUnit) {
          this.logger.debug(
            `Notification already sent to ${player.fullName} in the last ${
              this.allowedInterval
            } (send on: ${lastSend.format("DD-MM-YYYY HH:mm:ss")})`
          );
          (logAction.meta as any)["reason"] = "Already sent in the last interval";
          logAction.changed("meta", true);
          await logAction.save();
          return;
        }

        if (this.allowedAmount && totalAmount >= this.allowedAmount) {
          this.logger.debug(
            `Notification already sent to ${player.fullName} enough (${totalAmount}) times`
          );
          (logAction.meta as any)["reason"] = "Already sent enough times";
          logAction.changed("meta", true);
          await logAction.save();
          return;
        }
      }

      this.logger.debug(`Sending notification to ${player.fullName || "unknown"} (${type})`);

      if (type & NotificationType.PUSH || force?.push) {
        try {
          await this.notifyPush(player, data, args);
        } catch (error) {
          this.logger.error(
            `Failed to send push notification to ${player.fullName || "unknown"}:`,
            error
          );
        }
      }

      if (type & NotificationType.EMAIL || force?.email) {
        try {
          await this.notifyEmail(player, data, args);
        } catch (error) {
          this.logger.error(
            `Failed to send email notification to ${player.fullName || "unknown"}:`,
            error
          );
        }
      }

      if (type & NotificationType.SMS || force?.sms) {
        try {
          await this.notifySms(player, data, args);
        } catch (error) {
          this.logger.error(
            `Failed to send SMS notification to ${player.fullName || "unknown"}:`,
            error
          );
        }
      }

      // Create notification once
      try {
        const notif = new Notification({
          sendToId: player.id,
          linkId,
          linkType: this.linkType,
          type: this.type,
        });

        await notif.save();
      } catch (error) {
        this.logger.error(
          `Failed to save notification record for ${player.fullName || "unknown"}:`,
          error
        );
      }
    } catch (error) {
      this.logger.error(`Notification failed for player ${player?.fullName || "unknown"}:`, error);
      // Don't rethrow - we want to continue processing even if notifications fail
    }
  }
}
