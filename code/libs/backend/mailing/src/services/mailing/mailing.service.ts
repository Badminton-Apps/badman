import {
  EncounterChange,
  EncounterCompetition,
  Player,
  Team,
} from '@badman/backend-database';
import { HandlebarService } from '@badman/backend-handlebar';
import exphbs from 'nodemailer-express-handlebars';
import { Injectable, Logger } from '@nestjs/common';
import { readFile, writeFile } from 'fs/promises';
import moment from 'moment-timezone';
import path from 'path';
import nodemailer, { Transporter } from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailingService {
  private readonly logger = new Logger(MailingService.name);
  private _transporter: Transporter;
  private _mailingEnabled = false;
  private initialized = false;

  constructor(
    private handleBarService: HandlebarService,
    private configService: ConfigService
  ) {
    this.handleBarService.registerPartials(
      path.join(__dirname, './assets/mailing/partials')
    );
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

    const sendMail = async (team: Team, captain: Player, template: string) => {
      moment.locale('nl-be');
      const options = {
        from: 'info@badman.app',
        to: team.email,
        subject: `Verplaatsings aanvraag ${encounter.home.name} vs ${encounter.away.name}`,
        template,
        context: {
          captain: captain.toJSON(),
          otherTeam: otherTeam.toJSON(),
          clubTeam: clubTeam.toJSON(),
          encounter: encounter.toJSON(),
          date: moment(encounter.date).tz('Europe/Brussels').format('LLLL'),
        },
      } as MailOptions;

      await this._sendMail(options);
    };

    // Send mail to the other team
    await sendMail(otherTeam, otherTeam.captain, 'encounterchange');
    // Send mail to the requester
    await sendMail(clubTeam, clubTeam.captain, 'encounterchange-requester');
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

    const sendMail = async (team: Team, captain: Player) => {
      moment.locale('nl-be');
      const options = {
        from: 'info@badman.app',
        to: team.email,
        subject: `Verplaatsings aanvraag ${encounter.home.name} vs ${encounter.away.name} afgewerkt`,
        template: 'encounterchangefinished',
        context: {
          captain: captain.toJSON(),
          team: team.toJSON(),
          encounter: encounter.toJSON(),
          newDate: moment(encounter.date).tz('Europe/Brussels').format('LLLL'),
        },
      } as MailOptions;

      await this._sendMail(options);
    };

    await sendMail(encounter.home, encounter.home.captain);
    await sendMail(encounter.away, encounter.away.captain);
  }

  async sendNotEnterdMail(
    to: Partial<Player>,
    encounter: EncounterCompetition,
    url: string
  ) {
    moment.locale('nl-be');
    const options = {
      from: 'info@badman.app',
      to: to.email,
      subject: `Niet ingegeven resultaat ${encounter.home.name} vs ${encounter.away.name}`,
      template: 'notentered',
      context: {
        encounter: encounter.toJSON(),
        url,
        captain: to.fullName,
        date: moment(encounter.date).tz('Europe/Brussels').format('LLLL'),
      },
    } as MailOptions;

    await this._sendMail(options);
  }

  async sendNotAcceptedMail(
    to: Partial<Player>,
    encounter: EncounterCompetition,
    url: string
  ) {
    moment.locale('nl-be');
    const options = {
      from: 'info@badman.app',
      to: to.email,
      subject: `Niet geaccepteerd resultaat ${encounter.home.name} vs ${encounter.away.name}`,
      template: 'notaccepted',
      context: {
        encounter: encounter.toJSON(),
        url,
        captain: to.fullName,
        date: moment(encounter.date).tz('Europe/Brussels').format('LLLL'),
      },
    } as MailOptions;

    await this._sendMail(options);
  }

  private async _setupMailing() {
    if (this.initialized) return;

    const mailConfig = {
      host: this.configService.get('MAIL_HOST'),
      port: 465,
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASS'),
      },
    };

    const hbsConfig = {
      viewEngine: {
        partialsDir: path.join(__dirname, './assets/mailing/partials'),
        layoutsDir: path.join(__dirname, './assets/mailing/layouts'),
        defaultLayout: 'layout.handlebars',
      },
      viewPath: path.join(__dirname, './assets/mailing'),
    }

    try {
      this._transporter = nodemailer.createTransport(mailConfig);

      await this._transporter.verify();

      const hbsOptions = exphbs(hbsConfig);

      this._transporter.use('compile', hbsOptions);
      this._mailingEnabled = true;
      this.initialized = true;
    } catch (e) {
      this._mailingEnabled = false;
      this.logger.debug({
        message: 'Mailing not enabled',
        error: e,
        mailConfig,
        hbsConfig
      });

      this.logger.warn('Mailing disabled due to config setup failing', e);
    } finally {
      this.logger.debug(`Mailing enabled: ${this._mailingEnabled}`);
    }
  }

  private async _sendMail(options: MailOptions) {
    await this._setupMailing();
    // add clientUrl to context
    options['context']['clientUrl'] = this.configService.get('CLIENT_URL');

    try {
      if (this._mailingEnabled === false) {
        this.logger.debug('Mailing disabled', { data: options });
        const filePath = path.join(
          __dirname,
          './assets/mailing/',
          `${options.template}.handlebars`
        );
        const template = await readFile(filePath, 'utf-8');
        const compiled = this.handleBarService.Compile(
          template,
          options.context
        );
        await writeFile(`${options.template}.html`, compiled);

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

        options.subject += `overwritten email original(to: ${to?.join(
          ','
        )}, cc: ${cc.join(',')}) `;
      }

      await this._transporter.sendMail(options);
      // this.logger.debug('Message sent: %s', info.messageId);
      // this.logger.debug('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      this.logger.debug(`Message sent: ${options.subject}, to: ${options.to}`);
    } catch (e) {
      this.logger.error('Hello', e);
    }
  }
}

interface MailOptions {
  from: string;
  to: string | string[];
  cc: string | string[];
  subject: string;
  template: string;
  context: unknown;
}
