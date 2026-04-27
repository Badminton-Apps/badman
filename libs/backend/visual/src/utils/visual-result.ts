import { z } from "zod";

/**
 * Strict coercion for required ID / Code-style fields.
 *
 * `z.coerce.string()` calls `String(input)` which produces `"undefined"`
 * for an `undefined` input — a silent false-negative that lets a missing
 * required field sneak past validation. Use `requiredCoercedString` for
 * any required field where the API may send either a string or a number
 * (fast-xml-parser parses numeric tag bodies as numbers). It accepts
 * both, transforms numbers to strings, and rejects undefined / null.
 */
const requiredCoercedString = z
  .union([z.string(), z.number()])
  .transform((v) => String(v));

export interface XmlResult {
  Tournament?: XmlTournament | XmlTournament[];
  TournamentMatch?: XmlTournamentMatch;
  Error?: XmlError;
  TournamentEvent?: XmlTournamentEvent | XmlTournamentEvent[];
  TournamentDraw?: XmlTournamentDraw | XmlTournamentDraw[];
  Team?: XmlTeam | XmlTeam[];
  TeamMatch?: XmlTeamMatch[];
  Match?: XmlMatch[];
  Player?: XmlPlayer | XmlPlayer[];
  Club?: XmlClub | XmlClub[];
  Ranking?: XmlRanking;
  RankingCategory?: XmlRankingCategory[];
  RankingPublication?: XmlRankingPublication[];
  RankingPublicationPoints?: XmlRankingPublicationPoint[];
  _Version: string;
}

export const XmlRankingSchema = z
  .object({
    Code: requiredCoercedString,
    Name: z.string(),
  })
  .passthrough();
export type XmlRanking = z.infer<typeof XmlRankingSchema>;

export const XmlRankingCategorySchema = z
  .object({
    Code: requiredCoercedString,
    Name: z.string(),
  })
  .passthrough();
export type XmlRankingCategory = z.infer<typeof XmlRankingCategorySchema>;

const XmlPlayerStubSchema = z
  .object({
    Code: requiredCoercedString,
    MemberID: requiredCoercedString,
    Name: z.string(),
    CountryCode: z.string().optional(),
  })
  .passthrough();

export const XmlRankingPublicationPointSchema = z
  .object({
    Rank: z.coerce.number(),
    PreviousRank: z.coerce.string().optional(),
    Level: z.coerce.number(),
    Totalpoints: z.coerce.number(),
    Player1: XmlPlayerStubSchema,
  })
  .passthrough();
export type XmlRankingPublicationPoint = z.infer<typeof XmlRankingPublicationPointSchema>;

// Runtime schema for a single ranking publication returned by the Visual API.
// Used as the single source of truth: the TS type below is derived via
// z.infer, and visual.service.getPublications validates every response shape
// against this schema. If the upstream API ever changes shape again we get a
// clear, early error at the boundary instead of a downstream RangeError /
// TypeError deep inside the sync pipeline.
//
// Notes on PublicationDate / Visible:
//   - PublicationDate is a string. fast-xml-parser yields the raw text node
//     ("yyyy-MM-dd"); the JSON branch added in 515cedb3b yields a full
//     ISO-8601 datetime ("yyyy-MM-dd'T'HH:mm:ss[.SSSZ]"). Either is accepted.
//   - Year / Week come back as strings from XML and may come back as numbers
//     from the JSON branch — coerce.
export const XmlRankingPublicationSchema = z.object({
  Code: z.string(),
  Name: z.string(),
  Year: requiredCoercedString,
  Week: requiredCoercedString,
  PublicationDate: z.string().min(1),
  Visible: z.coerce.boolean(),
});

export type XmlRankingPublication = z.infer<typeof XmlRankingPublicationSchema>;

