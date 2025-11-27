import { Sync, SyncQueue } from "@badman/backend-queue";
import { PointsService } from "@badman/backend-ranking";
import { VisualService, XmlTournament, XmlTournamentTypeID } from "@badman/backend-visual";
import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { Sequelize } from "sequelize-typescript";
import { CompetitionSyncer } from "./competition-sync";
import { TournamentSyncer } from "./tournament-sync";
import moment from "moment";
import { NotificationService } from "@badman/backend-notifications";
import { CronJob, EventCompetition, EventTournament } from "@badman/backend-database";
import { SyncEventJobData } from "./types";

@Processor({
  name: SyncQueue,
})
export class SyncEventsProcessor {
  private _competitionSync: CompetitionSyncer;
  private _tournamentSync: TournamentSyncer;

  private readonly logger = new Logger(SyncEventsProcessor.name);
  private formats = [
    "https://www.toernooi.nl/sport/league?id=",
    "https://www.badmintonvlaanderen.be/sport/tournament?id=",
    "https://www.toernooi.nl/tournament/",
    "https://www.badmintonvlaanderen.be/tournament/",
  ];

  constructor(
    pointService: PointsService,
    private notificationService: NotificationService,
    private visualService: VisualService,
    private _sequelize: Sequelize
  ) {
    this._competitionSync = new CompetitionSyncer(this.visualService, pointService);
    this._tournamentSync = new TournamentSyncer(this.visualService, pointService);
  }

  @Process({
    name: Sync.SyncEvents,
  })
  async syncEvents(job: Job<SyncEventJobData>) {
    const cronJob = await CronJob.findOne({
      where: {
        "meta.jobName": Sync.SyncEvents,
        "meta.queueName": SyncQueue,
      },
    });

    if (!cronJob) {
      throw new Error("Job not found");
    }

    cronJob.amount++;
    await cronJob.save();

    try {
      const { search, id: eventId, date, startDate } = job.data;
      let newEvents = await this.fetchEventsFromJobData({
        search,
        eventId,
        date,
        lastRun: cronJob.lastRun,
      });

      newEvents = newEvents.sort((a, b) => moment(a.StartDate).diff(moment(b.StartDate)));

      this.logger.verbose(`Found ${newEvents.length} new events`);

      if (startDate) {
        newEvents = newEvents.filter((e) => moment(e.StartDate).isSameOrAfter(startDate));
        this.logger.verbose(`Found ${newEvents.length} new events after ${startDate}`);
      }

      const { offset = 0, limit, skip = [], only = [] } = job.data;

      // Ensure offset doesn't exceed array bounds
      const safeOffset = Math.min(offset, newEvents.length);
      const toProcess = limit ? Math.min(safeOffset + limit, newEvents.length) : newEvents.length;

      this.logger.debug(`Processing ${toProcess} events (offset: ${safeOffset})`);

      for (let i = safeOffset; i < toProcess; i++) {
        const xmlTournament = newEvents[i];
        const current = i + 1;
        const percent = Math.round((current / toProcess) * 10000) / 100;
        job.progress(percent);
        this.logger.debug(`Processing ${xmlTournament?.Name}, ${percent}% (${i}/${toProcess})`);

        // Skip certain event
        if (skip.includes(xmlTournament?.Name)) {
          continue;
        }

        // Only process certain events
        if (!only.includes(xmlTournament?.Name)) {
          continue;
        }

        await this.handleNewEvent(xmlTournament, skip, job.data);
      }
    } catch (e) {
      this.logger.error("Error", e);

      throw e;
    } finally {
      cronJob.amount--;
      cronJob.lastRun = new Date();
      await cronJob.save();
    }

    this.logger.log("Finished sync of Visual scores");
  }

