import { Player, RankingLastPlace, RankingPlace, RankingSystem } from '@badman/backend-database';
import { Sync } from '@badman/backend-queue';
import { VisualService } from '@badman/backend-visual';
import { RankingSystems, Ranking, Gender } from '@badman/utils';
import { Logger } from '@nestjs/common';
import { Queue } from 'bull';
import { XMLParser } from 'fast-xml-parser';

import moment, { Moment } from 'moment';
import { Op, Transaction } from 'sequelize';
import { ProcessStep, Processor } from '../../processing';
import { correctWrongPlayers } from '../../utils';
interface RankingStepData {
  visualCode: string;
  system: RankingSystem;
  startDate: Date;
  stopDate?: Date;
}

interface PublicationStepData {
  visiblePublications: VisualPublication[];
  hiddenPublications?: Moment[];
}

interface CategoriesStepData {
  code: string;
  name: string;
}

export class RankingSyncer {
  private readonly logger = new Logger(RankingSyncer.name);

  public readonly processor: Processor;
  readonly updateMonths = [0, 2, 4, 6, 8, 10];
  readonly fuckedDatesGoods = ['2021-09-12T22:00:00.000Z'];
  readonly fuckedDatesBads = ['2021-09-05T22:00:00.000Z'];

  readonly STEP_RANKING = 'ranking';
  readonly STEP_CATEGORIES = 'categories';
  readonly STEP_PUBLICATIONS = 'publications';
  readonly STEP_POINTS = 'points';
  readonly STEP_INACTIVE = 'inactive';
  readonly STEP_REMOVED = 'removed';
  readonly STEP_QUEUE = 'queue';

  readonly xmlParser: XMLParser;

  constructor(
    private readonly _visualService: VisualService,
    private readonly rankingQ: Queue,
  ) {
    this.processor = new Processor(undefined, { logger: this.logger });
    this.xmlParser = new XMLParser();

    this.processor.addStep(this.getRankings());
    this.processor.addStep(this.getCategories());
    this.processor.addStep(this.getPublications());
    this.processor.addStep(this.getPoints());
    this.processor.addStep(this.removeInvisiblePublications());
  }

  async process(args: { transaction: Transaction }) {
    await this.processor.process({ ...args });
  }

  protected getRankings(): ProcessStep<RankingStepData> {
    // (args: {    transaction: Transaction;    start: Date;}) => Promise<{ stop: boolean; system: RankingSystem | null; visualCode: any; start: Date; }>'
    // (args?: unknown)                                        => Promise<{ stop: boolean; system: RankingSystem | null; visualCode: any; start: Date; }>'

    return new ProcessStep(
      this.STEP_RANKING,
      async (args?: { transaction?: Transaction; start?: Date; stop?: Date }) => {
        const rankingDetail = await this._visualService.getRanking(false);

        const system = await RankingSystem.findOne({
          where: {
            name: rankingDetail[0].Name,
            rankingSystem: RankingSystems.VISUAL,
          },
          transaction: args?.transaction ?? undefined,
        });

        // Default sync 1 week
        const startDate = args?.start ? moment(args.start) : moment().subtract(1, 'week');

        // Default sync 1 week
        const stop = args?.stop ? moment(args.stop) : undefined;

        return {
          stop: system == null,
          system,
          visualCode: rankingDetail[0].Code,
          startDate: startDate.toDate(),
          stopDate: stop?.toDate(),
        };
      },
    ) as ProcessStep<RankingStepData>;
  }

  protected getCategories(): ProcessStep<CategoriesStepData[]> {
    return new ProcessStep(this.STEP_CATEGORIES, async () => {
      const ranking: { visualCode: string; system: RankingSystem } | undefined =
        this.processor.getData<RankingStepData>(this.STEP_RANKING);

      if (!ranking?.visualCode) {
        throw new Error('No ranking found');
      }

      const categories = await this._visualService.getCategories(ranking.visualCode);

      return categories?.map((c) => {
        return {
          code: c.Code,
          name: c.Name,
        };
      }) as CategoriesStepData[];
    });
  }

