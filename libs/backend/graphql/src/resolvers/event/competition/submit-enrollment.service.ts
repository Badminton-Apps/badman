import {
  Club,
  Comment,
  Player,
  SubEventCompetition,
} from "@badman/backend-database";
import { ClubMembershipType } from "@badman/utils";
import { Injectable, Logger } from "@nestjs/common";
import { GraphQLError } from "graphql";
import { Transaction } from "sequelize";
import { ClubMembershipService } from "../../club/club-membership.service";
import { EnrollmentEntryService } from "./enrollment-entry.service";
import { EnrollmentFinalizeService } from "../enrollment-finalize.service";
import { TeamWriteService } from "../../team/team-write.service";
import { SubmitEnrollmentInput } from "./submit-enrollment.input";
import { SubmitEnrollmentTeamResult } from "./submit-enrollment-result.object";
import { ErrorCode } from "../../../utils";

export interface SubmitEnrollmentServiceResult {
  alreadyFinalised: boolean;
  teams: SubmitEnrollmentTeamResult[];
}

export interface SubmitEnrollmentRunArgs {
  input: SubmitEnrollmentInput;
  user: Player;
  confirmed: boolean;
  transaction: Transaction;
}

const MAX_TEAMS = 50;

@Injectable()
export class SubmitEnrollmentService {
  private readonly logger = new Logger(SubmitEnrollmentService.name);

  constructor(
    private readonly clubMembershipService: ClubMembershipService,
    private readonly teamWriteService: TeamWriteService,
    private readonly enrollmentEntryService: EnrollmentEntryService,
    private readonly enrollmentFinalizeService: EnrollmentFinalizeService,
  ) {}

  async run({ input, user, confirmed, transaction }: SubmitEnrollmentRunArgs): Promise<SubmitEnrollmentServiceResult> {
    const { clubId, season, adminEmail, teams, transfers, loans, remarks } = input;
    const txId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // (1) Sanity checks — no DB writes yet
    await this.sanity(input, transaction);

    // (2) Transfers
    for (const t of transfers) {
      await this.clubMembershipService.upsertMembership({
        clubId,
        playerId: t.playerId,
        start: t.start,
        end: t.end,
        membershipType: ClubMembershipType.NORMAL,
        confirmed,
        transaction,
      });
    }

    // (3) Loans
    for (const l of loans) {
      await this.clubMembershipService.upsertMembership({
        clubId,
        playerId: l.playerId,
        start: l.start,
        end: l.end,
        membershipType: ClubMembershipType.LOAN,
        confirmed,
        transaction,
      });
    }

    // (4) Phase A: write each team without final teamNumber/name/abbreviation
    const coreResults: { teamId: string; link: string; alreadyExisted: boolean; inputIndex: number }[] = [];
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      const core = await this.teamWriteService.upsertTeamCore({
        id: team.id,
        link: team.link,
        clubId,
        season,
        type: team.type,
        captainId: team.captainId,
        email: team.email,
        phone: team.phone,
        preferredDay: team.preferredDay,
        preferredTime: team.preferredTime,
        prefferedLocationId: team.preferredLocationId,
        players: team.players,
        txId,
        txIndex: i,
        transaction,
      });
      coreResults.push({ ...core, inputIndex: i });
    }

    // (5) Phase B: two-phase team number write
    const numberedResults = await this.teamWriteService.applyTeamNumbersTwoPhase({
      teams: coreResults.map((r, i) => ({ teamId: r.teamId, teamNumber: teams[i].teamNumber })),
      clubId,
      transaction,
    });

    // (6) Create enrollment entries
    const teamResults: SubmitEnrollmentTeamResult[] = [];
    for (let i = 0; i < coreResults.length; i++) {
      const core = coreResults[i];
      const numbered = numberedResults[i];
      const team = teams[i];

      const entry = await this.enrollmentEntryService.createEntry({
        teamId: core.teamId,
        subEventId: team.subEventId,
        transaction,
        user,
      });

      teamResults.push({
        inputIndex: core.inputIndex,
        teamId: core.teamId,
        link: core.link,
        teamNumber: numbered.teamNumber,
        name: numbered.name,
        abbreviation: numbered.abbreviation,
        entryId: entry.entryId,
        alreadyExisted: core.alreadyExisted,
      });
    }

