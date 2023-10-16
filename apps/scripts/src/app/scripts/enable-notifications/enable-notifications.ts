import { Player, Setting, Team } from '@badman/backend-database';
import { NotificationType } from '@badman/utils';
import { Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import xlsx from 'xlsx';

@Injectable()
export class EnableNotificationsService {
  constructor(private sequelize: Sequelize) {}

  async process(year: number) {
    const activated = [];

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
          activated.push({
            firstName: team.captain.firstName,
            lastName: team.captain.lastName,
            memberId: team.captain.memberId,
            email: team.email,
          });

          await setting.save({
            transaction,
          });
        }
      }

      await transaction.commit();

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(activated);
      xlsx.utils.book_append_sheet(wb, ws, 'activated');
      xlsx.writeFile(wb, 'activated.xlsx');
    } catch (e) {
      console.log(e);
      await transaction.rollback();
    }
  }
}
