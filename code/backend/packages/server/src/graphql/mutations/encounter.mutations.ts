import {
  Team,
  DataBaseHandler,
  logger,
  EncounterChange,
  EncounterCompetition,
  Comment,
  EncounterChangeDate,
  NotificationService,
  Availability
} from '../../../../_shared';
import { ApiError } from '../../models/api.error';
import { EncounterChangeInputType, EncounterChangeType } from '../types';
import moment from 'moment';
import got from 'got';
import { parse } from 'fast-xml-parser';
import { Transaction } from 'sequelize/types';

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
          if (encounter.originalDate == null) {
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

      if (change.accepted) {
        await notificationService.requestFinished(encounterChange);
      } else {
        await notificationService.requestChange(encounterChange, change.home);
      }

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

    if (comment == null) {
      comment = new Comment({
        playerId: context?.req?.user?.player?.id,
        clubId: team.clubId
      });

      await encounterChange.setHomeComment(comment, { transaction });
    }
  } else {
    comment = await encounterChange.getAwayComment({ transaction });
    if (comment == null) {
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
    if (change.dates.find(r => r.date.getTime() === date.date.getTime()) == null) {
      await date.destroy({ transaction });
    }
  }
};

export const acceptDate = async (encounter: EncounterCompetition, transaction: Transaction) => {
  // Check if visual reality has same date stored
  const draw = await encounter.getDraw({ transaction });
  const subEvent = await draw.getSubEvent({ transaction });
  const event = await subEvent.getEvent({ transaction });

  if (event.visualCode == null) {
    logger.error(`No visual code found for ${event?.name}`);
    return;
  }

  const result = await got.get(
    `${process.env.VR_API}/${event.visualCode}/Match/${encounter.visualCode}/Date`,
    {
      username: `${process.env.VR_API_USER}`,
      password: `${process.env.VR_API_PASS}`
    }
  );

  const body = parse(result.body).Result as Result;
  const visualDate = moment(body?.TournamentMatch?.MatchDate, 'YYYY-MM-DDTHH:mm:ss', true);
  if (true) {
    if (process.env.production === 'true') {
      const resultPut = await got.put(
        `${process.env.VR_API}/${event.visualCode}/Match/${encounter.visualCode}/Date`,
        {
          username: `${process.env.VR_API_USER}`,
          password: `${process.env.VR_API_PASS}`,
          headers: {
            'Content-Type': 'application/xml'
          },
          body: `
            <TournamentMatch>
                <TournamentID>${event.visualCode}</TournamentID>
                <MatchID>${encounter.visualCode}</MatchID>
                <MatchDate>${encounter.date.toISOString()}</MatchDate>
            </TournamentMatch>
          `
        }
      );
      const bodyPut = parse(resultPut.body).Result as Result;
      if (bodyPut.Error?.Code !== 0 || bodyPut.Error.Message !== 'Success.') {
        logger.error(
          `${process.env.VR_API}/${event.visualCode}/Match/${encounter.visualCode}/Date`,
          `
            <TournamentMatch>
                <TournamentID>${event.visualCode}</TournamentID>
                <MatchID>${encounter.visualCode}</MatchID>
                <MatchDate>${encounter.date.toISOString()}</MatchDate>
            </TournamentMatch>
          `
        );
        throw new ApiError({
          code: 500,
          message: `Error updating visual reality\n${bodyPut.Error.Message}`
        });
      }
    } else {
      logger.debug(
        'Putting the following',
        {
          tournamentMatch: {
            tournamentID: event.visualCode,
            matchID: encounter.visualCode,
            matchDate: encounter.date.toISOString()
          }
        },
        `${process.env.VR_API}/${event.visualCode}/Match/${encounter.visualCode}/Date`
      );
    }
  } else {
    throw new ApiError({
      code: 500,
      message: `Visual's date isn't the same, 
      \tVisual: ${visualDate.toString()} 
      \tOrignal: ${encounter.originalDate.toString()} 
      \tDate: ${encounter.date.toString()}
      \tEvent: ${event.name}
      \tSubEvent: ${subEvent.name}
      `
    });
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
