import { SubEventTypeEnum } from '@badman/utils';
import { Club } from './club.model';
import { EventEntry } from './entry.model';
import { Location } from './location.model';
import { Player, TeamPlayer } from './player.model';

export class Team {
  id!: string;
  slug?: string;
  name?: string;
  abbreviation?: string;
  type?: SubEventTypeEnum;
  teamNumber?: number;
  preferredTime?: string;
  preferredDay?: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  prefferedLocationId?: string;

  preferred2Time?: string;
  preferred2Day?:
    | 'sunday'
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday';
  prefferedLocation2Id?: string;

  players!: TeamPlayer[];
  locations?: Location[];
  entry?: EventEntry;
  season?: number;

  baseIndex?: number;
  captain?: Player;
  captainId?: string;
  email?: string;
  phone?: string;
  club?: Club;
  clubId?: string;
  link?: string;

  constructor(args?: Partial<Team>) {
    if (!args?.id) {
      console.error(`${this.constructor.name} needs an id`);
      return;
    }
    this.id = args.id;

    this.slug = args?.slug;
    this.name = args?.name;
    this.teamNumber = args?.teamNumber;
    this.abbreviation = args?.abbreviation;
    this.type = args?.type;
    this.clubId = args?.clubId;

    this.preferredTime = args?.preferredTime;
    this.preferredDay = args?.preferredDay;
    this.prefferedLocationId = args?.prefferedLocationId;

    this.preferred2Time = args?.preferred2Time;
    this.preferred2Day = args?.preferred2Day;
    this.prefferedLocation2Id = args?.prefferedLocation2Id;

    this.locations = args?.locations?.map((l) => new Location(l));
    this.entry =
      args?.entry != null
        ? new EventEntry({
            ...args.entry,
            team: this,
          })
        : undefined;
    this.captain = args?.captain != null ? new Player(args?.captain) : undefined;
    this.club = args?.club != null ? new Club(args?.club) : undefined;
    this.captainId = args?.captain?.id ?? args?.captainId;
    this.email = args?.email;
    this.phone = args?.phone;
    this.season = args?.season;
    this.link = args?.link;

    this.players =
      args?.players?.map((p) => {
        const player = new TeamPlayer(p);

        if (player.lastRanking) {
          let index = this.type == 'MX' ? 36 : 24;
          let indexSplit = this.type == 'MX' ? '12-12-12' : '12-12';
          if (player.lastRanking) {
            if (this.type == 'MX') {
              index =
                (player.lastRanking.single ?? 0) +
                (player.lastRanking.double ?? 0) +
                (player.lastRanking.mix ?? 0);
              indexSplit = `${player.lastRanking.single}-${player.lastRanking.double}-${player.lastRanking.mix}`;
            } else {
              index = (player.lastRanking.single ?? 0) + (player.lastRanking.double ?? 0);
              indexSplit = `${player.lastRanking.single}-${player.lastRanking.double}`;
            }
          }

          player.index = index;
          player.indexSplit = indexSplit;
        }
        return player;
      }) ?? [];

    this.calculateBase();
  }

  private calculateBase() {
    const basePlayers = this.players;
    if (basePlayers.length == 0) {
      return;
    }

    if (this.type !== 'MX') {
      const bestPlayers = basePlayers
        .map((r) => r.index)
        .sort((a, b) => (a ?? 0) - (b ?? 0))
        .slice(0, 4);

      let missingIndex = 0;

      if (bestPlayers.length < 4) {
        missingIndex = (4 - bestPlayers.length) * 24;
      }

      this.baseIndex = bestPlayers.reduce((a, b) => (a ?? 0) + (b ?? 0), missingIndex);
    } else {
      const bestPlayers = [
        // 2 best male
        ...basePlayers
          .filter((p) => p.gender == 'M')
          .map((r) => r.index)
          .sort((a, b) => (a ?? 0) - (b ?? 0))
          .slice(0, 2),
        // 2 best female
        ...basePlayers
          .filter((p) => p.gender == 'F')
          .map((r) => r.index)
          .sort((a, b) => (a ?? 0) - (b ?? 0))
          .slice(0, 2),
      ];

      let missingIndex = 0;
      if (bestPlayers.length < 4) {
        missingIndex = (4 - bestPlayers.length - 4) * 36;
      }

      this.baseIndex = bestPlayers.reduce((a, b) => (a ?? 0) + (b ?? 0), missingIndex);
    }
  }
}
