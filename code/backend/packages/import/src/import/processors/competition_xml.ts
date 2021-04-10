import { ImportStep } from './../import-step';
import {
  Club,
  correctWrongPlayers,
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  EventImportType,
  Game,
  GamePlayer,
  ImporterFile,
  logger,
  Player,
  SubEventCompetition,
  SubEventType,
  Team,
  TeamSubEventMembership,
  titleCase
} from '@badvlasim/shared';
import { parse } from 'fast-xml-parser';
import { readFileSync, unlink } from 'fs';
import moment from 'moment';
import { Op, Transaction } from 'sequelize';
import { CompetitionProcessor } from './competition';

export class CompetitionXmlProcessor extends CompetitionProcessor {
  constructor() {
    super();

    this.addImportStep(this.findEvent());
    this.addImportStep(this.cleanupEvent());
    this.addImportStep(this.addEvent());
    this.addImportStep(this.loadXml());
    this.addImportStep(this.addSubEvents());
    this.addImportStep(this.addDraws());
    this.addImportStep(this.addClubs());
    this.addImportStep(this.addTeams());
    this.addImportStep(this.addPlayers());
    this.addImportStep(this.addTeamsToSubEvents());
    this.addImportStep(this.addPlayersToTeams());
    this.addImportStep(this.addPlayersToTClubs());
    this.addImportStep(this.addEncounters());
    this.addImportStep(this.addGames());

    this.addImportFileStep(this.addImportFile());
  }

  async import(
    importFile: ImporterFile,
    args?: { transaction?: Transaction; event?: EventCompetition }
  ) {
    return super.import({ importFile, ...args });
  }

  async importFile(fileLocation: string, transaction?: Transaction) {
    return super.importFile({ transaction, fileLocation });
  }

  protected loadXml(): ImportStep<{ name: string; teams: any[]; events: any[] }> {
    return new ImportStep('load', async (args: { importFile: ImporterFile }) => {
      const xmlData = parse(readFileSync(args.importFile.fileLocation, 'utf8'));

      const teams = Array.isArray(xmlData.League.Team)
        ? [...xmlData.League.Team]
        : [xmlData.League.Team];
      const events = Array.isArray(xmlData.League.Event)
        ? [...xmlData.League.Event]
        : [xmlData.League.Event];

      return {
        name: xmlData.LeagueName,
        teams: teams.filter(team => team.TeamName !== ''),
        events
      };
    });
  }

  protected addSubEvents(): ImportStep<{ subEvent: SubEventCompetition; divisions: any[] }[]> {
    return new ImportStep('subEvents', async (args: { transaction: Transaction }) => {
      // get previous step data
      const event: EventCompetition = this.importSteps.get('event').getData();
      const data: { teams: any[]; events: any[] } = this.importSteps.get('load').getData();

      const subEvents = [];
      const xmlDivisions = [];
      for (const subEvent of data.events) {
        // Damn that info is deep
        // Fallback on MX
        let eventType = SubEventType.MX;

        const divisions = Array.isArray(subEvent.Division)
          ? [...subEvent.Division]
          : [subEvent.Division];

        if (divisions && divisions.length > 0) {
          const firstFixture = (Array.isArray(divisions[0].Fixture)
            ? [...divisions[0].Fixture]
            : [divisions[0].Fixture])[0];

          if (firstFixture && !!firstFixture.Match) {
            const matches = Array.isArray(firstFixture.Match)
              ? [...firstFixture.Match]
              : [firstFixture.Match];

            // fiew, Got it now
            eventType = matches.find(
              r => r?.MatchType === null || r.MatchType === 5 || r.MatchType === 'GD'
            )
              ? SubEventType.MX
              : matches.find(r => r.MatchType === 1 || r.MatchType === 'HD')
              ? SubEventType.M
              : SubEventType.F;
          }
        }

        const name = this.cleanedSubEventName(subEvent.EventName);
        const level = this.getLevel(name);
        const foundEventIndex = subEvents.findIndex(
          r => r.name === name && r.level === level && r.eventType === eventType
        );

        // This is when the the draws are configured as subevents (liga did so...)
        if (foundEventIndex === -1) {
          subEvents.push(
            new SubEventCompetition({
              name,
              level,
              eventType,
              eventId: event.id
            }).toJSON()
          );
          xmlDivisions.push(divisions);
        } else {
          xmlDivisions[foundEventIndex] = xmlDivisions[foundEventIndex].concat(divisions);
        }
      }

      const dbSubEvents = await SubEventCompetition.bulkCreate(subEvents, {
        transaction: args.transaction,
        returning: ['*']
      });

      return dbSubEvents.map((v, i) => {
        return {
          subEvent: v,
          divisions: xmlDivisions[i]
        };
      });
    });
  }

