import {
  Club,
  EntryCompetitionPlayer,
  EventCompetition,
  EventEntry,
  Location,
  Player,
  SubEventCompetition,
  Team,
} from '@badman/backend-database';
import { EnrollmentValidationService } from '@badman/backend-enrollment';
import {
  I18nTranslations,
  SubEventTypeEnum,
  TeamMembershipType,
} from '@badman/utils';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import { copyFile } from 'fs/promises';
import moment from 'moment';
import { I18nService } from 'nestjs-i18n';
import { resolve } from 'path';
import path = require('path');

type StageNames = 'Main Draw' | 'Reserves' | 'Uitloten';

@Injectable()
export class CpGeneratorService {
  private readonly logger = new Logger(CpGeneratorService.name);
  private connection: any;
  private stages: {
    name: StageNames;
    displayOrder: number;
    stagetype: number;
  }[] = [
    { name: 'Main Draw', displayOrder: 1, stagetype: 1 },
    { name: 'Reserves', displayOrder: 9998, stagetype: 9998 },
    { name: 'Uitloten', displayOrder: 9999, stagetype: 9999 },
  ];

  constructor(
    private _configService: ConfigService,
    private _validation: EnrollmentValidationService,
    private readonly i18nService: I18nService<I18nTranslations>
  ) {}

