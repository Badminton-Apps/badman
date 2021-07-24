import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import { parse } from 'fast-xml-parser';
import got from 'got';
import {
  Club as DbClub,
  DataBaseHandler,
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  logger,
  SubEventCompetition,
  SubEventType,
  Team as DbTeam,
  TeamSubEventMembership
} from '../../../packages/_shared';

(async () => {
  const databaseService = new DataBaseHandler(dbConfig.default);
  const URL_BASE = 'https://api.tournamentsoftware.com/1.0/Tournament/';

  const competitions = [
    // '1A358AAD-C446-43B4-9960-9C76DE9E20B1' // Test competition
    '13C19A72-56DE-41C2-900F-763A2EAB37C3' // PBO
  ];

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

  async function getCompetition(id: string): Promise<Tournament> {
    const result = await got.get(`${URL_BASE}/${id}`, {
      auth: `${process.env.VR_API_USER}:${process.env.VR_API_PASS}`
    });
    const body = parse(result.body).Result as Result;
    return body.Tournament;
  }

  async function getEvents(id: string): Promise<TournamentEvent[]> {
    const result = await got.get(`${URL_BASE}/${id}/Event`, {
      auth: `${process.env.VR_API_USER}:${process.env.VR_API_PASS}`
    });
    const body = parse(result.body).Result as Result;
    return body.TournamentEvent;
  }

  async function getDraws(id: string): Promise<TournamentDraw[]> {
    const result = await got.get(`${URL_BASE}/${id}/Draw`, {
      auth: `${process.env.VR_API_USER}:${process.env.VR_API_PASS}`
    });
    const body = parse(result.body).Result as Result;
    return body.TournamentDraw;
  }

  async function getTeams(id: string): Promise<Team[]> {
    const result = await got.get(`${URL_BASE}/${id}/Team`, {
      auth: `${process.env.VR_API_USER}:${process.env.VR_API_PASS}`
    });
    const body = parse(result.body).Result as Result;
    return body.Team as Team[];
  }

  async function getTeam(id: string, teamId: string): Promise<Team> {
    const result = await got.get(`${URL_BASE}/${id}/Team/${teamId}`, {
      auth: `${process.env.VR_API_USER}:${process.env.VR_API_PASS}`
    });
    const body = parse(result.body).Result as Result;
    return body.Team as Team;
  }

  async function getMatches(id: string, drawId: string): Promise<TeamMatch[]> {
    const result = await got.get(`${URL_BASE}/${id}/Draw/${drawId}/Match`, {
      auth: `${process.env.VR_API_USER}:${process.env.VR_API_PASS}`
    });
    const body = parse(result.body).Result as Result;
    return body.TeamMatch;
  }

  async function getDbEventForTournamentEvent(
    event: Tournament
  ): Promise<EventCompetition> {
    return EventCompetition.findOne({
      where: { name: event.Name }
    });
  }

  async function getDbSubEventForTournamentEvent(
    event: EventCompetition,
    xmlEvents: TournamentEvent[]
  ): Promise<Map<string, SubEventCompetition>> {
    const subEvents = new Map<string, SubEventCompetition>();

    for (const xmlEvent of xmlEvents) {
      var subEventType = null;
      switch (xmlEvent.GenderID) {
        case GenderID.Boy:
        case GenderID.Male:
          subEventType = SubEventType.M;
          break;
        case GenderID.Girl:
        case GenderID.Female:
          subEventType = SubEventType.F;
          break;
        case GenderID.Mixed:
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

      if (dbSub == null) {
        logger.warn('No SubEvent found?');
      }

      subEvents.set(xmlEvent.Code, dbSub);
    }

    return subEvents;
  }

  async function getDbDrawForTournamentDraw(
    dbSubEvents: Map<string, SubEventCompetition>,
    xmlDraws: TournamentDraw[]
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

      if (dbDraw == null) {
        logger.warn('No SubEvent found?');
      }

      draws.set(xmlDraw.Code, dbDraw);
    }

    return draws;
  }

  async function getdbTeams(id: string, xmlTeams: Team[]) {
    const teams = new Map<string, DbTeam>();

    for (const xmlTeamBasic of xmlTeams) {
      var xmlTeam = await getTeam(id, xmlTeamBasic.Code);
      const genders = xmlTeam.Players.Player.map(r => r.GenderID);

      const type =
        genders.includes(1) && genders.includes(2)
          ? SubEventType.MX
          : genders.includes(1)
          ? SubEventType.M
          : SubEventType.F;
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

      const dbClub = await DbClub.findOne({
        where: { clubId: xmlTeam.Club.Number }
      });
      if (dbClub == null) {
        logger.warn('No Club?', xmlTeam.Club);
        continue;
      }
      var dbTeam = await DbTeam.findOne({
        where: {
          clubId: dbClub.id,
          type,
          teamNumber
        }
      });

      if (dbTeam == null) {
        dbTeam = await new DbTeam({
          clubId: dbClub.id,
          type,
          teamNumber
        }).save();

        logger.debug('New team', xmlTeam, dbTeam.toJSON());
      }

      teams.set(xmlTeam.Code, dbTeam);
    }

    return teams;
  }

  async function setEncounters(
    draw: DrawCompetition,
    matches: TeamMatch[],
    teams: Map<string, DbTeam>
  ) {
    return EncounterCompetition.bulkCreate(
      matches.map(match =>
        new EncounterCompetition({
          drawId: draw.id,
          homeTeamId: teams.get(match.Team1.Code).id,
          awayTeamId: teams.get(match.Team2.Code).id,
          date: new Date(match.MatchTime)
        }).toJSON()
      )
    );
  }
})();

