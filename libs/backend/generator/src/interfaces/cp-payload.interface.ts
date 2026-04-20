/**
 * CpPayload: The JSON contract between CpDataCollector (TypeScript/PostgreSQL)
 * and CpFileWriter (standalone script running on Windows via GitHub Actions).
 *
 * All entities use `refId` (PostgreSQL UUID) for cross-referencing.
 * The CpFileWriter resolves these to auto-increment MDB IDs internally.
 */

export interface CpPayload {
  event: CpEvent;
  subEvents: CpSubEvent[];
  clubs: CpClub[];
  locations: CpLocation[];
  teams: CpTeam[];
  players: CpPlayer[];
  teamPlayers: CpTeamPlayer[];
  entries: CpEntry[];
  memos: CpMemo[];
  settings: CpSettings;
}

export interface CpEvent {
  name: string;
  season: number;
}

export interface CpSubEvent {
  refId: string;
  name: string;
  /** 1 = Male, 2 = Female, 3 = Mixed */
  gender: number | null;
  /** Sort order in the event list */
  sortOrder: number;
}

export interface CpClub {
  refId: string;
  name: string;
  clubId: number | string;
  /** Country code, hardcoded to 19 (Belgium) */
  country: number;
  abbreviation: string;
}

export interface CpLocation {
  refId: string;
  clubRefId: string;
  name: string;
  address: string;
  postalcode: string;
  city: string;
  phone: string | null;
}

export interface CpTeam {
  refId: string;
  clubRefId: string;
  subEventRefId: string;
  name: string;
  /** Country code, hardcoded to 19 (Belgium) */
  country: number;
  /** Formatted as MM/DD/YYYY HH:MM:ss */
  entryDate: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  /** 1=monday through 7=sunday, or null */
  dayOfWeek: number | string | null;
  /** Time string like "HH:MM" or null */
  planTime: string | null;
  /** refId of the preferred Location, or null */
  preferredLocationRefId: string | null;
}

export interface CpPlayer {
  refId: string;
  clubRefId: string;
  lastName: string;
  firstName: string;
  /** 1 = Male, 2 = Female, 3 = Mixed */
  gender: number | null;
  memberId: string | null;
  levels: CpPlayerLevels;
}

export interface CpPlayerLevels {
  single: number;
  double: number;
  mix: number;
}

export interface CpTeamPlayer {
  teamRefId: string;
  playerRefId: string;
  status: number;
}

export interface CpEntry {
  teamRefId: string;
  subEventRefId: string;
}

export interface CpMemo {
  teamRefId: string;
  memo: string;
}

export interface CpSettings {
  tournamentName: string;
}
