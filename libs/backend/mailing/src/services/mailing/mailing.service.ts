import { EncounterValidationOutput } from '@badman/backend-change-encounter';
import { CompileOptions, CompileService } from '@badman/backend-compile';
import {
  Club,
  Comment,
  EncounterCompetition,
  EventCompetition,
  EventTournament,
  Location,
  Player,
  SubEventCompetition,
} from '@badman/backend-database';
import { ConfigType } from '@badman/utils';
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
    private configService: ConfigService<ConfigType>,
  ) {
    this.subjectPrefix = this.configService.get<string>('MAIL_SUBJECT_PREFIX') || '';
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

  async sendNewRequestMail(
    to: {
      fullName: string;
      email: string;
      slug: string;
    },
    encounter: EncounterCompetition,
    isHome: boolean,
  ) {
    // fetch event
    const event = await encounter.getDrawCompetition({
      attributes: ['id'],
      include: [
        {
          model: SubEventCompetition,
          attributes: ['id'],
          include: [
            {
              model: EventCompetition,
              attributes: ['id', 'season'],
            },
          ],
        },
      ],
    });

    const eventCompetition = event?.subEventCompetition?.eventCompetition as EventCompetition;

    moment.locale('nl-be');
    const options = {
      from: 'info@badman.app',
      to: to.email,
      subject: `Aanvraag voor ontmoeting tussen ${encounter.home?.name} en ${encounter.away?.name}`,
      template: 'encounterchange',
      context: {
        captain: to.fullName,
        isHome,
        season: eventCompetition.season,
        encounter: {
          ...encounter.toJSON(),
          home: encounter.home?.toJSON(),
          away: encounter.away?.toJSON(),
        },
        settingsSlug: to.slug,
      },
    } as MailOptions<{
      captain: string;
      isHome: boolean;
      season: number;
      isChangedLocation: boolean;
      encounter: EncounterCompetition;
      settingsSlug: string;
    }>;

    await this._sendMail(options);
  }

  async sendConfirmationRequestMail(
    to: {
      fullName: string;
      email: string;
      slug: string;
    },
    encounter: EncounterCompetition,
    isHome: boolean,
  ) {
    // fetch event
    const event = await encounter.getDrawCompetition({
      attributes: ['id'],
      include: [
        {
          model: SubEventCompetition,
          attributes: ['id'],
          include: [
            {
              model: EventCompetition,
              attributes: ['id', 'season'],
            },
          ],
        },
      ],
    });

    const eventCompetition = event?.subEventCompetition?.eventCompetition as EventCompetition;
    moment.locale('nl-be');
    const options = {
      from: 'info@badman.app',
      to: to.email,
      subject: `Aanvraag voor ontmoeting tussen ${encounter.home?.name} en ${encounter.away?.name}`,
      template: 'encounterchange',
      context: {
        captain: to.fullName,
        isHome,
        season: eventCompetition.season,
        encounter: {
          ...encounter.toJSON(),
          home: encounter.home?.toJSON(),
          away: encounter.away?.toJSON(),
        },
        settingsSlug: to.slug,
      },
    } as MailOptions<{
      captain: string;
      isHome: boolean;
      season: number;
      isChangedLocation: boolean;
      encounter: EncounterCompetition;
      settingsSlug: string;
    }>;

    await this._sendMail(options);
  }

  async sendRequestFinishedMail(
    to: {
      fullName: string;
      email: string;
      slug: string;
    },
    encounter: EncounterCompetition,
    isHome: boolean,
    isChangedLocation: boolean,
    validation: {
      encounter: EncounterCompetition;
      errors: string[];
    }[],
  ) {
    if (!encounter.home || !encounter.away) {
      throw new Error('Team not found');
    }
    // fetch event
    const event = await encounter.getDrawCompetition({
      attributes: ['id'],
      include: [
        {
          model: SubEventCompetition,
          attributes: ['id'],
          include: [
            {
              model: EventCompetition,
              attributes: ['id', 'season'],
            },
          ],
        },
      ],
    });

    const eventCompetition = event?.subEventCompetition?.eventCompetition as EventCompetition;

    // mail to captain
    moment.locale('nl-be');
    const options = {
      from: 'info@badman.app',
      to: to.email,
      subject: `Verplaatsings aanvraag ${encounter.home?.name} en ${encounter.away?.name} afgewerkt`,
      template: 'encounterchangefinished',
      context: {
        captain: to.fullName,
        isHome,
        isChangedLocation,
        season: eventCompetition.season,
        validation: validation?.map((v) => ({
          encounter: v.encounter.toJSON(),
          errors: v.errors,
        })),
        encounter: {
          ...encounter.toJSON(),
          home: encounter.home.toJSON(),
          away: encounter.away.toJSON(),
        },
        newDate: moment(encounter.date).tz('Europe/Brussels').format('LLLL'),
        settingsSlug: to.slug,
      },
    } as MailOptions<{
      captain: string;
      isHome: boolean;
      season: number;
      isChangedLocation: boolean;
      encounter: EncounterCompetition;
      newDate: string;
      settingsSlug: string;
      validation: {
        encounter: EncounterCompetition;
        errors: string[];
      }[];
    }>;

    await this._sendMail(options);
  }

  async sendLocationChangedMail(encounter: EncounterCompetition) {
    // fetch event
    const event = await encounter.getDrawCompetition({
      attributes: ['id'],
      include: [
        {
          model: SubEventCompetition,
          attributes: ['id'],
          include: [
            {
              model: EventCompetition,
              attributes: ['id', 'slug', 'visualCode', 'season', 'name'],
            },
          ],
        },
      ],
    });

    const location = await encounter.getLocation();

    const eventCompetition = event?.subEventCompetition?.eventCompetition as EventCompetition;

    //  mail to reponsible
    moment.locale('nl-be');
    const optionsMailResp = {
      from: 'info@badman.app',
      to: eventCompetition.contactEmail,
      subject: `Verplaatsings ${encounter.home?.name} en ${encounter.away?.name} heeft andere locatie`,
      template: 'location-change',
      context: {
        encounter: {
          ...encounter.toJSON(),
          home: encounter.home?.toJSON(),
          away: encounter.away?.toJSON(),
          location: location?.toJSON(),
        },
        event: eventCompetition.toJSON(),
      },
    } as MailOptions<{
      encounter: EncounterCompetition;
      event: EventCompetition;
    }>;

    await this._sendMail(optionsMailResp);
  }

  async sendNotEnterdMail(
    to: {
      fullName: string;
      email: string;
      slug: string;
    },
    encounter: EncounterCompetition,
    url: string,
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

  
  async sendHasCommentMail(
    to: {
      fullName: string;
      email: string;
      slug: string;
    },
    encounter: EncounterCompetition,
    url: string,
  ) {
    moment.locale('nl-be');
    const options = {
      from: 'info@badman.app',
      to: to.email,
      subject: `Ontmoeting ${encounter.home?.name} tegen ${encounter.away?.name} heeft een opmerking`,
      template: 'hasComment',
      context: {
        encounter: encounter.toJSON(),
        url,
        contact: to.fullName,
        date: moment(encounter.date).tz('Europe/Brussels').format('LLLL'),
        settingsSlug: to.slug,
      },
    } as MailOptions<{
      encounter: EncounterCompetition;
      url: string;
      contact: string;
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
    url: string,
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
    comments: Comment[],
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
    url?: string,
  ) {
    moment.locale('nl-be');
    const options = {
      from: 'info@badman.app',
      to: to.email,
      subject: `Synchronisatie ${event.name} was ${success ? 'succesvol' : 'niet succesvol'}`,
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

  async sendSyncEncounterFailedMail(
    to: {
      fullName: string;
      email: string;
      slug: string;
    },
    encounter: EncounterCompetition,
    url?: string,
    urlBadman?: string,
  ) {
    moment.locale('nl-be');
    const options = {
      from: 'info@badman.app',
      to: to.email,
      subject: `Synchronisatie encounter failed`,
      template: 'synEncounterFailed',
      context: {
        event: encounter.toJSON(),
        url,
        urlBadman,
        user: to.fullName,
        settingsSlug: to.slug,
      },
    } as MailOptions<{
      event: EncounterCompetition;
      url?: string;
      urlBadman?: string;
      user: string;
      settingsSlug: string;
    }>;

    await this._sendMail(options);
  }

  async sendOpenRequestMail(
    to: {
      fullName: string;
      email: string;
      slug: string;
    },
    encounters: EncounterCompetition[],
    validation: EncounterValidationOutput[],
  ) {
    moment.locale('nl-be');
    const options = {
      from: 'info@badman.app',
      to: to.email,
      subject: `Synchronisatie encounter failed`,
      template: 'synEncounterFailed',
      context: {
        encounters: encounters.map((e) => e.toJSON()),
        validation,
        user: to.fullName,
      },
    } as MailOptions<{
      encounters: EncounterCompetition[];
      validation: [];
      url?: string;
      urlBadman?: string;
      user: string;
    }>;

    await this._sendMail(options);
  }

  private async _setupMailing() {
    if (this.initialized) return;
    if ((this.configService.get<boolean>('MAIL_ENABLED') ?? false) == false) {
      this.logger.debug('Mailing disabled');
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this._transporter.use('compile', (mail: any, callback) => {
        const template = mail.data.template;
        const context = mail.data.context;
        lastValueFrom(
          this.compileService.toHtml(template, {
            locals: context,
          }),
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
        this.logger.debug('Mailing disabled');
        const compiled = await lastValueFrom(
          this.compileService.toHtml(options.template, {
            locals: options.context,
          } as CompileOptions),
        );

        if (this.configService.get<string>('NODE_ENV') === 'development') {
          await writeFile(`mails/${options.template}.html`, compiled);
          this.logger.debug(`Mail saved to mail/${options.template}.html`);
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
        const cc = ((Array.isArray(options.cc) ? options.cc : [options.cc]) ?? []) as string[];
        options.to = ['glenn.latomme@gmail.com'];
        options.cc = [];

        options.subject += ` overwritten email original(to: ${to?.join(',')}, cc: ${cc.join(
          ',',
        )}) `;
      }

      await this._transporter?.sendMail(options);
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
