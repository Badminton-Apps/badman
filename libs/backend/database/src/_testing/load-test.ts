import {
  RankingSystems,
  SubEventTypeEnum,
  TeamMembershipType,
  getCurrentSeason,
} from '@badman/utils';
import { ClubBuilder } from './clubBuilder';
import { EventCompetitionBuilder } from './eventCompetitionBuilder';
import { DrawCompetitionBuilder } from './eventCompetitionDrawBuilder';
import { EncounterCompetitionBuilder } from './eventCompetitionEncounterBuilder';
import { EventCompetitionEntryBuilder } from './eventCompetitionEntryBuilder';
import { SubEventCompetitionBuilder } from './eventCompetitionSubEventBuilder';
import { PlayerBuilder } from './playerBuilder';
import { RankingPlaceBuilder } from './rankingPlaceBuilder';
import { SystemBuilder } from './systemBuilder';
import { SystemGroupBuilder } from './systemGroupBuilder';
import { TeamBuilder } from './teamBuilder';
import { Logger } from '@nestjs/common';
import { TeamPlayerMembershipType } from '../_interception';

export async function loadTest() {
  const logger = new Logger(`Testing data`);
  logger.log('Loading test data');

  const season = getCurrentSeason();
  logger.debug(`Current season: ${season}`);

  const system = addRankingSystem();
  const { event, draw, subEvent } = addEvent(season);
  const club1 = addClub('BC Broodrooster', system, season, draw, subEvent);
  const club2 = addClub('BC Tandpasta', system, season, draw, subEvent);

  // // encounter.WithHomeTeam(club1.team);
  // // encounter.WithAwayTeam(club2.team);

  // // await encounter.Build();
  try {
    logger.log('Building test data');
    logger.debug('Building ranking system');
    await system.Build();
    logger.debug('Building event');
    await event.Build();

    logger.debug('loading club 1');
    await club1.club.Build();
    logger.debug('loading club 2');
    await club2.club.Build();

    logger.log('Done building test data');
  } catch (error) {
    console.error(error);
    throw 'Loading test data failed';
  }
}

function addRankingSystem() {
  const group = SystemGroupBuilder.Create();
  const system = SystemBuilder.Create(RankingSystems.BVL, 12, 75, 50)
    .AsPrimary()
    .WithName('Ranking System')
    .WithGroup(group);

  return system;
}

function addEvent(season: number) {
  const encounter = EncounterCompetitionBuilder.Create().WithDate(
    new Date(`${season}-05-09`),
  );
  const draw = DrawCompetitionBuilder.Create().WithName('Test draw');

  const subEvent = SubEventCompetitionBuilder.Create(SubEventTypeEnum.MX)
    .WithName('Test SubEvent')
    .WithIndex(53, 70)
    .WitnMaxLevel(6);

  const event = EventCompetitionBuilder.Create()
    .WithYear(season)
    .WithUsedRanking({ amount: 4, unit: 'months' })
    .WithName('Test Event');

  event.WithSubEvent(subEvent);
  subEvent.WithDraw(draw);
  draw.WithEnouncter(encounter);

  return {
    event,
    draw,
    subEvent,
    encounter,
  };
}

function addClub(
  name: string,
  system: SystemBuilder,
  season: number,
  draw: DrawCompetitionBuilder,
  subEvent: SubEventCompetitionBuilder,
) {
  const player111 = PlayerBuilder.Create()
    .WithName('player 1 - 1 - 1', 'team 1')
    .WithCompetitionStatus(false)
    .WithRanking(
      RankingPlaceBuilder.Create()
        .ForSystem(system)
        .WithRanking(1, 1, 1)
        .WithDate(new Date('2020-05-09')),
    );

  const player555 = PlayerBuilder.Create()
    .WithName('player 5 - 5 - 5', 'team 1')
    .WithCompetitionStatus(false)
    .WithGender('F')
    .WithRanking(
      RankingPlaceBuilder.Create()
        .ForSystem(system)
        .WithRanking(5, 5, 5)
        .WithDate(new Date('2020-05-09')),
    );

  const player666 = PlayerBuilder.Create()
    .WithName('player 6 - 6 - 6', 'team 1')
    .WithCompetitionStatus(true)
    .WithGender('M')
    .WithRanking(
      RankingPlaceBuilder.Create()
        .ForSystem(system)
        .WithRanking(6, 6, 6)
        .WithDate(new Date('2020-05-09')),
    );

  const player777 = PlayerBuilder.Create()
    .WithName('player 7 - 7 - 7', 'team 1')
    .WithCompetitionStatus(true)
    .WithGender('M')
    .WithRanking(
      RankingPlaceBuilder.Create()
        .ForSystem(system)
        .WithRanking(7, 7, 7)
        .WithDate(new Date('2020-05-09')),
    );

  const player888 = PlayerBuilder.Create()
    .WithName('player 8 - 8 - 8', 'team 1')
    .WithCompetitionStatus(true)
    .WithGender('M')
    .WithRanking(
      RankingPlaceBuilder.Create()
        .ForSystem(system)
        .WithRanking(8, 8, 8)
        .WithDate(new Date('2020-05-09')),
    );

  const player999 = PlayerBuilder.Create()
    .WithName('player 9 - 9 - 9', 'team 1')
    .WithCompetitionStatus(true)
    .WithGender('M')
    .WithRanking(
      RankingPlaceBuilder.Create()
        .ForSystem(system)
        .WithRanking(9, 9, 9)
        .WithDate(new Date('2020-05-09')),
    );

  const team = TeamBuilder.Create(SubEventTypeEnum.MX)
    .WithName('team 1H') 
    .WithSeason(season)
    .WithTeamNumber(1);

  const club = ClubBuilder.Create()
    .WithName(name)
    .WithTeam(
      team
        .WithPlayer(player777, TeamMembershipType.REGULAR)
        .WithPlayer(player888, TeamMembershipType.REGULAR)
        .WithPlayer(player999, TeamMembershipType.REGULAR)
        .WithPlayer(player666, TeamMembershipType.REGULAR)
        .WithEntry(
          EventCompetitionEntryBuilder.Create('competition')
            .ForDraw(draw)
            .ForSubEvent(subEvent)
            .WithBasePlayer(player666, 6, 6, 6)
            .WithBasePlayer(player777, 7, 7, 7)
            .WithBasePlayer(player888, 8, 8, 8)
            .WithBasePlayer(player999, 9, 9, 9)
            .WithBaseIndex(60),
        ),
    );

  return {
    player111,
    player555,
    player666,
    player777,
    player888,
    player999,
    team,
    club,
  };
}
