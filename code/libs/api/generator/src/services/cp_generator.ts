import {
  Club,
  Comment,
  EventCompetition,
  EventEntry,
  Location,
  Player,
  SubEventCompetition,
  SubEventType,
  Team,
} from '@badman/api/database';
import { parseString } from '@fast-csv/parse';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import { copyFile, readFile, unlink } from 'fs/promises';
import moment from 'moment';
import { resolve } from 'path';
import path = require('path');

@Injectable()
export class CpGeneratorService {
  private readonly logger = new Logger(CpGeneratorService.name);
  private connection;
  private stages = [
    { name: 'Main Draw', displayOrder: 1, stagetype: 1 },
    { name: 'Reserves', displayOrder: 9998, stagetype: 9998 },
    { name: 'Uitloten', displayOrder: 9999, stagetype: 9999 },
  ];

  constructor(private _configService: ConfigService) {
    this.logger.log(`CP_PASS: ${this._configService.get('CP_PASS')}`);
  }

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

    this.logger.debug('Reading players');
    const csvPlayers = await this._readCsvPlayers(event.startYear);

    this.logger.debug('Adding evetns');
    const events = await this._addEvents(event);

    this.logger.debug('Adding clubs');
    const clubs = await this._addClubs(events);

    this.logger.debug('Adding locations');
    const locations = await this._addLocations(clubs);

    this.logger.debug('Adding teams');
    const teams = await this._addTeams(events, clubs, locations, csvPlayers);

    this.logger.debug('Adding entries');
    await this._addEntries(events, teams);

    this.logger.debug('Adding players');
    await this._addPlayers(teams, clubs, csvPlayers);

    // await this._addTournamentDays(event);

    this.logger.debug('Adding memos');
    await this._addMemos(event, events, teams, csvPlayers);

    this.logger.log(`Generation ${event.name} done`);

