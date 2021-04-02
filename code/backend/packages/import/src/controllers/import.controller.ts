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
  SubEventCompetition,
  SubEventTournament
} from '@badvlasim/shared';
import { Response, Router } from 'express';
import { unlink } from 'fs';
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

  constructor(
    router: Router,
    authRouter: Router,
    private _converter: Convertor
  ) {
    super(router, authRouter);

    this._intializeRoutes();
  }

  private _intializeRoutes() {
    this.authRouter.post(`${this._path}/file`, this._upload.array('upload'), this._import);
    this.authRouter.put(`${this._path}/start/:id/:eventId?`, this._startImport);
  }

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