  protected addDraws(): ImportStep<{ draw: DrawCompetition; fixtures: any[] }[]> {
    return new ImportStep('draws', async (args: { transaction: Transaction }) => {
      // get previous step data
      const subEvents: { subEvent: SubEventCompetition; divisions: any[] }[] = this.importSteps
        .get('subEvents')
        .getData();

      const draws = [];
      const fixtures = [];

      for (const subEvent of subEvents) {
        for (const division of subEvent.divisions) {
          draws.push(
            new DrawCompetition({
              name: division.DivisionName,
              subeventId: subEvent.subEvent.id,
              size: division.DivisionSize
            }).toJSON()
          );

          fixtures.push(
            division.Fixture === null
              ? []
              : Array.isArray(division.Fixture)
              ? [...division.Fixture]
              : [division.Fixture]
          );
        }
      }

      const dbDraws = await DrawCompetition.bulkCreate(draws, {
        ignoreDuplicates: true,
        transaction: args.transaction
      });

      // Return result
      return dbDraws.map((v, i) => {
        return {
          draw: v,
          fixtures: fixtures[i]
        };
      });
    });
  }

  protected addClubs(): ImportStep<Club[]> {
    return new ImportStep('clubs', async (args: { transaction: Transaction }) => {
      const data: { teams: any[]; events: any[] } = this.importSteps.get('load').getData();

      const teamClubDistinct = data.teams.filter(
        (value, index, self) =>
          self.findIndex(m => m.TeamClubSiebelId === value.TeamClubSiebelId) === index
      );

      await Club.bulkCreate(
        teamClubDistinct.map(team => {
          const clubName = this.cleanedClubName(team.TeamName);
          const clubId = +team.TeamClubSiebelId || null;
          if (clubName !== null) {
            return new Club({
              name: clubName,
              clubId
            }).toJSON();
          }
        }),
        { ignoreDuplicates: true, transaction: args.transaction }
      );

      const dbClubs = await Club.findAll({
        where: {
          clubId: {
            [Op.in]: teamClubDistinct
              .map(team => +team.TeamClubSiebelId || null)
              .filter(id => id !== null)
          }
        },
        transaction: args.transaction
      });

      Club.createBaseRoless(dbClubs, { transaction: args.transaction });

      return dbClubs;
    });
  }

  protected addTeams(): ImportStep<{ team: Team; internalId: number; members: any[] }[]> {
    return new ImportStep('teams', async (args: { transaction: Transaction }) => {
      const data: { teams: any[]; events: any[] } = this.importSteps.get('load').getData();
      const clubs: Club[] = this.importSteps.get('clubs').getData();

      await Team.bulkCreate(
        data.teams.map(team => {
          if (team.TeamName) {
            return new Team({
              name: this.cleanedTeamName(team.TeamName),
              clubId: clubs.find(r => r.clubId === +team.TeamClubSiebelId)?.id || null
            }).toJSON();
          }
        }),
        { ignoreDuplicates: true, transaction: args.transaction }
      );

      const dbTeams = await Team.findAll({
        where: {
          name: {
            [Op.in]: data.teams.map(team => this.cleanedTeamName(team.TeamName))
          }
        },
        transaction: args.transaction
      });

      return data.teams.map((v, i) => {
        const members = (Array.isArray(v.Member) ? [...v.Member] : [v.Member]).filter(r => !!r);

        const dbTeam = dbTeams.find(t => this.cleanedTeamName(v.TeamName) === t.name);
        return {
          team: dbTeam,
          internalId: v.TeamLPId,
          members
        };
      });
    });
  }

  protected addPlayers(): ImportStep<{ player: Player; internalId: number }[]> {
    return new ImportStep('players', async (args: { transaction: Transaction }) => {
      const teams: {
        team: Team;
        internalId: number;
        members: any[];
      }[] = this.importSteps.get('teams').getData();

      const xmlPlayers = teams.map(r => r.members).flat();
      const players = [];
      const playersCorrected = [];

      for (const player of xmlPlayers) {
        players.push(player.MemberLTANo);
        playersCorrected.push(
          new Player(
            correctWrongPlayers({
              memberId: player.MemberLTANo,
              firstName: titleCase(player.MemberFirstName),
              lastName: titleCase(player.MemberLastName),
              gender: player.MemberGender
            })
          ).toJSON()
        );
      }

      await Player.bulkCreate(playersCorrected, {
        ignoreDuplicates: true,
        transaction: args.transaction
      });

      const dbPlayers = await Player.findAll({
        where: {
          memberId: {
            [Op.in]: playersCorrected.map(team => `${team.memberId}`)
          }
        },
        transaction: args.transaction
      });

      return players.map((v, i) => {
        return {
          player: dbPlayers.find(r => r.memberId === `${playersCorrected[i].memberId}`),
          internalId: v
        };
      });
    });
  }

