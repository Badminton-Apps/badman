import { EntryCompetition, EntryCompetitionPlayer, EntryTournament, Player } from '../models';
export declare class EntryMetaType {
    tournament?: EntryTournament;
    competition?: EntryCompetition;
}
export declare class EntryTournamentType {
    place?: number;
}
export declare class EntryCompetitionType {
    teamIndex?: number;
    players?: EntryCompetitionPlayer[];
}
export declare class EntryCompetitionPlayersType {
    id?: string;
    single?: number;
    double?: number;
    mix?: number;
    gender?: 'M' | 'F';
    player?: Player;
    levelException?: boolean;
}
declare const EntryCompetitionPlayersInputType_base: import("@nestjs/common").Type<Partial<Omit<EntryCompetitionPlayersType, "player">>>;
export declare class EntryCompetitionPlayersInputType extends EntryCompetitionPlayersInputType_base {
}
export {};
