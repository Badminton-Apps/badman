import { Logger } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { Processor, ProcessStep } from '../../../processing';
import { VisualService } from '../../../services';
import { XmlTournament } from '../../../utils';
import {
  TournamentSyncDrawProcessor,
  TournamentSyncEventProcessor,
  TournamentSyncGameProcessor,
  TournamentSyncPlayerProcessor,
  TournamentSyncPointProcessor,
  TournamentSyncStandingProcessor,
  TournamentSyncSubEventProcessor
} from './processors';

export class TournamentSyncer {
  private readonly logger = new Logger(TournamentSyncer.name);
 
  protected visualTournament: XmlTournament;
  protected transaction: Transaction;

  public readonly processor: Processor;

  readonly STEP_EVENT = 'event';
  readonly STEP_SUBEVENT = 'subevent';
  readonly STEP_DRAW = 'draw';
  readonly STEP_ENCOUNTER = 'encounter';
  readonly STEP_PLAYER = 'player';
  readonly STEP_GAME = 'game';
  readonly STEP_POINT = 'point';
  readonly STEP_STANDING = 'standing';

  private _eventStep: TournamentSyncEventProcessor;
  private _subEventStep: TournamentSyncSubEventProcessor;
  private _drawStep: TournamentSyncDrawProcessor;
  private _playerStep: TournamentSyncPlayerProcessor;
  private _gameStep: TournamentSyncGameProcessor;
  private _pointStep: TournamentSyncPointProcessor;
  private _standingStep: TournamentSyncStandingProcessor;

  constructor(
    private visualService: VisualService,
    protected options?: {
      newGames?: boolean;
    }
  ) {
    this.options = {
      newGames: false,
      ...this.options
    };

    this.processor = new Processor(null, { logger: this.logger });

    this.processor.addStep(this.getEvent());
    this.processor.addStep(this.addSubEvents());
    this.processor.addStep(this.addDraws());
    this.processor.addStep(this.addPlayers());
    this.processor.addStep(this.addGames());
    this.processor.addStep(this.addPoints());

    this.processor.addStep(this.updateStanding());
  }

  process(args: {
    transaction: Transaction;
    xmlTournament: XmlTournament;
    options?: { [key: string]: unknown };
  }) {
    const options = {
      logger: this.logger,
      transaction: args.transaction,
      lastRun: args.options.lastRun as Date
    };

    this._eventStep = new TournamentSyncEventProcessor(
      args.xmlTournament,
      this.visualService,
      options
    );
    this._subEventStep = new TournamentSyncSubEventProcessor(
      args.xmlTournament,
      this.visualService,
      options
    );

    this._drawStep = new TournamentSyncDrawProcessor(
      args.xmlTournament,
      this.visualService,
      options
    );

    this._playerStep = new TournamentSyncPlayerProcessor(
      args.xmlTournament,
      this.visualService,
      options
    );

    this._gameStep = new TournamentSyncGameProcessor(args.xmlTournament, this.visualService, {
      ...options,
      newGames: this.options.newGames
    });

    this._pointStep = new TournamentSyncPointProcessor(options);
    this._standingStep = new TournamentSyncStandingProcessor({
      ...options,
      newGames: this.options.newGames
    });

    return this.processor.process();
  }

  protected getEvent(): ProcessStep {
    return new ProcessStep(this.STEP_EVENT, async () => {
      // Process step
      const data = await this._eventStep.process();

      // Pass data to other steps
      this._drawStep.event = data.event;
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
      this._standingStep.draws = data;
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
      const data = await this._gameStep.process();

      // Pass data to other steps
      this._standingStep.games = data;
    });
  }

  protected addPoints(): ProcessStep {
    return new ProcessStep(this.STEP_POINT, async () => {
      // Process step
      await this._pointStep.process();
    });
  }

  protected updateStanding(): ProcessStep {
    return new ProcessStep(this.STEP_STANDING, async () => {
      // Process step
      await this._standingStep.process();
    });
  }
}
