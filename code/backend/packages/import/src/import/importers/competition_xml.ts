import {
  Club,
  ClubMembership,
  correctWrongPlayers,
  Court,
  DataBaseHandler,
  DrawCompetition,
  DrawType,
  EventCompetition,
  EventImportType,
  EventType,
  flatten,
  Game,
  GamePlayer,
  GameType,
  ImporterFile,
  LevelType,
  logger,
  Player,
  SubEventCompetition,
  SubEventType,
  Team,
  EncounterCompetition,
  titleCase,
  TeamPlayerMembership,
  TeamSubEventMembership
} from '@badvlasim/shared';
import { Hash } from 'crypto';
import { parse } from 'fast-xml-parser';
import { readFileSync, unlink } from 'fs';
import moment, { Moment } from 'moment';
import { Op, Transaction } from 'sequelize';
import { TpPlayer } from '../../models';
import { Importer } from '../importer';

export class CompetitionXmlImporter extends Importer {
  constructor(transaction: Transaction) {
    super(
      null,
      EventType.COMPETITION,
      EventImportType.COMPETITION_XML,
      transaction,
      EventCompetition,
      SubEventCompetition,
      DrawCompetition
    );
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

  async addEvent(importerFile: ImporterFile, event?: EventCompetition): Promise<EventCompetition> {
    const xmlData = parse(readFileSync(importerFile.fileLocation, 'utf8'));
    const teams = Array.isArray(xmlData.League.Team)
      ? [...xmlData.League.Team]
      : [xmlData.League.Team];
    const events = Array.isArray(xmlData.League.Event)
      ? [...xmlData.League.Event]
      : [xmlData.League.Event];

    if (event == null) {
      logger.warn("This isn't really intended");

      event = await new EventCompetition({
        name: importerFile.name,
        startYear: importerFile.firstDay.getFullYear()
      }).save();
    }

    const players = await this.addPlayersXml(teams, event);

    await this.addGamesXml(players, event, events, importerFile);

    await event.save();

    return event;
  }

  // #region internal

  protected createGames(draws: DrawCompetition[], players: TpPlayer[], courts: Map<string, Court>) {
    throw new Error('Nope! use addGamesXML!');
  }

  protected async createEvent(importerFile: ImporterFile, transaction: Transaction) {
    return new EventCompetition({
      name: importerFile.name,
      uniCode: importerFile.uniCode,
      startYear: importerFile.firstDay.getFullYear()
    }).save({ transaction });
  }

  protected async addGamesXml(
    players: Map<string, Player>,
    event: EventCompetition,
    xmlData: any,
    importerFile: ImporterFile
  ) {
    const xmlGames = [];
    for (const xmlEvent of xmlData) {
      const subEventWhere = {
        eventId: event.id,
        internalId: xmlEvent.EventSiebelId
      };
      let dbSubevent = await SubEventCompetition.findOne({
        where: subEventWhere,
        include: [DrawCompetition]
      });

      const xmlDivisions = Array.isArray(xmlEvent.Division)
        ? [...xmlEvent.Division]
        : [xmlEvent.Division];

      if (!dbSubevent) {
        // Slow way, but last option to fix it
        const matches = xmlDivisions
          .map(d => (Array.isArray(d.Fixture) ? [...d.Fixture] : [d.Fixture]))
          .flat()
          .filter(f => f)
          .map(f => (Array.isArray(f.Match) ? [...f.Match] : [f.Match]))
          .flat()
          .filter(f => f);

        // Types:
        // 1 = Single M
        // 2 = Single D
        // 3 = Double M
        // 4 = Double D
        // 5 = MIX
        dbSubevent = await new SubEventCompetition({
          name: xmlEvent.EventName,
          internalId: xmlEvent.EventSiebelId,
          eventType: matches.find(r => r.MatchType === 5)
            ? SubEventType.MX
            : matches.find(r => r.MatchType === 1)
            ? SubEventType.M
            : SubEventType.F,
          level: this.getLevel(xmlEvent.EventName),
          levelType: this.getLeague(importerFile),
          eventId: event.id
        }).save();
        logger.warn('No subevent found', { where: subEventWhere, created: dbSubevent.toJSON() });
      }

      const teams = await Team.findAll();

      for (const division of xmlDivisions) {
        if (!division) {
          continue;
        }

        let dbDraw = dbSubevent?.draws?.find(r => r.internalId === division.DivisionLPId);

        if (!dbDraw) {
          dbDraw = await new DrawCompetition({
            name: division.DivisionName,
            subeventId: dbSubevent.id,
            internalId: division.DivisionLPId
          }).save();

          logger.warn('No draw found', { id: division.DivisionLPId, created: dbDraw.toJSON() });
        }

        const xmlFixtures = Array.isArray(division.Fixture)
          ? [...division.Fixture]
          : [division.Fixture];

        const xmlFixturesTeams = [
          ...new Set([
            ...xmlFixtures.map(r => r?.FixtureTeam1),
            ...xmlFixtures.map(r => r?.FixtureTeam2)
          ])
        ];
        for (const fixtureTeam of xmlFixturesTeams) {
          const dbTeam = teams.find(r => r.name === this._cleanedTeamName(fixtureTeam));
          if (dbTeam == null) {
            logger.warn('Team not found?', fixtureTeam);
            continue;
          }

          dbTeam.type = dbSubevent.eventType;
          await dbTeam.addSubEvent(dbSubevent);
          await dbTeam.save();
        }

        for (const fixture of xmlFixtures) {
          if (!fixture) {
            continue;
          }

          const xmlMatches = (Array.isArray(fixture.Match)
            ? [...fixture.Match]
            : [fixture.Match]
          ).filter(m => m);

          const time = fixture.FixtureStartTime.split(':');
          const playedAt = new Date(
            fixture.FixtureYear,
            fixture.FixtureMonth,
            fixture.FixtureDay,
            time[0],
            time[1]
          );

          const home = teams.find(t => t.name == this._cleanedTeamName(fixture.FixtureTeam1))
          const away = teams.find(t => t.name == this._cleanedTeamName(fixture.FixtureTeam2))

          const encountComp = {
            date: playedAt,
            drawId: dbDraw.id
          };
          const [dbEncounter] = await EncounterCompetition.findCreateFind({
            where: encountComp,
            defaults: encountComp
          });

          await dbEncounter.setHome(home);
          await dbEncounter.setAway(away);

          for (const match of xmlMatches) {
            const gamePlayers = [];

            const data = new Game({
              playedAt,
              gameType: this._getMatchType(match.MatchType), // S, D, MX
              set1Team1: match.MatchTeam1Set1,
              set1Team2: match.MatchTeam1Set2,
              set2Team1: match.MatchTeam2Set1,
              set2Team2: match.MatchTeam2Set2,
              set3Team1: match.MatchTeam3Set1,
              set3Team2: match.MatchTeam3Set2,
              winner: match.MatchWinner,
              linkId: dbEncounter.id,
              linkType: 'competition'
            });

            const loserTeam = match.MatchWinner === 1 ? 2 : 1;

            if (match.MatchWinnerLTANo && match.MatchWinnerLTANo !== 'NA') {
              const playerId = players.get(match.MatchWinnerLTANo)?.id;
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

            if (match.MatchWinnerPartnerLTANo && match.MatchWinnerPartnerLTANo !== 'NA') {
              const playerId = players.get(match.MatchWinnerPartnerLTANo)?.id;
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

            if (match.MatchLoserLTANo && match.MatchLoserLTANo !== 'NA') {
              const playerId = players.get(match.MatchLoserLTANo)?.id;

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

            if (match.MatchLoserPartnerLTANo && match.MatchLoserPartnerLTANo !== 'NA') {
              const playerId = players.get(match.MatchLoserPartnerLTANo)?.id;

              if (!playerId) {
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

            xmlGames.push({ game: data.toJSON(), gamePlayers });
          }
        }
      }
    }

    const dbGames = await Game.bulkCreate(
      xmlGames.map(x => x.game),
      { returning: ['*'], ignoreDuplicates: true } // Return ALL comulms
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

  protected async addPlayersXml(
    xmlData: any[],
    event: EventCompetition
  ): Promise<Map<string, Player>> {
    const teams = [];
    const players = new Map<string, Player>();

    for (const xmlD of xmlData) {
      let xmlPlayersForteam = [];
      const playersForteam = [];
      if (Array.isArray(xmlD.Member)) {
        xmlPlayersForteam = xmlD.Member.map(m => {
          return {
            ...m,
            ClubId: xmlD.TeamClubSiebelId
          };
        });
      } else if (xmlD.Member != null) {
        xmlPlayersForteam = [{ ...xmlD.Member, ClubId: xmlD.TeamClubSiebelId }];
      }

      // Correct wrong id's and such
      for (const xmlPlayer of xmlPlayersForteam || []) {
        try {
          const corrected = correctWrongPlayers({
            memberId: xmlPlayer.MemberLTANo,
            firstName: titleCase(xmlPlayer.MemberFirstName),
            lastName: titleCase(xmlPlayer.MemberLastName),
            gender: xmlPlayer.MemberGender,
            club: xmlPlayer.ClubId
          });

          // New Player, so all our values are correclty initialized
          // Also checks properties
          const player = new Player({
            ...corrected
          });
          // Add to big list
          players.set(xmlPlayer.MemberLTANo, player);

          // add to team list
          if (player.memberId && playersForteam.find(p => p.memberId === player.memberId) == null) {
            playersForteam.push(player);
          }
        } catch (error) {
          logger.error("Couldn't parse player", error);
          throw error;
        }
      }

      // Assign players to teams
      if (teams.findIndex(t => t.name === xmlD.TeamName) === -1) {
        teams.push({
          name: xmlD.TeamName,
          clubId:
            xmlD.TeamClubSiebelId !== '' && xmlD.TeamClubSiebelId ? xmlD.TeamClubSiebelId : null,
          players: playersForteam
        });
      }
    }

    const arrayVersion = [...players].filter((thing, i, arr) =>
      thing[1].memberId
        ? arr.findIndex(t => t[1].memberId === thing[1].memberId) === i
        : // Less accurate
          arr.findIndex(
            t => t[1].firstName === thing[1].firstName && t[1].lastName === thing[1].lastName
          ) === i
    );

    const dbPlayers = await Player.bulkCreate(
      arrayVersion.map(p => p[1].toJSON()),
      {
        returning: ['*'],
        updateOnDuplicate: ['firstname', 'lastname', 'gender']
      }
    );

    const dbPlayerMap = new Map<string, Player>();
    for (const dbPlayer of dbPlayers) {
      const mapVersion = arrayVersion.find(r => `${r[1].memberId}` === `${dbPlayer.memberId}`);
      dbPlayerMap.set(mapVersion[0], dbPlayer);
    }

    await this._addToTeamsAndClubs(teams, dbPlayers, moment([event.startYear, 7, 1]));

    return dbPlayerMap;
  }

  private async _addToTeamsAndClubs(teams, dbPlayers: Player[], start: Moment) {
    const dbClubs = await Club.findAll();
    const teamsData = [];

    for (const t of teams) {
      const club = await this._findOrCreateClub(dbClubs, t);
      teamsData.push(
        new Team({
          name: this._cleanedTeamName(t.name),
          ClubId: club.id
        }).toJSON()
      );
    }

    const dbTeams = await Team.bulkCreate(teamsData, {
      returning: ['*'],
      updateOnDuplicate: ['name']
    });

    const playersForClubs = new Map<string, string[]>();
    for await (const team of teams) {
      const dbTeam = dbTeams.find(dbt => dbt.name === this._cleanedTeamName(team.name));

      if (team.players && team.players.length > 0) {
        try {
          const dbTeamPlayers = [];

          // get Player id
          for (const teamPlayer of team.players) {
            const dbPlayer = dbPlayers.find(dbp => dbp.memberId === `${teamPlayer.memberId}`);

            if (!dbPlayer) {
              logger.warn('Player not foud!');
            }

            dbTeamPlayers.push(dbPlayer);
          }

          await this._addToTeams(
            dbTeamPlayers.map(r => r.id),
            start,
            dbTeam.id
          );

          let currentPlayersOfClub = playersForClubs.get(dbTeam.ClubId);
          if (currentPlayersOfClub == null) {
            currentPlayersOfClub = [];
          }
          currentPlayersOfClub = currentPlayersOfClub.concat(dbTeamPlayers.map(r => r.id));

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

    for (const playersForClub of playersForClubs) {
      await this._addToClubs(
        playersForClub[1].filter((n, i) => playersForClub[1].indexOf(n) === i),
        start,
        playersForClub[0]
      );
    }
  }

  private async _addToTeams(playersIds: string[], inputStart: Moment, teamId: string) {
    // Force start and end to 1 september
    const start = moment(inputStart)
      .set('month', 8)
      .startOf('month');
    const end = moment(start)
      .add(1, 'year')
      .set('month', 8)
      .startOf('month');

    // Get all existing memberships of the players
    const dbTeamMemberships = await TeamPlayerMembership.findAll({
      where: {
        playerId: {
          [Op.in]: playersIds.map(r => r)
        },
        [Op.or]: [{ end: start.toDate() }, { start: start.toDate() }]
      },
      transaction: this.transaction
    });

    for await (const playerId of playersIds) {
      const dbTeamPlayerMemberships = dbTeamMemberships.filter(
        m => m.playerId === playerId && m.teamId === teamId
      );
      if (dbTeamPlayerMemberships.length > 1) {
        logger.warn("this shouldn't happen", playerId);
      }

      // if same team, add on year
      if (dbTeamPlayerMemberships && dbTeamPlayerMemberships.length === 1) {
        if (end.isSameOrAfter(dbTeamPlayerMemberships[0].end)) {
          dbTeamPlayerMemberships[0].end = end.toDate();
          await dbTeamPlayerMemberships[0].save({ transaction: this.transaction });
          return;
        } else if (
          end.isBetween(dbTeamPlayerMemberships[0].start, dbTeamPlayerMemberships[0].end)
        ) {
          //  re-import
          return;
        }
      }

      // new membership
      await new TeamPlayerMembership({
        playerId,
        teamId,
        end: end.toDate(),
        start: start.toDate()
      }).save({ transaction: this.transaction });
    }
  }

  private async _addToClubs(playersIds: string[], inputStart: Moment, clubId: string) {
    // Force start and end to 1 september
    const start = moment(inputStart)
      .set('month', 8)
      .startOf('month');
    const end = moment(start)
      .add(1, 'year')
      .set('month', 8)
      .startOf('month');

    // Get all existing memberships of the players
    const dbClubMemberships = await ClubMembership.findAll({
      where: {
        playerId: {
          [Op.in]: playersIds.map(r => r)
        },
        [Op.or]: [{ end: start.toDate() }, { start: start.toDate() }]
      },
      transaction: this.transaction
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
        if (end.isSameOrAfter(dbclubPlayerMemberships[0].end)) {
          dbclubPlayerMemberships[0].end = end.toDate();
          await dbclubPlayerMemberships[0].save({ transaction: this.transaction });
          return;
        } else if (
          end.isBetween(dbclubPlayerMemberships[0].start, dbclubPlayerMemberships[0].end)
        ) {
          // re-import
          return;
        }
      }

      // new membership
      await new ClubMembership({
        playerId,
        clubId,
        end: end.toDate(),
        start: start.toDate()
      }).save({ transaction: this.transaction });
    }
  }

  private async _findOrCreateClub(clubs: Club[], t: any): Promise<Club> {
    let club = clubs.find(c => c.clubId === t.clubId);
    if (club) {
      return club;
    }

    // filter out naming convertion
    const clubName = this._cleanedClubName(t.name);

    if (clubName.length <= 0) {
      throw new Error('No team name?');
    }

    club = clubs.find(c => c.name === clubName);
    if (club) {
      return club;
    }

    const [dbclub, createdNew] = await Club.findOrCreate({
      where: {
        name: clubName
      },
      defaults: {
        name: clubName,
        clubId: t.clubId
      }
    });

    if (!createdNew) {
      logger.warn("Club id isn't the same ?");
    }

    clubs.push(dbclub);

    return dbclub;
  }

  private _cleanedTeamName(name: string) {
    name = name?.replace(/\(\d+\)/, '');
    name = name?.replace('&amp;', '&');

    return name;
  }

  private _cleanedClubName(name: string) {
    name = name.replace(/(\ \d+[G|H|D]\ ?)/, '');
    name = name.replace(/\(\d+\)/, '');

    return name;
  }

  private _getMatchType(type: string | number) {
    switch (type) {
      case 1:
      case 2:
      case 'HE':
      case 'DE':
        return GameType.S;
      case 3:
      case 4:
      case 'HD':
      case 'DD':
        return GameType.D;
      case 5:
      case 'GD':
        return GameType.MX;
      default:
        throw new Error('Unsupported type');
    }
  }
  // #endregion
}
