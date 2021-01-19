import {
  Court,
  csvToArray,
  Event,
  EventImportType,
  EventType,
  ICsvEntry,
  ICsvPlayerMatchCp,
  ICsvTeamMatch,
  ImporterFile,
  ImportSubEvents,
  logger,
  SubEvent
} from '@badvlasim/shared';
import moment from 'moment';
import { FindOrCreateOptions } from 'sequelize/types';
import { Mdb } from '../../convert/mdb';
import { TpPlayer } from '../../models';
import { Importer } from '../importer';

export class CompetitionCpImporter extends Importer {
  constructor(mdb: Mdb) {
    super(mdb, EventType.COMPETITION, EventImportType.COMPETITION_CP);
  }

  async addImporterfile(fileLocation: string) {
    const file = await super.addImporterfile(fileLocation);
    file.subEvents = await this.addImportedSubEvents(file);
    return file;
  }

  protected async extractImporterFile() {
    return super.extractImporterFile();
  }

  protected async addGames(subEvents: SubEvent[], players: TpPlayer[], courts: Map<string, Court>) {
    logger.debug('Adding games', players.length);

    const csvPlayerMatches = await csvToArray<ICsvPlayerMatchCp[]>(
      await this.mdb.toCsv('PlayerMatch')
    );
    const csvTeamMatches = await csvToArray<ICsvTeamMatch[]>(await this.mdb.toCsv('teammatch'));
    if (
      csvTeamMatches.find(t => parseInt(t.points1, 10) || 0 + parseInt(t.points2, 10) || 0 === 0)
    ) {
      // No games played
      return;
    }

    const csvGames = [];
    for await (const csvPlayerMatch of csvPlayerMatches) {
      const csvTeamMatch = csvTeamMatches.find(tm => tm.id === csvPlayerMatch.teammatch);
      const subEvent = subEvents.find(s => s.internalId === parseInt(csvTeamMatch.draw, 10));

      csvGames.push(await this._gameFromCsv(subEvent, players, csvPlayerMatch));
    }
    if (csvGames.length > 0) {
      await super.addGamesCsv(csvGames);
    }
  }

  private async _gameFromCsv(
    subEvent: SubEvent,
    players: TpPlayer[],
    csvPlayerMatch: ICsvPlayerMatchCp
  ) {
    if (subEvent?.id == null) {
      logger.warn('No subevent found', csvPlayerMatch);
      return;
    }

    // TODO: investigate if this works for tournaments
    const team1Player1 = players.find(x => x.playerId === csvPlayerMatch?.sp1)?.player;
    const team1Player2 = players.find(x => x.playerId === csvPlayerMatch?.sp2)?.player;
    const team2Player1 = players.find(x => x.playerId === csvPlayerMatch?.sp3)?.player;
    const team2Player2 = players.find(x => x.playerId === csvPlayerMatch?.sp4)?.player;

    // Set null when both sets are 0 (=set not played)
    const set1Team1 = parseInt(csvPlayerMatch.score1_1, 10) || null;
    const set1Team2 = parseInt(csvPlayerMatch.score1_2, 10) || null;
    const set2Team1 = parseInt(csvPlayerMatch.score2_1, 10) || null;
    const set2Team2 = parseInt(csvPlayerMatch.score2_2, 10) || null;
    const set3Team1 = parseInt(csvPlayerMatch.score3_1, 10) || null;
    const set3Team2 = parseInt(csvPlayerMatch.score3_2, 10) || null;

    const gamePlayers = [];

    if (team1Player1) {
      gamePlayers.push({
        playerId: team1Player1.id,
        team: 1,
        player: 1
      });
    }
    if (team1Player2) {
      gamePlayers.push({
        playerId: team1Player2.id,
        team: 1,
        player: 2
      });
    }
    if (team2Player1) {
      gamePlayers.push({
        playerId: team2Player1.id,
        team: 2,
        player: 1
      });
    }
    if (team2Player2) {
      gamePlayers.push({
        playerId: team2Player2.id,
        team: 2,
        player: 2
      });
    }

    const data = {
      playedAt: moment.isDate(csvPlayerMatch.endtime) ? new Date(csvPlayerMatch.endtime) : null,
      gameType: subEvent.gameType, // S, D, MX
      set1Team1,
      set1Team2,
      set2Team1,
      set2Team2,
      set3Team1,
      set3Team2,
      winner: csvPlayerMatch.winner,
      SubEventId: subEvent.id
    };

    return { game: data, gamePlayers };
  }

  protected async addImportedSubEvents(file: ImporterFile, levelType?: string) {
    const { csvEvents, csvDraws } = await super.getSubEventsCsv();

    const subEvents = [];

    for await (const csvDraw of csvDraws) {
      const csvEvent = csvEvents.find(e => e.id === csvDraw.event);
      let subEvent = {};
      try {
        subEvent = {
          name: `${csvEvent.name} ${csvDraw.name}`,
          internalId: parseInt(csvDraw.id, 10),
          eventType: this.getEventType(parseInt(csvEvent.gender, 10)),
          drawType: this.getDrawType(parseInt(csvDraw.drawtype, 10)),
          gameType: this.getGameType(csvEvent.eventtype, parseInt(csvEvent.gender, 10)),
          FileId: file.id,
        };

   

        subEvents.push(subEvent);
      } catch (e) {
        logger.error('Something went wrong adding a subEvent', e);
        throw e;
      }
    }

    return ImportSubEvents.bulkCreate(subEvents,  { returning: true, ignoreDuplicates: true });
  }
}
