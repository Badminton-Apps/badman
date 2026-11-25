import {
  EncounterChange,
  EncounterChangeDate,
  EncounterCompetition,
  EventCompetition,
  Logging,
  Player,
  SubEventCompetition,
} from "@badman/backend-database";
import { EncounterValidationService } from "@badman/backend-change-encounter";
import { NotificationService } from "@badman/backend-notifications";
import { Sync, SyncQueue } from "@badman/backend-queue";
import {
  ChangeEncounterDateStatus,
  ChangeEncounterParty,
  EncounterChangeAction,
  LoggingAction,
} from "@badman/utils";
import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import * as Sentry from "@sentry/nestjs";
import { GraphQLError } from "graphql";
import { Queue } from "bull";
import moment from "moment-timezone";
import { Sequelize } from "sequelize-typescript";
import { ErrorCode } from "../../../utils/error-codes";
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

@Injectable()
export class EncounterChangeService {
  private readonly logger = new Logger(EncounterChangeService.name);

  constructor(
    private readonly _sequelize: Sequelize,
    @InjectQueue(SyncQueue) private readonly syncQueue: Queue,
    private readonly notificationService: NotificationService,
    private readonly encounterValidationService: EncounterValidationService
  ) {}

  async propose(
    user: Player,
    input: ProposeEncounterChangeDatesInput
  ): Promise<ProposeEncounterChangeDatesResult> {
    this.logger.log(`[propose] encounterId=${input.encounterId} userId=${user.id}`);

    const encounter = await EncounterCompetition.findByPk(input.encounterId, {
      include: [{ association: "home" }, { association: "away" }],
    });

    if (!encounter) {
      throw new GraphQLError(`Encounter not found: ${input.encounterId}`, {
        extensions: { code: ErrorCode.ENCOUNTER_NOT_FOUND },
      });
    }

    const homeTeam = await encounter.getHome();
    const awayTeam = await encounter.getAway();

    const isHome = await user.hasAnyPermission([
      `${homeTeam.clubId}_change:encounter`,
      "change-any:encounter",
    ]);
    const isAway =
      !isHome &&
      (await user.hasAnyPermission([
        `${awayTeam.clubId}_change:encounter`,
        "change-any:encounter",
      ]));

    if (!isHome && !isAway) {
      this.logger.warn(`[propose] permission denied userId=${user.id} encounterId=${encounter.id}`);
      throw new GraphQLError("You do not have permission to propose dates for this encounter", {
        extensions: { code: ErrorCode.PERMISSION_DENIED },
      });
    }

    const party = isHome ? ChangeEncounterParty.HOME : ChangeEncounterParty.AWAY;
    this.logger.debug(`[propose] party=${party} encounterId=${encounter.id}`);

    const event = await this._loadEvent(encounter);

    this._assertDeadlineNotPassed(encounter, event, "propose");

    const season = event?.season ?? new Date().getFullYear();
    for (const d of input.dates) {
      if (!this._isInCompetitionSeason(d.date, season)) {
        throw new GraphQLError(
          `Date ${d.date.toISOString()} is outside the competition season (Sep 1 – Apr 30)`,
          { extensions: { code: ErrorCode.DATE_OUT_OF_SEASON } }
        );
      }
    }

    const transaction = await this._sequelize.transaction();
    let encounterChange: EncounterChange | null = null;

    try {
      const latestChange = await EncounterChange.findOne({
        where: { encounterId: encounter.id },
        order: [["createdAt", "DESC"]],
        transaction,
      });

      if (latestChange) {
        const latestDates = await latestChange.getDates({ transaction });
        const wasAccepted = latestDates.some(
          (d) => d.status === ChangeEncounterDateStatus.ACCEPTED
        );
        encounterChange = wasAccepted ? null : latestChange;
      }

      if (!encounterChange) {
        this.logger.debug(`[propose] creating new EncounterChange for encounterId=${encounter.id}`);
        encounterChange = await EncounterChange.create(
          { encounterId: encounter.id, lastActionBy: party, lastActionAt: new Date() },
          { transaction }
        );
      }

      const existingDates = await encounterChange.getDates({ transaction });

      for (const d of input.dates) {
        const parsedDate = moment(d.date).toDate();
        const duplicate = existingDates.find(
          (ed) =>
            ed.date?.getTime() === parsedDate.getTime() &&
            ed.status !== ChangeEncounterDateStatus.REJECTED
        );
        if (duplicate) {
          throw new GraphQLError(
            `Date ${parsedDate.toISOString()} is already proposed in this change request`,
            { extensions: { code: ErrorCode.DUPLICATE_DATE } }
          );
        }

        await EncounterChangeDate.create(
          {
            encounterChangeId: encounterChange.id,
            date: parsedDate,
            locationId: d.locationId,
            proposedBy: party,
            status: ChangeEncounterDateStatus.PENDING,
          },
          { transaction }
        );
        this.logger.debug(`[propose] inserted date=${parsedDate.toISOString()} party=${party}`);
      }

      encounterChange.lastActionBy = party;
      encounterChange.lastActionAt = new Date();
      await encounterChange.save({ transaction });

      await transaction.commit();
      this.logger.log(
        `[propose] committed encounterId=${encounter.id} dates=${input.dates.length}`
      );
    } catch (e) {
      this.logger.warn("[propose] rollback", e);
      await transaction.rollback();
      throw e;
    }

    const encounterForNotification = await EncounterCompetition.findByPk(input.encounterId);
    if (encounterForNotification) {
      this.notificationService.notifyEncounterChange(
        encounterForNotification,
        isHome,
        EncounterChangeAction.PROPOSE
      );
    }

    return { encounterChange };
  }

