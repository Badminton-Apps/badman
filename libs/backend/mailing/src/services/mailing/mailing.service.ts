import { CompileOptions, CompileService } from '@badman/backend-compile';
import {
  Club,
  Comment,
  EncounterChange,
  EncounterCompetition,
  EventCompetition,
  EventTournament,
  Location,
  Player,
  Team,
} from '@badman/backend-database';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { writeFile } from 'fs/promises';
import moment from 'moment-timezone';
import nodemailer, { Transporter } from 'nodemailer';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class MailingService {
  private readonly logger = new Logger(MailingService.name);
  private _transporter?: Transporter;
  private _mailingEnabled = false;
  private initialized = false;

  private subjectPrefix = '';

  constructor(
    private compileService: CompileService,
    private configService: ConfigService
  ) {
    this.subjectPrefix =
      this.configService.get<string>('MAIL_SUBJECT_PREFIX') || '';
  }

  async sendTestMail() {
    const glenn = await Player.findOne({ where: { slug: 'glenn-latomme' } });

    await this._sendMail({
      from: 'info@badman.app',
      to: 'glenn.latomme@gmail.com',
      subject: 'Test mail 2',
      template: 'test',
      context: {
        settingsSlug: glenn?.slug,
      },
    } as MailOptions<{
      settingsSlug: string;
    }>);
  }

  async sendRequestMail(
    changeRequest: EncounterChange,
    homeTeamRequests: boolean
  ) {
    const encounter = await changeRequest.getEncounter({
      include: [
        {
          model: Team,
          as: 'home',
          include: [{ model: Player, as: 'captain' }],
        },
        {
          model: Team,
          as: 'away',
          include: [{ model: Player, as: 'captain' }],
        },
      ],
    });

    const otherTeam = homeTeamRequests ? encounter.away : encounter.home;
    const clubTeam = homeTeamRequests ? encounter.home : encounter.away;

    if (!otherTeam || !clubTeam) {
      throw new Error('Team not found');
    }

    const sendMail = async (team: Team, captain: Player, template: string) => {
      moment.locale('nl-be');
      const options = {
        from: 'info@badman.app',
        to: team.email,
        subject: `Verplaatsings aanvraag ${encounter.home?.name} vs ${encounter.away?.name}`,
        template,
        context: {
          captain: captain.toJSON(),
          otherTeam: otherTeam?.toJSON(),
          clubTeam: clubTeam?.toJSON(),
          encounter: encounter.toJSON(),
          date: moment(encounter.date).tz('Europe/Brussels').format('LLLL'),
          settingsSlug: captain.slug,
        },
      } as MailOptions<{
        captain: Player;
        otherTeam: Team;
        clubTeam: Team;
        encounter: EncounterCompetition;
        date: string;
        settingsSlug: string;
      }>;

      await this._sendMail(options);
    };

    if (otherTeam.captain) {
      // Send mail to the other team
      await sendMail(otherTeam, otherTeam.captain, 'encounterchange');
    }

    if (clubTeam.captain) {
      // Send mail to the requester
      await sendMail(clubTeam, clubTeam.captain, 'encounterchange-requester');
    }
  }

  async sendRequestFinishedMail(changeRequest: EncounterChange) {
    const encounter = await changeRequest.getEncounter({
      include: [
        {
          model: Team,
          as: 'home',
          include: [{ model: Player, as: 'captain' }],
        },
        {
          model: Team,
          as: 'away',
          include: [{ model: Player, as: 'captain' }],
        },
      ],
    });

    if (!encounter.home || !encounter.away) {
      throw new Error('Team not found');
    }

    const sendMail = async (team: Team, captain: Player) => {
      moment.locale('nl-be');
      const options = {
        from: 'info@badman.app',
        to: team.email,
        subject: `Verplaatsings aanvraag ${encounter.home?.name} vs ${encounter.away?.name} afgewerkt`,
        template: 'encounterchangefinished',
        context: {
          captain: captain.toJSON(),
          team: team.toJSON(),
          encounter: encounter.toJSON(),
          newDate: moment(encounter.date).tz('Europe/Brussels').format('LLLL'),
          settingsSlug: captain.slug,
        },
      } as MailOptions<{
        captain: Player;
        team: Team;
        encounter: EncounterCompetition;
        newDate: string;
        settingsSlug: string;
      }>;

      await this._sendMail(options);
    };
    if (encounter.home.captain) {
      await sendMail(encounter.home, encounter.home.captain);
    }
    if (encounter.away.captain) {
      await sendMail(encounter.away, encounter.away.captain);
    }
  }

  async sendNotEnterdMail(
    to: {
      fullName: string;
      email: string;
      slug: string;
    },
    encounter: EncounterCompetition,
    url: string
  ) {
    moment.locale('nl-be');
    const options = {
      from: 'info@badman.app',
      to: to.email,
      subject: `Niet ingegeven resultaat ${encounter.home?.name} vs ${encounter.away?.name}`,
      template: 'notentered',
      context: {
        encounter: encounter.toJSON(),
        url,
        captain: to.fullName,
        date: moment(encounter.date).tz('Europe/Brussels').format('LLLL'),
        settingsSlug: to.slug,
      },
    } as MailOptions<{
      encounter: EncounterCompetition;
      url: string;
      captain: string;
      date: string;
      settingsSlug: string;
    }>;

    await this._sendMail(options);
  }

  async sendNotAcceptedMail(
    to: {
      fullName: string;
      email: string;
      slug: string;
    },
    encounter: EncounterCompetition,
    url: string
  ) {
    moment.locale('nl-be');
    const options = {
      from: 'info@badman.app',
      to: to.email,
      subject: `Niet geaccepteerd resultaat ${encounter.home?.name} vs ${encounter.away?.name}`,
      template: 'notaccepted',
      context: {
        encounter: encounter.toJSON(),
        url,
        captain: to.fullName,
        date: moment(encounter.date).tz('Europe/Brussels').format('LLLL'),
        settingsSlug: to.slug,
      },
    } as MailOptions<{
      encounter: EncounterCompetition;
      url: string;
      captain: string;
      date: string;
      settingsSlug: string;
    }>;

    await this._sendMail(options);
  }

  async sendEnrollmentMail(
    to: {
      fullName: string;
      email: string;
      slug: string;
    },
    club: Club,
    locations: Location[],
    comments: Comment[]
  ) {
    moment.locale('nl-be');
    const options = {
      from: 'info@badman.app',
      to: to.email,
      cc: 'jeroen@badmintonvlaanderen.be',
      subject: `Inschrijving ${club.name}`,
      template: 'clubenrollment',
      context: {
        club: club.toJSON(),
        locations: locations.map((l) => l.toJSON()),
        comments: comments.map((c) => c.toJSON()),
        settingsSlug: to.slug,
      },
    } as MailOptions<{
      club: Club;
      locations: Location[];
      comments: Comment[];
      settingsSlug: string;
    }>;

    await this._sendMail(options);
  }

  async sendSyncMail(
    to: {
      fullName: string;
      email: string;
      slug: string;
    },
    event: EventCompetition | EventTournament,
    success: boolean,
    url?: string
  ) {
    moment.locale('nl-be');
    const options = {
      from: 'info@badman.app',
      to: to.email,
      subject: `Synchronisatie ${event.name} was ${
        success ? 'succesvol' : 'niet succesvol'
      }`,
      template: 'syncFinished',
      context: {
        event: event.toJSON(),
        url,
        success,
        user: to.fullName,
        settingsSlug: to.slug,
      },
    } as MailOptions<{
      event: EventCompetition;
      url?: string;
      success: boolean;
      user: string;
      settingsSlug: string;
    }>;

    await this._sendMail(options);
  }

  private async _setupMailing() {
    if (this.initialized) return;
    if ((this.configService.get<boolean>('MAIL_ENABLED') ?? false) == false) {
      return;
    }

    const mailConfig = {
      host: this.configService.get('MAIL_HOST'),
      port: 465,
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASS'),
      },
    };

    try {
      this._transporter = nodemailer.createTransport(mailConfig);

      const verified = await this._transporter.verify();

      if (!verified) {
        this._mailingEnabled = false;
        this.logger.warn('Mailing disabled due to config setup failing');
        return;
      }

      this._transporter.use('compile', (mail: any, callback) => {
        const template = mail.data.template;
        const context = mail.data.context;
        lastValueFrom(
          this.compileService.toHtml(template, {
            locals: context,
          })
        ).then((html) => {
          mail.data.html = html;
          callback();
        });
      });

      this._mailingEnabled = true;
      this.initialized = true;
    } catch (e) {
      this._mailingEnabled = false;
      this.logger.debug({
        message: 'Mailing not enabled',
        error: e,
        mailConfig,
      });

      this.logger.warn('Mailing disabled due to config setup failing', e);
    } finally {
      this.logger.debug(`Mailing enabled: ${this._mailingEnabled}`);
    }
  }

  private async _sendMail<T>(options: MailOptions<T>) {
    await this._setupMailing();

    // Append subject prefix
    if (this.subjectPrefix) {
      options.subject = `${this.subjectPrefix} ${options.subject}`;
    }

    try {
      // add clientUrl to context
      options.context.clientUrl = this.configService.get('CLIENT_URL') ?? '';
      if (this._mailingEnabled === false) {
        this.logger.debug('Mailing disabled', { data: options });
        const compiled = await lastValueFrom(
          this.compileService.toHtml(
            options.template,
            options.context as CompileOptions
          )
        );

        if (process.env.NODE_ENV === 'development') {
          await writeFile(`${options.template}.html`, compiled);
        }

        return;
      }

      if (this.configService.get('NODE_ENV') !== 'production') {
        // Check if the to is filled in
        options.to = Array.isArray(options.to) ? options.to : [options.to];
        if (options.to === null || options.to.length === 0) {
          this.logger.error('no mail adress?', { error: options });
          return;
        }
        const to = options.to ?? [];
        const cc = (
          Array.isArray(options.cc) ? options.cc : [options.cc] ?? []
        ) as string[];
        options.to = ['glenn.latomme@gmail.com'];
        options.cc = [];

        options.subject += ` overwritten email original(to: ${to?.join(
          ','
        )}, cc: ${cc.join(',')}) `;
      }

      await this._transporter?.sendMail(options);
      // this.logger.debug('Message sent: %s', info.messageId);
      // this.logger.debug('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      this.logger.debug(`Message sent: ${options.subject}, to: ${options.to}`);
    } catch (e) {
      this.logger.error(e);
      this.logger.error('Hello', e);
    }
  }
}

interface MailOptions<T> {
  from: string;
  to: string | string[];
  cc: string | string[];
  subject: string;
  template: string;
  context: T & { clientUrl: string };
}
