import {
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  Game,
  LevelType,
  logger,
  SubEventCompetition,
  SubEventType,
  XmlGenderID,
  XmlTournament
} from '@badvlasim/shared';
import moment, { Moment } from 'moment';
import { Op, Transaction } from 'sequelize';
import { EventStepData, SubEventStepData } from '.';
import { StepProcessor } from '../../../../../utils/step-processor';
import { VisualService } from '../../../../../utils/visualService';

export interface DrawStepData {
  draw: DrawCompetition;
  internalId: number;
}

export class CompetitionSyncDrawProcessor extends StepProcessor {
  public subEvents: SubEventStepData[];
  private dbDraws: DrawStepData[] = [];

  
  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly transaction: Transaction,
    protected readonly visualService: VisualService
  ) {
    super(visualTournament, transaction);
  }

  public async process(): Promise<DrawStepData[]> {
    await Promise.all(this.subEvents.map(e => this.processDraws(e)));
    return this.dbDraws;
  }

  private async processDraws({
    subEvent,
    internalId
  }: {
    subEvent: SubEventCompetition;
    internalId: number;
  }) {
    const draws = await subEvent.getDraws({ transaction: this.transaction });
    const visualDraws = await this.visualService.getDraws(this.visualTournament.Code, internalId);
    for (const xmlDraw of visualDraws) {
      if (!xmlDraw) {
        continue;
      }
      let dbDraw: DrawCompetition = draws.find(r => r.visualCode === `${xmlDraw.Code}`);

      if (!dbDraw) {
        dbDraw = await new DrawCompetition({
          visualCode: `${xmlDraw.Code}`,
          subeventId: subEvent.id,
          name: xmlDraw.Name,
          size: xmlDraw.Size
        }).save({ transaction: this.transaction });
      }

      this.dbDraws.push({ draw: dbDraw, internalId: parseInt(xmlDraw.Code, 10) });
    }

    // Remove draw that have no visual code
    const removedDraws = draws.filter(i => i.visualCode === null);
    for (const removed of removedDraws) {
      const gameIds = (
        await Game.findAll({
          attributes: ['id'],
          include: [
            {
              attributes: [],
              model: EncounterCompetition,
              required: true,
              where: {
                drawId: removed.id
              }
            }
          ],
          transaction: this.transaction
        })
      )
        ?.map(g => g.id)
        ?.filter(g => !!g);

      if (gameIds && gameIds.length > 0) {
        await Game.destroy({
          where: {
            id: {
              [Op.in]: gameIds
            }
          },
          transaction: this.transaction
        });
      }
      await removed.destroy({ transaction: this.transaction });
    }
  }
}
