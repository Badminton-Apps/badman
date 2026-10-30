import {
  CronJob,
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  Game,
  SubEventCompetition,
} from "@badman/backend-database";
import { getSyncJobOptions, Sync, SyncQueue } from "@badman/backend-queue";
import { InjectQueue, Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job, Queue } from "bull";
import { Op, Sequelize } from "sequelize";
import { startLockRenewal } from "../../utils";
import { isResultAlreadyPresent } from "../enter-scores/enter-scores.errors";
import { isSeasonOpen, oldestOpenSeason } from "../enter-scores/guards";

type RetryOutcome = "queued" | "retried" | "skipped";

@Processor({
  name: SyncQueue,
})
export class RetryFailedEncounterSyncProcessor {
  private readonly logger = new Logger(RetryFailedEncounterSyncProcessor.name);

  constructor(@InjectQueue(SyncQueue) private readonly syncQueue: Queue) {}

  private async removeClosedSeasonJobs(): Promise<void> {
    const failedJobs = (await this.syncQueue.getFailed()).filter(
      (job) => job.name === Sync.EnterScores
    );
    if (failedJobs.length === 0) {
      return;
    }

    const encounters = await EncounterCompetition.findAll({
      where: { id: failedJobs.map((job) => job.data.encounterId) },
      attributes: ["id"],
      include: [
        {
          model: DrawCompetition,
          required: true,
          attributes: ["id"],
          include: [
            {
              model: SubEventCompetition,
              required: true,
              attributes: ["id"],
              include: [{ model: EventCompetition, required: true, attributes: ["id", "season"] }],
            },
          ],
        },
      ],
    });
    const now = new Date();
    const openEncounterIds = new Set(
      encounters
        .filter((encounter) => {
          const season = encounter.drawCompetition?.subEventCompetition?.eventCompetition?.season;
          return season != null && isSeasonOpen(season, now);
        })
        .map((encounter) => encounter.id)
    );

    const closedJobs = failedJobs.filter((job) => !openEncounterIds.has(job.data.encounterId));
    for (const job of closedJobs) {
      await job.remove();
    }
    if (closedJobs.length > 0) {
      this.logger.log(
        `Removed ${closedJobs.length} failed EnterScores jobs of closed seasons or deleted encounters`
      );
    }
  }

  private async requeue(encounter: EncounterCompetition): Promise<RetryOutcome> {
    const encounterId = encounter.id;
    const visualCode = encounter.visualCode;
    const existingJob = await this.syncQueue.getJob(`enter-scores-${encounterId}`);

    if (!existingJob) {
      this.logger.log(
        `Queueing EnterScores retry for encounter ${visualCode} (${encounterId}) — ` +
          `finished: ${encounter.finished}, enteredOn: ${encounter.enteredOn}, scoresSyncedAt: ${encounter.scoresSyncedAt}`
      );
      await this.syncQueue.add(
        Sync.EnterScores,
        { encounterId },
        getSyncJobOptions({ jobId: `enter-scores-${encounterId}` })
      );
      return "queued";
    }

    const state = await existingJob.getState();
    if (state !== "failed") {
      this.logger.debug(
        `Skipping encounter ${visualCode} (${encounterId}) — EnterScores job is ${state}`
      );
      return "skipped";
    }

    if (isResultAlreadyPresent(existingJob.failedReason)) {
      this.logger.debug(
        `Skipping encounter ${visualCode} (${encounterId}) — toernooi.nl already has a result`
      );
      return "skipped";
    }

    // add() is a no-op while a job with the same id exists, so a failed job must be retried.
    this.logger.log(`Retrying failed EnterScores job for encounter ${visualCode} (${encounterId})`);
    await existingJob.retry();
    return "retried";
  }

  @Process({ name: Sync.RetryFailedEncounterSync, concurrency: 1 })
  async retryFailedEncounters(job: Job) {
    this.logger.log("Starting retry of failed encounter score syncs");

    const cronJob = await CronJob.findOne({
      where: {
        "meta.jobName": Sync.RetryFailedEncounterSync,
        "meta.queueName": SyncQueue,
      },
    });

    if (!cronJob) {
      this.logger.error("CronJob record not found for RetryFailedEncounterSync");
      throw new Error("CronJob not found");
    }

    if (cronJob.running) {
      this.logger.log("Job already running, skipping");
      return;
    }

    cronJob.amount = (cronJob.amount ?? 0) + 1;
    await cronJob.save();

    const stopLockRenewal = startLockRenewal(job);

    try {
      await this.removeClosedSeasonJobs();

      const encounters = await this.findFailedEncounters();

      if (encounters.length === 0) {
        this.logger.log("No failed encounter syncs found");
        return;
      }

      this.logger.log(`Found ${encounters.length} encounters with failed score sync`);

      const outcomes: Record<RetryOutcome, number> = { queued: 0, retried: 0, skipped: 0 };
      for (const encounter of encounters) {
        const outcome = await this.requeue(encounter);
        outcomes[outcome] += 1;
      }

      this.logger.log(
        `Retry complete: ${outcomes.queued} queued, ${outcomes.retried} retried, ${outcomes.skipped} skipped`
      );
    } catch (error) {
      this.logger.error("Error during retry of failed encounter syncs", error);
      throw error;
    } finally {
      stopLockRenewal();
      cronJob.amount = (cronJob.amount ?? 1) - 1;
      cronJob.lastRun = new Date();
      await cronJob.save();
      this.logger.log("Finished retry failed encounter sync job");
    }
  }

  private async findFailedEncounters(): Promise<EncounterCompetition[]> {
    const now = new Date();

    const season = oldestOpenSeason(now);

    this.logger.debug(
      `Searching for encounters from season ${season} onwards up to ${now.toISOString()}`
    );

    // The scoresSyncedAt column was added on 2026-03-09. All encounters before that
    // have scoresSyncedAt = null even if they were successfully synced. Only consider
    // encounters updated after the migration to avoid re-syncing historical data.
    const migrationDate = new Date("2026-03-09T00:00:00Z");

    const encounters = await EncounterCompetition.findAll({
      where: {
        [Op.and]: [
          Sequelize.where(Sequelize.col("EncounterCompetition.visualCode"), { [Op.not]: null }),
          Sequelize.where(Sequelize.col("EncounterCompetition.enteredOn"), { [Op.not]: null }),
        ],
        date: { [Op.lt]: now }, // only past encounters
        finished: true,
        scoresSyncedAt: null,
        updatedAt: { [Op.gte]: migrationDate },
      },
      include: [
        {
          model: DrawCompetition,
          required: true,
          attributes: ["id"],
          include: [
            {
              model: SubEventCompetition,
              required: true,
              attributes: ["id", "eventId"],
              include: [
                {
                  model: EventCompetition,
                  required: true,
                  attributes: ["id", "visualCode"],
                  where: { season: { [Op.gte]: season } },
                },
              ],
            },
          ],
        },
        {
          model: Game,
          required: true, // only encounters that actually have games
          attributes: ["id"],
        },
      ],
      attributes: ["id", "visualCode", "date", "finished", "enteredOn", "scoresSyncedAt"],
      limit: 50,
    });

    this.logger.debug(
      `Query returned ${encounters.length} encounters matching criteria: ` +
        `finished=true, enteredOn!=null, scoresSyncedAt=null, has games, open season, past date, updatedAt >= migration (${migrationDate.toISOString()})`
    );

    return encounters;
  }
}
