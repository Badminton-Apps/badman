import {
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  Game,
  ImporterFile,
  logger,
  RankingSystemGroup,
  SubEventCompetition,
  ProcessStep
} from '@badvlasim/shared';
import { Transaction, Op } from 'sequelize';
import { ProcessImport } from '../importProcessor';

export abstract class CompetitionProcessor extends ProcessImport {
  protected addEvent(): ProcessStep<EventCompetition> {
    return new ProcessStep(
      'event',
      async (args: {
        importFile: ImporterFile;
        transaction?: Transaction;
        event?: EventCompetition;
      }) => {
        if (!args.event) {
          args.event = this.importProcess.getData('find_event')
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

  protected findEvent(): ProcessStep<EventCompetition> {
    return new ProcessStep(
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

  protected cleanupEvent(): ProcessStep<any[]> {
    return new ProcessStep(
      'cleanup_event',
      async (args: { event: EventCompetition; transaction: Transaction }) => {
        if (!args.event) {
          const event: EventCompetition = this.importProcess.getData('find_event');;
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
