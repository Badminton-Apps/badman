import {
  Club,
  correctWrongPlayers,
  ProcessStep,
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
import { Op, Transaction } from 'sequelize';
import { CompetitionProcessor } from './competition';
import moment from 'moment-timezone';

export class CompetitionXmlProcessor extends CompetitionProcessor {
  constructor() {
    super();

    this.importProcess.addStep(this.findEvent());
    this.importProcess.addStep(this.cleanupEvent());
    this.importProcess.addStep(this.addEvent());
    this.importProcess.addStep(this.loadXml());
    this.importProcess.addStep(this.addSubEvents());
    this.importProcess.addStep(this.addDraws());
    this.importProcess.addStep(this.addClubs());
    this.importProcess.addStep(this.addTeams());
    this.importProcess.addStep(this.addPlayers());
    this.importProcess.addStep(this.addTeamsToSubEvents());
    this.importProcess.addStep(this.addPlayersToTeams());
    this.importProcess.addStep(this.addPlayersToTClubs());
    this.importProcess.addStep(this.addEncounters());
    this.importProcess.addStep(this.addGames());

    this.importFileProcess.addStep(this.addImportFile());
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

  protected loadXml(): ProcessStep<{ name: string; teams: any[]; events: any[] }> {
    return new ProcessStep('load', async (args: { importFile: ImporterFile }) => {
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

  protected addSubEvents(): ProcessStep<{ subEvent: SubEventCompetition; divisions: any[] }[]> {
    return new ProcessStep('subEvents', async (args: { transaction: Transaction }) => {
      // get previous step data
      const event: EventCompetition = this.importProcess.getData('event');
      const prevSubEvents: any[] = this.importProcess.getData('cleanup_event');
      const data: { teams: any[]; events: any[] } = this.importProcess.getData('load');

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
          const prevEvent = prevSubEvents?.find(
            r => r.name === name && r.level === level && r.eventType === eventType
          );

          let dbSubEvent: SubEventCompetition = null;

          if (prevEvent) {
            prevEvent.eventId = event.id;
            dbSubEvent = await new SubEventCompetition(prevEvent).save({
              transaction: args.transaction
            });
            await dbSubEvent.setGroups(prevEvent.groups, { transaction: args.transaction });
          } else {
            dbSubEvent = await new SubEventCompetition({
              name,
              level,
              eventType,
              eventId: event.id
            }).save({ transaction: args.transaction });
          }

          subEvents.push(dbSubEvent);
          xmlDivisions.push(divisions);
        } else {
          xmlDivisions[foundEventIndex] = xmlDivisions[foundEventIndex].concat(divisions);
        }
      }

      return subEvents.map((v, i) => {
        return {
          subEvent: v,
          divisions: xmlDivisions[i]
        };
      });
    });
  }

  protected addDraws(): ProcessStep<{ draw: DrawCompetition; fixtures: any[] }[]> {
    return new ProcessStep('draws', async (args: { transaction: Transaction }) => {
      // get previous step data
      const subEvents: {
        subEvent: SubEventCompetition;
        divisions: any[];
      }[] = this.importProcess.getData('subEvents');

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
            division.Fixture === null || division.Fixture === undefined
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
      return draws.map((v, i) => {
        const db = dbDraws.filter(r => r.name === v.name && r.subeventId === v.subeventId);

        if (db.length > 1) {
          logger.warn('Multiple draws found?');
        }

        return {
          draw: db[0],
          fixtures: fixtures[i]
        };
      });
    });
  }

  protected addClubs(): ProcessStep<Club[]> {
    return new ProcessStep('clubs', async (args: { transaction: Transaction }) => {
      const data: { teams: any[]; events: any[] } = this.importProcess.getData('load')

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

      // because id's change
      Club.createBaseRoles(dbClubs, { transaction: args.transaction });

      return dbClubs;
    });
  }

  protected addTeams(): ProcessStep<{ team: Team; internalId: number; members: any[] }[]> {
    return new ProcessStep('teams', async (args: { transaction: Transaction }) => {
      const data: { teams: any[]; events: any[] } = this.importProcess.getData('load')
      const clubs: Club[] = this.importProcess.getData('clubs')

      const teams = data.teams.map((team, i) => {
        if (team.TeamName) {
          // Filter out team number
          const regexResult = /.*((\d)[GHD]|[GHD](\d))/gim.exec(team.TeamName);

          // Get team number from regex group
          const teamNumber =
            regexResult && regexResult.length > 3
              ? +regexResult[2]
                ? +regexResult[2]
                : +regexResult[3]
                ? +regexResult[3]
                : -1
              : -1;

          return new Team({
            name: this.cleanedTeamName(team.TeamName),
            teamNumber,
            clubId: clubs.find(r => r.clubId === +team.TeamClubSiebelId)?.id || null
          }).toJSON();
        }
      });

      await Team.bulkCreate(teams, { ignoreDuplicates: true, transaction: args.transaction });

      const dbTeams = await Team.findAll({
        where: {
          name: {
            [Op.in]: teams.map((team: any) => team.name)
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

  protected addPlayers(): ProcessStep<{ player: Player; internalId: number }[]> {
    return new ProcessStep('players', async (args: { transaction: Transaction }) => {
      const data: { teams: any[]; events: any[] } = this.importProcess.getData('load');
      const xmlPlayers = data.teams
        .map(v => (Array.isArray(v.Member) ? [...v.Member] : [v.Member]).filter(r => !!r))
        .flat();

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
              gender: this.getGender(player.MemberGender)
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

  protected addTeamsToSubEvents(): ProcessStep<void> {
    return new ProcessStep('teams_subEvents', async (args: { transaction: Transaction }) => {
      const draws: { draw: DrawCompetition; fixtures: any[] }[] = this.importProcess.getData(
        'draws'
      );
      const teams: {
        team: Team;
        internalId: number;
        members: any[];
      }[] = this.importProcess.getData('teams');

      const teamSubscriptions = [];

      for (const draw of draws) {
        if (draw.fixtures.length > 0) {
          const teamSet = new Set([
            ...draw.fixtures.map(r => r?.FixtureTeam1Id),
            ...draw.fixtures.map(r => r?.FixtureTeam2Id)
          ]);

          for (const team of teamSet.values()) {
            if (team !== null && team !== undefined) {
              teamSubscriptions.push(
                new TeamSubEventMembership({
                  teamId: teams.find(r => r.internalId === team)?.team?.id,
                  subEventId: draw?.draw?.subeventId
                }).toJSON()
              );
            }
          }
        } else {
          logger.warn('No Fixutres??');
        }
      }

      await TeamSubEventMembership.bulkCreate(teamSubscriptions, {
        transaction: args.transaction,
        ignoreDuplicates: true
      });
    });
  }

  protected addPlayersToTeams(): ProcessStep<void> {
    return new ProcessStep('players_teams', async (args: { transaction: Transaction }) => {
      const playersData: { player: Player; internalId: number }[] = this.importProcess.getData(
        'players'
      );
      const teams: {
        team: Team;
        internalId: number;
        members: any[];
      }[] = this.importProcess.getData('teams');
      const event: EventCompetition = this.importProcess.getData('event');

      const start = moment([event.startYear, 0, 1]);

      for (const team of teams) {
        const playerIds = [];
        for (const teamMember of team.members) {
          const player = playersData.find(r => r.internalId === teamMember.MemberLTANo)?.player;
          if (player) {
            playerIds.push(player.id);
          }
        }

        await this.addToTeams(playerIds, start, team.team.id, {
          transaction: args.transaction,
          hooks: false
        });
        // faster then hooks
      }
    });
  }

  protected addPlayersToTClubs(): ProcessStep<void> {
    return new ProcessStep('players_clubs', async (args: { transaction: Transaction }) => {
      const playersData: { player: Player; internalId: number }[] = this.importProcess.getData(
        'players'
      );
      const teams: {
        team: Team;
        internalId: number;
        members: any[];
      }[] = this.importProcess.getData('teams');
      const event: EventCompetition = this.importProcess.getData('event');

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

      // Add to clubs
      for (const [id, players] of playerIds) {
        if (id === null) {
          logger.warn('Empty club?');
          continue;
        }
        await this.addToClubs(players, start, id, { transaction: args.transaction });
      }
    });
  }

  protected addEncounters(): ProcessStep<{ encounter: EncounterCompetition; matches: [] }[]> {
    return new ProcessStep('encounters', async (args: { transaction: Transaction }) => {
      // get previous step data
      const draws: { draw: DrawCompetition; fixtures: any[] }[] = this.importProcess.getData(
        'draws'
      );
      const teams: { team: Team; internalId: number }[] = this.importProcess.getData('teams');

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
      return encounters.map((v, i) => {
        const db = dbEncounters.filter(
          r =>
            r.homeTeamId === v.homeTeamId && r.awayTeamId === v.awayTeamId && r.drawId === v.drawId
        );

        if (db.length > 1) {
          logger.warn('Multiple encounters found?');
        }

        return {
          encounter: db[0],
          matches: matches[i]
        };
      });
    });
  }

  protected addGames(): ProcessStep<void> {
    return new ProcessStep('games', async (args: { transaction: Transaction }) => {
      const playersData: { player: Player; internalId: number }[] = this.importProcess.getData(
        'players'
      );
      const encounters: {
        encounter: EncounterCompetition;
        matches: any[];
      }[] = this.importProcess.getData('encounters');

      const games = [];
      const gamePlayers = [];

      for (const encounter of encounters) {
        for (const xmlMatch of encounter.matches) {
          const teamWinnerPlayer1 = playersData.find(
            r => r.internalId === xmlMatch?.MatchWinnerLTANo
          )?.player;
          const teamWinnerPlayer2 = playersData.find(
            r => r.internalId === xmlMatch?.MatchWinnerPartnerLTANo
          )?.player;
          const teamLoserPlayer1 = playersData.find(r => r.internalId === xmlMatch?.MatchLoserLTANo)
            ?.player;
          const teamLoserPlayer2 = playersData.find(
            r => r.internalId === xmlMatch?.MatchLoserPartnerLTANo
          )?.player;

          // Set null when both sets are 0 (=set not played)
          const set1Team1 = parseInt(xmlMatch.MatchTeam1Set1, 10) || null;
          const set1Team2 = parseInt(xmlMatch.MatchTeam1Set2, 10) || null;
          const set2Team1 = parseInt(xmlMatch.MatchTeam2Set1, 10) || null;
          const set2Team2 = parseInt(xmlMatch.MatchTeam2Set2, 10) || null;
          const set3Team1 = parseInt(xmlMatch.MatchTeam3Set1, 10) || null;
          const set3Team2 = parseInt(xmlMatch.MatchTeam3Set2, 10) || null;
          const winner = parseInt(xmlMatch.MatchWinner, 10);

          const game = new Game({
            playedAt: encounter.encounter.date,
            gameType: this.getMatchType(xmlMatch.MatchType),
            set1Team1,
            set1Team2,
            set2Team1,
            set2Team2,
            set3Team1,
            set3Team2,
            winner,
            linkId: encounter.encounter.id,
            linkType: 'competition'
          });

          if (teamWinnerPlayer1) {
            gamePlayers.push(
              new GamePlayer({
                gameId: game.id,
                playerId: teamWinnerPlayer1.id,
                team: winner,
                player: 1
              }).toJSON()
            );
          }
          if (teamWinnerPlayer2) {
            gamePlayers.push(
              new GamePlayer({
                gameId: game.id,
                playerId: teamWinnerPlayer2.id,
                team: winner,
                player: 2
              }).toJSON()
            );
          }
          if (teamLoserPlayer1) {
            gamePlayers.push(
              new GamePlayer({
                gameId: game.id,
                playerId: teamLoserPlayer1.id,
                team: winner === 1 ? 2 : 1,
                player: 1
              }).toJSON()
            );
          }
          if (teamLoserPlayer2) {
            gamePlayers.push(
              new GamePlayer({
                gameId: game.id,
                playerId: teamLoserPlayer2.id,
                team: winner === 1 ? 2 : 1,
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

  protected addImportFile(): ProcessStep<void> {
    return new ProcessStep(
      'import file',
      async (args: { fileLocation: string; transaction: Transaction }) => {
        const xmlData = parse(readFileSync(args.fileLocation, 'utf8'));
        const yearRegexr = /\b(19|20)\d{2}\b/g;
        let compYear: Date = null;
        const matches = yearRegexr.exec(xmlData.League.LeagueName);
        if (matches !== null) {
          // first of september year
          compYear = moment.tz(`09/01/${matches[0]}`, 'MM/DD/YYYY', 'Europe/Brussels').toDate();
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
