import { EventCompetition } from "@badman/backend-database";
import { VisualService, XmlTournament } from "@badman/backend-visual";
import { Logger } from "@nestjs/common";
import moment from "moment";
import { Op } from "sequelize";
import { StepOptions, StepProcessor } from "../../../../processing";

export interface EventStepData {
  stop: boolean;
  existed: boolean;
  event: EventCompetition;
  internalId: number;
}

export class CompetitionSyncEventProcessor extends StepProcessor {
  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly visualService: VisualService,
    options?: StepOptions
  ) {
    if (!options) {
      options = {};
    }
    options.logger = options.logger || new Logger(CompetitionSyncEventProcessor.name);
    super(options);
  }

  public async process(): Promise<EventStepData> {
    this.logger.debug(`Searching for ${this.visualTournament.Name}`);
    let event = await EventCompetition.findOne({
      where: {
        [Op.or]: [
          { name: `${this.visualTournament.Name}` },
          { visualCode: `${this.visualTournament.Code}` },
        ],
      },
      transaction: this.transaction,
    });
    let existed = true;

    if (!event) {
      existed = false;
      const visualTournament = await this.visualService.getTournament(this.visualTournament.Code);

      this.logger.debug(`EventCompetition ${visualTournament.Name} not found, creating`);
      event = new EventCompetition({
        name: visualTournament.Name,
        visualCode: visualTournament.Code,
        season: moment(visualTournament.StartDate).year(),
      });
    }
    // Later we will change the search function to use the tournament code
    else if (event.visualCode === null || event.visualCode !== this.visualTournament.Code) {
      event.visualCode = this.visualTournament.Code;
    }

    event.lastSync = new Date();
    await event.save({ transaction: this.transaction });

    const enlistingOpen =
      moment(event.openDate).diff(moment(), "days") > 0 &&
      moment(event.closeDate).diff(moment(), "days") < 0;

    if (enlistingOpen) {
      this.logger.debug(`EventCompetition ${event.name} is open, skipping processing`);
    }

    return {
      stop: enlistingOpen,
      existed,
      event,
      internalId: parseInt(this.visualTournament.Code, 10),
    };
  }
}
