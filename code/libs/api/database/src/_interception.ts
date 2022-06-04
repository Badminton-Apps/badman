import { ObjectType, IntersectionType, Field } from '@nestjs/graphql';
import {
  TeamPlayerMembership,
  Player,
  GamePlayer,
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
export class GamePlayers extends IntersectionType(GamePlayer, Player) {
  // TODO: move this to rankingplaces?
  @Field(() => RankingPlace, { nullable: true })
  rankingPlace: RankingPlace;
}


@ObjectType()
export class ClubPlayer extends IntersectionType(
  ClubPlayerMembership,
  Club
) {}