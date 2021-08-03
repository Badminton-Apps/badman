import {
  Team,
  DataBaseHandler,
  logger,
  EncounterChange,
  EncounterCompetition,
  Club,
  Comment,
  EncounterChangeDate,
  NotificationService
} from '../../../../_shared';
import { ApiError } from '../../models/api.error';
import { EncounterChangeInputType, EncounterChangeType } from '../types';
import moment from 'moment';

export const addChangeEncounterMutation = (notificationService: NotificationService) => {
  return {
    type: EncounterChangeType,
    description: 'Add a change to an encounter',
    args: {
      change: {
        name: 'Change',
        type: EncounterChangeInputType
      }
    },
    resolve: async (findOptions, { change }, context) => {
      const encounter = await EncounterCompetition.findByPk(change.encounterId);

      if (encounter === null) {
        throw new ApiError({
          code: 404,
          message: "Couldn't find encounter"
        });
      }

      const team = change.home ? await encounter.getHome() : await encounter.getAway();

      if (
        context?.req?.user === null ||
        !context.req.user.hasAnyPermission([
          `${team.clubId}_change:encounter`,
          'change-any:encounter'
        ])
      ) {
        logger.warn("User tried something it should't have done", {
          required: {
            anyClaim: ['change:encounter']
          },
          received: context?.req?.user?.permissions
        });
        throw new ApiError({
          code: 401,
          message: "You don't have permission to do this "
        });
      }
      const transaction = await DataBaseHandler.sequelizeInstance.transaction();
      let encounterChange;

      try {
        // Check if encounter has change
        encounterChange = await encounter.getEncounterChange({ transaction });

        // If not create a new one
        if (encounterChange === null || encounterChange === undefined) {
          encounterChange = new EncounterChange({
            encounterId: encounter.id
          });
        }

        const dates = await encounterChange.getDates();
        await encounterChange.save({ transaction });

        // Set the state
        if (change.accepted) {
          const selectedDates = change.dates.filter(r => r.selected === true);
          if (selectedDates.length !== 1) {
            // Multiple dates were selected
            throw new ApiError({
              code: 500,
              message: 'Multiple dates were selected? '
            });
          }

          if (encounter.originalDate == null) {
            encounter.originalDate = encounter.date;
          }
          encounter.date = selectedDates[0].date;
          encounter.save({ transaction });

          await encounterChange.destroy({ transaction });
        } else {
          encounterChange.accepted = false;

          let comment: Comment;
          if (change.home) {
            comment = await encounterChange.getHomeComment({ transaction });

            if (comment == null) {
              comment = new Comment({
                playerId: context?.req?.player?.id,
                clubId: team.clubId
              });

              await encounterChange.setHomeComment(comment, { transaction });
            }
          } else {
            comment = await encounterChange.getAwayComment({ transaction });
            if (comment == null) {
              comment = new Comment({
                playerId: context?.req?.player.id,
                clubId: team.clubId
              });
              await encounterChange.setAwayComment(comment, { transaction });
            }
          }

          comment.message = change.comment.message;
          await comment.save({ transaction });

          for (const date of change.dates) {
            const parsedDate = moment(date.date);
            if (!parsedDate.isValid()) {
              throw new ApiError({
                code: 500,
                message: 'Invalid date'
              });
            }
            // Check if the encounter has alredy a change for this date
            let encounterChangeDate = dates.find(
              r => r.date.getTime() === parsedDate.toDate().getTime()
            );

            // If not create new one
            if (!encounterChangeDate) {
              encounterChangeDate = new EncounterChangeDate({
                date: parsedDate.toDate(),
                encounterChangeId: encounterChange.id
              });
            }

            // Set the availibily to the date
            if (change.home) {
              encounterChangeDate.availabilityHome = date.availabilityHome;
            } else {
              encounterChangeDate.availabilityAway = date.availabilityAway;
            }

            // Save the date
            await encounterChangeDate.save({ transaction });
          }
        }

        // find if any date was selected
        await transaction.commit();
      } catch (e) {
        logger.warn('rollback', e);
        await transaction.rollback();
        throw e;
      }

      if (change.accepted) {
        await notificationService.requestFinished(encounterChange);
      } else {
        await notificationService.requestChange(encounterChange, change.home);
      }

      return encounterChange;
    }
  };
};
