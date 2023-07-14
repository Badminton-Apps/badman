import { User } from '@badman/backend-authorization';
import {
  Assembly,
  Comment,
  DrawCompetition,
  EncounterChange,
  EncounterChangeDate,
  EncounterChangeNewInput,
  EncounterCompetition,
  Game,
  Player,
  Location,
  Team,
  SubEventCompetition,
  EventCompetition,
} from '@badman/backend-database';
import { NotificationService } from '@badman/backend-notifications';
import { Sync, SyncQueue } from '@badman/backend-queue';
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
  Int,
  Mutation,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Queue } from 'bull';
import moment from 'moment-timezone';
import { Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ListArgs } from '../../../utils';

@ObjectType()
export class PagedEncounterCompetition {
  @Field(() => Int)
  count?: number;

  @Field(() => [EncounterCompetition])
  rows?: EncounterCompetition[];
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
    const encounterCompetition = await EncounterCompetition.findByPk(id);

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

  @ResolveField(() => Location)
  async location(@Parent() encounter: EncounterCompetition): Promise<Location> {
    return encounter.getLocation();
  }

  @ResolveField(() => Team)
  async home(@Parent() encounter: EncounterCompetition): Promise<Team> {
    return encounter.getHome();
  }

  @ResolveField(() => Team)
  async away(@Parent() encounter: EncounterCompetition): Promise<Team> {
    return encounter.getAway();
  }

  @ResolveField(() => [Assembly])
  async assemblies(
    @Parent() encounter: EncounterCompetition,
    @Args() listArgs: ListArgs
  ): Promise<Assembly[]> {
    return encounter.getAssemblies(ListArgs.toFindOptions(listArgs));
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

  @Mutation(() => EncounterChange)
  async addChangeEncounter(
    @User() user: Player,
    @Args('data') newChangeEncounter: EncounterChangeNewInput
  ): Promise<EncounterChange> {
    const encounter = await EncounterCompetition.findByPk(
      newChangeEncounter.encounterId
    );

    if (!encounter) {
      throw new NotFoundException(
        `${EncounterCompetition.name}: ${newChangeEncounter.encounterId}`
      );
    }

    const team = newChangeEncounter.home
      ? await encounter.getHome()
      : await encounter.getAway();

    if (
      !(await user.hasAnyPermission([
        `${team.clubId}_change:encounter`,
        'change-any:encounter',
      ]))
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
        await encounterChange.save({ transaction });
      }

      const dates = await encounterChange.getDates();

      // Set the state
      if (newChangeEncounter.accepted) {
        const selectedDates = newChangeEncounter.dates?.filter(
          (r) => r.selected === true
        );
        if (selectedDates?.length !== 1) {
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
            removeOnFail: false,
          }
        );

        // Save cahnges
        encounter.save({ transaction });
        encounterChange.accepted = true;
      } else {
        encounterChange.accepted = false;
      }
      await encounterChange.save({ transaction });
      this.logger.debug(
        `Change encounter ${encounter.id}: ${encounterChange.accepted}`
      );

      const draw = await encounter.getDrawCompetition({
        attributes: ['id'],
        include: [
          {
            model: SubEventCompetition,
            attributes: ['id'],
            include: [
              {
                model: EventCompetition,
                attributes: ['id', 'changeCloseRequestDate'],
              },
            ],
          },
        ],
      });

      // can request new dates in timezone europe/brussels

      const canRequestNewDates = moment
        .tz('europe/brussels')
        .isBefore(
          moment.tz(
            draw?.subEventCompetition?.eventCompetition?.changeCloseRequestDate,
            'europe/brussels'
          )
        );

      await this.changeOrUpdate(
        encounterChange,
        newChangeEncounter,
        transaction,
        dates,
        canRequestNewDates
      );

      // find if any date was selected
      await transaction.commit();
    } catch (e) {
      this.logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }

    // Notify the user
    if (newChangeEncounter.accepted) {
      this.notificationService.notifyEncounterChangeFinished(encounter);
    } else {
      this.notificationService.notifyEncounterChange(
        encounter,
        newChangeEncounter.home ?? false
      );
    }

    return encounterChange;
  }

  @ResolveField(() => [Comment], { nullable: true })
  async homeComments(
    @Parent() encounter: EncounterCompetition
  ): Promise<Comment[]> {
    return encounter.getHomeComments();
  }

  @ResolveField(() => [Comment], { nullable: true })
  async awayComments(
    @Parent() encounter: EncounterCompetition
  ): Promise<Comment[]> {
    return encounter.getAwayComments();
  }

  @ResolveField(() => [Comment], { nullable: true })
  async homeCommentsChange(
    @Parent() encounter: EncounterCompetition
  ): Promise<Comment[]> {
    return encounter.getHomeComments();
  }

  @ResolveField(() => [Comment], { nullable: true })
  async awayCommentsChange(
    @Parent() encounter: EncounterCompetition
  ): Promise<Comment[]> {
    return encounter.getAwayComments();
  }

  // @Mutation(returns => Boolean)
  // async removeEncounterCompetition(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }

  private async changeOrUpdate(
    encounterChange: EncounterChange,
    change: EncounterChangeNewInput,
    transaction: Transaction,
    existingDates: EncounterChangeDate[],
    canRequestNewDates: boolean
  ) {
    change.dates = change.dates
      ?.map((r) => {
        const parsedDate = moment(r.date);
        r.date = parsedDate.isValid() ? parsedDate.toDate() : undefined;
        return r;
      })
      .filter((r) => r.date !== undefined);

    // Add new dates
    for (const date of change.dates ?? []) {
      // Check if the encounter has alredy a change for this date
      let encounterChangeDate = existingDates.find(
        (r) => r.date?.getTime() === date.date?.getTime()
      );

      if (!encounterChangeDate && !canRequestNewDates) {
        throw new Error('Cannot request new dates');
      }

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

      encounterChangeDate.locationId = date.locationId;

      // Save the date
      await encounterChangeDate.save({ transaction });
    }

    // Remove dates in the change request but not in existing dates
    for (const date of existingDates) {
      if (
        !change.dates?.find((r) => r.date?.getTime() === date.date?.getTime())
      ) {
        await date.destroy({ transaction });
      }
    }
  }
}
