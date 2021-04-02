import { EventCompetition, Team, Club } from '@badvlasim/shared';
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var exphbs  = require('nodemailer-express-handlebars');
import path from 'path';
import { Player, SubEventCompetition } from '../../models';

export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport(
      smtpTransport({
        host: 'smtp.gmail.com',
        port: 465,
        auth: {
          user: 'glenn.latomme@gmail.com',
          pass: 'bkxtlkysohswmeoi'
        },
        secure: true
      })
    );

    const hbsOptions = exphbs({
      viewEngine: {
        partialsDir: path.join(__dirname, './templates/partials'),
        layoutsDir: path.join(__dirname, './templates/layouts'),
        defaultLayout: 'layout.handlebars'
      },
      viewPath: path.join(__dirname, './templates'),
    });

    this.transporter.use('compile', hbsOptions);
  }

  async sendNewPeopleMail(to: string) {
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
          let clubIndex = clubs.findIndex(r => r.name == team.club.name);
          if (clubIndex == -1) {
            clubIndex = clubs.push({ ...team.club.toJSON(), players: [] }) - 1;
          }

          // Set the players
          for (const player of team.players) {
            if (
              !clubs[clubIndex].players.find(r => r.memberId == player.memberId)
            ) {
              clubs[clubIndex].players.push(player.toJSON());
            }
          }
        }
      }
    }

    const clientUrl = process.env.CLIENT_URL;

    let options = {
      from: 'test@gmail.com',
      to: to,
      subject: 'New players',
      template: 'newplayers',
      context: { clubs, clientUrl, title: 'New players' }
    };

    try {
      const info = await this.transporter.sendMail(options);
      console.log('Message sent: %s', info.messageId);
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    } catch (e) {
      console.error('Hello', e);
    }
  }
}
