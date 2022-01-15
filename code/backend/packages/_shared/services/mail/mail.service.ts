import moment from 'moment';
import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import exphbs from 'nodemailer-express-handlebars';
import smtpTransport from 'nodemailer-smtp-transport';
import path from 'path';
import { DataBaseHandler } from '../../database';
import {
  Comment,
  EncounterChange,
  Player,
  SubEventCompetition,
  Team,
  Club,
  EventCompetition
} from '../../models';
import { logger } from '../../utils';

export class MailService {
  private _transporter: Transporter;
  private _mailingEnabled = false;
  private _clientUrl: string;

  constructor(private _databaseService: DataBaseHandler) {
    this._clientUrl = process.env.CLIENT_URL;
    try {
      this._transporter = nodemailer.createTransport(
        smtpTransport({
          host: process.env.MAIL_HOST,
          port: 465,
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
          }
        })
      );

      this._transporter.verify().then(() => {
        this._mailingEnabled = process.env.NODE_ENV === 'production';
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

    const clubs: Partial<Club>[] = [];

    if (events.length === 0) {
      // no players
      return;
    }

    for (const event of events) {
      for (const subEvent of event.subEvents) {
        for (const team of subEvent.entries?.map(r => r.team)) {
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

    const options = {
      from: 'test@gmail.com',
      to,
      subject: 'New players',
      template: 'newplayers',
      context: { clubs, clientUrl: this._clientUrl, title: 'New players' }
    };

    await this._sendMail(options);
  }

  async sendClubMail(
    to: string | string[],
    clubId: string,
    year: number,
    cc?: string | string[]
  ) {
    if (this._mailingEnabled === false) {
      return;
    }

    const comments = await Comment.findAll({
      attributes: ['message'],
      where: {
        clubId
      },
      include: [
        {
          model: EventCompetition,
          where: { startYear: year },
          required: true,
          attributes: ['name']
        }
      ]
    });

    const club = await this._databaseService.getClubsTeamsForEnrollemnt(
      clubId,
      year
    );

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
      from: 'info@badman.app',
      to,
      cc,
      subject: `${club.name} inschrijving`,
      template: 'clubenrollment',
      context: {
        club: club.toJSON(),
        clientUrl,
        title: `${club.name} enrollment`,
        preview: `${club.name} schreef ${club.teams.length} teams in`,
        years: `${year}-${year + 1}`,
        comments: comments.map(c => c.toJSON())
      }
    };

    await this._sendMail(options);
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
          include: [{ model: Player, as: 'captain' }]
        },
        { model: Team, as: 'away', include: [{ model: Player, as: 'captain' }] }
      ]
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
        clientUrl: this._clientUrl
      }
    };

    await this._sendMail(options);
  }

  async sendRequestFinishedMail(changeRequest: EncounterChange) {
    const encounter = await changeRequest.getEncounter({
      include: [
        {
          model: Team,
          as: 'home',
          include: [{ model: Player, as: 'captain' }]
        },
        { model: Team, as: 'away', include: [{ model: Player, as: 'captain' }] }
      ]
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
          clientUrl: this._clientUrl
        }
      };

      await this._sendMail(options);
    };

    await sendMail(encounter.home, encounter.home.captain);
    await sendMail(encounter.away, encounter.away.captain);
  }

  private async _sendMail(options: SendMailOptions) {
    try {
      if (this._mailingEnabled === false) {
        logger.debug('Mailing disabled', {data: options});
        return;
      }

      options.to = Array.isArray(options.to) ? options.to : [options.to];
      if (options.to === null || options.to.length === 0) {
        logger.error('no mail adress?', {error: options});
        return;
      }

      const info = await this._transporter.sendMail(options);
      logger.debug('Message sent: %s', info.messageId);
      logger.debug('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    } catch (e) {
      logger.error('Hello', e);
    }
  }
}
