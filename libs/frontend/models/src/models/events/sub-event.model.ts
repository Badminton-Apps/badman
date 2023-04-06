import { EventEntry } from '../entry.model';
import { Game } from '../game.model';
import { RankingGroup } from '../group.model';
import { Player } from '../player.model';

export class SubEvent {
  id?: string;
  name?: string;
  eventType?: string;
  eventId?: string;
  level?: number;
  maxLevel?: number;
  minBaseIndex?: number;
  maxBaseIndex?: number;
  eventEntries?: EventEntry[];

  games?: Game[];
  rankingGroups?: RankingGroup[];
  meta?: SubEventMeta;

  constructor(args: Partial<SubEvent>) {
    this.id = args?.id;
    this.meta = args?.meta;
    this.eventType = args?.eventType;
    this.eventId = args?.eventId;
    this.name = args?.name;
    this.level = args?.level;
    this.games = args?.games?.map((g) => new Game(g));
    this.rankingGroups = args?.rankingGroups?.map((g) => new RankingGroup(g));
    this.eventEntries = args?.eventEntries?.map((e) => new EventEntry(e));
    this.maxLevel = args?.maxLevel;
    this.minBaseIndex = args?.minBaseIndex;
    this.maxBaseIndex = args?.maxBaseIndex;
  }
}

interface SubEventMeta {
  teamIndex: number;
  players: {
    id: string;
    single: number;
    double: number;
    mix: number;
    gender: string;
    player: Partial<Player>;
  }[];
}
