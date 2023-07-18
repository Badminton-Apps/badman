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
  Player
) {
  // TODO: move this to rankingplaces?
  @Field(() => RankingPlace, { nullable: true })
  rankingPlace?: RankingPlace;
}

@ObjectType()
export class ClubPlayerMembershipType extends IntersectionType(
  OmitType(ClubPlayerMembership, ['id'] as const),
  Club
) {}

@ObjectType()
export class TeamPlayerMembershipType extends IntersectionType(
  OmitType(TeamPlayerMembership, ['id'] as const),
  Player
) {}

