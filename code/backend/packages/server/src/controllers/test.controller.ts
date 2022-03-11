import { BaseController, EVENTS, SocketEmitter } from '@badvlasim/shared';
import { logger } from 'elastic-apm-node';
import { Request, Response, Router } from 'express';

export class TestController extends BaseController {
  private _path = '/test';

  constructor(router: Router) {
    super(router);
    this._intializeRoutes();
  }

  private _intializeRoutes() {
    this.router.get(`${this._path}/emit`, this._test);
  }

  private _test = async (request: Request, response: Response) => {
    try {
      const result = SocketEmitter.emit(EVENTS.GAME.GAME_FINISHED, {
        id: 'afa49d38-6fdc-48c6-86a1-0fb3f1090481',
        order: 5,
        gameType: 'S',
        linkType: 'competition',
        set1Team1: 21,
        set1Team2: 19,
        set2Team1: 23,
        set2Team2: 21,
        set3Team1: null,
        set3Team2: null,
        status: 'NORMAL',
        winner: 1,
        playedAt: '2022-02-20T19:00:00.000Z',
        players: [
          {
            id: '3868046f-70a9-4372-a50c-8de90167d4ee',
            slug: 'thomas-van-den-bossche',
            fullName: 'Thomas Van Den Bossche',
            team: 2,
            player: 1,
            rankingPlace: {
              id: 'fbffc53a-7069-4764-9a37-130cbab3259c',
              single: 9,
              double: 7,
              mix: 9,
              rankingDate: '2022-02-13T23:00:00.000Z'
            }
          },
          {
            id: 'd50dcaeb-3f91-4426-8694-122085b6a7eb',
            slug: 'wim-brondeel',
            fullName: 'Wim Brondeel',
            team: 1,
            player: 1,
            rankingPlace: {
              id: 'f64f9b45-2a8e-411f-9da0-5ccaf39e83c6',
              single: 10,
              double: 8,
              mix: 8,
              rankingDate: '2022-02-13T23:00:00.000Z'
            }
          }
        ]
      });
      response.send({ message: result ? 'roger-roger' : 'Nope' });
    } catch (e) {
      logger.error(e);
      response.send({ message: e.message });
    }
  };
}
