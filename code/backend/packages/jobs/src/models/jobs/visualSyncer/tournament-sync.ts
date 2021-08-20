import { parse } from 'fast-xml-parser';
import got from 'got';
import moment, { Moment } from 'moment';
import { Op, Transaction } from 'sequelize';
import {
  DrawTournament,
  DrawType,
  EventTournament,
  Game,
  GamePlayer,
  GameType,
  Player,
  Processor,
  ProcessStep,
  SubEventTournament,
  SubEventType,
  XmlDrawTypeID,
  XmlGameTypeID,
  XmlGenderID,
  XmlMatch,
  XmlResult,
  XmlTournament
} from '@badvlasim/shared';

export class TournamentSyncer {
  public processor: Processor;

  readonly STEP_EVENT = 'event';
  readonly STEP_SUBEVENT = 'subevent';
  readonly STEP_DRAW = 'draw';
  readonly STEP_PLAYER = 'player';
  readonly STEP_GAME = 'game';

  constructor() {
    this.processor = new Processor();

    this.processor.addStep(this.addEvent());
    this.processor.addStep(this.addSubEvents());
    this.processor.addStep(this.addDraws());
    this.processor.addStep(this.addPlayers());
    this.processor.addStep(this.addGames());
  }

  process(args: { transaction: Transaction; xmlTournament: XmlTournament }) {
    return this.processor.process({ ...args, tourneyKey: args.xmlTournament.Code });
  }

