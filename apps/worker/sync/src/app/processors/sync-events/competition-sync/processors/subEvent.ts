import {
  EventCompetition,
  RankingSystem,
  SubEventCompetition,
} from '@badman/backend-database';
import moment from 'moment';
import { Op } from 'sequelize';
import { StepOptions, StepProcessor } from '../../../../processing';
import {
  VisualService,
  XmlGenderID,
  XmlTournament,
  XmlTournamentEvent,
} from '@badman/backend-visual';

import { LevelType, SubEventTypeEnum } from '@badman/utils';
import { Logger, NotFoundException } from '@nestjs/common';

export interface SubEventStepData {
  subEvent: SubEventCompetition;
  internalId: number;
}

export class CompetitionSyncSubEventProcessor extends StepProcessor {
  public event?: EventCompetition;
  public existed?: boolean;

  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly visualService: VisualService,
    options?: StepOptions
  ) {
    if (!options) {
      options = {};
    }

    options.logger =
      options.logger || new Logger(CompetitionSyncSubEventProcessor.name);
    super(options);
  }

  public async process(): Promise<SubEventStepData[]> {
    if (!this.event) {
      throw new NotFoundException(`${EventCompetition.name} not found`);
    }

    const subEvents = await this.event.getSubEventCompetitions({
      transaction: this.transaction,
    });
    const canChange = moment().isBefore(`${this.event.season}-09-01`);

    const visualEvents = await this.visualService.getEvents(
      this.visualTournament.Code,
      !canChange
    );
    const returnSubEvents: SubEventStepData[] = [];

    // Add sub events
    for (const xmlEvent of visualEvents) {
      if (!xmlEvent) {
        continue;
      }
      const dbSubEvents = subEvents.filter(
        (r) => r.visualCode === `${xmlEvent.Code}`
      );
      let dbSubEvent: SubEventCompetition | null = null;

      if (dbSubEvents.length === 1) {
        dbSubEvent = dbSubEvents[0];
      } else if (dbSubEvents.length > 1) {
        // We have multiple encounters with the same visual code
        const [first, ...rest] = dbSubEvents;
        dbSubEvent = first;

        this.logger.warn('Having multiple? Removing old');
        await SubEventCompetition.destroy({
          where: {
            id: {
              [Op.in]: rest.map((e) => e.id),
            },
          },
          transaction: this.transaction,
        });
      }

      let type = this.getEventType(xmlEvent);
      if (!dbSubEvent) {
        if (this.event.type === LevelType.NATIONAL) {
          type = SubEventTypeEnum.MX;
        }

        // Hopefully with this we can link with the correct subEvent so our link isn't lost
        dbSubEvent =
          subEvents.find(
            (r) =>
              r.name?.toLowerCase()?.trim() ===
                xmlEvent.Name.replace(/[ABCDE]+$/gm, '')
                  .trim()
                  ?.toLowerCase() && r.eventType === type
          ) ?? null;
      }

      if (!dbSubEvent) {
        if (this.existed) {
          this.logger.warn(
            `Event ${xmlEvent.Name} for ${this.event.name} (gender: ${xmlEvent.GenderID}) not found, might checking it?`
          );
        }

        dbSubEvent = await new SubEventCompetition({
          visualCode: xmlEvent.Code,
          name: xmlEvent.Name,
          eventType: type,
          eventId: this.event.id,
          level: xmlEvent.LevelID,
        }).save({ transaction: this.transaction });
        // if event is official we can assume that the subEvent needs a ranking
        if (this.event.official) {
          const primary = await RankingSystem.findOne({
            where: { primary: true },
            transaction: this.transaction,
          });

          if (primary) {
            const groups = await primary.getRankingGroups({
              transaction: this.transaction,
            });

            if (groups?.length > 0) {
              await dbSubEvent.addRankingGroups(groups, {
                transaction: this.transaction,
              });
            }
          }
        }
      } else {
        if (dbSubEvent.visualCode === null) {
          dbSubEvent.visualCode = xmlEvent.Code;
          await dbSubEvent.save({ transaction: this.transaction });
        }
      }

      returnSubEvents.push({
        subEvent: dbSubEvent,
        internalId: parseInt(xmlEvent.Code, 10),
      });
    }

    return returnSubEvents;
  }

  private getEventType(
    xmlEvent: XmlTournamentEvent
  ): SubEventTypeEnum | undefined {
    switch (xmlEvent.GenderID) {
      case XmlGenderID.Male:
      case XmlGenderID.Boy:
        return SubEventTypeEnum.M;
      case XmlGenderID.Female:
      case XmlGenderID.Girl:
        return SubEventTypeEnum.F;
      case XmlGenderID.Mixed:
        return SubEventTypeEnum.MX;
      default:
        this.logger.warn('No event type found');
        return;
    }
  }
}