interface XmlError {
  Code: number;
  Message: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Visual API runtime schemas
//
// Defined leaf-first so each schema can reference its dependencies directly.
// All schemas use `.passthrough()` so unknown fields don't reject — the goal
// is to catch missing/renamed *required* fields fast at the API boundary,
// not to lock the schema to today's full payload.
//
// Notes on coercion:
//   - fast-xml-parser parses numeric tag bodies as numbers and "true"/"false"
//     as booleans; the Visual JSON branch is similar. _normalizeTypes in
//     visual.service.ts also coerces specific enum-id fields to numbers.
//     We therefore validate Code-style required fields with
//     `requiredCoercedString` (accepts string OR number, rejects
//     undefined/null) and enum-id fields with z.coerce.number() /
//     z.nativeEnum(...). Plain z.coerce.string() is used only for
//     `.optional()` fields where the .optional() short-circuits undefined.
//   - Date fields are intentionally typed as `string` here — the API never
//     sends a real Date, and downstream code parses the string itself.
// ──────────────────────────────────────────────────────────────────────────

export const XmlScoreSchema = z
  .object({ Team1: z.coerce.number(), Team2: z.coerce.number() })
  .passthrough();
export type XmlScore = z.infer<typeof XmlScoreSchema>;

// XmlScores etc. use z.unknown() for the inner Score/Stat/Set/Player/Item
// field. fast-xml-parser yields either an object or an array depending on
// whether the XML has 0/1/many sibling tags; the consuming code handles
// that via _asArray. Validating the inner shape with z.union(X, array(X))
// makes the inferred type tree explode and trips TS7056 ("inferred type
// exceeds maximum length"). We only need the wrapper key to exist.
//
// The hand-written interfaces below preserve the legacy contract for
// downstream consumers (e.g. encounter.ts reads `sets.Set.Team1`).
export const XmlScoresSchema = z.object({ Score: z.unknown() }).passthrough();
export interface XmlScores {
  Score: XmlScore[];
}

export const XmlStatSchema = z
  .object({ _ID: requiredCoercedString, _Value: requiredCoercedString })
  .passthrough();
export type XmlStat = z.infer<typeof XmlStatSchema>;

export const XmlStatsSchema = z.object({ Stat: z.unknown() }).passthrough();
export interface XmlStats {
  Stat: XmlStat[];
}

export const XmlSetSchema = z
  .object({
    Scores: XmlScoresSchema.optional(),
    Stats: XmlStatsSchema.optional(),
    Team1: z.coerce.number(),
    Team2: z.coerce.number(),
  })
  .passthrough();
export type XmlSet = z.infer<typeof XmlSetSchema>;

export const XmlSetsSchema = z.object({ Set: z.unknown() }).passthrough();
export interface XmlSets {
  Set: XmlSet | XmlSet[];
}

export const XmlPlayerSchema = z
  .object({
    MemberID: requiredCoercedString,
    Firstname: z.string().optional(),
    Lastname: z.string().optional(),
    GenderID: z.coerce.number().optional(),
    CountryCode: z.string().optional(),
    ParaClassID: z.coerce.string().optional(),
    ParaClassStatusID: z.coerce.string().optional(),
  })
  .passthrough();
export type XmlPlayer = z.infer<typeof XmlPlayerSchema>;

export const XmlClubSchema = z
  .object({
    Code: requiredCoercedString,
    Name: z.string(),
    Number: z.coerce.string().optional(),
    Contact: z.string().optional(),
    Address: z.string().optional(),
    Address2: z.string().optional(),
    Address3: z.string().optional(),
    PostalCode: z.string().optional(),
    City: z.string().optional(),
    State: z.string().optional(),
    Country: z.string().optional(),
    Phone: z.string().optional(),
    Phone2: z.string().optional(),
    Mobile: z.string().optional(),
    Fax: z.string().optional(),
    Fax2: z.string().optional(),
    Email: z.string().optional(),
    Website: z.string().optional(),
  })
  .passthrough();
export type XmlClub = z.infer<typeof XmlClubSchema>;

export const XmlPlayersSchema = z.object({ Player: z.unknown() }).passthrough();
export interface XmlPlayers {
  Player: XmlPlayer[];
}

export const XmlTeamSchema = z
  .object({
    Code: requiredCoercedString,
    Name: z.string().optional(),
    Player1: XmlPlayerSchema.optional(),
    Player2: XmlPlayerSchema.optional(),
    Player3: XmlPlayerSchema.optional(),
    Player4: XmlPlayerSchema.optional(),
    Contact: z.string().optional(),
    Address: z.string().optional(),
    PostalCode: z.string().optional(),
    City: z.string().optional(),
    Phone: z.string().optional(),
    Email: z.string().optional(),
    Club: XmlClubSchema.optional(),
    Players: XmlPlayersSchema.optional(),
  })
  .passthrough();
// Legacy contract preserved for consumers that destructure the nested
// wrapper types (Player1-4, Club, Players). The schema validates the
// runtime shape; this interface keeps the static type stable.
export interface XmlTeam {
  Code: string;
  Name?: string;
  Player1?: XmlPlayer;
  Player2?: XmlPlayer;
  Player3?: XmlPlayer;
  Player4?: XmlPlayer;
  Contact?: string;
  Address?: string;
  PostalCode?: string;
  City?: string;
  Phone?: string;
  Email?: string;
  Club?: XmlClub;
  Players?: XmlPlayers;
}

export const XmlMatchSchema = z
  .object({
    Code: requiredCoercedString,
    Winner: z.coerce.number().optional(),
    ScoreStatus: z.coerce.number().optional(),
    TeamMatchWinner: z.coerce.string().optional(),
    TeamMatchScoreStatus: z.coerce.string().optional(),
    OOPTypeID: z.coerce.string().optional(),
    OOPRound: z.coerce.string().optional(),
    OOPText: z.string().optional(),
    MatchTime: z.string().optional(),
    EventCode: z.coerce.string().optional(),
    EventName: z.string().optional(),
    DrawCode: z.coerce.string().optional(),
    DrawName: z.string().optional(),
    LocationCode: z.coerce.string().optional(),
    LocationName: z.string().optional(),
    CourtCode: z.coerce.string().optional(),
    CourtName: z.string().optional(),
    MatchTypeID: z.coerce.number().optional(),
    MatchTypeNo: z.coerce.string().optional(),
    MatchOrder: z.coerce.number().optional(),
    Team1: XmlTeamSchema.optional(),
    Team2: XmlTeamSchema.optional(),
    Duration: z.string().optional(),
    Sets: XmlSetsSchema.optional(),
    Stats: XmlStatsSchema.optional(),
    RoundName: z.string().optional(),
  })
  .passthrough();
// Legacy interface preserved — consumers reach into Sets/Stats/Team1/Team2.
export interface XmlMatch {
  Code: string;
  Winner?: number;
  ScoreStatus?: number;
  TeamMatchWinner?: string;
  TeamMatchScoreStatus?: string;
  OOPTypeID?: string;
  OOPRound?: string;
  OOPText?: string;
  MatchTime?: Date;
  EventCode?: string;
  EventName?: string;
  DrawCode?: string;
  DrawName?: string;
  LocationCode?: string;
  LocationName?: string;
  CourtCode?: string;
  CourtName?: string;
  MatchTypeID?: number;
  MatchTypeNo?: string;
  MatchOrder?: number;
  Team1?: XmlTeam;
  Team2?: XmlTeam;
  Duration?: string;
  Sets?: XmlSets;
  Stats?: XmlStats;
  RoundName?: string;
}

export const XmlTeamMatchSchema = z
  .object({
    Code: requiredCoercedString,
    Winner: z.coerce.number().optional(),
    ScoreStatus: z.coerce.string().optional(),
    RoundName: z.string().optional(),
    MatchTime: z.string().optional(),
    EventCode: z.coerce.string().optional(),
    EventName: z.string().optional(),
    DrawCode: z.coerce.string().optional(),
    DrawName: z.string().optional(),
    Team1: XmlTeamSchema.optional(),
    Team2: XmlTeamSchema.optional(),
    Sets: XmlSetsSchema.optional(),
  })
  .passthrough();
// Legacy interface preserved — consumers reach into Sets/Team1/Team2.
export interface XmlTeamMatch {
  Code: string;
  Winner?: number;
  ScoreStatus?: string;
  RoundName?: string;
  MatchTime?: Date;
  EventCode?: string;
  EventName?: string;
  DrawCode?: string;
  DrawName?: string;
  Team1?: XmlTeam;
  Team2?: XmlTeam;
  Sets?: XmlSets;
}

export const XmlGradingSchema = z
  .object({ Code: z.coerce.string(), Name: z.string() })
  .passthrough();
export type XmlGrading = z.infer<typeof XmlGradingSchema>;

export const XmlTournamentEventSchema = z
  .object({
    Code: requiredCoercedString,
    Name: z.string(),
    GenderID: z.coerce.number().optional(),
    GameTypeID: z.coerce.number().optional(),
    LevelID: z.coerce.number().optional(),
    ParaClassID: z.coerce.string().optional(),
    Grading: XmlGradingSchema.optional(),
    SubGrading: XmlGradingSchema.optional(),
  })
  .passthrough();
export type XmlTournamentEvent = z.infer<typeof XmlTournamentEventSchema>;

export const TeamClassSchema = z
  .object({ Code: z.coerce.string(), Name: z.string() })
  .passthrough();
export type TeamClass = z.infer<typeof TeamClassSchema>;

export const XmlItemSchema = z
  .object({
    Col: z.coerce.string().optional(),
    Row: z.coerce.string().optional(),
    Code: requiredCoercedString,
    Winner: z.coerce.string().optional(),
    ScoreStatus: z.coerce.string().optional(),
    Team: TeamClassSchema.optional(),
    MatchTime: z.string().optional(),
    Sets: XmlSetsSchema.optional(),
  })
  .passthrough();
// Legacy interface preserved — consumers reach into Sets and Team.
export interface XmlItem {
  Col?: string;
  Row?: string;
  Code: string;
  Winner?: string;
  ScoreStatus?: string;
  Team?: TeamClass;
  MatchTime?: Date;
  Sets?: XmlSets;
}

export const XmlStructureSchema = z.object({ Item: z.unknown() }).passthrough();
export interface XmlStructure {
  Item: XmlItem | XmlItem[];
}

export const XmlTournamentDrawSchema = z
  .object({
    Code: requiredCoercedString,
    Name: z.string(),
    EventCode: z.coerce.string().optional(),
    TypeID: z.coerce.number().optional(),
    Size: z.coerce.number().optional(),
    EndSize: z.coerce.string().optional(),
    Qualification: z.coerce.string().optional(),
    Structure: XmlStructureSchema.optional(),
    StageCode: z.coerce.string().optional(),
  })
  .passthrough();
// Legacy interface preserved — consumers reach into Structure.Item.
export interface XmlTournamentDraw {
  Code: string;
  Name: string;
  EventCode?: string;
  TypeID?: number;
  Size?: number;
  EndSize?: string;
  Qualification?: string;
  Structure?: XmlStructure;
  StageCode?: string;
}

export const XmlCategorySchema = z
  .object({ Code: z.coerce.string(), Name: z.string() })
  .passthrough();
export type XmlCategory = z.infer<typeof XmlCategorySchema>;

export const XmlContactSchema = z
  .object({
    Name: z.string().optional(),
    Phone: z.string().optional(),
    Email: z.string().optional(),
  })
  .passthrough();
export type XmlContact = z.infer<typeof XmlContactSchema>;

export const XmlOrganizationSchema = z.object({ Name: z.string().optional() }).passthrough();
export type XmlOrganization = z.infer<typeof XmlOrganizationSchema>;

export const XmlVenueSchema = z
  .object({
    Name: z.string().optional(),
    Address1: z.string().optional(),
    Postalcode: z.string().optional(),
    City: z.string().optional(),
    CountryCode: z.string().optional(),
    Phone: z.string().optional(),
    Fax: z.string().optional(),
    Website: z.string().optional(),
  })
  .passthrough();
export type XmlVenue = z.infer<typeof XmlVenueSchema>;

export const XmlTournamentSchema = z
  .object({
    Code: requiredCoercedString,
    Name: z.string(),
    Number: z.coerce.string().optional(),
    TypeID: z.coerce.number().optional(),
    LastUpdated: z.string().optional(),
    StartDate: z.string().optional(),
    EndDate: z.string().optional(),
    OnlineEntryStartDate: z.string().optional(),
    OnlineEntryEndDate: z.string().optional(),
    TournamentTimezone: z.string().optional(),
    AcceptanceListPublicationDate: z.string().optional(),
    DrawPublicationDate: z.string().optional(),
    ProspectusPublicationDate: z.string().optional(),
    SeedingPublicationDate: z.string().optional(),
    TournamentWeekStartDate: z.string().optional(),
    OnlineEntryWithdrawalDeadline: z.string().optional(),
    AcceptanceRankingDate: z.string().optional(),
    SeedingRankingDate: z.string().optional(),
    Category: XmlCategorySchema.optional(),
    PrizeMoney: z.coerce.string().optional(),
    Organization: XmlOrganizationSchema.optional(),
    Contact: XmlContactSchema.optional(),
    Venue: XmlVenueSchema.optional(),
    TournamentStatus: z.coerce.number().optional(),
  })
  .passthrough();
// The schema treats date fields as strings (truthful — the API never sends
// real Date objects). Consumer code still expects Date-typed properties,
// so the interface keeps the legacy contract; the schema's job is the
// runtime sanity check.
export interface XmlTournament {
  Code: string;
  Name: string;
  Number?: string;
  TypeID?: number;
  LastUpdated?: Date;
  StartDate?: Date;
  EndDate?: Date;
  OnlineEntryStartDate?: Date;
  OnlineEntryEndDate?: Date;
  TournamentTimezone?: string;
  AcceptanceListPublicationDate?: Date;
  DrawPublicationDate?: Date;
  ProspectusPublicationDate?: Date;
  SeedingPublicationDate?: Date;
  TournamentWeekStartDate?: Date;
  OnlineEntryWithdrawalDeadline?: Date;
  AcceptanceRankingDate?: Date;
  SeedingRankingDate?: Date;
  Category?: XmlCategory;
  PrizeMoney?: string;
  Organization?: XmlOrganization;
  Contact?: XmlContact;
  Venue?: XmlVenue;
  TournamentStatus?: number;
}

export const XmlTournamentMatchSchema = z
  .object({
    TournamentID: requiredCoercedString,
    MatchID: requiredCoercedString,
    MatchDate: z.string().optional(),
  })
  .passthrough();
export type XmlTournamentMatch = z.infer<typeof XmlTournamentMatchSchema>;

export enum XmlGenderID {
  Male = 1,
  Female = 2,
  Mixed = 3,
  Boy = 4,
  Girl = 5,
  Genderless = 6,
}

export enum XmlGameTypeID {
  Singles = 1,
  Doubles = 2,
  Mixed = 3,
}

export enum XmlMatchTypeID {
  MS = 1,
  WS = 2,
  MD = 3,
  WD = 4,
  XD = 5,
  BS = 11,
  GS = 12,
  BD = 13,
  GD = 14,
  Single = 101,
  Double = 102,
}

export enum XmlTournamentTypeID {
  IndividualTournament = 0,
  TeamTournament = 1,
  TeamSportTournament = 2,
  OnlineLeague = 3,
}

export enum XmlTournamentstatus {
  Unknown = 0,
  TournamentFinished = 101,
  TournamentCancelled = 199,
  TournamentPostponed = 198,
  LeagueNew = 201,
  LeagueEntryOpen = 202,
  LeaguePubliclyVisible = 203,
  LeagueFinished = 204,
}

export enum XmlDrawTypeID {
  Elimination = 0,
  RoundRobin = 1,
  Monrad = 2,
  FullRoundRobin = 3,
  CompassDraw = 4,
  QualificationTypeDraw = 5,
}

export enum XmlScoreStatus {
  Normal = 0,
  Walkover = 1,
  Retirement = 2,
  Disqualified = 3,
  "No Match" = 4,
}