  async triage(
    user: Player,
    input: TriageEncounterChangeInput
  ): Promise<TriageEncounterChangeResult> {
    this.logger.log(`[triage] encounterChangeId=${input.encounterChangeId} userId=${user.id}`);

    const encounterChange = await EncounterChange.findByPk(input.encounterChangeId, {
      include: [
        {
          association: "encounter",
          include: [{ association: "home" }, { association: "away" }],
        },
      ],
    });

    if (!encounterChange) {
      throw new GraphQLError(`EncounterChange not found: ${input.encounterChangeId}`, {
        extensions: { code: ErrorCode.ENCOUNTER_CHANGE_NOT_FOUND },
      });
    }

    const encounter = encounterChange.encounter;
    if (!encounter) {
      throw new GraphQLError(`Encounter not found: ${encounterChange.encounterId}`, {
        extensions: { code: ErrorCode.ENCOUNTER_NOT_FOUND },
      });
    }
    const awayTeam = await encounter.getAway();

    const isAway = await user.hasAnyPermission([
      `${awayTeam.clubId}_change:encounter`,
      "change-any:encounter",
    ]);
    if (!isAway) {
      this.logger.warn(
        `[triage] permission denied userId=${user.id} encounterChangeId=${encounterChange.id}`
      );
      throw new GraphQLError("Only the away team may triage this change request", {
        extensions: { code: ErrorCode.PERMISSION_DENIED },
      });
    }

    const event = await this._loadEvent(encounter);

    this._assertDeadlineNotPassed(encounter, event, "triage");

    const season = event?.season ?? new Date().getFullYear();

    for (const d of input.newDates ?? []) {
      if (!this._isInCompetitionSeason(d.date, season)) {
        throw new GraphQLError(
          `Date ${d.date.toISOString()} is outside the competition season (Sep 1 – Apr 30)`,
          { extensions: { code: ErrorCode.DATE_OUT_OF_SEASON } }
        );
      }
    }

    const transaction = await this._sequelize.transaction();

    try {
      const allDates = await encounterChange.getDates({ transaction });

      for (const endorsementId of input.endorseIds ?? []) {
        const date = allDates.find((d) => d.id === endorsementId);
        if (!date || date.status !== ChangeEncounterDateStatus.PENDING) {
          throw new GraphQLError(
            `Date ${endorsementId} is not in PENDING status and cannot be endorsed`,
            {
              extensions: { code: ErrorCode.INVALID_STATE },
            }
          );
        }
        this.logger.debug(`[triage] endorsing dateId=${endorsementId}`);
        date.status = ChangeEncounterDateStatus.TENTATIVELY_ACCEPTED;
        await date.save({ transaction });
      }

      for (const rejectionId of input.rejectIds ?? []) {
        const date = allDates.find((d) => d.id === rejectionId);
        if (
          !date ||
          (date.status !== ChangeEncounterDateStatus.PENDING &&
            date.status !== ChangeEncounterDateStatus.TENTATIVELY_ACCEPTED)
        ) {
          throw new GraphQLError(
            `Date ${rejectionId} cannot be rejected — must be PENDING or TENTATIVELY_ACCEPTED`,
            { extensions: { code: ErrorCode.INVALID_STATE } }
          );
        }
        this.logger.debug(`[triage] rejecting dateId=${rejectionId}`);
        date.status = ChangeEncounterDateStatus.REJECTED;
        await date.save({ transaction });
      }

      for (const newDate of input.newDates ?? []) {
        const parsedDate = moment(newDate.date).toDate();
        await EncounterChangeDate.create(
          {
            encounterChangeId: encounterChange.id,
            date: parsedDate,
            locationId: newDate.locationId,
            proposedBy: ChangeEncounterParty.AWAY,
            status: ChangeEncounterDateStatus.PENDING,
          },
          { transaction }
        );
        this.logger.debug(`[triage] counter-date inserted date=${parsedDate.toISOString()}`);
      }

      encounterChange.lastActionBy = ChangeEncounterParty.AWAY;
      encounterChange.lastActionAt = new Date();
      await encounterChange.save({ transaction });

      await transaction.commit();
      this.logger.log(`[triage] committed encounterChangeId=${encounterChange.id}`);
    } catch (e) {
      this.logger.warn("[triage] rollback", e);
      await transaction.rollback();
      throw e;
    }

    const encounterForNotification = await EncounterCompetition.findByPk(encounter.id);
    if (encounterForNotification) {
      const hasNewDates = (input.newDates ?? []).length > 0;
      const hasEndorsements = (input.endorseIds ?? []).length > 0;
      const hasRejections = (input.rejectIds ?? []).length > 0;

      let action: EncounterChangeAction;
      if (hasNewDates) {
        action = EncounterChangeAction.COUNTER;
      } else if (hasRejections && !hasEndorsements) {
        action = EncounterChangeAction.REJECT;
      } else {
        action = EncounterChangeAction.ENDORSE;
      }

      this.notificationService.notifyEncounterChange(encounterForNotification, false, action);
    }

    return { encounterChange };
  }

