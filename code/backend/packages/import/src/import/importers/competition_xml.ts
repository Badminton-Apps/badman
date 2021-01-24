import {
  Club,
  ClubMembership,
  correctWrongPlayers,
  Court,
  DataBaseHandler,
  Event,
  EventImportType,
  EventType,
  flatten,
  Game,
  GamePlayer,
  ImporterFile,
  logger,
  Player,
  SubEvent,
  Team,
  TeamMembership,
  titleCase
} from '@badvlasim/shared';
import { parse } from 'fast-xml-parser';
import { readFileSync, unlink } from 'fs';
import moment, { Moment } from 'moment';
import { Op, Transaction } from 'sequelize';
import { TpPlayer } from '../../models';
import { Importer } from '../importer';

export class CompetitionXmlImporter extends Importer {
  constructor() {
    super(null, EventType.COMPETITION, EventImportType.COMPETITION_XML);
  }

  async addImporterfile(fileLocation: string) {
    const xmlData = parse(readFileSync(fileLocation, 'utf8'));
    const yearRegexr = /\b(19|20)\d{2}\b/g;
    let compYear: Date = null;
    const matches = yearRegexr.exec(xmlData.League.LeagueName);
    if (matches != null) {
      compYear = moment([matches[0], 8, 1]).toDate();
    }

    const importerFile = await ImporterFile.findOne({
      where: {
        name: xmlData.League.LeagueName,
        firstDay: compYear,
        type: this.importType
      }
    });

    if (importerFile) {
      // delete old file
      unlink(importerFile.fileLocation, err => {
        if (err) {
          logger.error(`delete file ${importerFile.fileLocation} failed`, err);
          throw err;
        }
        logger.debug('Old file deleted', importerFile.fileLocation);
      });
      await importerFile.destroy();
    }

    const file = new ImporterFile({
      fileLocation,
      name: xmlData.League.LeagueName,
      firstDay: compYear,
      type: this.importType
    });

    return file.save();
  }

  async addEvent(importerFile: ImporterFile, event?: Event): Promise<Event> {
    const xmlData = parse(readFileSync(importerFile.fileLocation, 'utf8'));
    const teams = Array.isArray(xmlData.League.Team)
      ? [...xmlData.League.Team]
      : [xmlData.League.Team];
    const events = Array.isArray(xmlData.League.Event)
      ? [...xmlData.League.Event]
      : [xmlData.League.Event];

    const players = await this.addPlayersXml(teams, event);

    await this.addGamesXml(players, event, events);

    await event.save();

    return event;
  }

  // #region internal

  protected async addPlayersXml(xmlData: any[], event: Event): Promise<Player[]> {
    const teams = [];

    let xmlPlayers = xmlData.reduce((acc: any[], curr) => {
      let playersForteam = [];
      if (Array.isArray(curr.Member)) {
        playersForteam = curr.Member.map(m => {
          return {
            ...m,
            ClubId: curr.TeamClubSiebelId
          };
        });
      } else if (curr.Member != null) {
        playersForteam = [{ ...curr.Member, ClubId: curr.TeamClubSiebelId }];
      }

      if (playersForteam.length > 0) {
        if (teams.findIndex(t => t.name === curr.TeamName) === -1) {
          teams.push({
            name: curr.TeamName,
            clubId: curr.TeamClubSiebelId,
            players: playersForteam?.map(r => r.MemberLTANo)
          });
        }

        acc = acc.concat(playersForteam);
      }

      return acc;
    }, []);

    xmlPlayers = xmlPlayers.map((xmlPlayer: any) => {
      try {
        return correctWrongPlayers({
          memberId: xmlPlayer.MemberLTANo,
          firstName: titleCase(xmlPlayer.MemberFirstName),
          lastName: titleCase(xmlPlayer.MemberLastName),
          gender: xmlPlayer.MemberGender,
          club: xmlPlayer.ClubId
        });
      } catch (error) {
        logger.error("Couldn't parse player", error);
        throw error;
      }
    });

    // distinct players
    xmlPlayers = xmlPlayers.filter(
      (thing, i, arr) => arr.findIndex(t => t.memberId === thing.memberId) === i
    );

    const dbPlayers = await Player.bulkCreate(xmlPlayers, {
      returning: true,
      fields: ['memberId', 'firstName', 'lastName', 'gender'],
      updateOnDuplicate: ['memberId', 'firstname', 'lastname', 'gender']
    });

    await this._addToTeams(teams, dbPlayers, event.firstDay);

    return dbPlayers;
  }

