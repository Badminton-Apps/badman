import {
  Court,
  csvToArray,
  DrawTournament,
  EventImportType,
  EventTournament,
  EventType,
  Game,
  GamePlayer,
  ICsvEntry,
  ICsvPlayerMatchTp,
  ImporterFile,
  logger,
  SubEventTournament
} from '@badvlasim/shared';
import moment from 'moment';
import { Transaction } from 'sequelize/types';
import { Mdb } from '../../convert/mdb';
import { TpPlayer } from '../../models';
import { Importer } from '../importer';

export class TournamentImporter extends Importer {
  constructor(mdb: Mdb, transaction: Transaction) {
    super(
      mdb,
      EventType.TOERNAMENT,
      EventImportType.TOERNAMENT,
      transaction,
      EventTournament,
      SubEventTournament,
      DrawTournament
    );
  }

  async addImporterfile(fileLocation: string) {
    const file = await super.addImporterfile(fileLocation);
    file.subEvents = await this.addImportedSubEvents(file);
    return file;
  }

  protected async extractImporterFile() {
    return super.extractImporterFile();
  }

  protected async createGames(draws: DrawTournament[], players: TpPlayer[], courts: Map<string, Court>) {
    const csvPlayerMatches = await csvToArray<ICsvPlayerMatchTp[]>(
      await this.mdb.toCsv('PlayerMatch'),
      {
        onError: e => {
          logger.error('Parsing went wrong', {
            error: e
          });
          throw e;
        }
      }
    );

    const csvGames = [];
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

    for await (const csvPlayerMatch of csvPlayerMatchesFiltered) {
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
      const draw = draws.find(s => s.internalId === parseInt(csvPlayerMatch.draw, 10));

      const t = await this._gameFromCsv(
        draw,
        players,
        csvPlayerMatch,
        csvEntryInPlayerMatch1,
        csvEntryInPlayerMatch2,
        courts
      );

      csvGames.push(t);
    }
    await super.addGamesCsv(csvGames);
  }

  private async _gameFromCsv(
    draw: DrawTournament,
    players: TpPlayer[],
    csvPlayerMatch: ICsvPlayerMatchTp,
    csvEntryInPlayerMatch1: ICsvPlayerMatchTp,
    csvEntryInPlayerMatch2: ICsvPlayerMatchTp,
    courts: Map<string, Court>
  ) {
    const csvEntries = await csvToArray<ICsvEntry[]>(await this.mdb.toCsv('Entry'), {
      onError: e => {
        logger.error('Parsing went wrong', {
          error: e
        });
        throw e;
      }
    });

    if (draw?.id == null) {
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
      gamePlayers.push(
        new GamePlayer({
          playerId: team1Player1.id,
          team: 1,
          player: 1
        }).toJSON()
      );
    }
    if (team1Player2) {
      gamePlayers.push(
        new GamePlayer({
          playerId: team1Player2.id,
          team: 1,
          player: 2
        }).toJSON()
      );
    }
    if (team2Player1) {
      gamePlayers.push(
        new GamePlayer({
          playerId: team2Player1.id,
          team: 2,
          player: 1
        }).toJSON()
      );
    }
    if (team2Player2) {
      gamePlayers.push(
        new GamePlayer({
          playerId: team2Player2.id, 
          team: 2,
          player: 2
        }).toJSON()
      );
    }

    const court = courts.get(csvPlayerMatch.court);

    if (court == null && !csvPlayerMatch.court && csvPlayerMatch.court !== '') {
      logger.warn('Court not found in db?');
    }

    const momentDate = moment(csvPlayerMatch.plandate);
    const playedAt = momentDate.isValid() ? momentDate.toDate() : null;
    const data = new Game({
      playedAt,
      // gameType: draw?.subEvent?.gameType, // S, D, MX
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
    }).toJSON();

    return { game: data, gamePlayers };
  }

  protected async createEvent(importerFile: ImporterFile, transaction: Transaction) {
    return new EventTournament({
      name: importerFile.name,
      uniCode: importerFile.uniCode,
      dates: importerFile.dates,
      firstDay: importerFile.firstDay
    }).save({ transaction });
  }
}
