import {
  logger,
  Player,
  Processor,
  ProcessStep,
  RankingPlace,
  RankingPoint,
  RankingSystem,
  RankingSystems,
  splitInChunks,
  XmlRanking,
  XmlResult
} from '@badvlasim/shared';
import { Op, Transaction } from 'sequelize';
import { parse } from 'fast-xml-parser';
import moment, { Moment } from 'moment';
import axios from 'axios';

export class RankingSyncer {
  public processor: Processor;

  readonly STEP_RANKING = 'ranking';
  readonly STEP_CATEGORIES = 'categories';
  readonly STEP_PUBLICATIONS = 'publications';
  readonly STEP_POINTS = 'points';

  constructor() {
    this.processor = new Processor();

    this.processor.addStep(this.getRankings());
    this.processor.addStep(this.getCategories());
    this.processor.addStep(this.getPublications());
    this.processor.addStep(this.getPoints());
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

  protected getCategories(): ProcessStep<{ id: string; name: string }[]> {
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

      return bodyTournament.RankingCategory;
    });
  }

  protected getPublications(): ProcessStep<
    {
      code: string;
      name: string;
      year: string;
      week: string;
      publicationDate: Date;
      visible: string;
      date: Moment;
    }[]
  > {
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
          return {
            code: publication.Code,
            name: publication.Name,
            year: publication.Year,
            week: publication.Week,
            publicationDate: publication.PublicationDate,
            visible: publication.Visible,
            date: moment(publication.PublicationDate, 'YYYY-MM-DD')
          };
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

      interface VisualPublication {
        code: string;
        name: string;
        year: string;
        week: string;
        publicationDate: Date;
        visible: string;
        date: Moment;
      }

      const publications: VisualPublication[] = this.processor.getData(this.STEP_PUBLICATIONS);

      const categories: { Code: string; Name: string }[] = this.processor.getData(
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
          transaction: args.transaction
        });

        for (const points of bodyTournament.RankingPublicationPoints) {
          let p = players.find(p => p.memberId == `${points.Player1.MemberID}`);

          if (p == null) {
            logger.info('New player');
            const [firstName, ...lastName] = points.Player1.Name.split(' ').filter(Boolean);
            p = await new Player({
              memberId: points.Player1.MemberID,
              firstName,
              lastName: lastName.join(' '),
              gender: gender
            }).save({ transaction: args.transaction });
          }
          if (places.has(p.id)) {
            places.get(p.id)[type] = points.Level;
            places.get(p.id)[`${type}Points`] = points.Level;
            places.get(p.id)[`${type}Rank`] = points.Rank;
          } else {
            places.set(
              p.id,
              new RankingPlace({
                playerId: p.id,
                rankingDate: publication.publicationDate,
                [type]: points.Level,
                [`${type}Points`]: points.Level,
                [`${type}Rank`]: points.Rank,
                SystemId: ranking.system.id
              })
            );
          }
        }
      };

      for (const publication of publications) {
        const rankingPlaces = new Map<string, RankingPlace>();

        if (publication.date.isAfter(ranking.system.caluclationIntervalLastUpdate)) {
          logger.debug(`Getting single levels for ${publication.publicationDate}`);
          await pointsForCategory(
            publication,
            categories.find(category => category.Name === 'HE/SM').Code,
            rankingPlaces,
            'single',
            'M'
          );
          await pointsForCategory(
            publication,
            categories.find(category => category.Name === 'DE/SD').Code,
            rankingPlaces,
            'single',
            'F'
          );

          logger.debug(`Getting double levels for ${publication.publicationDate}`);
          await pointsForCategory(
            publication,
            categories.find(category => category.Name === 'HD/DM').Code,
            rankingPlaces,
            'double',
            'M'
          );
          await pointsForCategory(
            publication,
            categories.find(category => category.Name === 'DD').Code,
            rankingPlaces,
            'double',
            'F'
          );

          logger.debug(`Getting mix levels for ${publication.publicationDate}`);
          await pointsForCategory(
            publication,
            categories.find(category => category.Name === 'GD H/DX M').Code,
            rankingPlaces,
            'mix',
            'M'
          );
          await pointsForCategory(
            publication,
            categories.find(category => category.Name === 'GD D/DX D').Code,
            rankingPlaces,
            'mix',
            'F'
          );

          var chunks = splitInChunks(
            Array.from(rankingPlaces).map(([id, place]) => place.toJSON()),
            20
          );

          for (const chunk of chunks) {
            await RankingPlace.bulkCreate(chunk, {
              ignoreDuplicates: true,
              transaction: args.transaction,
              hooks: false
            });
          }

          ranking.system.caluclationIntervalLastUpdate = publication.date.toDate();
          await ranking.system.save({ transaction: args.transaction });
        }
      }
    });
  }
}
