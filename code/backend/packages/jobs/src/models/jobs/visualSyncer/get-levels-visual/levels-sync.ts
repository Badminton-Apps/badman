import {
  LastRankingPlace,
  logger,
  Player,
  Processor,
  ProcessStep,
  RankingPlace,
  RankingPoint,
  RankingProcessor,
  RankingSystem,
  RankingSystems,
  DataBaseHandler,
  XmlRanking,
  XmlResult,
  Game,
  GameType
} from '@badvlasim/shared';
import { Op, Transaction } from 'sequelize';
import { parse } from 'fast-xml-parser';
import moment, { Moment } from 'moment';
import axios from 'axios';

export class RankingSyncer {
  public processor: Processor;
  readonly updateMonths = [0, 2, 4, 6, 8, 10];
  readonly fuckedDatesGoods = ["2021-09-12T22:00:00.000Z"];
  readonly fuckedDatesBads = ["2021-09-05T22:00:00.000Z"];

  readonly STEP_RANKING = 'ranking';
  readonly STEP_CATEGORIES = 'categories';
  readonly STEP_PUBLICATIONS = 'publications';
  readonly STEP_POINTS = 'points';
  readonly STEP_INACTIVE = 'inactive';

  constructor() {
    this.processor = new Processor();

    this.processor.addStep(this.getRankings());
    this.processor.addStep(this.getCategories());
    this.processor.addStep(this.getPublications());
    this.processor.addStep(this.getPoints());
    // this.processor.addStep(this.setInactive());
  }

  process(args: { transaction: Transaction }) {
    return this.processor.process({ ...args });
  }

