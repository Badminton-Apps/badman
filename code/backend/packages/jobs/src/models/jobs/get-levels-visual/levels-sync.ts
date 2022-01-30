import {
  correctWrongPlayers,
  Cron,
  GameType,
  LastRankingPlace,
  logger,
  Player,
  Processor,
  ProcessStep,
  RankingPlace,
  RankingSystem,
  RankingSystems,
  XmlResult
} from '@badvlasim/shared';
import axios from 'axios';
import { parse } from 'fast-xml-parser';
import moment, { Moment } from 'moment';
import { Op, Transaction } from 'sequelize';

export class RankingSyncer {
  public processor: Processor;
  readonly updateMonths = [0, 2, 4, 6, 8, 10];
  readonly fuckedDatesGoods = ['2021-09-12T22:00:00.000Z'];
  readonly fuckedDatesBads = ['2021-09-05T22:00:00.000Z'];

  readonly STEP_RANKING = 'ranking';
  readonly STEP_CATEGORIES = 'categories';
  readonly STEP_PUBLICATIONS = 'publications';
  readonly STEP_POINTS = 'points';
  readonly STEP_INACTIVE = 'inactive';

  private dbCron: Cron;

  constructor() {
    this.processor = new Processor();

    this.processor.addStep(this.getRankings());
    this.processor.addStep(this.getCategories());
    this.processor.addStep(this.getPublications());
    this.processor.addStep(this.getPoints());
  }

  async process(args: { transaction: Transaction; runFrom: Date; cron: Cron }) {
    this.dbCron = args.cron;
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
    return new ProcessStep(this.STEP_CATEGORIES, async () => {
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

      return bodyTournament.RankingCategory.map((c) => {
        return {
          code: c.Code,
          name: c.Name
        };
      });
    });
  }

  protected getPublications(): ProcessStep<VisualPublication[]> {
    return new ProcessStep(this.STEP_PUBLICATIONS, async () => {
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

      let pubs = bodyTournament.RankingPublication.filter((publication) => publication.Visible).map(
        (publication) => {
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

  protected getPoints(): ProcessStep {
    return new ProcessStep(
      this.STEP_POINTS,
      async (args: { transaction: Transaction; runFrom: Date }) => {
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

          const memberIds = bodyTournament.RankingPublicationPoints.map(
            (points) => correctWrongPlayers({ memberId: `${points.Player1.MemberID}` }).memberId
          );

          logger.debug(
            `Getting ${memberIds.length} players for ${publication.name} ${type} ${gender}`
          );

          const players = await Player.findAll({
            attributes: ['id', 'memberId'],
            where: {
              memberId: {
                [Op.in]: memberIds
              }
            },
            include: [
              { model: LastRankingPlace, attributes: ['id', 'systemId', 'single', 'double', 'mix'] }
            ],
            transaction: args.transaction
          });

          for (const points of bodyTournament.RankingPublicationPoints) {
            let foundPlayer = players.find(
              (p) =>
                p.memberId ===
                correctWrongPlayers({ memberId: `${points.Player1.MemberID}` }).memberId
            );

            if (foundPlayer == null) {
              logger.info('New player');
              const [firstName, ...lastName] = points.Player1.Name.split(' ').filter(Boolean);
              foundPlayer = await new Player(
                correctWrongPlayers({
                  memberId: points.Player1.MemberID,
                  firstName,
                  lastName: lastName.join(' '),
                  gender
                })
              ).save({ transaction: args.transaction });
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
                  rankingDate: publication.date.toDate(),
                  [type]: points.Level,
                  [`${type}Points`]: points.Totalpoints,
                  [`${type}Rank`]: points.Rank,
                  SystemId: ranking.system.id
                })
              );

              if (publication.usedForUpdate === false && foundPlayer.lastRankingPlaces != null) {
                const place = foundPlayer.lastRankingPlaces.find(
                  (r) => r.systemId === ranking.system.id
                );
                if (place != null && place[type] != null && place[type] !== points.Level) {
                  place[type] = points.Level;
                  await place.save({ transaction: args.transaction });
                }
              }
            }
          }
        };

        const runFrom =
          args.runFrom == null || args.runFrom == undefined
            ? this.dbCron.meta?.['lastPublication']
              ? moment(this.dbCron.meta['lastPublication'])
              : moment('2000-01-01')
            : moment(args.runFrom);

        for (const publication of publications) {
          const rankingPlaces = new Map<string, RankingPlace>();

          if (publication.date.isAfter(runFrom)) {
            if (publication.usedForUpdate) {
              logger.info(`Updating ranking on ${publication.date}`);
            }

            logger.debug('Removing old points for date (voiding collision)');
            await RankingPlace.destroy({
              where: {
                rankingDate: publication.date.toDate()
              },
              transaction: args.transaction
            });

            logger.debug(`Getting single levels for ${publication.date.format('LLL')}`);
            await pointsForCategory(
              publication,
              categories.find((category) => category.name === 'HE/SM').code,
              rankingPlaces,
              'single',
              'M'
            );
            await pointsForCategory(
              publication,
              categories.find((category) => category.name === 'DE/SD').code,
              rankingPlaces,
              'single',
              'F'
            );

            logger.debug(`Getting double levels for ${publication.date.format('LLL')}`);
            await pointsForCategory(
              publication,
              categories.find((category) => category.name === 'HD/DM').code,
              rankingPlaces,
              'double',
              'M'
            );
            await pointsForCategory(
              publication,
              categories.find((category) => category.name === 'DD').code,
              rankingPlaces,
              'double',
              'F'
            );

            logger.debug(`Getting mix levels for ${publication.date.format('LLL')}`);
            await pointsForCategory(
              publication,
              categories.find((category) => category.name === 'GD H/DX M').code,
              rankingPlaces,
              'mix',
              'M'
            );
            await pointsForCategory(
              publication,
              categories.find((category) => category.name === 'GD D/DX D').code,
              rankingPlaces,
              'mix',
              'F'
            );

            const instances = Array.from(rankingPlaces).map(([, place]) => place.toJSON());
            await RankingPlace.bulkCreate(instances, {
              ignoreDuplicates: true,
              transaction: args.transaction,
              returning: false
            });

            logger.debug(`RankingPlace were created`);

            ranking.system.caluclationIntervalLastUpdate = publication.date.toDate();
            if (publication.usedForUpdate) {
              ranking.system.updateIntervalAmountLastUpdate = publication.date.toDate();
            }
            await ranking.system.save({ transaction: args.transaction });
            this.dbCron.meta = {
              ...this.dbCron.meta,
              lastPublication: publication.date.toDate()
            };
            await this.dbCron.save({ transaction: args.transaction });
          }
        }
      }
    );
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