  /**
   * Fetches events from the Visual service based on job data.
   * Supports three modes:
   * - Search: searches for events by search term
   * - Event IDs: fetches specific events by their IDs
   * - Changed events: fetches events that changed since a given date
   */
  private async fetchEventsFromJobData(params: {
    search?: string;
    eventId?: string | string[];
    date?: Date;
    lastRun?: Date;
  }): Promise<XmlTournament[]> {
    const { search, eventId, date, lastRun } = params;
    let events: XmlTournament[] = [];

    if (search?.length > 0) {
      events = await this.visualService.searchEvents(search);
    } else if (eventId?.length > 0) {
      const jobEventIds = Array.isArray(eventId) ? eventId : [eventId];

      const eventPromises = jobEventIds.map(async (id) => {
        const processedId = this.removeFormatPrefix(id);
        return this.visualService.getEvent(processedId);
      });

      const eventResults = await Promise.all(eventPromises);
      events = eventResults.flat();
    } else {
      // Fetch events that changed since the given date (or last run if no date provided)
      const newDate = moment(date ?? lastRun);
      const changedEvents = await this.visualService.getChangeEvents(newDate);
      events = changedEvents ?? [];
    }

    return events;
  }

  /**
   * Handles processing a single event tournament.
   * Creates a transaction, syncs the event (competition or tournament),
   * commits the transaction, and sends notifications.
   */
  private async handleNewEvent(
    xmlTournament: XmlTournament,
    skip: string[],
    jobData: SyncEventJobData
  ): Promise<void> {
    // Check if we should skip this event type before creating a transaction
    const isCompetitionType =
      xmlTournament.TypeID === XmlTournamentTypeID.OnlineLeague ||
      xmlTournament.TypeID === XmlTournamentTypeID.TeamTournament;

    if (isCompetitionType && skip.includes("competition")) {
      return;
    }
    if (!isCompetitionType && skip.includes("tournament")) {
      return;
    }

    const transaction = await this._sequelize.transaction();
    let transactionRolledBack = false;

    try {
      let resultData: { event: EventCompetition | EventTournament } | null = null;
      if (isCompetitionType) {
        // // National is a bit different have to lookinto, temp skip
        // if (xmlTournament?.Name?.includes('Victor League')) {
        //   continue;
        // }

        resultData = (await this._competitionSync.process({
          transaction,
          xmlTournament,
          options: { ...jobData },
        })) as { event: EventCompetition };
      } else {
        resultData = (await this._tournamentSync.process({
          transaction,
          xmlTournament,
          options: { ...jobData },
        })) as { event: EventTournament };
      }

      this.logger.debug(`Committing transaction`);
      await transaction.commit();
      this.logger.log(`Finished ${xmlTournament?.Name}`);

      await this.sendSyncNotifications(jobData.userId, resultData?.event, true);
    } catch (e) {
      this.logger.error("Rollback", e);

      // Safely rollback the transaction - wrap in try-catch to prevent errors during rollback
      if (!transactionRolledBack) {
        try {
          await transaction.rollback();
          transactionRolledBack = true;
        } catch (rollbackError) {
          // Transaction may have already been rolled back or finished
          this.logger.warn(
            "Transaction rollback failed (may already be rolled back)",
            rollbackError
          );
          transactionRolledBack = true;
        }
      }

      await this.sendSyncNotifications(
        jobData.userId,
        { name: xmlTournament.Name } as EventTournament,
        false
      );

      // Re-throw the original error
      throw e;
    }
  }

  /**
   * Sends sync completion notifications to users.
   */
  private async sendSyncNotifications(
    userId: string | string[] | undefined,
    event: EventCompetition | EventTournament | undefined,
    success: boolean
  ): Promise<void> {
    if (!userId) {
      return;
    }

    const userIds = Array.isArray(userId) ? userId : [userId];
    const notificationPromises = userIds.map((uid) => {
      return this.notificationService.notifySyncFinished(uid, {
        event,
        success,
      });
    });
    await Promise.all(notificationPromises);
  }

  /**
   * Removes the format prefix from an event ID if it exists.
   * Returns the ID without the prefix, or the original ID if no prefix matches.
   */
  private removeFormatPrefix(id: string): string {
    for (const format of this.formats) {
      if (id.startsWith(format)) {
        return id.replace(format, "");
      }
    }
    return id;
  }
}
