import {
  EventCompetition,
  RankingGroup,
  RankingSystem,
  SubEventCompetition,
} from '@badman/backend-database';
import { StepOptions, StepProcessor } from '../../../../processing';

import { Logger, NotFoundException } from '@nestjs/common';
import { SubEventStepData } from './subEvent';
import { runParrallel } from '@badman/utils';

export class CompetitionSyncRankingProcessor extends StepProcessor {
  public event?: EventCompetition;
  public subEvents?: SubEventStepData[];

  constructor(options?: StepOptions) {
    if (!options) {
      options = {};
    }

    options.logger =
      options.logger || new Logger(CompetitionSyncRankingProcessor.name);
    super(options);
  }

  public async process() {
    if (!this.event) {
      throw new NotFoundException(`${EventCompetition.name} not found`);
    }

    const primary = await RankingSystem.findOne({
      where: { primary: true },
      transaction: this.transaction,
    });

    if (!primary) {
      return;
    }

    const groups = await primary.getRankingGroups({
      transaction: this.transaction,
    });

    if (groups?.length === 0) {
      return;
    }

    this.event.official = true;
    await this.event.save({ transaction: this.transaction });

    await runParrallel(
      this.subEvents?.map((e) => this._addRankingGroups(e, groups)) ?? []
    );
  }

  private async _addRankingGroups(
    {
      subEvent,
    }: {
      subEvent: SubEventCompetition;
      internalId: number;
    },
    groups: RankingGroup[]
  ) {
    await subEvent.addRankingGroups(groups, { transaction: this.transaction });
  }
}
