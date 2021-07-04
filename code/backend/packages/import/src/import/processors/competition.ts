import {
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  Game,
  ImporterFile,
  logger,
  RankingSystemGroup,
  SubEventCompetition
} from '@badvlasim/shared';
import { Transaction, Op } from 'sequelize';
import { ImportStep } from '../import-step';
import { ProcessImport } from '../processor';

export abstract class CompetitionProcessor extends ProcessImport {
  protected addEvent(): ImportStep<EventCompetition> {
    return new ImportStep(
      'event',
      async (args: {
        importFile: ImporterFile;
        transaction?: Transaction;
        event?: EventCompetition;
      }) => {
        if (!args.event) {
          args.event = this.importSteps.get('find_event')?.getData();
        }

        if (args.event) {
          return args.event;
        }

        try {
          const event = await new EventCompetition({
            name: args.importFile.name,
            uniCode: args.importFile.uniCode,
            startYear: args.importFile.firstDay?.getFullYear(),
            type: this.getLeague(args.importFile)
          }).save({ transaction: args.transaction });
          return event;
        } catch (e) {
          logger.error('import failed', e);
          throw e;
        }
      }
    );
  }

  protected findEvent(): ImportStep<EventCompetition> {
    return new ImportStep(
      'find_event',
      async (args: {
        event: EventCompetition;
        importFile: ImporterFile;
        transaction: Transaction;
      }) => {
        if (args.event) {
          return args.event;
        }

        const or: any = [{ name: args.importFile.name }];

        if (args.importFile.uniCode) {
          or.push({ uniCode: args.importFile.uniCode });
        }
        const where: { [key: string]: any } = {
          startYear: args.importFile.firstDay?.getFullYear(),
          [Op.or]: or
        };

        const event = await EventCompetition.findOne({ where, transaction: args.transaction });
        return event;
      }
    );
  }

  protected cleanupEvent(): ImportStep<any[]> {
    return new ImportStep(
      'cleanup_event',
      async (args: { event: EventCompetition; transaction: Transaction }) => {
        if (!args.event) {
          const event: EventCompetition = this.importSteps.get('find_event')?.getData();
          if (!event) {
            return;
          }
          args.event = event;
        }

        // Games are dynamically linked, so request them manually
        const games = await Game.findAll({
          attributes: ['id'],
          include: [
            {
              required: true,
              model: EncounterCompetition,
              attributes: [],
              include: [
                {
                  model: DrawCompetition,
                  required: true,
                  attributes: [],
                  include: [
                    {
                      model: SubEventCompetition,
                      attributes: [],
                      required: true,
                      where: {
                        eventId: args.event.id
                      }
                    }
                  ]
                }
              ]
            }
          ],
          transaction: args.transaction
        });

        await Game.destroy({ where: { id: games.map(r => r.id) }, transaction: args.transaction });

        const dbSubEvents = await SubEventCompetition.findAll({
          where: {
            eventId: args.event.id
          },
          include: [RankingSystemGroup],
          transaction: args.transaction
        });

        await SubEventCompetition.destroy({
          where: {
            eventId: args.event.id
          },
          cascade: true,
          transaction: args.transaction
        });

        return dbSubEvents?.map(r => {
          const { id, ...event } = r.toJSON() as any;
          return event;
        });
      }
    );
  }
}