  protected addEvent(): ProcessStep<{
    event: EventTournament;
    internalId: string;
  }> {
    return new ProcessStep(
      this.STEP_EVENT,
      async (args: { xmlTournament: XmlTournament; transaction: Transaction }) => {
        let event = await EventTournament.findOne({
          where: { name: args.xmlTournament.Name },
          transaction: args.transaction
        });

        if (!event) {
          const dates: Moment[] = [];
          for (
            let date = moment(args.xmlTournament.StartDate);
            date.diff(args.xmlTournament.EndDate, 'days') <= 0;
            date.add(1, 'days')
          ) {
            dates.push(date.clone());
          }

          const resultTournament = await got.get(
            `${process.env.VR_API}/${args.xmlTournament.Code}`,
            {
              username: `${process.env.VR_API_USER}`,
              password: `${process.env.VR_API_PASS}`,
              headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/xml'
              }
            }
          );
          const bodyTournament = parse(resultTournament.body, {
            attributeNamePrefix: '',
            ignoreAttributes: false,
            parseAttributeValue: true
          }).Result as XmlResult;
          const tournamentDetail = bodyTournament.Tournament as XmlTournament;
          event = await new EventTournament({
            name: tournamentDetail.Name,
            firstDay: tournamentDetail.StartDate,
            dates: dates.map(r => r.toISOString()).join(','),
            tournamentNumber: tournamentDetail.Number
          }).save({ transaction: args.transaction });
        }
        return {
          event,
          internalId: args.xmlTournament.Code
        };
      }
    );
  }

  protected addSubEvents(): ProcessStep<{ subEvent: SubEventTournament; internalId: number }[]> {
    return new ProcessStep(this.STEP_SUBEVENT, async (args: { transaction: Transaction }) => {
      // get previous step data
      const test: {
        event: EventTournament;
        internalId: string;
      } = this.processor.getData(this.STEP_EVENT);

      const { event, internalId } = test;

      if (!event) {
        throw new Error('No Event');
      }

      const subEvents = await event.getSubEvents({ transaction: args.transaction });
      const resultEvent = await got.get(`${process.env.VR_API}/${internalId}/Event`, {
        username: `${process.env.VR_API_USER}`,
        password: `${process.env.VR_API_PASS}`,
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'Content-Type': 'application/xml'
        }
      });

      const bodyEvent = parse(resultEvent.body, {
        attributeNamePrefix: '',
        ignoreAttributes: false,
        parseAttributeValue: true
      }).Result as XmlResult;

      const xmlSubEvents = Array.isArray(bodyEvent.TournamentEvent)
        ? bodyEvent.TournamentEvent
        : [bodyEvent.TournamentEvent];
      const dbSubEvents = [];

      // Add sub events
      for (const xmlEvent of xmlSubEvents) {
        if (!xmlEvent) {
          continue;
        }
        let dbSubEvent = subEvents.find(r => r.name === xmlEvent.Name);

        if (!dbSubEvent) {
          dbSubEvent = await new SubEventTournament({
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
          }).save({ transaction: args.transaction });
        }

        dbSubEvents.push({ subEvent: dbSubEvent, internalId: xmlEvent.Code });
      }

      // Remove subEvents that are not in the xml
      const removedSubEvents = subEvents.filter(i => !dbSubEvents.includes(i.id));
      for (const removed of removedSubEvents) {
        removed.destroy({ transaction: args.transaction });
      }

      return dbSubEvents;
    });
  }

  protected addDraws(): ProcessStep<{ draw: DrawTournament; internalId: number }[]> {
    return new ProcessStep(
      this.STEP_DRAW,
      async (args: { transaction: Transaction; tourneyKey: string }) => {
        // get previous step data
        const subEvents: {
          subEvent: SubEventTournament;
          internalId: number;
        }[] = this.processor.getData(this.STEP_SUBEVENT);

        const dbDraws = [];
        for (const { subEvent, internalId } of subEvents) {
          let dbDraw: DrawTournament = null;
          const draws = await subEvent.getDraws({ transaction: args.transaction });

          const resultDraw = await got.get(
            `${process.env.VR_API}/${args.tourneyKey}/Event/${internalId}/Draw`,
            {
              username: `${process.env.VR_API_USER}`,
              password: `${process.env.VR_API_PASS}`,
              headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/xml'
              }
            }
          );
          const bodyDraw = parse(resultDraw.body, {
            attributeNamePrefix: '',
            ignoreAttributes: false,
            parseAttributeValue: true
          }).Result as XmlResult;

          const xmlDraws = Array.isArray(bodyDraw.TournamentDraw)
            ? bodyDraw.TournamentDraw
            : [bodyDraw.TournamentDraw];

          for (const xmlDraw of xmlDraws) {
            if (!xmlDraw) {
              continue;
            }
            const prevSubEvent = draws.find(r => r.name === xmlDraw.Name);

            if (!prevSubEvent) {
              dbDraw = await new DrawTournament({
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
              }).save({ transaction: args.transaction });
            }
            dbDraws.push({ draw: dbDraw, internalId: xmlDraw.Code });
          }
        }
        return dbDraws;
      }
    );
  }

  protected addPlayers(): ProcessStep<Player[]> {
    return new ProcessStep(
      this.STEP_PLAYER,
      async (args: { transaction: Transaction; tourneyKey: string }) => {
        const dbPlayers = [];

        const resultPlayer = await got.get(`${process.env.VR_API}/${args.tourneyKey}/Player`, {
          username: `${process.env.VR_API_USER}`,
          password: `${process.env.VR_API_PASS}`,
          headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Type': 'application/xml'
          }
        });
        const bodyPlayer = parse(resultPlayer.body, {
          attributeNamePrefix: '',
          ignoreAttributes: false,
          parseAttributeValue: true
        }).Result as XmlResult;

        const xmlPlayers = Array.isArray(bodyPlayer.Player)
          ? bodyPlayer.Player
          : [bodyPlayer.Player];

        const ids = xmlPlayers.map(p => `${p?.MemberID}`);

        const players = await Player.findAll({
          where: {
            memberId: {
              [Op.in]: ids
            }
          },
          transaction: args.transaction
        });

        for (const xmlPlayer of xmlPlayers) {
          let foundPlayer = players.find(r => r.memberId === `${xmlPlayer?.MemberID}`);

          if (!foundPlayer && xmlPlayer?.MemberID != null) {
            foundPlayer = await new Player({
              memberId: `${xmlPlayer?.MemberID}`,
              firstName: xmlPlayer.Firstname,
              lastName: xmlPlayer.Lastname,
              gender:
                xmlPlayer.GenderID === XmlGenderID.Boy || xmlPlayer.GenderID === XmlGenderID.Male
                  ? 'M'
                  : 'F'
            }).save({ transaction: args.transaction });
          }
          dbPlayers.push(foundPlayer);
        }
        return dbPlayers;
      }
    );
  }

  protected addGames(): ProcessStep<void> {
    return new ProcessStep(
      this.STEP_GAME,
      async (args: { transaction: Transaction; tourneyKey: string }) => {
        const draws: {
          draw: DrawTournament;
          internalId: number;
        }[] = this.processor.getData(this.STEP_DRAW);
        const subevents: {
          subEvent: SubEventTournament;
          internalId: number;
        }[] = this.processor.getData(this.STEP_SUBEVENT);
        const players: Player[] = this.processor.getData(this.STEP_PLAYER);

        for (const { draw, internalId } of draws) {
          const games = await draw.getGames({ transaction: args.transaction, include: [Player] });
          const subEvent = subevents.find(sub => draw.subeventId === sub.subEvent.id).subEvent;
          const resultDraw = await got.get(
            `${process.env.VR_API}/${args.tourneyKey}/Draw/${internalId}/Match`,
            {
              username: `${process.env.VR_API_USER}`,
              password: `${process.env.VR_API_PASS}`,
              headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/xml'
              }
            }
          );
          const bodyDraw = parse(resultDraw.body, {
            attributeNamePrefix: '',
            ignoreAttributes: false,
            parseAttributeValue: true
          }).Result as XmlResult;

          const xmlMatches = Array.isArray(bodyDraw.Match) ? bodyDraw.Match : [bodyDraw.Match];

          // We have no way  of knowing if the games are correct, so destroy
          for (const oldGame of games.filter(r => r.visualCode === null)) {
            await oldGame.destroy({ transaction: args.transaction });
          }

          for (const xmlMatch of xmlMatches) {
            if (!xmlMatch) {
              continue;
            }
            let game = games.find(
              r => r.round === xmlMatch.RoundName && r.visualCode === parseInt(xmlMatch.Code, 10)
            );

            if (!game) {
              game = new Game({
                playedAt: moment(xmlMatch.MatchTime).toDate(),
                winner: xmlMatch.Winner,
                gameType: subEvent.gameType,
                linkId: draw.id,
                linkType: 'tournament'
              });
              await game.save({ transaction: args.transaction });

              await GamePlayer.bulkCreate(this._createGamePlayers(xmlMatch, game, players), {
                transaction: args.transaction
              });
            }

            // Set winner
            game.winner = xmlMatch.Winner;

            // Set sets
            game.set1Team1 = xmlMatch?.Sets?.Set[0]?.Team1;
            game.set1Team2 = xmlMatch?.Sets?.Set[0]?.Team2;

            game.set2Team1 = xmlMatch?.Sets?.Set[1]?.Team1;
            game.set2Team2 = xmlMatch?.Sets?.Set[1]?.Team2;

            game.set3Team1 = xmlMatch?.Sets?.Set[2]?.Team1;
            game.set3Team2 = xmlMatch?.Sets?.Set[2]?.Team2;

            await game.save({ transaction: args.transaction });
          }
        }
      }
    );
  }

  private _createGamePlayers(xmlGame: XmlMatch, game: Game, players: Player[]) {
    const gamePlayers = [];
    if ((players?.length ?? 0) === 0) {
      return gamePlayers;
    }

    const t1p1 = players.find(r => r.memberId === xmlGame?.Team1?.Player1?.MemberID);
    const t1p2 = players.find(r => r.memberId === xmlGame?.Team1?.Player2?.MemberID);
    const t2p1 = players.find(r => r.memberId === xmlGame?.Team2?.Player1?.MemberID);
    const t2p2 = players.find(r => r.memberId === xmlGame?.Team2?.Player2?.MemberID);

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

    return gamePlayers;
  }
}
