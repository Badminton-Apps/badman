import {
  DrawTournament,
  EventTournament,
  Game,
  GameType,
  logger,
  StepOptions,
  StepProcessor,
  SubEventTournament,
  SubEventType,
  XmlGameTypeID,
  XmlGenderID,
  XmlTournament,
  XmlTournamentEvent
} from '@badvlasim/shared';
import { Op } from 'sequelize';
import { VisualService } from '../../../visualService';

export interface SubEventStepData {
  subEvent: SubEventTournament;
  internalId: number;
}

export class TournamentSyncSubEventProcessor extends StepProcessor {
  public event: EventTournament;
  public existed: boolean;

  // Temporary argument

  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly visualService: VisualService,
    options?: StepOptions
  ) {
    super(options);
  }

  public async process(): Promise<SubEventStepData[]> {
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

        this.logger.warn('Having multiple? Removing old');
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
          this.logger.warn(
            `Event ${xmlEvent.Name} for ${this.event.name} (gender: ${xmlEvent.GenderID}) not found, might checking it?`
          );
        }
        dbSubEvent = await new SubEventTournament({
          name: xmlEvent.Name,
          visualCode: xmlEvent.Code,
          eventType: this.getEventType(xmlEvent),
          gameType: this.getGameType(xmlEvent),
          eventId: this.event.id,
          level: xmlEvent.LevelID
        }).save({ transaction: this.transaction });
      } else {
        if (dbSubEvent.visualCode === null) {
          dbSubEvent.visualCode = xmlEvent.Code;
          await dbSubEvent.save({ transaction: this.transaction });
        }
      }

      returnSubEvents.push({ subEvent: dbSubEvent, internalId: parseInt(xmlEvent.Code, 10) });
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

  private getGameType(xmlEvent: XmlTournamentEvent): GameType {
    switch (xmlEvent.GameTypeID) {
      case XmlGameTypeID.Doubles:
        // Stupid fix but should work
        if (xmlEvent.GenderID === XmlGenderID.Mixed) {
          return GameType.MX;
        } else {
          return GameType.D;
        }
      case XmlGameTypeID.Singles:
        return GameType.S;
      case XmlGameTypeID.Mixed:
        return GameType.MX;
      default:
        this.logger.warn('No Game type found');
        return;
    }
  }

  private getEventType(xmlEvent: XmlTournamentEvent): SubEventType {
    switch (xmlEvent.GenderID) {
      case XmlGenderID.Male:
      case XmlGenderID.Boy:
        return SubEventType.M;
      case XmlGenderID.Female:
      case XmlGenderID.Girl:
        return SubEventType.F;
      case XmlGenderID.Mixed:
        return SubEventType.MX;
      default:
        this.logger.warn('No event type found');
        return;
    }
  }
}
