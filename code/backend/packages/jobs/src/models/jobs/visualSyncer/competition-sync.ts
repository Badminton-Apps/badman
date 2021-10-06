import {
  correctWrongPlayers,
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  LevelType,
  Team,
  Game,
  GamePlayer,
  GameType,
  logger,
  Player,
  Processor,
  ProcessStep,
  SubEventCompetition,
  SubEventType,
  XmlGenderID,
  XmlMatch,
  XmlMatchTypeID,
  XmlResult,
  XmlTournament,
  XmlTeamMatch
} from '@badvlasim/shared';
import { parse } from 'fast-xml-parser';
import axios from 'axios';
import moment, { Moment } from 'moment';
import { Op, Transaction } from 'sequelize';

export class CompetitionSyncer {
  public processor: Processor;

  readonly STEP_EVENT = 'event';
  readonly STEP_SUBEVENT = 'subevent';
  readonly STEP_DRAW = 'draw';
  readonly STEP_ENCOUNTER = 'encounter';
  readonly STEP_PLAYER = 'player';
  readonly STEP_GAME = 'game';

  constructor() {
    this.processor = new Processor();

    this.processor.addStep(this.getEvent());
    this.processor.addStep(this.addSubEvents());
    this.processor.addStep(this.addDraws());
    this.processor.addStep(this.addEncounters());
    this.processor.addStep(this.addPlayers());
    this.processor.addStep(this.addGames());
  }

  process(args: { transaction: Transaction; xmlTournament: XmlTournament }) {
    return this.processor.process({ ...args, tourneyKey: args.xmlTournament.Code });
  }

