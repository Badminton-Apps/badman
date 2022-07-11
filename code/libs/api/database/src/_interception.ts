import { ObjectType, IntersectionType, Field } from '@nestjs/graphql';
import {
  TeamPlayerMembership,
  Player,
  GamePlayerMembership,
  RankingPlace,
  ClubPlayerMembership,
  Club,
} from './models';

@ObjectType()
export class TeamPlayer extends IntersectionType(
  TeamPlayerMembership,
  Player
) {}

@ObjectType()
export class GamePlayer extends IntersectionType(GamePlayerMembership, Player) {
  // TODO: move this to rankingplaces?
  @Field(() => RankingPlace, { nullable: true })
  rankingPlace: RankingPlace;
}

@ObjectType()
export class ClubPlayer extends IntersectionType(ClubPlayerMembership, Club) {}
