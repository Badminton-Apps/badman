import {
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  Game,
  LevelType,
  logger,
  SubEventCompetition,
  SubEventType,
  XmlGenderID,
  XmlTournament
} from '@badvlasim/shared';
import { Op, Transaction } from 'sequelize';
import { StepProcessor } from '../../../../../../utils/step-processor';
import { VisualService } from '../../../../../../utils/visualService';

export interface SubEventStepData {
  subEvent: SubEventCompetition;
  internalId: number;
}

export class CompetitionSyncSubEventProcessor extends StepProcessor {
  public event: EventCompetition;
  public existed: boolean;

  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly transaction: Transaction,
    protected readonly visualService: VisualService
  ) {
    super(visualTournament, transaction);
  }

  public async process(): Promise<SubEventStepData[]> {
    // deconstructing

    if (!this.event) {
      throw new Error('No Event');
    }

    const subEvents = await this.event.getSubEvents({ transaction: this.transaction });
    const visualEvents = await this.visualService.getEvents(this.visualTournament.Code);
    const dbSubEvents: SubEventStepData[] = [];

    // Add sub events
    for (const xmlEvent of visualEvents) {
      if (!xmlEvent) {
        continue;
      }
      let dbSubEvent = subEvents.find(r => r.visualCode === `${xmlEvent.Code}`);

      if (!dbSubEvent) {
        let type =
          xmlEvent.GenderID === XmlGenderID.Mixed
            ? SubEventType.MX
            : xmlEvent.GenderID === XmlGenderID.Male || xmlEvent.GenderID === XmlGenderID.Boy
            ? SubEventType.M
            : SubEventType.F;

        if (this.event.type === LevelType.NATIONAL) {
          type = SubEventType.MX;
        }

        // Hopefully with this we can link with the correct subEvent so our link isn't lost
        dbSubEvent = subEvents.find(
          r => r.name === xmlEvent.Name.replace(/[ABCDE]+$/gm, '').trim() && r.eventType === type
        );
      }

      if (!dbSubEvent) {
        if (this.existed) {
          logger.warn(
            `Event ${xmlEvent.Name} for ${this.event.name} (gender: ${xmlEvent.GenderID}) not found, might checking it?`
          );
        }

        dbSubEvent = await new SubEventCompetition({
          visualCode: xmlEvent.Code,
          name: xmlEvent.Name,
          eventType:
            xmlEvent.GenderID === XmlGenderID.Mixed
              ? SubEventType.MX
              : xmlEvent.GenderID === XmlGenderID.Male || xmlEvent.GenderID === XmlGenderID.Boy
              ? SubEventType.M
              : SubEventType.F,
          eventId: this.event.id,
          level: xmlEvent.LevelID
        }).save({ transaction: this.transaction });
      } else {
        if (dbSubEvent.visualCode === null) {
          dbSubEvent.visualCode = xmlEvent.Code;
          await dbSubEvent.save({ transaction: this.transaction });
        }
      }

      dbSubEvents.push({ subEvent: dbSubEvent, internalId: xmlEvent.Code });
    }

    // Remove subEvents that are not in the xml
    const removedSubEvents = subEvents.filter(s => s.visualCode == null);
    for (const removed of removedSubEvents) {
      const gameIds = (
        await Game.findAll({
          attributes: ['id'],
          include: [
            {
              attributes: [],
              model: EncounterCompetition,
              required: true,
              include: [
                {
                  attributes: [],
                  required: true,
                  model: DrawCompetition,
                  where: {
                    subeventId: removed.id
                  }
                }
              ]
            }
          ],
          transaction: this.transaction
        })
      )
        ?.map(g => g.id)
        ?.filter(g => !!g);

      if (gameIds && gameIds.length > 0) {
        await Game.destroy({
          where: {
            id: {
              [Op.in]: gameIds
            }
          },
          transaction: this.transaction
        });
      }

      await removed.destroy({ transaction: this.transaction });
    }

    return dbSubEvents;
  }
}
