import got from 'got';
import moment, { Moment } from 'moment';
import {
  Cron,
  DataBaseHandler,
  DrawCompetition,
  DrawTournament,
  DrawType,
  EncounterCompetition,
  EventCompetition,
  EventTournament,
  Game,
  GamePlayer,
  GameType,
  logger,
  Player,
  SubEventCompetition,
  SubEventTournament,
  SubEventType,
  Team,
  XmlDrawTypeID,
  XmlGameTypeID,
  XmlGenderID,
  XmlMatch,
  XmlMatchTypeID,
  XmlPlayer,
  XmlResult,
  XmlTeamMatch,
  XmlTournament,
  XmlTournamentDraw,
  XmlTournamentEvent,
  XmlTournamentstatus,
  XmlTournamentTypeID
} from '@badvlasim/shared';
import { CronJob } from '../cronJob';
import { parse } from 'fast-xml-parser';
import { Transaction } from 'sequelize/types';

export class SyncVisual extends CronJob {
  private _pageSize = 100;
  private _transaction: Transaction;

  constructor(cron: Cron) {
    super(cron);
    this.meta = JSON.parse(cron.meta) as any;
  }

  async run(): Promise<void> {

    const newDate = moment('2020-08-13');
    try {
      const newEvents = await this._getChangeEvents(newDate);

      for (const tournament of newEvents) {
        this._transaction = await DataBaseHandler.sequelizeInstance.transaction();
        logger.debug(`Processing ${tournament.Name}`);

        if (
          tournament.TypeID === XmlTournamentTypeID.OnlineLeague ||
          tournament.TypeID === XmlTournamentTypeID.TeamTournament
        ) {
          await this._processCompetition(tournament);
        } else {
          await this._getChangeTournament(tournament);
        }
        await this._transaction.commit();
      }

      logger.debug(`${newEvents.length} tournaments changed`);
    } catch (e) {
      logger.error('Rollback', e);
      await this._transaction.rollback();
    }
  }

  private async _getChangeEvents(date: Moment, page: number = 0) {
    const url = `${process.env.VR_API}?list=1&refdate=${date.format('YYYY-MM-DD')}&pagesize=${
      this._pageSize
    }&page=${page}`;
    const result = await got.get(url, {
      username: `${process.env.VR_API_USER}`,
      password: `${process.env.VR_API_PASS}`,
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/xml'
      }
    });

    if (result.statusCode !== 200) {
      throw new Error(`Cannot get changed tournaments: ${result.statusCode}`);
    }

    const body = parse(result.body, {
      attributeNamePrefix: '',
      ignoreAttributes: false,
      parseAttributeValue: true
    }).Result as XmlResult;
    const tournaments = Array.isArray(body.Tournament) ? [...body.Tournament] : [body.Tournament];

    if (tournaments.length === this._pageSize) {
      tournaments.concat(await this._getChangeEvents(date, page + 1));
    }

