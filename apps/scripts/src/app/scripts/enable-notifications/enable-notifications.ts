import { Player, Setting, Team } from '@badman/backend-database';
import { NotificationType } from '@badman/utils';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EnableNotificationsService {
  async process(year: number) {
    const teams = await Team.findAll({
      where: {
        season: year,
      },
      include: [
        {
          model: Player,
          as: 'captain',
          include: [{
            model: Setting
          }]
        },
      ],
    });


    for (const team of teams){
      if (team.captain){
        if (!team.captain.setting){
          team.captain.setting = new Setting()
        }

        if (team.captain?.setting?.encounterNotAcceptedNotification != NotificationType.NONE){
          team.captain.setting.encounterNotAcceptedNotification = NotificationType.EMAIL | NotificationType.PUSH
        }

        if (team.captain?.setting?.encounterChangeConfirmationNotification != NotificationType.NONE){
          team.captain.setting.encounterChangeConfirmationNotification = NotificationType.EMAIL | NotificationType.PUSH
        }
        
      }
    }

  }
}
