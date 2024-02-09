import { BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, BuildOptions, HasOneGetAssociationMixin, HasOneSetAssociationMixin, SaveOptions } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { Player } from '../player.model';
import { Team } from '../team.model';
import { DrawCompetition, SubEventCompetition } from './competition';
import { Standing } from './standing.model';
import { DrawTournament, SubEventTournament } from './tournament';
import { Relation } from '../../wrapper';
export declare class EventEntry extends Model {
    constructor(values?: Partial<EventEntry>, options?: BuildOptions);
    id: string;
    team?: Relation<Team>;
    date?: Date;
    teamId?: string;
    player1?: Relation<Player>;
    player1Id: string;
    player2?: Relation<Player>;
    player2Id: string;
    subEventTournament?: Relation<SubEventTournament>;
    /**
     * Draw get's deciede upon draw
     */
    drawTournament?: Relation<DrawTournament>;
    subEventCompetition?: Relation<SubEventCompetition>;
    /**
     * Draw get's deciede upon draw
     */
    drawCompetition?: Relation<DrawCompetition>;
    subEventId?: string;
    drawId?: string;
    entryType?: string;
    standing?: Standing;
    meta?: Meta;
    getTeam: BelongsToGetAssociationMixin<Team>;
    setTeam: BelongsToSetAssociationMixin<Team, string>;
    getPlayer1: BelongsToGetAssociationMixin<Player>;
    setPlayer1: BelongsToSetAssociationMixin<Player, string>;
    getPlayer2: BelongsToGetAssociationMixin<Player>;
    setPlayer2: BelongsToSetAssociationMixin<Player, string>;
    getPlayers(): Promise<[Player, Player]> | Promise<[Player]>;
    getSubEventTournament: BelongsToGetAssociationMixin<SubEventTournament>;
    setSubEventTournament: BelongsToSetAssociationMixin<SubEventTournament, string>;
    getDrawTournament: BelongsToGetAssociationMixin<DrawTournament>;
    setDrawTournament: BelongsToSetAssociationMixin<DrawTournament, string>;
    getSubEventCompetition: BelongsToGetAssociationMixin<SubEventCompetition>;
    setSubEventCompetition: BelongsToSetAssociationMixin<SubEventCompetition, string>;
    getDrawCompetition: BelongsToGetAssociationMixin<DrawCompetition>;
    setDrawCompetition: BelongsToSetAssociationMixin<DrawCompetition, string>;
    getStanding: HasOneGetAssociationMixin<Standing>;
    setStanding: HasOneSetAssociationMixin<Standing, string>;
    static recalculateCompetitionIndex(instance: EventEntry, options: SaveOptions): Promise<void>;
}
export declare class EventEntryCompetitionPlayerMetaInput {
    id?: string;
    single?: number;
    double?: number;
    mix?: number;
    gender?: 'M' | 'F';
}
export declare class EventEntryCompetitionMetaInput {
    teamIndex?: number;
    players?: EventEntryCompetitionPlayerMetaInput[];
}
export declare class EventEntryTournamentMetaInput {
    place?: number;
}
export declare class EventEntryMetaInput {
    tournament?: EventEntryTournamentMetaInput;
    competition?: EventEntryCompetitionMetaInput;
}
declare const EventEntryUpdateInput_base: import("@nestjs/common").Type<Partial<Omit<EventEntry, "createdAt" | "updatedAt" | "team" | "subEventTournament" | "drawTournament" | "subEventCompetition" | "drawCompetition" | "standing" | "meta">>>;
export declare class EventEntryUpdateInput extends EventEntryUpdateInput_base {
    meta?: EventEntryMetaInput;
}
declare const EventEntryNewInput_base: import("@nestjs/common").Type<Partial<Omit<EventEntryUpdateInput, "id">>>;
export declare class EventEntryNewInput extends EventEntryNewInput_base {
}
export interface Meta {
    tournament?: EntryTournament;
    competition?: EntryCompetition;
}
export interface EntryTournament {
    place?: number;
}
export interface EntryCompetition {
    teamIndex?: number;
    players: EntryCompetitionPlayer[];
}
export interface EntryCompetitionPlayer {
    id?: string;
    single?: number;
    double?: number;
    mix?: number;
    gender?: 'M' | 'F';
    levelException?: boolean;
    player?: Relation<Player>;
}
export {};
