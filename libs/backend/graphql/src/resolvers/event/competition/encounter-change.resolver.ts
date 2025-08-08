import {
  EncounterChange,
  EncounterChangeDate,
  EncounterChangeNewInput,
  EncounterChangeUpdateInput,
  EncounterCompetition,
  EventCompetition,
  Location,
  Logging,
  Player,
  SubEventCompetition,
} from "@badman/backend-database";
import { Sync, SyncQueue } from "@badman/backend-queue";
import { Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
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
} from "@nestjs/graphql";
import moment from "moment-timezone";
import { ListArgs } from "../../../utils";

import { User } from "@badman/backend-authorization";

import { EncounterValidationService } from "@badman/backend-change-encounter";
import { NotificationService } from "@badman/backend-notifications";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { LoggingAction } from "@badman/utils";

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
    private encounterService: EncounterValidationService
  ) {}

  @Query(() => EncounterChange)
  async encounterChange(@Args("id", { type: () => ID }) id: string): Promise<EncounterChange> {
    const encounterCompetition = await EncounterChange.findByPk(id);

    if (!encounterCompetition) {
      throw new NotFoundException(id);
    }
    return encounterCompetition;
  }

  @Query(() => PagedEncounterChange)
  async encounterChanges(
    @Args() listArgs: ListArgs
  ): Promise<{ count: number; rows: EncounterChange[] }> {
    return EncounterChange.findAndCountAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [EncounterChangeDate])
  async dates(@Parent() encounterChange: EncounterChange): Promise<EncounterChangeDate[]> {
    return encounterChange.getDates();
  }

  @Mutation(() => EncounterChange)
  async updateEncounterChange(
    @User() user: Player,
    @Args("data") updateChangeEncounter: EncounterChangeUpdateInput
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
        "change-any:encounter",
      ]))
    ) {
      throw new UnauthorizedException(`You do not have permission to edit this encounter`);
    }

    return encounterChange.update(updateChangeEncounter);
  }

  @Mutation(() => EncounterChange)
  async addChangeEncounter(
    @User() user: Player,
    @Args("data") newChangeEncounter: EncounterChangeNewInput
  ): Promise<any> {
    // checks for ecounter in question
    const encounter = await EncounterCompetition.findByPk(newChangeEncounter.encounterId, {
      include: [
        {
          association: "home",
        },
        {
          association: "away",
        },
      ],
    });

    // throws error if it doesn't exist
    if (!encounter) {
      throw new NotFoundException(
        `${EncounterCompetition.name}: ${newChangeEncounter.encounterId}`
      );
    }

    // gets the team in question
    const team = newChangeEncounter.home ? encounter.home : encounter.away;

    if (!team) {
      throw new NotFoundException("Team not found for this encounter");
    }

    // checks if the user has permission to edit the encounter
    const userHasPermission = await user.hasAnyPermission([
      `${team.clubId}_change:encounter`,
      "change-any:encounter",
    ]);

    this.logger.debug(`userHasPermission: ${userHasPermission}`);

    if (!userHasPermission) {
      throw new UnauthorizedException(`You do not have permission to edit this encounter`);
    }

    const transaction = await this._sequelize.transaction();
    let encounterChange: EncounterChange;
    let locationHasChanged = false;
    let eventId: string | undefined;

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

      // Set the state if it is the home team or the user has the change-any:encounter permission
      if (newChangeEncounter.accepted) {
        this.logger.debug("accepted action");
        const selectedDates = newChangeEncounter.dates?.filter((r) => r.selected === true);
        if (selectedDates?.length !== 1) {
          // Multiple dates were selected
          throw new Error("Multiple dates selected");
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

        // Save changes
        // Must be before Sync Queue is triggered (otherwise wrong date is passed)
        await encounter.save({ transaction });

        await Logging.create({
          action: LoggingAction.EncounterChanged,
          playerId: user.id,
          meta: {
            encounterId: encounter.id,
            date: encounter.date,
            originalDate: encounter.originalDate,
          },
        });

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

        // Remove the selected date from the change dates
        const selectedDate = selectedDates[0];
        const dateToRemove = dates.find((d) => d.date?.getTime() === selectedDate.date?.getTime());
        if (dateToRemove) {
          await dateToRemove.destroy({ transaction });
        }

        encounterChange.accepted = true;
      } else {
        this.logger.debug("this is a new change request");
        encounterChange.accepted = false;
        this.logger.debug(`Change encounter ${encounter.id}: ${encounterChange.accepted}`);
      }

      // Load the event data directly to ensure we get all the required fields
      const draw = await encounter.getDrawCompetition({
        include: [
          {
            model: SubEventCompetition,
            attributes: ["id", "eventId"],
          },
        ],
      });
      const event = await EventCompetition.findByPk(draw?.subEventCompetition?.eventId, {
        attributes: [
          "id",
          "name",
          "season",
          "changeCloseRequestDatePeriod1",
          "changeCloseRequestDatePeriod2",
        ],
      });
      // Store the event ID for notifications
      eventId = event?.id;
      // Check if we're getting the right event type
      if (event && event.constructor.name !== "EventCompetition") {
        this.logger.error(
          `Wrong event type loaded: ${event.constructor.name}. Expected EventCompetition`
        );
        throw new Error(`Invalid event type: ${event.constructor.name}. Expected EventCompetition`);
      }
      // Check if the event has the required date fields
      if (!event?.changeCloseRequestDatePeriod1 || !event?.changeCloseRequestDatePeriod2) {
        this.logger.error(
          `EventCompetition ${event?.id} (${event?.name}) is missing required date fields. Please configure the date change periods in the event settings.`
        );
        throw new Error(
          `Event "${event?.name || "Unknown Event"}" is not configured for date changes. Please contact the competition organizer to configure the date change periods.`
        );
      }
      const encounterDateEqualsEventSeason =
        event?.season &&
        (encounter.date?.getFullYear() === event?.season ||
          encounter.date?.getFullYear() === event?.season + 1);
      const closedDate = encounterDateEqualsEventSeason
        ? event?.changeCloseRequestDatePeriod1
        : event?.changeCloseRequestDatePeriod2;
      const currentDate = moment.tz("europe/brussels");
      const deadlineDate = moment.tz(closedDate, "europe/brussels");
      const canRequestNewDates = currentDate.isBefore(deadlineDate);
      await this.changeOrUpdate(
        encounterChange,
        newChangeEncounter,
        transaction,
        dates,
        canRequestNewDates,
        event || null, // Pass the event data to avoid reloading it
        encounter.date || new Date() // Pass the encounter date to ensure consistent logic
      );

      await encounterChange.save({ transaction });

      // find if any date was selected
      await transaction.commit();
    } catch (e) {
      this.logger.warn("rollback", e);
      await transaction.rollback();
      throw e;
    }

    // Notify the user
    const updatedEncounter = await EncounterCompetition.findByPk(newChangeEncounter.encounterId);
    if (!updatedEncounter) {
      throw new NotFoundException(newChangeEncounter.encounterId);
    }

    if (newChangeEncounter.accepted) {
      this.notificationService.notifyEncounterChangeFinished(
        updatedEncounter,
        locationHasChanged,
        newChangeEncounter.frontendContext,
        eventId
      );

      // check if the location has changed
      if (locationHasChanged) {
        // this.notificationService.notifyEncounterLocationChanged(encounter);
      }
    } else {
      this.notificationService.notifyEncounterChange(
        updatedEncounter,
        newChangeEncounter.home ?? false,
        newChangeEncounter.frontendContext,
        eventId
      );
    }

    return encounterChange;
  }

  private async changeOrUpdate(
    encounterChange: EncounterChange,
    change: EncounterChangeNewInput,
    transaction: Transaction,
    existingDates: EncounterChangeDate[],
    canRequestNewDates: boolean,
    event: EventCompetition | null,
    encounterDate: Date
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
        // Get the encounter data needed for the date comparison
        const encounter = await encounterChange.getEncounter();

        const encounterDateEqualsEventSeason =
          event?.season &&
          (encounterDate.getFullYear() === event?.season ||
            encounterDate.getFullYear() === event?.season + 1);
        const closedDate = encounterDateEqualsEventSeason
          ? event?.changeCloseRequestDatePeriod1
          : event?.changeCloseRequestDatePeriod2;

        const currentDate = moment().tz("europe/brussels");
        const deadlineDate = moment.tz(closedDate, "europe/brussels");

        throw new Error(
          `Cannot request new dates for event "${event?.name || "Unknown Event"}". The deadline for requesting date changes has passed. ` +
            `Deadline was: ${deadlineDate.format("DD/MM/YYYY HH:mm")} (${deadlineDate.fromNow()}). ` +
            `Current time: ${currentDate.format("DD/MM/YYYY HH:mm")}. ` +
            `Please contact the competition organizer if you need to make changes after the deadline.`
        );
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
