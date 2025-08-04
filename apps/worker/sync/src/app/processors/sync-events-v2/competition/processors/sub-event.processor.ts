import {
  DrawCompetition,
  EventCompetition,
  RankingSystem,
  SubEventCompetition,
  EventEntry,
} from '@badman/backend-database';
import { Sync, SyncQueue, TransactionManager } from '@badman/backend-queue';
import { VisualService, XmlGenderID, XmlTournamentEvent } from '@badman/backend-visual';
import { SubEventTypeEnum } from '@badman/utils';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';

@Processor({
  name: SyncQueue,
})
export class SubEventCompetitionProcessor {
  private readonly logger = new Logger(SubEventCompetitionProcessor.name);

  constructor(
    private readonly _transactionManager: TransactionManager,
    private readonly _visualService: VisualService,
    @InjectQueue(SyncQueue) private readonly _syncQueue: Queue,
  ) {}

  @Process(Sync.ProcessSyncCompetitionSubEvent)
  async ProcessSyncCompetitionSubEvent(
    job: Job<{
      // transaction
      transactionId: string;

      // provide or direved
      rankingSystemId: string;

      // we try to find the event
      eventCode: string;
      eventId: string;

      // one or the other
      subEventId: string;
      subEventCode: number;

      // options
      options: {
        deleteSubEvent?: boolean;
        deleteDraw?: boolean;
        deleteEnocunters?: boolean;
        deleteMatches?: boolean;
        deleteStandings?: boolean;

        updateDraws?: boolean;
        updateMatches?: boolean;
        updateStanding?: boolean;
      };

      // from parent
      draws: {
        id: string;
        visualCode: string;
        encounters: {
          id: string;
          visualCode: string;
          games: { id: string; visualCode: string }[];
        }[];
      }[];
    }>,
  ): Promise<void> {
    const transaction = await this._transactionManager.getTransaction(job.data.transactionId);

    const options = {
      // update when we delete the event (unless specified)
      updateDraws: job.data.options?.deleteSubEvent || false,
      updateMatches: job.data.options?.deleteSubEvent || false,
      updateStanding: job.data.options?.deleteSubEvent || false,
      ...job.data.options,
    };

    let subEvent: SubEventCompetition;
    if (job.data.subEventId) {
      subEvent = await SubEventCompetition.findOne({
        where: {
          id: job.data.subEventId,
        },
        transaction,
      });
    }
    let event;

    if (subEvent) {
      event = await subEvent.getEventCompetition();
      if (event) {
        job.data.eventCode = event.visualCode;
      }
    }

    if (!event && job.data.eventId) {
      event = await EventCompetition.findByPk(job.data.eventId, {
        transaction,
      });
    }

    if (!event && job.data.eventCode) {
      event = await EventCompetition.findOne({
        where: {
          visualCode: job.data.eventCode,
        },
        transaction,
      });
    }

    if (!event) {
      throw new Error('Event not found');
    }

    if (!subEvent && job.data.subEventCode) {
      subEvent = await SubEventCompetition.findOne({
        where: {
          visualCode: job.data.subEventCode.toString(),
          eventId: event.id,
        },
        transaction,
      });
    }

    // delete the data and reuse the guid
    const subEventId = subEvent?.id;
    const subEventCode = subEvent?.visualCode || job.data.subEventCode.toString();
    const existing = {
      existed: false,
      draws: job.data?.draws || [],
    };
    if (subEvent && options.deleteSubEvent) {
      this.logger.debug(`Deleting subevent ${subEvent.name}`);

      // remove all draws and games
      const draws = await subEvent.getDrawCompetitions({
        transaction,
      });

      for (const draw of draws) {
        const existingDraw = {
          id: draw.id,
          visualCode: draw.visualCode,
          encounters: [],
        };

        const encounters = await draw.getEncounterCompetitions({
          transaction,
        });

        for (const encounter of encounters) {
          const existingEncounter = {
            id: encounter.id,
            visualCode: encounter.visualCode,
            games: [],
          };

          const games = await encounter.getGames({
            transaction,
          });

          for (const game of games) {
            existingEncounter.games.push({
              id: game.id,
              visualCode: game.visualCode,
            });

            if (options.deleteMatches) {
              await game.destroy({ transaction });
            }
          }

          existingDraw.encounters.push(existingEncounter);

          if (options.deleteEnocunters) {
            await encounter.destroy({ transaction });
          }
        }

        existing.draws.push(existingDraw);
      }

      await subEvent.destroy({ transaction });
      subEvent = undefined;
      existing.existed = true;
    }

    if (!subEventCode) {
      throw new Error('Sub event code is required');
    }

    const visualSubEvent = await this._visualService.getSubEvent(
      event.visualCode,
      subEventCode,
      true,
    );
    if (!visualSubEvent) {
      throw new Error('Sub subevent not found');
    }

    if (!subEvent) {
      subEvent = new SubEventCompetition();
    }

    if (subEventId) {
      subEvent.id = subEventId;
    }

    subEvent.id = subEventId;
    subEvent.name = visualSubEvent.Name;
    subEvent.visualCode = visualSubEvent.Code;
    subEvent.eventType = this.getEventType(visualSubEvent);
    subEvent.eventId = event.id;
    subEvent.level = visualSubEvent.LevelID;

    const primary = await RankingSystem.findOne({
      where: { primary: true },
      transaction,
    });

    if (event.official) {
      if (primary) {
        const groups = await primary.getRankingGroups({
          transaction,
        });

        if (groups?.length > 0) {
          await subEvent.addRankingGroups(groups, {
            transaction,
          });
        }
      }
    }

    await subEvent.save({ transaction });

    // if we request to update the draws or the event is new we need to process the matches
    if (options.updateDraws || !existing.existed) {
      await this.processDraws(
        event.visualCode,
        subEventCode,
        subEvent,
        primary.id,
        job.data.transactionId,
        options,
        existing.draws,
      );
    }
  }

