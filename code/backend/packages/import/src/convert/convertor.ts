import { Event, EventType, ImporterFile, logger } from '@badvlasim/shared';
import { EventEmitter } from 'events';
import { unlink } from 'fs';
import { CompetitionCpImporter, CompetitionXmlImporter, TournamentImporter } from '../import';
import { Mdb } from './mdb';

export class Convertor {
  private _queue = [];
  private _queueRunning = false;

  constructor(
    private _importEmitter = new EventEmitter(),
    private _competitionCpImporter = new CompetitionCpImporter(),
    private _competitionXmlImporter = new CompetitionXmlImporter(),
    private _tournamentImporter = new TournamentImporter()
  ) {
    this._setupQueue();
  }

  private _setupQueue() {
    this._importEmitter.on('add_to_convert_queue', async (imported: ImporterFile, event: Event) => {
      imported.importing = true;
      await imported.save();

      logger.debug(`Added ${imported.id} to queue`);
      this._queue.push({ imported, event });

      // Queuue is not running
      if (!this._queueRunning) {
        // Mark queue as running
        this._queueRunning = true;

        // Process items
        while (this._queue.length > 0) {
          try {
            const item = this._queue.shift();
            logger.debug(`Started processing ${item.imported.id}`);

            await this._convertItem(item.imported, item.event);

            await new Promise((res, reject) => {
              try {
                // When imported, delete file
                unlink(item.imported.fileLocation, async () => {
                  // alright, now we can destroy our db entry
                  await item.imported.destroy();
                  logger.debug(`Finished processing ${item.imported.id}`);
                  res();
                });
              } catch (e) {
                logger.error('Something went deleting the imported stuff', e);
                reject(e);
              }
            });
          } catch (e) {
            imported.importing = false;
            await imported.save();
            logger.error('Something went wrong', e);
          }
        }

        // Mark queue as finshed
        this._queueRunning = false;
      }
    });
  }

  convert(imported: ImporterFile, event: Event) {
    this._importEmitter.emit('add_to_convert_queue', imported, event);
  }

  private async _convertItem(imported: ImporterFile, event: Event) {
    let mdb: Mdb;
    switch (imported.type) {
      case EventType.TOERNAMENT:
        mdb = new Mdb(imported.fileLocation);
        this._tournamentImporter.mdb = mdb;
        return this._tournamentImporter.addEvent(imported, event);
      case EventType.COMPETITION_CP:
        mdb = new Mdb(imported.fileLocation);
        this._competitionCpImporter.mdb = mdb;
        return this._competitionCpImporter.addEvent(imported, event);
      case EventType.COMPETITION_XML:
        return this._competitionXmlImporter.addEvent(imported, event);
      default:
        logger.warn('Unsupperted type', imported.type);
        return null;
    }
  }

  async basicInfo(fileLocation: string, type: EventType) {
    let mdb: Mdb;
    switch (type) {
      case EventType.TOERNAMENT:
        mdb = new Mdb(fileLocation);
        this._tournamentImporter.mdb = mdb;
        return this._tournamentImporter.addImporterfile(fileLocation);
      case EventType.COMPETITION_CP:
        mdb = new Mdb(fileLocation);
        this._competitionCpImporter.mdb = mdb;
        return this._competitionCpImporter.addImporterfile(fileLocation);
      case EventType.COMPETITION_XML:
        return this._competitionXmlImporter.addImporterfile(fileLocation);
      default:
        logger.warn('Unsupperted type', type);
        return null;
    }
  }
}
