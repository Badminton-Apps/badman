import {
  Availability,
  Comment,
  DataBaseHandler,
  EncounterChange,
  EncounterChangeDate,
  EncounterCompetition,
  logger,
  NotificationService,
  Team
} from '@badvlasim/shared';
import { parse } from 'fast-xml-parser';
import axios from 'axios';
import moment from 'moment';
import { Transaction } from 'sequelize/types';
import { ApiError } from '../../models/api.error';
import { EncounterChangeInputType, EncounterChangeType } from '../types';

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
    resolve: async (
      findOptions,
      {
        change
      }: {
        change: {
          comment: { message: string };
          encounterId: string;
          home: boolean;
          accepted: boolean;
          dates: {
            selected: boolean;
            date: any;
            availabilityHome: Availability;
            availabilityAway: Availability;
          }[];
        };
      },
      context
    ) => {
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
          // `${team.clubId}_change:encounter`,
          'change-any:encounter'
        ])
      ) {
        logger.warn("User tried something it should't have done", {
          required: {
            anyClaim: [`${team.clubId}_change:encounter`, 'change-any:encounter']
          },
          received: context?.req?.user?.permissions
        });
        throw new ApiError({
          code: 401,
          message: "You don't have permission to do this "
        });
      }
      const transaction = await DataBaseHandler.sequelizeInstance.transaction();
      let encounterChange: EncounterChange;

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
          // Copy original date
          if (encounter.originalDate === null) {
            encounter.originalDate = encounter.date;
          }
          // Set date to the selected date
          encounter.date = selectedDates[0].date;

          // Accept
          await acceptDate(encounter, transaction);

          // Save cahnges
          encounter.save({ transaction });

          // Destroy the requets
          await encounterChange.destroy({ transaction });
        } else {
          await changeOrUpdate(encounterChange, change, transaction, context, team, dates);
        }

        // find if any date was selected
        await transaction.commit();
      } catch (e) {
        logger.warn('rollback', e);
        await transaction.rollback();
        throw e;
      }

      // Notify the user
      // if (change.accepted) {
      //   await notificationService.requestFinished(encounterChange);
      // } else {
      //   await notificationService.requestChange(encounterChange, change.home);
      // }

      return encounterChange;
    }
  };
};
const changeOrUpdate = async (
  encounterChange: EncounterChange,
  change: {
    comment: {
      message: string;
    };
    encounterId: string;
    home: boolean;
    accepted: boolean;
    dates: {
      selected: boolean;
      date: any;
      availabilityHome: Availability;
      availabilityAway: Availability;
    }[];
  },
  transaction,
  context: any,
  team: Team,
  dates: EncounterChangeDate[]
) => {
  encounterChange.accepted = false;

  let comment: Comment;
  if (change.home) {
    comment = await encounterChange.getHomeComment({ transaction });

    if (comment === null) {
      comment = new Comment({
        playerId: context?.req?.user?.player?.id,
        clubId: team.clubId
      });

      await encounterChange.setHomeComment(comment, { transaction });
    }
  } else {
    comment = await encounterChange.getAwayComment({ transaction });
    if (comment === null) {
      comment = new Comment({
        playerId: context?.req?.user?.player?.id,
        clubId: team.clubId
      });
      await encounterChange.setAwayComment(comment, { transaction });
    }
  }

  comment.message = change.comment.message;
  await comment.save({ transaction });

  change.dates = change.dates
    .map(r => {
      const parsedDate = moment(r.date);
      r.date = parsedDate.isValid() ? parsedDate.toDate() : null;
      return r;
    })
    .filter(r => r.date !== null);

  // Add new dates
  for (const date of change.dates) {
    // Check if the encounter has alredy a change for this date
    let encounterChangeDate = dates.find(r => r.date.getTime() === date.date.getTime());

    // If not create new one
    if (!encounterChangeDate) {
      encounterChangeDate = new EncounterChangeDate({
        date: date.date,
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

  // remove old dates
  for (const date of dates) {
    if (change.dates.find(r => r.date.getTime() === date.date.getTime()) === null) {
      await date.destroy({ transaction });
    }
  }
};

const visualFormat = 'YYYY-MM-DDTHH:mm:ss';
export const acceptDate = async (encounter: EncounterCompetition, transaction: Transaction) => {
  // Check if visual reality has same date stored
  const draw = await encounter.getDraw({ transaction });
  const subEvent = await draw.getSubEvent({ transaction });
  const event = await subEvent.getEvent({ transaction });

  if (event.visualCode === null) {
    logger.error(`No visual code found for ${event?.name}`);
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    const resultPut = await axios.put(
      `${process.env.VR_API}/${event.visualCode}/Match/${encounter.visualCode}/Date`,
      {
        withCredentials: true,
        auth: {
          username: `${process.env.VR_API_USER}`,
          password: `${process.env.VR_API_PASS}`
        },
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'Content-Type': 'application/xml'
        },
        body: `
            <TournamentMatch>
                <TournamentID>${event.visualCode}</TournamentID>
                <MatchID>${encounter.visualCode}</MatchID>
                <MatchDate>${moment(encounter.date).format(visualFormat)}</MatchDate>
            </TournamentMatch>
          `
      }
    );
    const bodyPut = parse(resultPut.data).Result as Result;
    if (bodyPut.Error?.Code !== 0 || bodyPut.Error.Message !== 'Success.') {
      logger.error(
        `${process.env.VR_API}/${event.visualCode}/Match/${encounter.visualCode}/Date`,
        `<TournamentMatch>
            <TournamentID>${event.visualCode}</TournamentID>
            <MatchID>${encounter.visualCode}</MatchID>
            <MatchDate>${moment(encounter.date).format(visualFormat)}</MatchDate>
        </TournamentMatch>`
      );
      throw new ApiError({
        code: 500,
        message: `Error updating visual reality\n${bodyPut.Error.Message}`
      });
    }
  } else {
    logger.debug(
      'Putting the following',
      `<TournamentMatch>
            <TournamentID>${event.visualCode}</TournamentID>
            <MatchID>${encounter.visualCode}</MatchID>
            <MatchDate>${moment(encounter.date).format(visualFormat)}</MatchDate>
        </TournamentMatch>`,
      `${process.env.VR_API}/${event.visualCode}/Match/${encounter.visualCode}/Date`
    );
  }

  encounter.synced = new Date();
};

/* eslint-disable @typescript-eslint/naming-convention */
interface Result {
  TournamentMatch?: TournamentMatch;
  Error?: XmlError;
  _Version: string;
}

interface TournamentMatch {
  TournamentID: string;
  MatchID: string;
  MatchDate: Date;
}

interface XmlError {
  Code: number;
  Message: string;
}
/* eslint-enable @typescript-eslint/naming-convention */
