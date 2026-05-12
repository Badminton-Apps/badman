import { ClubPlayerMembership } from "@badman/backend-database";
import { Injectable } from "@nestjs/common";
import { FindOrCreateOptions, ModelStatic, Transaction } from "sequelize";

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
    const options: FindOrCreateOptions = {
      where: { clubId, playerId, start },
      defaults: { start, end, membershipType, confirmed },
      transaction,
    };
    const [membership, created] = await (
      ClubPlayerMembership as unknown as ModelStatic<ClubPlayerMembership>
    ).findOrCreate(options);

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
