import { ImportStep } from './../import-step';
import {
  Club,
  correctWrongPlayers,
  Court,
  csvToArray,
  DrawTournament,
  EventImportType,
  EventTournament,
  Game,
  GamePlayer,
  GameType,
  ICsvClub,
  ICsvCourt,
  ICsvDraw,
  ICsvEntryCp,
  ICsvEvent,
  ICsvLocation,
  ICsvPlayer,
  ICsvPlayerMatchTp,
  ImporterFile,
  Location,
  logger,
  Player,
  RankingSystemGroup,
  SubEventTournament,
  LocationEventTournament,
  titleCase
} from '@badvlasim/shared';
import { unlink } from 'fs';
import moment from 'moment-timezone';
import { Op, Transaction } from 'sequelize';
import { Mdb } from '../../convert/mdb';
import { ProcessImport } from '../processor';

export class TournamentTpProcessor extends ProcessImport {
  constructor() {
    super();
    this.addImportStep(this.cleanupEvent());
    this.addImportStep(this.addEvent());
    this.addImportStep(this.addSubEvents());
    this.addImportStep(this.addDraws());
    this.addImportStep(this.addPlayers());
    this.addImportStep(this.addClubs());
    this.addImportStep(this.addLocations());
    this.addImportStep(this.addCourts());
    this.addImportStep(this.addPlayersToClubs());
    this.addImportStep(this.addGames());

    this.addImportFileStep(this.addImportFile());
  }

  async import(
    importFile: ImporterFile,
    args?: { transaction?: Transaction; event?: EventTournament }
  ) {
    const mdb = new Mdb(importFile.fileLocation);
    return super.import({ importFile, mdb, ...args });
  }

  async importFile(fileLocation: string, transaction?: Transaction) {
    const mdb = new Mdb(fileLocation);
    return super.importFile({ transaction, fileLocation, mdb });
  }

  protected addEvent(): ImportStep<EventTournament> {
    return new ImportStep(
      'event',
      async (args: {
        transaction: Transaction;
        importFile: ImporterFile;
        event?: EventTournament;
      }) => {
        if (args.event) {
          return args.event;
        }

        const where: {
          // Required
          name: string;
          // optional
          [key: string]: any;
        } = {
          name: args.importFile.name
        };

        if (args.importFile.uniCode) {
          where.uniCode = args.importFile.uniCode;
        }

        const foundEvent = await EventTournament.findOne({
          where,
          transaction: args.transaction
        });

        if (foundEvent) {
          return foundEvent;
        }

        try {
          const dbEvent = await new EventTournament({
            name: args.importFile.name,
            uniCode: args.importFile.uniCode,
            firstDay: args.importFile.firstDay,
            dates: args.importFile.dates
          }).save({ transaction: args.transaction });
          return dbEvent;
        } catch (e) {
          logger.error('import failed', e);
          throw e;
        }
      }
    );
  }

  protected cleanupEvent(): ImportStep<SubEventTournament[]> {
    return new ImportStep(
      'cleanup_event',
      async (args: { event: EventTournament; transaction: Transaction }) => {
        if (!args.event) {
          return;
        }

        // Games are dynamically linked, so request them manually
        const games = await Game.findAll({
          attributes: ['id'],
          include: [
            {
              model: DrawTournament,
              attributes: [],
              include: [
                {
                  model: SubEventTournament,
                  attributes: [],
                  required: true,
                  where: {
                    eventId: args.event.id
                  }
                }
              ]
            }
          ],
          transaction: args.transaction
        });

        await Game.destroy({ where: { id: games.map(r => r.id) }, transaction: args.transaction });

        const dbSubEvents = await SubEventTournament.findAll({
          where: {
            eventId: args.event.id
          },
          include: [RankingSystemGroup],
          transaction: args.transaction
        });

        await SubEventTournament.destroy({
          where: {
            eventId: args.event.id
          },
          cascade: true,
          transaction: args.transaction
        });

        return dbSubEvents;
      }
    );
  }

