import { Field, IntersectionType, ObjectType, OmitType } from '@nestjs/graphql';
import {
  Club,
  ClubPlayerMembership,
  GamePlayerMembership,
  Player,
  RankingPlace,
  Team,
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

@ObjectType('ClubWithPlayers')
export class ClubWithPlayerMembershipType extends Club {
  @Field(() => ClubPlayerMembership, { nullable: true })
  clubMembership?: ClubPlayerMembership;
}

// @ObjectType('ClubWithTeams')
// export class ClubWithTeamMembershipType extends Club {
//   @Field(() => ClubTeamMembership, { nullable: true })
//   teamMembership?: ClubTeamMembership;
// }


@ObjectType('PlayerClub')
export class PlayerWithClubMembershipType extends Player {
  @Field(() => ClubPlayerMembership, { nullable: true })
  clubMembership?: ClubPlayerMembership;
}

@ObjectType('PlayerTeam')
export class PlayerWithTeamMembershipType extends Player {
  @Field(() => TeamPlayerMembership, { nullable: true })
  teamMembership?: TeamPlayerMembership;
}


// @ObjectType('PlayerWithGames')
// export class PlayerWithGamesMembershipType extends Player {
//   @Field(() => [GamePlayerMembershipType], { nullable: true })
//   games?: GamePlayerMembershipType[];
// }


@ObjectType('TeamPlayers')
export class TeamWithPlayerMembershipType extends Team {
  @Field(() => TeamPlayerMembership, { nullable: true })
  teamMembership?: TeamPlayerMembership;
}