  protected getRankings(): ProcessStep<{ visualCode: string; system: RankingSystem }> {
    return new ProcessStep(this.STEP_RANKING, async (args: { transaction: Transaction }) => {
      try {
        const resultTournament = await axios.get(`${process.env.VR_API}/Ranking`, {
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

        const bodyTournament = parse(resultTournament.data, {
          attributeNamePrefix: '',
          ignoreAttributes: false,
          parseAttributeValue: true
        }).Result as XmlResult;
        const rankingDetail = Array.isArray(bodyTournament.Ranking)
          ? bodyTournament.Ranking
          : [bodyTournament.Ranking];

        const system = await RankingSystem.findOne({
          where: {
            name: rankingDetail[0].Name,
            rankingSystem: RankingSystems.VISUAL
          },
          transaction: args.transaction
        });

        return {
          stop: system == null,
          system,
          visualCode: rankingDetail[0].Code
        };
      } catch (error) {
        throw error;
      }
    });
  }

  protected getCategories(): ProcessStep<{ code: string; name: string }[]> {
    return new ProcessStep(this.STEP_CATEGORIES, async (args: { transaction: Transaction }) => {
      const ranking: { visualCode: string; system: RankingSystem } = this.processor.getData(
        this.STEP_RANKING
      );

      const resultTournament = await axios.get(
        `${process.env.VR_API}/Ranking/${ranking.visualCode}/Category`,
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

      return bodyTournament.RankingCategory.map(c => {
        return {
          code: c.Code,
          name: c.Name
        };
      });
    });
  }

  protected getPublications(): ProcessStep<VisualPublication[]> {
    return new ProcessStep(this.STEP_PUBLICATIONS, async (args: { transaction: Transaction }) => {
      const ranking: { visualCode: string; system: RankingSystem } = this.processor.getData(
        this.STEP_RANKING
      );

      const resultTournament = await axios.get(
        `${process.env.VR_API}/Ranking/${ranking.visualCode}/Publication`,
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

      let pubs = bodyTournament.RankingPublication.filter(publication => publication.Visible).map(
        publication => {
          const momentDate = moment(publication.PublicationDate, 'YYYY-MM-DD');
          let canUpdate = false;

          if (this.updateMonths.includes(momentDate.month())) {
            const firstMondayOfMonth = momentDate.clone().date(1).day(8);
            if (firstMondayOfMonth.date() > 7) {
              firstMondayOfMonth.day(-6);
            }
          
            // Create some margin
            const margin = firstMondayOfMonth.clone().add(2, 'days');
            canUpdate =
              momentDate.isSame(firstMondayOfMonth) ||
              momentDate.isBetween(firstMondayOfMonth, margin);
          }

          if (this.fuckedDatesGoods.includes(momentDate.toISOString())) {
            canUpdate = true;
          }
          if (this.fuckedDatesBads.includes(momentDate.toISOString())) {
            canUpdate = false;
          }

          if (canUpdate){
            logger.info(`Updating ranking on ${publication.PublicationDate}`);
          }

          return {
            usedForUpdate: canUpdate,
            code: publication.Code,
            name: publication.Name,
            year: publication.Year,
            week: publication.Week,
            publicationDate: publication.PublicationDate,
            visible: publication.Visible,
            date: momentDate
          } as VisualPublication;
        }
      );
      pubs = pubs.sort((a, b) => a.date.diff(b.date));
      return pubs;
    });
  }

  protected getPoints(): ProcessStep<{ id: string; name: string }[]> {
    return new ProcessStep(this.STEP_POINTS, async (args: { transaction: Transaction }) => {
      const ranking: { visualCode: string; system: RankingSystem } = this.processor.getData(
        this.STEP_RANKING
      );

      const publications: VisualPublication[] = this.processor.getData(this.STEP_PUBLICATIONS);

      const categories: { code: string; name: string }[] = this.processor.getData(
        this.STEP_CATEGORIES
      );

      const pointsForCategory = async (
        publication: VisualPublication,
        category: string,
        places: Map<string, RankingPlace>,
        type: 'single' | 'double' | 'mix',
        gender: 'M' | 'F'
      ) => {
        const resultTournament = await axios.get(
          `${process.env.VR_API}/Ranking/${ranking.visualCode}/Publication/${publication.code}/Category/${category}`,
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

        const players = await Player.findAll({
          where: {
            memberId: {
              [Op.in]: bodyTournament.RankingPublicationPoints.map(
                points => `${points.Player1.MemberID}`
              )
            }
          },
          include: [LastRankingPlace],
          transaction: args.transaction
        });

        for (const points of bodyTournament.RankingPublicationPoints) {
          let foundPlayer = players.find(p => p.memberId === `${points.Player1.MemberID}`);

          if (foundPlayer == null) {
            logger.info('New player');
            const [firstName, ...lastName] = points.Player1.Name.split(' ').filter(Boolean);
            foundPlayer = await new Player({
              memberId: points.Player1.MemberID,
              firstName,
              lastName: lastName.join(' '),
              gender
            }).save({ transaction: args.transaction });
          }
          if (places.has(foundPlayer.id)) {
            places.get(foundPlayer.id)[type] = points.Level;
            places.get(foundPlayer.id)[`${type}Points`] = points.Totalpoints;
            places.get(foundPlayer.id)[`${type}Rank`] = points.Rank;
          } else {
            places.set(
              foundPlayer.id,
              new RankingPlace({
                updatePossible: publication.usedForUpdate,
                playerId: foundPlayer.id,
                rankingDate: publication.publicationDate,
                [type]: points.Level,
                [`${type}Points`]: points.Totalpoints,
                [`${type}Rank`]: points.Rank,
                SystemId: ranking.system.id
              })
            );

            if (publication.usedForUpdate === false && foundPlayer.lastRankingPlaces != null) {
              const place = foundPlayer.lastRankingPlaces.find(
                r => r.systemId === ranking.system.id
              );
              if (place != null && place[type] != null && place[type] !== points.Level) {
                place[type] = points.Level;
                await place.save({ transaction: args.transaction });
              }
            }
          }
        }
      };

      for (const publication of publications) {
        const rankingPlaces = new Map<string, RankingPlace>();

        if (publication.date.isAfter(ranking.system.caluclationIntervalLastUpdate)) {
          logger.debug('Removing old points for date (voiding collision)');
          await RankingPlace.destroy({
            where: {
              rankingDate: publication.publicationDate
            },
            transaction: args.transaction
          });

          logger.debug(`Getting single levels for ${publication.publicationDate}`);
          await pointsForCategory(
            publication,
            categories.find(category => category.name === 'HE/SM').code,
            rankingPlaces,
            'single',
            'M'
          );
          await pointsForCategory(
            publication,
            categories.find(category => category.name === 'DE/SD').code,
            rankingPlaces,
            'single',
            'F'
          );

          logger.debug(`Getting double levels for ${publication.publicationDate}`);
          await pointsForCategory(
            publication,
            categories.find(category => category.name === 'HD/DM').code,
            rankingPlaces,
            'double',
            'M'
          );
          await pointsForCategory(
            publication,
            categories.find(category => category.name === 'DD').code,
            rankingPlaces,
            'double',
            'F'
          );

          logger.debug(`Getting mix levels for ${publication.publicationDate}`);
          await pointsForCategory(
            publication,
            categories.find(category => category.name === 'GD H/DX M').code,
            rankingPlaces,
            'mix',
            'M'
          );
          await pointsForCategory(
            publication,
            categories.find(category => category.name === 'GD D/DX D').code,
            rankingPlaces,
            'mix',
            'F'
          );

          const instances = Array.from(rankingPlaces).map(([id, place]) => place.toJSON());
          await RankingPlace.bulkCreate(instances, {
            ignoreDuplicates: true,
            transaction: args.transaction,
            hooks: true
          });

          ranking.system.caluclationIntervalLastUpdate = publication.date.toDate();
          await ranking.system.save({ transaction: args.transaction });
        }
      }
    });
  }

  protected setInactive(): ProcessStep<{ id: string; name: string }[]> {
    return new ProcessStep(this.STEP_INACTIVE, async (args: { transaction: Transaction }) => {
      logger.debug('Check inactive for players');
      const { system }: { visualCode: string; system: RankingSystem } = this.processor.getData(
        this.STEP_RANKING
      );

      const canBeInactive = await Player.findAll({
        include: [
          {
            model: RankingPlace,
            where: {
              systemId: system.id,
              rankignDate: {
                [Op.not]: system.caluclationIntervalLastUpdate.toISOString()
              }
            },
            required: true
          },
          {
            model: LastRankingPlace,
            where: {
              [Op.and]: {
                [Op.or]: [
                  { singleInactive: false },
                  { doubleInactive: false },
                  { mixInactive: false }
                ],
                rankignDate: {
                  [Op.lt]: system.caluclationIntervalLastUpdate.toISOString()
                }
              }
            },
            required: true
          }
        ],
        transaction: args.transaction
      });

      const inactiveDate = moment(system.caluclationIntervalLastUpdate)
        .add(system.inactivityAmount, system.inactivityUnit)
        .toDate();

      logger.debug(`Found ${canBeInactive.length} possible inactive players`);

      for (const player of canBeInactive) {
        let singleInactive = false;
        let doubleInactive = false;
        let mixInactive = false;

        const games = await player.getGames({
          transaction: args.transaction,
          where: {
            playedAt: {
              [Op.gte]: inactiveDate
            }
          }
        });

        const singleGames = games.filter(game => game.gameType === GameType.S);
        const doubleGames = games.filter(game => game.gameType === GameType.D);
        const mixGames = games.filter(game => game.gameType === GameType.MX);

        if ((singleGames?.length ?? 0) < system.gamesForInactivty) {
          singleInactive = true;
        }

        if ((doubleGames?.length ?? 0) < system.gamesForInactivty) {
          doubleInactive = true;
        }

        if ((mixGames?.length ?? 0) < system.gamesForInactivty) {
          mixInactive = true;
        }

        if (singleInactive && doubleInactive && mixInactive) {
          logger.debug(`Set player ${player.fullName} (${player.memberId}) to inactive`);
          const lastRankingPlaces = player.lastRankingPlaces.filter(
            p => p.systemId === system.id
          )[0];
          const newRankingPlace = await new RankingPlace({
            updatePossible: false,
            playerId: player.id,
            rankingDate: system.caluclationIntervalLastUpdate,
            singleInactive: true,
            doubleInactive: true,
            mixInactive: true,
            single: lastRankingPlaces.single,
            double: lastRankingPlaces.double,
            mix: lastRankingPlaces.mix,
            SystemId: system.id
          }).save({ transaction: args.transaction });

          await player.addRankingPlace(newRankingPlace, { transaction: args.transaction });
        }
      }
    });
  }
}

interface VisualPublication {
  usedForUpdate: boolean;
  code: string;
  name: string;
  year: string;
  week: string;
  publicationDate: Date;
  visible: string;
  date: Moment;
}