    return tournaments;
  }

  private async _getChangeTournament(xmlTournament: XmlTournament) {
    let event = await EventTournament.findOne({
      where: { name: xmlTournament.Name },
      transaction: this._transaction
    });
    const dates: Moment[] = [];
    for (
      let date = moment(xmlTournament.StartDate);
      date.diff(xmlTournament.EndDate, 'days') <= 0;
      date.add(1, 'days')
    ) {
      dates.push(date.clone());
    }

    if (!event) {
      event = await this._createTournament(xmlTournament, dates);
    }

    if (!event) {
      logger.debug(`No event created`);
    } else if (moment().diff(xmlTournament.EndDate) < 0) {
      logger.debug(`EventTournament is in the future`);
    } else {
      for (const date of dates) {
        await this._getMatchesOfDayTournament(event, xmlTournament.Code, date);
      }
    }
  }

  private async _createTournament(tournament: XmlTournament, dates: moment.Moment[]) {
    const resultTournament = await got.get(`${process.env.VR_API}/${tournament.Code}`, {
      username: `${process.env.VR_API_USER}`,
      password: `${process.env.VR_API_PASS}`,
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/xml'
      }
    });
    const bodyTournament = parse(resultTournament.body, {
      attributeNamePrefix: '',
      ignoreAttributes: false,
      parseAttributeValue: true
    }).Result as XmlResult;
    const tournamentDetail = bodyTournament.Tournament as XmlTournament;

    if (
      !(
        tournamentDetail.TournamentStatus === XmlTournamentstatus.TournamentFinished ||
        tournamentDetail.TournamentStatus === XmlTournamentstatus.LeagueFinished
      )
    ) {
      // Tournament is not finished
      return null;
    }

    logger.debug(`EventTournament ${tournamentDetail.Name} not found, creating`);
    const event = await new EventTournament({
      name: tournamentDetail.Name,
      firstDay: tournamentDetail.StartDate,
      dates: dates.map(r => r.toISOString()).join(','),
      tournamentNumber: tournamentDetail.Number
    }).save({ transaction: this._transaction });

    const resultEvents = await got.get(`${process.env.VR_API}/${tournament.Code}/Event`, {
      username: `${process.env.VR_API_USER}`,
      password: `${process.env.VR_API_PASS}`,
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/xml'
      }
    });
    const bodyEvents = parse(resultEvents.body, {
      attributeNamePrefix: '',
      ignoreAttributes: false,
      parseAttributeValue: true
    }).Result as XmlResult;

    const resultDraws = await got.get(`${process.env.VR_API}/${tournament.Code}/Draw`, {
      username: `${process.env.VR_API_USER}`,
      password: `${process.env.VR_API_PASS}`,
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/xml'
      }
    });
    const bodyDraws = parse(resultDraws.body, {
      attributeNamePrefix: '',
      ignoreAttributes: false,
      parseAttributeValue: true
    }).Result as XmlResult;

    const subEventMap = new Map<string, SubEventTournament>();
    const xmlEvents = Array.isArray(bodyEvents.TournamentEvent)
      ? bodyEvents.TournamentEvent
      : [bodyEvents.TournamentEvent];

    for (const xmlEvent of xmlEvents) {
      const subEvent = await new SubEventTournament({
        name: xmlEvent.Name,
        eventType:
          xmlEvent.GenderID === XmlGenderID.Mixed
            ? SubEventType.MX
            : xmlEvent.GenderID === XmlGenderID.Male || xmlEvent.GenderID === XmlGenderID.Boy
            ? SubEventType.F
            : SubEventType.M,
        gameType:
          xmlEvent.GameTypeID === XmlGameTypeID.Mixed
            ? GameType.MX
            : xmlEvent.GameTypeID === XmlGameTypeID.Doubles
            ? GameType.D
            : GameType.S,
        eventId: event.id,
        level: xmlEvent.LevelID
      }).save({ transaction: this._transaction });
      subEventMap.set(xmlEvent.Code, subEvent);
    }

    const draws = Array.isArray(bodyDraws.TournamentDraw)
      ? bodyDraws.TournamentDraw
      : [bodyDraws.TournamentDraw];

    for (const xmlDraw of draws) {
      const subEvent = subEventMap.get(xmlDraw.EventCode);
      const draw = await new DrawTournament({
        subeventId: subEvent.id,
        name: xmlDraw.Name,
        size: xmlDraw.Size,
        type:
          xmlDraw.TypeID === XmlDrawTypeID.Elimination
            ? DrawType.KO
            : xmlDraw.TypeID === XmlDrawTypeID.RoundRobin ||
              xmlDraw.TypeID === XmlDrawTypeID.FullRoundRobin
            ? DrawType.POULE
            : DrawType.QUALIFICATION
      }).save({ transaction: this._transaction });
    }

    return event;
  }

  private async _getMatchesOfDayTournament(
    event: EventTournament,
    tourneyCode: string,
    date: Moment
  ) {
    const result = await got.get(
      `${process.env.VR_API}/${tourneyCode}/Match/${date.format('YYYYMMDD')}`,
      {
        username: `${process.env.VR_API_USER}`,
        password: `${process.env.VR_API_PASS}`,
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'Content-Type': 'application/xml'
        }
      }
    );

    if (result.statusCode !== 200) {
      throw new Error(`Cannot get changed tournaments: ${result.statusCode}`);
    }

    const body = parse(result.body, {
      attributeNamePrefix: '',
      ignoreAttributes: false,
      parseAttributeValue: true
    }).Result as XmlResult;
    const matches = body.Match;
    if ((matches?.length ?? 0) > 0) {
      logger.debug(`Found ${matches?.length} games`);
      await this._addGamesTournament(event, matches);
    }
  }

  private async _addGamesTournament(event: EventTournament, xmlGames: XmlMatch[]) {
    const subevents = await event.getSubEvents({
      include: [
        {
          model: DrawTournament,
          include: [{ model: Game, include: [{ model: Player }] }]
        }
      ],
      transaction: this._transaction
    });

    for (const xmlGame of xmlGames) {
      const subEvent = subevents.find(r => r.name === xmlGame.EventName);
      const draw = subEvent.draws.find(r => r.name === xmlGame.DrawName);

      let game = draw?.games?.find(
        r =>
          moment(xmlGame.MatchTime).isSame(r.playedAt) &&
          r.players.find(p => (p.memberId = `${xmlGame?.Team1?.Player1?.MemberID}`)) &&
          r.players.find(p => (p.memberId = `${xmlGame?.Team1?.Player1?.MemberID}`))
      );

      if (!game) {
        game = await new Game({
          playedAt: moment(xmlGame.MatchTime).toDate(),
          winner: xmlGame.Winner,
          gameType: subEvent.gameType,
          linkId: draw.id,
          linkType: 'tournament'
        }).save({ transaction: this._transaction });

        await this._createGamePlayers(xmlGame, game);
      }

      // Set winner
      game.winner = xmlGame.Winner;

      // Set sets
      game.set1Team1 = xmlGame?.Sets?.Set[0]?.Team1;
      game.set1Team2 = xmlGame?.Sets?.Set[0]?.Team2;

      game.set2Team1 = xmlGame?.Sets?.Set[1]?.Team1;
      game.set2Team2 = xmlGame?.Sets?.Set[1]?.Team2;

      game.set3Team1 = xmlGame?.Sets?.Set[2]?.Team1;
      game.set3Team2 = xmlGame?.Sets?.Set[2]?.Team2;

      await game.save({ transaction: this._transaction });
    }
  }

  private async _processCompetition(xmlTournament: XmlTournament) {
    let event = await EventCompetition.findOne({ where: { name: xmlTournament.Name } });
    if (!event) {
      event = await this._createCompetition(xmlTournament);
    }

    if (moment().diff(xmlTournament.StartDate) < 0) {
      logger.debug(`Competition ${xmlTournament.Name} hasn't started yet`);
      return;
    }

    const subevents = await event.getSubEvents({
      include: [
        {
          model: DrawCompetition,
          include: [
            {
              model: EncounterCompetition,
              include: [{ model: Game, include: [{ model: Player }] }]
            }
          ]
        }
      ],
      transaction: this._transaction
    });

    for (
      let date = moment(xmlTournament.StartDate);
      date.diff(xmlTournament.EndDate, 'days') <= 0;
      date.add(1, 'days')
    ) {
      await this._getMatchesOfDayCompetition(subevents, xmlTournament.Code, date);
    }
  }

  private async _createCompetition(tournament: XmlTournament) {
    const resultTournament = await got.get(`${process.env.VR_API}/${tournament.Code}`, {
      username: `${process.env.VR_API_USER}`,
      password: `${process.env.VR_API_PASS}`,
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/xml'
      }
    });
    const bodyTournament = parse(resultTournament.body, {
      attributeNamePrefix: '',
      ignoreAttributes: false,
      parseAttributeValue: true
    }).Result as XmlResult;
    const tournamentDetail = bodyTournament.Tournament as XmlTournament;

    logger.debug(`EventCompetition ${tournamentDetail.Name} not found, creating`);
    const event = await new EventCompetition({
      name: tournamentDetail.Name,
      startYear: moment(tournamentDetail.StartDate).year()
    }).save({ transaction: this._transaction });

    const resultEvents = await got.get(`${process.env.VR_API}/${tournament.Code}/Event`, {
      username: `${process.env.VR_API_USER}`,
      password: `${process.env.VR_API_PASS}`,
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/xml'
      }
    });
    const bodyEvents = parse(resultEvents.body, {
      attributeNamePrefix: '',
      ignoreAttributes: false,
      parseAttributeValue: true
    }).Result as XmlResult;

    const resultDraws = await got.get(`${process.env.VR_API}/${tournament.Code}/Draw`, {
      username: `${process.env.VR_API_USER}`,
      password: `${process.env.VR_API_PASS}`,
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/xml'
      }
    });
    const bodyDraws = parse(resultDraws.body, {
      attributeNamePrefix: '',
      ignoreAttributes: false,
      parseAttributeValue: true
    }).Result as XmlResult;

    const subEventMap = new Map<string, SubEventCompetition>();
    const xmlEvents = Array.isArray(bodyEvents.TournamentEvent)
      ? bodyEvents.TournamentEvent
      : [bodyEvents.TournamentEvent];

    for (const xmlEvent of xmlEvents) {
      const subEvent = await new SubEventCompetition({
        name: xmlEvent.Name,
        eventType:
          xmlEvent.GenderID === XmlGenderID.Mixed
            ? SubEventType.MX
            : xmlEvent.GenderID === XmlGenderID.Male || xmlEvent.GenderID === XmlGenderID.Boy
            ? SubEventType.F
            : SubEventType.M,
        eventId: event.id,
        level: xmlEvent.LevelID
      }).save({ transaction: this._transaction });
      subEventMap.set(xmlEvent.Code, subEvent);
    }

    const draws = Array.isArray(bodyDraws.TournamentDraw)
      ? bodyDraws.TournamentDraw
      : [bodyDraws.TournamentDraw];

    for (const xmlDraw of draws) {
      const subEvent = subEventMap.get(xmlDraw.EventCode);
      const draw = await new DrawCompetition({
        subeventId: subEvent.id,
        name: xmlDraw.Name,
        size: xmlDraw.Size
      }).save({ transaction: this._transaction });
    }

    return event;
  }

  private async _getMatchesOfDayCompetition(
    subevents: SubEventCompetition[],
    tourneyCode: string,
    date: Moment
  ) {
    const result = await got.get(
      `${process.env.VR_API}/${tourneyCode}/Match/${date.format('YYYYMMDD')}`,
      {
        username: `${process.env.VR_API_USER}`,
        password: `${process.env.VR_API_PASS}`,
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'Content-Type': 'application/xml'
        }
      }
    );

    if (result.statusCode !== 200) {
      throw new Error(`Cannot get changed tournaments: ${result.statusCode}`);
    }

    const body = parse(result.body, {
      attributeNamePrefix: '',
      ignoreAttributes: false,
      parseAttributeValue: true
    }).Result as XmlResult;
    const matches = body.TeamMatch;

    if ((matches?.length ?? 0) > 0) {
      logger.debug(`Found ${matches?.length} on encounter date: ${date.format('YYYY-MM-DD')}`);

      await this._addTeamMatchCompetition(subevents, tourneyCode, matches);
    }
  }

  private async _addTeamMatchCompetition(
    subevents: SubEventCompetition[],
    tourneyCode: string,
    xmlTeamMatches: XmlTeamMatch[]
  ) {
    for (const xmlTeamMatch of xmlTeamMatches) {
      const subEvent = subevents.find(r => r.name === xmlTeamMatch.EventName);
      const draw = subEvent.draws.find(r => r.name === xmlTeamMatch.DrawName);
      let encounter = draw?.encounters?.find(r => moment(xmlTeamMatch.MatchTime).isSame(r.date));

      if (!encounter) {
        const homeTeam = await Team.findOne({
          where: { name: xmlTeamMatch.Team1.Name },
          transaction: this._transaction
        });
        const awayTeam = await Team.findOne({
          where: { name: xmlTeamMatch.Team2.Name },
          transaction: this._transaction
        });

        encounter = await new EncounterCompetition({
          drawId: draw.id,
          date: moment(xmlTeamMatch.MatchTime).toDate(),
          homeTeamId: homeTeam?.id,
          awayTeamId: awayTeam?.id,
          visualCode: xmlTeamMatch.Code 
        }).save({ transaction: this._transaction });
      }

      const result = await got.get(
        `${process.env.VR_API}/${tourneyCode}/TeamMatch/${xmlTeamMatch.Code}`,
        {
          username: `${process.env.VR_API_USER}`,
          password: `${process.env.VR_API_PASS}`,
          headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Type': 'application/xml'
          }
        }
      );

      if (result.statusCode !== 200) {
        throw new Error(`Cannot get changed tournaments: ${result.statusCode}`);
      }

      const body = parse(result.body, {
        attributeNamePrefix: '',
        ignoreAttributes: false,
        parseAttributeValue: true
      }).Result as XmlResult;
      const matches = body.Match;
      if ((matches?.length ?? 0) > 0) {
        logger.silly(`Found ${matches?.length} games`);
        await this._addGamesCompetition(encounter, matches);
      }
    }
  }

  private async _addGamesCompetition(encounter: EncounterCompetition, xmlGames: XmlMatch[]) {
    for (const xmlGame of xmlGames) {
      let game = encounter.games?.find(
        r =>
          r.players.find(p => (p.memberId = `${xmlGame?.Team1?.Player1?.MemberID}`)) &&
          r.players.find(p => (p.memberId = `${xmlGame?.Team1?.Player1?.MemberID}`))
      );

      if (!game) {
        game = await new Game({
          playedAt: encounter.date,
          gameType: this._getGameType(xmlGame),
          order: xmlGame.MatchOrder,
          linkId: encounter.id,
          linkType: 'competition'
        }).save({ transaction: this._transaction });

        await this._createGamePlayers(xmlGame, game);
      }

      // Set winner
      game.winner = xmlGame.Winner;

      // Set sets
      game.set1Team1 = xmlGame?.Sets?.Set[0]?.Team1;
      game.set1Team2 = xmlGame?.Sets?.Set[0]?.Team2;

      game.set2Team1 = xmlGame?.Sets?.Set[1]?.Team1;
      game.set2Team2 = xmlGame?.Sets?.Set[1]?.Team2;

      game.set3Team1 = xmlGame?.Sets?.Set[2]?.Team1;
      game.set3Team2 = xmlGame?.Sets?.Set[2]?.Team2;

      await game.save({ transaction: this._transaction });
    }
  }

  private async _createGamePlayers(xmlGame: XmlMatch, game: Game) {
    const gamePlayers = [];

    const t1p1 = await this._findOrCreatePlayer(xmlGame?.Team1?.Player1);
    const t1p2 = await this._findOrCreatePlayer(xmlGame?.Team1?.Player2);
    const t2p1 = await this._findOrCreatePlayer(xmlGame?.Team2?.Player1);
    const t2p2 = await this._findOrCreatePlayer(xmlGame?.Team2?.Player2);

    if (t1p1) {
      gamePlayers.push(
        new GamePlayer({
          gameId: game.id,
          playerId: t1p1.id,
          team: 1,
          player: 1
        }).toJSON()
      );
    }

    if (t1p2 && t1p2.id !== t1p1.id) {
      gamePlayers.push(
        new GamePlayer({
          gameId: game.id,
          playerId: t1p2.id,
          team: 1,
          player: 2
        }).toJSON()
      );
    }

    if (t2p1) {
      gamePlayers.push(
        new GamePlayer({
          gameId: game.id,
          playerId: t2p1.id,
          team: 2,
          player: 1
        }).toJSON()
      );
    }

    if (t2p2 && t2p2.id !== t2p1.id) {
      gamePlayers.push(
        new GamePlayer({
          gameId: game.id,
          playerId: t2p2.id,
          team: 2,
          player: 2
        }).toJSON()
      );
    }

    await GamePlayer.bulkCreate(gamePlayers, { transaction: this._transaction });
  }

  private _getGameType(xmlGame: XmlMatch): GameType {
    switch (xmlGame.MatchTypeID) {
      case XmlMatchTypeID.MS:
      case XmlMatchTypeID.WS:
        return GameType.S;

      case XmlMatchTypeID.MD:
      case XmlMatchTypeID.WD:
        return GameType.D;

      case XmlMatchTypeID.XD:
      case XmlMatchTypeID.Double:
        return GameType.MX;

      default:
        throw new Error(`Type not found, ${xmlGame.MatchTypeID}`);
    }
  }

  private async _findOrCreatePlayer(member: XmlPlayer): Promise<Player> {
    if (member?.MemberID) {
      let player = await Player.findOne({
        where: { memberId: `${member.MemberID}` },
        transaction: this._transaction
      });

      if (player) {
        return player;
      } else {
        player = await new Player({
          memberId: `${member.MemberID}`,
          firstName: member.Firstname,
          lastName: member.Lastname,
          gender:
            member.GenderID === XmlGenderID.Boy || member.GenderID === XmlGenderID.Male ? 'M' : 'F'
        }).save({ transaction: this._transaction });
        return player;
      }
    }

    // no player found
    return null;
  }

  meta: SyncVisalMeta;

}

interface SyncVisalMeta {
  name: string;
}