  protected addTeamsToSubEvents(): ImportStep<void> {
    return new ImportStep('teams_subEvents', async (args: { transaction: Transaction }) => {
      const draws: { draw: DrawCompetition; fixtures: any[] }[] = this.importSteps
        .get('draws')
        .getData();
      const teams: { team: Team; internalId: number; members: any[] }[] = this.importSteps
        .get('teams')
        .getData();

      const teamSubscriptions = [];

      for (const draw of draws) {
        if (draw.fixtures.length > 0) {
          const teamSet = new Set([
            ...draw.fixtures.map(r => r.FixtureTeam1Id),
            ...draw.fixtures.map(r => r.FixtureTeam2Id)
          ]);

          for (const team of teamSet.values()) {
            teamSubscriptions.push(
              new TeamSubEventMembership({
                teamId: teams.find(r => r.internalId === team)?.team?.id,
                subEventId: draw?.draw?.subeventId
              }).toJSON()
            );
          }
        } else {
          logger.warn('No Fixutres??');
        }
      }

      await TeamSubEventMembership.bulkCreate(teamSubscriptions, { transaction: args.transaction });
    });
  }

  protected addPlayersToTeams(): ImportStep<void> {
    return new ImportStep('players_teams', async (args: { transaction: Transaction }) => {
      const playersData: { player: Player; internalId: number }[] = this.importSteps
        .get('players')
        .getData();
      const teams: { team: Team; internalId: number; members: any[] }[] = this.importSteps
        .get('teams')
        .getData();
      const event: EventCompetition = this.importSteps.get('event').getData();

      const start = moment([event.startYear, 0, 1]);

      for (const team of teams) {
        const playerIds = [];
        for (const teamMember of team.members) {
          const player = playersData.find(r => r.internalId === teamMember.MemberLTANo)?.player;
          if (player) {
            playerIds.push(player.id);
          }
        }

        await this.addToTeams(playerIds, start, team.team.id, { transaction: args.transaction });
        // faster then hooks
      }
    });
  }

  protected addPlayersToTClubs(): ImportStep<void> {
    return new ImportStep('players_clubs', async (args: { transaction: Transaction }) => {
      const playersData: { player: Player; internalId: number }[] = this.importSteps
        .get('players')
        .getData();
      const teams: { team: Team; internalId: number; members: any[] }[] = this.importSteps
        .get('teams')
        .getData();
      const event: EventCompetition = this.importSteps.get('event').getData();

      const start = moment([event.startYear, 0, 1]);

      const playerIds = new Map<string, string[]>();
      for (const team of teams) {
        const clubPlayers = playerIds.get(team.team.clubId) ?? [];
        for (const teamMember of team.members) {
          const player = playersData.find(r => r.internalId === teamMember.MemberLTANo)?.player;
          if (player) {
            clubPlayers.push(player.id);
          }
        }
        playerIds.set(team.team.clubId, clubPlayers);
      }

      for (const [id, players] of playerIds) {
        if (id === null) {
          logger.warn('Empty club?');
          continue;
        }
        await this.addToClubs(players, start, id, { transaction: args.transaction });
      }
    });
  }

  protected addEncounters(): ImportStep<{ encounter: EncounterCompetition; matches: [] }[]> {
    return new ImportStep('encounters', async (args: { transaction: Transaction }) => {
      // get previous step data
      const draws: { draw: DrawCompetition; fixtures: any[] }[] = this.importSteps
        .get('draws')
        .getData();
      const teams: { team: Team; internalId: number }[] = this.importSteps.get('teams').getData();

      // Run Current step
      const encounters = [];
      const matches = [];
      for (const draw of draws) {
        for (const fixture of draw.fixtures) {
          if (!fixture) {
            continue;
          }

          if (fixture.FixtureWinnerTeamId === '' || isNaN(+fixture.FixtureWinnerTeamId)) {
            continue;
          }

          const time = fixture.FixtureStartTime.split(':');
          const homeTeam = teams.find(r => r.internalId === +fixture.FixtureTeam1Id).team;
          const awayTeam = teams.find(r => r.internalId === +fixture.FixtureTeam2Id).team;
          encounters.push(
            new EncounterCompetition({
              date: new Date(
                fixture.FixtureYear,
                fixture.FixtureMonth,
                fixture.FixtureDay,
                time[0],
                time[1]
              ),
              awayTeamId: awayTeam.id,
              homeTeamId: homeTeam.id,
              drawId: draw.draw.id
            }).toJSON()
          );
          const games =
            (Array.isArray(fixture.Match) ? [...fixture.Match] : [fixture.Match]).filter(
              r => !!r
            ) ?? [];

          matches.push(games);
        }
      }

      const dbEncounters = await EncounterCompetition.bulkCreate(encounters, {
        ignoreDuplicates: true,
        transaction: args.transaction
      });

      // Return result
      return dbEncounters.map((v, i) => {
        return {
          encounter: v,
          matches: matches[i]
        };
      });
    });
  }

