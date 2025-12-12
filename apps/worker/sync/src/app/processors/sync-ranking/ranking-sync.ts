import { Player, RankingLastPlace, RankingPlace, RankingSystem } from "@badman/backend-database";
import { Sync } from "@badman/backend-queue";
import { VisualService } from "@badman/backend-visual";
import { RankingSystems, Ranking, Gender } from "@badman/utils";
import { Logger } from "@nestjs/common";
import { Queue } from "bull";

import moment, { Moment } from "moment";
import { Op, Transaction, Sequelize } from "sequelize";
import { ProcessStep, Processor } from "../../processing";
import { correctWrongPlayers } from "../../utils";
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
  readonly fuckedDatesGoods = ["2021-09-12T22:00:00.000Z"];
  readonly fuckedDatesBads = ["2021-09-05T22:00:00.000Z"];

  readonly STEP_RANKING = "ranking";
  readonly STEP_CATEGORIES = "categories";
  readonly STEP_PUBLICATIONS = "publications";
  readonly STEP_POINTS = "points";
  readonly STEP_INACTIVE = "inactive";
  readonly STEP_REMOVED = "removed";
  readonly STEP_QUEUE = "queue";

  constructor(
    private readonly _visualService: VisualService,
    private readonly rankingQ: Queue,
    private readonly _sequelize: Sequelize
  ) {
    this.processor = new Processor(undefined, { logger: this.logger });

    this.processor.addStep(this.getRankings());
    this.processor.addStep(this.getCategories());
    this.processor.addStep(this.getPublications());
    // Points processing is now handled separately with individual transactions
    this.processor.addStep(this.removeInvisiblePublications());
  }

  async process(args: { transaction: Transaction; start?: Date; stop?: Date }) {
    // Process initial steps with main transaction using original processor
    await this.processor.process({ ...args });

    // Process points step with separate transactions per publication
    await this.processPointsWithSeparateTransactions(args);
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
        const startDate = args?.start ? moment(args.start) : moment().subtract(1, "week");

        // Default sync 1 week
        const stop = args?.stop ? moment(args.stop) : undefined;

        return {
          stop: system == null,
          system,
          visualCode: rankingDetail[0].Code,
          startDate: startDate.toDate(),
          stopDate: stop?.toDate(),
        };
      }
    ) as ProcessStep<RankingStepData>;
  }

  protected getCategories(): ProcessStep<CategoriesStepData[]> {
    return new ProcessStep(this.STEP_CATEGORIES, async () => {
      const ranking: { visualCode: string; system: RankingSystem } | undefined =
        this.processor.getData<RankingStepData>(this.STEP_RANKING);

      if (!ranking?.visualCode) {
        throw new Error("No ranking found");
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
        throw new Error("No ranking found");
      }

      const publications = await this._visualService.getPublications(ranking.visualCode, false);

      let pubs = publications
        ?.filter((publication) => publication.Visible)
        .map((publication) => {
          const momentDate = moment(publication.PublicationDate, "YYYY-MM-DD");
          let canUpdate = false;

          if (this.updateMonths.includes(momentDate.month())) {
            const firstMondayOfMonth = momentDate.clone().date(1).day(8);
            if (firstMondayOfMonth.date() > 7) {
              firstMondayOfMonth.day(-6);
            }

            // Create some margin
            const margin = firstMondayOfMonth.clone().add(2, "days");
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
      pubs = [...(pubs || [])].sort((a, b) => a.date.diff(b.date));

      // get latest publication
      const last = pubs?.at(-1);
      if (last) {
        // store the latest publication in the calculationLastUpdate
        ranking.system.calculationLastUpdate = last.date.toDate();
      }

      const lastUpdate = pubs?.filter((r) => r.usedForUpdate)?.at(-1);
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
            const momentDate = moment(publication.PublicationDate, "YYYY-MM-DD");
            return momentDate;
          }),
      };
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
          throw new Error("No ranking found");
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
              `Removing points for ${publication.format("LLL")} because it is not visible anymore`
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
        this.logger.error("Error", e);
        throw e;
      }
    });
  }

  private async processPointsWithSeparateTransactions(args: {
    transaction: Transaction;
    start?: Date;
    stop?: Date;
  }) {
    const ranking = this.processor.getData<RankingStepData>(this.STEP_RANKING);
    const { visiblePublications } =
      this.processor.getData<PublicationStepData>(this.STEP_PUBLICATIONS) ?? {};
    const categories = this.processor.getData<CategoriesStepData[]>(this.STEP_CATEGORIES);

    if (!ranking?.visualCode) {
      throw new Error("No ranking found");
    }

    // Process publications in smaller batches to prevent memory issues
    const publicationsToProcess = (visiblePublications || []).filter(
      (publication) =>
        publication.date.isAfter(ranking.startDate) &&
        (!ranking.stopDate || publication.date.isBefore(ranking.stopDate))
    );

    this.logger.log(
      `Processing ${publicationsToProcess.length} publications with separate transactions`
    );

    for (const [index, publication] of publicationsToProcess.entries()) {
      // Create a separate transaction for each publication
      const publicationTransaction = await this._sequelize.transaction();

      try {
        this.logger.log(
          `Processing publication ${publication.name} (${publication.date.format("YYYY-MM-DD")}) - ${index + 1}/${publicationsToProcess.length}`
        );

        if (publication.usedForUpdate) {
          this.logger.log(
            `This publication will update rankings: ${publication.date.format("LLL")}`
          );
        }

        // Process this single publication with its own transaction
        await this.processSinglePublication(
          publication,
          categories,
          ranking,
          publicationTransaction
        );

        // Commit the transaction for this publication
        await publicationTransaction.commit();
        this.logger.debug(`Committed transaction for publication ${publication.name}`);

        // Force garbage collection after each publication
        if (global.gc) {
          global.gc();
        }

        // Add delay between publications to allow memory cleanup
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Increased delay
      } catch (error) {
        this.logger.error(`Failed to process publication ${publication.name}:`, error);
        await publicationTransaction.rollback();
        throw error;
      }
    }
  }

  private async processSinglePublication(
    publication: VisualPublication,
    categories: CategoriesStepData[],
    ranking: RankingStepData,
    transaction: Transaction
  ) {
    const rankingPlaces = new Map<string, RankingPlace>();
    const newPlayers = new Map<string, Player>();

    // Process categories sequentially to manage memory better
    const categoryConfigs = [
      { name: "HE/SM", type: "single", gender: "M", description: "Men's Singles" },
      { name: "DE/SD", type: "single", gender: "F", description: "Women's Singles" },
      { name: "HD/DM", type: "double", gender: "M", description: "Men's Doubles" },
      { name: "DD", type: "double", gender: "F", description: "Women's Doubles" },
      { name: "GD H/DX M", type: "mix", gender: "M", description: "Mixed Doubles (Men)" },
      { name: "GD D/DX D", type: "mix", gender: "F", description: "Mixed Doubles (Women)" },
    ];

    // Precompute category map for O(1) lookups instead of O(n) find() calls
    const categoryMap = new Map<string, string>(
      (categories || []).map((category) => [category.name, category.code])
    );

    const pointsForCategory = async (
      publication: VisualPublication,
      category: string | null,
      places: Map<string, RankingPlace>,
      newPlayers: Map<string, Player>,
      type: Ranking,
      gender: Gender
    ) => {
      if (!category) {
        this.logger.error(`No category defined?`);
        return;
      }

      const rankingPoints = await this._visualService.getPoints(
        ranking.visualCode,
        publication.code,
        category,
        false // Don't use cache to get fresh data
      );

      const memberIds = rankingPoints?.map(
        (points) => correctWrongPlayers({ memberId: `${points.Player1.MemberID}` }).memberId
      );

      this.logger.debug(
        `Getting ${memberIds?.length} players for ${publication.name} ${type} ${gender}`
      );

      const players = await Player.findAll({
        attributes: ["id", "memberId"],
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
            attributes: ["id", "systemId", "single", "double", "mix"],
          },
        ],
        transaction,
      });

      for (const points of rankingPoints ?? []) {
        const memberId = correctWrongPlayers({
          memberId: `${points.Player1.MemberID}`,
        }).memberId;
        let foundPlayer = players.find((p) => p.memberId === memberId);

        if (!memberId) {
          this.logger.error(
            `No memberId found for ${points.Player1.Name} ${points.Player1.MemberID}`
          );
          continue;
        }

        if (foundPlayer == null) {
          foundPlayer = newPlayers.get(memberId);
        }

        if (foundPlayer == null) {
          this.logger.log("New player");
          const [firstName, ...lastName] = points.Player1.Name.split(" ").filter(Boolean);

          foundPlayer = new Player(
            correctWrongPlayers({
              memberId,
              firstName,
              lastName: lastName.join(" "),
              gender,
            })
          );
          players.push(foundPlayer);

          if (!foundPlayer.memberId) {
            this.logger.error(
              `No memberId found for ${points.Player1.Name} ${points.Player1.MemberID}`
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

    for (const config of categoryConfigs) {
      this.logger.debug(`Getting ${config.description} for ${publication.date.format("LLL")}`);
      await pointsForCategory(
        publication,
        categoryMap.get(config.name) ?? null,
        rankingPlaces,
        newPlayers,
        config.type as Ranking,
        config.gender as Gender
      );

      // Small delay between categories to allow memory cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Create new players first
    this.logger.debug(`Creating ${newPlayers.size} new players`);
    if (newPlayers.size > 0) {
      const newPlayersMap = Array.from(newPlayers).map(([, player]) => player.toJSON());
      await Player.bulkCreate(newPlayersMap, {
        ignoreDuplicates: true,
        transaction,
        returning: false,
      });
    }

    // Process ranking places in very small chunks
    const instances = Array.from(rankingPlaces).map(([, place]) => place.toJSON());
    this.logger.debug(`Creating/updating ${instances.length} ranking places`);

    const chunkSize = 500; // Ultra small chunks to prevent lock exhaustion
    for (let i = 0; i < instances.length; i += chunkSize) {
      const chunk = instances.slice(i, i + chunkSize);

      this.logger.verbose(
        `Processing batch ${Math.floor(i / chunkSize) + 1}/${Math.ceil(instances.length / chunkSize)} (${chunk.length} records)`
      );

      await RankingPlace.bulkCreate(chunk, {
        updateOnDuplicate: [
          "updatePossible",
          "single",
          "singlePoints",
          "singleRank",
          "double",
          "doublePoints",
          "doubleRank",
          "mix",
          "mixPoints",
          "mixRank",
        ],
        transaction,
        returning: false,
      });

      // Longer delay between batches to prevent lock exhaustion
      if (i + chunkSize < instances.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    this.logger.verbose(
      `Finished processing ${instances.length} ranking places for ${publication.name}`
    );

    // Clear memory immediately
    rankingPlaces.clear();
    newPlayers.clear();
  }

  protected queueMissingRankingPlayers(): ProcessStep {
    return new ProcessStep(this.STEP_QUEUE, async (args: { transaction: Transaction }) => {
      const { system } = this.processor.getData<RankingStepData>(this.STEP_RANKING) ?? {};

      const { visiblePublications } =
        this.processor.getData<PublicationStepData>(this.STEP_PUBLICATIONS) ?? {};

      // For now we only check if it's the last update

      const lastPublication = [...(visiblePublications || [])].sort(
        (a, b) => b.date.valueOf() - a.date.valueOf()
      )?.[0];

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
          `Queueing ${playersWithMissingRankings.length} players for ranking creation`
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
            }
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
