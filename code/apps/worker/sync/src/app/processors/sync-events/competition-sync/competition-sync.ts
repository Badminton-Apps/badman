import { Logger } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { Processor, ProcessStep } from '../../../processing';
import { VisualService } from '../../../services';
import { XmlTournament } from '../../../utils';
import {
  CompetitionSyncDrawProcessor,
  CompetitionSyncEncounterProcessor,
  CompetitionSyncEventProcessor,
  CompetitionSyncGameProcessor,
  CompetitionSyncPlayerProcessor,
  CompetitionSyncPointProcessor,
  CompetitionSyncStandingProcessor,
  CompetitionSyncSubEventProcessor,
} from './processors';

export class CompetitionSyncer {
  private readonly logger = new Logger(CompetitionSyncer.name);

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

  private _eventStep: CompetitionSyncEventProcessor;
  private _subEventStep: CompetitionSyncSubEventProcessor;
  private _drawStep: CompetitionSyncDrawProcessor;
  private _encounterStep: CompetitionSyncEncounterProcessor;
  private _playerStep: CompetitionSyncPlayerProcessor;
  private _gameStep: CompetitionSyncGameProcessor;
  private _pointStep: CompetitionSyncPointProcessor;
  private _standingStep: CompetitionSyncStandingProcessor;

  constructor(
    private visualService: VisualService,
    protected options?: {
      newGames?: boolean;
    }
  ) {
    this.options = {
      newGames: false,
      ...this.options,
    };

    this.processor = new Processor(null, { logger: this.logger });

    this.processor.addStep(this.getEvent());
    this.processor.addStep(this.addSubEvents());
    this.processor.addStep(this.addDraws());
    this.processor.addStep(this.addEncounters());
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
      lastRun: args.options.lastRun as Date,
    };

    this._eventStep = new CompetitionSyncEventProcessor(
      args.xmlTournament,
      this.visualService,
      options
    );

    this._subEventStep = new CompetitionSyncSubEventProcessor(
      args.xmlTournament,
      this.visualService,
      options
    );
    this._drawStep = new CompetitionSyncDrawProcessor(
      args.xmlTournament,
      this.visualService,
      options
    );

    this._encounterStep = new CompetitionSyncEncounterProcessor(
      args.xmlTournament,
      this.visualService,
      { ...options, newGames: this.options.newGames }
    );

    this._playerStep = new CompetitionSyncPlayerProcessor(
      args.xmlTournament,
      this.visualService,
      options
    );

    this._gameStep = new CompetitionSyncGameProcessor(
      args.xmlTournament,
      this.visualService,
      options
    );

    this._pointStep = new CompetitionSyncPointProcessor(options);
    this._standingStep = new CompetitionSyncStandingProcessor({
      ...options,
      newGames: this.options.newGames,
    });

    return this.processor.process();
  }

  protected getEvent(): ProcessStep {
    return new ProcessStep(this.STEP_EVENT, async () => {
      // Process step
      const data = await this._eventStep.process();

      // Pass data to other steps
      this._subEventStep.event = data.event;
      this._subEventStep.existed = data.existed;
      this._encounterStep.event = data.event;
      this._pointStep.event = data.event;
    });
  }

  protected addSubEvents(): ProcessStep {
    return new ProcessStep(this.STEP_SUBEVENT, async () => {
      // Process step
      const data = await this._subEventStep.process();

      // Pass data to other steps
      this._drawStep.subEvents = data;
    });
  }

  protected addDraws(): ProcessStep {
    return new ProcessStep(this.STEP_DRAW, async () => {
      // Process step
      const data = await this._drawStep.process();

      // Pass data to other steps
      this._encounterStep.draws = data;
      this._standingStep.draws = data;
    });
  }

  protected addEncounters(): ProcessStep {
    return new ProcessStep(this.STEP_ENCOUNTER, async () => {
      // Process step
      const data = await this._encounterStep.process();

      // Pass data to other steps
      this._gameStep.encounters = data;
      this._standingStep.encounters = data;
    });
  }

  protected updateStanding(): ProcessStep {
    return new ProcessStep(this.STEP_STANDING, async () => {
      // Process step
      await this._standingStep.process();
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
}
