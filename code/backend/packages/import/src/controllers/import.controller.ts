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
  LastRankingPlace,
  logger,
  Player,
  RankingPlace,
  RankingSystem,
  SubEventCompetition,
  SubEventTournament
} from '@badvlasim/shared';
import { parseString } from '@fast-csv/parse';
import { Response, Router } from 'express';
import { readFile, unlink } from 'fs';
import moment from 'moment';
import multer, { diskStorage } from 'multer';
import { join } from 'path';
import { Convertor } from '../convert/convertor';

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
            // if (row.TypeName === 'Competitiespeler') {
              data.set(row.memberid, row);
            // }
          });
          stream.on('error', error => {
            logger.error(error);
          });
          stream.on('end', async rowCount => {
            const transaction = await DataBaseHandler.sequelizeInstance.transaction();
            try {
              logger.info('Player indexes import started');
              await this._addPlayers(data, transaction);

              const memberIds = [...data.keys()];
              const players = await this._getPlayers(transaction, memberIds);
              await this._setCompetitionStatus(transaction, [...data.values()].filter(r => r.TypeName === "Competitiespeler").map(r => r.memberid));
              await this._createRankingPlaces(transaction, players, data, date);
              await this._createLastRankingPlaces(transaction, players, data, date);
              await transaction.commit();
              logger.info('Player indexes imported');
            } catch (e) {
              logger.error(e);
              await transaction.rollback();
              throw e;
            }
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

  private async _getPlayers(transaction, memberIds: any[]) {
    return Player.findAll({
      attributes: ['id', 'memberId'],
      where: {
        memberId: memberIds
      },
      transaction
    });
  }

  private async _createRankingPlaces(
    transaction,
    players: Player[],
    data: Map<any, any>,
    date: Date
  ) {
    const system = await RankingSystem.findOne({ where: { primary: true }, transaction });
    const newPlaces = players.map(p => {
      const csvData = data.get(p.memberId);
      if (csvData) {
        const single = parseInt(csvData.PlayerLevelSingle, 10) ?? null;
        const double = parseInt(csvData.PlayerLevelDouble, 10) ?? null;
        const mix = parseInt(csvData.PlayerLevelMixed, 10) ?? null;

        if (single && double && mix) {
          return new RankingPlace({
            PlayerId: p.id,
            SystemId: system.id,
            single,
            double,
            mix,
            updatePossible: true,
            rankingDate: date
          }).toJSON();
        }
      }
    });

    await RankingPlace.bulkCreate(newPlaces, {
      transaction,
      updateOnDuplicate: ['single', 'double', 'mix', 'rankingDate'],
      returning: false
    });
  }

  private async _createLastRankingPlaces(
    transaction,
    players: Player[],
    data: Map<any, any>,
    date: Date
  ) {
    const system = await RankingSystem.findOne({ where: { primary: true }, transaction });
    const newPlaces = players.map(p => {
      const csvData = data.get(p.memberId);
      if (csvData) {
        const single = parseInt(csvData.PlayerLevelSingle, 10) ?? null;
        const double = parseInt(csvData.PlayerLevelDouble, 10) ?? null;
        const mix = parseInt(csvData.PlayerLevelMixed, 10) ?? null;

        if (single && double && mix) {
          return new LastRankingPlace({
            playerId: p.id,
            systemId: system.id,
            single,
            double,
            mix,
            rankingDate: date
          }).toJSON();
        }
      }
    });

    await RankingPlace.bulkCreate(newPlaces, {
      transaction,
      updateOnDuplicate: ['single', 'double', 'mix', 'rankingDate'],
      returning: false
    });
  }

  private async _setCompetitionStatus(transaction, memberIds: any[]) {
    // Set all players as non-competition players
    await Player.update(
      { competitionPlayer: false },
      {
        where: {},
        returning: false,
        transaction
      }
    );

    // Set new players as competition players
    await Player.update(
      { competitionPlayer: true },
      {
        where: {
          memberId: memberIds
        },
        returning: false,
        transaction
      }
    );
  }

  private async _addPlayers(data: Map<any, any>, transaction) {
    await Player.bulkCreate(
      [...data.values()].map(d =>
        new Player({
          memberId: d.memberid,
          firstName: d.firstname,
          lastName: d.lastname,
          gender: d.gender
        }).toJSON()
      ),
      {
        ignoreDuplicates: true,
        returning: false,
        transaction
      }
    );
  }
}
