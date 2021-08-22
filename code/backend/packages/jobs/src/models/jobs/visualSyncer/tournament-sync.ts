import { parse } from 'fast-xml-parser';
import got from 'got';
import moment, { Moment } from 'moment';
import { Op, Transaction } from 'sequelize';
import {
  correctWrongPlayers,
  DrawTournament,
  DrawType,
  EventTournament,
  Game,
  GamePlayer,
  GameType,
  logger,
  Player,
  Processor,
  ProcessStep,
  SubEventTournament,
  SubEventType,
  XmlDrawTypeID,
  XmlEventName,
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
        let existed = true;

        if (!event) {
          existed = false;
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
            visualCode: tournamentDetail.Code,
            dates: dates.map(r => r.toISOString()).join(','),
            tournamentNumber: tournamentDetail.Number
          }).save({ transaction: args.transaction });
        } else {
          // Later we will change the search function to use the tournament code
          if (event.visualCode === null) {
            event.visualCode = args.xmlTournament.Code;
            event.save({ transaction: args.transaction });
          }
        }
        return {
          // stop: existed,
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
      const dbSubEvents: { subEvent: SubEventTournament; internalId: string }[] = [];
      // Add sub events
      for (const xmlEvent of xmlSubEvents) {
        if (!xmlEvent) {
          continue;
        }
        let dbSubEvent = subEvents.find(r => r.visualCode === `${xmlEvent.Code}`);

        if (!dbSubEvent) {
          dbSubEvent = await new SubEventTournament({
            name: xmlEvent.Name,
            visualCode: xmlEvent.Code,
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
      const removedSubEvents = subEvents.filter(
        i => !dbSubEvents.map(r => r.subEvent.id).includes(i.id)
      );
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
          const dbXmlDraws: DrawTournament[] = [];
          for (const xmlDraw of xmlDraws) {
            if (!xmlDraw) {
              continue;
            }
            let dbDraw = draws.find(r => r.visualCode === `${xmlDraw.Code}`);

            if (!dbDraw) {
              dbDraw = await new DrawTournament({
                subeventId: subEvent.id,
                visualCode: xmlDraw.Code,
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
            dbXmlDraws.push(dbDraw);
          }

          // Remove draw that are not in the xml
          const removedDraws = draws.filter(i => !dbXmlDraws.map(r => r.id).includes(i.id));
          for (const removed of removedDraws) {
            removed.destroy({ transaction: args.transaction });
          }
        }

        return dbDraws;
      }
    );
  }

  protected addPlayers(): ProcessStep<Map<string, Player>> {
    return new ProcessStep(
      this.STEP_PLAYER,
      async (args: { transaction: Transaction; tourneyKey: string }) => {
        const mapPlayers = new Map<string, Player>();
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

        const xmlPlayers = (Array.isArray(bodyPlayer.Player)
          ? bodyPlayer.Player
          : [bodyPlayer.Player]
        ).map(xmlPlayer => {
          if (!xmlPlayer) {
            return null;
          }

          return {
            player: correctWrongPlayers({
              memberId: `${xmlPlayer?.MemberID}`,
              firstName: xmlPlayer.Firstname,
              lastName: xmlPlayer.Lastname,
              gender:
                xmlPlayer.GenderID === XmlGenderID.Boy || xmlPlayer.GenderID === XmlGenderID.Male
                  ? 'M'
                  : 'F'
            }),
            xmlMemberId: xmlPlayer?.MemberID
          };
        });

        const ids = xmlPlayers.map(p => `${p?.player.memberId}`);

        const players = await Player.findAll({
          where: {
            memberId: {
              [Op.in]: ids
            }
          },
          transaction: args.transaction
        });

        for (const xmlPlayer of xmlPlayers) {
          let foundPlayer = players.find(r => r.memberId === `${xmlPlayer?.player?.memberId}`);

          if (!foundPlayer && xmlPlayer?.player?.memberId != null) {
            foundPlayer = await new Player(xmlPlayer?.player).save({
              transaction: args.transaction
            });
          }
          mapPlayers.set(`${xmlPlayer?.xmlMemberId}`, foundPlayer);
        }
        return mapPlayers;
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
        const players: Map<string, Player> = this.processor.getData(this.STEP_PLAYER);
        const updatedGames = [];
        const updatedgamePlayers = [];

        for (const { draw, internalId } of draws) {
          const dbXmlGames: Game[] = [];
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

          for (const xmlMatch of xmlMatches) {
            if (!xmlMatch) {
              continue;
            }
            let game = games.find(r => r.visualCode === `${xmlMatch.Code}`);

            if (!game) {
              game = new Game({
                playedAt: moment(xmlMatch.MatchTime).toDate(),
                winner: xmlMatch.Winner,
                gameType: subEvent.gameType,
                visualCode: xmlMatch.Code,
                linkId: draw.id,
                linkType: 'tournament'
              });

              updatedgamePlayers.push(...this._createGamePlayers(xmlMatch, game, players));
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

            updatedGames.push(game.toJSON());
            dbXmlGames.push(game);
          }

          // Remove draw that are not in the xml
          const removedGames = games.filter(i => !dbXmlGames.map(r => r.id).includes(i.id));
          for (const removed of removedGames) {
            removed.destroy({ transaction: args.transaction });
          }
        }

        logger.debug(`Creating ${updatedGames.length} games`);

        await Game.bulkCreate(updatedGames, {
          transaction: args.transaction,
          updateOnDuplicate: [
            'winner',
            'set1Team1',
            'set1Team2',
            'set2Team1',
            'set2Team2',
            'set3Team1',
            'set3Team2'
          ]
        });

        await GamePlayer.bulkCreate(updatedgamePlayers, {
          transaction: args.transaction
        });
      }
    );
  }

  private _createGamePlayers(xmlGame: XmlMatch, game: Game, players: Map<string, Player>) {
    const gamePlayers = [];

    const t1p1 = players.get(`${xmlGame?.Team1?.Player1?.MemberID}`);
    const t1p2 = players.get(`${xmlGame?.Team1?.Player2?.MemberID}`);
    const t2p1 = players.get(`${xmlGame?.Team2?.Player1?.MemberID}`);
    const t2p2 = players.get(`${xmlGame?.Team2?.Player2?.MemberID}`);

    if (t1p1 && xmlGame?.Team1?.Player1?.MemberID != null) {
      gamePlayers.push(
        new GamePlayer({
          gameId: game.id,
          playerId: t1p1.id,
          team: 1,
          player: 1
        }).toJSON()
      );
    }

    if (t1p2 && xmlGame?.Team1?.Player2?.MemberID != null && t1p2?.id !== t1p1?.id) {
      gamePlayers.push(
        new GamePlayer({
          gameId: game.id,
          playerId: t1p2.id,
          team: 1,
          player: 2
        }).toJSON()
      );
    }

    if (t2p1 && xmlGame?.Team2?.Player1?.MemberID != null) {
      gamePlayers.push(
        new GamePlayer({
          gameId: game.id,
          playerId: t2p1.id,
          team: 2,
          player: 1
        }).toJSON()
      );
    }

    if (t2p2 && xmlGame?.Team2?.Player2?.MemberID != null && t2p2?.id !== t2p1?.id) {
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