  private async processDraws(
    eventCode: string,
    subEventCode: string,
    subEvent: SubEventCompetition,
    rankingSystemId: string,
    transactionId: string,
    options: {
      deleteDraw?: boolean;
      deleteMatches?: boolean;
      deleteStandings?: boolean;

      updateMatches?: boolean;
      updateStanding?: boolean;
    },
    existing: {
      id: string;
      visualCode: string;
      encounters: {
        id: string;
        visualCode: string;
        games: { id: string; visualCode: string }[];
      }[];
    }[],
  ) {
    const transaction = await this._transactionManager.getTransaction(transactionId);
    const draws = await this._visualService.getDraws(eventCode, subEventCode, true);

    // remove all sub events in this event that are not in the visual to remove stray data
    const dbDraws = await DrawCompetition.findAll({
      where: {
        subeventId: subEvent.id,
      },
      transaction,
    });

    for (const dbDraw of dbDraws) {
      if (!draws.find((r) => `${r.Code}` === `${dbDraw.visualCode}`)) {
        this.logger.debug(`Removing draw ${dbDraw.visualCode}`);

        const encounters = await dbDraw.getEncounterCompetitions({
          transaction,
        });

        for (const encounter of encounters) {
          const dbGames = await encounter.getGames({
            transaction,
          });

          for (const dbGame of dbGames) {
            await dbGame.destroy({ transaction });
          }
        }

        // Clean up EventEntries first
        const eventEntries = await EventEntry.findAll({
          where: {
            drawId: dbDraw.id,
            entryType: 'competition',
          },
          transaction,
        });

        for (const entry of eventEntries) {
          await entry.destroy({ transaction });
        }

        await dbDraw.destroy({ transaction });
      }
    }

    // queue the new sub events
    for (const xmlSubEvent of draws) {
      const existingDraw = existing.find((r) => `${r.visualCode}` === `${xmlSubEvent.Code}`);
      // update sub events
      const drawJob = await this._syncQueue.add(Sync.ProcessSyncCompetitionDraw, {
        transactionId,
        subEventId: subEvent.id,
        eventCode,
        drawCode: xmlSubEvent.Code,
        drawId: existingDraw?.id,
        rankingSystemId,
        options,
        games: existingDraw?.encounters,
      });

      this._transactionManager.addJob(transactionId, drawJob);
    }
  }

  private getEventType(xmlEvent: XmlTournamentEvent): SubEventTypeEnum | undefined {
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
        this.logger.warn(`No event type found for GenderID: ${xmlEvent.GenderID}`);
        return;
    }
  }
}
