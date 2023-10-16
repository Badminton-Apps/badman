import { Player, Setting, Team } from '@badman/backend-database';
import { NotificationType } from '@badman/utils';
import { Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class EnableNotificationsService {
  constructor(private sequelize: Sequelize) {}

  async process(year: number) {
    const transaction = await this.sequelize.transaction();
    const teams = await Team.findAll({
      where: {
        season: year,
      },
      include: [
        {
          model: Player,
          as: 'captain',
          include: [
            {
              model: Setting,
            },
          ],
        },
      ],
      transaction,
    });

    try {
      for (const team of teams) {
        if (team.captain) {
          let setting = team.captain?.setting;
          if (!setting) {
            setting = new Setting({
              playerId: team.captain.id,
            });
          }

          if (
            setting?.encounterNotAcceptedNotification != NotificationType.NONE
          ) {
            setting.encounterNotAcceptedNotification = NotificationType.EMAIL;
          }

          if (
            setting?.encounterChangeConfirmationNotification !=
            NotificationType.NONE
          ) {
            setting.encounterChangeConfirmationNotification =
              NotificationType.EMAIL;
          }

          await setting.save({
            transaction,
          });
        }
      }

      await transaction.commit();
    } catch (e) {
      console.log(e);
      await transaction.rollback();
    }
  }
}
