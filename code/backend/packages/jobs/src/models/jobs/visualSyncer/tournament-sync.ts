import { parse } from 'fast-xml-parser';
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
import { VisualService } from '../../../utils/visualService';

export class TournamentSyncer {
  public processor: Processor;
  public visualService: VisualService;

  readonly STEP_EVENT = 'event';
  readonly STEP_SUBEVENT = 'subevent';
  readonly STEP_DRAW = 'draw';
  readonly STEP_PLAYER = 'player';
  readonly STEP_GAME = 'game';

  constructor() {
    this.processor = new Processor();
    this.visualService = new VisualService();

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

          const visualTournament = await this.visualService.getTournament(args.xmlTournament.Code);

          event = await new EventTournament({
            name: visualTournament.Name,
            firstDay: visualTournament.StartDate,
            visualCode: visualTournament.Code,
            dates: dates.map(r => r.toISOString()).join(','),
            tournamentNumber: visualTournament.Number
          }).save({ transaction: args.transaction });
        } else {
          // Later we will change the search function to use the tournament code
          if (event.visualCode === null) {
            event.visualCode = args.xmlTournament.Code;
            await event.save({ transaction: args.transaction });
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
      const {
        event,
        internalId
      }: {
        event: EventTournament;
        internalId: string;
      } = this.processor.getData(this.STEP_EVENT);

      if (!event) {
        throw new Error('No Event');
      }

      const subEvents = await event.getSubEvents({ transaction: args.transaction });
      const visualEvents = await this.visualService.getEvents(internalId);
      const dbSubEvents: { subEvent: SubEventTournament; internalId: string }[] = [];
      // Add sub events
      for (const xmlEvent of visualEvents) {
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
      const removedSubEvents = subEvents.filter(s => s.visualCode == null);
      for (const removed of removedSubEvents) {
        const gameIds = (
          await Game.findAll({
            attributes: ['id'],
            include: [
              {
                attributes: [],
                model: DrawTournament,
                required: true,
                where: {
                  subeventId: removed.id
                }
              }
            ],
            transaction: args.transaction
          })
        )
          ?.map(g => g.id)
          ?.filter(g => !!g);

        if (gameIds && gameIds.length > 0) {
          await Game.destroy({
            where: {
              id: {
                [Op.in]: gameIds
              }
            },
            transaction: args.transaction
          });
        }
        await removed.destroy({ transaction: args.transaction });
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
        const processDraws = async ({ subEvent, internalId }) => {
          const draws = await subEvent.getDraws({ transaction: args.transaction });
          const visualDraws = await this.visualService.getDraws(args.tourneyKey, internalId);

          const dbXmlDraws: DrawTournament[] = [];
          for (const xmlDraw of visualDraws) {
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
          const removedDraws = draws.filter(d => d.visualCode == null);
          for (const removed of removedDraws) {
            const gameIds = (
              await removed?.getGames({ attributes: ['id'], transaction: args.transaction })
            )
              ?.map(g => g?.id)
              ?.filter(g => !!g);
            if (gameIds && gameIds.length > 0) {
              await Game.destroy({
                where: {
                  id: {
                    [Op.in]: gameIds
                  }
                },
                transaction: args.transaction
              });
            }
            await removed.destroy({ transaction: args.transaction });
          }
        
        };

        await Promise.all(subEvents.map(e => processDraws(e)));
        return dbDraws;
      }
    );
  }

  protected addPlayers(): ProcessStep<Map<string, Player>> {
    return new ProcessStep(
      this.STEP_PLAYER,
      async (args: { transaction: Transaction; tourneyKey: string }) => {
        const mapPlayers = new Map<string, Player>();
        const visualPlayers = (await this.visualService.getPlayers(args.tourneyKey)).map(
          xmlPlayer => {
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
          }
        );

        const ids = visualPlayers.map(p => `${p?.player.memberId}`);

        const players = await Player.findAll({
          where: {
            memberId: {
              [Op.in]: ids
            }
          },
          transaction: args.transaction
        });

        for (const xmlPlayer of visualPlayers) {
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
        const event: {
          event: EventTournament;
          internalId: string;
        } = this.processor.getData(this.STEP_EVENT);
        const players: Map<string, Player> = this.processor.getData(this.STEP_PLAYER);
        const updatedGames = [];
        const updatedgamePlayers = [];

        const processGames = async ({ draw, internalId }) => {
          const dbXmlGames: Game[] = [];
          const games = await draw.getGames({ transaction: args.transaction, include: [Player] });
          const subEvent = subevents.find(sub => draw.subeventId === sub.subEvent.id).subEvent;

          const visualMatch = (
            await this.visualService.getMatch(args.tourneyKey, internalId)
          ).filter(m => !m || m?.Winner !== 0);

          for (const xmlMatch of visualMatch) {
            if (!xmlMatch) {
              continue;
            }
            let game = games.find(r => r.visualCode === `${xmlMatch.Code}`);
            const playedAt =
              xmlMatch.MatchTime != null
                ? moment(xmlMatch.MatchTime).toDate()
                : event.event.firstDay;

            if (!game) {
              game = new Game({
                winner: xmlMatch.Winner,
                gameType: subEvent.gameType,
                visualCode: xmlMatch.Code,
                linkId: draw.id,
                linkType: 'tournament'
              });

              updatedgamePlayers.push(...this._createGamePlayers(xmlMatch, game, players));
            }

            // Set dates (if changed)
            game.playedAt = playedAt;

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
          const removedGames = games.filter(g => g.visualCode == null);
          for (const removed of removedGames) {
            await removed.destroy({ transaction: args.transaction });
          }
        };

        await Promise.all(draws.map(e => processGames(e)));

        logger.debug(`Creating ${updatedGames.length} games`);

        await Game.bulkCreate(updatedGames, {
          transaction: args.transaction,
          updateOnDuplicate: [
            'winner',
            'playedAt',
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
