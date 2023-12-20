import {
  EncounterCompetition,
  Game,
  Player,
  DrawCompetition,
  SubEventCompetition,
  EventCompetition,
} from '@badman/backend-database';
import { accepCookies, getBrowser, signIn } from '@badman/backend-pupeteer';
import { SyncQueue, Sync } from '@badman/backend-queue';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import {
  enterEditMode,
  clearFields,
  selectPlayer,
  enterScores,
  enterEndHour,
  enterGameLeader,
  enterShuttle,
  enterStartHour,
} from './pupeteer';

@Processor({
  name: SyncQueue,
})
export class EnterScoresProcessor {
  private readonly logger = new Logger(EnterScoresProcessor.name);
  private readonly _username?: string;
  private readonly _password?: string;

  constructor(configService: ConfigService<ConfigType>) {
    this._username = configService.get('VR_API_SCORE_USER');
    this._password = configService.get('VR_API_SCORE_PASS');

    this.logger.debug('Enter scores processor initialized');
  }

  @Process(Sync.EnterScores)
  async enterScores(job: Job<{ encounterId: string }>) {
    if (!this._username || !this._password) {
      this.logger.error('No username or password found');
      return;
    }

    this.logger.log('Syncing encounters');
    const encounterId = job.data.encounterId;

    this.logger.debug('Creating browser');
    const browser = await getBrowser();

    try {
      const page = await browser.newPage();

      if (!page) {
        this.logger.error('No page found');
        return;
      }

      page.setDefaultTimeout(10000);
      await page.setViewport({ width: 1691, height: 1337 });

      this.logger.debug('Getting encounter');
      const encounter = await EncounterCompetition.findByPk(encounterId, {
        attributes: ['id', 'visualCode', 'shuttle', 'startHour', 'endHour'],
        include: [
          {
            attributes: [
              'id',
              'visualCode',
              'order',
              'set1Team1',
              'set1Team2',
              'set2Team1',
              'set2Team2',
              'set3Team1',
              'set3Team2',
            ],
            model: Game,
            include: [
              {
                attributes: ['id', 'memberId'],
                model: Player,
              },
            ],
          },
          {
            attributes: ['id'],
            model: DrawCompetition,
            include: [
              {
                attributes: ['id'],
                model: SubEventCompetition,
                include: [
                  {
                    attributes: ['id', 'visualCode'],
                    model: EventCompetition,
                  },
                ],
              },
            ],
          },
          {
            model: Player,
            as: 'gameLeader',
          },
        ],
      });

      if (!encounter) {
        this.logger.error(`Encounter ${encounterId} not found`);
        return;
      }

      this.logger.log(`Entering scores for ${encounter.visualCode}`);

      await accepCookies({ page });
      this.logger.debug(`Signing in as ${this._username}`);
      await signIn({ page }, this._username, this._password);

      this.logger.debug(`Entering edit mode`);
      await enterEditMode({ page }, encounter);

      this.logger.debug(`Clearing fields`);
      await clearFields({ page });

      for (const game of encounter.games ?? []) {
        if (!game?.visualCode) {
          this.logger.error(`Game ${game.order} has no visualCode, skipping`);
          continue;
        }

        this.logger.debug(`Processing game ${game.order}`);
        const t1p1 = game.players?.find(
          (p) =>
            p.GamePlayerMembership.team === 1 &&
            p.GamePlayerMembership.player === 1
        );
        if (t1p1) {
          if (!t1p1.memberId) {
            this.logger.error(
              `Player ${t1p1.fullName} has no memberId, skipping`
            );
            continue;
          }
          await selectPlayer({ page }, t1p1.memberId, 't1p1', game.visualCode);
        }

        const t1p2 = game.players?.find(
          (p) =>
            p.GamePlayerMembership.team === 1 &&
            p.GamePlayerMembership.player === 2
        );
        if (t1p2) {
          if (!t1p2.memberId) {
            this.logger.error(
              `Player ${t1p2.fullName} has no memberId, skipping`
            );
            continue;
          }
          await selectPlayer({ page }, t1p2.memberId, 't1p2', game.visualCode);
        }

        const t2p1 = game.players?.find(
          (p) =>
            p.GamePlayerMembership.team === 2 &&
            p.GamePlayerMembership.player === 1
        );
        if (t2p1) {
          if (!t2p1.memberId) {
            this.logger.error(
              `Player ${t2p1.fullName} has no memberId, skipping`
            );
            continue;
          }
          await selectPlayer({ page }, t2p1.memberId, 't2p1', game.visualCode);
        }

        const t2p2 = game.players?.find(
          (p) =>
            p.GamePlayerMembership.team === 2 &&
            p.GamePlayerMembership.player === 2
        );
        if (t2p2) {
          if (!t2p2.memberId) {
            this.logger.error(
              `Player ${t2p2.fullName} has no memberId, skipping`
            );
            continue;
          }
          await selectPlayer({ page }, t2p2.memberId, 't2p2', game.visualCode);
        }

        if (game.set1Team1 && game.set1Team2) {
          await enterScores(
            { page },
            1,
            `${game.set1Team1}-${game.set1Team2}`,
            game.visualCode
          );
        }

        if (game.set2Team1 && game.set2Team2) {
          await enterScores(
            { page },
            2,
            `${game.set2Team1}-${game.set2Team2}`,
            game.visualCode
          );
        }

        if (game.set3Team1 && game.set3Team2) {
          await enterScores(
            { page },
            3,
            `${game.set3Team1}-${game.set3Team2}`,
            game.visualCode
          );
        }
      }

      if (encounter.gameLeader?.fullName) {
        this.logger.debug(
          `Entering game leader ${encounter.gameLeader?.fullName}`
        );
        await enterGameLeader({ page }, encounter.gameLeader?.fullName);
      }

      if (encounter.shuttle) {
        this.logger.debug(`Entering shuttle ${encounter.shuttle}`);
        await enterShuttle({ page }, encounter.shuttle);
      }

      if (encounter.startHour) {
        this.logger.debug(`Entering start hour ${encounter.startHour}`);
        await enterStartHour({ page }, encounter.startHour);
      }

      if (encounter.endHour) {
        this.logger.debug(`Entering end hour ${encounter.endHour}`);
        await enterEndHour({ page }, encounter.endHour);
      }

      // await browser.close();
    } catch (error) {
      // await browser.close();
      this.logger.error(error);
    } finally {
      // this.running = false;
      // await browser.close();
    }
  }
}
