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
import { oldestOpenSeason } from "../enter-scores/guards";

@Processor({
  name: SyncQueue,
})
export class RetryFailedEncounterSyncProcessor {
  private readonly logger = new Logger(RetryFailedEncounterSyncProcessor.name);

  constructor(@InjectQueue(SyncQueue) private readonly syncQueue: Queue) {}

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
      const encounters = await this.findFailedEncounters();

      if (encounters.length === 0) {
        this.logger.log("No failed encounter syncs found");
        return;
      }

      this.logger.log(`Found ${encounters.length} encounters with failed score sync`);

      let queued = 0;
      let skipped = 0;

      for (const encounter of encounters) {
        const encounterId = encounter.id;
        const visualCode = encounter.visualCode;
        const jobId = `enter-scores-${encounterId}`;

        // Check if there's already an active/waiting EnterScores job for this encounter
        const existingJobs = await this.syncQueue.getJobs(["active", "waiting"]);
        const alreadyQueued = existingJobs.some(
          (j) => j.name === Sync.EnterScores && j.data?.encounterId === encounterId
        );

        if (alreadyQueued) {
          this.logger.debug(
            `Skipping encounter ${visualCode} (${encounterId}) — EnterScores job already queued`
          );
          skipped++;
          continue;
        }

        this.logger.log(
          `Queueing EnterScores retry for encounter ${visualCode} (${encounterId}) — ` +
            `finished: ${encounter.finished}, enteredOn: ${encounter.enteredOn}, scoresSyncedAt: ${encounter.scoresSyncedAt}`
        );

        await this.syncQueue.add(Sync.EnterScores, { encounterId }, getSyncJobOptions({ jobId }));

        queued++;
      }

      this.logger.log(
        `Retry complete: ${queued} encounters queued for re-sync, ${skipped} skipped (already queued)`
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
