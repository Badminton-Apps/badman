import { AuthenticatedRequest, BaseController, logger, PdfService } from '@badvlasim/shared';
import { Response, Router, Request } from 'express';

export class PdfController extends BaseController {
  private _path = '/pdf';

  constructor(router: Router, private pdfService: PdfService) {
    super(router);
    this._intializeRoutes();
  }

  private _intializeRoutes() {
    this.router.get(`${this._path}/assembly`, this._assembly);
  }

  private _assembly = async (request: Request, response: Response) => {
    logger.debug('Hello?');
    const pdf = await this.pdfService.getTeamAssemblyPdf();

    response.contentType('application/pdf');
    response.send(pdf);
  };
}
