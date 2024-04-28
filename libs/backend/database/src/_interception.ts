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
export class ClubWithPlayerMembershipType extends Club {
  @Field(() => ClubPlayerMembership, { nullable: true })
  clubMembership?: ClubPlayerMembership;
}


@ObjectType()
export class PlayerWithClubMembershipType extends Player {
  @Field(() => ClubPlayerMembership, { nullable: true })
  clubMembership?: ClubPlayerMembership;
}

@ObjectType()
export class PlayerWithTeamMembershipType extends Player {
  @Field(() => TeamPlayerMembership, { nullable: true })
  teamMembership?: TeamPlayerMembership;
}