  protected addGames(): ImportStep<void> {
    return new ImportStep('games', async (args: { transaction: Transaction }) => {
      const playersData: { player: Player; internalId: number }[] = this.importSteps
        .get('players')
        .getData();
      const encounters: {
        encounter: EncounterCompetition;
        matches: any[];
      }[] = this.importSteps.get('encounters').getData();

      const games = [];
      const gamePlayers = [];

      for (const encounter of encounters) {
        for (const xmlMatch of encounter.matches) {
          const team1Player1 = playersData.find(r => r.internalId === xmlMatch?.MatchWinnerLTANo)
            ?.player;
          const team1Player2 = playersData.find(
            r => r.internalId === xmlMatch?.MatchWinnerPartnerLTANo
          )?.player;
          const team2Player1 = playersData.find(r => r.internalId === xmlMatch?.MatchLoserLTANo)
            ?.player;
          const team2Player2 = playersData.find(
            r => r.internalId === xmlMatch?.MatchLoserPartnerLTANo
          )?.player;

          // Set null when both sets are 0 (=set not played)
          const set1Team1 = parseInt(xmlMatch.MatchTeam1Set1, 10) || null;
          const set1Team2 = parseInt(xmlMatch.MatchTeam1Set2, 10) || null;
          const set2Team1 = parseInt(xmlMatch.MatchTeam2Set1, 10) || null;
          const set2Team2 = parseInt(xmlMatch.MatchTeam2Set2, 10) || null;
          const set3Team1 = parseInt(xmlMatch.MatchTeam3Set1, 10) || null;
          const set3Team2 = parseInt(xmlMatch.MatchTeam3Set2, 10) || null;

          const game = new Game({
            playedAt: encounter.encounter.date,
            gameType: this.getMatchType(xmlMatch.MatchType),
            set1Team1,
            set1Team2,
            set2Team1,
            set2Team2,
            set3Team1,
            set3Team2,
            winner: xmlMatch.MatchWinner,
            linkId: encounter.encounter.id,
            linkType: 'competition'
          });

          if (team1Player1) {
            gamePlayers.push(
              new GamePlayer({
                gameId: game.id,
                playerId: team1Player1.id,
                team: 1,
                player: 1
              }).toJSON()
            );
          }
          if (team1Player2) {
            gamePlayers.push(
              new GamePlayer({
                gameId: game.id,
                playerId: team1Player2.id,
                team: 1,
                player: 2
              }).toJSON()
            );
          }
          if (team2Player1) {
            gamePlayers.push(
              new GamePlayer({
                gameId: game.id,
                playerId: team2Player1.id,
                team: 2,
                player: 1
              }).toJSON()
            );
          }
          if (team2Player2) {
            gamePlayers.push(
              new GamePlayer({
                gameId: game.id,
                playerId: team2Player2.id,
                team: 2,
                player: 2
              }).toJSON()
            );
          }

          games.push(game.toJSON());
        }
      }

      await Game.bulkCreate(games, {
        ignoreDuplicates: true,
        transaction: args.transaction
      });

      await GamePlayer.bulkCreate(gamePlayers, {
        ignoreDuplicates: true,
        transaction: args.transaction
      });
    });
  }

  protected addImportFile(): ImportStep<void> {
    return new ImportStep(
      'import file',
      async (args: { fileLocation: string; transaction: Transaction }) => {
        const xmlData = parse(readFileSync(args.fileLocation, 'utf8'));
        const yearRegexr = /\b(19|20)\d{2}\b/g;
        let compYear: Date = null;
        const matches = yearRegexr.exec(xmlData.League.LeagueName);
        if (matches !== null) {
          compYear = moment([matches[0], 8, 1]).toDate();
        }

        const importerFile = await ImporterFile.findOne({
          where: {
            name: xmlData.League.LeagueName,
            firstDay: compYear,
            type: EventImportType.COMPETITION_XML
          },
          transaction: args.transaction
        });

        if (importerFile) {
          // delete old file
          unlink(importerFile.fileLocation, err => {
            if (err) {
              logger.error(`delete file ${importerFile.fileLocation} failed`, err);
              // throw err;
              return;
            }
            logger.debug('Old file deleted', importerFile.fileLocation);
          });
          await importerFile.destroy();
        }

        await new ImporterFile({
          fileLocation: args.fileLocation,
          name: xmlData.League.LeagueName,
          firstDay: compYear,
          type: EventImportType.COMPETITION_XML
        }).save({
          transaction: args.transaction
        });
      }
    );
  }
}
