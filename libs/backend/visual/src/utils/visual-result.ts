 
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
  Ranking?: XmlRanking;
  RankingCategory?: XmlRankingCategory[];
  RankingPublication?: XmlRankingPublication[];
  RankingPublicationPoints?: XmlRankingPublicationPoint[];
  _Version: string;
}

interface XmlTournamentMatch {
  TournamentID: string;
  MatchID: string;
  MatchDate: Date;
}

export interface XmlRanking {
  Code: string;
  Name: string;
}

export interface XmlRankingPublicationPoint {
  Rank: number;
  PreviousRank?: string;
  Level: number;
  Totalpoints: number;
  Player1: {
    Code: string;
    MemberID: string;
    Name: string;
    CountryCode?: string;
  };
}

export interface XmlRankingCategory {
  Code: string;
  Name: string;
}

export interface XmlRankingPublication {
  Code: string;
  Name: string;
  Year: string;
  Week: string;
  PublicationDate: Date;
  Visible: boolean;
}

interface XmlError {
  Code: number;
  Message: string;
}

export interface XmlPlayer {
  MemberID: string;
  Firstname: string;
  Lastname: string;
  GenderID: XmlGenderID;
  CountryCode?: string;
  ParaClassID: string;
  ParaClassStatusID: string;
}

export interface XmlTournament {
  Code: string;
  Name: string;
  Number: string;
  TypeID: XmlTournamentTypeID;
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
  Category: XmlCategory;
  PrizeMoney: string;
  Organization: XmlOrganization;
  Contact: XmlContact;
  Venue: XmlVenue;
  TournamentStatus: XmlTournamentstatus;
}

export interface XmlCategory {
  Code: string;
  Name: string;
}

export interface XmlContact {
  Name: string;
  Phone: string;
  Email: string;
}

export interface XmlOrganization {
  Name: string;
}

export interface XmlVenue {
  Name: string;
  Address1: string;
  Postalcode: string;
  City: string;
  CountryCode: string;
  Phone: string;
  Fax: string;
  Website: string;
}

export interface XmlTeamMatch {
  Code: string;
  Winner: number;
  ScoreStatus: string;
  RoundName: string;
  MatchTime: Date;
  EventCode: string;
  EventName: XmlEventName;
  DrawCode: string;
  DrawName: XmlDrawName;
  Team1: XmlTeam;
  Team2: XmlTeam;
  Sets: XmlSets;
}

export enum XmlDrawName {
  The1StProvincialeA = '1st Provinciale - A',
}

export enum XmlEventName {
  The1StProvinciale = '1st Provinciale',
}

export interface XmlMatch {
  Code: string;
  Winner: number;
  ScoreStatus: XmlScoreStatus;
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
  MatchTypeID: XmlMatchTypeID;
  MatchTypeNo: string;
  MatchOrder: number;
  Team1: XmlTeam;
  Team2: XmlTeam;
  Duration: string;
  Sets: XmlSets;
  Stats: XmlStats;
  RoundName: string;
}

export interface XmlTournamentEvent {
  Code: string;
  Name: string;
  GenderID: XmlGenderID;
  GameTypeID: XmlGameTypeID;
  LevelID: number;
  ParaClassID: string;
  Grading: XmlGrading;
  SubGrading: XmlGrading;
}

export interface XmlSets {
  Set: XmlSet | XmlSet[];
}

export interface XmlSet {
  Scores?: XmlScores;
  Stats?: XmlStats;
  Team1: number;
  Team2: number;
}

export interface XmlScores {
  Score: XmlScore[];
}

export interface XmlScore {
  Team1: number;
  Team2: number;
}

export interface XmlStats {
  Stat: XmlStat[];
}

export interface XmlStat {
  _ID: string;
  _Value: string;
}

export interface XmlTournamentDraw {
  Code: string;
  EventCode: string;
  Name: string;
  TypeID: XmlDrawTypeID;
  Size: number;
  EndSize: string;
  Qualification: string;
  Structure: XmlStructure;
  StageCode: string;
}

export interface XmlStructure {
  Item: XmlItem | XmlItem[];
}

export interface XmlItem {
  Col: string;
  Row: string;
  Code: string;
  Winner: string;
  ScoreStatus: string;
  Team: TeamClass;
  MatchTime?: Date;
  Sets?: XmlSets;
}

export interface TeamClass {
  Code: string;
  Name: string;
}

export interface XmlTeam {
  Player1?: XmlPlayer;
  Player2?: XmlPlayer;
  Player3?: XmlPlayer;
  Player4?: XmlPlayer;

  Code: string;
  Name: string;
  Contact: string;
  Address: string;
  PostalCode: string;
  City: string;
  Phone: string;
  Email: string;
  Club: XmlClub;
  Players: XmlPlayers;
}

export interface XmlClub {
  Code: string;
  Number: string;
  Name: string;
}

export interface XmlPlayers {
  Player: XmlPlayer[];
}

export interface XmlGrading {
  Code: string;
  Name: string;
}

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
  'No Match' = 4,
}

 
