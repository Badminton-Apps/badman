import { Club, Team, TeamPlayerMembership } from "@badman/backend-database";
import { Injectable, Logger } from "@nestjs/common";
import { v4 as uuid } from "uuid";
import { Transaction } from "sequelize";

export interface UpsertTeamCoreArgs {
  link?: string | null;
  clubId: string;
  season: number;
  type: string;
  captainId?: string | null;
  email?: string | null;
  phone?: string | null;
  preferredDay?: string | null;
  preferredTime?: string | null;
  prefferedLocationId?: string | null;
  players: string[];
  txId: string;
  txIndex: number;
  transaction: Transaction;
}

export interface UpsertTeamCoreResult {
  teamId: string;
  link: string;
  alreadyExisted: boolean;
}

export interface ApplyTeamNumbersArgs {
  teams: { teamId: string; teamNumber: number }[];
  clubId: string;
  transaction: Transaction;
}

export interface ApplyTeamNumbersResult {
  teamId: string;
  teamNumber: number;
  name: string;
  abbreviation: string;
}

@Injectable()
export class TeamWriteService {
  private readonly logger = new Logger(TeamWriteService.name);

  async upsertTeamCore({
    link,
    clubId,
    season,
    type,
    captainId,
    email,
    phone,
    preferredDay,
    preferredTime,
    prefferedLocationId,
    players,
    txId,
    txIndex,
    transaction,
  }: UpsertTeamCoreArgs): Promise<UpsertTeamCoreResult> {
    const resolvedLink = link ?? uuid();
    const tempNumber = 1_000_000_000 + txIndex;
    const tempName = `__tmp_${txId}_${txIndex}`;
    const tempAbbr = `__T${txIndex}`;

    let team: Team | null = null;
    if (link) {
      team = await Team.findOne({
        where: { link, season, clubId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
    }

    let alreadyExisted: boolean;

    if (!team) {
      team = await Team.create(
        {
          link: resolvedLink,
          clubId,
          season,
          type,
          captainId: captainId ?? undefined,
          email: email ?? undefined,
          phone: phone ?? undefined,
          preferredDay: preferredDay ?? undefined,
          preferredTime: preferredTime ?? undefined,
          prefferedLocationId: prefferedLocationId ?? undefined,
          teamNumber: tempNumber,
          name: tempName,
          abbreviation: tempAbbr,
        } as unknown as Team,
        { transaction, hooks: false }
      );
      alreadyExisted = false;
    } else {
      const updateData: Partial<Team> = {
        link: resolvedLink,
        captainId: captainId ?? team.captainId,
        email: email ?? team.email,
        phone: phone ?? team.phone,
        preferredDay: preferredDay ?? team.preferredDay,
        prefferedLocationId: prefferedLocationId ?? team.prefferedLocationId,
      };
      if (preferredTime !== null && preferredTime !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (updateData as any).preferredTime = preferredTime;
      }
      await team.update(updateData as Team, { transaction, hooks: false });
      alreadyExisted = true;
    }

    // sync TeamPlayerMembership rows
    const currentMemberships = await TeamPlayerMembership.findAll({
      where: { teamId: team.id, end: null as unknown as Date },
      transaction,
    });
    const currentPlayerIds = currentMemberships
      .map((m) => m.playerId)
      .filter((p): p is string => p !== undefined);

    const toAdd = players.filter((pid) => !currentPlayerIds.includes(pid));
    const toRemove = currentPlayerIds.filter((pid) => !players.includes(pid));

    if (toAdd.length > 0) {
      await Promise.all(
        toAdd.map((playerId) =>
          TeamPlayerMembership.create(
            { teamId: team.id, playerId, start: new Date() },
            { transaction }
          )
        )
      );
    }

    if (toRemove.length > 0) {
      await TeamPlayerMembership.update(
        { end: new Date() },
        { where: { teamId: team.id, playerId: toRemove }, transaction }
      );
    }

    return { teamId: team.id as string, link: resolvedLink, alreadyExisted };
  }

  async applyTeamNumbersTwoPhase({
    teams,
    clubId: _clubId,
    transaction,
  }: ApplyTeamNumbersArgs): Promise<ApplyTeamNumbersResult[]> {
    // Pass B-1: vacate all unique slots with temp values (no hook)
    for (let i = 0; i < teams.length; i++) {
      const { teamId } = teams[i];
      const tempNumber = 2_000_000_000 + i;
      const tempName = `__phase1_${teamId}_${i}`;
      const tempAbbr = `__P1${i}`;
      await Team.update(
        { teamNumber: tempNumber, name: tempName, abbreviation: tempAbbr },
        { where: { id: teamId }, transaction, individualHooks: false }
      );
    }

    // Pass B-2: write real teamNumbers, let hook regenerate name/abbreviation
    const results: ApplyTeamNumbersResult[] = [];
    for (const { teamId, teamNumber } of teams) {
      await Team.update(
        { teamNumber },
        { where: { id: teamId }, transaction, individualHooks: true }
      );

      const reloaded = await Team.findByPk(teamId, {
        include: [{ model: Club, as: "club" }],
        transaction,
      });

      if (!reloaded) {
        throw new Error(`Team disappeared after update: ${teamId}`);
      }

      // If hook didn't regenerate (e.g. no club loaded), derive name manually
      if (!reloaded.name || reloaded.name.startsWith("__")) {
        await Team.generateName(reloaded, { transaction } as never);
        await Team.generateAbbreviation(reloaded, { transaction } as never);
        await reloaded.save({ transaction, hooks: false });
      }

      this.logger.debug(`Team ${teamId} → number ${teamNumber}, name "${reloaded.name}"`);
      results.push({
        teamId,
        teamNumber,
        name: reloaded.name as string,
        abbreviation: (reloaded.abbreviation ?? "") as string,
      });
    }

    return results;
  }
}
