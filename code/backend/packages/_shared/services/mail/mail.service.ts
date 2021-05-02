import { Club, EventCompetition, logger, Team } from '@badvlasim/shared';
import nodemailer, { Transporter } from 'nodemailer';
import exphbs from 'nodemailer-express-handlebars';
import smtpTransport from 'nodemailer-smtp-transport';
import path from 'path';
import { Comment, Player, SubEventCompetition } from '../../models';

export class MailService {
  private _transporter: Transporter;
  private _mailingEnabled = false;

  constructor() {
    try {
      this._transporter = nodemailer.createTransport(
        smtpTransport({
          service: 'gmail',
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
          }
        })
      );

      this._transporter.verify().then(() => {
        this._mailingEnabled = true;
      });

      const hbsOptions = exphbs({
        viewEngine: {
          partialsDir: path.join(__dirname, './templates/partials'),
          layoutsDir: path.join(__dirname, './templates/layouts'),
          defaultLayout: 'layout.handlebars'
        },
        viewPath: path.join(__dirname, './templates')
      });

      this._transporter.use('compile', hbsOptions);
    } catch (e) {
      logger.warn('Mailing disabled', e);
    }
  }

  async sendNewPeopleMail(to: string) {
    if (this._mailingEnabled === false) {
      return;
    }

    const events = await EventCompetition.findAll({
      attributes: ['name'],
      where: {
        startYear: 2020
      },
      include: [
        {
          model: SubEventCompetition,
          required: true,
          attributes: ['id'],
          include: [
            {
              attributes: ['id'],
              model: Team,
              required: true,
              include: [
                {
                  attributes: ['id', 'firstName', 'lastName', 'memberId'],
                  model: Player,
                  required: true,
                  where: {
                    competitionPlayer: true
                  }
                },
                {
                  attributes: ['id', 'name'],
                  model: Club
                }
              ]
            }
          ]
        }
      ]
    });

    const clubs: any[] = [];

    if (events.length === 0) {
      // no players
      return;
    }

    for (const event of events) {
      for (const subEvent of event.subEvents) {
        for (const team of subEvent.teams) {
          // get existing
          let clubIndex = clubs.findIndex(r => r.name === team.club.name);
          if (clubIndex === -1) {
            clubIndex = clubs.push({ ...team.club.toJSON(), players: [] }) - 1;
          }

          // Set the players
          for (const player of team.players) {
            if (
              !clubs[clubIndex].players.find(
                r => r.memberId === player.memberId
              )
            ) {
              clubs[clubIndex].players.push(player.toJSON());
            }
          }
        }
      }
    }

    const clientUrl = process.env.CLIENT_URL;

    const options = {
      from: 'test@gmail.com',
      to,
      subject: 'New players',
      template: 'newplayers',
      context: { clubs, clientUrl, title: 'New players' }
    };

    try {
      const info = await this._transporter.sendMail(options);
      logger.debug('Message sent: %s', info.messageId);
      logger.debug('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    } catch (e) {
      logger.error('Hello', e);
    }
  }

  async sendClubMail(to: string, clubId: string, year: number) {
    if (this._mailingEnabled === false) {
      return;
    }

    const comments = await Comment.findAll({
      attributes: ['message'],
      include: [
        {
          model: EventCompetition,
          where: { startYear: year },
          required: true,
          attributes: ['name']
        }
      ]
    });

    const club = await Club.findOne({
      where: {
        id: clubId
      },
      include: [
        {
          attributes: ['name', 'teamNumber', 'type', 'abbreviation'],
          model: Team,
          where: {
            active: true
          },
          include: [
            {
              model: Player,
              as: 'players',
              through: { where: { base: true, end: null } }
            },
            {
              model: SubEventCompetition,
              attributes: ['id', 'name'],
              required: true,
              include: [
                {
                  required: true,
                  model: EventCompetition,
                  where: {
                    startYear: year
                  },
                  attributes: ['id', 'name'],
                  include: [
                    {
                      model: Comment
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    });

    // Sort by type, followed by number
    club.teams = club.teams.sort((a, b) => {
      if (a.type < b.type) {
        return -1;
      }
      if (a.type > b.type) {
        return 1;
      }
      if (a.teamNumber < b.teamNumber) {
        return -1;
      }
      if (a.teamNumber > b.teamNumber) {
        return 1;
      }
      return 0;
    });

    const clientUrl = process.env.CLIENT_URL;

    const options = {
      from: 'no-reply@badman.app',
      to,
      subject: `${club.name} inschrijving`,
      template: 'clubenrollment',
      context: {
        club: club.toJSON(),
        clientUrl,
        title: `${club.name} enrollment`,
        preview: `${club.name} schreef ${club.teams.length} teams in`,
        years: `${year}-${year + 1}`,
        comments: comments
          .filter(c => c.message && c.message.length > 0)
          .map(c => c?.toJSON())
      }
    };

    try {
      const info = await this._transporter.sendMail(options);
      logger.debug('Message sent: %s', info.messageId);
      logger.debug('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    } catch (e) {
      logger.error('Hello', e);
    }
  }
}
