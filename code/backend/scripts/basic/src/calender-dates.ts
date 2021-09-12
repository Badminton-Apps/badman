import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import { parse } from 'fast-xml-parser';
import axios from 'axios';
import { Op } from 'sequelize';
import {
  Club,
  DataBaseHandler,
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  logger,
  Player,
  SubEventCompetition,
  SubEventType,
  Team,
  TeamPlayerMembership,
  XmlTournament,
  XmlResult,
  XmlTournamentEvent,
  XmlTournamentDraw,
  XmlTeam,
  XmlTeamMatch,
  XmlGenderID
} from '@badvlasim/shared';

(async () => {
  const databaseService = new DataBaseHandler({
    ...dbConfig.default
    // logging: (...msg) => logger.debug('Query', msg)
  });
  const URL_BASE = 'https://api.tournamentsoftware.com/1.0/Tournament/';

  const competitions = [
    // '1A358AAD-C446-43B4-9960-9C76DE9E20B1' // Test competition
    '13C19A72-56DE-41C2-900F-763A2EAB37C3', // PBO
    '39653A34-0315-494B-8634-80CC5A4327A4', // Limburg
    '343A6D01-7373-405B-9427-CB56B07F8CCD', // PBA
    '36DA478C-B036-47A6-BAAA-D2F7995F7599', // VVBBC
    'BD406AC5-DB29-4CD7-B8A6-5EDF9A9BCD37', // Vlaams / liga
    '9BBF45C4-4826-4D4A-9FCA-18189693800E' // WVBF
  ];

  // deactivate all teams
  await Team.update({ active: false }, { where: { active: true } });

  // Remove all base players
  await TeamPlayerMembership.update({ base: false }, { where: { base: true } });

  for (const comp of competitions) {
    // Visual
    const xmlComp = await getCompetition(comp);
    const xmlEvents = await getEvents(comp);
    const xmlDraws = await getDraws(comp);
    const xmlTeams = await getTeams(comp);

    // Badman
    const dbEvent = await getDbEventForTournamentEvent(xmlComp);
    const mapSubEvents = await getDbSubEventForTournamentEvent(
      dbEvent,
      xmlEvents
    );
    const mapDraws = await getDbDrawForTournamentDraw(mapSubEvents, xmlDraws);
    const mapTeams = await getdbTeams(comp, xmlTeams);

    for (const [key, value] of mapDraws) {
      const matches = await getMatches(comp, key);
      await setEncounters(value, matches, mapTeams);
    }

    logger.debug(dbEvent.name);
  }

  async function getCompetition(id: string): Promise<XmlTournament> {
    const result = await axios.get(`${URL_BASE}/${id}`, {
      withCredentials: true,
      auth: {
        username: `${process.env.VR_API_USER}`,
        password: `${process.env.VR_API_PASS}`
      },
    });
    const body = parse(result.data).Result as XmlResult;
    return body.Tournament as XmlTournament;
  }

  async function getEvents(id: string): Promise<XmlTournamentEvent[]> {
    const result = await axios.get(`${URL_BASE}/${id}/Event`, {
      withCredentials: true,
      auth: {
        username: `${process.env.VR_API_USER}`,
        password: `${process.env.VR_API_PASS}`
      },
    });
    const body = parse(result.data).Result as XmlResult;
    return Array.isArray(body.TournamentEvent)
      ? body.TournamentEvent
      : [body.TournamentEvent];
  }

  async function getDraws(id: string): Promise<XmlTournamentDraw[]> {
    const result = await axios.get(`${URL_BASE}/${id}/Draw`, {
      withCredentials: true,
      auth: {
        username: `${process.env.VR_API_USER}`,
        password: `${process.env.VR_API_PASS}`
      },
    });
    const body = parse(result.data).Result as XmlResult;
    return Array.isArray(body.TournamentDraw)
      ? body.TournamentDraw
      : [body.TournamentDraw];
  }

  async function getTeams(id: string): Promise<XmlTeam[]> {
    const result = await axios.get(`${URL_BASE}/${id}/Team`, {
      withCredentials: true,
      auth: {
        username: `${process.env.VR_API_USER}`,
        password: `${process.env.VR_API_PASS}`
      },
    });
    const body = parse(result.data).Result as XmlResult;
    return body.Team as XmlTeam[];
  }

  async function getTeam(id: string, teamId: string): Promise<XmlTeam> {
    const result = await axios.get(`${URL_BASE}/${id}/Team/${teamId}`, {
      withCredentials: true,
      auth: {
        username: `${process.env.VR_API_USER}`,
        password: `${process.env.VR_API_PASS}`
      },
    });
    const body = parse(result.data).Result as XmlResult;
    return body.Team as XmlTeam;
  }

  async function getMatches(
    id: string,
    drawId: string
  ): Promise<XmlTeamMatch[]> {
    const result = await axios.get(`${URL_BASE}/${id}/Draw/${drawId}/Match`, {
      withCredentials: true,
      auth: {
        username: `${process.env.VR_API_USER}`,
        password: `${process.env.VR_API_PASS}`
      },
    });
    const body = parse(result.data).Result as XmlResult;
    return body.TeamMatch;
  }

  async function getDbEventForTournamentEvent(
    event: XmlTournament
  ): Promise<EventCompetition> {
    return EventCompetition.findOne({
      where: { name: event.Name }
    });
  }

  async function getDbSubEventForTournamentEvent(
    event: EventCompetition,
    xmlEvents: XmlTournamentEvent[]
  ): Promise<Map<string, SubEventCompetition>> {
    const subEvents = new Map<string, SubEventCompetition>();

    for (const xmlEvent of xmlEvents) {
      let subEventType = null;
      switch (xmlEvent.GenderID) {
        case XmlGenderID.Boy:
        case XmlGenderID.Male:
          subEventType = SubEventType.M;
          break;
        case XmlGenderID.Girl:
        case XmlGenderID.Female:
          subEventType = SubEventType.F;
          break;
        case XmlGenderID.Mixed:
          subEventType = SubEventType.MX;
          break;
        default:
          throw 'No gender?';
      }

      const dbSub = await SubEventCompetition.findOne({
        where: {
          eventId: event.id,
          eventType: subEventType,
          name: xmlEvent.Name
        }
      });

      if (dbSub === null) {
        logger.warn('No SubEvent found?');
      }

      subEvents.set(xmlEvent.Code, dbSub);
    }

    return subEvents;
  }

  async function getDbDrawForTournamentDraw(
    dbSubEvents: Map<string, SubEventCompetition>,
    xmlDraws: XmlTournamentDraw[]
  ): Promise<Map<string, DrawCompetition>> {
    const draws = new Map<string, DrawCompetition>();

    for (const xmlDraw of xmlDraws) {
      const dbSubevent = dbSubEvents.get(xmlDraw.EventCode);

      const [dbDraw] = await DrawCompetition.findCreateFind({
        where: {
          subeventId: dbSubevent.id,
          name: xmlDraw.Name
        },
        defaults: {
          subeventId: dbSubevent.id,
          name: xmlDraw.Name,
          size: xmlDraw.Size
        }
      });

      if (dbDraw === null) {
        logger.warn('No SubEvent found?');
      }

      draws.set(xmlDraw.Code, dbDraw);
    }

    return draws;
  }

  async function getdbTeams(id: string, xmlTeams: XmlTeam[]) {
    const teams = new Map<string, Team>();
    const memberships = [];

    for (const xmlTeamBasic of xmlTeams) {
      let xmlTeam = await getTeam(id, xmlTeamBasic.Code);

      const genders = xmlTeam.Players?.Player?.map(r => r.GenderID);

      let type: SubEventType;

      if (xmlTeam.Name === 'Torpedo 1H (74)') {
        type = SubEventType.M;
      } else {
        type =
          genders.includes(1) && genders.includes(2)
            ? SubEventType.MX
            : genders.includes(1)
            ? SubEventType.M
            : SubEventType.F;
      }

      const regexResult = /.* ((\d+)[GHD]|[GHD](\d+))/gim.exec(xmlTeam.Name);

      // Get team number from regex group
      const teamNumber =
        regexResult && regexResult.length > 3
          ? parseInt(regexResult[2], 10)
            ? parseInt(regexResult[2], 10)
            : parseInt(regexResult[3], 10)
            ? parseInt(regexResult[3], 10)
            : -1
          : -1;

      const dbClub = await Club.findOne({
        where: { clubId: xmlTeam.Club.Number }
      });
      if (dbClub === null) {
        logger.warn('No Club?', xmlTeam.Club);
        continue;
      }
      let dbTeam = await Team.findOne({
        where: {
          clubId: dbClub.id,
          type,
          teamNumber
        },
        include: [
          { model: Player, as: 'players', attributes: ['id'] },
          { model: Player, as: 'captain' }
        ]
      });

      if (dbTeam === null) {
        dbTeam = await new Team({
          clubId: dbClub.id,
          type,
          teamNumber
        }).save();

        logger.debug('New team', xmlTeam, dbTeam.toJSON());
      }

      if (xmlTeam.Contact) {
        const parts = xmlTeam.Contact?.toLowerCase()
          .replace(/[;\\\\/:*?\"<>|&',]/, ' ')
          .split(' ');
        const queries = [];
        for (const part of parts) {
          queries.push({
            [Op.or]: [
              { firstName: { [Op.iLike]: `%${part}%` } },
              { lastName: { [Op.iLike]: `%${part}%` } }
            ]
          });
        }

        const captain = await Player.findOne({
          where: { [Op.or]: queries }
        });

        if (captain && dbTeam.captain === null) {
          await dbTeam.setCaptain(captain);
        }
      }

      // Copy stuff from xml team to db team
      dbTeam.phone = xmlTeam.Phone;
      dbTeam.email = xmlTeam.Email;
      dbTeam.active = true;

      await dbTeam.save();

      if (xmlTeam.Players?.Player != null) {
        for (const player of xmlTeam.Players?.Player) {
          const dbPlayer = await Player.findOne({
            where: {
              memberId: `${player.MemberID}`
            }
          });

          if (dbPlayer === null) {
            logger.warn('No Player?', player);
            continue;
          }

          if (!dbTeam.players?.map(p => p.id)?.includes(dbPlayer.id)) {
            await dbTeam.addPlayer(dbPlayer, {
              through: { start: new Date() },
              hooks: false
            });
          }

          memberships.push({
            teamId: dbTeam.id,
            playerId: dbPlayer.id
          });
        }
      }

      teams.set(xmlTeam.Code, dbTeam);
    }

    await TeamPlayerMembership.update(
      { base: true },
      {
        where: {
          [Op.or]: memberships.map(({ teamId, playerId }) => {
            return { [Op.and]: [{ teamId }, { playerId }] };
          })
        }
      }
    );

    return teams;
  }

  async function setEncounters(
    draw: DrawCompetition,
    matches: XmlTeamMatch[],
    teams: Map<string, Team>
  ) {
    return EncounterCompetition.bulkCreate(
      matches.map(match =>
        new EncounterCompetition({
          drawId: draw.id,
          homeTeamId: teams.get(match.Team1.Code).id,
          awayTeamId: teams.get(match.Team2.Code).id,
          date: new Date(match.MatchTime),
          visualCode: match.Code
        }).toJSON()
      )
    );
  }
})();
