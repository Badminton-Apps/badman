import {
  AuthenticatedRequest,
  BaseController,
  DataBaseHandler,
  DrawCompetition,
  DrawTournament,
  EventCompetition,
  EventImportType,
  EventTournament,
  ImporterFile,
  logger,
  Player,
  RankingPlace,
  RankingPoint,
  RankingSystem,
  SubEventCompetition,
  SubEventTournament
} from '@badvlasim/shared';
import { Response, Router } from 'express';
import { unlink } from 'fs';
import multer, { diskStorage } from 'multer';
import { join } from 'path';
import { Convertor } from '../convert/convertor';
import { parseString } from '@fast-csv/parse';
import { readFile } from 'fs';
import { Op } from 'sequelize';
import moment from 'moment';

export class ImportController extends BaseController {
  private _path = '/import';

  private _storage = diskStorage({
    destination: (req, file, cb) => cb(null, './src/import/upload'),
    filename: (req, file, cb) => cb(null, `${Date.now()}_filename=${file.originalname}`)
  });
  private _upload = multer({ storage: this._storage });

  constructor(router: Router, private _authMiddleware: any, private _converter: Convertor) {
    super(router);

    this._intializeRoutes();
  }

  private _intializeRoutes() {
    this.router.post(
      `${this._path}/set-ranking`,
      this._authMiddleware,
      this._upload.array('upload'),
      this._setRanking
    );
    this.router.post(
      `${this._path}/file`,
      this._authMiddleware,
      this._upload.array('upload'),
      this._import
    );
    this.router.put(`${this._path}/start/:id/:eventId?`, this._authMiddleware, this._startImport);
  }

  private _setRanking = async (request: AuthenticatedRequest, response: Response) => {
    if (!request.user.hasAnyPermission(['import:competition', 'import:tournament'])) {
      response.status(401).send('No no no!!');
      return;
    }

    try {
      for (const file of request.files) {
        const fileLocation = join(process.cwd(), file.path);
        const date = moment(request.query.date as string).toDate();

        readFile(fileLocation, 'utf8', (err, csv) => {
          const stream = parseString(csv, { headers: true, delimiter: ';', ignoreEmpty: true }); 
          const data = new Map();
          stream.on('data', row => {
            if (row.Type == 'Competitiespeler') {
              data.set(row.Lidnummer, row);
            }
          });
          stream.on('error', error => {
            logger.error(error);
          });
          stream.on('end', async rowCount => {
            const transaction = await DataBaseHandler.sequelizeInstance.transaction();
            await Player.bulkCreate(
              [...data.values()].map(d =>
                new Player({
                  memberId: d.Lidnummer,
                  firstName: d.Voornaam,
                  lastName: d.Achternaam,
                  gender: d.Geslacht
                }).toJSON()
              ),  
              {
                ignoreDuplicates: true,
                transaction
              }
            );

            const players = await Player.findAll({
              where: {
                memberId: { [Op.in]: [...data.keys()] }
              },
              transaction
            });

            // Set all players as non-competition players
            await Player.update(
              { competitionPlayer: false }, 
              {
                where: {},
                transaction
              }
            );

            // Set new players as competition players
            await Player.update(
              { competitionPlayer: true },
              {
                where: {
                  [Op.in]: players.map(r => r.id)
                },
                transaction
              }
            );

            const system = await RankingSystem.findOne({ where: { primary: true }, transaction });
            await RankingPlace.bulkCreate(
              players.map(p => {
                const csvData = data.get(p.memberId);
                return new RankingPlace({
                  PlayerId: p.id,
                  SystemId: system.id,
                  single: +csvData['Index enkel'],
                  double: +csvData['Index dubbel'],
                  mix: +csvData['Index gemengd'],
                  rankingDate: date
                }).toJSON();
              }),
              { transaction }
            );

            await transaction.rollback();
          });
        });
      }

      response.status(200);
      response.send();
    } catch (e) {
      logger.error('Error getting basic info', e);

      request.files.forEach(file => {
        unlink(file.path, err => {
          if (err) throw new Error('File deletion failed');
          logger.debug('File delete');
        });
      });

      response.status(500);
      response.render('error', { error: e });
    }
  };
  private _import = async (request: AuthenticatedRequest, response: Response) => {
    if (!request.user.hasAnyPermission(['import:competition', 'import:tournament'])) {
      response.status(401).send('No no no!!');
      return;
    }

    try {
      for (const file of request.files) {
        const fileLocation = join(process.cwd(), file.path);
        let type;

        switch (
          file.filename
            .toLowerCase()
            .split('.')
            .pop()
        ) {
          case 'cp':
            type = EventImportType.COMPETITION_CP;
            break;
          case 'xml':
            type = EventImportType.COMPETITION_XML;
            break;
          case 'tp':
            type = EventImportType.TOURNAMENT;
            break;
          default:
            logger.warn(`Unsupported file type: ${file.filename.split('.').pop()}`);
        }
        const t = await DataBaseHandler.sequelizeInstance.transaction();
        try {
          await this._converter.basicInfo(fileLocation, type, t);
          await t.commit();
        } catch (e) {
          await t.rollback();
          throw e;
        }
      }

      response.status(200);
      response.send();
    } catch (e) {
      logger.error('Error getting basic info', e);

      request.files.forEach(file => {
        unlink(file.path, err => {
          if (err) throw new Error('File deletion failed');
          logger.debug('File delete');
        });
      });

      response.status(500);
      response.render('error', { error: e });
    }
  };

  private _startImport = async (request: AuthenticatedRequest, response: Response) => {
    if (!request.user.hasAnyPermission(['import:competition', 'import:tournament'])) {
      response.status(401).send('No no no!!');
      return;
    }

    try {
      let queueImports: { importId: string; eventId: string }[] = [];

      if (request.params.id.indexOf(',') >= 0) {
        const ids = request.params.id.split(',');
        const eventIds = request.params.eventId?.split(',') ?? [];
        queueImports = ids.map((v, i) => {
          return {
            importId: v,
            eventId: eventIds[i] && eventIds[i] !== '-1' ? eventIds[i] : null
          };
        });
      } else {
        queueImports = [
          {
            importId: request.params.id,
            eventId:
              request.params.eventId && request.params.eventId !== '-1'
                ? request.params.eventId
                : null
          }
        ];
      }

      for (const queImport of queueImports) {
        const imported = await ImporterFile.findOne({
          where: { id: queImport.importId }
        });

        if (!imported) {
          return;
        }
        let event: EventTournament | EventCompetition = null;

        if (queImport.eventId) {
          if (imported.type === EventImportType.TOURNAMENT) {
            event = await EventTournament.findOne({
              where: { id: queImport.eventId },
              include: [{ model: SubEventTournament, include: [{ model: DrawTournament }] }]
            });
          } else {
            event = await EventCompetition.findOne({
              where: { id: queImport.eventId },
              include: [{ model: SubEventCompetition, include: [{ model: DrawCompetition }] }]
            });
          }
        }

        this._converter.convert(imported, event);
      }

      response.json({});
    } catch (e) {
      response.status(500);
      response.send({ error: e });
      return;
    }
  };
}
