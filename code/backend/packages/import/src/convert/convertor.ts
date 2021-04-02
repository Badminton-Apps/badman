import {
  DataBaseHandler,
  EventCompetition,
  EventImportType,
  EventTournament,
  EventType,
  ImporterFile,
  logger
} from '@badvlasim/shared';
import { EventEmitter } from 'events';
import { unlink } from 'fs';
import { Transaction } from 'sequelize';
import {} from '../import';
import {
  CompetitionCpProcessor,
  CompetitionXmlProcessor,
  TournamentTpProcessor
} from '../import/processors';
import { Mdb } from './mdb';

export class Convertor {
  private _queue = [];
  private _queueRunning = false;
  private _parallel = 1;
  private competitionXmlProcessor: CompetitionXmlProcessor;
  private competitionCpProcessor: CompetitionCpProcessor;
  private tournamentTpProcessor: TournamentTpProcessor;

  constructor(private _importEmitter = new EventEmitter()) {
    this._setupQueue();

    this.competitionXmlProcessor = new CompetitionXmlProcessor();
    this.competitionCpProcessor = new CompetitionCpProcessor();
    this.tournamentTpProcessor = new TournamentTpProcessor();
  }

  private _setupQueue() {
    this._importEmitter.on(
      'add_to_convert_queue',
      async (imported: ImporterFile, event: EventCompetition | EventTournament) => {
        if (!this._queue.find(r => r.imported.id === imported.id)) {
          imported.importing = true;
          await imported.save();
          logger.debug(`Added ${imported.id} to queue`);
          this._queue.push({ imported, event });
        }

        // Queuue is not running
        if (!this._queueRunning) {
          // Mark queue as running
          this._queueRunning = true;

          // wait a bit, so we can directly process multiple if more then one is started
          await this._sleep(Math.floor(Math.random() * Math.floor(500)));

          // Process items
          while (this._queue.length > 0) {
            await Promise.all(
              Array(this._parallel)
                .fill(_ => null)
                .map(r => {
                  if (this._queue.length > 0) {
                    return this._processSingleItem(this._queue.shift());
                  }
                })
            );
          }
          logger.debug(`Finished processing all`);

          // Mark queue as finshed
          this._queueRunning = false;
        }
      }
    );
  }

  private async _processSingleItem(item: {
    imported: ImporterFile;
    event: EventCompetition | EventTournament;
  }) {
    try {
      logger.debug(`Started processing ${item.imported.id}`);

      // Sleep random 500ms for preventing deadlocks on start at the same time
      await this._sleep(Math.floor(Math.random() * Math.floor(500)));
      const t = await DataBaseHandler.sequelizeInstance.transaction();
      try {
        await this._convertItem(item.imported, item.event, t);
        await t.commit();
      } catch (e) {
        await t.rollback();
        throw e;
      }

      await new Promise((res, reject) => {
        try {
          // When imported, delete file
          unlink(item.imported.fileLocation, async () => {
            // alright, now we can destroy our db entry
            await item.imported.destroy();
            logger.debug(`Finished processing ${item.imported.id}`);
            res(null);
          });
        } catch (e) {
          logger.error('Something went deleting the imported stuff', e);
          // just continue
          res(null);
        }
      });
    } catch (e) {
      item.imported.importing = false;
      await item.imported.save();
      logger.error('Something went wrong', e);
    }
  }

  convert(imported: ImporterFile, event: EventCompetition | EventTournament) {
    this._importEmitter.emit('add_to_convert_queue', imported, event);
  }

  private async _convertItem(
    imported: ImporterFile,
    event: EventCompetition | EventTournament,
    transaction: Transaction
  ) {
    switch (imported.type) {
      case EventImportType.TOURNAMENT:
        return this.tournamentTpProcessor.import(imported, {
          transaction,
          event: event as EventTournament
        });

      case EventImportType.COMPETITION_CP:
        return this.competitionCpProcessor.import(imported, {
          transaction,
          event: event as EventCompetition
        });

      case EventImportType.COMPETITION_XML:
        return this.competitionXmlProcessor.import(imported, {
          transaction,
          event: event as EventCompetition
        });
      default:
        logger.warn('Unsupperted type', imported.type);
        return null;
    }
  }

  async basicInfo(fileLocation: string, type: EventImportType, transaction: Transaction) {
    switch (type) {
      case EventImportType.TOURNAMENT:
        return this.tournamentTpProcessor.importFile(fileLocation, transaction);
      case EventImportType.COMPETITION_CP:
        return this.competitionCpProcessor.importFile(fileLocation, transaction);
      case EventImportType.COMPETITION_XML:
        return this.competitionXmlProcessor.importFile(fileLocation, transaction);
      default:
        logger.error('Unsupperted type', type);
        // throw new Error('Unsupperted type');
    }
  }
  private _sleep(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }
}