  async finalize(
    user: Player,
    input: FinalizeEncounterChangeInput
  ): Promise<FinalizeEncounterChangeResult> {
    this.logger.log(
      `[finalize] encounterChangeDateId=${input.encounterChangeDateId} userId=${user.id}`
    );

    const changeDate = await EncounterChangeDate.findByPk(input.encounterChangeDateId, {
      include: [
        {
          association: "encounterChange",
          include: [
            {
              association: "encounter",
              include: [{ association: "home" }, { association: "away" }],
            },
          ],
        },
      ],
    });

    if (!changeDate) {
      throw new GraphQLError(`EncounterChangeDate not found: ${input.encounterChangeDateId}`, {
        extensions: { code: ErrorCode.ENCOUNTER_CHANGE_DATE_NOT_FOUND },
      });
    }

    const encounterChange = changeDate.encounterChange;
    if (!encounterChange) {
      throw new GraphQLError(`EncounterChange not found: ${changeDate.encounterChangeId}`, {
        extensions: { code: ErrorCode.ENCOUNTER_CHANGE_NOT_FOUND },
      });
    }
    const encounter = encounterChange.encounter;
    if (!encounter) {
      throw new GraphQLError(`Encounter not found: ${encounterChange.encounterId}`, {
        extensions: { code: ErrorCode.ENCOUNTER_NOT_FOUND },
      });
    }

    const homeTeam = await encounter.getHome();
    const isHome = await user.hasAnyPermission([
      `${homeTeam.clubId}_change:encounter`,
      "change-any:encounter",
    ]);
    if (!isHome) {
      this.logger.warn(`[finalize] permission denied userId=${user.id} dateId=${changeDate.id}`);
      throw new GraphQLError("Only the home team may finalize an encounter date change", {
        extensions: { code: ErrorCode.PERMISSION_DENIED },
      });
    }

    const isEndorsed =
      changeDate.status === ChangeEncounterDateStatus.TENTATIVELY_ACCEPTED ||
      changeDate.proposedBy === ChangeEncounterParty.AWAY;

    if (!isEndorsed) {
      throw new GraphQLError(
        "This date has not been endorsed by the away team and cannot be finalized",
        { extensions: { code: ErrorCode.DATE_NOT_ENDORSED } }
      );
    }

    const event = await this._loadEvent(encounter);
    this._assertDeadlineNotPassed(encounter, event, "finalize");

    this.logger.debug(`[finalize] running validation for encounterId=${encounter.id}`);
    const validationResult = await this.encounterValidationService.validate({
      encounterId: encounter.id,
      suggestedDates: changeDate.date
        ? [{ date: changeDate.date, locationId: changeDate.locationId ?? encounter.locationId! }]
        : [],
    });

    if (!validationResult.valid) {
      this.logger.warn(
        `[finalize] validation failed encounterId=${encounter.id}`,
        validationResult.errors
      );
      const firstError = validationResult.errors?.[0];
      throw new GraphQLError(firstError?.message ?? "Validation failed for the proposed date", {
        extensions: { code: ErrorCode.VALIDATION_FAILED, errors: validationResult.errors },
      });
    }

    const transaction = await this._sequelize.transaction();

    try {
      const allDates = await encounterChange.getDates({ transaction });

      changeDate.status = ChangeEncounterDateStatus.ACCEPTED;
      await changeDate.save({ transaction });
      this.logger.debug(`[finalize] dateId=${changeDate.id} → ACCEPTED`);

      for (const sibling of allDates) {
        if (
          sibling.id !== changeDate.id &&
          (sibling.status === ChangeEncounterDateStatus.PENDING ||
            sibling.status === ChangeEncounterDateStatus.TENTATIVELY_ACCEPTED)
        ) {
          sibling.status = ChangeEncounterDateStatus.RESOLVED;
          await sibling.save({ transaction });
          this.logger.debug(`[finalize] dateId=${sibling.id} → RESOLVED`);
        }
      }

      if (!encounter.originalDate) {
        encounter.originalDate = encounter.date;
      }
      encounter.date = changeDate.date;

      if (changeDate.locationId && changeDate.locationId !== encounter.locationId) {
        if (!encounter.originalLocationId) {
          encounter.originalLocationId = encounter.locationId;
        }
        encounter.locationId = changeDate.locationId;
      }

      await encounter.save({ transaction });

      await Logging.create(
        {
          action: LoggingAction.EncounterChanged,
          playerId: user.id,
          meta: {
            encounterId: encounter.id,
            date: encounter.date,
            originalDate: encounter.originalDate,
          },
        },
        { transaction }
      );

      await transaction.commit();
      this.logger.log(`[finalize] committed encounterId=${encounter.id} date=${changeDate.date}`);
    } catch (e) {
      this.logger.warn("[finalize] rollback", e);
      await transaction.rollback();
      throw e;
    }

    try {
      await this.syncQueue.add(
        Sync.ChangeDate,
        { encounterId: encounter.id },
        { removeOnComplete: true, removeOnFail: false }
      );
      this.logger.debug(`[finalize] sync job queued encounterId=${encounter.id}`);
    } catch (syncError) {
      this.logger.error(
        `[finalize] failed to queue sync job encounterId=${encounter.id}`,
        syncError
      );
      Sentry.captureException(syncError);
    }

    const updatedEncounter = await EncounterCompetition.findByPk(encounter.id);
    if (updatedEncounter) {
      const locationHasChanged =
        encounter.originalLocationId != null &&
        encounter.originalLocationId !== encounter.locationId;
      this.notificationService.notifyEncounterChangeFinished(updatedEncounter, locationHasChanged);
    }

    return { encounter: updatedEncounter ?? encounter, encounterChange };
  }

