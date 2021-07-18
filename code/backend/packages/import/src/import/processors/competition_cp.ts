import {
  ImporterFile,
  SubEventCompetition,
  EventCompetition,
  ICsvEvent,
  csvToArray,
  logger,
  ICsvDraw,
  DrawCompetition,
  EncounterCompetition,
  ICsvPlayerMatchCp,
  ICsvTeamMatch,
  ICsvTeam,
  ICsvTeamPlayer,
  Team,
  ICsvClub,
  ICsvEntryTp,
  ICsvPlayer,
  Location,
  Court,
  Game,
  Player,
  correctWrongPlayers,
  Club,
  GamePlayer,
  ICsvCourt,
  EventImportType,
  titleCase
} from '@badvlasim/shared';
import { Op, Transaction } from 'sequelize';
import { Mdb } from '../../convert/mdb';
import { ImportStep } from '../import-step';
import { CompetitionProcessor } from './competition';
import moment from 'moment-timezone';
import { unlink } from 'fs';

export class CompetitionCpProcessor extends CompetitionProcessor {
  constructor() {
    super();

    this.addImportStep(this.findEvent());
    this.addImportStep(this.cleanupEvent());
    this.addImportStep(this.addEvent());
    this.addImportStep(this.addSubEvents());
    this.addImportStep(this.addDraws());
    this.addImportStep(this.addPlayers());
    this.addImportStep(this.addClubs());
    this.addImportStep(this.addTeams());
    this.addImportStep(this.addEncounters());
    this.addImportStep(this.addPlayersToClubs());
    this.addImportStep(this.addPlayersToTeams());
    this.addImportStep(this.addGames());

    this.addImportFileStep(this.addImportFile());
  }

  async import(
    importFile: ImporterFile,
    args?: { transaction?: Transaction; event?: EventCompetition }
  ) {
    const mdb = new Mdb(importFile.fileLocation);
    return super.import({ importFile, mdb, ...args });
  }

  async importFile(fileLocation: string, transaction?: Transaction) {
    const mdb = new Mdb(fileLocation);
    return super.importFile({ transaction, fileLocation, mdb });
  }

