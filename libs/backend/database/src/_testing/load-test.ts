import {
  TestNames,
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
  const { event, m, f, mx } = addEncounters(season);
  const club1 = addClub(TestNames.BCBroodrooster.name, system, season);
  const club2 = addClub(TestNames.BCTandpasta.name, system, season);

  addEntry(
    club1.teamMx,
    mx.draw,
    mx.subEvent,
    club1.f.player666,
    club1.f.player777,
    club1.m.player888,
    club1.m.player999,
  );
  addEntry(
    club1.teamM,
    m.draw,
    m.subEvent,
    club1.m.player666,
    club1.m.player777,
    club1.m.player888,
    club1.m.player999,
  );
  addEntry(
    club1.teamF,
    f.draw,
    f.subEvent,
    club1.f.player555,
    club1.f.player666,
    club1.f.player777,
    club1.f.player888,
  );

  addEntry(
    club2.teamMx,
    mx.draw,
    mx.subEvent,
    club2.f.player666,
    club2.f.player777,
    club2.m.player888,
    club2.m.player999,
  );
  addEntry(
    club2.teamM,
    m.draw,
    m.subEvent,
    club2.m.player666,
    club2.m.player777,
    club2.m.player888,
    club2.m.player999,
  );
  addEntry(
    club2.teamF,
    f.draw,
    f.subEvent,
    club2.f.player555,
    club2.f.player666,
    club2.f.player777,
    club2.f.player888,
  );

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
    const encounter1 = await mx.encounter.Build();
    encounter1.setHome(await club1.teamMx.Build());
    encounter1.setAway(await club2.teamMx.Build());

    const encounter2 = await m.encounter.Build();
    encounter2.setHome(await club1.teamM.Build());
    encounter2.setAway(await club2.teamM.Build());

    const encounter3 = await f.encounter.Build();
    encounter3.setHome(await club1.teamF.Build());
    encounter3.setAway(await club2.teamF.Build());

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

function addEncounters(season: number) {
  const encounterMx = EncounterCompetitionBuilder.Create().WithDate(new Date(`${season}-10-15`));
  const encounterM = EncounterCompetitionBuilder.Create().WithDate(new Date(`${season}-10-15`));
  const encounterF = EncounterCompetitionBuilder.Create().WithDate(new Date(`${season}-10-15`));

  const drawMx = DrawCompetitionBuilder.Create().WithName('Test draw MX');
  const drawM = DrawCompetitionBuilder.Create().WithName('Test draw M');
  const drawF = DrawCompetitionBuilder.Create().WithName('Test draw F');

  const subEventMX = SubEventCompetitionBuilder.Create(SubEventTypeEnum.MX)
    .WithName('Test SubEvent')
    .WithIndex(53, 70)
    .WitnMaxLevel(6);

  const subEventM = SubEventCompetitionBuilder.Create(SubEventTypeEnum.M)
    .WithName('Test SubEvent')
    .WithIndex(53, 70)
    .WitnMaxLevel(6);

  const subEventF = SubEventCompetitionBuilder.Create(SubEventTypeEnum.F)
    .WithName('Test SubEvent')
    .WithIndex(53, 70)
    .WitnMaxLevel(6);

  const event = EventCompetitionBuilder.Create()
    .WithYear(season)
    .WithOfficial(true)
    .WithUsedRanking({ amount: 4, unit: 'months' })
    .WithName('Test Event');

  event.WithSubEvent(subEventMX);
  event.WithSubEvent(subEventM);
  event.WithSubEvent(subEventF);

  subEventMX.WithDraw(drawMx);
  subEventM.WithDraw(drawM);
  subEventF.WithDraw(drawF);

  drawMx.WithEnouncter(encounterMx);
  drawM.WithEnouncter(encounterM);
  drawF.WithEnouncter(encounterF);

  return {
    event,
    mx: {
      encounter: encounterMx,
      draw: drawMx,
      subEvent: subEventMX,
    },
    m: {
      encounter: encounterM,
      draw: drawM,
      subEvent: subEventM,
    },
    f: {
      encounter: encounterF,
      draw: drawF,
      subEvent: subEventF,
    },
  };
}

function addClub(
  name: string,
  system: SystemBuilder,
  season: number,
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
  const player888F = PlayerBuilder.Create()
    .WithName('F 8-8-8', name)
    .WithCompetitionStatus(true)
    .WithGender('F')
    .WithRanking(
      RankingPlaceBuilder.Create()
        .WithUpdatePossible(true)
        .ForSystem(system)
        .WithRanking(8, 8, 8)
        .WithDate(new Date(`${season}-05-09`)),
    );

  const player666M = PlayerBuilder.Create()
    .WithName('M 6-6-6', name)
    .WithCompetitionStatus(true)
    .WithGender('M')
    .WithRanking(
      RankingPlaceBuilder.Create()
        .WithUpdatePossible(true)
        .ForSystem(system)
        .WithRanking(6, 6, 6)
        .WithDate(new Date(`${season}-05-09`)),
    );

  const player777M = PlayerBuilder.Create()
    .WithName('M 7-7-7', name)
    .WithCompetitionStatus(true)
    .WithGender('M')
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
  const teamMx = TeamBuilder.Create(SubEventTypeEnum.MX, teamId)
    .WithName('team 1G')
    .WithSeason(season)
    .WithTeamNumber(1);
  const teamM = TeamBuilder.Create(SubEventTypeEnum.M, teamId)
    .WithName('team 1H')
    .WithSeason(season)
    .WithTeamNumber(1);
  const teamF = TeamBuilder.Create(SubEventTypeEnum.F, teamId)
    .WithName('team 1D')
    .WithSeason(season)
    .WithTeamNumber(1);

  const club = ClubBuilder.Create(clubId)
    .WithName(name)
    .WithTeam(
      teamMx
        .WithPlayer(player777F, TeamMembershipType.REGULAR)
        .WithPlayer(player888M, TeamMembershipType.REGULAR)
        .WithPlayer(player999M, TeamMembershipType.REGULAR)
        .WithPlayer(player666F, TeamMembershipType.REGULAR)
        .WithPlayer(player111F, TeamMembershipType.REGULAR),
    )
    .WithTeam(
      teamM
        .WithPlayer(player666M, TeamMembershipType.REGULAR)
        .WithPlayer(player777M, TeamMembershipType.REGULAR)
        .WithPlayer(player888M, TeamMembershipType.REGULAR)
        .WithPlayer(player999M, TeamMembershipType.REGULAR),
    )
    .WithTeam(
      teamF
        .WithPlayer(player111F, TeamMembershipType.REGULAR)
        .WithPlayer(player555F, TeamMembershipType.REGULAR)
        .WithPlayer(player666F, TeamMembershipType.REGULAR)
        .WithPlayer(player777F, TeamMembershipType.REGULAR)
        .WithPlayer(player888F, TeamMembershipType.REGULAR),
    );

  return {
    m: {
      player666: player666M,
      player777: player777M,
      player888: player888M,
      player999: player999M,
    },
    f: {
      player111: player111F,
      player555: player555F,
      player666: player666F,
      player777: player777F,
      player888: player888F,
    },

    teamMx: teamMx,
    teamM: teamM,
    teamF: teamF,
    club,
  };
}

function addEntry(
  team: TeamBuilder,
  draw: DrawCompetitionBuilder,
  subEvent: SubEventCompetitionBuilder,
  player666F: PlayerBuilder,
  player777F: PlayerBuilder,
  player888M: PlayerBuilder,
  player999M: PlayerBuilder,
) {
  team.WithEntry(
    EventCompetitionEntryBuilder.Create('competition')
      .ForDraw(draw)
      .ForSubEvent(subEvent)
      .WithBasePlayer(player666F, 6, 6, 6)
      .WithBasePlayer(player777F, 7, 7, 7)
      .WithBasePlayer(player888M, 8, 8, 8)
      .WithBasePlayer(player999M, 9, 9, 9)
      .WithBaseIndex(60),
  );
}
