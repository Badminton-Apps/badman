import {
  Court,
  csvToArray,
  DrawCompetition,
  EventCompetition,
  EventImportType,
  EncounterCompetition,
  EventType,
  Game,
  GamePlayer,
  ICsvPlayerMatchCp,
  ICsvTeamMatch,
  ImporterFile,
  logger,
  SubEventCompetition
} from '@badvlasim/shared';
import moment from 'moment';
import { Transaction } from 'sequelize/types';
import { Mdb } from '../../convert/mdb';
import { TpPlayer } from '../../models';
import { Importer } from '../importer';

export class CompetitionCpImporter extends Importer {
  constructor(mdb: Mdb, transaction: Transaction) {
    super(
      mdb,
      EventType.COMPETITION,
      EventImportType.COMPETITION_CP,
      transaction,
      EventCompetition,
      SubEventCompetition,
      DrawCompetition
    );
  }

  async addImporterfile(fileLocation: string) {
    const file = await super.addImporterfile(fileLocation);
    file.subEvents = await super.addImportedSubEvents(file, this.getLeague(file));

    return file;
  }

  protected async extractImporterFile() {
    return super.extractImporterFile();
  }

  protected async createGames(
    draws: DrawCompetition[],
    players: TpPlayer[],
    courts: Map<string, Court>
  ) {
    const csvPlayerMatches = await csvToArray<ICsvPlayerMatchCp[]>(
      await this.mdb.toCsv('PlayerMatch')
    );
    const csvTeamMatches = await csvToArray<ICsvTeamMatch[]>(await this.mdb.toCsv('teammatch'));
    const validGames = csvTeamMatches.filter(
      t => (parseInt(t.points1, 10) || 0 + parseInt(t.points2, 10) || 0) === 0
    );
    if (validGames.length === 0) {
      // No games played
      return;
    }

    const csvGames = [];
    for await (const csvPlayerMatch of csvPlayerMatches) {
      const csvTeamMatch = csvTeamMatches.find(tm => tm.id === csvPlayerMatch.teammatch);
      const draw = draws.find(s => s.internalId === parseInt(csvTeamMatch.draw, 10));
      const plannedDate = moment(csvTeamMatch.plandate);

      const encountComp = {
        date: plannedDate,
        drawId: draw.id
      };
      const [dbEncounter] = await EncounterCompetition.findCreateFind({
        where: encountComp,
        defaults: encountComp
      });

      csvGames.push(
        await this._gameFromCsv(
          dbEncounter,
          players,
          csvPlayerMatch,
          courts,
          plannedDate.isValid() ? plannedDate.toDate() : null
        )
      );
    }
    if (csvGames.length > 0) {
      await super.addGamesCsv(csvGames);
    }
  }

  private async _gameFromCsv(
    encounter: EncounterCompetition,
    players: TpPlayer[],
    csvPlayerMatch: ICsvPlayerMatchCp,
    courts: Map<string, Court>,
    plannedAt: Date
  ) {
    if (encounter?.id == null) {
      logger.warn('No draw found', csvPlayerMatch);
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

    const momentDate = moment(csvPlayerMatch.endtime);
    const playedAt = momentDate.isValid() ? momentDate.toDate() : plannedAt;
  
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
      linkId: encounter.id,
      linkType: 'competition',
      courtId: court?.id
    });

    return { game: data.toJSON(), gamePlayers };
  }

  protected async createEvent(importerFile: ImporterFile, transaction: Transaction) {
    return new EventCompetition({
      name: importerFile.name,
      uniCode: importerFile.uniCode,
      startYear: importerFile.firstDay.getFullYear()
    }).save({ transaction });
  }
}