  public async generateCpFile(eventId: string) {
    let ADODB = null;
    try {
      ADODB = require('node-adodb');
    } catch (er) {
      this.logger.warn(`ADODB not found`);
      return;
    }

    this.logger.log('Started generating CP file');
    const event = await EventCompetition.findByPk(eventId);
    if (!event) {
      this.logger.error('Event not found');
      throw new Error('Event not found');
    }
    this.logger.debug(`Event found: ${event.name}`);
    const file = await this._prepCPfile(event, ADODB);

    this.logger.debug('Adding evetns');
    const events = await this._addEvents(event);

    this.logger.debug('Adding clubs');
    const clubs = await this._addClubs(events);

    this.logger.debug('Adding locations');
    const locations = await this._addLocations(clubs);

    this.logger.debug('Adding teams');
    const teams = await this._addTeams(events, clubs, locations);

    this.logger.debug('Adding entries');
    await this._addEntries(events, teams);

    this.logger.debug('Adding players');
    await this._addPlayers(teams, clubs);

    this.logger.debug('Adding memos');
    await this._addMemos(event, clubs, teams);

    this.logger.log(`Generation ${event.name} done`);

    return file;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async _prepCPfile(event: EventCompetition, ADODB: any) {
    const original = path.join(
      process.cwd(),
      `libs/backend/generator/assets/empty.cp`
    );
    const destination = path.join(
      process.cwd(),
      `libs/backend/generator/assets/${event.name}.cp`
    );

    const existed = existsSync(destination);

    if (!existed) {
      await copyFile(original, destination);
    }

    this.connection = ADODB.open(
      `Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${destination};Jet OLEDB:Database Password=${this._configService.get(
        'CP_PASS'
      )}`
    );

    // delete existing data
    const queries = [
      'DELETE FROM TournamentDay;',
      'DELETE FROM stageentry;',
      'DELETE FROM League;',
      'DELETE FROM Entry;',
      'DELETE FROM TeamPlayer;',
      'DELETE FROM PlayerlevelEntry;',
      'DELETE FROM Team;',
      'DELETE FROM Court;',
      'DELETE FROM Location;',
      'DELETE FROM Player;',
      'DELETE FROM Club;',
      'DELETE FROM Event;',
      'DELETE FROM stage;',
    ];

    // // reset identity
    // queries.push(
    //   // 'ALTER TABLE TournamentDay ALTER COLUMN id COUNTER(1,1);',
    //   // 'ALTER TABLE stageentry ALTER COLUMN ID COUNTER(1,1);',
    //   // 'ALTER TABLE League ALTER COLUMN id COUNTER(1,1);',
    //   // 'ALTER TABLE Entry ALTER COLUMN id COUNTER(1,1);',
    //   // 'ALTER TABLE PlayerlevelEntry ALTER COLUMN id COUNTER(1,1);',
    //   'ALTER TABLE Team ALTER COLUMN id COUNTER(1,1);',
    //   // 'ALTER TABLE Court ALTER COLUMN id COUNTER(1,1);',
    //   // 'ALTER TABLE Location ALTER COLUMN id COUNTER(1,1);',
    //   'ALTER TABLE Player ALTER COLUMN id COUNTER(1,1);',
    //   'ALTER TABLE Club ALTER COLUMN id COUNTER(1,1);',
    //   // 'ALTER TABLE Event ALTER COLUMN id COUNTER(1,1);',
    //   // 'ALTER TABLE stage ALTER COLUMN ID COUNTER(1,1);'
    // );

    // insert default stages
    queries.push(
      `INSERT INTO League(id, name) VALUES(1, "Heren");`,
      `INSERT INTO League(id, name) VALUES(2, "Dames");`,
      `INSERT INTO League(id, name) VALUES(3, "Gemengd");`,
      `UPDATE SettingsMemo SET [value] = NULL where [name] = "TournamentLogo"`
    );

    // if the cp file is new,
    if (!existed) {
      //  we need to set a new unicode
      queries.push(
        `UPDATE settings SET [value] = "${moment().format(
          'YYYYMMDDHHmmssSSSS'
        )}" where [name] = "unicode"`
      );

      // we need to clear the director settings
      queries.push(
        `UPDATE settings SET [value] = NULL where 
        [name] = "director" or 
        [name] = "DirectorEmail" or 
        [name] = "DirectorPhone" or 
        [name] = "LocationAddress1" or 
        [name] = "LocationPostalCode" or 
        [name] = "LocationCity" or 
        [name] = "LocationState" or 
        [name] = "Location"`
      );

      // Set the name
      queries.push(
        `UPDATE settings SET [value] = "${event.name}" where [name] = "tournament"`
      );
    }

    await this.connection.transaction(queries);

    return resolve(destination);
  }

  private async _addEvents(event: EventCompetition) {
    const subEvents = await event.getSubEventCompetitions();
    this.logger.debug(`Adding ${subEvents.length} events`);
    const eventList = new Map<
      string,
      {
        cpId: string;
        dbSubEvent: SubEventCompetition;
        'Main Draw': number;
        Reserves: number;
        Uitloten: number;
      }
    >();

    for (let i = 0; i < subEvents.length; i++) {
      const subEvent = subEvents[i];
      const gender = this._getGender(subEvent.eventType);
      const queryEvent = `INSERT INTO Event(name, gender, eventtype, league, sortorder) VALUES("${subEvent.name}", ${gender}, 2, ${gender},${i});`;
      // this.logger.verbose(`Query: ${queryEvent}`);
      const eventRes = await this.connection.execute(
        queryEvent,
        `SELECT @@Identity AS id`
      );

      const responseEvent = eventRes[0];
      const event = {
        cpId: responseEvent.id,
        dbSubEvent: subEvent,
        'Main Draw': -1,
        Reserves: -1,
        Uitloten: -1,
      };
      for (const stage of this.stages) {
        const queryStage = `INSERT INTO stage(name, event, displayorder, stagetype) VALUES("${stage.name}","${responseEvent.id}", "${stage.displayOrder}", "${stage.stagetype}");`;
        // this.logger.verbose(`Query: ${queryStage}`);
        const stageRes = await this.connection.execute(
          queryStage,
          `SELECT @@Identity AS id`
        );
        const responseStage = stageRes[0];

        // check if the event has the name
        if (stage.name) event[stage.name] = responseStage.id;
      }
      eventList.set(subEvent.id, event);
    }

    return eventList;
  }

  private async _addClubs(
    events: Map<
      string,
      {
        cpId: string;
        dbSubEvent: SubEventCompetition;
      }
    >
  ) {
    const clubList = new Map<
      string,
      {
        cpId: string;
        dbClub: Club;
      }
    >();

    const subEvents = [...events.values()]?.map((r) => r.dbSubEvent);

    for (const subEvent of subEvents) {
      const entries = await subEvent.getEventEntries();
      for (const entry of entries) {
        const team = await entry.getTeam();
        const club = await team.getClub();

        if (!club) {
          continue;
        }

        if (!clubList.has(club.id)) {
          // Insert club into cp file
          const queryClub = `INSERT INTO Club(name, clubId, country, abbreviation) VALUES ("${this._sqlEscaped(
            club.name || ''
          )}", "${club.clubId}", 19, "${club.abbreviation}")`;
          // this.logger.verbose(`Query: ${queryClub}`);
          const clubRes = await this.connection.execute(
            queryClub,
            `SELECT @@Identity AS id`
          );
          const responseClub = clubRes[0];
          clubList.set(club.id, {
            cpId: responseClub.id,
            dbClub: club,
          });
        }
      }
    }

    return clubList;
  }

  private async _addLocations(
    clubs: Map<
      string,
      {
        cpId: string;
        dbClub: Club;
      }
    >
  ) {
    const locationList = new Map<
      string,
      {
        cpId: string;
        dbLocation: Location;
      }
    >();

    for (const [, { dbClub, cpId }] of clubs) {
      // Insert location into cp file
      const locations = await dbClub.getLocations();
      for (const location of locations) {
        const queryLocation = `INSERT INTO Location(name, address, postalcode, city, phone, clubid) VALUES ("${this._sqlEscaped(
          location.name || ''
        )}", "${this._sqlEscaped(location.street || '')} ${
          location.streetNumber
        }", "${location.postalcode}", "${location.city}", "${
          location.phone
        }", ${cpId} )`;
        // this.logger.verbose(`Query: ${queryLocation}`);
        const locationRes = await this.connection.execute(
          queryLocation,
          `SELECT @@Identity AS id`
        );

        const responseLocation = locationRes[0];
        locationList.set(location.id, {
          cpId: responseLocation.id,
          dbLocation: location,
        });
      }
    }

    return locationList;
  }

  private async _addTeams(
    events: Map<
      string,
      {
        cpId: string;
        dbSubEvent: SubEventCompetition;
      }
    >,
    clubs: Map<
      string,
      {
        cpId: string;
        dbClub: Club;
      }
    >,
    locations: Map<
      string,
      {
        cpId: string;
        dbLocation: Location;
      }
    >
  ) {
    const teamList = new Map<
      string,
      {
        cpId: string;
        dbTeam: Team;
        dbEntry: EventEntry;
      }
    >();
    const subEvents = [...events.values()]?.map((r) => r.dbSubEvent);

    for (const subEvent of subEvents) {
      const entries = await subEvent.getEventEntries();
      for (const entry of entries) {
        const team = await entry.getTeam({
          include: [
            {
              model: Player,
              as: 'players',
            },
          ],
        });
        const club = await team.getClub();

        if (clubs.has(club.id)) {
          const index = entry.meta?.competition?.teamIndex;
          const internalClubId = clubs.get(club.id)?.cpId;
          const captain = await team.getCaptain();
          const teamLocations = await team.getLocations();

          const captainName = captain?.fullName;
          const dayofweek = this._getDayOfWeek(team.preferredDay);
          const plantime = team.preferredTime
            ? `#${team.preferredTime}#`
            : 'NULL';
          const teamName = `${team.name} (${index})`;

          const prefLoc1 = locations.get(teamLocations[0]?.id)?.cpId ?? 'NULL';
          const prefLoc2 = locations.get(teamLocations[1]?.id)?.cpId ?? 'NULL';

          const queryTeam = `INSERT INTO Team(name, club, country, entrydate, contact, phone, email, dayofweek, plantime, preferredlocation1, preferredlocation2) VALUES ("${this._sqlEscaped(
            teamName
          )}", ${internalClubId}, 19, #${moment(entry.createdAt).format(
            'MM/DD/YYYY HH:MM:ss'
          )}#, "${captainName}", "${this._sqlEscaped(
            team.phone
          )}", "${this._sqlEscaped(
            team.email
          )}", ${dayofweek}, ${plantime}, ${prefLoc1}, ${prefLoc2}
      )`;

          try {
            // this.logger.verbose(`Query: ${queryTeam}`);
            const teamRes = await this.connection.execute(
              queryTeam,
              `SELECT @@Identity AS id`
            );
            const response = teamRes[0];
            teamList.set(team.id, {
              cpId: response.id,
              dbTeam: team,
              dbEntry: entry,
            });
          } catch (e) {
            this.logger.error(`Error while inserting team ${team.name}`, e, {
              query: queryTeam,
            });
            this.logger.error(e);
          }
        } else {
          this.logger.error(`Team ${team.name} has no club`);
        }
      }
    }
    return teamList;
  }

  private async _addPlayers(
    teams: Map<
      string,
      {
        cpId: string;
        dbTeam: Team;
        dbEntry: EventEntry;
      }
    >,
    clubs: Map<
      string,
      {
        cpId: string;
        dbClub: Club;
      }
    >
  ) {
    const playerList = new Map<
      string,
      {
        cpId: string;
        dbPlayer: Player;
      }
    >();

    const playersPerClub = new Map<string, EntryCompetitionPlayer[]>();
    for (const [, { dbTeam, dbEntry }] of teams) {
      const players = [...(dbEntry?.meta?.competition?.players ?? [])];

      if (!dbTeam.clubId) {
        throw new Error(`Team ${dbTeam.name} has no club`);
      }

      if (playersPerClub.has(dbTeam.clubId)) {
        //  add players to existing list if they are not already in there

        const existingPlayers = playersPerClub.get(dbTeam.clubId) ?? [];
        for (const player of players) {
          if (!existingPlayers.find((p) => p.id === player.id)) {
            existingPlayers.push(player);
          }
        }

        playersPerClub.set(dbTeam.clubId, existingPlayers);
      } else {
        playersPerClub.set(dbTeam.clubId, players);
      }
    }

    const queries: string[] = [];
    for (const [clubId, players] of playersPerClub) {
      const dbPlayers = await Player.findAll({
        where: {
          id: players?.map((p) => p.id) ?? [],
        },
      });

      for (const dbPlayer of dbPlayers) {
        const gender = this._getGender(dbPlayer.gender);
        const internalClubId = clubs.get(clubId);
        const queryPlayer = `INSERT INTO Player(name, firstname, gender, memberid, club, foreignid, dob) VALUES (
        "${this._sqlEscaped(dbPlayer.lastName)}", "${this._sqlEscaped(
          dbPlayer.firstName
        )}", ${gender}, ${this._sqlEscaped(dbPlayer?.memberId)}, ${
          internalClubId?.cpId
        }, NULL, NULL)`;
        // this.logger.verbose(`Query: ${queryPlayer}`);
        const playerRes = await this.connection.execute(
          queryPlayer,
          `SELECT @@Identity AS id`
        );

        const response = playerRes[0];
        playerList.set(dbPlayer.id, {
          cpId: response.id,
          dbPlayer: dbPlayer,
        });

        const entryPlayer = players.find((p) => p.id === dbPlayer.id);

        queries.push(
          `INSERT INTO PlayerlevelEntry(leveltype, playerid, level1, level2, level3) VALUES (1, ${
            response.id
          }, ${entryPlayer?.single ?? -1}, ${entryPlayer?.double ?? -1}, ${
            entryPlayer?.mix ?? -1
          })`
        );
      }
    }

    for (const [, { dbTeam, dbEntry, cpId }] of teams) {
      const players = [...(dbEntry?.meta?.competition?.players ?? [])];

      const query = players?.map((p) => {
        if (!p?.id) {
          this.logger.error(
            `Team ${dbTeam.name}(${dbTeam.id}) has invalid players`
          );
        }

        const player = playerList.get(p.id ?? '');

        if (!player?.cpId) {
          this.logger.error(
            `Team ${dbTeam.name}(${dbTeam.id}) has invalid players`
          );
        }

        return [
          `INSERT INTO TeamPlayer(team, player, status) VALUES (${cpId}, ${player?.cpId}, 1)`,
        ];
      });
      queries.push(...query.flat());
    }

    await this.connection.transaction(queries);

    return playerList;
  }
  private async _addEntries(
    events: Map<
      string,
      {
        cpId: string;
        dbSubEvent: SubEventCompetition;
        'Main Draw': number;
        Reserves: number;
        Uitloten: number;
      }
    >,
    teams: Map<
      string,
      {
        cpId: string;
        dbTeam: Team;
        dbEntry: EventEntry;
      }
    >
  ) {
    for (const [, { cpId, dbEntry }] of teams) {
      if (!dbEntry?.subEventId) {
        throw new Error(`Entry ${dbEntry?.id} has no subEventId`);
      }

      const subEvent = events.get(dbEntry.subEventId);

      const entryQuery = `INSERT INTO Entry(event, team) VALUES ("${subEvent?.cpId}", "${cpId}")`;
      // this.logger.verbose(`Query: ${entryQuery}`);
      const entryRes = await this.connection.execute(
        entryQuery,
        `SELECT @@Identity AS id`
      );

      const stageQuery = `INSERT INTO stageentry(entry, stage) VALUES (${entryRes[0].id}, ${subEvent?.['Main Draw']})`;
      // this.logger.verbose(`Query: ${stageQuery}`);
      await this.connection.execute(stageQuery);
    }
  }
  private async _addMemos(
    event: EventCompetition,
    clubs: Map<
      string,
      {
        cpId: string;
        dbClub: Club;
      }
    >,
    teams: Map<
      string,
      {
        cpId: string;
        dbTeam: Team;
        dbEntry: EventEntry;
      }
    >
  ) {
    const memos = new Map<
      string,
      {
        errors?: string[];
        availibility?: {
          location: string;
          days: string[];
          exceptions: string[];
        }[];
        exceptions?: string[];
        comments: string[];
      }
    >();

    for (const [, { cpId, dbClub }] of clubs) {
      // find the teams of the club
      const teamsOfClub = [...teams.values()].filter(
        (t) => t.dbTeam.clubId === dbClub.id
      );

      const validation = await this._validation.fetchAndValidate(
        {
          teams: teamsOfClub.map((t) => ({
            id: t.dbTeam.id,
            name: t.dbTeam.name,
            type: t.dbTeam.type,
            link: t.dbTeam.link,
            teamNumber: t.dbTeam.teamNumber,
            basePlayers: [...(t.dbEntry?.meta?.competition?.players ?? [])],
            players: (t.dbTeam.players ?? [])
              .filter(
                (p) =>
                  p.TeamPlayerMembership.membershipType ===
                  TeamMembershipType.REGULAR
              )
              .map((p) => p.id),
            backupPlayers: (t.dbTeam.players ?? [])
              .filter(
                (p) =>
                  p.TeamPlayerMembership.membershipType ===
                  TeamMembershipType.BACKUP
              )
              .map((p) => p.id),
            subEventId: t.dbEntry?.subEventId,
          })),

          season: event.season,
        },
        EnrollmentValidationService.defaultValidators()
      );

      const comments = await dbClub.getComments({
        where: {
          linkType: 'competition',
          linkId: event.id,
        },
      });

      for (const team of validation.teams ?? []) {
        try {
          if (!team) {
            continue;
          }

          const teaminput = teams.get(team.id);

          if (!teaminput) {
            this.logger.warn(
              `Team ${team.id} is not in the list of teams of the club ${dbClub.name}(${dbClub.id})`
            );
            continue;
          }

          this.logger.verbose(
            `Team ${teaminput.dbTeam.name}(${team.id}) has ${team.errors?.length} errors`
          );

          memos.set(teaminput.cpId, {
            errors: (team.errors?.map((e) => {
              if (!e.message) {
                return '';
              }

              const message: string = this.i18nService.translate(e.message, {
                args: e.params as never,
                lang: 'nl_BE',
              });

              // replace all html tags with nothing

              return this._sqlEscaped(message.replace(/<[^>]*>?/gm, ''));
            }) ?? []) as string[],
            comments: comments?.map((c) => `${c.message}`),
          });
        } catch (e) {
          this.logger.verbose(
            `Error while processing team ${team.id} of club ${dbClub.name}(${dbClub.id})`
          );
          this.logger.error(e);
        }
      }
    }

    // Add memos to database
    const queries = [];
    for (const [teamId, value] of memos) {
      let memo = '';
      if (value.availibility) {
        for (const loc of value.availibility) {
          memo += `--==[locatie: ${this._sqlEscaped(loc.location)}]==--\n`;
          if (loc.days.length > 0) {
            memo += 'Beschikbaarheden:';
            for (const day of loc.days) {
              memo += `\n  - ${day}`;
            }
          }
          if (loc.days.length > 0 && loc.exceptions.length > 0) {
            memo += '\n';
          }

          if (loc.exceptions.length > 0) {
            memo += 'Uitzonderingen:';
            for (const exc of loc.exceptions) {
              memo += `\n  - ${exc}`;
            }
          }
        }
        memo += '\n\n';
      }

      if ((value?.errors?.length ?? 0) > 0) {
        memo += `--==[Fouten]==--\n`;
        memo += value.errors?.join('\n');
        memo += '\n\n';
      }

      if (value.comments?.length > 0) {
        memo += `--==[Club comments]==--\n`;
        memo += value.comments?.map((m) => this._sqlEscaped(m)).join('\n');
        memo += '\n\n';
      }

      if (memo?.length > 0) {
        queries.push(`UPDATE Team set [memo] = "${memo}" where id = ${teamId}`);
      }
    }
    try {
      this.logger.verbose(`Updating memos for ${queries.length} teams`);
      await this.connection.transaction(queries);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  private _sqlEscaped(str?: string) {
    str = str?.replace(/"/g, "'")?.trim();
    return str;
  }

  private _getDayOfWeek(day?: string) {
    if (!day) {
      return 'NULL';
    }

    switch (day) {
      case 'monday':
        return 1;
      case 'tuesday':
        return 2;
      case 'wednesday':
        return 3;
      case 'thursday':
        return 4;
      case 'friday':
        return 5;
      case 'saturday':
        return 6;
      case 'sunday':
        return 7;
      default:
        this.logger.warn('no day?', day);
    }
  }

  private _getGender(gender?: string) {
    if (!gender) {
      return 'NULL';
    }

    switch (gender) {
      case 'M':
      case SubEventTypeEnum.M:
        return 1;

      case 'F':
      case 'V':
      case SubEventTypeEnum.F:
        return 2;

      case 'MX':
      case SubEventTypeEnum.MX:
        return 3;

      default:
        this.logger.warn('no gender?', gender);
    }
  }
}
