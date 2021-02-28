import {
  DataBaseHandler,
  Event,
  EventImportType,
  EventType,
  ImporterFile,
  logger
} from '@badvlasim/shared';
import { EventEmitter } from 'events';
import { unlink } from 'fs';
import { Transaction } from 'sequelize/types';
import { CompetitionCpImporter, CompetitionXmlImporter, TournamentImporter } from '../import';
import { Mdb } from './mdb';

export class Convertor {
  private _queue = [];
  private _queueRunning = false;
  private _parallel = 25;

  constructor(private _importEmitter = new EventEmitter()) {
    this._setupQueue();
  }

  private _setupQueue() {
    this._importEmitter.on('add_to_convert_queue', async (imported: ImporterFile, event: Event) => {
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
        await this._sleep(2000);

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
    });
  }

  private async _processSingleItem(item: { imported: ImporterFile; event: Event }) {
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
          reject(e);
        }
      });
    } catch (e) {
      item.imported.importing = false;
      await item.imported.save();
      logger.error('Something went wrong', e);
    }
  }

  convert(imported: ImporterFile, event: Event) {
    this._importEmitter.emit('add_to_convert_queue', imported, event);
  }

  private async _convertItem(imported: ImporterFile, event: Event, transaction: Transaction) {
    let mdb: Mdb;
    switch (imported.type) {
      case EventImportType.TOERNAMENT:
        mdb = new Mdb(imported.fileLocation);
        const tournamentImporter = new TournamentImporter(mdb, transaction);
        return tournamentImporter.addEvent(imported, event);
      case EventImportType.COMPETITION_CP:
        mdb = new Mdb(imported.fileLocation);
        const competitionCpImporter = new CompetitionCpImporter(mdb, transaction);
        return competitionCpImporter.addEvent(imported, event);
      case EventImportType.COMPETITION_XML:
        const competitionXmlImporter = new CompetitionXmlImporter(transaction);
        return competitionXmlImporter.addEvent(imported, event);
      default:
        logger.warn('Unsupperted type', imported.type);
        return null;
    }
  }

  async basicInfo(fileLocation: string, type: EventImportType, transaction: Transaction) {
    let mdb: Mdb;
    switch (type) {
      case EventImportType.TOERNAMENT:
        mdb = new Mdb(fileLocation);
        const tournamentImporter = new TournamentImporter(mdb, transaction);
        return tournamentImporter.addImporterfile(fileLocation);
      case EventImportType.COMPETITION_CP:
        mdb = new Mdb(fileLocation);
        const competitionCpImporter = new CompetitionCpImporter(mdb, transaction);
        return competitionCpImporter.addImporterfile(fileLocation);
      case EventImportType.COMPETITION_XML:
        const competitionXmlImporter = new CompetitionXmlImporter(transaction);
        return competitionXmlImporter.addImporterfile(fileLocation);
      default:
        logger.error('Unsupperted type', type);
        throw new Error('Unsupperted type');
    }
  }
  private _sleep(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }
}
