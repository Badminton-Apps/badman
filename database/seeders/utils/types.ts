/**
 * Type definitions for database entities used in seeders
 */

export interface Player {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  memberId?: string;
  gender?: string;
}

export interface Club {
  id: string;
  name: string;
  abbreviation?: string;
}

export interface Team {
  id: string;
  name?: string;
  abbreviation?: string;
}

export interface ClubMembership {
  id: string;
}

export interface EventCompetition {
  id: string;
}

export interface SubEventCompetition {
  id: string;
}

export interface DrawCompetition {
  id: string;
}
