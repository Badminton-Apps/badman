import { PointsService } from '@badman/backend-ranking';
import { VisualService, XmlTournament } from '@badman/backend-visual';
import { Logger } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { Processor, ProcessStep } from '../../../processing';
import {
  CompetitionSyncCleanupProcessor,
  CompetitionSyncDrawProcessor,
  CompetitionSyncEncounterProcessor,
  CompetitionSyncEncounterLocationProcessor,
  CompetitionSyncEventProcessor,
  CompetitionSyncGameProcessor,
  CompetitionSyncPlayerProcessor,
  CompetitionSyncPointProcessor,
  CompetitionSyncRankingProcessor,
  CompetitionSyncStandingProcessor,
  CompetitionSyncSubEventProcessor,
  CompetitionSyncEntryProcessor,
} from './processors';
import { EventCompetition } from '@badman/backend-database';

export class CompetitionSyncer {
  private readonly logger = new Logger(CompetitionSyncer.name);

  protected visualTournament?: XmlTournament;
  protected transaction?: Transaction;

  public readonly processor: Processor;

  readonly STEP_EVENT = 'event';
  readonly STEP_SUBEVENT = 'subevent';
  readonly STEP_RANKING = 'ranking';
  readonly STEP_DRAW = 'draw';
  readonly STEP_ENTRY = 'entry';
  readonly STEP_ENCOUNTER = 'encounter';
  readonly STEP_ENCOUNTER_LOCATION = 'encounter_location';
  readonly STEP_PLAYER = 'player';
  readonly STEP_GAME = 'game';
  readonly STEP_POINT = 'point';
  readonly STEP_STANDING = 'standing';
  readonly STEP_CLEANUP = 'cleanup';

  private _eventStep!: CompetitionSyncEventProcessor;
  private _subEventStep!: CompetitionSyncSubEventProcessor;
  private _rankingStep!: CompetitionSyncRankingProcessor;
  private _drawStep!: CompetitionSyncDrawProcessor;
  private _entryStep!: CompetitionSyncEntryProcessor;
  private _encounterStep!: CompetitionSyncEncounterProcessor;
  private _encounterLocationStep!: CompetitionSyncEncounterLocationProcessor;
  private _playerStep!: CompetitionSyncPlayerProcessor;
  private _gameStep!: CompetitionSyncGameProcessor;
  private _pointStep!: CompetitionSyncPointProcessor;
  private _standingStep!: CompetitionSyncStandingProcessor;
  private _cleanupStep!: CompetitionSyncCleanupProcessor;

  private event!: EventCompetition;

  constructor(
    private visualService: VisualService,
    private pointService: PointsService,
    protected options?: {
      newGames?: boolean;
    },
  ) {
    this.options = {
      newGames: false,
      ...this.options,
    };

    this.processor = new Processor(undefined, { logger: this.logger });

    this.processor.addStep(this.getEvent());
    this.processor.addStep(this.addSubEvents());
    this.processor.addStep(this.addRanking());
    this.processor.addStep(this.addDraws());
    this.processor.addStep(this.addEntries());
    this.processor.addStep(this.addEncounters());
    this.processor.addStep(this.addEncounterLocations());
    this.processor.addStep(this.addPlayers());
    this.processor.addStep(this.addGames());
    this.processor.addStep(this.addPoints());

    this.processor.addStep(this.updateStanding());
    this.processor.addStep(this.addCleanup());
  }

  async process(args: {
    transaction: Transaction;
    xmlTournament: XmlTournament;
    options?: { [key: string]: unknown };
  }) {
    const options = {
      transaction: args.transaction,
      lastRun: args.options?.lastRun as Date,
    };

    this._eventStep = new CompetitionSyncEventProcessor(
      args.xmlTournament,
      this.visualService,
      options,
    );

    this._subEventStep = new CompetitionSyncSubEventProcessor(
      args.xmlTournament,
      this.visualService,
      options,
    );

    this._rankingStep = new CompetitionSyncRankingProcessor(options);

    this._drawStep = new CompetitionSyncDrawProcessor(
      args.xmlTournament,
      this.visualService,
      options,
    );

    this._entryStep = new CompetitionSyncEntryProcessor(
      args.xmlTournament,
      this.visualService,
      options,
    );

    this._encounterStep = new CompetitionSyncEncounterProcessor(
      args.xmlTournament,
      this.visualService,
      { ...options, newGames: this.options?.newGames },
    );

    this._encounterLocationStep = new CompetitionSyncEncounterLocationProcessor({
      ...options,
    });

    this._playerStep = new CompetitionSyncPlayerProcessor(
      args.xmlTournament,
      this.visualService,
      options,
    );

    this._gameStep = new CompetitionSyncGameProcessor(
      args.xmlTournament,
      this.visualService,
      options,
    );

    this._pointStep = new CompetitionSyncPointProcessor(this.pointService, options);

    this._standingStep = new CompetitionSyncStandingProcessor({
      ...options,
      newGames: this.options?.newGames,
    });

    this._cleanupStep = new CompetitionSyncCleanupProcessor({
      ...options,
    });

    await this.processor.process();
    return {
      event: this.event,
    };
  }