  protected getEvent(): ProcessStep<{
    event: EventCompetition;
    internalId: string;
  }> {
    return new ProcessStep(
      this.STEP_EVENT,
      async (args: { xmlTournament: XmlTournament; transaction: Transaction }) => {
        logger.debug(`Searching for ${args.xmlTournament.Name}`);
        let event = await EventCompetition.findOne({
          where: { name: `${args.xmlTournament.Name}` },
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

          const resultTournament = await axios.get(
            `${process.env.VR_API}/Tournament/${args.xmlTournament.Code}`,
            {
              withCredentials: true,
              auth: {
                username: `${process.env.VR_API_USER}`,
                password: `${process.env.VR_API_PASS}`
              },
              headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/xml'
              }
            }
          );
          const bodyTournament = parse(resultTournament.data, {
            attributeNamePrefix: '',
            ignoreAttributes: false,
            parseAttributeValue: true
          }).Result as XmlResult;
          const tournamentDetail = bodyTournament.Tournament as XmlTournament;

          logger.debug(`EventCompetition ${tournamentDetail.Name} not found, creating`);
          event = await new EventCompetition({
            name: tournamentDetail.Name,
            visualCode: tournamentDetail.Code,
            startYear: moment(tournamentDetail.StartDate).year()
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
          existed,
          event,
          internalId: args.xmlTournament.Code
        };
      }
    );
  }

  protected addSubEvents(): ProcessStep<{ subEvent: SubEventCompetition; internalId: number }[]> {
    return new ProcessStep(this.STEP_SUBEVENT, async (args: { transaction: Transaction }) => {
      // get previous step data
      const eventData: {
        event: EventCompetition;
        internalId: string;
        existed: boolean;
      } = this.processor.getData(this.STEP_EVENT);

      const { event, internalId } = eventData;

      if (!event) {
        throw new Error('No Event');
      }

      const subEvents = await event.getSubEvents({ transaction: args.transaction });
      const resultEvent = await axios.get(`${process.env.VR_API}/Tournament/${internalId}/Event`, {
        withCredentials: true,
        auth: {
          username: `${process.env.VR_API_USER}`,
          password: `${process.env.VR_API_PASS}`
        },
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'Content-Type': 'application/xml'
        }
      });

      const bodyEvent = parse(resultEvent.data, {
        attributeNamePrefix: '',
        ignoreAttributes: false,
        parseAttributeValue: true
      }).Result as XmlResult;

      const xmlSubEvents = Array.isArray(bodyEvent.TournamentEvent)
        ? bodyEvent.TournamentEvent
        : [bodyEvent.TournamentEvent];
      const dbSubEvents: { subEvent: SubEventCompetition; internalId: string }[] = [];

      // Add sub events
      for (const xmlEvent of xmlSubEvents) {
        if (!xmlEvent) {
          continue;
        }
        let dbSubEvent = subEvents.find(r => r.visualCode === `${xmlEvent.Code}`);

        if (!dbSubEvent) {
          let type =
            xmlEvent.GenderID === XmlGenderID.Mixed
              ? SubEventType.MX
              : xmlEvent.GenderID === XmlGenderID.Male || xmlEvent.GenderID === XmlGenderID.Boy
              ? SubEventType.M
              : SubEventType.F;

          if (event.type === LevelType.NATIONAL) {
            type = SubEventType.MX;
          }

          // Hopefully with this we can link with the correct subEvent so our link isn't lost
          dbSubEvent = subEvents.find(r => r.name === xmlEvent.Name && r.eventType === type);
        }

        if (!dbSubEvent) {
          if (eventData.existed) {
            logger.warn(
              `Event ${xmlEvent.Name} for ${event.name} (gender: ${xmlEvent.GenderID}) not found, might checking it?`
            );
          }

          dbSubEvent = await new SubEventCompetition({
            visualCode: xmlEvent.Code,
            name: xmlEvent.Name,
            eventType:
              xmlEvent.GenderID === XmlGenderID.Mixed
                ? SubEventType.MX
                : xmlEvent.GenderID === XmlGenderID.Male || xmlEvent.GenderID === XmlGenderID.Boy
                ? SubEventType.M
                : SubEventType.F,
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
        const gameIds = (
          await Game.findAll({
            attributes: ['id'],
            include: [
              {
                attributes: [],
                model: EncounterCompetition,
                required: true,
                include: [
                  {
                    attributes: [],
                    required: true,
                    model: DrawCompetition,
                    where: {
                      subeventId: removed.id
                    }
                  }
                ]
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

  protected addDraws(): ProcessStep<{ draw: DrawCompetition; internalId: number }[]> {
    return new ProcessStep(
      this.STEP_DRAW,
      async (args: { transaction: Transaction; tourneyKey: string }) => {
        // get previous step data
        const subEvents: {
          subEvent: SubEventCompetition;
          internalId: number;
        }[] = this.processor.getData(this.STEP_SUBEVENT);

        const dbDraws = [];
        for (const { subEvent, internalId } of subEvents) {
          const draws = await subEvent.getDraws({ transaction: args.transaction });

          const resultDraw = await axios.get(
            `${process.env.VR_API}/Tournament/${args.tourneyKey}/Event/${internalId}/Draw`,
            {
              withCredentials: true,
              auth: {
                username: `${process.env.VR_API_USER}`,
                password: `${process.env.VR_API_PASS}`
              },
              headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/xml'
              }
            }
          );
          const bodyDraw = parse(resultDraw.data, {
            attributeNamePrefix: '',
            ignoreAttributes: false,
            parseAttributeValue: true
          }).Result as XmlResult;

          const xmlDraws = Array.isArray(bodyDraw.TournamentDraw)
            ? bodyDraw.TournamentDraw
            : [bodyDraw.TournamentDraw];

          const dbXmlDraws: DrawCompetition[] = [];
          for (const xmlDraw of xmlDraws) {
            if (!xmlDraw) {
              continue;
            }
            let dbDraw = draws.find(r => r.visualCode === `${xmlDraw.Code}`);

            if (!dbDraw) {
              dbDraw = await new DrawCompetition({
                visualCode: xmlDraw.Code,
                subeventId: subEvent.id,
                name: xmlDraw.Name,
                size: xmlDraw.Size
              }).save({ transaction: args.transaction });
            }
            dbDraws.push({ draw: dbDraw, internalId: xmlDraw.Code });
            dbXmlDraws.push(dbDraw);
          }

          // Remove draw that are not in the xml
          const removedDraws = draws.filter(i => !dbXmlDraws.map(r => r.id).includes(i.id));
          for (const removed of removedDraws) {
            const gameIds = (
              await Game.findAll({
                attributes: ['id'],
                include: [
                  {
                    attributes: [],
                    model: EncounterCompetition,
                    required: true,
                    where: {
                      drawId: removed.id
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
        }
        return dbDraws;
      }
    );
  }

  protected addEncounters(): ProcessStep<
    { encounter: EncounterCompetition; internalId: number }[]
  > {
    return new ProcessStep(
      this.STEP_ENCOUNTER,
      async (args: { transaction: Transaction; tourneyKey: string }) => {

        const findTeams = async (
          xmlTeamMatch: XmlTeamMatch,
          event: EventCompetition,
          transaction: Transaction
        ) => {
          const team1 =
            (xmlTeamMatch.Team1?.Name?.length ?? 0) > 0
              ? await Team.findOne({
                  where: {
                    name: xmlTeamMatch.Team1?.Name?.replace(/(\(\d+\))/gi, ' ').trim(),
                    active: true
                  },
                  transaction
                })
              : null;
          const team2 =
            (xmlTeamMatch.Team2?.Name?.length ?? 0) > 0
              ? await Team.findOne({
                  where: {
                    name: xmlTeamMatch.Team2?.Name?.replace(/(\(\d+\))/gi, ' ').trim(),
                    active: true
                  },
                  transaction
                }) 
              : null;
    
          if (event.startYear > 2021) {
            if (team1 == null) {
              logger.warn(`Team ${xmlTeamMatch.Team1?.Name} not found`);
            } else if (team2 == null) {
              logger.warn(`Team ${xmlTeamMatch.Team2?.Name} not found`);
            }
          }
          return { team1, team2 };
        } 

        // get previous step data
        const draws: {
          draw: DrawCompetition;
          internalId: number;
        }[] = this.processor.getData(this.STEP_DRAW);
        const eventData: {
          event: EventCompetition;
          internalId: string;
        } = this.processor.getData(this.STEP_EVENT);

        const dbEncounters: { encounter: EncounterCompetition; internalId: number }[] = [];
        for (const { draw, internalId } of draws) {
          const encounters = await draw.getEncounters({ transaction: args.transaction });

          const resultDraw = await axios.get(
            `${process.env.VR_API}/Tournament/${args.tourneyKey}/Draw/${internalId}/Match`,
            { 
              withCredentials: true,
              auth: {
                username: `${process.env.VR_API_USER}`, 
                password: `${process.env.VR_API_PASS}`
              },
              headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/xml'
              }
            }
          ); 
          const bodyDraw = parse(resultDraw.data, {
            attributeNamePrefix: '',
            ignoreAttributes: false,
            parseAttributeValue: true
          }).Result as XmlResult;

          const xmlTeamMatches = Array.isArray(bodyDraw.TeamMatch)
            ? bodyDraw.TeamMatch
            : [bodyDraw.TeamMatch];

          const dbXmlEncounters: EncounterCompetition[] = [];
          for (const xmlTeamMatch of xmlTeamMatches) {
            if (!xmlTeamMatch) {
              continue;
            }
            const matchDate = moment(xmlTeamMatch.MatchTime).toDate();
            let dbEncounter = encounters.find(r => r.visualCode === `${xmlTeamMatch.Code}`);

            if (!dbEncounter) {
              const { team1, team2 } = await findTeams(xmlTeamMatch, eventData.event, args.transaction);

              // FInd one with same teams
              dbEncounter = encounters.find(
                e => e.homeTeamId === team1.id && e.awayTeamId === team2.id && e.drawId === e.drawId
              );

              if (!dbEncounter) {
                dbEncounter = await new EncounterCompetition({
                  drawId: draw.id,
                  visualCode: xmlTeamMatch.Code,
                  date: matchDate,
                  homeTeamId: team1?.id,
                  awayTeamId: team2?.id
                }).save({ transaction: args.transaction });
              } else {
                dbEncounter.visualCode = xmlTeamMatch.Code;
                await dbEncounter.save({ transaction: args.transaction });
              }
            }

            // Update date if needed
            if (dbEncounter.date !== matchDate) {
              dbEncounter.date = matchDate;
              await dbEncounter.save({ transaction: args.transaction });
            }

            // Set teams if undefined (should not happen)
            if (dbEncounter.awayTeamId == null || dbEncounter.homeTeamId == null) {
              const { team1, team2 } = await findTeams(xmlTeamMatch, eventData.event, args.transaction);
              dbEncounter.homeTeamId = team1?.id;
              dbEncounter.awayTeamId = team2?.id;
              await dbEncounter.save({ transaction: args.transaction });
            }

            dbEncounters.push({
              encounter: dbEncounter,
              internalId: parseInt(xmlTeamMatch.Code, 10)
            });
            dbXmlEncounters.push(dbEncounter);
          }

          // Remove draw that are not in the xml
          const removedEncounters = encounters.filter(
            i => !dbXmlEncounters.map(r => r.id).includes(i.id)
          );
          for (const removed of removedEncounters) {
            const gameIds = (
              await removed?.getGames({
                attributes: ['id'],
                transaction: args.transaction
              })
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
        }
        return dbEncounters;
      }
    );

  }

  protected addPlayers(): ProcessStep<Map<string, Player>> {
    return new ProcessStep(
      this.STEP_PLAYER,
      async (args: { transaction: Transaction; tourneyKey: string }) => {
        const mapPlayers = new Map<string, Player>();
        const resultPlayer = await axios.get(
          `${process.env.VR_API}/Tournament/${args.tourneyKey}/Player`,
          {
            withCredentials: true,
            auth: {
              username: `${process.env.VR_API_USER}`,
              password: `${process.env.VR_API_PASS}`
            },
            headers: {
              // eslint-disable-next-line @typescript-eslint/naming-convention
              'Content-Type': 'application/xml'
            }
          }
        );
        const bodyPlayer = parse(resultPlayer.data, {
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
        const encounters: {
          encounter: EncounterCompetition;
          internalId: number;
        }[] = this.processor.getData(this.STEP_ENCOUNTER);

        const players: Map<string, Player> = this.processor.getData(this.STEP_PLAYER);

        const updatedGames = [];
        const updatedgamePlayers = [];

        for (const { encounter, internalId } of encounters) {
          const dbXmlGames: Game[] = [];
          const games = await encounter.getGames({
            transaction: args.transaction,
            include: [Player]
          });

          const resultDraw = await axios.get(
            `${process.env.VR_API}/Tournament/${args.tourneyKey}/TeamMatch/${internalId}`,
            {
              withCredentials: true,
              auth: {
                username: `${process.env.VR_API_USER}`,
                password: `${process.env.VR_API_PASS}`
              },
              headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/xml'
              }
            }
          );
          const bodyDraw = parse(resultDraw.data, {
            attributeNamePrefix: '',
            ignoreAttributes: false,
            parseAttributeValue: true
          }).Result as XmlResult;

          const xmlMatches = (Array.isArray(bodyDraw.Match)
            ? bodyDraw.Match
            : [bodyDraw.Match]
          ).filter(m => !m || m?.Winner !== 0);

          for (const xmlMatch of xmlMatches) {
            let game = games.find(
              r => r.round === xmlMatch.RoundName && r.visualCode === `${xmlMatch.Code}`
            );

            if (!game) {
              game = new Game({
                visualCode: xmlMatch.Code,
                playedAt: encounter.date,
                winner: xmlMatch.Winner,
                gameType: this._getGameType(xmlMatch.MatchTypeID),
                order: xmlMatch.MatchOrder,
                linkId: encounter.id,
                linkType: 'competition'
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
            await removed.destroy({ transaction: args.transaction });
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

  private _getGameType(type: XmlMatchTypeID): GameType {
    switch (type) {
      case XmlMatchTypeID.MS:
      case XmlMatchTypeID.WS:
      case XmlMatchTypeID.Single:
        return GameType.S;

      case XmlMatchTypeID.MD:
      case XmlMatchTypeID.WD:
        return GameType.D;

      case XmlMatchTypeID.XD:
      case XmlMatchTypeID.Double:
        return GameType.MX;

      default:
        throw new Error(`Type not found, ${type}`);
    }
  }
}