  private async _addToClubs(
    playersIds: number[],
    start: Date,
    end: Moment,
    clubId: number,
    transaction: Transaction
  ) {
    // Get all existing memberships of the players
    const dbClubMemberships = await ClubMembership.findAll({
      where: {
        playerId: {
          [Op.in]: playersIds.map(r => r)
        },
        end: {
          [Op.gte]: moment(start).toDate()
        }
      }
    });

    for await (const playerId of playersIds) {
      const dbclubPlayerMemberships = dbClubMemberships.filter(
        m => m.playerId === playerId && m.clubId === clubId
      );
      if (dbclubPlayerMemberships.length > 1) {
        logger.warn("this shouldn't happen", playerId);
      }
      // if same team, add on year
      if (dbclubPlayerMemberships && dbclubPlayerMemberships.length === 1) {
        if (end.isAfter(dbclubPlayerMemberships[0].end)) {
          dbclubPlayerMemberships[0].end = end.toDate();
          await dbclubPlayerMemberships[0].save({ transaction });
        }
      } else {
        // new membership
        await new ClubMembership({
          playerId,
          clubId,
          start,
          end: end.toDate()
        }).save({ transaction });
      }
    }
  }

  private async _addToTeams(teams, dbPlayers: Player[], start: Date) {
    const dbClubs = await Club.findAll();
    const teamsData = [];
    const end = moment(start).add(1, 'year');

    for (const t of teams) {
      const club = await this._findOrCreateClub(dbClubs, t);
      teamsData.push({
        name: t.name,
        ClubId: club.id
      });
    }

    const dbTeams = await Team.bulkCreate(teamsData, {
      returning: true,
      fields: ['name', 'ClubId'],
      updateOnDuplicate: ['name']
    });

    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      const playersForClubs = new Map<number, number[]>();
      for await (const team of teams) {
        const dbTeam = dbTeams.find(dbt => dbt.name === team.name);

        if (team.players && team.players.length > 0) {
          try {
            const dbTeamPlayers = team.players.map(tp =>
              dbPlayers.find(dbp => dbp.memberId === `${tp}`)
            );

            const playerIds = dbTeamPlayers.map(r => r.id);

            // Get all existing memberships of the players
            const dbteamMemberships = await TeamMembership.findAll({
              where: {
                playerId: {
                  [Op.in]: playerIds
                },
                // New year starts when old year stops
                end: {
                  [Op.gte]: moment(start).toDate()
                }
              }
            });

            for await (const player of dbTeamPlayers) {
              const dbteamPlayerMemberships = dbteamMemberships.filter(
                m => m.playerId === player.id && m.teamId === dbTeam.id
              );
              if (dbteamPlayerMemberships.length > 1) {
                logger.warn("this shouldn't happen", player);
              }
              // if same team, add on year
              if (dbteamPlayerMemberships && dbteamPlayerMemberships.length === 1) {
                // if after
                if (end.isAfter(dbteamPlayerMemberships[0].end)) {
                  dbteamPlayerMemberships[0].end = end.toDate();
                  await dbteamPlayerMemberships[0].save({ transaction });
                }
              } else {
                // new membership
                await new TeamMembership({
                  playerId: player.id,
                  teamId: dbTeam.id,
                  start,
                  end: end.toDate()
                }).save({ transaction });
              }
            }

            let currentPlayersOfClub = playersForClubs.get(dbTeam.ClubId);
            if (currentPlayersOfClub == null) {
              currentPlayersOfClub = [];
            }
            currentPlayersOfClub = currentPlayersOfClub.concat(playerIds);

            playersForClubs.set(dbTeam.ClubId, currentPlayersOfClub);
          } catch (err) {
            logger.error(`Something went wrong with`, {
              team,
              err
            });
            throw err;
          }
        }
      }

      for(const playersForClub of playersForClubs){
        await this._addToClubs(playersForClub[1].filter((n, i) => playersForClub[1].indexOf(n) === i), start, end, playersForClub[0], transaction);
      }


      transaction.commit();
    } catch (err) {
      transaction.rollback();
      logger.error(`Something went wrong`, {
        err
      });
      throw err;
    }
  }

  private async _findOrCreateClub(clubs: Club[], t: any): Promise<Club> {
    let club = clubs.find(c => c.clubId === t.clubId);
    if (club) {
      return club;
    }

    // filter out naming convertion
    const searchString = t.name.replace(/(\ \d+[G|H|D]\ ?)/, '');
    if (searchString.length <= 0) {
      throw new Error('No team name?');
    }

    club = clubs.find(c => c.name === searchString);
    if (club) {
      return club;
    }

    club = await Club.create({
      name: searchString,
      clubId: t.clubId
    });
    clubs.push(club);

    return club;
  }

  protected addGames(subEvents: SubEvent[], players: TpPlayer[], courts: Map<string, Court>) {
    throw new Error('Nope! use addGamesXML!');
  }

  protected async addGamesXml(players: Player[], event: Event, xmlData: any) {
    const xmlGames = [];
    for (const xmlEvent of xmlData) {
      const xmlDivisions = Array.isArray(xmlEvent.Division)
        ? [...xmlEvent.Division]
        : [xmlEvent.Division];

      for (const division of xmlDivisions) {
        if (!division) {
          continue;
        }

        const where = {
          EventId: event.id,
          internalId: division.DivisionLPId
        };
        const dbSubevent = await SubEvent.findOne({
          where
        });

        if (!dbSubevent) {
          logger.warn('No subevent found', where);
          continue;
        }

        const xmlFixtures = Array.isArray(division.Fixture)
          ? [...division.Fixture]
          : [division.Fixture];

        for (const fixture of xmlFixtures) {
          if (!fixture) {
            continue;
          }

          const xmlMatches = Array.isArray(fixture.Match) ? [...fixture.Match] : [fixture.Match];

          const time = fixture.FixtureStartTime.split(':');
          const playedAt = new Date(
            fixture.FixtureYear,
            fixture.FixtureMonth,
            fixture.FixtureDay,
            time[0],
            time[1]
          );

          for (const match of xmlMatches) {
            const gamePlayers = [];

            const data = {
              playedAt,
              gameType: this._getMatchType(match.MatchType), // S, D, MX
              set1Team1: match.MatchTeam1Set1,
              set1Team2: match.MatchTeam1Set2,
              set2Team1: match.MatchTeam2Set1,
              set2Team2: match.MatchTeam2Set2,
              set3Team1: match.MatchTeam3Set1,
              set3Team2: match.MatchTeam3Set2,
              winner: match.MatchWinner,
              SubEventId: dbSubevent.id
            };

            const loserTeam = match.MatchWinner === 1 ? 2 : 1;

            if (match.MatchWinnerLTANo) {
              const playerId = players.find(x => x.memberId === `${match.MatchWinnerLTANo}`)?.id;
              if (!playerId) {
                logger.warn(
                  `No player found for MatchWinnerLTANo ${match.MatchWinnerLTANo}`,
                  match
                );
              } else {
                gamePlayers.push({
                  playerId,
                  team: match.MatchWinner,
                  player: 1
                });
              }
            }

            if (match.MatchWinnerPartnerLTANo) {
              const playerId = players.find(x => x.memberId === `${match.MatchWinnerPartnerLTANo}`)
                ?.id;
              if (!playerId) {
                logger.warn(
                  `No player found for MatchWinnerPartnerLTANo ${match.MatchWinnerPartnerLTANo}`,
                  match
                );
              } else {
                gamePlayers.push({
                  playerId,
                  team: match.MatchWinner,
                  player: 2
                });
              }
            }

            if (match.MatchLoserLTANo) {
              const playerId = players.find(x => x.memberId === `${match.MatchLoserLTANo}`)?.id;
              if (!playerId) {
                logger.warn(`No player found for MatchLoserLTANo ${match.MatchLoserLTANo}`, match);
              } else {
                gamePlayers.push({
                  playerId,
                  team: loserTeam,
                  player: 1
                });
              }
            }

            if (match.MatchLoserPartnerLTANo) {
              const playerId = players.find(x => x.memberId === `${match.MatchLoserPartnerLTANo}`)
                ?.id;
              if (playerId === null) {
                logger.warn(
                  `No player found for MatchLoserPartnerLTANo ${match.MatchLoserPartnerLTANo}`,
                  match
                );
              } else {
                gamePlayers.push({
                  playerId,
                  team: loserTeam,
                  player: 2
                });
              }
            }

            xmlGames.push({ game: data, gamePlayers });
          }
        }
      }
    }

    const dbGames = await Game.bulkCreate(
      xmlGames.map(x => x.game),
      { returning: true, ignoreDuplicates: true } // Return ALL comulms
    );

    const gamePlayersWithGameId = dbGames.reduce((acc, cur, idx) => {
      return acc.concat(
        xmlGames[idx].gamePlayers.map(x => {
          x.gameId = cur.id;
          return x;
        })
      );
    }, []);

    await GamePlayer.bulkCreate(flatten(gamePlayersWithGameId), { ignoreDuplicates: true });
  }

  private _getMatchType(type: string | number) {
    switch (type) {
      case 1:
      case 2:
      case 'HE':
      case 'DE':
        return 'S';
      case 3:
      case 4:
      case 'HD':
      case 'DD':
        return 'D';
      case 5:
      case 'GD':
        return 'MX';
      default:
        throw new Error('Unsupported type');
    }
  }
  // #endregion
}