  /**
   * Resolves all open proposals for an encounter after an admin date change.
   * Marks every PENDING/TENTATIVELY_ACCEPTED EncounterChangeDate as RESOLVED
   * and inserts a new ACCEPTED entry for the admin-chosen date.
   * Must be called inside an existing transaction.
   */
  async resolveProposalsForAdminChange(
    encounterId: string,
    date: Date,
    locationId: string | undefined,
    transaction: import("sequelize").Transaction
  ): Promise<void> {
    let encounterChange = await EncounterChange.findOne({
      where: { encounterId },
      transaction,
    });

    if (!encounterChange) {
      encounterChange = await EncounterChange.create(
        { encounterId, lastActionBy: ChangeEncounterParty.HOME, lastActionAt: new Date() },
        { transaction }
      );
      this.logger.debug(
        `[resolveProposalsForAdminChange] created new EncounterChange for encounterId=${encounterId}`
      );
    }

    const openDates = await encounterChange.getDates({ transaction });
    for (const d of openDates) {
      if (
        d.status === ChangeEncounterDateStatus.PENDING ||
        d.status === ChangeEncounterDateStatus.TENTATIVELY_ACCEPTED
      ) {
        d.status = ChangeEncounterDateStatus.RESOLVED;
        await d.save({ transaction });
        this.logger.debug(`[resolveProposalsForAdminChange] dateId=${d.id} → RESOLVED`);
      }
    }

    await EncounterChangeDate.create(
      {
        encounterChangeId: encounterChange.id,
        date,
        locationId,
        proposedBy: ChangeEncounterParty.HOME,
        status: ChangeEncounterDateStatus.ACCEPTED,
      },
      { transaction }
    );
    this.logger.debug(
      `[resolveProposalsForAdminChange] created ACCEPTED date=${date.toISOString()} for encounterId=${encounterId}`
    );
  }