  protected addSubEvents(): ImportStep<{ subEvent: SubEventTournament; internalId: number }[]> {
    return new ImportStep('subEvents', async (args: { mdb: Mdb; transaction: Transaction }) => {
      // get previous step data
      const event: EventTournament = this.importSteps.get('event').getData();
      const prevSubEvents: SubEventTournament[] = this.importSteps.get('cleanup_event')?.getData();
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
        const eventType = super.getEventType(+subEvent.gender);
        const level = +subEvent.level;
        const prevEvent = prevSubEvents?.find(
          r => r.name === subEvent.name && r.level === level && r.eventType === eventType
        );

        let dbSubEvent: SubEventTournament = null;

        if (prevEvent) {
          prevEvent.eventId = event.id;
          dbSubEvent = await new SubEventTournament(prevEvent.toJSON()).save({
            transaction: args.transaction
          });
          await dbSubEvent.setGroups(prevEvent.groups, { transaction: args.transaction });
        } else {
          dbSubEvent = await new SubEventTournament({
            name: subEvent.name,
            eventType,
            level,
            eventId: event.id
          }).save({ transaction: args.transaction });
        }

        dbSubEvents.push(dbSubEvent);
      }

      // const dbSubEvents = await SubEventTournament.bulkCreate(subEvents, {
      //   transaction: args.transaction,
      //   returning: ['*']
      // });

      return dbSubEvents.map((v, i) => {
        return {
          subEvent: v,
          internalId: +csvEvents[i].id
        };
      });
    });
  }

  protected addDraws(): ImportStep<{ draw: DrawTournament; internalId: number }[]> {
    return new ImportStep('draws', async (args: { mdb: Mdb; transaction: Transaction }) => {
      // get previous step data
      const subEvents: {
        subEvent: SubEventTournament;
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
      for (const csvDraw of csvDraws) {
        const dbSubEvent = subEvents.find(e => e.internalId === parseInt(csvDraw.event, 10))
          .subEvent;

        draws.push(
          new DrawTournament({
            name: csvDraw.name,
            subeventId: dbSubEvent.id
          }).toJSON()
        );
      }

      const dbDraws = await DrawTournament.bulkCreate(draws, {
        ignoreDuplicates: true,
        transaction: args.transaction
      });

      // Return result
      return dbDraws.map((v, i) => {
        return {
          draw: v,
          internalId: +csvDraws[i].id
        };
      });
    });
  }

  protected addPlayersToClubs(): ImportStep<void> {
    return new ImportStep('players_clubs', async (args: { mdb: Mdb; transaction: Transaction }) => {
      const players: { player: Player; internalId: number; club: string }[] = this.importSteps
        .get('players')
        .getData();
      const clubs: { club: Club; internalId: number }[] = this.importSteps.get('clubs').getData();
      const event: EventTournament = this.importSteps.get('event').getData();

      const teamPlayers = new Map<string, string[]>();
      for (const player of players) {
        if (player.club === '') {
          continue;
        }

        // No player found (possibly no memberid)
        if (!player.player) {
          continue;
        }

        const dbClubs = clubs.find(e => e.internalId === +player.club)?.club;
        const playerIds = teamPlayers.get(dbClubs?.id) ?? [];

        teamPlayers.set(dbClubs.id, [...playerIds, player.player.id]);
      }

      for (const [team, playerIds] of teamPlayers) {
        await this.addToClubs(playerIds, moment(event.firstDay), team, {
          transaction: args.transaction
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
            [Op.in]: csvClubs.map(team => this.cleanedClubName(team.name))
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

  protected addLocations(): ImportStep<{ location: Location; internalId: number }[]> {
    return new ImportStep('locations', async (args: { mdb: Mdb; transaction: Transaction }) => {
      const csvLocations = await csvToArray<ICsvLocation[]>(await args.mdb.toCsv('Location'));
      const event: EventTournament = this.importSteps.get('event').getData();

      const locations = [];
      for (const csvLocation of csvLocations) {
        let street = '';
        let locNumber = null;
        const groups = csvLocation.address.match(/([^\d]+)\s?(.+)/);
        if (!groups) {
          // No street address, do nothing
        } else if (groups.length === 2) {
          street = groups[1];
        } else if (groups.length > 2) {
          street = groups[1];
          locNumber = groups[2];
        }

        const sameLoc = locations.find(
          r =>
            r.name === csvLocation.name &&
            r.street === street &&
            r.streetNumber === locNumber &&
            r.city === csvLocation.city &&
            r.postalcode === csvLocation.postalcode
        );

        if (sameLoc != null) {
          continue;
        }

        const [dbLocation] = await Location.findOrCreate({
          where: {
            name: csvLocation.name,
            street,
            streetNumber: locNumber,
            city: csvLocation.city,
            postalcode: csvLocation.postalcode
          },
          defaults: {
            name: csvLocation.name,
            street,
            streetNumber: locNumber,
            phone: csvLocation.phone,
            fax: csvLocation.fax,
            city: csvLocation.city,
            postalcode: csvLocation.postalcode
          },
          transaction: args.transaction
        });

        locations.push(dbLocation);
      }

      const links = locations.map(l => {
        return {
          eventId: event.id,
          locationId: l.id
        };
      });

      await LocationEventTournament.bulkCreate(links, { ignoreDuplicates: true, transaction: args.transaction });

      // Return result
      return locations.map((v, i) => {
        return {
          location: v,
          internalId: +csvLocations[i].id
        };
      });
    });
  }

  protected addCourts(): ImportStep<{ court: Court; internalId: number }[]> {
    return new ImportStep('courts', async (args: { mdb: Mdb; transaction: Transaction }) => {
      const locations: { location: Location; internalId: number }[] = this.importSteps
        .get('locations')
        .getData();
      const csvCourts = await csvToArray<ICsvCourt[]>(await args.mdb.toCsv('Court'));

      const courts = [];
      for (const csvCourt of csvCourts) {
        courts.push(
          new Court({
            name: csvCourt.name,
            locationId: locations.find(x => x.internalId === +csvCourt.location)?.location?.id
          }).toJSON()
        );
      }

      await Court.bulkCreate(courts, { ignoreDuplicates: true, transaction: args.transaction });

      const dbCourts = await Court.findAll({
        where: {
          name: {
            [Op.in]: courts.map(r => r.name)
          }
        },
        transaction: args.transaction
      });

      // Return result
      return dbCourts.map((v, i) => {
        return {
          court: v,
          internalId: +csvCourts.find(c => c.name === v.name).id
        };
      });
    });
  }

  protected addGames(): ImportStep<void> {
    return new ImportStep('games', async (args: { mdb: Mdb; transaction: Transaction }) => {
      const players: { player: Player; internalId: number }[] = this.importSteps
        .get('players')
        .getData();
      const courts: { court: Court; internalId: number }[] = this.importSteps
        .get('courts')
        .getData();
      const draws: { draw: DrawTournament; internalId: number }[] = this.importSteps
        .get('draws')
        .getData();

      const csvPlayerMatches = await csvToArray<ICsvPlayerMatchTp[]>(
        await args.mdb.toCsv('PlayerMatch'),
        {
          onError: e => {
            logger.error('Parsing went wrong', {
              error: e
            });
            throw e;
          }
        }
      );

      const csvEntries = await csvToArray<ICsvEntryCp[]>(await args.mdb.toCsv('Entry'), {
        onError: e => {
          logger.error('Parsing went wrong', {
            error: e
          });
          throw e;
        }
      });

      const games = [];
      const gamePlayers = [];
      // For matching on players we only need the ones with entry
      const csvPlayerMatchesEntries = csvPlayerMatches.filter(x => x.entry !== '');

      // But for knowing what games are actual games we need a different sub set (go Visual Reality ...)
      const csvPlayerMatchesFiltered = [];
      csvPlayerMatches
        .filter(x => x.van1 !== '0' && x.van2 !== '0')
        .forEach(pm1 => {
          if (
            !csvPlayerMatchesFiltered.find(
              pm2 =>
                // Poule home / away finder
                pm1.event === pm2.event &&
                pm1.draw === pm2.draw &&
                pm1.van1 === pm2.van2 &&
                // but check if scores are reversd
                // Otherwise could really be home and away
                // Maybe
                pm1.team1set1 === pm2.team2set1 &&
                pm1.team1set2 === pm2.team2set2 &&
                pm1.team1set3 === pm2.team2set3
            )
          ) {
            csvPlayerMatchesFiltered.push(pm1);
          }
        });

      for (const csvPlayerMatch of csvPlayerMatchesFiltered) {
        const csvEntryInPlayerMatch1 = csvPlayerMatchesEntries.find(
          x =>
            x.planning === csvPlayerMatch.van1 &&
            x.event === csvPlayerMatch.event &&
            x.draw === csvPlayerMatch.draw
        );
        const csvEntryInPlayerMatch2 = csvPlayerMatchesEntries.find(
          x =>
            x.planning === csvPlayerMatch.van2 &&
            x.event === csvPlayerMatch.event &&
            x.draw === csvPlayerMatch.draw
        );
        const draw = draws.find(s => s.internalId === parseInt(csvPlayerMatch.draw, 10)).draw;

        let csvEntry1: ICsvEntryCp = null;
        let csvEntry2: ICsvEntryCp = null;

        if (csvEntryInPlayerMatch1) {
          csvEntry1 = csvEntries.find(e => e.id === csvEntryInPlayerMatch1.entry);
        }
        if (csvEntryInPlayerMatch2) {
          csvEntry2 = csvEntries.find(e => e.id === csvEntryInPlayerMatch2.entry);
        }

        // TODO: investigate if this works for tournaments
        const team1Player1 = players.find(x => x.internalId === +csvEntry1?.player1)?.player;
        const team1Player2 = players.find(x => x.internalId === +csvEntry1?.player2)?.player;
        const team2Player1 = players.find(x => x.internalId === +csvEntry2?.player1)?.player;
        const team2Player2 = players.find(x => x.internalId === +csvEntry2?.player2)?.player;

        // Set null when both sets are 0 (=set not played)
        const set1Team1 =
          parseInt(csvPlayerMatch.team1set1, 10) === 0 &&
          parseInt(csvPlayerMatch.team2set1, 10) === 0
            ? null
            : parseInt(csvPlayerMatch.team1set1, 10);
        const set1Team2 =
          parseInt(csvPlayerMatch.team1set1, 10) === 0 &&
          parseInt(csvPlayerMatch.team2set1, 10) === 0
            ? null
            : parseInt(csvPlayerMatch.team2set1, 10);
        const set2Team1 =
          parseInt(csvPlayerMatch.team1set2, 10) === 0 &&
          parseInt(csvPlayerMatch.team2set2, 10) === 0
            ? null
            : parseInt(csvPlayerMatch.team1set2, 10);
        const set2Team2 =
          parseInt(csvPlayerMatch.team1set2, 10) === 0 &&
          parseInt(csvPlayerMatch.team2set2, 10) === 0
            ? null
            : parseInt(csvPlayerMatch.team2set2, 10);
        const set3Team1 =
          parseInt(csvPlayerMatch.team1set3, 10) === 0 &&
          parseInt(csvPlayerMatch.team2set3, 10) === 0
            ? null
            : parseInt(csvPlayerMatch.team1set3, 10);
        const set3Team2 =
          parseInt(csvPlayerMatch.team1set3, 10) === 0 &&
          parseInt(csvPlayerMatch.team2set3, 10) === 0
            ? null
            : parseInt(csvPlayerMatch.team2set3, 10);
        const court = courts.find(x => x.internalId === +csvPlayerMatch.court)?.court;

        if (court === null && !csvPlayerMatch.court && csvPlayerMatch.court !== '') {
          logger.warn('Court not found in db?');
        }

        const momentDate = moment(csvPlayerMatch.plandate);
        const playedAt = momentDate.isValid() ? momentDate.toDate() : null;

        let gameType = GameType.S;
        // always possible that I didn't find a player so it would be null
        if (team1Player2 || team2Player2) {
          if (team1Player1 && team1Player2) {
            if (team1Player1.gender !== team1Player2.gender) {
              gameType = GameType.MX;
            } else if (team1Player1.gender === team1Player2.gender) {
              gameType = GameType.D;
            }
          } else if (team2Player1 && team2Player2) {
            if (team2Player1.gender !== team2Player2.gender) {
              gameType = GameType.MX;
            } else if (team2Player1.gender === team2Player2.gender) {
              gameType = GameType.D;
            }
          } else if (team1Player2 && team2Player1) {
            // So now we know we don't have 2 players on either team,
            // quick check that it just didn't find one on both teams
            if (team1Player2.gender !== team2Player1.gender) {
              gameType = GameType.MX;
            } else if (team1Player2.gender === team2Player1.gender) {
              gameType = GameType.D;
            }
          } else if (team1Player1 && team2Player2) {
            // So now we know we don't have 2 players on either team,
            // quick check that it just didn't find one on both teams
            if (team1Player1.gender !== team2Player2.gender) {
              gameType = GameType.MX;
            } else if (team1Player1.gender === team2Player2.gender) {
              gameType = GameType.D;
            }
          }
        }

        const game = new Game({
          playedAt,
          gameType,
          set1Team1,
          set1Team2,
          set2Team1,
          set2Team2,
          set3Team1,
          set3Team2,
          winner: parseInt(csvPlayerMatch.winner, 10),
          linkId: draw.id,
          linkType: 'tournament',
          courtId: court?.id
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
            moment.locale('nl-be');

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

        const importerFile = await ImporterFile.findOne({
          where: {
            ...settings,
            firstDay: days.dates[0],
            type: EventImportType.TOURNAMENT,
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
          type: EventImportType.TOURNAMENT,
          dates
        }).save({ transaction: args.transaction });
      }
    );
  }
}
