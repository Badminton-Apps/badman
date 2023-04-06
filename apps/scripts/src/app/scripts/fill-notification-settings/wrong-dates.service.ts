import { Setting, Team } from '@badman/backend-database';
import { NotificationType } from '@badman/utils';
import { Injectable, Logger } from '@nestjs/common';
import { Op } from 'sequelize';

@Injectable()
export class FillNotification {
  private readonly logger = new Logger(FillNotification.name);

  async fixSettings() {
    const teams = await Team.findAll({
      where: {
        captainId: {
          [Op.ne]: null,
        },
      },
    });

    this.logger.log(`Found ${teams.length} teams with captains`);

    for (const team of teams) {
      const captain = await team.getCaptain();
      let settings = await captain.getSetting();

      if (!settings) {
        settings = new Setting({
          playerId: captain.id,
        });
      }

      settings.encounterNotAcceptedNotification =
        settings.encounterNotAcceptedNotification ?? 0 != 0
          ? settings.encounterNotAcceptedNotification
          : NotificationType.EMAIL | NotificationType.PUSH;
      settings.encounterNotEnteredNotification =
        settings.encounterNotEnteredNotification ?? 0 != 0
          ? settings.encounterNotEnteredNotification
          : NotificationType.EMAIL | NotificationType.PUSH;

      await settings.save();
    }

    this.logger.log('Done');
  }
}