export interface Result {
  Tournament?: Tournament;
  TournamentEvent?: TournamentEvent[];
  TournamentDraw?: TournamentDraw[];
  Team?: Team | Team[];
  TeamMatch?: TeamMatch[];
  _Version: string;
}

export interface Tournament {
  Code: string;
  Name: string;
  TypeID: string;
  LastUpdated: Date;
  StartDate: Date;
  EndDate: Date;
  OnlineEntryStartDate: Date;
  OnlineEntryEndDate: Date;
  TournamentTimezone: string;
  AcceptanceListPublicationDate: Date;
  DrawPublicationDate: Date;
  ProspectusPublicationDate: Date;
  SeedingPublicationDate: Date;
  TournamentWeekStartDate: Date;
  OnlineEntryWithdrawalDeadline: Date;
  AcceptanceRankingDate: Date;
  SeedingRankingDate: Date;
  Category: Category;
  PrizeMoney: string;
  Organization: Organization;
  Contact: Contact;
  Venue: Venue;
}

export interface Category {
  Code: string;
  Name: string;
}

export interface Contact {
  Name: string;
  Phone: string;
  Email: string;
}

export interface Organization {
  Name: string;
}

export interface Venue {
  Name: string;
  Address1: string;
  Postalcode: string;
  City: string;
  CountryCode: string;
  Phone: string;
  Fax: string;
  Website: string;
}

export interface TeamMatch {
  Code: string;
  Winner: string;
  ScoreStatus: string;
  RoundName: string;
  MatchTime: Date;
  EventCode: string;
  EventName: EventName;
  DrawCode: string;
  DrawName: DrawName;
  Team1: Team;
  Team2: Team;
  Sets: Sets;
}

export enum DrawName {
  The1StProvincialeA = '1st Provinciale - A'
}

export enum EventName {
  The1StProvinciale = '1st Provinciale'
}

export interface Match {
  Code: string;
  Winner: string;
  ScoreStatus: string;
  TeamMatchWinner: string;
  TeamMatchScoreStatus: string;
  OOPTypeID: string;
  OOPRound: string;
  OOPText: string;
  MatchTime: Date;
  EventCode: string;
  EventName: string;
  DrawCode: string;
  DrawName: string;
  LocationCode: string;
  LocationName: string;
  CourtCode: string;
  CourtName: string;
  MatchTypeID: string;
  MatchTypeNo: string;
  MatchOrder: string;
  Team1: Team;
  Team2: Team;
  Duration: string;
  Sets: Sets;
  Stats: Stats;
}

export interface TournamentEvent {
  Code: string;
  Name: string;
  GenderID: GenderID;
  GameTypeID: GameTypeID;
  ParaClassID: string;
  Grading: Grading;
  SubGrading: Grading;
}

export interface Sets {
  Set: Set[];
}

export interface Set {
  Scores?: Scores;
  Stats?: Stats;
  _Team1: string;
  _Team2: string;
}

export interface Scores {
  Score: Score[];
}

export interface Score {
  _Team1: string;
  _Team2: string;
}

export interface Stats {
  Stat: Stat[];
}

export interface Stat {
  _ID: string;
  _Value: string;
}

export interface TournamentDraw {
  Code: string;
  EventCode: string;
  Name: string;
  TypeID: string;
  Size: string;
  EndSize: string;
  Qualification: string;
  Structure: Structure;
  StageCode: string;
}

export interface Structure {
  Item: Item;
}

export interface Item {
  Col: string;
  Row: string;
  Code: string;
  Winner: string;
  ScoreStatus: string;
  Team: TeamClass | string;
  MatchTime?: Date;
  Sets?: Sets;
}

export interface Sets {
  Set: Set[];
}

export interface Set {
  _Team1: string;
  _Team2: string;
}

export interface TeamClass {
  Code: string;
  Name: string;
}

export interface Team {
  Player1?: Player;
  Player2?: Player;
  Player3?: Player;
  Player4?: Player;

  Code: string;
  Name: string;
  Contact: string;
  Address: string;
  PostalCode: string;
  City: string;
  Phone: string;
  Email: string;
  Club: Club;
  Players: Players;
}

export interface Player {
  MemberID: string;
  Firstname: string;
  Lastname: string;
  GenderID: GenderID;
  CountryCode?: string;
}

export interface Club {
  Code: string;
  Number: string;
  Name: string;
}

export interface Players {
  Player: Player[];
}

export interface Grading {
  Code: string;
  Name: string;
}

export enum GenderID {
  Male = 1,
  Female = 2,
  Mixed = 3,
  Boy = 4,
  Girl = 5,
  Genderless = 6
}

export enum GameTypeID {
  Singles = 1,
  Doubles = 2,
  Mixed = 3
}