  protected addSubEvents(): ImportStep<{ subEvent: SubEventCompetition; internalId: number }[]> {
    return new ImportStep('subEvents', async (args: { mdb: Mdb; transaction: Transaction }) => {
      // get previous step data
      const event: EventCompetition = this.importSteps.get('event').getData();
      const prevSubEvents: SubEventCompetition[] = this.importSteps.get('cleanup_event')?.getData();
      const csvEvents = await csvToArray<ICsvEvent[]>(await args.mdb.toCsv('Event'), {
        onError: e => {
          logger.error('Parsing went wrong', {
            error: e
          });
          throw e;
        }
      });

      if (!event) {
        throw new Error('No Event');
      }

      const dbSubEvents = [];

      for (const subEvent of csvEvents) {
        const level = +parseInt(subEvent.level, 10) || this.getLevel(subEvent.name);
        const eventType = this.getEventType(+subEvent.gender);

        const prevEvent = prevSubEvents?.find(
          r => r.name === subEvent.name && r.level === level && r.eventType === eventType
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
            name: subEvent.name,
            eventType,
            level,
            eventId: event.id
          }).save({ transaction: args.transaction });
        }
        dbSubEvents.push(dbSubEvent);
      }

      return dbSubEvents.map((v, i) => {
        return {
          subEvent: v,
          internalId: +csvEvents[i].id
        };
      });
    });
  }

  protected addDraws(): ImportStep<{ draw: DrawCompetition; internalId: number }[]> {
    return new ImportStep('draws', async (args: { mdb: Mdb; transaction: Transaction }) => {
      // get previous step data
      const subEvents: {
        subEvent: SubEventCompetition;
        internalId: number;
      }[] = this.importSteps.get('subEvents').getData();

      // Run Current step
      const csvDraws = await csvToArray<ICsvDraw[]>(await args.mdb.toCsv('Draw'), {
        onError: e => {
          logger.error('Parsing went wrong', {
            error: e
          });
          throw e;
        }
      });

      const draws = [];
      const dbSubEvents = [];
      for (const csvDraw of csvDraws) {
        const dbSubEvent = subEvents.find(e => e.internalId === parseInt(csvDraw.event, 10))
          .subEvent;

        dbSubEvents.push(dbSubEvent);

        draws.push(
          new DrawCompetition({
            name: csvDraw.name,
            subeventId: dbSubEvent.id
          }).toJSON()
        );
      }

      await DrawCompetition.bulkCreate(draws, {
        ignoreDuplicates: true,
        transaction: args.transaction
      });

      const dbDraws = await DrawCompetition.findAll({
        where: {
          subeventId: {
            [Op.in]: dbSubEvents.map(r => r.id)
          }
        },
        transaction: args.transaction
      });

      return csvDraws.map((csvDraw, i) => {
        const dbSubEvent = dbSubEvents[i];
        const dbDraw = dbDraws.find(d => d.name === csvDraw.name && d.subeventId === dbSubEvent.id);
        return {
          draw: dbDraw,
          internalId: +csvDraw.id
        };
      });
    });
  }

  protected addTeams(): ImportStep<{ team: Team; internalId: number }[]> {
    return new ImportStep('teams', async (args: { mdb: Mdb; transaction: Transaction }) => {
      const csvTeams = await csvToArray<ICsvTeam[]>(await args.mdb.toCsv('Team'));
      const clubs: { club: Club; internalId: number }[] = this.importSteps.get('clubs').getData();

      const teamns = csvTeams
        .map(team => {
          if (team.name && team.name.length > 0) {
            const club = clubs.find(r => r.internalId === +team.club)?.club || null;

            if (club !== null) {
              return new Team({
                name: this.cleanedTeamName(team.name),
                clubId: club?.id
              }).toJSON();
            }
          }
        })
        // Filter out empty teams
        .filter(t => !!t); 

      await Team.bulkCreate(teamns, { ignoreDuplicates: true, transaction: args.transaction });

      const dbTeams = await Team.findAll({
        where: {
          name: {
            [Op.in]: csvTeams.map(team => this.cleanedTeamName(team.name))
          }
        },
        transaction: args.transaction
      });

      return dbTeams.map((v, i) => {
        return {
          team: v,
          internalId: +csvTeams.find(team => this.cleanedTeamName(team.name) === v.name).id
        };
      });
    });
  }

  protected addPlayersToTeams(): ImportStep<void> {
    return new ImportStep('players_teams', async (args: { mdb: Mdb; transaction: Transaction }) => {
      const players: { player: Player; internalId: number }[] = this.importSteps
        .get('players')
        .getData();
      const teams: { team: Team; internalId: number }[] = this.importSteps.get('teams').getData();
      const event: EventCompetition = this.importSteps.get('event').getData();

      const csvTeamPlayers = await csvToArray<ICsvTeamPlayer[]>(await args.mdb.toCsv('TeamPlayer'));

      const teamPlayers = new Map<string, string[]>();
      for (const csvTeamPlayer of csvTeamPlayers) {
        const dbPlayer = players.find(e => e.internalId === parseInt(csvTeamPlayer.player, 10))
          ?.player;
        const dbTeam = teams.find(e => e.internalId === parseInt(csvTeamPlayer.team, 10))?.team;

        if (dbTeam) {
          const playerIds = teamPlayers.get(dbTeam.id) ?? [];
          teamPlayers.set(dbTeam?.id, [...playerIds, dbPlayer.id]);
        }
      }

      for (const [team, playerIds] of teamPlayers) {
        await this.addToTeams(playerIds, moment([event.startYear, 0, 1]), team, {
          transaction: args.transaction,
          hooks: false
        });
      }
    });
  }

  protected addPlayersToClubs(): ImportStep<void> {
    return new ImportStep('players_clubs', async (args: { mdb: Mdb; transaction: Transaction }) => {
      const players: { player: Player; internalId: number; club: string }[] = this.importSteps
        .get('players')
        .getData();
      const clubs: { club: Club; internalId: number }[] = this.importSteps.get('clubs').getData();
      const event: EventCompetition = this.importSteps.get('event').getData();

      const teamPlayers = new Map<string, string[]>();
      for (const player of players) {
        const dbTeam = clubs.find(e => e.internalId === +player.club)?.club;
        const playerIds = teamPlayers.get(dbTeam?.id) ?? [];

        teamPlayers.set(dbTeam.id, [...playerIds, player.player.id]);
      }

      for (const [team, playerIds] of teamPlayers) {
        await this.addToClubs(playerIds, moment([event.startYear, 0, 1]), team, {
          transaction: args.transaction,
          hooks: false
        });
      }
    });
  }

  protected addClubs(): ImportStep<{ club: Club; internalId: number }[]> {
    return new ImportStep('clubs', async (args: { mdb: Mdb; transaction: Transaction }) => {
      const csvClubs = await csvToArray<ICsvClub[]>(await args.mdb.toCsv('Club'));

      const teams = [];
      for (const csvClub of csvClubs) {
        teams.push(
          new Club({
            name: this.cleanedClubName(csvClub.name),
            abbreviation: csvClub.abbriviation,
            clubId: +csvClub.clubid || null
          }).toJSON()
        );
      }

      await Club.bulkCreate(teams, {
        ignoreDuplicates: true,
        transaction: args.transaction
      });

      const dbClubs = await Club.findAll({
        where: {
          name: {
            [Op.in]: csvClubs.map(club => this.cleanedClubName(club.name))
          }
        },
        transaction: args.transaction
      });

      return csvClubs.map((v, i) => {
        const dbClub = dbClubs.find(r => this.cleanedClubName(v.name) === r.name);
        return {
          club: dbClub,
          internalId: +v.id
        };
      });
    });
  }

  protected addPlayers(): ImportStep<{ player: Player; internalId: number; club: string }[]> {
    return new ImportStep('players', async (args: { mdb: Mdb; transaction: Transaction }) => {
      const csvPlayers = await csvToArray<ICsvPlayer[]>(await args.mdb.toCsv('Player'));

      const corrected = [];
      for (const csvPlayer of csvPlayers) {
        const momentDate = moment(csvPlayer.birthDate);
        const bod = momentDate.isValid() ? momentDate.toDate() : null;

        corrected.push(
          new Player(
            correctWrongPlayers({
              memberId: csvPlayer.memberid,
              firstName: titleCase(csvPlayer.firstname),
              lastName: titleCase(csvPlayer.name),
              gender: this.getGender(csvPlayer.gender),
              birthDate: bod
            })
          ).toJSON()
        );
      }

      await Player.bulkCreate(corrected, { ignoreDuplicates: true, transaction: args.transaction });

      const dbPlayers = await Player.findAll({
        where: {
          memberId: {
            [Op.in]: corrected.map(team => `${team.memberId}`)
          }
        },
        transaction: args.transaction
      });

      // Return result
      return corrected.map((v, i) => {
        const dbPlayer = dbPlayers.find(
          p => p.memberId === v.memberId && p.firstName === v.firstName && p.lastName === v.lastName
        );

        return {
          player: dbPlayer,
          internalId: +csvPlayers[i].id,
          club: csvPlayers[i].club
        };
      });
    });
  }

  protected addEncounters(): ImportStep<
    {
      encounter: EncounterCompetition;
      internalId: number;
      internal2Id: number;
      locationId: number;
    }[]
  > {
    return new ImportStep('encounters', async (args: { mdb: Mdb; transaction: Transaction }) => {
      // get previous step data
      const draws: { draw: DrawCompetition; internalId: number }[] = this.importSteps
        .get('draws')
        .getData();
      const teams: { team: Team; internalId: number }[] = this.importSteps.get('teams').getData();

      // Run Current step
      const csvTeamMatches = await csvToArray<ICsvTeamMatch[]>(await args.mdb.toCsv('TeamMatch'));
      const cvsEntries = await csvToArray<ICsvEntryTp[]>(await args.mdb.toCsv('Entry'));

      // For matching on players we only need the ones with entry
      const csvTeamMatchesEntries = csvTeamMatches.filter(x => x.entry !== '');
      const csvTeamMatchesNonEntries = csvTeamMatches.filter(x => x.van1 !== '0' && x.van2 !== '0');

      // But for knowing what games are actual games we need a different sub set (go Visual Reality ...)
      const csvTeamMatchesFiltered = [];
      const csvTeamMatchesReversed = [];
      csvTeamMatchesNonEntries
        .filter(tm => tm.plandate !== '12/30/0/ 00:00:00')
        .forEach(pm1 => {
          if (
            !csvTeamMatchesFiltered.find(
              pm2 =>
                pm1.event === pm2.event &&
                pm1.draw === pm2.draw &&
                pm1.van1 === pm2.van2 &&
                pm1.van2 === pm2.van1
            )
          ) {
            csvTeamMatchesFiltered.push(pm1);
          } else {
            csvTeamMatchesReversed.push(pm1);
          }
        });

      const encounters = [];
      for (const cvsTeamMatch of csvTeamMatchesFiltered) {
        const csvEntryInPlayerMatch1 = csvTeamMatchesEntries.find(
          x => x.planning === cvsTeamMatch.van1 && x.draw === cvsTeamMatch.draw
        );
        const csvEntryInPlayerMatch2 = csvTeamMatchesEntries.find(
          x => x.planning === cvsTeamMatch.van2 && x.draw === cvsTeamMatch.draw
        );

        const entry1 = cvsEntries.find(e => e.id === csvEntryInPlayerMatch1?.entry);
        const entry2 = cvsEntries.find(e => e.id === csvEntryInPlayerMatch2?.entry);

        const dbHome = teams.find(e => e.internalId === +entry1?.team)?.team;
        const dbAway = teams.find(e => e.internalId === +entry2?.team)?.team;

        const dbDraw = draws.find(s => s.internalId === parseInt(cvsTeamMatch.draw, 10))?.draw;

        encounters.push(
          new EncounterCompetition({
            date: moment(cvsTeamMatch.plandate).toDate(),
            drawId: dbDraw.id,
            homeTeamId: dbHome?.id,
            awayTeamId: dbAway?.id
          }).toJSON()
        );
      }

      if (encounters.length === 0) {
        return null;
      }

      const dbEncounters = await EncounterCompetition.bulkCreate(encounters, {
        ignoreDuplicates: true,
        transaction: args.transaction
      });

      // Return result
      return dbEncounters.map((v, i) => {
        const resversed = csvTeamMatchesReversed.find(
          pm2 =>
            csvTeamMatchesFiltered[i].event === pm2.event &&
            csvTeamMatchesFiltered[i].draw === pm2.draw &&
            csvTeamMatchesFiltered[i].van2 === pm2.van1 &&
            csvTeamMatchesFiltered[i].van1 === pm2.van2
        );

        return {
          encounter: v,
          internalId: +csvTeamMatchesFiltered[i].id,
          internal2Id: +resversed?.id,
          locationId: +csvTeamMatchesFiltered[i].location
        };
      });
    });
  }

  protected addGames(): ImportStep<void> {
    return new ImportStep('games', async (args: { mdb: Mdb; transaction: Transaction }) => {
      const players: { player: Player; internalId: number }[] = this.importSteps
        .get('players')
        .getData();

      const encounters: {
        encounter: EncounterCompetition;
        internalId: number;
        internal2Id: number;
      }[] = this.importSteps.get('encounters').getData();

      const csvPlayerMatches = await csvToArray<ICsvPlayerMatchCp[]>(
        await args.mdb.toCsv('PlayerMatch')
      );

      const games = [];
      const gamePlayers = [];
      const csvPlayerMatchesFiltered = csvPlayerMatches.filter(r => r.winner !== '0');

      for (const csvPlayerMatch of csvPlayerMatchesFiltered) {
        const team1Player1 = players.find(x => x.internalId === +csvPlayerMatch?.sp1)?.player;
        const team1Player2 = players.find(x => x.internalId === +csvPlayerMatch?.sp2)?.player;
        const team2Player1 = players.find(x => x.internalId === +csvPlayerMatch?.sp3)?.player;
        const team2Player2 = players.find(x => x.internalId === +csvPlayerMatch?.sp4)?.player;

        const encounter = encounters.find(
          x =>
            x.internalId === +csvPlayerMatch.teammatch ||
            x.internal2Id === +csvPlayerMatch.teammatch
        ).encounter;

        // Set null when both sets are 0 (=set not played)
        const set1Team1 = parseInt(csvPlayerMatch.score1_1, 10) || null;
        const set1Team2 = parseInt(csvPlayerMatch.score1_2, 10) || null;
        const set2Team1 = parseInt(csvPlayerMatch.score2_1, 10) || null;
        const set2Team2 = parseInt(csvPlayerMatch.score2_2, 10) || null;
        const set3Team1 = parseInt(csvPlayerMatch.score3_1, 10) || null;
        const set3Team2 = parseInt(csvPlayerMatch.score3_2, 10) || null;

        const momentDate = moment(csvPlayerMatch.endtime);
        const playedAt = momentDate.isValid() ? momentDate.toDate() : encounter.date;
        const game = new Game({
          playedAt,
          gameType: this.getMatchType(+csvPlayerMatch.matchtype),
          set1Team1,
          set1Team2,
          set2Team1,
          set2Team2,
          set3Team1,
          set3Team2,
          winner: parseInt(csvPlayerMatch.winner, 10),
          linkId: encounter.id,
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

      if (games.length !== 0) {
        await Game.bulkCreate(games, {
          ignoreDuplicates: true,
          transaction: args.transaction
        });

        await GamePlayer.bulkCreate(gamePlayers, {
          ignoreDuplicates: true,
          transaction: args.transaction
        });
      }
    });
  }

  protected addImportFile(): ImportStep<void> {
    return new ImportStep(
      'import file',
      async (args: { fileLocation: string; mdb: Mdb; transaction: Transaction }) => {
        const settingsCsv = await args.mdb.toCsv('Settings');
        const settings = await csvToArray<{
          name: string;
          linkCode: string;
          webID: string;
          uniCode: string;
        }>(settingsCsv, {
          onEnd: data => {
            return {
              name:
                (data.find((r: { name: string }) => r.name.toLowerCase() === 'tournament')
                  .value as string) ?? null,
              linkCode:
                (data.find((r: { name: string }) => r.name.toLowerCase() === 'linkcode')
                  ?.value as string) ?? null,
              webID:
                (data.find((r: { name: string }) => r.name.toLowerCase() === 'webid')
                  ?.value as string) ?? null,
              uniCode:
                (data.find((r: { name: string }) => r.name.toLowerCase() === 'unicode')
                  ?.value as string) ?? null
            };
          },
          onError: e => {
            logger.error('Parsing went wrong', {
              error: e
            });
            throw e;
          }
        });

        const daysCsv = await args.mdb.toCsv('TournamentDay');
        const days = await csvToArray<{ dates: Date[] }>(daysCsv, {
          onEnd: data => {
            const dates = data
              .map((date: { tournamentday: string }) =>
                moment.tz(date.tournamentday, 'MM/DD/YYYY', 'Europe/Brussels').toDate()
              )
              .sort(
                (a: { getTime: () => number }, b: { getTime: () => number }) =>
                  a.getTime() - b.getTime()
              );

            return {
              dates
            };
          },
          onError: e => {
            logger.error('Parsing went wrong', {
              error: e
            });
            throw e;
          }
        });

        let dates = days.dates.map(x => x.toISOString()).join(',');
        if (days.dates.length > 7) {
          dates = `${days.dates[0]},${days.dates[days.dates.length - 1].toISOString()}`;
        }

        // TODO: maybe split up?
        const importerFile = await ImporterFile.findOne({
          where: {
            ...settings,
            firstDay: days.dates[0],
            type: EventImportType.COMPETITION_CP,
            dates
          },
          transaction: args.transaction
        });

        if (importerFile) {
          // delete old file
          unlink(importerFile.fileLocation, err => {
            if (err) {
              logger.error(`delete file ${importerFile.fileLocation} failed`, err);
              // throw new Error(err);
              return;
            }
            logger.debug('Old file deleted', importerFile.fileLocation);
          });
          await importerFile.destroy();
        }

        await new ImporterFile({
          ...settings,
          firstDay: days.dates[0],
          fileLocation: args.fileLocation,
          type: EventImportType.COMPETITION_CP,
          dates
        }).save({ transaction: args.transaction });
      }
    );
  }
}
