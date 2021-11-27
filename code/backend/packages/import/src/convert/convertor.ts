import {
  DataBaseHandler,
  EventCompetition,
  EventImportType,
  EventTournament,
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

export class Convertor {
  private _queue = [];
  private _queueRunningCp = false;
  private _queueRunningTp = false;
  private _parallelCp = 1;
  private _parallelTp = 10;

  constructor(private _importEmitter = new EventEmitter()) {
    this._setupQueue();
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

        if (
          imported.type === EventImportType.COMPETITION_CP ||
          imported.type === EventImportType.COMPETITION_XML
        ) {
          // Queuue is not running
          if (!this._queueRunningCp) {
            // Mark queue as running
            this._queueRunningCp = true;

            // Process items
            while (this._queue.length > 0) {
              await Promise.all(
                Array(this._parallelCp)
                  .fill(() => null)
                  .map(() => {
                    if (this._queue.length > 0) {
                      return this._processSingleItem(this._queue.shift());
                    }
                  })
              );
            }
            logger.info(`Finished processing all`);

            // Mark queue as finshed
            this._queueRunningCp = false;
          }
        } else if (imported.type === EventImportType.TOURNAMENT) {
          // Queuue is not running
          if (!this._queueRunningTp) {
            // Mark queue as running
            this._queueRunningTp = true;

            // Process items
            while (this._queue.length > 0) {
              await Promise.all(
                Array(this._parallelTp)
                  .fill(() => null)
                  .map(() => {
                    if (this._queue.length > 0) {
                      return this._processSingleItem(this._queue.shift());
                    }
                  })
              );
            }
            logger.info(`Finished processing all`);

            // Mark queue as finshed
            this._queueRunningTp = false;
          }
        }
      }
    );
  }

  private async _processSingleItem(item: {
    imported: ImporterFile;
    event: EventCompetition | EventTournament;
  }) {
    try {
      logger.info(`Started processing ${item.imported.id}`);

      // Sleep random time for preventing deadlocks on start at the same time (will still occour but less)
      await this._sleep(Math.floor(Math.random() * Math.floor(1000)));
      const t = await DataBaseHandler.sequelizeInstance.transaction();
      try {
        await this._convertItem(item.imported, item.event, t);
        await t.commit();
      } catch (e) {
        logger.warn('convert failed, rolling back')
        await t.rollback();
        throw e;
      }

      await new Promise((res,) => {
        try {
          // When imported, delete file
          unlink(item.imported.fileLocation, async () => {
            // alright, now we can destroy our db entry
            await item.imported.destroy();
            logger.info(`Finished processing ${item.imported.id}`);
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
        return new TournamentTpProcessor().import(imported, {
          transaction,
          event: event as EventTournament
        });

      case EventImportType.COMPETITION_CP:
        return new CompetitionCpProcessor().import(imported, {
          transaction,
          event: event as EventCompetition
        });

      case EventImportType.COMPETITION_XML:
        return new CompetitionXmlProcessor().import(imported, {
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
        return new TournamentTpProcessor().importFile(fileLocation, transaction);
      case EventImportType.COMPETITION_CP:
        return new CompetitionCpProcessor().importFile(fileLocation, transaction);
      case EventImportType.COMPETITION_XML:
        return new CompetitionXmlProcessor().importFile(fileLocation, transaction);
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
