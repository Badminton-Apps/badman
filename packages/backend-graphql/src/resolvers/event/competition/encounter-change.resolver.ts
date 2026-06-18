import {
  EncounterChange,
  EncounterChangeDate,
  EncounterChangeNewInput,
  EncounterChangeUpdateInput,
  EncounterCompetition,
  EventCompetition,
  Location,
  Deprecated,
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
import {
  FinalizeEncounterChangeInput,
  ProposeEncounterChangeDatesInput,
  TriageEncounterChangeInput,
} from "./encounter-change.input";
import {
  FinalizeEncounterChangeResult,
  ProposeEncounterChangeDatesResult,
  TriageEncounterChangeResult,
} from "./encounter-change.result";
import { EncounterChangeService } from "./encounter-change.service";

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
    private encounterService: EncounterValidationService,
    private encounterChangeService: EncounterChangeService
  ) {}

  @Query(() => EncounterChange)
  async encounterChange(@Args("id", { type: () => ID }) id: string): Promise<EncounterChange> {
    const encounterChange = await EncounterChange.findByPk(id);
    if (!encounterChange) {
      throw new NotFoundException(id);
    }
    return encounterChange;
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

  @Mutation(() => ProposeEncounterChangeDatesResult)
  async proposeEncounterChangeDates(
    @User() user: Player,
    @Args("input") input: ProposeEncounterChangeDatesInput
  ): Promise<ProposeEncounterChangeDatesResult> {
    return this.encounterChangeService.propose(user, input);
  }

  @Mutation(() => TriageEncounterChangeResult)
  async triageEncounterChange(
    @User() user: Player,
    @Args("input") input: TriageEncounterChangeInput
  ): Promise<TriageEncounterChangeResult> {
    return this.encounterChangeService.triage(user, input);
  }

  @Mutation(() => FinalizeEncounterChangeResult)
  async finalizeEncounterChange(
    @User() user: Player,
    @Args("input") input: FinalizeEncounterChangeInput
  ): Promise<FinalizeEncounterChangeResult> {
    return this.encounterChangeService.finalize(user, input);
  }

  @Mutation(() => EncounterChange, {
    deprecationReason:
      "Use proposeEncounterChangeDates, triageEncounterChange, or finalizeEncounterChange",
  })
  @Deprecated(
    "Use proposeEncounterChangeDates, triageEncounterChange, or finalizeEncounterChange",
    {
      reason: "Use proposeEncounterChangeDates, triageEncounterChange, or finalizeEncounterChange",
    }
  )
  async addChangeEncounter(
    @User() user: Player,
    @Args("data") newChangeEncounter: EncounterChangeNewInput
  ): Promise<any> {
    const encounter = await EncounterCompetition.findByPk(newChangeEncounter.encounterId, {
      include: [{ association: "home" }, { association: "away" }],
    });

    if (!encounter) {
      throw new NotFoundException(
        `${EncounterCompetition.name}: ${newChangeEncounter.encounterId}`
      );
    }

    const team = newChangeEncounter.home ? encounter.home : encounter.away;
    if (!team) {
      throw new NotFoundException("Team not found for this encounter");
    }

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
    let shouldCreateSyncJob = false;

    try {
      encounterChange = await encounter.getEncounterChange({ transaction });

      if (encounterChange === null || encounterChange === undefined) {
        encounterChange = new EncounterChange({ encounterId: encounter.id });
        await encounterChange.save({ transaction });
      }

      const dates = await encounterChange.getDates();

      if (newChangeEncounter.accepted) {
        await this.processAcceptedEncounterChange(
          encounter,
          newChangeEncounter,
          dates,
          user,
          transaction
        );
        locationHasChanged = this.checkIfLocationChanged(encounter);
        shouldCreateSyncJob = true;
        this.logger.debug(
          `Will create sync job for encounter ${encounter.id} after transaction commits`
        );
      } else {
        this.logger.debug(`Creating new change request for encounter ${encounter.id}`);
      }

      const draw = await encounter.getDrawCompetition({
        include: [{ model: SubEventCompetition, attributes: ["id", "eventId"] }],
      });
      const event = await EventCompetition.findByPk(draw?.subEventCompetition?.eventId);
      eventId = event?.id;

      if (event && event.constructor.name !== "EventCompetition") {
        this.logger.error(`Wrong event type loaded: ${event.constructor.name}`);
        throw new Error(`Invalid event type: ${event.constructor.name}. Expected EventCompetition`);
      }
      if (!event?.changeCloseRequestDatePeriod1 || !event?.changeCloseRequestDatePeriod2) {
        this.logger.error(
          `EventCompetition ${event?.id} (${event?.name}) is missing required date fields`
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
        event || null,
        encounter.date || new Date()
      );

      await encounterChange.save({ transaction });
      await transaction.commit();
    } catch (e) {
      this.logger.warn("rollback", e);
      await transaction.rollback();
      throw e;
    }

    if (shouldCreateSyncJob) {
      try {
        this.logger.debug(`Creating ChangeDate sync job for encounter ${encounter.id}`);
        await this.syncQueue.add(
          Sync.ChangeDate,
          { encounterId: encounter.id },
          { removeOnComplete: true, removeOnFail: false }
        );
        this.logger.debug(`Successfully created ChangeDate sync job for encounter ${encounter.id}`);
      } catch (syncError) {
        this.logger.error(
          `Failed to create ChangeDate sync job for encounter ${encounter.id}:`,
          syncError
        );
      }
    }

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

    for (const date of change.dates ?? []) {
      let encounterChangeDate = existingDates.find(
        (r) => r.date?.getTime() === date.date?.getTime()
      );

      if (!encounterChangeDate && !canRequestNewDates) {
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

      if (!encounterChangeDate) {
        encounterChangeDate = new EncounterChangeDate({
          date: date.date,
          encounterChangeId: encounterChange.id,
        });
      }

      if (change.home) {
        encounterChangeDate.availabilityHome = date.availabilityHome;
      } else {
        encounterChangeDate.availabilityAway = date.availabilityAway;
      }

      encounterChangeDate.locationId = date.locationId;
      await encounterChangeDate.save({ transaction });
    }

    for (const date of existingDates) {
      if (!change.dates?.find((r) => r.date?.getTime() === date.date?.getTime())) {
        await date.destroy({ transaction });
      }
    }
  }

  private async processAcceptedEncounterChange(
    encounter: EncounterCompetition,
    changeRequest: EncounterChangeNewInput,
    existingDates: EncounterChangeDate[],
    user: Player,
    transaction: Transaction
  ): Promise<void> {
    this.logger.debug(`Accepting encounter change for encounter ${encounter.id}`);

    const selectedDates = changeRequest.dates?.filter((r) => r.selected === true);
    if (selectedDates?.length !== 1) {
      throw new Error("Multiple dates selected");
    }

    const selectedDate = selectedDates[0];

    if (encounter.originalDate === null) {
      encounter.originalDate = encounter.date;
    }
    encounter.date = selectedDate.date;

    if (encounter.locationId != selectedDate.locationId) {
      if (encounter.originalLocationId === null) {
        encounter.originalLocationId = encounter.locationId;
      }
      encounter.locationId = selectedDate.locationId;
    }

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

    const dateToRemove = existingDates.find(
      (d) => d.date?.getTime() === selectedDate.date?.getTime()
    );
    if (dateToRemove) {
      await dateToRemove.destroy({ transaction });
    }
  }

  private checkIfLocationChanged(encounter: EncounterCompetition): boolean {
    return (
      encounter.originalLocationId !== null && encounter.originalLocationId !== encounter.locationId
    );
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
