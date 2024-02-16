import {
  EventTournament,
  RankingGroup,
  RankingSystem,
  SubEventTournament,
} from '@badman/backend-database';
import { StepOptions, StepProcessor } from '../../../../processing';

import { Logger, NotFoundException } from '@nestjs/common';
import { SubEventStepData } from './subEvent';
import { runParallel } from '@badman/utils';

export class TournamentSyncRankingProcessor extends StepProcessor {
  public event?: EventTournament;
  public subEvents?: SubEventStepData[];

  constructor(options?: StepOptions) {
    if (!options) {
      options = {};
    }

    options.logger = options.logger || new Logger(TournamentSyncRankingProcessor.name);
    super(options);
  }

  public async process() {
    if (!this.event) {
      throw new NotFoundException(`${EventTournament.name} not found`);
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

    await runParallel(this.subEvents?.map((e) => this._addRankingGroups(e, groups)) ?? []);
  }

  private async _addRankingGroups(
    {
      subEvent,
    }: {
      subEvent: SubEventTournament;
      internalId: number;
    },
    groups: RankingGroup[],
  ) {
    await subEvent.addRankingGroups(groups, { transaction: this.transaction });
  }
}