    return file;
  }

  private async _readCsvPlayers(year: number) {
    const filePath = path.join(
      process.cwd(),
      `libs/api/generator/assets/indexen/Lijst_index_seizoen_${year}-${
        year + 1
      }.csv`
    );

    const csvFile = await readFile(filePath, 'utf8');

    return new Promise<Map<string, csvPlayer>>((resolve, reject) => {
      const stream = parseString(csvFile, {
        headers: true,
        delimiter: ',',
        ignoreEmpty: true,
      });
      const code_players: Map<string, csvPlayer> = new Map();
      stream.on('data', (row: csvPlayer) => {
        if (code_players.get(row.Lidnummer) != null) {
          this.logger.warn('Player exists twice?', row.Lidnummer);
        }

        code_players.set(row.Lidnummer, row);
      });
      stream.on('error', (error) => {
        this.logger.error(error);
        reject(error);
      });
      stream.on('end', async () => {
        resolve(code_players);
      });
    });
  }

  private async _prepCPfile(event: EventCompetition, ADODB: any) {
    const original = path.join(
      process.cwd(),
      `libs/api/generator/assets/${event.name}_empty.cp`
    );
    const destination = path.join(
      process.cwd(),
      `libs/api/generator/assets/${event.name}.cp`
    );

    if (existsSync(destination)) {
      await unlink(destination);
    }
    await copyFile(original, destination);

    this.connection = ADODB.open(
      `Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${destination};Jet OLEDB:Database Password=${this._configService.get(
        'CP_PASS'
      )}`
    );
    await this.connection.transaction([
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
      `UPDATE settings SET [value] = "${moment().format(
        'YYYYMMDD'
      )}${moment().valueOf()}" where [name] = "unicode"`,
      `UPDATE settings SET [value] = "${event.name}" where [name] = "tournament"`,
      `UPDATE settings SET [value] = NULL where 
      [name] = "director" or 
      [name] = "DirectorEmail" or 
      [name] = "DirectorPhone" or 
      [name] = "LocationAddress1" or 
      [name] = "LocationPostalCode" or 
      [name] = "LocationCity" or 
      [name] = "LocationState" or 
      [name] = "Location"`,
      `UPDATE SettingsMemo SET [value] = NULL where 
      [name] = "TournamentLogo"`,
      `INSERT INTO League(id, name) VALUES(1, "Heren");`,
      `INSERT INTO League(id, name) VALUES(2, "Dames");`,
      `INSERT INTO League(id, name) VALUES(3, "Gemegnd");`,
    ]);

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
      this.logger.verbose(`Query: ${queryEvent}`);
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
        this.logger.verbose(`Query: ${queryStage}`);
        const stageRes = await this.connection.execute(
          queryStage,
          `SELECT @@Identity AS id`
        );
        const responseStage = stageRes[0];
        event[stage.name] = responseStage.id;
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

        if (!clubList.has(club.id)) {
          // Insert club into cp file
          const queryClub = `INSERT INTO Club(name, clubId, country, abbreviation) VALUES ("${this._sqlEscaped(
            club.name
          )}", "${club.clubId}", 19, "${club.abbreviation}")`;
          this.logger.verbose(`Query: ${queryClub}`);
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

    for (const [clubId, { dbClub, cpId }] of clubs) {
      // Insert location into cp file
      const locations = await dbClub.getLocations();
      for (const location of locations) {
        const queryLocation = `INSERT INTO Location(name, address, postalcode, city, phone, clubid) VALUES ("${this._sqlEscaped(
          location.name
        )}", "${this._sqlEscaped(location.street)} ${
          location.streetNumber
        }", "${location.postalcode}", "${location.city}", "${
          location.phone
        }", ${cpId} )`;
        this.logger.verbose(`Query: ${queryLocation}`);
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
    >,
    players: Map<string, csvPlayer>
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
        const team = await entry.getTeam();
        const club = await team.getClub();

        if (clubs.has(club.id)) {
          const index = await this._getBaseIndex(
            entry,
            subEvent.eventType,
            players
          );
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

          const queryTeam = `INSERT INTO Team(name, club, country, entrydate, contact, phone, email, dayofweek, plantime, preferredlocation1, preferredlocation2) VALUES (
      "${this._sqlEscaped(teamName)}", ${internalClubId}, 19, #${moment(
            entry.createdAt
          ).format(
            'MM/DD/YYYY HH:MM:ss'
          )}#, "${captainName}", "${this._sqlEscaped(
            team.phone
          )}", "${this._sqlEscaped(
            team.email
          )}", ${dayofweek}, ${plantime}, ${prefLoc1}, ${prefLoc2}
      )`;
          this.logger.verbose(`Query: ${queryTeam}`);
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
    >,
    csvplayers: Map<string, csvPlayer>
  ) {
    const playerList = new Map<
      string,
      {
        cpId: string;
        dbPlayer: Player;
      }
    >();

    const distinctPlayers = new Map<string, string[]>();
    for (const [teamId, { dbTeam, dbEntry }] of teams) {
      const players = dbEntry?.meta?.competition?.players ?? [];
      if (distinctPlayers.has(dbTeam.clubId)) {
        distinctPlayers
          .get(dbTeam.clubId)
          .push(...(players?.map((p) => p.id) ?? []));
      } else {
        distinctPlayers.set(
          dbTeam.clubId,
          players?.map((p) => p.id)
        );
      }
    }

    const queries: string[] = [];
    for (const [clubId, players] of distinctPlayers) {
      const dbPlayers = await Player.findAll({
        where: {
          id: players,
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
        this.logger.verbose(`Query: ${queryPlayer}`);
        const playerRes = await this.connection.execute(
          queryPlayer,
          `SELECT @@Identity AS id`
        );

        const response = playerRes[0];
        playerList.set(dbPlayer.id, {
          cpId: response.id,
          dbPlayer: dbPlayer,
        });

        const csvplayer = csvplayers.get(dbPlayer.memberId);

        if (!csvplayer) {
          this.logger.error(
            `Player ${dbPlayer.firstName} ${dbPlayer.lastName} has no csv player`
          );
        }

        queries.push(
          `INSERT INTO PlayerlevelEntry(leveltype, playerid, level1, level2, level3) VALUES (1, ${
            response.id
          }, ${csvplayer?.KlassementEnkel ?? -1}, ${
            csvplayer?.KlassementDubbel ?? -1
          }, ${csvplayer?.KlassementGemengd ?? -1})`
        );
      }
    }

    for (const [teamId, { dbTeam, dbEntry, cpId }] of teams) {
      const players = dbEntry?.meta?.competition?.players ?? [];

      const query = players?.map((p) => {
        const player = playerList.get(p.id);

        if (!player?.cpId) {
          this.logger.error(
            `Team ${dbTeam.name}(${dbTeam.id}) has invalid players`
          );
        }

        return [
          `INSERT INTO TeamPlayer(team, player, status) VALUES (${cpId}, ${player.cpId}, 1)`,
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
      const subEvent = events.get(dbEntry.subEventId);

      const entryQuery = `INSERT INTO Entry(event, team) VALUES ("${subEvent.cpId}", "${cpId}")`;
      this.logger.verbose(`Query: ${entryQuery}`);
      const entryRes = await this.connection.execute(
        entryQuery,
        `SELECT @@Identity AS id`
      );

      const stageQuery = `INSERT INTO stageentry(entry, stage) VALUES (${entryRes[0].id}, ${subEvent['Main Draw']})`;
      this.logger.verbose(`Query: ${stageQuery}`);
      await this.connection.execute(stageQuery);
    }
  }

  private async _addTournamentDays(event: EventCompetition) {
    const start = moment(`${event.startYear}-09-01`);
    const end = moment(`${event.startYear + 1}-05-31`);

    // Generate array for each day from start to end
    const days: moment.Moment[] = [];
    while (start.isSameOrBefore(end)) {
      days.push(start.clone());
      start.add(1, 'days');
    }

    await this.connection.transaction(
      days?.map(
        (d) =>
          `INSERT INTO TournamentDay (tournamentday, availability) VALUES (#${d.format(
            'MM/DD/YYYY HH:MM:ss'
          )}#, 1);`
      )
    );
    return days;
  }

  private async _addMemos(
    event: EventCompetition,
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
    >,
    csvplayers: Map<string, csvPlayer>
  ) {
    const memos = new Map<
      string,
      {
        playerErrors: string[];
        teamErrors: string[];
        availibility: {
          location: string;
          days: string[];
          exceptions: string[];
        }[];
        exceptions: string[];
        comments: string[];
      }
    >();

    for (const [, { cpId, dbTeam, dbEntry }] of teams) {
      const memo = memos.get(cpId) ?? {
        playerErrors: [],
        teamErrors: [],
        availibility: undefined,
        exceptions: undefined,
        comments: [],
      };
      const subEvent = events.get(dbEntry.subEventId);
      const basePlayers = await this._getBasePlayers(
        dbEntry,
        subEvent.dbSubEvent.eventType,
        csvplayers
      );

      // Check players
      for (const player of basePlayers) {
        if (player.double < subEvent.dbSubEvent.maxLevel) {
          memo.playerErrors.push(
            `${player.firstName} ${player.lastName}(${player.memberId}) is te hoog geklaseerd voor ${subEvent.dbSubEvent.name} ${subEvent.dbSubEvent.eventType} (${player.double} minimum ${subEvent.dbSubEvent.maxLevel})`
          );
        }
        if (player.single < subEvent.dbSubEvent.maxLevel) {
          memo.playerErrors.push(
            `${player.firstName} ${player.lastName}(${player.memberId}) is te hoog geklaseerd voor ${subEvent.dbSubEvent.name} ${subEvent.dbSubEvent.eventType}  (${player.single} met minimum ${subEvent.dbSubEvent.maxLevel})`
          );
        }
        if (subEvent.dbSubEvent.eventType == SubEventType.MX) {
          if (player.mix < subEvent.dbSubEvent.maxLevel) {
            memo.playerErrors.push(
              `${player.firstName} ${player.lastName}(${player.memberId}) is te hoog geklaseerd voor ${subEvent.dbSubEvent.name} ${subEvent.dbSubEvent.eventType} (${player.mix} met minimum ${subEvent.dbSubEvent.maxLevel})`
            );
          }
        }
        if (!player.comp) {
          memo.playerErrors.push(
            `${player.firstName} ${player.lastName}(${player.memberId}) is geen competitie speler`
          );
        }
      }

      // Check team
      const index = Team.getIndexFromPlayers(
        subEvent.dbSubEvent.eventType,
        basePlayers
      );
      if (basePlayers.length < 4) {
        memo.teamErrors.push(
          `${4 - basePlayers.length} basis spelers te weinig in team`
        );
      }

      if (
        basePlayers.length >= 4 &&
        (index > subEvent.dbSubEvent.maxBaseIndex ||
          index < subEvent.dbSubEvent.minBaseIndex)
      ) {
        memo.teamErrors.push(
          `${index} niet tussen: ${subEvent.dbSubEvent.minBaseIndex} - ${subEvent.dbSubEvent.maxBaseIndex}`
        );
      }

      // Availibility
      const locations = await dbTeam.getLocations();
      if (locations.length >= 1) {
        for (const location of locations) {
          if (memo.availibility?.find((a) => a.location == location.name)) {
            continue;
          }

          const availabilities = await location.getAvailabilities({
            where: {
              year: event.startYear,
            },
          });
          const days = [];
          const exceptions = [];
          if (availabilities.length >= 1) {
            for (const availability of availabilities) {
              if (availability.days) {
                for (const day of availability.days) {
                  if (day.day) {
                    days.push(`${day.day} - ${day.startTime}: ${day.courts}`);
                  }
                }
              }

              if (availability.exceptions) {
                for (const exception of availability.exceptions) {
                  if (exception.start) {
                    exceptions.push(
                      `${moment(exception.start).format(
                        'DD/MM/YYYY'
                      )} - ${moment(exception.end).format('DD/MM/YYYY')}: ${
                        exception.courts
                      }`
                    );
                  }
                }
              }
            }

            memo.availibility = memo.availibility ?? [];
            memo.availibility.push({
              location: location.name,
              days,
              exceptions,
            });
          }
        }
      }

      // Club comments
      const comments = await Comment.findAll({
        where: {
          clubId: dbTeam.clubId,
          linkType: 'competition',
          linkId: event.id,
        },
        limit: 1,
        order: [['createdAt', 'DESC']],
      });

      memo.comments = comments.map((c) => this._sqlEscaped(c.message));

      memos.set(cpId, memo);
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

      if (value.playerErrors.length > 0) {
        memo += `--==[Speler fouten]==--\n`;
        memo += value.playerErrors.join('\n');
        memo += '\n\n';
      }

      if (value.teamErrors.length > 0) {
        memo += `--==[Team fouten]==--\n`;
        memo += value.teamErrors.join('\n');
        memo += '\n\n';
      }

      if (value.comments.length > 0) {
        memo += `--==[Club comments]==--\n`;
        memo += value.comments.join('\n');
        memo += '\n\n';
      }

      if (memo.length > 0) {
        queries.push(`UPDATE Team set [memo] = "${memo}" where id = ${teamId}`);
      }
    }

    await this.connection.transaction(queries);
  }

  private async _getBasePlayers(
    entry: EventEntry,
    type: SubEventType,
    players: Map<string, csvPlayer>
  ) {
    const csvPlayers: csvPlayer[] = [];

    const dbPlayers = await Player.findAll({
      where: {
        id: entry?.meta?.competition?.players?.map((p) => p.id) ?? [],
      },
    });

    if (!dbPlayers) {
      this.logger.warn(`No players found for entry ${entry.id}`);
      return;
    }

    for (const dbPlayer of dbPlayers) {
      if (!dbPlayer.memberId) {
        this.logger.warn(`Player ${dbPlayer.fullName} has no memberId`);
      }
      const player = players.get(dbPlayer.memberId);
      if (player) {
        csvPlayers.push(player);
      } else {
        this.logger.warn(`Player ${dbPlayer.id} not found`);
      }
    }

    const rankings = csvPlayers.map((r) => {
      return {
        single: parseInt(`${r.KlassementEnkel}`, 10) || 12,
        double: parseInt(`${r.KlassementDubbel}`, 10) || 12,
        mix: parseInt(`${r.KlassementGemengd}`, 10) || 12,
        gender: this._getGender(r.Geslacht),
        firstName: r.Voornaam,
        lastName: r.Achternaam,
        memberId: r.Lidnummer,
        comp: r.Type == 'Competitiespeler',
      };
    });

    let bestPlayers: {
      single: number;
      double: number;
      mix: number;
      gender: string | number;
      firstName: string;
      lastName: string;
      memberId: string;
      comp: boolean;
    }[] = [];
    if (type == 'MX') {
      const bestF = rankings
        .filter((r) => r.gender == 2)
        .sort(
          (a, b) => a.double + a.single + a.mix - b.double - b.single - b.mix
        )
        .slice(0, 2);
      const bestM = rankings
        .filter((r) => r.gender == 1)
        .sort(
          (a, b) => a.double + a.single + a.mix - b.double - b.single - b.mix
        )
        .slice(0, 2);
      bestPlayers = [...bestF, ...bestM];
    } else {
      // Take 4 lowest single and double ranking
      bestPlayers = rankings
        .sort((a, b) => a.double + a.single - b.double - b.single)
        .slice(0, 4);
    }

    return bestPlayers;
  }

  private async _getBaseIndex(
    entry: EventEntry,
    type: SubEventType,
    players: Map<string, csvPlayer>
  ) {
    const basePlayers = await this._getBasePlayers(entry, type, players);
    const index = Team.getIndexFromPlayers(type, basePlayers);

    if (index != entry?.meta?.competition?.teamIndex) {
      // difference between index and teamIndex not bigger then 10
      const diff = Math.abs(index - entry?.meta?.competition?.teamIndex);

      this.logger.warn(
        `Team index ${index} does not match ${entry?.meta?.competition?.teamIndex}`
      );
    }

    return index;
  }

  private async _addAvailibilty(
    event: EventCompetition,
    locations: Map<string, { cpId: string; dbLocation: Location }>,
    days: moment.Moment[]
  ) {
    const queries = [];
    for (const [, { cpId, dbLocation }] of locations) {
      const availabilities = await dbLocation.getAvailabilities({
        where: {
          year: event.startYear,
        },
      });

      for (const availability of availabilities) {
        // get highest number of courts for a day of a location
        const courts = availabilities
          ?.map((a) => a.days?.map((d) => d.courts))
          .flat();
        const maxCourts = Math.max(...courts);
        queries.push(
          ...Array.from({ length: maxCourts }, (x, i) => i).map(
            (r) =>
              `INSERT INTO Court(name, location) VALUES ("${r}", "${cpId}")`
          )
        );

        for (const day of availability.days) {
          for (const playDay of days) {
            if (playDay.isoWeekday() == this._getDayOfWeek(day.day)) {
              queries.push(
                `INSERT INTO TournamentTime(tournamenttime, tournamentday, location, courts) VALUES ("${
                  day.startTime
                }", #${playDay.format('MM/DD/YYYY HH:MM:ss')}#, ${cpId}, ${
                  day.courts
                })`
              );
            }
          }
        }
      }
    }
    await this.connection.transaction(queries);
  }

  private _sqlEscaped(str: string) {
    str = str?.replace(/"/g, "'")?.trim();
    return str;
  }

  private _getDayOfWeek(day: string) {
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
  private _getGender(gender: string) {
    if (!gender) {
      return 'NULL';
    }

    switch (gender) {
      case 'M':
      case SubEventType.M:
        return 1;

      case 'F':
      case 'V':
      case SubEventType.F:
        return 2;

      case 'MX':
      case SubEventType.MX:
        return 3;

      default:
        this.logger.warn('no gender?', gender);
    }
  }
}

interface csvPlayer {
  Club: string;
  Lidnummer: string;
  Voornaam: string;
  Achternaam: string;
  Geslacht: string;
  Type: string;
  KlassementEnkel: string | number;
  KlassementDubbel: string | number;
  KlassementGemengd: string | number;
}
