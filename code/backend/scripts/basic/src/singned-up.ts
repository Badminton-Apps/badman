import {
  Club,
  DataBaseHandler,
  EventCompetition,
  SubEventCompetition,
  SubEventType,
  Team,
  logger,
  MailService,
  Role,
  Player
} from '@badvlasim/shared';
import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import got from 'got';
import { Length } from 'sequelize-typescript';
import { clubsQuery } from '../../../packages/server/src/graphql';

export interface Identity {
  user_id: string;
  provider: string;
  connection: string;
  isSocial: boolean;
}

export interface Auth0User {
  created_at: Date;
  email: string;
  email_verified: boolean;
  identities: Identity[];
  name: string;
  nickname: string;
  picture: string;
  updated_at: Date;
  user_id: string;
  last_login: Date;
  last_ip: string;
  logins_count: number;
}

const YEAR = 2021;
(async () => {
  try {
    const databaseService = new DataBaseHandler(dbConfig.default);
    const mailService = new MailService();

    let length = -1;
    let page = 0;

    const users = new Map<string, string>();
    const unverified = [];

    while (length != 0) {
      const response = await got<{ users: Auth0User[]; length }>(
        `${process.env.AUTH0_ISSUER}/api/v2/users`,
        {
          responseType: 'json',
          searchParams:{
            page: page++,
            include_totals: true,
            per_page: 50
          },
          headers: {
            // generate token on: https://manage.auth0.com/dashboard/eu/badvlasim/apis/5e804e697a2d8c08d310fb08/explorer
            Authorization: `Bearer ${process.env.AUTH0_JWT}`
          }
        }
      );

      length = response.body.length;

      for (const user of response.body?.users) {
        users.set(user.user_id, user.email);

        if (user.email_verified == false) {
          unverified.push(user);
        }
      }
    }

    const dbClubs = await Club.findAll({
      include: [
        {
          attributes: ['id'],
          model: Team,
          where: {
            active: true
          },
          include: [
            {
              model: SubEventCompetition,
              attributes: [],
              required: true,
              include: [
                {
                  required: true,
                  model: EventCompetition,
                  where: {
                    startYear: YEAR
                  },
                  attributes: []
                }
              ]
            }
          ]
        },
        { model: Role, include: [{ model: Player }] }
      ]
    });

    for (const club of dbClubs) {
      if (club.roles.length == 0) {
        logger.warn('No roles?');
        continue;
      }

      let adminRole = club.roles[0];
      if (club.roles.length > 1) {
        adminRole = club.roles.find(r => r.name == 'Admin') ?? adminRole;
      }

      if (adminRole == null) {
        logger.warn('Admin roles not found');
        continue;
      }

      const mails = adminRole.players
        .map(r => users.get(r.sub))
        .filter(r => !!r);

      if (mails.length == 0) {
        logger.warn(
          `Cant send mail to ${club.name}`,
          adminRole.players.map(r => r.toJSON())
        );
      }

      logger.info(`Sending mail for club ${club.name}`, mails)
    }

    logger.info('Finished clubs', dbClubs.length);
    logger.info('Unverified', unverified.length);

    return;
  } catch (e) {
    logger.error('Something went wrong', e);
  }
})();
