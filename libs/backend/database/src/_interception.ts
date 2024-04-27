import { Field, IntersectionType, ObjectType, OmitType } from '@nestjs/graphql';
import {
  Club,
  ClubPlayerMembership,
  GamePlayerMembership,
  Player,
  RankingPlace,
  TeamPlayerMembership,
} from './models';

@ObjectType()
export class GamePlayerMembershipType extends IntersectionType(
  OmitType(GamePlayerMembership, ['id'] as const),
  Player,
) {
  // TODO: move this to rankingplaces?
  @Field(() => RankingPlace, { nullable: true })
  rankingPlace?: RankingPlace;
}

@ObjectType()
export class ClubWithMembershipType extends Club {
  @Field(() => ClubPlayerMembership, { nullable: true })
  clubMembership?: ClubPlayerMembership;
}


@ObjectType()
export class PlayerWithMembershipType extends Player {
  @Field(() => ClubPlayerMembership, { nullable: true })
  clubMembership?: ClubPlayerMembership;
}

@ObjectType()
export class TeamPlayerMembershipType extends IntersectionType(
  OmitType(TeamPlayerMembership, ['id'] as const),
  Player,
) {}
