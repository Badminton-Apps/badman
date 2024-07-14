import {
  EncounterChange,
  EncounterChangeDate,
  EncounterChangeNewInput,
  EncounterChangeUpdateInput,
  EncounterCompetition,
  EventCompetition,
  Location,
  Player,
  SubEventCompetition,
} from '@badman/backend-database';
import { Sync } from '@badman/backend-queue';
import { Logger, NotFoundException } from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  Int,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import moment from 'moment-timezone';
import { ListArgs } from '../../../utils';

import { User } from '@badman/backend-authorization';
import { NotificationService } from '@badman/backend-notifications';
import { SyncQueue } from '@badman/backend-queue';
import { InjectQueue } from '@nestjs/bull';
import { UnauthorizedException } from '@nestjs/common';
import { Mutation } from '@nestjs/graphql';
import { Queue } from 'bull';
import { Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import {
  ChangeEncounterInput,
  ChangeEncounterOutput,
  ChangeEncounterValidationService,
} from '@badman/backend-change-encounter';

@ObjectType()
export class PagedEncounterChange {
  @Field(() => Int)
  count?: number;

  @Field(() => [EncounterChange])
  rows?: EncounterChange[];
}

@Resolver(() => EncounterChange)
export class EncounterChangeCompetitionResolver {
  private readonly logger = new Logger(EncounterChangeCompetitionResolver.name);

  constructor(
    private _sequelize: Sequelize,
    @InjectQueue(SyncQueue) private syncQueue: Queue,
    private notificationService: NotificationService,
    private changeEncounterService: ChangeEncounterValidationService,
  ) {}

  @Query(() => EncounterChange)
  async encounterChange(@Args('id', { type: () => ID }) id: string): Promise<EncounterChange> {
    const encounterCompetition = await EncounterChange.findByPk(id);

    if (!encounterCompetition) {
      throw new NotFoundException(id);
    }
    return encounterCompetition;
  }

  @Query(() => PagedEncounterChange)
  async encounterChanges(
    @Args() listArgs: ListArgs,
  ): Promise<{ count: number; rows: EncounterChange[] }> {
    return EncounterChange.findAndCountAll(ListArgs.toFindOptions(listArgs));
  }

  @Query(() => ChangeEncounterOutput, {
    description: `Validate the ChangeEncounter`,
  })
  async validateChangeEncounter(
    @Args('ChangeEncounter') data: ChangeEncounterInput,
  ): Promise<ChangeEncounterOutput> {
    return this.changeEncounterService.fetchAndValidate(
      data,
      ChangeEncounterValidationService.defaultValidators(),
    );
  }

  @ResolveField(() => [EncounterChangeDate])
  async dates(@Parent() encounterChange: EncounterChange): Promise<EncounterChangeDate[]> {
    return encounterChange.getDates();
  }

  @Mutation(() => EncounterChange)
  async updateEncounterChange(
    @User() user: Player,
    @Args('data') updateChangeEncounter: EncounterChangeUpdateInput,
  ): Promise<EncounterChange> {
    const encounterChange = await EncounterChange.findByPk(updateChangeEncounter.id);

    if (!encounterChange) {
      throw new NotFoundException(updateChangeEncounter.id);
    }
    const encounter = await EncounterCompetition.findByPk(encounterChange.encounterId);

    if (!encounter) {
      throw new NotFoundException(`${EncounterCompetition.name}: ${encounterChange.encounterId}`);
    }

    const homeTeam = await encounter.getHome();
    const awayTeam = await encounter.getAway();

    if (
      !(await user.hasAnyPermission([
        `${homeTeam.clubId}_change:encounter`,
        `${awayTeam.clubId}_change:encounter`,
        'change-any:encounter',
      ]))
    ) {
      throw new UnauthorizedException(`You do not have permission to edit this encounter`);
    }

    return encounterChange.update(updateChangeEncounter);
  }

  @Mutation(() => EncounterChange)
  async addChangeEncounter(
    @User() user: Player,
    @Args('data') newChangeEncounter: EncounterChangeNewInput,
  ): Promise<EncounterChange> {
    const encounter = await EncounterCompetition.findByPk(newChangeEncounter.encounterId);

    if (!encounter) {
      throw new NotFoundException(
        `${EncounterCompetition.name}: ${newChangeEncounter.encounterId}`,
      );
    }

    const team = newChangeEncounter.home ? await encounter.getHome() : await encounter.getAway();

    if (
      !(await user.hasAnyPermission([`${team.clubId}_change:encounter`, 'change-any:encounter']))
    ) {
      throw new UnauthorizedException(`You do not have permission to edit this encounter`);
    }
    const transaction = await this._sequelize.transaction();
    let encounterChange: EncounterChange;
    let locationHasChanged = false;

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
        const selectedDates = newChangeEncounter.dates?.filter((r) => r.selected === true);
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

        // Set location to the selected location
        if (encounter.locationId != selectedDates[0].locationId) {
          // store the original location
          if (encounter.originalLocationId === null) {
            encounter.originalLocationId = encounter.locationId;
          }

          // set the new location
          encounter.locationId = selectedDates[0].locationId;
          locationHasChanged = true;
        }

        // Save cahnges
        // Must be before Sync Queue is triggered (othrwise wrong date is passed)
        await encounter.save({ transaction });

        // Accept
        await this.syncQueue.add(
          Sync.ChangeDate,
          {
            encounterId: encounter.id,
          },
          {
            removeOnComplete: true,
            removeOnFail: false,
          },
        );

        encounterChange.accepted = true;
      } else {
        encounterChange.accepted = false;
      }
      await encounterChange.save({ transaction });
      this.logger.debug(`Change encounter ${encounter.id}: ${encounterChange.accepted}`);

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
            'europe/brussels',
          ),
        );

      await this.changeOrUpdate(
        encounterChange,
        newChangeEncounter,
        transaction,
        dates,
        canRequestNewDates,
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
      this.notificationService.notifyEncounterChangeFinished(encounter, locationHasChanged);

      // check if the location has changed
      if (locationHasChanged) {
        // this.notificationService.notifyEncounterLocationChanged(encounter);
      }
    } else {
      this.notificationService.notifyEncounterChange(encounter, newChangeEncounter.home ?? false);
    }

    return encounterChange;
  }
  private async changeOrUpdate(
    encounterChange: EncounterChange,
    change: EncounterChangeNewInput,
    transaction: Transaction,
    existingDates: EncounterChangeDate[],
    canRequestNewDates: boolean,
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
        (r) => r.date?.getTime() === date.date?.getTime(),
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
      if (!change.dates?.find((r) => r.date?.getTime() === date.date?.getTime())) {
        await date.destroy({ transaction });
      }
    }
  }
}

@Resolver(() => EncounterChangeDate)
export class EncounterChangeDateCompetitionResolver {
  private readonly logger = new Logger(EncounterChangeDateCompetitionResolver.name);

  @ResolveField(() => Location)
  async dates(@Parent() encounterChangeDate: EncounterChangeDate): Promise<Location> {
    return encounterChangeDate.getLocation();
  }
}
