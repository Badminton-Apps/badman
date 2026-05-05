import { ClubPlayerMembership } from "@badman/backend-database";
import { Injectable } from "@nestjs/common";
import { Transaction } from "sequelize";

export interface UpsertMembershipArgs {
  clubId: string;
  playerId: string;
  start: Date;
  end?: Date | null;
  membershipType: string;
  confirmed: boolean;
  transaction: Transaction;
}

export interface UpsertMembershipResult {
  id: string;
  clubId: string;
  playerId: string;
  start: Date;
  end: Date | null;
  membershipType: string;
  alreadyExisted: boolean;
}

@Injectable()
export class ClubMembershipService {
  async upsertMembership({
    clubId,
    playerId,
    start,
    end,
    membershipType,
    confirmed,
    transaction,
  }: UpsertMembershipArgs): Promise<UpsertMembershipResult> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [membership, created] = await (ClubPlayerMembership as any).findOrCreate({
      where: { clubId, playerId, start },
      defaults: { start, end, membershipType, confirmed },
      transaction,
    });

    return {
      id: membership.id as string,
      clubId,
      playerId,
      start: membership.start as Date,
      end: (membership.end as Date | null | undefined) ?? null,
      membershipType: membership.membershipType as string,
      alreadyExisted: !created,
    };
  }
}
