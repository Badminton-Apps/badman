import {
  AuthenticatedRequest,
  DataBaseHandler,
  EventType,
  logger,
  BaseController
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
    private _databaseService: DataBaseHandler,
    private _converter: Convertor
  ) {
    super(router, authRouter);

    this._intializeRoutes();
  }

  private _intializeRoutes() {
    this.authRouter.post(`${this._path}/file`, this._upload.array('upload'), this._import);
    this.authRouter.put(`${this._path}/start/:id/:eventId`, this._startImport);
  }

  private _import = async (request: AuthenticatedRequest, response: Response) => {
    if (!request.user.hasAnyPermission(['import:event'])) {
      response.status(401).send('No no no!!');
      return;
    }

    const basicInfo = [];

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
            type = EventType.COMPETITION_CP;
            break;
          case 'xml':
            type = EventType.COMPETITION_XML;
            break;
          case 'tp':
            type = EventType.TOERNAMENT;
            break;
          default:
            logger.warn(`Unsupported file type: ${file.filename.split('.').pop()}`);
        }

        const importedFile = await this._converter.basicInfo(fileLocation, type);

        basicInfo.push(importedFile.toJSON());
      }

      response.status(200);
      response.send(basicInfo);
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
    if (!request.user.hasAnyPermission(['import:event'])) {
      response.status(401).send('No no no!!');
      return;
    }

    try {
      const imported = await this._databaseService.getImported({
        where: { id: parseInt(request.params.id, 10) }
      });

      if (!imported) {
        response.status(404);
        return;
      }

      const event = await this._databaseService.getEvent({
        where: { id: parseInt(request.params.eventId, 10) }
      });

      this._converter.convert(imported, event);

      response.json({});
    } catch (e) {
      response.status(500);
      response.render('error', { error: e });
      return;
    }
  };
}
