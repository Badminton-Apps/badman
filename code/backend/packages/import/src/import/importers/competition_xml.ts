import {
  correctWrongPlayers,
  Event,
  EventType,
  flatten,
  Game,
  GamePlayer,
  ImporterFile,
  logger,
  Player,
  SubEvent,
  titleCase
} from '@badvlasim/shared';
import { parse } from 'fast-xml-parser';
import { readFileSync } from 'fs';
import { TpPlayer } from '../../models';
import { Importer } from '../importer';

export class CompetitionXmlImporter extends Importer {
  constructor() {
    super(EventType.COMPETITION_XML);
  }

  async addImporterfile(fileLocation: string) {
    const xmlData = parse(readFileSync(fileLocation, 'utf8'));

    const file = new ImporterFile({
      fileLocation,
      name: xmlData.League.LeagueName,
      type: this.type
    });

    return file.save();
  }

  protected async addPlayersXml(xmlData: any[]): Promise<Player[]> {
    let xmlPlayers = xmlData.reduce((acc: any[], curr) => {
      if (Array.isArray(curr.Member)) {
        acc = acc.concat(curr.Member);
      } else if (curr.Member != null) {
        acc.push(curr.Member);
      }

      return acc;
    }, []);

    xmlPlayers = xmlPlayers.map((xmlPlayer: any) => {
      try {
        return correctWrongPlayers({
          memberId: xmlPlayer.MemberLTANo,
          firstName: titleCase(xmlPlayer.MemberFirstName),
          lastName: titleCase(xmlPlayer.MemberLastName),
          gender: xmlPlayer.MemberGender
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

    return Player.bulkCreate(xmlPlayers, {
      returning: true,
      updateOnDuplicate: ['id', 'memberId', 'firstname', 'lastname', 'gender']
    });
  }

  protected addGames(subEvents: SubEvent[], players: TpPlayer[]) {
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
      { returning: true, updateOnDuplicate: ['id'] } // Return ALL comulms
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

  async addEvent(importerFile: ImporterFile, event?: Event): Promise<Event> {
    const xmlData = parse(readFileSync(importerFile.fileLocation, 'utf8'));
    const teams = Array.isArray(xmlData.League.Team)
      ? [...xmlData.League.Team]
      : [xmlData.League.Team];
    const events = Array.isArray(xmlData.League.Event)
      ? [...xmlData.League.Event]
      : [xmlData.League.Event];

    const players = await this.addPlayersXml(teams);

    await this.addGamesXml(players, event, events);

    await event.save();

    return event;
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
}
