import { EncounterChange, Player, Team } from '@badman/api/database';
import { HandlebarService } from '@badman/handlebar';
import exphbs from 'nodemailer-express-handlebars';
import smtpTransport from 'nodemailer-smtp-transport';
import { Injectable, Logger } from '@nestjs/common';
import { readFile, writeFile } from 'fs/promises';
import moment from 'moment';
import path from 'path';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class MailingService {
  private readonly logger = new Logger(MailingService.name);
  private _transporter: Transporter;
  private _mailingEnabled = false;
  private initialized = false;

  constructor(private handleBarService: HandlebarService) {
    this.handleBarService.registerPartials(
      path.join(__dirname, 'assets', 'templates', 'mail', 'partials')
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
    const captain = homeTeamRequests
      ? encounter.away.captain
      : encounter.home.captain;

    const options = {
      from: 'info@badman.app',
      to: otherTeam.email,
      subject: `Verplaatsings aanvraag ${encounter.home.name} vs ${encounter.away.name}`,
      template: 'encounterchange',
      context: {
        captain: captain.toJSON(),
        otherTeam: otherTeam.toJSON(),
        clubTeam: clubTeam.toJSON(),
        encounter: encounter.toJSON(),
      },
    } as MailOptions;

    await this._sendMail(options);
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
          newDate: moment(encounter.date).format('LLLL'),
        },
      } as MailOptions;

      await this._sendMail(options);
    };

    await sendMail(encounter.home, encounter.home.captain);
    await sendMail(encounter.away, encounter.away.captain);
  }

  private async _setupMailing() {
    if (this.initialized) return;

    try {
      this._transporter = nodemailer.createTransport(
        smtpTransport({
          host: process.env.MAIL_HOST,
          port: 465,
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
          },
        })
      );

      await this._transporter.verify();

      const hbsOptions = exphbs({
        viewEngine: {
          partialsDir: path.join(__dirname, './assets/templates/mail/partials'),
          layoutsDir: path.join(__dirname, './assets/templates/mail/layouts'),
          defaultLayout: 'layout.handlebars',
        },
        viewPath: path.join(__dirname, './assets/templates/mail'),
      });

      this._transporter.use('compile', hbsOptions);
      this._mailingEnabled = process.env.NODE_ENV === 'production';
    } catch (e) {
      this._mailingEnabled = false;
      this.logger.warn('Mailing disabled due to config setup failing', e);
    }
  }

  private async _sendMail(options: MailOptions) {
    await this._setupMailing();
    // add clientUrl to context
    options['context']['clientUrl'] = process.env.CLIENT_URL;

    try {
      if (this._mailingEnabled === false) {
        this.logger.debug('Mailing disabled', { data: options });
        const filePath = path.join(
          __dirname,
          './assets/templates/mail/',
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

      // Check if the to is filled in
      options.to = Array.isArray(options.to) ? options.to : [options.to];
      if (options.to === null || options.to.length === 0) {
        this.logger.error('no mail adress?', { error: options });
        return;
      }

      const info = await this._transporter.sendMail(options);
      this.logger.debug('Message sent: %s', info.messageId);
      this.logger.debug('Preview URL: %s', nodemailer.getTestMessageUrl(info));
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