  protected getPublications() {
    return new ProcessStep(this.STEP_PUBLICATIONS, async (args: { transaction: Transaction }) => {
      const ranking = this.processor.getData<RankingStepData>(this.STEP_RANKING);

      if (!ranking?.visualCode) {
        throw new Error('No ranking found');
      }

      const publications = await this._visualService.getPublications(ranking.visualCode, false);

      let pubs = publications
        ?.filter((publication) => publication.Visible)
        .map((publication) => {
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
            date: momentDate,
          } as VisualPublication;
        });
      pubs = pubs?.slice()?.sort((a, b) => a.date.diff(b.date));

      // get latest publication
      const last = pubs?.slice(-1)?.[0];
      if (last) {
        // store the latest publication in the calculationLastUpdate
        ranking.system.calculationLastUpdate = last.date.toDate();
      }

      const lastUpdate = pubs?.filter((r) => r.usedForUpdate)?.slice(-1)?.[0];
      if (lastUpdate) {
        // store the latest publication in the calculationLastUpdate
        ranking.system.updateLastUpdate = lastUpdate.date.toDate();
      }

      if (last || lastUpdate) {
        await ranking.system.save({ transaction: args.transaction });
      }

      return {
        visiblePublications: pubs,
        hiddenPublications: publications
          ?.filter((publication) => !publication.Visible)
          ?.map((publication) => {
            const momentDate = moment(publication.PublicationDate, 'YYYY-MM-DD');
            return momentDate;
          }),
      };
    });
  }

  protected getPoints(): ProcessStep {
    return new ProcessStep(this.STEP_POINTS, async (args: { transaction: Transaction }) => {
      const ranking = this.processor.getData<RankingStepData>(this.STEP_RANKING);

      const { visiblePublications } =
        this.processor.getData<PublicationStepData>(this.STEP_PUBLICATIONS) ?? {};

      const categories = this.processor.getData<CategoriesStepData[]>(this.STEP_CATEGORIES);

      if (!ranking?.visualCode) {
        throw new Error('No ranking found');
      }

      const pointsForCategory = async (
        publication: VisualPublication,
        category: string | null,
        places: Map<string, RankingPlace>,
        newPlayers: Map<string, Player>,
        type: Ranking,
        gender: Gender,
      ) => {
        if (!category) {
          this.logger.error(`No category defined?`);

          return;
        }

        const rankingPoints = await this._visualService.getPoints(
          ranking.visualCode,
          publication.code,
          category,
        );

        const memberIds = rankingPoints?.map(
          (points) => correctWrongPlayers({ memberId: `${points.Player1.MemberID}` }).memberId,
        );

        this.logger.debug(
          `Getting ${memberIds?.length} players for ${publication.name} ${type} ${gender}`,
        );

        const players = await Player.findAll({
          attributes: ['id', 'memberId'],
          where: {
            memberId: {
              [Op.in]: memberIds,
            },
          },
          include: [
            {
              required: false,
              model: RankingLastPlace,
              where: {
                systemId: ranking.system.id,
              },
              attributes: ['id', 'systemId', 'single', 'double', 'mix'],
            },
          ],
          transaction: args.transaction,
        });

        for (const points of rankingPoints ?? []) {
          const memberId = correctWrongPlayers({
            memberId: `${points.Player1.MemberID}`,
          }).memberId;
          let foundPlayer = players.find((p) => p.memberId === memberId);

          if (!memberId) {
            this.logger.error(
              `No memberId found for ${points.Player1.Name} ${points.Player1.MemberID}`,
            );
            continue;
          }

          if (foundPlayer == null) {
            foundPlayer = newPlayers.get(memberId);
          }

          if (foundPlayer == null) {
            this.logger.log('New player');
            const [firstName, ...lastName] = points.Player1.Name.split(' ').filter(Boolean);

            foundPlayer = new Player(
              correctWrongPlayers({
                memberId,
                firstName,
                lastName: lastName.join(' '),
                gender,
              }),
            );
            players.push(foundPlayer);

            if (!foundPlayer.memberId) {
              this.logger.error(
                `No memberId found for ${points.Player1.Name} ${points.Player1.MemberID}`,
              );
              continue;
            }

            newPlayers.set(foundPlayer.memberId, foundPlayer);
          }

          if (!foundPlayer.id) {
            this.logger.error(`No id found for ${points.Player1.Name} ${points.Player1.MemberID}`);
            continue;
          }

          // Check if other publication has create the ranking place
          if (places.has(foundPlayer.id)) {
            const place = places.get(foundPlayer.id);
            place[type] = points.Level;
            place[`${type}Points`] = points.Totalpoints;
            place[`${type}Rank`] = points.Rank;
          } else {
            const place = new RankingPlace({
              updatePossible: publication.usedForUpdate,
              playerId: foundPlayer.id,
              rankingDate: publication.date.toDate(),
              [type]: points.Level,
              [`${type}Points`]: points.Totalpoints,
              [`${type}Rank`]: points.Rank,
              systemId: ranking.system.id,
              gender,
            });

            places.set(foundPlayer.id, place);
          }

     
        }
      };

      for (const publication of visiblePublications ?? []) {
        const rankingPlaces = new Map<string, RankingPlace>();
        const newPlayers = new Map<string, Player>();

        if (
          publication.date.isAfter(ranking.startDate) &&
          (!ranking.stopDate || publication.date.isBefore(ranking.stopDate))
        ) {
          if (publication.usedForUpdate) {
            this.logger.log(`Updating ranking on ${publication.date.format('LLL')}`);
          }

          this.logger.debug(`Getting single levels for ${publication.date.format('LLL')}`);
          await pointsForCategory(
            publication,
            categories?.find((category) => category.name === 'HE/SM')?.code ?? null,
            rankingPlaces,
            newPlayers,
            'single',
            'M',
          );
          await pointsForCategory(
            publication,
            categories?.find((category) => category.name === 'DE/SD')?.code ?? null,
            rankingPlaces,
            newPlayers,
            'single',
            'F',
          );

          this.logger.debug(`Getting double levels for ${publication.date.format('LLL')}`);
          await pointsForCategory(
            publication,
            categories?.find((category) => category.name === 'HD/DM')?.code ?? null,
            rankingPlaces,
            newPlayers,
            'double',
            'M',
          );
          await pointsForCategory(
            publication,
            categories?.find((category) => category.name === 'DD')?.code ?? null,
            rankingPlaces,
            newPlayers,
            'double',
            'F',
          );

          this.logger.debug(`Getting mix levels for ${publication.date.format('LLL')}`);
          await pointsForCategory(
            publication,
            categories?.find((category) => category.name === 'GD H/DX M')?.code ?? null,
            rankingPlaces,
            newPlayers,
            'mix',
            'M',
          );
          await pointsForCategory(
            publication,
            categories?.find((category) => category.name === 'GD D/DX D')?.code ?? null,
            rankingPlaces,
            newPlayers,
            'mix',
            'F',
          );

          this.logger.debug(`Creating ${newPlayers.size} new players`);
          if (newPlayers.size > 0) {
            const newPlayersMap = Array.from(newPlayers).map(([, player]) => player.toJSON());
            await Player.bulkCreate(newPlayersMap, {
              ignoreDuplicates: true,
              transaction: args.transaction,
              returning: false,
            });
          }

          const instances = Array.from(rankingPlaces).map(([, place]) => place.toJSON());

          this.logger.debug(`Creating/updating ${instances.length} ranking places`);

          // split the instances in chunks of 1000
          const chunkSize = 1000;
          for (let i = 0; i < instances.length; i += chunkSize) {
            const chunk = instances.slice(i, i + chunkSize);

            this.logger.verbose(
              `Processing batch  ${i} -> ${chunk.length} of ${instances.length} ranking places`,
            );

            await RankingPlace.bulkCreate(chunk, {
              updateOnDuplicate: [
                'updatePossible',
                'singlePoints',
                'singleRank',
                'doublePoints',
                'doubleRank',
                'mixPoints',
                'mixRank',
              ],
              transaction: args.transaction,
              returning: false,
            });

            // for (const place of chunk) {
            //   try {
            //     await RankingPlace.update(
            //       {
            //         single: place.single,
            //         double: place.double,
            //         mix: place.mix,
            //       },
            //       {
            //         returning: false,
            //         where: {
            //           playerId: place.playerId,
            //           rankingDate: place.rankingDate,
            //           systemId: place.systemId,
            //           single: null,
            //           double: null,
            //           mix: null,
            //         },
            //         transaction: args.transaction,
            //         logging: (msg) => {
            //           this.logger.debug(msg);
            //         }
            //       },
            //     );
            //   } catch (e) {
            //     console.error('Error', e);
            //     throw e;
            //   }
            // }

            // find any promisses where the playerId is unknown or null or undefined
            const unknownPlayers = instances.filter((place) => !place.playerId);

            console.log('unknownPlayers', unknownPlayers);
            // await Promise.all(promisses);
          }

          this.logger.verbose(`Finished processing ${instances.length} ranking places`);
        }
      }
    });
  }

  protected removeInvisiblePublications(): ProcessStep {
    return new ProcessStep(this.STEP_REMOVED, async (args: { transaction: Transaction }) => {
      try {
        const { hiddenPublications } =
          this.processor.getData<PublicationStepData>(this.STEP_PUBLICATIONS) ?? {};

        if (hiddenPublications == null) {
          return;
        }

        const { visualCode, system } =
          this.processor.getData<RankingStepData>(this.STEP_RANKING) ?? {};

        if (!visualCode) {
          throw new Error('No ranking found');
        }

        for (const publication of hiddenPublications) {
          const points = await RankingPlace.count({
            where: {
              rankingDate: publication.toDate(),
              systemId: system?.id,
            },
            transaction: args.transaction,
          });

          if (points > 0) {
            this.logger.log(
              `Removing points for ${publication.format('LLL')} because it is not visible anymore`,
            );
            await RankingPlace.destroy({
              where: {
                rankingDate: publication.toDate(),
                systemId: system?.id,
              },
              transaction: args.transaction,
            });
          }
        }
      } catch (e) {
        this.logger.error('Error', e);
        throw e;
      }
    });
  }

  protected queueMissingRankingPlayers(): ProcessStep {
    return new ProcessStep(this.STEP_QUEUE, async (args: { transaction: Transaction }) => {
      const { system } = this.processor.getData<RankingStepData>(this.STEP_RANKING) ?? {};

      const { visiblePublications } =
        this.processor.getData<PublicationStepData>(this.STEP_PUBLICATIONS) ?? {};

      // For now we only check if it's the last update

      const lastPublication = visiblePublications
        .slice()
        ?.sort((a, b) => b.date.valueOf() - a.date.valueOf())?.[0];

      if (lastPublication == null) {
        return;
      }

      // find any ranking place where single, double or mix is null
      const playersWithMissingRankings = await RankingPlace.findAll({
        where: {
          rankingDate: lastPublication.date.toDate(),
          systemId: system?.id,
          [Op.or]: [{ single: null }, { double: null }, { mix: null }],
          transaction: args.transaction,
        },
      });

      if (playersWithMissingRankings.length > 0) {
        this.logger.log(
          `Queueing ${playersWithMissingRankings.length} players for ranking creation`,
        );

        // qyueu them for ranking check on low priority
        for (const player of playersWithMissingRankings) {
          this.rankingQ.add(
            Sync.CheckRanking,
            {
              playerId: player.id,
            },
            {
              priority: 9999,
              removeOnFail: true,
              removeOnComplete: true,
            },
          );
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
  visible: boolean;
  date: Moment;
}
