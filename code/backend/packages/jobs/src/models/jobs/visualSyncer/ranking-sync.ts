import {
  logger,
  Player,
  Processor,
  ProcessStep,
  RankingPlace,
  RankingPoint,
  RankingSystem,
  RankingSystems,
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
      Code: string;
      Name: string;
      Year: string;
      Week: string;
      PublicationDate: Date;
      Visible: string;
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

      var pubs = bodyTournament.RankingPublication.filter(publication => publication.Visible).map(
        publication => {
          return {
            ...publication,
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

      const publications: {
        Code: string;
        Name: string;
        Year: string;
        Week: string;
        PublicationDate: Date;
        Visible: string;
        date: Moment;
      }[] = this.processor.getData(this.STEP_PUBLICATIONS);

      const categories: { id: string; name: string }[] = this.processor.getData(
        this.STEP_CATEGORIES
      );


      const pointsForCategory = async (publication: string, category: string, type: string) => {
        const resultTournament = await axios.get(
          `${process.env.VR_API}/Ranking/${ranking.visualCode}/Publication/${publication}/cat/${category}`,
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
                points => points.Player1.MemberID
              )
            }
          },
          transaction: args.transaction
        });

       
      };

      // for (const publication of publications) {
      //   const rankingPlaces = new Map<any>();

      //   if (publication.date.isAfter(ranking.system.caluclationIntervalLastUpdate)) {
      //     logger.debug('Yap');

      //     const singles = [
      //       await pointsForCategory(
      //         publication.Code,
      //         categories.find(category => category.name === 'HE/SM').id,
      //       ),
      //       await pointsForCategory(
      //         publication.Code,
      //         categories.find(category => category.name === 'DE/SD').id
      //       )
      //     ];

      //     const doubles = [
      //       await pointsForCategory(
      //         publication.Code,
      //         categories.find(category => category.name === 'HD/DM').id
      //       ),
      //       await pointsForCategory(
      //         publication.Code,
      //         categories.find(category => category.name === 'DD').id
      //       )
      //     ];

      //     const mixes = [
      //       await pointsForCategory(
      //         publication.Code,
      //         categories.find(category => category.name === 'GD H/DX M').id
      //       ),
      //       await pointsForCategory(
      //         publication.Code,
      //         categories.find(category => category.name === 'GD D/DX D').id
      //       )
      //     ];

      //     ranking.system.caluclationIntervalLastUpdate = publication.date.toDate();
      //     await ranking.system.save({ transaction: args.transaction });
      //   }
      // }
    });
  }
}
