import { Processor, ProcessStep, XmlTournament } from '@badvlasim/shared';
import { Transaction } from 'sequelize';
import { VisualService } from '../../../../../utils/visualService';
import {
  TournamentSyncDrawProcessor,
  TournamentSyncEventProcessor,
  TournamentSyncGameProcessor,
  TournamentSyncPlayerProcessor,
  TournamentSyncPointProcessor,
  TournamentSyncSubEventProcessor
} from './processors';

export class TournamentSyncer {
  protected visualTournament: XmlTournament;
  protected transaction: Transaction;

  public processor: Processor;
  public visualService: VisualService;

  readonly STEP_EVENT = 'event';
  readonly STEP_SUBEVENT = 'subevent';
  readonly STEP_DRAW = 'draw';
  readonly STEP_ENCOUNTER = 'encounter';
  readonly STEP_PLAYER = 'player';
  readonly STEP_GAME = 'game';
  readonly STEP_POINT = 'point';

  private _eventStep: TournamentSyncEventProcessor;
  private _subEventStep: TournamentSyncSubEventProcessor;
  private _drawStep: TournamentSyncDrawProcessor;
  private _playerStep: TournamentSyncPlayerProcessor;
  private _gameStep: TournamentSyncGameProcessor;
  private _pointStep: TournamentSyncPointProcessor;

  constructor() {
    this.processor = new Processor();
    this.visualService = new VisualService();

    this.processor.addStep(this.getEvent());
    this.processor.addStep(this.addSubEvents());
    this.processor.addStep(this.addDraws());
    this.processor.addStep(this.addPlayers());
    this.processor.addStep(this.addGames());
    this.processor.addStep(this.addPoints());
  }

  process(args: { transaction: Transaction; xmlTournament: XmlTournament }) {
    this._eventStep = new TournamentSyncEventProcessor(
      args.xmlTournament,
      args.transaction,
      this.visualService
    );
    this._subEventStep = new TournamentSyncSubEventProcessor(
      args.xmlTournament,
      args.transaction,
      this.visualService
    );
    this._drawStep = new TournamentSyncDrawProcessor(
      args.xmlTournament,
      args.transaction,
      this.visualService
    );

    this._playerStep = new TournamentSyncPlayerProcessor(
      args.xmlTournament,
      args.transaction,
      this.visualService
    );

    this._gameStep = new TournamentSyncGameProcessor(
      args.xmlTournament,
      args.transaction,
      this.visualService
    );

    this._pointStep = new TournamentSyncPointProcessor(
      args.transaction
    );

    return this.processor.process();
  }

  protected getEvent(): ProcessStep {
    return new ProcessStep(this.STEP_EVENT, async () => {
      // Process step
      const data = await this._eventStep.process();

      // Pass data to other steps
      this._subEventStep.event = data.event;
      this._subEventStep.existed = data.existed;
      this._pointStep.event = data.event;
      this._gameStep.event = data;
    });
  }

  protected addSubEvents(): ProcessStep {
    return new ProcessStep(this.STEP_SUBEVENT, async () => {
      // Process step
      const data = await this._subEventStep.process();

      // Pass data to other steps
      this._drawStep.subEvents = data;
      this._gameStep.subEvents = data;
    });
  }

  protected addDraws(): ProcessStep {
    return new ProcessStep(this.STEP_DRAW, async () => {
      // Process step
      const data = await this._drawStep.process();

      // Pass data to other steps
      this._gameStep.draws = data;
    });
  }

  protected addPlayers(): ProcessStep {
    return new ProcessStep(this.STEP_PLAYER, async () => {
      // Process step
      const data = await this._playerStep.process();

      // Pass data to other steps
      this._gameStep.players = data;
    });
  }

  protected addGames(): ProcessStep {
    return new ProcessStep(this.STEP_GAME, async () => {
      // Process step
      await this._gameStep.process();
    });
  }

  protected addPoints(): ProcessStep {
    return new ProcessStep(this.STEP_POINT, async () => {
      // Process step
      await this._pointStep.process();
    });
  }
}