  protected getEvent(): ProcessStep<unknown> {
    return new ProcessStep<unknown>(this.STEP_EVENT, async () => {
      // Process step
      const data = await this._eventStep.process();

      // set result event
      this.event = data.event;

      // Pass data to other steps
      this._subEventStep.event = data.event;
      this._subEventStep.existed = data.existed;
      this._encounterStep.event = data.event;
      this._pointStep.event = data.event;
      this._cleanupStep.event = data.event;
      this._rankingStep.event = data.event;
      this._encounterLocationStep.event = data.event;

      return data;
    });
  }

  protected addSubEvents(): ProcessStep<unknown> {
    return new ProcessStep<unknown>(this.STEP_SUBEVENT, async () => {
      // Process step
      const data = await this._subEventStep.process();

      // Pass data to other steps
      this._drawStep.subEvents = data;
      this._rankingStep.subEvents = data;
      return data;
    });
  }

  protected addRanking(): ProcessStep<unknown> {
    return new ProcessStep<unknown>(this.STEP_RANKING, async () => {
      // Process step
      await this._rankingStep.process();
    });
  }

  protected addDraws(): ProcessStep<unknown> {
    return new ProcessStep<unknown>(this.STEP_DRAW, async () => {
      // Process step
      const data = await this._drawStep.process();

      // Pass data to other steps
      this._entryStep.draws = data;
      this._encounterStep.draws = data;
      this._standingStep.draws = data;
      return data;
    });
  }

  protected addEntries(): ProcessStep<unknown> {
    return new ProcessStep<unknown>(this.STEP_ENTRY, async () => {
      // Process step
      const data = await this._entryStep.process();

      // Pass data to other steps
      this._encounterStep.entries = data;

      return data;
    });
  }

  protected addEncounters(): ProcessStep<unknown> {
    return new ProcessStep<unknown>(this.STEP_ENCOUNTER, async () => {
      // Process step
      const data = await this._encounterStep.process();

      // Pass data to other steps
      this._gameStep.encounters = data;
      this._standingStep.encounters = data;
      this._encounterLocationStep.encounters = data;
      return data;
    });
  }

  protected addEncounterLocations(): ProcessStep<unknown> {
    return new ProcessStep<unknown>(this.STEP_ENCOUNTER_LOCATION, async () => {
      // Process step
      await this._encounterLocationStep.process();
    });
  }

  protected updateStanding(): ProcessStep<unknown> {
    return new ProcessStep<unknown>(this.STEP_STANDING, async () => {
      // Process step
      const data = await this._standingStep.process();
      return data;
    });
  }

  protected addPlayers(): ProcessStep<unknown> {
    return new ProcessStep<unknown>(this.STEP_PLAYER, async () => {
      // Process step
      const data = await this._playerStep.process();

      // Pass data to other steps
      this._gameStep.players = data;
      return data;
    });
  }

  protected addGames(): ProcessStep<unknown> {
    return new ProcessStep<unknown>(this.STEP_GAME, async () => {
      // Process step
      const data = await this._gameStep.process();

      // Pass data to other steps
      this._standingStep.games = data;
      return data;
    });
  }

  protected addPoints(): ProcessStep<unknown> {
    return new ProcessStep<unknown>(this.STEP_POINT, async () => {
      // Process step
      const data = await this._pointStep.process();
      return data;
    });
  }

  protected addCleanup(): ProcessStep<unknown> {
    return new ProcessStep<unknown>(this.STEP_CLEANUP, async () => {
      // Process step
      const data = await this._cleanupStep.process();
      return data;
    });
  }
}
