import { Processor, ProcessStep, XmlTournament } from '@badvlasim/shared';
import { Transaction } from 'sequelize';
import { VisualService } from '../../../../utils/visualService';
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

  private eventStep: CompetitionSyncEventProcessor;
  private subEventStep: CompetitionSyncSubEventProcessor;
  private drawStep: CompetitionSyncDrawProcessor;
  private encounterStep: CompetitionSyncEncounterProcessor;
  private playerStep: CompetitionSyncPlayerProcessor;
  private gameStep: CompetitionSyncGameProcessor;

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
    this.eventStep = new CompetitionSyncEventProcessor(
      args.xmlTournament,
      args.transaction,
      this.visualService
    );
    this.subEventStep = new CompetitionSyncSubEventProcessor(
      args.xmlTournament,
      args.transaction,
      this.visualService
    );
    this.drawStep = new CompetitionSyncDrawProcessor(
      args.xmlTournament,
      args.transaction,
      this.visualService
    );

    this.encounterStep = new CompetitionSyncEncounterProcessor(
      args.xmlTournament,
      args.transaction,
      this.visualService
    );

    this.playerStep = new CompetitionSyncPlayerProcessor(
      args.xmlTournament,
      args.transaction,
      this.visualService
    );

    this.gameStep = new CompetitionSyncGameProcessor(
      args.xmlTournament,
      args.transaction,
      this.visualService
    );

    return this.processor.process();
  }

  protected getEvent(): ProcessStep {
    return new ProcessStep(this.STEP_EVENT, async () => {
      // Process step
      const data = await this.eventStep.process();

      // Pass data to other steps
      this.subEventStep.event = data.event;
      this.subEventStep.existed = data.existed;
      this.encounterStep.event = data.event;
    });
  }

  protected addSubEvents(): ProcessStep {
    return new ProcessStep(this.STEP_SUBEVENT, async () => {
      // Process step
      const data = await this.subEventStep.process();

      // Pass data to other steps
      this.drawStep.subEvents = data;
    });
  }

  protected addDraws(): ProcessStep {
    return new ProcessStep(this.STEP_DRAW, async () => {
      // Process step
      const data = await this.drawStep.process();

      // Pass data to other steps
      this.encounterStep.draws = data;
    });
  }

  protected addEncounters(): ProcessStep {
    return new ProcessStep(this.STEP_ENCOUNTER, async () => {
      // Process step
      const data = await this.encounterStep.process();

      // Pass data to other steps
      this.gameStep.encounters = data;
    });
  }

  protected addPlayers(): ProcessStep {
    return new ProcessStep(this.STEP_PLAYER, async () => {
      // Process step
      const data = await this.playerStep.process();

      // Pass data to other steps
      this.gameStep.players = data;
    });
  }

  protected addGames(): ProcessStep {
    return new ProcessStep(this.STEP_GAME, async () => {
      // Process step
      await this.gameStep.process();
    });
  }
}
