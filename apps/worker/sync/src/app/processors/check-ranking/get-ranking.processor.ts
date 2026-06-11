import {
  Player,
  RankingPlace,
  RankingPlaceWriterService,
  RankingSystem,
} from "@badman/backend-database";
import { acceptCookies, getPage, selectBadmninton } from "@badman/backend-pupeteer";
import { Sync, SyncQueue } from "@badman/backend-queue";
import { Process, Processor } from "@nestjs/bull";
import { Logger, NotFoundException } from "@nestjs/common";
import { Job } from "bull";
import { Page } from "puppeteer";
import { getRanking, getViaRanking, searchPlayer } from "./pupeteer";

@Processor({
  name: SyncQueue,
})
export class CheckRankingProcessor {
  private readonly logger = new Logger(CheckRankingProcessor.name);

  constructor(private readonly writer: RankingPlaceWriterService) {
    this.logger.debug("Check ranking initialized");
  }

  @Process({
    name: Sync.CheckRanking,
    concurrency: 1,
  })
  async syncRankingJob(job: Job<{ playerId: string }>): Promise<void> {
    await this.syncRanking(job.data.playerId);
  }

  async syncRanking(playerId: string): Promise<void> {
    let page: Page | undefined;

    const player = await Player.findByPk(playerId);
    if (!player) {
      throw new NotFoundException(`${Player.name}: ${playerId} not found`);
    }

    this.logger.debug(`Syncing ranking for ${player.fullName} (${player.memberId})`);
    const primary = await RankingSystem.findOne({
      where: {
        primary: true,
      },
    });

    if (!primary) {
      throw new NotFoundException(`${RankingSystem.name}: primary not found`);
    }

    if (!player.memberId) {
      this.logger.warn(`Player ${player.fullName} has no memberId`);
      return;
    }

    // Find all ranking places for fill-from-previous (last known values)
    const rankingPlaces = await RankingPlace.findAll({
      where: {
        systemId: primary.id,
        playerId: player.id,
      },
      order: [["rankingDate", "DESC"]],
    });

    if (rankingPlaces.length === 0) {
      this.logger.warn(`Player ${player.fullName} has no ranking`);
      return;
    }

    try {
      // Create browser
      page = await getPage();
      page.setDefaultTimeout(10000);
      await page.setViewport({ width: 1691, height: 1337 });

      // Accept cookies
      await acceptCookies({ page }, { logger: this.logger });
      await selectBadmninton({ page });

      // Processing player: try the direct ranking-page route first
      let single: number | undefined;
      let double: number | undefined;
      let mix: number | undefined;

      const result = await getViaRanking({ page }, player);

      if (result) {
        // getViaRanking navigated to the player's profile page — now extract ranking
        // Bug fix (D3.1): the old code never called getRanking here, leaving single/double/mix unassigned.
        try {
          const ranking = await getRanking({ page, timeout: 2000 });
          if (ranking.single) single = ranking.single;
          if (ranking.double) double = ranking.double;
          if (ranking.mix) mix = ranking.mix;
        } catch {
          this.logger.debug(
            `getViaRanking navigation succeeded but getRanking failed — will try search route`
          );
        }
      }

      // Fall back to search-by-player-links route if the direct route yielded nothing
      if (!single && !double && !mix) {
        const links = await searchPlayer({ page }, player);
        if (links.length === 0) {
          this.logger.warn(`Player ${player.fullName} not found`);
          return;
        }

        for (const url of links) {
          await page.goto(`https://www.toernooi.nl/${url}`);
          try {
            const ranking = await getRanking({ page, timeout: 200 });
            if (ranking.single) single = ranking.single;
            if (ranking.double) double = ranking.double;
            if (ranking.mix) mix = ranking.mix;
            break;
          } catch (error) {
            continue;
          }
        }
      }

      // Bug fix (D3.1 / FR-005): only skip when ZERO categories were found.
      // Partial results are acceptable — fill from last-known before derivation.
      const foundCount = [single, double, mix].filter(Boolean).length;
      if (foundCount === 0) {
        this.logger.warn(
          `No ranking categories found for ${player.fullName} — skipping (cannot derive from nothing)`
        );
        return;
      }

      this.logger.debug(
        `Setting ranking for ${player.fullName}: single=${single ?? "last-known"} double=${double ?? "last-known"} mix=${mix ?? "last-known"}`
      );

      // Route through writer — fills missing categories from last-known values,
      // applies getRankingProtected, updates rows newest-first, propagates snapshot.
      await this.writer.updateForPlayer(
        player.id,
        primary,
        { single, double, mix },
        { propagateGameMemberships: true }
      );
    } catch (error) {
      this.logger.error(error);
      this.logger.error(`Error while processing player ${player.fullName}`);
    } finally {
      try {
        if (page) {
          await page.close();
          this.logger.debug(`Synced ${player.fullName}`);
        }
      } catch (error) {
        this.logger.error("Error during browser cleanup:", error);
      }
    }
  }
}
