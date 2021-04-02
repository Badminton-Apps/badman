/* eslint-disable @typescript-eslint/naming-convention */

export interface ICsvEvent {
  id: string;
  name: string;
  gender: string;
  eventtype: string;
  level: string;
}

export interface ICsvDraw {
  id: string;
  name: string;
  event: string;
  drawsize: string;
  drawtype: string;
}
export interface ICsvPlayerMatchTp {
  id: string;
  event: string;
  draw: string;
  planning: string;
  plandate: string;
  entry: string;
  court: string;
  wn: string;
  van1: string;
  van2: string;
  team1set1: string;
  team2set1: string;
  team1set2: string;
  team2set2: string;
  team1set3: string;
  team2set3: string;
  winner: string;
}

export interface ICsvPlayerMatchCp {
  id: string;
  teammatch: string;
  sp1: string;
  sp2: string;
  sp3: string;
  sp4: string;
  winner: string;
  tpt1: string;
  tpt2: string;
  matchtype: string;
  score1_1: string;
  score1_2: string;
  set1tiebreak: string;
  score2_1: string;
  score2_2: string;
  set2tiebreak: string;
  score3_1: string;
  score3_2: string;
  set3tiebreak: string;
  score4_1: string;
  score4_2: string;
  set4tiebreak: string;
  score5_1: string;
  score5_2: string;
  set5tiebreak: string;
  walkover: string;
  retirement: string;
  matchorder: string;
  matchtypeno: string;
  starttime: string;
  endtime: string;
  duration: string;
  shuttles: string;
  court: string;
  scorestatus: string;
  scoringformat: string;
  scoresheetprinted: string;
  official1: string;
  official2: string;
  livescore: string;
  resultentered: string;
  team1bonusmatch: string;
  team2bonusmatch: string;
}

export interface ICsvTeamMatch {
  id: string;
  event: string;
  draw: string;
  planning: string;
  entry: string;
  plandate: string;
  court: string;
  location: string;
  van1: string;
  van2: string;
  wn: string;
  vn: string;
  matchpoints1: string;
  matchpoints2: string;
  points1: string;
  points2: string;
  ranking: string;
  winner: string;
  link: string;
  scorestatus: string;
  highlight: string;
  note: string;
  notetimestamp: string;
  prevplaytime: string;
  matchorder: string;
  forwardloser: string;
  team1penaltypoints: string;
  team2penaltypoints: string;
  stage: string;
  matchnr: string;
  roundnr: string;
  reversehomeaway: string;
  teamlocation: string;
  team1penaltypointsrubbers: string;
  team2penaltypointsrubbers: string;
  shootoutwinner: string;
  foreignid: string;
  showbye: string;
  teamnominationstarttime: string;
  teamnominationendtime: string;
  teamnominationstarttime_doubles: string;
  teamnominationendtime_doubles: string;
}

export interface ICsvTeam {
  id: string;
  name: string;
  club: string;
}
export interface ICsvTeamPlayer {
  team: string;
  player: string;
}

export interface ICsvClub {
  id: string;
  name: string;
  abbriviation: string;
  clubid: string;
  address: string;
  postalcode: string;
  city: string;
  state: string;
  phone: string;
  fax: string;
}

export interface ICsvPlayer {
  id: string;
  name: string;
  middlename: string;
  firstname: string;
  birthDate: string;
  gender: string;
  memberid: string;
  club: string;
}

export interface ICsvEntryTp {
  id: string;
  event: string;
  team: string;
  seed1: string;
  seed2: string;
}

export interface ICsvEntryCp {
  id: string;
  event: string;
  player1: string;
  player2: string;
  seed1: string;
  seed2: string;
  status: string;
  partnerwanted: string;
  exclude: string;
  qseed1: string;
  qseed2: string;
  qstatus: string;
  entrytype: string;
  entrylist: string;
  entered: string;
  accepttb: string;
  seedtb: string;
  signedin: string;
  signedinconsolation: string;
  accepttype: string;
  acceptposition: string;
  protectedranking: string;
  itforder: string;
  protectedranking2: string;
  chip: string;
  qchip: string;
  qseedtb: string;
  cseed1: string;
  cseed2: string;
  cseedtb: string;
  lltb: string;
  reserve: string;
  alternatetb: string;
  protectedrankingD: string;
  protectedranking2D: string;
  withdrawdate: string;
  withdrawreason: string;
  playup: string;
  recentform: string;
  onlinepartner: string;
  validationstatus: string;
  validationmessage: string;
}

export interface ICsvCourt {
  id: string;
  name: string;
  location: string;
}

export interface ICsvLocation {
  id: string;
  name: string;
  address: string;
  postalcode: string;
  city: string;
  state: string;
  phone: string;
  fax: string;
  clubid: string;
}
