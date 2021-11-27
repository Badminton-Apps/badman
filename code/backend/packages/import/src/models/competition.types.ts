export interface XmlLeague {
  LeagueSiebelId:       string;
  LeagueName:           string;
  LeagueOrganiserEmail: string;
  Event:                XmlEvent[];
  Team:                 XmlTeam[];
}

export interface XmlEvent {
  EventSiebelId: string;
  EventName:     string;
  Division:      XmlDivision[] | XmlDivision;
}

export interface XmlDivision {
  DivisionLPId:       string;
  DivisionName:       XmlDivisionName;
  DivisionStage:      string;
  DivisionType:       string;
  DivisionGrade:      string;
  DivisionSize:       string;
  DivisionEndSize:    string;
  DivisionDeleteFlag: XmlFlag;
  Fixture:            XmlFixture[];
}

export enum XmlFlag {
  N = "N",
}

export enum XmlDivisionName {
  A = "A",
  B = "B",
  C = "C",
  D = "D",
}


export interface XmlFixture {
  FixtureLPId:                 string;
  FixtureNum:                  string;
  FixtureRound:                string;
  FixtureTeam1:                string;
  FixtureTeam2:                string;
  FixtureTeam1Id:              string;
  FixtureTeam2Id:              string;
  FixtureWinner:               string;
  FixtureWinnerTeamId?:        string;
  FixtureWinnerName?:          string;
  FixtureLoserTeamId?:         string;
  FixtureLoserName?:           string;
  FixtureScore:                string;
  FixtureScoreCode:            string;
  FixtureDay:                  string;
  FixtureMonth:                string;
  FixtureYear:                 string;
  FixtureStartTime:            string;
  FixtureEndTime:              string;
  FixturePlanningId:           string;
  FixtureFromMatchPlanningId1: string;
  FixtureFromMatchPlanningId2: string;
  FixtureWinnerPlanningId:     string;
  FixtureLoserPlanningId:      string;
  FixtureTeam1Points:          string;
  FixtureTeam2Points:          string;
  FixtureTeam1Sets:            string;
  FixtureTeam2Sets:            string;
  FixtureTeam1Games:           string;
  FixtureTeam2Games:           string;
  FixtureTeam1RRPos:           string;
  FixtureTeam2RRPos:           string;
  FixtureDeleteFlag:           XmlFlag;
  Match:                       XmlMatch[];
}




export interface XmlMatch {
  MatchLPId:                string;
  MatchNum:                 string;
  MatchType:                string;
  MatchTypeNo:              string;
  MatchWinner:              string;
  MatchPlayer1:             string;
  MatchPlayer2:             string;
  MatchWinnerName?:         string;
  MatchWinnerLTANo?:        string;
  MatchWinnerPartner?:      string;
  MatchWinnerPartnerLTANo?: string;
  MatchLoserName?:          string;
  MatchLoserLTANo?:         string;
  MatchLoserPartner?:       string;
  MatchLoserPartnerLTANo?:  string;
  MatchScore:               string;
  MatchScoreCode:           string;
  MatchDay:                 string;
  MatchMonth:               string;
  MatchYear:                string;
  MatchStartTime:           string;
  MatchEndTime:             string;
  MatchTeam1Set1?:          string;
  MatchTeam1Set2?:          string;
  MatchTiebreak1?:          string;
  MatchTeam2Set1?:          string;
  MatchTeam2Set2?:          string;
  MatchTiebreak2?:          string;
  MatchDeleteFlag:          XmlFlag;
  MatchTeam3Set1?:          string;
  MatchTeam3Set2?:          string;
  MatchTiebreak3?:          string;
}

export interface XmlTeam {
  TeamLPId:         string;
  TeamName:         string;
  TeamClubSiebelId: string;
  TeamPhoneNum:     string;
  TeamDeleteFlag:   XmlFlag;
  Member?:          XmlMember[];
}

export interface XmlMember {
  MemberLTANo:       string;
  MemberFirstName:   string;
  MemberLastName:    string;
  MemberGender:      XmlMemberGender;
  MemberCaptainFlag: XmlFlag;
  MemberDeleteFlag:  XmlFlag;
}

export enum XmlMemberGender {
  F = "F",
  M = "M",
}