    // (7) Remarks (best-effort)
    if (remarks?.trim()) {
      await this.writeRemarks({ clubId, teams: input.teams, remarks, transaction });
    }

    // (8) Finalize (stamp sendOn, update contactCompetition, write Logging)
    const club = await Club.findByPk(clubId, { transaction });
    if (!club) {
      throw new GraphQLError(`Club not found: ${clubId}`, {
        extensions: { code: ErrorCode.CLUB_NOT_FOUND, clubId },
      });
    }

    const { alreadyFinalised } = await this.enrollmentFinalizeService.finalize({
      clubId,
      season,
      email: adminEmail,
      user,
      club,
      transaction,
    });

    return { alreadyFinalised, teams: teamResults };
  }

  private async sanity(input: SubmitEnrollmentInput, transaction: Transaction): Promise<void> {
    const { teams } = input;

    if (teams.length === 0) {
      throw new GraphQLError("No teams to submit", {
        extensions: { code: ErrorCode.NO_TEAMS_TO_FINALISE, clubId: input.clubId, season: input.season },
      });
    }

    if (teams.length > MAX_TEAMS) {
      throw new GraphQLError(`Too many teams (max ${MAX_TEAMS})`, {
        extensions: { code: ErrorCode.VALIDATION_FAILED, issue: "team-count-exceeded", count: teams.length },
      });
    }

    // Duplicate teamNumber within same type scope
    const byType = new Map<string, Set<number>>();
    for (const team of teams) {
      const key = team.type;
      if (!byType.has(key)) byType.set(key, new Set());
      const set = byType.get(key)!;
      if (set.has(team.teamNumber)) {
        throw new GraphQLError(`Duplicate team number ${team.teamNumber} for type ${team.type}`, {
          extensions: {
            code: ErrorCode.VALIDATION_FAILED,
            issue: "duplicate-team-number",
            teamNumber: team.teamNumber,
            type: team.type,
          },
        });
      }
      set.add(team.teamNumber);
    }

    // subEvent.eventType must match team.type
    for (const team of teams) {
      const subEvent = await SubEventCompetition.findByPk(team.subEventId, { transaction });
      if (!subEvent) {
        throw new GraphQLError(`SubEvent not found: ${team.subEventId}`, {
          extensions: { code: ErrorCode.SUB_EVENT_NOT_FOUND, subEventId: team.subEventId },
        });
      }
      if (subEvent.eventType !== team.type) {
        throw new GraphQLError(
          `subEvent.eventType (${subEvent.eventType}) does not match team.type (${team.type})`,
          {
            extensions: {
              code: ErrorCode.VALIDATION_FAILED,
              issue: "subevent-type-mismatch",
              subEventId: team.subEventId,
              subEventType: subEvent.eventType,
              teamType: team.type,
            },
          }
        );
      }
    }

    // basePlayers ⊆ players
    for (const team of teams) {
      const invalidBase = team.basePlayers.filter((bp) => !team.players.includes(bp));
      if (invalidBase.length > 0) {
        throw new GraphQLError(`basePlayers must be a subset of players`, {
          extensions: {
            code: ErrorCode.VALIDATION_FAILED,
            issue: "base-not-in-roster",
            invalidPlayerIds: invalidBase,
          },
        });
      }
    }
  }

  private async writeRemarks({
    clubId,
    teams,
    remarks,
    transaction,
  }: {
    clubId: string;
    teams: SubmitEnrollmentInput["teams"];
    remarks: string;
    transaction: Transaction;
  }): Promise<void> {
    const subEventIds = [...new Set(teams.map((t) => t.subEventId))];
    const subEvents = await SubEventCompetition.findAll({
      where: { id: subEventIds },
      attributes: ["id", "eventId"],
      transaction,
    });

    const eventIds = [...new Set(subEvents.map((se) => se.eventId))];
    for (const eventId of eventIds) {
      try {
        await Comment.create(
          { linkType: "competition", linkId: eventId, clubId, message: remarks },
          { transaction }
        );
      } catch (e) {
        this.logger.warn(`Failed to write remark for event ${eventId}`, e);
      }
    }
  }
}