  private async _loadEvent(encounter: EncounterCompetition): Promise<EventCompetition | null> {
    const draw = await encounter.getDrawCompetition({
      include: [{ model: SubEventCompetition, attributes: ["id", "eventId"] }],
    });
    return EventCompetition.findByPk(draw?.subEventCompetition?.eventId);
  }

  private _assertDeadlineNotPassed(
    encounter: EncounterCompetition,
    event: EventCompetition | null,
    context: string
  ): void {
    if (!event?.changeCloseRequestDatePeriod1 || !event?.changeCloseRequestDatePeriod2) {
      return;
    }
    const isSeason1 =
      !!event.season &&
      (encounter.date?.getFullYear() === event.season ||
        encounter.date?.getFullYear() === event.season + 1);
    const closedDate = isSeason1
      ? event.changeCloseRequestDatePeriod1
      : event.changeCloseRequestDatePeriod2;
    if (moment().isAfter(moment(closedDate))) {
      this.logger.warn(`[${context}] deadline passed encounterId=${encounter.id}`);
      throw new GraphQLError("The deadline for requesting date changes has passed", {
        extensions: { code: ErrorCode.DEADLINE_PASSED },
      });
    }
  }

  private _isInCompetitionSeason(date: Date, season: number): boolean {
    const d = moment(date);
    const start = moment(`${season}-09-01`);
    const end = moment(`${season + 1}-04-30`).endOf("day");
    return d.isBetween(start, end, undefined, "[]");
  }
}
