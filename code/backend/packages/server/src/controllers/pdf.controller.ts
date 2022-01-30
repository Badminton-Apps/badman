import { BaseController, HandlebarService } from '@badvlasim/shared';
import { Request, Response, Router } from 'express';

export class PdfController extends BaseController {
  private _path = '/pdf';

  constructor(router: Router, private handlebarService: HandlebarService) {
    super(router);
    this._intializeRoutes();
  }

  private _intializeRoutes() {
    this.router.post(`${this._path}/team-assembly`, this._assembly);
  }

  private _assembly = async (request: Request, response: Response) => {
    const pdf = await this.handlebarService.getTeamAssemblyPdf(request.body);

    response.send(pdf);
  };
}
