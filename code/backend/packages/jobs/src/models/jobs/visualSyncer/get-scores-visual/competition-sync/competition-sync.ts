import { Processor, ProcessStep, XmlTournament } from '@badvlasim/shared';
import { Transaction } from 'sequelize';
import { VisualService } from '../../../../../utils/visualService';
import {
  CompetitionSyncDrawProcessor,
  CompetitionSyncEncounterProcessor,
  CompetitionSyncEventProcessor,
  CompetitionSyncGameProcessor,
  CompetitionSyncPlayerProcessor,
  CompetitionSyncSubEventProcessor
} from './processors';

export class CompetitionSyncer {
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

  private _eventStep: CompetitionSyncEventProcessor;
  private _subEventStep: CompetitionSyncSubEventProcessor;
  private _drawStep: CompetitionSyncDrawProcessor;
  private _encounterStep: CompetitionSyncEncounterProcessor;
  private _playerStep: CompetitionSyncPlayerProcessor;
  private _gameStep: CompetitionSyncGameProcessor;

  constructor() {
    this.processor = new Processor();
    this.visualService = new VisualService();

    this.processor.addStep(this.getEvent());
    this.processor.addStep(this.addSubEvents());
    this.processor.addStep(this.addDraws());
    this.processor.addStep(this.addEncounters());
    this.processor.addStep(this.addPlayers());
    this.processor.addStep(this.addGames());
  }

  process(args: { transaction: Transaction; xmlTournament: XmlTournament }) {
    this._eventStep = new CompetitionSyncEventProcessor(
      args.xmlTournament,
      args.transaction,
      this.visualService
    );
    this._subEventStep = new CompetitionSyncSubEventProcessor(
      args.xmlTournament,
      args.transaction,
      this.visualService
    );
    this._drawStep = new CompetitionSyncDrawProcessor(
      args.xmlTournament,
      args.transaction,
      this.visualService
    );

    this._encounterStep = new CompetitionSyncEncounterProcessor(
      args.xmlTournament,
      args.transaction,
      this.visualService
    );

    this._playerStep = new CompetitionSyncPlayerProcessor(
      args.xmlTournament,
      args.transaction,
      this.visualService
    );

    this._gameStep = new CompetitionSyncGameProcessor(
      args.xmlTournament,
      args.transaction,
      this.visualService
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
      this._encounterStep.event = data.event;
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
    });
  }

  protected addEncounters(): ProcessStep {
    return new ProcessStep(this.STEP_ENCOUNTER, async () => {
      // Process step
      const data = await this._encounterStep.process();

      // Pass data to other steps
      this._gameStep.encounters = data;
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
}
