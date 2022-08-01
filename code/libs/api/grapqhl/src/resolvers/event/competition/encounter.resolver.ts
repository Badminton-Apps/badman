import {
  Comment,
  DrawCompetition,
  EncounterChange,
  EncounterChangeDate,
  EncounterChangeNewInput,
  EncounterCompetition,
  Game,
  Player,
  Team,
} from '@badman/api/database';
import { InjectQueue } from '@nestjs/bull';
import {
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  Mutation,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Queue } from 'bull';
import moment from 'moment';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize';
import { User } from '../../../decorators';
import { ListArgs } from '../../../utils';
import { Sync, SyncQueue } from '@badman/queue';
import {
  EncounterNotifications,
  NotificationService,
} from '@badman/notifications';

@ObjectType()
export class PagedEncounterCompetition {
  @Field()
  count: number;

  @Field(() => [EncounterCompetition])
  rows: EncounterCompetition[];
}

@Resolver(() => EncounterCompetition)
export class EncounterCompetitionResolver {
  private readonly logger = new Logger(EncounterCompetitionResolver.name);

  constructor(
    private _sequelize: Sequelize,
    @InjectQueue(SyncQueue) private syncQueue: Queue,
    private notificationService: NotificationService
  ) {}

  @Query(() => EncounterCompetition)
  async encounterCompetition(
    @Args('id', { type: () => ID }) id: string
  ): Promise<EncounterCompetition> {
    let encounterCompetition = await EncounterCompetition.findByPk(id);

    if (!encounterCompetition) {
      encounterCompetition = await EncounterCompetition.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!encounterCompetition) {
      throw new NotFoundException(id);
    }
    return encounterCompetition;
  }

  @Query(() => PagedEncounterCompetition)
  async encounterCompetitions(
    @Args() listArgs: ListArgs
  ): Promise<{ count: number; rows: EncounterCompetition[] }> {
    return EncounterCompetition.findAndCountAll(
      ListArgs.toFindOptions(listArgs)
    );
  }

  @ResolveField(() => DrawCompetition)
  async drawCompetition(
    @Parent() encounter: EncounterCompetition
  ): Promise<DrawCompetition> {
    return encounter.getDrawCompetition();
  }

  @ResolveField(() => Team)
  async home(@Parent() encounter: EncounterCompetition): Promise<Team> {
    return encounter.getHome();
  }

  @ResolveField(() => Team)
  async away(@Parent() encounter: EncounterCompetition): Promise<Team> {
    return encounter.getAway();
  }

  @ResolveField(() => EncounterChange)
  async encounterChange(
    @Parent() encounter: EncounterCompetition
  ): Promise<EncounterChange> {
    return encounter.getEncounterChange();
  }

  @ResolveField(() => [Game])
  async games(@Parent() encounter: EncounterCompetition): Promise<Game[]> {
    return encounter.getGames();
  }

  @Mutation(() => Boolean)
  async addChangeEncounter(
    @User() user: Player,
    @Args('data') newChangeEncounter: EncounterChangeNewInput
  ): Promise<boolean> {
    const encounter = await EncounterCompetition.findByPk(
      newChangeEncounter.encounterId
    );
    const team = newChangeEncounter.home
      ? await encounter.getHome()
      : await encounter.getAway();

    if (
      !user.hasAnyPermission([
        `${team.clubId}_change:encounter`,
        'change-any:encounter',
      ])
    ) {
      throw new UnauthorizedException(
        `You do not have permission to edit this club`
      );
    }
    const transaction = await this._sequelize.transaction();
    let encounterChange: EncounterChange;

    try {
      // Check if encounter has change
      encounterChange = await encounter.getEncounterChange({ transaction });

      // If not create a new one
      if (encounterChange === null || encounterChange === undefined) {
        encounterChange = new EncounterChange({
          encounterId: encounter.id,
        });
      }

      const dates = await encounterChange.getDates();
      await encounterChange.save({ transaction });

      // Set the state
      if (newChangeEncounter.accepted) {
        const selectedDates = newChangeEncounter.dates.filter(
          (r) => r.selected === true
        );
        if (selectedDates.length !== 1) {
          // Multiple dates were selected
          throw new Error('Multiple dates selected');
        }
        // Copy original date
        if (encounter.originalDate === null) {
          encounter.originalDate = encounter.date;
        }
        // Set date to the selected date
        encounter.date = selectedDates[0].date;

        // Accept
        await this.syncQueue.add(
          Sync.ChangeDate,
          {
            encounterId: encounter.id,
          },
          {
            removeOnComplete: true,
          }
        );

        // Save cahnges
        encounter.save({ transaction });

        // Destroy the requets
        await encounterChange.destroy({ transaction });
      } else {
        await this.changeOrUpdate(
          encounterChange,
          newChangeEncounter,
          transaction,
          user,
          team,
          dates
        );
      }

      // find if any date was selected
      await transaction.commit();
    } catch (e) {
      this.logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }

    // Notify the user
    if (newChangeEncounter.accepted) {
      this.notificationService.notify(EncounterNotifications.accepted, {
        changeRequest: encounterChange,
      });
    } else {
      this.notificationService.notify(EncounterNotifications.requested, {
        changeRequest: encounterChange,
        homeTeamRequests: newChangeEncounter.home,
      });
    }

    return true;
  }

  // @Mutation(returns => Boolean)
  // async removeEncounterCompetition(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }

  private async changeOrUpdate(
    encounterChange: EncounterChange,
    change: EncounterChangeNewInput,
    transaction: Transaction,
    player: Player,
    team: Team,
    existingDates: EncounterChangeDate[]
  ) {
    encounterChange.accepted = false;

    let comment: Comment;
    if (change.home) {
      comment = await encounterChange.getHomeComment({ transaction });

      if (comment === null) {
        comment = new Comment({
          playerId: player?.id,
          clubId: team.clubId,
        });

        await encounterChange.setHomeComment(comment, { transaction });
      }
    } else {
      comment = await encounterChange.getAwayComment({ transaction });
      if (comment === null) {
        comment = new Comment({
          playerId: player?.id,
          clubId: team.clubId,
        });
        await encounterChange.setAwayComment(comment, { transaction });
      }
    }

    comment.message = change.comment?.message;
    await comment.save({ transaction });

    change.dates = change.dates
      .map((r) => {
        const parsedDate = moment(r.date);
        r.date = parsedDate.isValid() ? parsedDate.toDate() : null;
        return r;
      })
      .filter((r) => r.date !== null);

    // Add new dates
    for (const date of change.dates) {
      // Check if the encounter has alredy a change for this date
      let encounterChangeDate = existingDates.find(
        (r) => r.date.getTime() === date.date.getTime()
      );

      // If not create new one
      if (!encounterChangeDate) {
        encounterChangeDate = new EncounterChangeDate({
          date: date.date,
          encounterChangeId: encounterChange.id,
        });
      }

      // Set the availibily to the date
      if (change.home) {
        encounterChangeDate.availabilityHome = date.availabilityHome;
      } else {
        encounterChangeDate.availabilityAway = date.availabilityAway;
      }

      // Save the date
      await encounterChangeDate.save({ transaction });
    }

    // Remove dates in the change request but not in existing dates
    for (const date of existingDates) {
      if (!change.dates.find((r) => r.date.getTime() === date.date.getTime())) {
        await date.destroy({ transaction });
      }
    }
  }
}
