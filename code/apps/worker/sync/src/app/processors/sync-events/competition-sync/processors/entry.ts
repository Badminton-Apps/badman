import {
  EventCompetition,
  SubEventCompetition,
  Team,
} from '@badman/backend/database';
import { isArray } from 'class-validator';
import { Op } from 'sequelize';
import { StepOptions, StepProcessor } from '../../../../processing';
import { VisualService } from '@badman/backend/visual';
import { correctWrongTeams, XmlItem, XmlTournament } from '../../../../utils';
import { DrawStepData } from './draw';

export class EntryProcessor extends StepProcessor {
  public draws: DrawStepData[];

  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly visualService: VisualService,
    options?: StepOptions
  ) {
    super(options);
  }

  public async process(): Promise<void> {
    await Promise.all(this.draws.map((e) => this._processEntries(e)));
  }

  private async _processEntries({ draw, internalId }: DrawStepData) {
    const subEvent = await draw.getSubEventCompetition({
      transaction: this.transaction,
    });
    const subEventEntries = await subEvent.getEventEntries({
      include: [{ model: Team }],
      transaction: this.transaction,
    });

    const xmlDraw = await this.visualService.getDraw(
      this.visualTournament.Code,
      internalId
    );

    if (!xmlDraw) {
      return;
    }

    if (!isArray(xmlDraw.Structure.Item)) {
      xmlDraw.Structure.Item = [xmlDraw.Structure.Item as XmlItem];
    }

    for (const item of xmlDraw.Structure.Item as XmlItem[]) {
      if (item.Team?.Name) {
        const teamName = correctWrongTeams({ name: item.Team?.Name })?.name;

        let entry = subEventEntries.find((r) => r.team.name === teamName);

        if (!entry) {
          if (teamName === null || teamName === undefined) {
            this.logger.warn(`Team not filled`);
            return null;
          }

          const where: { [key: string]: unknown } = {
            name: {
              [Op.iLike]: teamName,
            },
            active: true,
          };

          const foundTeam = await Team.findAll({
            where,
            transaction: this.transaction,
          });

          if (foundTeam.length === 0) {
            this.logger.warn(`Team not found ${teamName}`);
            continue;
          }

          const year = (
            await subEvent.getEventCompetition({
              transaction: this.transaction,
            })
          ).startYear;

          if (foundTeam.length == 1) {
            const team = foundTeam[0];
            const entries = await this._getEntriesForTeam(team, year);

            if (entries.length === 0) {
              throw new Error(`Teams entry not found ${teamName} (${team.id})`);
            }

            if (entries.length > 1) {
              throw new Error(`Teams entry multiple found ${teamName}`);
            }

            entry = entries[0];
          } else {
            for (const team of foundTeam) {
              this.logger.debug(`Found multiple teams, trying ${team.name}`);
              const entries = await this._getEntriesForTeam(team, year);
              if (entries.length > 0) {
                entry = entries[0];
                break;
              }
            }

            if (!entry) {
              throw new Error(`Teams entry not found ${teamName}`);
            }
          }
        }

        if (!entry) {
          this.logger.warn(`Teams entry not found ${teamName}`);
        }

        await entry.setCompetitionDraw(draw, {
          transaction: this.transaction,
        });
      }
    }
  }

  private _getEntriesForTeam(team: Team, startYear: number) {
    return team.getEntries({
      transaction: this.transaction,
      include: [
        {
          required: true,
          model: SubEventCompetition,
          include: [
            {
              required: true,
              model: EventCompetition,
              where: {
                startYear: startYear,
              },
            },
          ],
        },
      ],
    });
  }
}
