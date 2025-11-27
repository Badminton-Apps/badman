import {
  DrawTournament,
  EventTournament,
  Game,
  SubEventTournament,
  EventEntry,
} from "@badman/backend-database";
import moment from "moment";
import { Op } from "sequelize";
import { StepOptions, StepProcessor } from "../../../../processing";
import { VisualService, XmlDrawTypeID, XmlTournament } from "@badman/backend-visual";
import { SubEventStepData } from "./subEvent";
import { DrawType } from "@badman/utils";
import { Logger, NotFoundException } from "@nestjs/common";

export interface DrawStepData {
  draw: DrawTournament;
  internalId: number;
}

export class TournamentSyncDrawProcessor extends StepProcessor {
  public event?: EventTournament;
  public subEvents?: SubEventStepData[];
  private _dbDraws: DrawStepData[] = [];

  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly visualService: VisualService,
    options: StepOptions
  ) {
    if (!options) {
      options = {};
    }

    options.logger = options.logger || new Logger(TournamentSyncDrawProcessor.name);
    super(options);
  }

  public async process(): Promise<DrawStepData[]> {
    // Process sequentially to avoid transaction conflicts when errors occur
    // If one subevent fails and invalidates the transaction, others won't try to use it
    for (const subEvent of this.subEvents ?? []) {
      await this._processDraws(subEvent);
    }
    return this._dbDraws;
  }

  private async _processDraws({
    subEvent,
    internalId,
  }: {
    subEvent: SubEventTournament;
    internalId: number;
  }) {
    if (!this.event) {
      throw new NotFoundException(`${EventTournament.name} not found`);
    }

    const draws = await subEvent.getDrawTournaments({
      transaction: this.transaction,
    });
    const canChange = moment().subtract(1, "month").isBefore(this.event.firstDay);
    const visualDraws = await this.visualService.getDraws(
      this.visualTournament.Code,
      internalId,
      !canChange
    );
    for (const xmlDraw of visualDraws) {
      if (!xmlDraw) {
        continue;
      }
      const dbDraws = draws.filter((r) => r.visualCode === `${xmlDraw.Code}`);
      let dbDraw = null;

      if (dbDraws.length === 1) {
        dbDraw = dbDraws[0];
      } else if (dbDraws.length > 1) {
        this.logger.warn("Having multiple? Removing old");

        // We have multiple encounters with the same visual code
        const [first, ...rest] = dbDraws;
        dbDraw = first;

        // Clean up EventEntries for the draws being removed
        const eventEntries = await EventEntry.findAll({
          where: {
            drawId: {
              [Op.in]: rest.map((e) => e.id),
            },
            entryType: "tournament",
          },
          transaction: this.transaction,
        });

        for (const entry of eventEntries) {
          await entry.destroy({ transaction: this.transaction });
        }

        await DrawTournament.destroy({
          where: {
            id: {
              [Op.in]: rest.map((e) => e.id),
            },
          },
          transaction: this.transaction,
        });
      }

      if (!dbDraw) {
        dbDraw = await new DrawTournament({
          subeventId: subEvent.id,
          visualCode: xmlDraw.Code,
          name: xmlDraw.Name,
          size: xmlDraw.Size,
          type:
            xmlDraw.TypeID === XmlDrawTypeID.Elimination
              ? DrawType.KO
              : xmlDraw.TypeID === XmlDrawTypeID.RoundRobin ||
                  xmlDraw.TypeID === XmlDrawTypeID.FullRoundRobin
                ? DrawType.POULE
                : DrawType.QUALIFICATION,
        }).save({ transaction: this.transaction });
      }
      this._dbDraws.push({
        draw: dbDraw,
        internalId: parseInt(xmlDraw.Code, 10),
      });
    }

    // Remove draw that have no visual code
    const removedDraws = draws.filter((i) => i.visualCode === null);
    for (const removed of removedDraws) {
      // Clean up EventEntries first
      const eventEntries = await EventEntry.findAll({
        where: {
          drawId: removed.id,
          entryType: "tournament",
        },
        transaction: this.transaction,
      });

      for (const entry of eventEntries) {
        await entry.destroy({ transaction: this.transaction });
      }

      const gameIds = (
        await Game.findAll({
          attributes: ["id"],
          where: {
            linkId: removed.id,
          },
          transaction: this.transaction,
        })
      )
        ?.map((g) => g.id)
        ?.filter((g) => !!g);

      if (gameIds && gameIds.length > 0) {
        await Game.destroy({
          where: {
            id: {
              [Op.in]: gameIds,
            },
          },
          transaction: this.transaction,
        });
      }
      await removed.destroy({ transaction: this.transaction });
    }
  }
}
