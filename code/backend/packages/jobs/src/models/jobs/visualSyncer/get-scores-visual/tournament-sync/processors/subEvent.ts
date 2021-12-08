import {
  DrawTournament,
  EventTournament,
  Game,
  GameType,
  logger,
  SubEventTournament,
  SubEventType,
  XmlGameTypeID,
  XmlGenderID,
  XmlTournament
} from '@badvlasim/shared';
import { Op, Transaction } from 'sequelize';
import { StepProcessor } from '../../../../../../utils/step-processor';
import { VisualService } from '../../../../../../utils/visualService';

export interface SubEventStepData {
  subEvent: SubEventTournament;
  internalId: number;
}

export class TournamentSyncSubEventProcessor extends StepProcessor {
  public event: EventTournament;
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
    const returnSubEvents: SubEventStepData[] = [];

    // Add sub events
    for (const xmlEvent of visualEvents) {
      if (!xmlEvent) {
        continue;
      }
      const dbSubEvents = subEvents.filter((r) => r.visualCode === `${xmlEvent.Code}`);
      let dbSubEvent: SubEventTournament = null;

      if (dbSubEvents.length === 1) {
        dbSubEvent = dbSubEvents[0];
      } else if (dbSubEvents.length > 1) {
        // We have multiple encounters with the same visual code
        const [first, ...rest] = dbSubEvents;
        dbSubEvent = first;

        logger.warn('Having multiple? Removing old');
        await SubEventTournament.destroy({
          where: {
            id: {
              [Op.in]: rest.map((e) => e.id)
            }
          },
          transaction: this.transaction
        });
      }

      if (!dbSubEvent) {
        if (this.existed) {
          logger.warn(
            `Event ${xmlEvent.Name} for ${this.event.name} (gender: ${xmlEvent.GenderID}) not found, might checking it?`
          );
        }
        dbSubEvent = await new SubEventTournament({
          name: xmlEvent.Name,
          visualCode: xmlEvent.Code,
          eventType:
            xmlEvent.GenderID === XmlGenderID.Mixed
              ? SubEventType.MX
              : xmlEvent.GenderID === XmlGenderID.Male || xmlEvent.GenderID === XmlGenderID.Boy
              ? SubEventType.F
              : SubEventType.M,
          gameType:
            xmlEvent.GameTypeID === XmlGameTypeID.Mixed
              ? GameType.MX
              : xmlEvent.GameTypeID === XmlGameTypeID.Doubles
              ? GameType.D
              : GameType.S,
          eventId: this.event.id,
          level: xmlEvent.LevelID
        }).save({ transaction: this.transaction });
      } else {
        if (dbSubEvent.visualCode === null) {
          dbSubEvent.visualCode = xmlEvent.Code;
          await dbSubEvent.save({ transaction: this.transaction });
        }
      }

      returnSubEvents.push({ subEvent: dbSubEvent, internalId: xmlEvent.Code });
    }

    // Remove subEvents that are not in the xml
    const removedSubEvents = subEvents.filter((s) => s.visualCode == null);
    for (const removed of removedSubEvents) {
      const gameIds = (
        await Game.findAll({
          attributes: ['id'],
          include: [
            {
              attributes: [],
              model: DrawTournament,
              required: true,
              where: {
                subeventId: removed.id
              }
            }
          ],
          transaction: this.transaction
        })
      )
        ?.map((g) => g.id)
        ?.filter((g) => !!g);

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

    return returnSubEvents;
  }
}
