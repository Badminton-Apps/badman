import {
  csvToArray,
  Event,
  EventType,
  ICsvEntry,
  ICsvPlayerMatchTp,
  ImporterFile,
  ImportSubEvents,
  SubEvent,
  logger,
  LevelType,
  Court,
  ICsvPlayerMatchCp,
  EventImportType
} from '@badvlasim/shared';
import { Mdb } from '../../convert/mdb';
import { TpPlayer } from '../../models';
import { Importer } from '../importer';

export class TournamentImporter extends Importer {
  constructor(mdb: Mdb) {
    super(mdb, EventType.TOERNAMENT , EventImportType.TOERNAMENT);
  }

  async addImporterfile(fileLocation: string) {
    const file = await super.addImporterfile(fileLocation);
    file.subEvents = await this.addImportedSubEvents(file);
    return file;
  }

  protected async extractImporterFile() {
    return super.extractImporterFile();
  }

  protected async addImportedSubEvents(file: ImporterFile) {
    const { csvEvents, csvDraws } = await super.getSubEventsCsv();
    const leauge = super.getLeague(file);
    const subEvents = [];

    for await (const csvDraw of csvDraws) {
      const csvEvent = csvEvents.find(e => e.id === csvDraw.event);

      try {
        const data = {
          name: csvDraw.name,
          internalId: parseInt(csvEvent.id, 10),
          eventType: this.getEventType(parseInt(csvEvent.gender, 10)),
          drawType: this.getDrawType(parseInt(csvDraw.drawtype, 10)),
          gameType: this.getGameType(csvEvent.eventtype, parseInt(csvEvent.gender, 10)),
          FileId: file.id,
          levelType: leauge
        };
        subEvents.push(data);
      } catch (e) {
        logger.error('Something went wrong adding a subEvent', e);
        throw e; 
      }
    }

    return ImportSubEvents.bulkCreate(subEvents, { returning: true, ignoreDuplicates: true});
  }

  protected async addGames(subEvents: SubEvent[], players: TpPlayer[], courts: Map<string, Court>) {
    let csvPlayerMatches = await csvToArray<ICsvPlayerMatchTp[]>(
      await this.mdb.toCsv('PlayerMatch')
    );

    csvPlayerMatches = csvPlayerMatches.filter(x => x.van1 !== '' && x.van2 !== '');

    const csvGames = [];
    for await (const csvPlayerMatch of csvPlayerMatches) {
      const csvEntryInPlayerMatch1 = csvPlayerMatches.find(
        x =>
          x.planning === csvPlayerMatch.van1 &&
          x.event === csvPlayerMatch.event &&
          x.draw === csvPlayerMatch.draw 
      );
      const csvEntryInPlayerMatch2 = csvPlayerMatches.find(
        x =>
          x.planning === csvPlayerMatch.van2 &&
          x.event === csvPlayerMatch.event &&
          x.draw === csvPlayerMatch.draw
      );
      const subEvent = subEvents.find(s => s.internalId === parseInt(csvPlayerMatch.event, 10));
      csvGames.push(
        await this._gameFromCsv(
          subEvent,
          players,
          csvPlayerMatch,
          csvEntryInPlayerMatch1,
          csvEntryInPlayerMatch2,
          courts
        )
      );
    }
    super.addGamesCsv(csvGames);
  }

  private async _gameFromCsv(
    subEvent: SubEvent,
    players: TpPlayer[],
    csvPlayerMatch: ICsvPlayerMatchTp,
    csvEntryInPlayerMatch1: ICsvPlayerMatchTp,
    csvEntryInPlayerMatch2: ICsvPlayerMatchTp,
    courts: Map<string, Court>
  ) {
    const csvEntries = await csvToArray<ICsvEntry[]>(await this.mdb.toCsv('Entry'));

    if (subEvent?.id == null) {
      logger.warn('No subevent found', csvPlayerMatch);
      return;
    }

    let csvEntry1: ICsvEntry = null;
    let csvEntry2: ICsvEntry = null;

    if (csvEntryInPlayerMatch1) {
      csvEntry1 = csvEntries.find(e => e.id === csvEntryInPlayerMatch1.entry);
    }
    if (csvEntryInPlayerMatch2) {
      csvEntry2 = csvEntries.find(e => e.id === csvEntryInPlayerMatch2.entry);
    }

    // TODO: investigate if this works for tournaments
    const team1Player1 = players.find(x => x.playerId === csvEntry1?.player1)?.player;
    const team1Player2 = players.find(x => x.playerId === csvEntry1?.player2)?.player;
    const team2Player1 = players.find(x => x.playerId === csvEntry2?.player1)?.player;
    const team2Player2 = players.find(x => x.playerId === csvEntry2?.player2)?.player;

    // Set null when both sets are 0 (=set not played)
    const set1Team1 =
      parseInt(csvPlayerMatch.team1set1, 10) === 0 && parseInt(csvPlayerMatch.team2set1, 10) === 0
        ? null
        : parseInt(csvPlayerMatch.team1set1, 10);
    const set1Team2 =
      parseInt(csvPlayerMatch.team1set1, 10) === 0 && parseInt(csvPlayerMatch.team2set1, 10) === 0
        ? null
        : parseInt(csvPlayerMatch.team2set1, 10);
    const set2Team1 =
      parseInt(csvPlayerMatch.team1set2, 10) === 0 && parseInt(csvPlayerMatch.team2set2, 10) === 0
        ? null
        : parseInt(csvPlayerMatch.team1set2, 10);
    const set2Team2 =
      parseInt(csvPlayerMatch.team1set2, 10) === 0 && parseInt(csvPlayerMatch.team2set2, 10) === 0
        ? null
        : parseInt(csvPlayerMatch.team2set2, 10);
    const set3Team1 =
      parseInt(csvPlayerMatch.team1set3, 10) === 0 && parseInt(csvPlayerMatch.team2set3, 10) === 0
        ? null
        : parseInt(csvPlayerMatch.team1set3, 10);
    const set3Team2 =
      parseInt(csvPlayerMatch.team1set3, 10) === 0 && parseInt(csvPlayerMatch.team2set3, 10) === 0
        ? null
        : parseInt(csvPlayerMatch.team2set3, 10);

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

    const court = courts.get(csvPlayerMatch.court);

    if (court == null && csvPlayerMatch.court !== ""){
      logger.warn("Court not found in db?")
    }

    const data = {
      playedAt: new Date(csvPlayerMatch.plandate),
      gameType: subEvent.gameType, // S, D, MX
      set1Team1,
      set1Team2,
      set2Team1,
      set2Team2,
      set3Team1,
      set3Team2,
      winner: csvPlayerMatch.winner,
      subEventId: subEvent.id,
      courtId: court?.id
    };

    return { game: data, gamePlayers };
  }
}
