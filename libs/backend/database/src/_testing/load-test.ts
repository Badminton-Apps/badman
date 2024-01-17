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

export async function loadTest() {
  const logger = new Logger(`Testing data`);
  logger.log('Loading test data');

  const season = getCurrentSeason();
  logger.debug(`Current season: ${season}`);

  const system = addRankingSystem();
  const { event, draw, subEvent, encounter } = addEvent(season);
  const club1 = addClub(
    'BC Broodrooster',
    system,
    season,
    draw,
    subEvent,
    '3757acd9-b42a-4f93-8564-face7557ea07',
    'cab3a0dd-452b-4b6f-b839-320a89d9c0f2',
  );
  const club2 = addClub('BC Tandpasta', system, season, draw, subEvent);

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

    // Didn't find any easy way to do this via builder pattern
    const encounter1 = await encounter.Build();
    encounter1.setHome(await club1.team.Build());
    encounter1.setAway(await club2.team.Build());

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
    .WithMaxDiffLevels(2)
    .WithName('Ranking System')
    .WithGroup(group);

  return system;
}

function addEvent(season: number, id?: string) {
  const encounter = EncounterCompetitionBuilder.Create(id).WithDate(
    new Date(`${season}-10-15`),
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
  clubId?: string,
  teamId?: string,
) {
  const player111F = PlayerBuilder.Create()
    .WithName('F 1-1-1', name)
    .WithCompetitionStatus(false)
    .WithGender('F')
    .WithRanking(
      RankingPlaceBuilder.Create()
        .WithUpdatePossible(true)
        .ForSystem(system)
        .WithRanking(1, 1, 1)
        .WithDate(new Date(`${season}-05-09`)),
    );

  const player555F = PlayerBuilder.Create()
    .WithName('F 5-5-5', name)
    .WithCompetitionStatus(false)
    .WithGender('F')
    .WithRanking(
      RankingPlaceBuilder.Create()
        .WithUpdatePossible(true)
        .ForSystem(system)
        .WithRanking(5, 5, 5)
        .WithDate(new Date(`${season}-05-09`)),
    );
  const player666F = PlayerBuilder.Create()
    .WithName('F 6-6-6', name)
    .WithCompetitionStatus(true)
    .WithGender('F')
    .WithRanking(
      RankingPlaceBuilder.Create()
        .WithUpdatePossible(true)
        .ForSystem(system)
        .WithRanking(6, 6, 6)
        .WithDate(new Date(`${season}-05-09`)),
    );
  const player777F = PlayerBuilder.Create()
    .WithName('F 7-7-7', name)
    .WithCompetitionStatus(true)
    .WithGender('F')
    .WithRanking(
      RankingPlaceBuilder.Create()
        .WithUpdatePossible(true)
        .ForSystem(system)
        .WithRanking(7, 7, 7)
        .WithDate(new Date(`${season}-05-09`)),
    );
  const player888M = PlayerBuilder.Create()
    .WithName('M 8-8-8', name)
    .WithCompetitionStatus(true)
    .WithGender('M')
    .WithRanking(
      RankingPlaceBuilder.Create()
        .WithUpdatePossible(true)
        .ForSystem(system)
        .WithRanking(8, 8, 8)
        .WithDate(new Date(`${season}-05-09`)),
    );
  const player999M = PlayerBuilder.Create()
    .WithName('M 9-9-9', name)
    .WithCompetitionStatus(true)
    .WithGender('M')
    .WithRanking(
      RankingPlaceBuilder.Create()
        .WithUpdatePossible(true)
        .ForSystem(system)
        .WithRanking(9, 9, 9)
        .WithDate(new Date(`${season}-05-09`)),
    );
  const team = TeamBuilder.Create(SubEventTypeEnum.MX, teamId)
    .WithName('team 1G')
    .WithSeason(season)
    .WithTeamNumber(1);

  const club = ClubBuilder.Create(clubId)
    .WithName(name)
    .WithTeam(
      team
        .WithPlayer(player777F, TeamMembershipType.REGULAR)
        .WithPlayer(player888M, TeamMembershipType.REGULAR)
        .WithPlayer(player999M, TeamMembershipType.REGULAR)
        .WithPlayer(player666F, TeamMembershipType.REGULAR)
        .WithPlayer(player111F, TeamMembershipType.REGULAR)
        .WithEntry(
          EventCompetitionEntryBuilder.Create('competition')
            .ForDraw(draw)
            .ForSubEvent(subEvent)
            .WithBasePlayer(player666F, 6, 6, 6)
            .WithBasePlayer(player777F, 7, 7, 7)
            .WithBasePlayer(player888M, 8, 8, 8)
            .WithBasePlayer(player999M, 9, 9, 9)
            .WithBaseIndex(60),
        ),
    );

  return {
    player111: player111F,
    player555: player555F,
    player666: player666F,
    player777: player777F,
    player888: player888M,
    player999: player999M,
    team,
    club,
  };
}
