import { Field, IntersectionType, ObjectType } from '@nestjs/graphql';
import {
  Club,
  ClubPlayerMembership,
  GamePlayerMembership,
  Player,
  RankingPlace,
  TeamPlayerMembership,
} from './models';

@ObjectType()
export class GamePlayer extends IntersectionType(GamePlayerMembership, Player) {
  // TODO: move this to rankingplaces?
  @Field(() => RankingPlace, { nullable: true })
  rankingPlace: RankingPlace;
}

@ObjectType()
export class ClubPlayer extends IntersectionType(ClubPlayerMembership, Club) {}

@ObjectType()
export class TeamPlayer extends IntersectionType(
  TeamPlayerMembership,
  Player
) {}
