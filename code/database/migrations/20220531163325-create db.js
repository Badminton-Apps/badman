/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.sequelize.query(
          `
          --
          -- PostgreSQL database dump
          --
          
          -- Dumped from database version 13.2
          -- Dumped by pg_dump version 14.1
          
          -- Started on 2022-05-31 18:48:07
                    
          --
          -- TOC entry 11 (class 2615 OID 359146)
          -- Name: event; Type: SCHEMA; Schema: -; Owner: -
          --
          
          CREATE SCHEMA event;
          
          
          --
          -- TOC entry 13 (class 2615 OID 359147)
          -- Name: import; Type: SCHEMA; Schema: -; Owner: -
          --
          
          CREATE SCHEMA import;
          
          
          --
          -- TOC entry 12 (class 2615 OID 359148)
          -- Name: job; Type: SCHEMA; Schema: -; Owner: -
          --
          
          CREATE SCHEMA job;
          
          
          --
          -- TOC entry 7 (class 2615 OID 359149)
          -- Name: ranking; Type: SCHEMA; Schema: -; Owner: -
          --
          
          CREATE SCHEMA ranking;
          
          
          --
          -- TOC entry 5 (class 2615 OID 359150)
          -- Name: security; Type: SCHEMA; Schema: -; Owner: -
          --
          
          CREATE SCHEMA security;
          
          
          --
          -- TOC entry 2 (class 3079 OID 359151)
          -- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
          --
          
          CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
          
          
          --
          -- TOC entry 711 (class 1247 OID 359189)
          -- Name: enum_DrawCompetitions_type; Type: TYPE; Schema: event; Owner: -
          --
          
          CREATE TYPE event."enum_DrawCompetitions_type" AS ENUM (
              'KO',
              'POULE',
              'QUALIFICATION'
          );
          
          
          --
          -- TOC entry 714 (class 1247 OID 359196)
          -- Name: enum_DrawTournaments_type; Type: TYPE; Schema: event; Owner: -
          --
          
          CREATE TYPE event."enum_DrawTournaments_type" AS ENUM (
              'KO',
              'POULE',
              'QUALIFICATION'
          );
          
          
          --
          -- TOC entry 717 (class 1247 OID 359204)
          -- Name: enum_EncounterChangeDates_availabilityAway; Type: TYPE; Schema: event; Owner: -
          --
          
          CREATE TYPE event."enum_EncounterChangeDates_availabilityAway" AS ENUM (
              'POSSIBLE',
              'NOT_POSSIBLE'
          );
          
          
          --
          -- TOC entry 720 (class 1247 OID 359210)
          -- Name: enum_EncounterChangeDates_availabilityHome; Type: TYPE; Schema: event; Owner: -
          --
          
          CREATE TYPE event."enum_EncounterChangeDates_availabilityHome" AS ENUM (
              'POSSIBLE',
              'NOT_POSSIBLE'
          );
          
          
          --
          -- TOC entry 723 (class 1247 OID 359216)
          -- Name: enum_EventCompetitions_type; Type: TYPE; Schema: event; Owner: -
          --
          
          CREATE TYPE event."enum_EventCompetitions_type" AS ENUM (
              'PROV',
              'LIGA',
              'NATIONAL'
          );
          
          
          --
          -- TOC entry 726 (class 1247 OID 359224)
          -- Name: enum_EventCompetitions_usedRankingUnit; Type: TYPE; Schema: event; Owner: -
          --
          
          CREATE TYPE event."enum_EventCompetitions_usedRankingUnit" AS ENUM (
              'months',
              'weeks',
              'days'
          );
          
          
          --
          -- TOC entry 729 (class 1247 OID 359232)
          -- Name: enum_EventTournaments_usedRankingUnit; Type: TYPE; Schema: event; Owner: -
          --
          
          CREATE TYPE event."enum_EventTournaments_usedRankingUnit" AS ENUM (
              'months',
              'weeks',
              'days'
          );
          
          
          --
          -- TOC entry 732 (class 1247 OID 359240)
          -- Name: enum_Games_gameType; Type: TYPE; Schema: event; Owner: -
          --
          
          CREATE TYPE event."enum_Games_gameType" AS ENUM (
              'S',
              'D',
              'MX'
          );
          
          
          --
          -- TOC entry 735 (class 1247 OID 359248)
          -- Name: enum_Games_status; Type: TYPE; Schema: event; Owner: -
          --
          
          CREATE TYPE event."enum_Games_status" AS ENUM (
              'NORMAL',
              'WALKOVER',
              'RETIREMENT',
              'DISQUALIFIED',
              'NO_MATCH'
          );
          
          
          --
          -- TOC entry 738 (class 1247 OID 359260)
          -- Name: enum_SubEventCompetitions_eventType; Type: TYPE; Schema: event; Owner: -
          --
          
          CREATE TYPE event."enum_SubEventCompetitions_eventType" AS ENUM (
              'M',
              'F',
              'MX',
              'MINIBAD'
          );
          
          
          --
          -- TOC entry 741 (class 1247 OID 359270)
          -- Name: enum_SubEventTournaments_eventType; Type: TYPE; Schema: event; Owner: -
          --
          
          CREATE TYPE event."enum_SubEventTournaments_eventType" AS ENUM (
              'M',
              'F',
              'MX',
              'MINIBAD'
          );
          
          
          --
          -- TOC entry 744 (class 1247 OID 359280)
          -- Name: enum_SubEventTournaments_gameType; Type: TYPE; Schema: event; Owner: -
          --
          
          CREATE TYPE event."enum_SubEventTournaments_gameType" AS ENUM (
              'S',
              'D',
              'MX'
          );
          
          
          --
          -- TOC entry 747 (class 1247 OID 359288)
          -- Name: enum_Files_type; Type: TYPE; Schema: import; Owner: -
          --
          
          CREATE TYPE import."enum_Files_type" AS ENUM (
              'COMPETITION_CP',
              'COMPETITION_XML',
              'TOERNAMENT',
              'TOURNAMENT'
          );
          
          
          --
          -- TOC entry 750 (class 1247 OID 359298)
          -- Name: enum_Clubs_useForTeamName; Type: TYPE; Schema: public; Owner: -
          --
          
          CREATE TYPE public."enum_Clubs_useForTeamName" AS ENUM (
              'name',
              'fullName',
              'abbreviation'
          );
          
          --
          -- TOC entry 753 (class 1247 OID 359306)
          -- Name: enum_Teams_preferredDay; Type: TYPE; Schema: public; Owner: -
          --
          
          CREATE TYPE public."enum_Teams_preferredDay" AS ENUM (
              'sunday',
              'monday',
              'tuesday',
              'wednesday',
              'thursday',
              'friday',
              'saturday'
          );
          
          
          --
          -- TOC entry 756 (class 1247 OID 359322)
          -- Name: enum_Systems_calculationIntervalUnit; Type: TYPE; Schema: ranking; Owner: -
          --
          
          CREATE TYPE ranking."enum_Systems_calculationIntervalUnit" AS ENUM (
              'months',
              'weeks',
              'days'
          );
          
          
          --
          -- TOC entry 759 (class 1247 OID 359330)
          -- Name: enum_Systems_inactivityUnit; Type: TYPE; Schema: ranking; Owner: -
          --
          
          CREATE TYPE ranking."enum_Systems_inactivityUnit" AS ENUM (
              'months',
              'weeks',
              'days'
          );
          
          
          --
          -- TOC entry 762 (class 1247 OID 359338)
          -- Name: enum_Systems_periodUnit; Type: TYPE; Schema: ranking; Owner: -
          --
          
          CREATE TYPE ranking."enum_Systems_periodUnit" AS ENUM (
              'months',
              'weeks',
              'days'
          );
          
          
          --
          -- TOC entry 765 (class 1247 OID 359346)
          -- Name: enum_Systems_rankingSystem; Type: TYPE; Schema: ranking; Owner: -
          --
          
          CREATE TYPE ranking."enum_Systems_rankingSystem" AS ENUM (
              'BVL',
              'ORIGINAL',
              'LFBB',
              'VISUAL'
          );
          
          
          --
          -- TOC entry 768 (class 1247 OID 359356)
          -- Name: enum_Systems_startingType; Type: TYPE; Schema: ranking; Owner: -
          --
          
          CREATE TYPE ranking."enum_Systems_startingType" AS ENUM (
              'formula',
              'tableLFBB',
              'tableBVL'
          );
          
          
          --
          -- TOC entry 771 (class 1247 OID 359364)
          -- Name: enum_Systems_updateIntervalUnit; Type: TYPE; Schema: ranking; Owner: -
          --
          
          CREATE TYPE ranking."enum_Systems_updateIntervalUnit" AS ENUM (
              'months',
              'weeks',
              'days'
          );
          
          
          --
          -- TOC entry 774 (class 1247 OID 359372)
          -- Name: enum_Claims_type; Type: TYPE; Schema: security; Owner: -
          --
          
          CREATE TYPE security."enum_Claims_type" AS ENUM (
              'GLOBAL',
              'CLUB',
              'TEAM'
          );
          
          
          --
          -- TOC entry 777 (class 1247 OID 359380)
          -- Name: enum_Roles_type; Type: TYPE; Schema: security; Owner: -
          --
          
          CREATE TYPE security."enum_Roles_type" AS ENUM (
              'GLOBAL',
              'CLUB',
              'TEAM'
          );
          
          
          SET default_table_access_method = heap;
          
          --
          -- TOC entry 208 (class 1259 OID 359387)
          -- Name: Availabilities; Type: TABLE; Schema: event; Owner: -
          --
          
          CREATE TABLE event."Availabilities" (
              id character varying(255) NOT NULL,
              exceptions json,
              days json NOT NULL,
              year integer NOT NULL,
              "locationId" character varying(255),
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL
          );
          
          
          --
          -- TOC entry 209 (class 1259 OID 359393)
          -- Name: Courts; Type: TABLE; Schema: event; Owner: -
          --
          
          CREATE TABLE event."Courts" (
              id character varying(255) NOT NULL,
              name character varying(255),
              "locationId" character varying(255),
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL
          );
          
          
          --
          -- TOC entry 210 (class 1259 OID 359399)
          -- Name: DrawCompetitions; Type: TABLE; Schema: event; Owner: -
          --
          
          CREATE TABLE event."DrawCompetitions" (
              id character varying(255) NOT NULL,
              name character varying(255),
              size integer,
              "subeventId" character varying(255),
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL,
              "visualCode" character varying(255),
              type event."enum_DrawCompetitions_type"
          );
          
          
          --
          -- TOC entry 211 (class 1259 OID 359405)
          -- Name: DrawTournaments; Type: TABLE; Schema: event; Owner: -
          --
          
          CREATE TABLE event."DrawTournaments" (
              id character varying(255) NOT NULL,
              name character varying(255),
              type event."enum_DrawTournaments_type",
              size integer,
              "visualCode" character varying(255),
              "subeventId" character varying(255),
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL
          );
          
          
          --
          -- TOC entry 212 (class 1259 OID 359411)
          -- Name: EncounterChangeDates; Type: TABLE; Schema: event; Owner: -
          --
          
          CREATE TABLE event."EncounterChangeDates" (
              id character varying(255) NOT NULL,
              "encounterChangeId" character varying(255),
              selected boolean,
              date timestamp with time zone NOT NULL,
              "availabilityHome" event."enum_EncounterChangeDates_availabilityHome",
              "availabilityAway" event."enum_EncounterChangeDates_availabilityAway",
              "createdAt" timestamp with time zone,
              "updatedAt" timestamp with time zone
          );
          
          
          --
          -- TOC entry 213 (class 1259 OID 359417)
          -- Name: EncounterChanges; Type: TABLE; Schema: event; Owner: -
          --
          
          CREATE TABLE event."EncounterChanges" (
              id character varying(255) NOT NULL,
              accepted boolean,
              "encounterId" character varying(255),
              "createdAt" timestamp with time zone,
              "updatedAt" timestamp with time zone
          );
          
          
          --
          -- TOC entry 214 (class 1259 OID 359423)
          -- Name: EncounterCompetitions; Type: TABLE; Schema: event; Owner: -
          --
          
          CREATE TABLE event."EncounterCompetitions" (
              id character varying(255) NOT NULL,
              date timestamp with time zone,
              "drawId" character varying(255),
              "homeTeamId" character varying(255),
              "awayTeamId" character varying(255),
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL,
              "originalDate" timestamp with time zone,
              synced timestamp with time zone,
              "visualCode" character varying(255),
              "homeScore" integer,
              "awayScore" integer
          );
          
          
          --
          -- TOC entry 215 (class 1259 OID 359429)
          -- Name: Entries; Type: TABLE; Schema: event; Owner: -
          --
          
          CREATE TABLE event."Entries" (
              id character varying(255) NOT NULL,
              "teamId" character varying(255),
              "player1Id" character varying(255),
              "player2Id" character varying(255),
              "drawId" character varying(255),
              "subEventId" character varying(255),
              "entryType" character varying(255),
              meta json,
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL
          );
          
          
          --
          -- TOC entry 216 (class 1259 OID 359435)
          -- Name: EventCompetitions; Type: TABLE; Schema: event; Owner: -
          --
          
          CREATE TABLE event."EventCompetitions" (
              id character varying(255) NOT NULL,
              name character varying(255),
              "startYear" integer,
              type event."enum_EventCompetitions_type",
              "allowEnlisting" boolean DEFAULT false,
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL,
              "changeUntill_1" timestamp with time zone,
              "changeUntill_2" timestamp with time zone,
              "visualCode" character varying(255),
              started boolean DEFAULT false,
              slug character varying(255),
              "usedRankingUnit" event."enum_EventCompetitions_usedRankingUnit" DEFAULT 'months'::event."enum_EventCompetitions_usedRankingUnit",
              "usedRankingAmount" integer DEFAULT 4
          );
          
          
          --
          -- TOC entry 217 (class 1259 OID 359445)
          -- Name: EventTournaments; Type: TABLE; Schema: event; Owner: -
          --
          
          CREATE TABLE event."EventTournaments" (
              id character varying(255) NOT NULL,
              "tournamentNumber" character varying(255),
              name character varying(255),
              "firstDay" timestamp with time zone,
              dates text,
              "allowEnlisting" boolean DEFAULT false,
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL,
              "visualCode" character varying(255),
              slug character varying(255),
              "usedRankingUnit" event."enum_EventTournaments_usedRankingUnit" DEFAULT 'months'::event."enum_EventTournaments_usedRankingUnit",
              "usedRankingAmount" integer DEFAULT 4
          );
          
          --
          -- TOC entry 218 (class 1259 OID 359454)
          -- Name: GamePlayers; Type: TABLE; Schema: event; Owner: -
          --
          
          CREATE TABLE event."GamePlayers" (
              team integer,
              player integer,
              "playerId" character varying(255) NOT NULL,
              "gameId" character varying(255) NOT NULL
          );
          
          
          --
          -- TOC entry 219 (class 1259 OID 359460)
          -- Name: Games; Type: TABLE; Schema: event; Owner: -
          --
          
          CREATE TABLE event."Games" (
              id character varying(255) NOT NULL,
              "playedAt" timestamp with time zone,
              "gameType" event."enum_Games_gameType",
              "set1Team1" integer,
              "set1Team2" integer,
              "set2Team1" integer,
              "set2Team2" integer,
              "set3Team1" integer,
              "set3Team2" integer,
              winner integer,
              "courtId" character varying(255),
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL,
              "linkId" character varying(255),
              "linkType" character varying(255),
              "order" integer,
              round character varying(255),
              "visualCode" character varying(255),
              status event."enum_Games_status"
          );
          
          
          --
          -- TOC entry 220 (class 1259 OID 359466)
          -- Name: LocationEventTournaments; Type: TABLE; Schema: event; Owner: -
          --
          
          CREATE TABLE event."LocationEventTournaments" (
              "eventId" character varying(255) NOT NULL,
              "locationId" character varying(255) NOT NULL
          );
          
          
          --
          -- TOC entry 221 (class 1259 OID 359472)
          -- Name: Locations; Type: TABLE; Schema: event; Owner: -
          --
          
          CREATE TABLE event."Locations" (
              id character varying(255) NOT NULL,
              name character varying(255),
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL,
              address character varying(255),
              city character varying(255),
              fax character varying(255),
              phone character varying(255),
              postalcode character varying(255),
              state character varying(255),
              street character varying(255),
              "streetNumber" character varying(255),
              "clubId" character varying(255)
          );
          ALTER TABLE ONLY event."Locations" ALTER COLUMN postalcode SET STORAGE PLAIN;
          
          
          --
          -- TOC entry 222 (class 1259 OID 359478)
          -- Name: Standings; Type: TABLE; Schema: event; Owner: -
          --
          
          CREATE TABLE event."Standings" (
              id character varying(255) NOT NULL,
              "entryId" character varying(255),
              "position" integer,
              RankingPoints integer,
              played integer,
              "gamesWon" integer,
              "gamesLost" integer,
              "setsWon" integer,
              "setsLost" integer,
              "totalPointsWon" integer,
              "totalPointsLost" integer,
              won integer,
              lost integer,
              tied integer,
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL
          );
          
          
          --
          -- TOC entry 223 (class 1259 OID 359484)
          -- Name: SubEventCompetitions; Type: TABLE; Schema: event; Owner: -
          --
          
          CREATE TABLE event."SubEventCompetitions" (
              id character varying(255) NOT NULL,
              name character varying(255),
              "eventType" event."enum_SubEventCompetitions_eventType",
              level integer,
              "maxLevel" integer,
              "minBaseIndex" integer,
              "maxBaseIndex" integer,
              "eventId" character varying(255),
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL,
              "visualCode" character varying(255)
          );
          
          
          --
          -- TOC entry 224 (class 1259 OID 359490)
          -- Name: SubEventTournaments; Type: TABLE; Schema: event; Owner: -
          --
          
          CREATE TABLE event."SubEventTournaments" (
              id character varying(255) NOT NULL,
              name character varying(255),
              "eventType" event."enum_SubEventTournaments_eventType",
              "gameType" event."enum_SubEventTournaments_gameType",
              level integer,
              "visualCode" character varying(255),
              "eventId" character varying(255),
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL
          );
          
          
          --
          -- TOC entry 225 (class 1259 OID 359496)
          -- Name: TeamLocationCompetitions; Type: TABLE; Schema: event; Owner: -
          --
          
          CREATE TABLE event."TeamLocationCompetitions" (
              "teamId" character varying(255),
              "locationId" character varying(255)
          );
          
          
          --
          -- TOC entry 226 (class 1259 OID 359502)
          -- Name: Files; Type: TABLE; Schema: import; Owner: -
          --
          CREATE TABLE import."Files" (
              id character varying(255) NOT NULL,
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL,
              dates character varying(255),
              "firstDay" timestamp with time zone,
              "fileLocation" character varying(255),
              name character varying(255),
              type import."enum_Files_type",
              "linkCode" character varying(255),
              "visualCode" character varying(255),
              importing boolean DEFAULT false,
              "tournamentNumber" integer
          );
          
          
          --
          -- TOC entry 227 (class 1259 OID 359509)
          -- Name: Crons; Type: TABLE; Schema: job; Owner: -
          --
          
          CREATE TABLE job."Crons" (
              id character varying(255) NOT NULL,
              cron character varying(255),
              type character varying(255),
              running boolean,
              "lastRun" timestamp with time zone,
              meta json,
              "createdAt" timestamp with time zone,
              "updatedAt" timestamp with time zone,
              scheduled character varying(255)
          );
          
          
          --
          -- TOC entry 228 (class 1259 OID 359515)
          -- Name: ClubPlayerMemberships; Type: TABLE; Schema: public; Owner: -
          --
          
          CREATE TABLE public."ClubPlayerMemberships" (
              "playerId" character varying(255) NOT NULL,
              "clubId" character varying(255) NOT NULL,
              start timestamp with time zone NOT NULL,
              "end" timestamp with time zone,
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL,
              active boolean DEFAULT true,
              id character varying(255) NOT NULL
          );
          
          --
          -- TOC entry 229 (class 1259 OID 359522)
          -- Name: Clubs; Type: TABLE; Schema: public; Owner: -
          --
          
          CREATE TABLE public."Clubs" (
              id character varying(255) NOT NULL,
              name character varying(255) NOT NULL,
              "clubId" integer,
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL,
              abbreviation character varying(255),
              "fullName" character varying(255),
              "useForTeamName" public."enum_Clubs_useForTeamName" DEFAULT 'name'::public."enum_Clubs_useForTeamName",
              slug character varying(255)
          );
          
          --
          -- TOC entry 230 (class 1259 OID 359529)
          -- Name: Comments; Type: TABLE; Schema: public; Owner: -
          --
          
          CREATE TABLE public."Comments" (
              id character varying(255) NOT NULL,
              "createdAt" timestamp with time zone,
              "updatedAt" timestamp with time zone,
              "playerId" character varying(255),
              "clubId" character varying(255),
              message text,
              "linkId" character varying(255),
              "linkType" character varying(255)
          );
          
          --
          -- TOC entry 231 (class 1259 OID 359535)
          -- Name: Players; Type: TABLE; Schema: public; Owner: -
          --
          
          CREATE TABLE public."Players" (
              id character varying(255) NOT NULL,
              email character varying(255),
              gender character varying(255),
              "firstName" character varying(255),
              "lastName" character varying(255),
              "memberId" character varying(255),
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL,
              "birthDate" timestamp with time zone,
              "competitionPlayer" boolean DEFAULT false,
              phone character varying(255),
              sub character varying(255),
              slug character varying(255)
          );
          
          --
          -- TOC entry 232 (class 1259 OID 359542)
          -- Name: RequestLinks; Type: TABLE; Schema: public; Owner: -
          --
          
          CREATE TABLE public."RequestLinks" (
              id character varying(255) NOT NULL,
              "playerId" character varying(255),
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL,
              sub character varying(255)
          );
          
          --
          -- TOC entry 234 (class 1259 OID 359551)
          -- Name: TeamPlayerMemberships; Type: TABLE; Schema: public; Owner: -
          --
          
          CREATE TABLE public."TeamPlayerMemberships" (
              "playerId" character varying(255) NOT NULL,
              "teamId" character varying(255) NOT NULL,
              "end" timestamp with time zone,
              base boolean DEFAULT false NOT NULL,
              start timestamp with time zone NOT NULL,
              id character varying(255) NOT NULL,
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL
          );
          
          --
          -- TOC entry 235 (class 1259 OID 359558)
          -- Name: Teams; Type: TABLE; Schema: public; Owner: -
          --
          
          CREATE TABLE public."Teams" (
              id character varying(255) NOT NULL,
              name character varying(255),
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL,
              abbreviation character varying(255),
              active boolean DEFAULT true,
              "captainId" character varying(255),
              "clubId" character varying(255),
              "teamNumber" integer,
              "preferredDay" public."enum_Teams_preferredDay",
              "preferredTime" time without time zone,
              type character varying(255),
              email character varying(255),
              phone character varying(255),
              slug character varying(255)
          );
          
          
          --
          -- TOC entry 236 (class 1259 OID 359565)
          -- Name: socket_io_attachments; Type: TABLE; Schema: public; Owner: -
          --
          
          CREATE TABLE public.socket_io_attachments (
              id bigint NOT NULL,
              created_at timestamp with time zone DEFAULT now(),
              payload bytea
          );
          
          --
          -- TOC entry 237 (class 1259 OID 359572)
          -- Name: socket_io_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
          --
          
          CREATE SEQUENCE public.socket_io_attachments_id_seq
              START WITH 1
              INCREMENT BY 1
              NO MINVALUE
              NO MAXVALUE
              CACHE 1;
          
          
          --
          -- TOC entry 3547 (class 0 OID 0)
          -- Dependencies: 237
          -- Name: socket_io_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
          --
          
          ALTER SEQUENCE public.socket_io_attachments_id_seq OWNED BY public.socket_io_attachments.id;
          
          
          --
          -- TOC entry 238 (class 1259 OID 359574)
          -- Name: RankingGroupSubEventCompetitionMemberships; Type: TABLE; Schema: ranking; Owner: -
          --
          
          CREATE TABLE ranking."RankingGroupSubEventCompetitionMemberships" (
              "subEventId" character varying(255) NOT NULL,
              "groupId" character varying(255) NOT NULL
          );
          
          
          --
          -- TOC entry 239 (class 1259 OID 359580)
          -- Name: RankingGroupSubEventTournamentMemberships; Type: TABLE; Schema: ranking; Owner: -
          --
          
          CREATE TABLE ranking."RankingGroupSubEventTournamentMemberships" (
              "subEventId" character varying(255) NOT NULL,
              "groupId" character varying(255) NOT NULL
          );
          
          
          --
          -- TOC entry 240 (class 1259 OID 359586)
          -- Name: RankingSystemRankingGroupMemberships; Type: TABLE; Schema: ranking; Owner: -
          --
          
          CREATE TABLE ranking."RankingSystemRankingGroupMemberships" (
              "groupId" character varying(255) NOT NULL,
              "systemId" character varying(255) NOT NULL
          );
          
          
          --
          -- TOC entry 241 (class 1259 OID 359592)
          -- Name: RankingGroups; Type: TABLE; Schema: ranking; Owner: -
          --
          
          CREATE TABLE ranking."RankingGroups" (
              id character varying(255) NOT NULL,
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL,
              name character varying(255)
          );
          
          
          --
          -- TOC entry 242 (class 1259 OID 359598)
          -- Name: RankingLastPlaces; Type: TABLE; Schema: ranking; Owner: -
          --
          
          CREATE TABLE ranking."RankingLastPlaces" (
              id character varying(255) NOT NULL,
              "createdAt" timestamp with time zone,
              "updatedAt" timestamp with time zone,
              "playerId" character varying(255),
              "systemId" character varying(255),
              "rankingDate" timestamp with time zone,
              "singlePoints" integer,
              "mixPoints" integer,
              "doublePoints" integer,
              "singlePointsDowngrade" integer,
              "mixPointsDowngrade" integer,
              "doublePointsDowngrade" integer,
              "singleRank" integer,
              "mixRank" integer,
              "doubleRank" integer,
              "totalSingleRanking" integer,
              "totalMixRanking" integer,
              "totalDoubleRanking" integer,
              "totalWithinSingleLevel" integer,
              "totalWithinMixLevel" integer,
              "totalWithinDoubleLevel" integer,
              single integer,
              mix integer,
              double integer,
              "singleInactive" boolean,
              "mixInactive" boolean,
              "doubleInactive" boolean,
              gender character varying(255)
          );
          
          
          --
          -- TOC entry 243 (class 1259 OID 359604)
          -- Name: RankingPlaces; Type: TABLE; Schema: ranking; Owner: -
          --
          
          CREATE TABLE ranking."RankingPlaces" (
              id character varying(255) NOT NULL,
              "rankingDate" timestamp with time zone,
              "singlePoints" integer,
              "mixPoints" integer,
              "doublePoints" integer,
              "singleRank" integer,
              "mixRank" integer,
              "doubleRank" integer,
              single integer,
              mix integer,
              double integer,
              "singlePointsDowngrade" integer,
              "doublePointsDowngrade" integer,
              "mixPointsDowngrade" integer,
              "singleInactive" boolean DEFAULT false,
              "doubleInactive" boolean DEFAULT false,
              "mixInactive" boolean DEFAULT false,
              "totalSingleRanking" integer,
              "totalDoubleRanking" integer,
              "totalMixRanking" integer,
              "totalWithinSingleLevel" integer,
              "totalWithinDoubleLevel" integer,
              "totalWithinMixLevel" integer,
              "playerId" character varying(255),
              "systemId" character varying(255),
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL,
              "updatePossible" boolean,
              gender character varying(255)
          );
          
          
          --
          -- TOC entry 244 (class 1259 OID 359613)
          -- Name: RankingPoints; Type: TABLE; Schema: ranking; Owner: -
          --
          
          CREATE TABLE ranking."RankingPoints" (
              id character varying(255) NOT NULL,
              RankingPoints integer,
              "rankingDate" timestamp with time zone,
              "differenceInLevel" integer,
              "playerId" character varying(255),
              "gameId" character varying(255),
              "systemId" character varying(255),
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL
          );
          
          
          --
          -- TOC entry 245 (class 1259 OID 359619)
          -- Name: RankingSystems; Type: TABLE; Schema: ranking; Owner: -
          --
          
          CREATE TABLE ranking."RankingSystems" (
              id character varying(255) NOT NULL,
              name character varying(255),
              "amountOfLevels" integer,
              "primary" boolean,
              "procentWinning" integer,
              "procentWinningPlus1" integer,
              "procentLosing" integer,
              "minNumberOfGamesUsedForUpgrade" integer,
              "maxDiffLevels" integer,
              "maxDiffLevelsHighest" integer,
              "latestXGamesToUse" integer,
              "updateIntervalAmount" integer,
              "updateIntervalUnit" ranking."enum_Systems_updateIntervalUnit",
              "periodAmount" integer,
              "periodUnit" ranking."enum_Systems_periodUnit",
              "rankingSystem" ranking."enum_Systems_rankingSystem",
              "runCurrently" boolean DEFAULT false,
              "runDate" timestamp with time zone,
              "startingType" ranking."enum_Systems_startingType" DEFAULT 'formula'::ranking."enum_Systems_startingType",
              "differenceForUpgrade" integer DEFAULT 1,
              "differenceForDowngrade" integer DEFAULT 0,
              "maxLevelUpPerChange" integer,
              "maxLevelDownPerChange" integer,
              "inactivityAmount" integer,
              "inactivityUnit" ranking."enum_Systems_inactivityUnit",
              "gamesForInactivty" integer,
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL,
              "updateIntervalAmountLastUpdate" timestamp with time zone DEFAULT '2016-09-01 00:00:00+02'::timestamp with time zone,
              "caluclationIntervalAmount" integer,
              "calculationIntervalUnit" ranking."enum_Systems_calculationIntervalUnit",
              "caluclationIntervalLastUpdate" timestamp with time zone DEFAULT '2016-09-01 00:00:00+02'::timestamp with time zone
          );
          
          
          --
          -- TOC entry 252 (class 1259 OID 360191)
          -- Name: socket_io_attachments; Type: TABLE; Schema: ranking; Owner: -
          --
          
          CREATE TABLE ranking.socket_io_attachments (
              id bigint NOT NULL,
              created_at timestamp with time zone DEFAULT now(),
              payload bytea
          );
          
          
          --
          -- TOC entry 251 (class 1259 OID 360189)
          -- Name: socket_io_attachments_id_seq; Type: SEQUENCE; Schema: ranking; Owner: -
          --
          
          CREATE SEQUENCE ranking.socket_io_attachments_id_seq
              START WITH 1
              INCREMENT BY 1
              NO MINVALUE
              NO MAXVALUE
              CACHE 1;
          
          
          --
          -- TOC entry 3548 (class 0 OID 0)
          -- Dependencies: 251
          -- Name: socket_io_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: ranking; Owner: -
          --
          
          ALTER SEQUENCE ranking.socket_io_attachments_id_seq OWNED BY ranking.socket_io_attachments.id;
          
          
          --
          -- TOC entry 246 (class 1259 OID 359631)
          -- Name: Claims; Type: TABLE; Schema: security; Owner: -
          --
          
          CREATE TABLE security."Claims" (
              id character varying(255) NOT NULL,
              name character varying(255),
              description character varying(255),
              category character varying(255),
              type security."enum_Claims_type",
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL
          );
          
          
          --
          -- TOC entry 247 (class 1259 OID 359637)
          -- Name: PlayerClaimMemberships; Type: TABLE; Schema: security; Owner: -
          --
          
          CREATE TABLE security."PlayerClaimMemberships" (
              "playerId" character varying(255) NOT NULL,
              "claimId" character varying(255) NOT NULL,
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL
          );
          
          
          --
          -- TOC entry 248 (class 1259 OID 359643)
          -- Name: PlayerRoleMemberships; Type: TABLE; Schema: security; Owner: -
          --
          
          CREATE TABLE security."PlayerRoleMemberships" (
              "playerId" character varying(255) NOT NULL,
              "roleId" character varying(255) NOT NULL,
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL
          );
          
          
          --
          -- TOC entry 249 (class 1259 OID 359649)
          -- Name: RoleClaimMemberships; Type: TABLE; Schema: security; Owner: -
          --
          
          CREATE TABLE security."RoleClaimMemberships" (
              "roleId" character varying(255) NOT NULL,
              "claimId" character varying(255) NOT NULL,
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL
          );
          
          
          --
          -- TOC entry 250 (class 1259 OID 359655)
          -- Name: Roles; Type: TABLE; Schema: security; Owner: -
          --
          
          CREATE TABLE security."Roles" (
              id character varying(255) NOT NULL,
              name character varying(255),
              description character varying(255),
              "clubId" character varying(255),
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL,
              type security."enum_Roles_type"
          );
          
          --
          -- TOC entry 3189 (class 2604 OID 359661)
          -- Name: socket_io_attachments id; Type: DEFAULT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public.socket_io_attachments ALTER COLUMN id SET DEFAULT nextval('public.socket_io_attachments_id_seq'::regclass);
          
          
          --
          -- TOC entry 3199 (class 2604 OID 360194)
          -- Name: socket_io_attachments id; Type: DEFAULT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking.socket_io_attachments ALTER COLUMN id SET DEFAULT nextval('ranking.socket_io_attachments_id_seq'::regclass);
          
          
          --
          -- TOC entry 3202 (class 2606 OID 359699)
          -- Name: Availabilities Availabilities_pkey; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."Availabilities"
              ADD CONSTRAINT "Availabilities_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3206 (class 2606 OID 359701)
          -- Name: Courts Courts_name_locationId_key; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."Courts"
              ADD CONSTRAINT "Courts_name_locationId_key" UNIQUE (name, "locationId");
          
          
          --
          -- TOC entry 3208 (class 2606 OID 359703)
          -- Name: Courts Courts_pkey; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."Courts"
              ADD CONSTRAINT "Courts_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3210 (class 2606 OID 359705)
          -- Name: DrawCompetitions DrawCompetitions_pkey; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."DrawCompetitions"
              ADD CONSTRAINT "DrawCompetitions_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3212 (class 2606 OID 359707)
          -- Name: DrawCompetitions DrawCompetitions_unique_constraint; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."DrawCompetitions"
              ADD CONSTRAINT "DrawCompetitions_unique_constraint" UNIQUE (name, "visualCode", "subeventId", type);
          
          
          --
          -- TOC entry 3214 (class 2606 OID 359709)
          -- Name: DrawTournaments DrawTournaments_pkey; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."DrawTournaments"
              ADD CONSTRAINT "DrawTournaments_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3216 (class 2606 OID 359711)
          -- Name: DrawTournaments DrawTournaments_unique_constraint; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."DrawTournaments"
              ADD CONSTRAINT "DrawTournaments_unique_constraint" UNIQUE (name, type, "visualCode", "subeventId");
          
          
          --
          -- TOC entry 3218 (class 2606 OID 359713)
          -- Name: EncounterChangeDates EncounterChangeDates_pkey; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."EncounterChangeDates"
              ADD CONSTRAINT "EncounterChangeDates_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3220 (class 2606 OID 359715)
          -- Name: EncounterChanges EncounterChanges_pkey; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."EncounterChanges"
              ADD CONSTRAINT "EncounterChanges_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3222 (class 2606 OID 359717)
          -- Name: EncounterCompetitions EncounterCompetitions_pkey; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."EncounterCompetitions"
              ADD CONSTRAINT "EncounterCompetitions_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3224 (class 2606 OID 359719)
          -- Name: Entries Entries_pkey; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."Entries"
              ADD CONSTRAINT "Entries_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3226 (class 2606 OID 359721)
          -- Name: EventCompetitions EventCompetitions_pkey; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."EventCompetitions"
              ADD CONSTRAINT "EventCompetitions_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3228 (class 2606 OID 359723)
          -- Name: EventCompetitions EventCompetitions_slug_key; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."EventCompetitions"
              ADD CONSTRAINT "EventCompetitions_slug_key" UNIQUE (slug);
          
          
          --
          -- TOC entry 3230 (class 2606 OID 359725)
          -- Name: EventCompetitions EventCompetitions_unique_constraint; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."EventCompetitions"
              ADD CONSTRAINT "EventCompetitions_unique_constraint" UNIQUE (name, "startYear", type, "visualCode");
          
          
          --
          -- TOC entry 3232 (class 2606 OID 359727)
          -- Name: EventTournaments EventTournaments_pkey; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."EventTournaments"
              ADD CONSTRAINT "EventTournaments_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3234 (class 2606 OID 359729)
          -- Name: EventTournaments EventTournaments_slug_key; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."EventTournaments"
              ADD CONSTRAINT "EventTournaments_slug_key" UNIQUE (slug);
          
          
          --
          -- TOC entry 3236 (class 2606 OID 359731)
          -- Name: EventTournaments EventTournaments_unique_constraint; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."EventTournaments"
              ADD CONSTRAINT "EventTournaments_unique_constraint" UNIQUE (name, "firstDay", "visualCode");
          
          
          --
          -- TOC entry 3238 (class 2606 OID 359733)
          -- Name: GamePlayers GamePlayers_pkey; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."GamePlayers"
              ADD CONSTRAINT "GamePlayers_pkey" PRIMARY KEY ("playerId", "gameId");
          
          
          --
          -- TOC entry 3242 (class 2606 OID 359744)
          -- Name: Games Games_pkey; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."Games"
              ADD CONSTRAINT "Games_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3245 (class 2606 OID 359748)
          -- Name: LocationEventTournaments LocationEventTournaments_pkey; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."LocationEventTournaments"
              ADD CONSTRAINT "LocationEventTournaments_pkey" PRIMARY KEY ("eventId", "locationId");
          
          
          --
          -- TOC entry 3247 (class 2606 OID 359750)
          -- Name: Locations Locations_pkey; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."Locations"
              ADD CONSTRAINT "Locations_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3250 (class 2606 OID 359759)
          -- Name: Standings Standings_pkey; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."Standings"
              ADD CONSTRAINT "Standings_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3252 (class 2606 OID 359775)
          -- Name: SubEventCompetitions SubEventCompetitions_pkey; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."SubEventCompetitions"
              ADD CONSTRAINT "SubEventCompetitions_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3254 (class 2606 OID 359777)
          -- Name: SubEventCompetitions SubEventCompetitions_unique_constraint; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."SubEventCompetitions"
              ADD CONSTRAINT "SubEventCompetitions_unique_constraint" UNIQUE (name, "eventType", "visualCode", "eventId");
          
          
          --
          -- TOC entry 3256 (class 2606 OID 359779)
          -- Name: SubEventTournaments SubEventTournaments_pkey; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."SubEventTournaments"
              ADD CONSTRAINT "SubEventTournaments_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3258 (class 2606 OID 359781)
          -- Name: SubEventTournaments SubEventTournaments_unique_constraint; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."SubEventTournaments"
              ADD CONSTRAINT "SubEventTournaments_unique_constraint" UNIQUE (name, "eventType", "gameType", "visualCode", "eventId");
          
          
          --
          -- TOC entry 3204 (class 2606 OID 359783)
          -- Name: Availabilities availability_unique_constraint; Type: CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."Availabilities"
              ADD CONSTRAINT availability_unique_constraint UNIQUE (year, "locationId");
          
          
          --
          -- TOC entry 3260 (class 2606 OID 359785)
          -- Name: Files Files_name_type_firstDay_key; Type: CONSTRAINT; Schema: import; Owner: -
          --
          
          ALTER TABLE ONLY import."Files"
              ADD CONSTRAINT "Files_name_type_firstDay_key" UNIQUE (name, type, "firstDay");
          
          
          --
          -- TOC entry 3262 (class 2606 OID 359787)
          -- Name: Files Files_pkey; Type: CONSTRAINT; Schema: import; Owner: -
          --
          
          ALTER TABLE ONLY import."Files"
              ADD CONSTRAINT "Files_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3264 (class 2606 OID 359789)
          -- Name: Crons Crons_pkey; Type: CONSTRAINT; Schema: job; Owner: -
          --
          
          ALTER TABLE ONLY job."Crons"
              ADD CONSTRAINT "Crons_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3266 (class 2606 OID 359791)
          -- Name: ClubPlayerMemberships ClubPlayerMemberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."ClubPlayerMemberships"
              ADD CONSTRAINT "ClubPlayerMemberships_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3268 (class 2606 OID 359793)
          -- Name: ClubPlayerMemberships ClubPlayerMemberships_playerId_clubId_start_key; Type: CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."ClubPlayerMemberships"
              ADD CONSTRAINT "ClubPlayerMemberships_playerId_clubId_start_key" UNIQUE ("playerId", "clubId", start);
          
          
          --
          -- TOC entry 3271 (class 2606 OID 359795)
          -- Name: Clubs Clubs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."Clubs"
              ADD CONSTRAINT "Clubs_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3273 (class 2606 OID 359797)
          -- Name: Clubs Clubs_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."Clubs"
              ADD CONSTRAINT "Clubs_slug_key" UNIQUE (slug);
          
          
          --
          -- TOC entry 3278 (class 2606 OID 359799)
          -- Name: Comments Comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."Comments"
              ADD CONSTRAINT "Comments_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3281 (class 2606 OID 359816)
          -- Name: Players Players_firstName_lastName_memberId_key; Type: CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."Players"
              ADD CONSTRAINT "Players_firstName_lastName_memberId_key" UNIQUE ("firstName", "lastName", "memberId");
          
          
          --
          -- TOC entry 3283 (class 2606 OID 359819)
          -- Name: Players Players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."Players"
              ADD CONSTRAINT "Players_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3285 (class 2606 OID 359821)
          -- Name: Players Players_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."Players"
              ADD CONSTRAINT "Players_slug_key" UNIQUE (slug);
          
          
          --
          -- TOC entry 3292 (class 2606 OID 359823)
          -- Name: RequestLinks RequestLinks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."RequestLinks"
              ADD CONSTRAINT "RequestLinks_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3297 (class 2606 OID 359827)
          -- Name: TeamPlayerMemberships TeamPlayerMemberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."TeamPlayerMemberships"
              ADD CONSTRAINT "TeamPlayerMemberships_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3299 (class 2606 OID 359829)
          -- Name: TeamPlayerMemberships TeamPlayerMemberships_playerId_teamId_start_key; Type: CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."TeamPlayerMemberships"
              ADD CONSTRAINT "TeamPlayerMemberships_playerId_teamId_start_key" UNIQUE ("playerId", "teamId", start);
          
          
          --
          -- TOC entry 3302 (class 2606 OID 359831)
          -- Name: Teams Teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."Teams"
              ADD CONSTRAINT "Teams_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3304 (class 2606 OID 359833)
          -- Name: Teams Teams_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."Teams"
              ADD CONSTRAINT "Teams_slug_key" UNIQUE (slug);
          
          
          --
          -- TOC entry 3275 (class 2606 OID 359835)
          -- Name: Clubs club_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."Clubs"
              ADD CONSTRAINT club_number_unique UNIQUE (name, "clubId");
          
          
          --
          -- TOC entry 3309 (class 2606 OID 359837)
          -- Name: socket_io_attachments socket_io_attachments_id_key; Type: CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public.socket_io_attachments
              ADD CONSTRAINT socket_io_attachments_id_key UNIQUE (id);
          
          
          --
          -- TOC entry 3307 (class 2606 OID 359839)
          -- Name: Teams teams_unique_constraint; Type: CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."Teams"
              ADD CONSTRAINT teams_unique_constraint UNIQUE (name, "clubId", "teamNumber");
          
          
          --
          -- TOC entry 3311 (class 2606 OID 359841)
          -- Name: RankingGroupSubEventCompetitionMemberships GroupSubEventCompetitions_pkey; Type: CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingGroupSubEventCompetitionMemberships"
              ADD CONSTRAINT "GroupSubEventCompetitions_pkey" PRIMARY KEY ("subEventId", "groupId");
          
          
          --
          -- TOC entry 3313 (class 2606 OID 359843)
          -- Name: RankingGroupSubEventTournamentMemberships GroupSubEventTournaments_pkey; Type: CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingGroupSubEventTournamentMemberships"
              ADD CONSTRAINT "GroupSubEventTournaments_pkey" PRIMARY KEY ("subEventId", "groupId");
          
          
          --
          -- TOC entry 3315 (class 2606 OID 359845)
          -- Name: RankingSystemRankingGroupMemberships GroupSystemMemberships_pkey; Type: CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingSystemRankingGroupMemberships"
              ADD CONSTRAINT "GroupSystemMemberships_pkey" PRIMARY KEY ("systemId", "groupId");
          
          
          --
          -- TOC entry 3317 (class 2606 OID 359847)
          -- Name: RankingGroups Groups_name_key; Type: CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingGroups"
              ADD CONSTRAINT "Groups_name_key" UNIQUE (name);
          
          
          --
          -- TOC entry 3319 (class 2606 OID 359849)
          -- Name: RankingGroups Groups_pkey; Type: CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingGroups"
              ADD CONSTRAINT "Groups_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3321 (class 2606 OID 359851)
          -- Name: RankingLastPlaces LastPlaces_pkey; Type: CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingLastPlaces"
              ADD CONSTRAINT "LastPlaces_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3326 (class 2606 OID 359853)
          -- Name: RankingPlaces Places_pkey; Type: CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingPlaces"
              ADD CONSTRAINT "Places_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3328 (class 2606 OID 359871)
          -- Name: RankingPlaces Places_rankingDate_playerId_systemId_key; Type: CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingPlaces"
              ADD CONSTRAINT "Places_rankingDate_playerId_systemId_key" UNIQUE ("rankingDate", "playerId", "systemId");
          
          
          --
          -- TOC entry 3333 (class 2606 OID 359873)
          -- Name: RankingPoints Points_pkey; Type: CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingPoints"
              ADD CONSTRAINT "Points_pkey" PRIMARY KEY (id);
          
          --
          -- TOC entry 3339 (class 2606 OID 359885)
          -- Name: RankingSystems Systems_name_key; Type: CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingSystems"
              ADD CONSTRAINT "Systems_name_key" UNIQUE (name);
          
          
          --
          -- TOC entry 3341 (class 2606 OID 359887)
          -- Name: RankingSystems Systems_pkey; Type: CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingSystems"
              ADD CONSTRAINT "Systems_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3324 (class 2606 OID 359889)
          -- Name: RankingLastPlaces lastPlaces_unique_constraint; Type: CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingLastPlaces"
              ADD CONSTRAINT "lastPlaces_unique_constraint" UNIQUE ("playerId", "systemId");
          
          
          --
          -- TOC entry 3359 (class 2606 OID 360200)
          -- Name: socket_io_attachments socket_io_attachments_id_key; Type: CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking.socket_io_attachments
              ADD CONSTRAINT socket_io_attachments_id_key UNIQUE (id);
          
          
          --
          -- TOC entry 3343 (class 2606 OID 359891)
          -- Name: Claims Claims_name_category_key; Type: CONSTRAINT; Schema: security; Owner: -
          --
          
          ALTER TABLE ONLY security."Claims"
              ADD CONSTRAINT "Claims_name_category_key" UNIQUE (name, category);
          
          
          --
          -- TOC entry 3345 (class 2606 OID 359893)
          -- Name: Claims Claims_pkey; Type: CONSTRAINT; Schema: security; Owner: -
          --
          
          ALTER TABLE ONLY security."Claims"
              ADD CONSTRAINT "Claims_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3349 (class 2606 OID 359895)
          -- Name: PlayerClaimMemberships PlayerClaimMemberships_pkey; Type: CONSTRAINT; Schema: security; Owner: -
          --
          
          ALTER TABLE ONLY security."PlayerClaimMemberships"
              ADD CONSTRAINT "PlayerClaimMemberships_pkey" PRIMARY KEY ("playerId", "claimId");
          
          
          --
          -- TOC entry 3351 (class 2606 OID 359897)
          -- Name: PlayerRoleMemberships PlayerRoleMemberships_pkey; Type: CONSTRAINT; Schema: security; Owner: -
          --
          
          ALTER TABLE ONLY security."PlayerRoleMemberships"
              ADD CONSTRAINT "PlayerRoleMemberships_pkey" PRIMARY KEY ("playerId", "roleId");
          
          
          --
          -- TOC entry 3353 (class 2606 OID 359899)
          -- Name: RoleClaimMemberships RoleClaimMemberships_pkey; Type: CONSTRAINT; Schema: security; Owner: -
          --
          
          ALTER TABLE ONLY security."RoleClaimMemberships"
              ADD CONSTRAINT "RoleClaimMemberships_pkey" PRIMARY KEY ("roleId", "claimId");
          
          
          --
          -- TOC entry 3355 (class 2606 OID 359901)
          -- Name: Roles Roles_pkey; Type: CONSTRAINT; Schema: security; Owner: -
          --
          
          ALTER TABLE ONLY security."Roles"
              ADD CONSTRAINT "Roles_pkey" PRIMARY KEY (id);
          
          
          --
          -- TOC entry 3243 (class 1259 OID 359902)
          -- Name: game_parent_index; Type: INDEX; Schema: event; Owner: -
          --
          
          CREATE INDEX game_parent_index ON event."Games" USING btree ("linkId", "linkType");
          
          
          --
          -- TOC entry 3239 (class 1259 OID 359903)
          -- Name: game_players_game_id; Type: INDEX; Schema: event; Owner: -
          --
          
          CREATE INDEX game_players_game_id ON event."GamePlayers" USING btree ("gameId");
          
          
          --
          -- TOC entry 3240 (class 1259 OID 359904)
          -- Name: game_players_player_id; Type: INDEX; Schema: event; Owner: -
          --
          
          CREATE INDEX game_players_player_id ON event."GamePlayers" USING btree ("playerId");
          
          
          --
          -- TOC entry 3248 (class 1259 OID 359905)
          -- Name: locations_club_id; Type: INDEX; Schema: event; Owner: -
          --
          
          CREATE INDEX locations_club_id ON event."Locations" USING btree ("clubId");
          
          
          --
          -- TOC entry 3276 (class 1259 OID 359906)
          -- Name: clubs_name; Type: INDEX; Schema: public; Owner: -
          --
          
          CREATE INDEX clubs_name ON public."Clubs" USING btree (name);
          
          
          --
          -- TOC entry 3279 (class 1259 OID 359907)
          -- Name: comment_index; Type: INDEX; Schema: public; Owner: -
          --
          
          CREATE INDEX comment_index ON public."Comments" USING btree ("linkId", "linkType", "clubId");
          
          
          --
          -- TOC entry 3269 (class 1259 OID 359908)
          -- Name: player_club_index; Type: INDEX; Schema: public; Owner: -
          --
          
          CREATE INDEX player_club_index ON public."ClubPlayerMemberships" USING btree ("playerId", "clubId");
          
          
          --
          -- TOC entry 3300 (class 1259 OID 359909)
          -- Name: player_team_index; Type: INDEX; Schema: public; Owner: -
          --
          
          CREATE INDEX player_team_index ON public."TeamPlayerMemberships" USING btree ("playerId", "teamId");
          
          
          --
          -- TOC entry 3286 (class 1259 OID 359910)
          -- Name: players_first_name; Type: INDEX; Schema: public; Owner: -
          --
          
          CREATE INDEX players_first_name ON public."Players" USING btree ("firstName");
          
          
          --
          -- TOC entry 3287 (class 1259 OID 359911)
          -- Name: players_id; Type: INDEX; Schema: public; Owner: -
          --
          
          CREATE UNIQUE INDEX players_id ON public."Players" USING btree (id);
          
          
          --
          -- TOC entry 3288 (class 1259 OID 359912)
          -- Name: players_last_name; Type: INDEX; Schema: public; Owner: -
          --
          
          CREATE INDEX players_last_name ON public."Players" USING btree ("lastName");
          
          
          --
          -- TOC entry 3289 (class 1259 OID 359913)
          -- Name: players_member_id; Type: INDEX; Schema: public; Owner: -
          --
          
          CREATE INDEX players_member_id ON public."Players" USING btree ("memberId");
          
          
          --
          -- TOC entry 3290 (class 1259 OID 359914)
          -- Name: players_slug; Type: INDEX; Schema: public; Owner: -
          --
          
          CREATE UNIQUE INDEX players_slug ON public."Players" USING btree (slug);
          
          
          --
          -- TOC entry 3293 (class 1259 OID 359915)
          -- Name: request_links__player_id; Type: INDEX; Schema: public; Owner: -
          --
          
          CREATE INDEX request_links__player_id ON public."RequestLinks" USING btree ("playerId");
          
          
          --
          -- TOC entry 3305 (class 1259 OID 359916)
          -- Name: teams_club_index; Type: INDEX; Schema: public; Owner: -
          --
          
          CREATE INDEX teams_club_index ON public."Teams" USING btree ("clubId");
          
          
          --
          -- TOC entry 3322 (class 1259 OID 359917)
          -- Name: lastPlaces_ranking_index; Type: INDEX; Schema: ranking; Owner: -
          --
          
          CREATE UNIQUE INDEX "lastPlaces_ranking_index" ON ranking."RankingLastPlaces" USING btree ("playerId", "systemId");
          
          
          --
          -- TOC entry 3329 (class 1259 OID 359918)
          -- Name: places_date_index; Type: INDEX; Schema: ranking; Owner: -
          --
          
          CREATE INDEX places_date_index ON ranking."RankingPlaces" USING brin ("rankingDate");
          
          
          --
          -- TOC entry 3330 (class 1259 OID 359919)
          -- Name: places_system_index; Type: INDEX; Schema: ranking; Owner: -
          --
          
          CREATE UNIQUE INDEX places_system_index ON ranking."RankingPlaces" USING btree ("playerId", "systemId", "rankingDate");
          
          
          --
          -- TOC entry 3334 (class 1259 OID 359920)
          -- Name: point_game_system_index; Type: INDEX; Schema: ranking; Owner: -
          --
          
          CREATE INDEX point_game_system_index ON ranking."RankingPoints" USING btree ("gameId", "systemId");
          
          
          --
          -- TOC entry 3335 (class 1259 OID 359921)
          -- Name: point_player_system_index; Type: INDEX; Schema: ranking; Owner: -
          --
          
          CREATE UNIQUE INDEX point_player_system_index ON ranking."RankingPoints" USING btree ("playerId", "gameId", "systemId");
          
          
          --
          -- TOC entry 3336 (class 1259 OID 359922)
          -- Name: point_system_index; Type: INDEX; Schema: ranking; Owner: -
          --
          
          CREATE INDEX point_system_index ON ranking."RankingPoints" USING btree ("systemId", "playerId");
          
          
          --
          -- TOC entry 3337 (class 1259 OID 359923)
          -- Name: points_date_index; Type: INDEX; Schema: ranking; Owner: -
          --
          
          CREATE INDEX points_date_index ON ranking."RankingPoints" USING brin ("rankingDate");
          
          
          --
          -- TOC entry 3331 (class 1259 OID 359924)
          -- Name: ranking_index; Type: INDEX; Schema: ranking; Owner: -
          --
          
          CREATE INDEX ranking_index ON ranking."RankingPlaces" USING btree ("playerId", "systemId");
          
          
          --
          -- TOC entry 3346 (class 1259 OID 359925)
          -- Name: claims_description; Type: INDEX; Schema: security; Owner: -
          --
          
          CREATE INDEX claims_description ON security."Claims" USING btree (description);
          
          
          --
          -- TOC entry 3347 (class 1259 OID 359926)
          -- Name: claims_name; Type: INDEX; Schema: security; Owner: -
          --
          
          CREATE INDEX claims_name ON security."Claims" USING btree (name);
          
          
          --
          -- TOC entry 3356 (class 1259 OID 359927)
          -- Name: roles_description; Type: INDEX; Schema: security; Owner: -
          --
          
          CREATE INDEX roles_description ON security."Roles" USING btree (description);
          
          
          --
          -- TOC entry 3357 (class 1259 OID 359928)
          -- Name: roles_name; Type: INDEX; Schema: security; Owner: -
          --
          
          CREATE INDEX roles_name ON security."Roles" USING btree (name);
          
          --
          -- TOC entry 3360 (class 2606 OID 359929)
          -- Name: Availabilities Availabilities_locationId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."Availabilities"
              ADD CONSTRAINT "Availabilities_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES event."Locations"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3361 (class 2606 OID 359934)
          -- Name: Courts Courts_locationId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."Courts"
              ADD CONSTRAINT "Courts_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES event."Locations"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3362 (class 2606 OID 359939)
          -- Name: DrawCompetitions DrawCompetitions_subeventId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."DrawCompetitions"
              ADD CONSTRAINT "DrawCompetitions_subeventId_fkey" FOREIGN KEY ("subeventId") REFERENCES event."SubEventCompetitions"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3363 (class 2606 OID 359944)
          -- Name: DrawTournaments DrawTournaments_subeventId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."DrawTournaments"
              ADD CONSTRAINT "DrawTournaments_subeventId_fkey" FOREIGN KEY ("subeventId") REFERENCES event."SubEventTournaments"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3364 (class 2606 OID 359949)
          -- Name: EncounterChangeDates EncounterChangeDates_encounterChangeId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."EncounterChangeDates"
              ADD CONSTRAINT "EncounterChangeDates_encounterChangeId_fkey" FOREIGN KEY ("encounterChangeId") REFERENCES event."EncounterChanges"(id) ON UPDATE CASCADE ON DELETE SET NULL;
          
          
          --
          -- TOC entry 3365 (class 2606 OID 359954)
          -- Name: EncounterChanges EncounterChanges_encounterId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."EncounterChanges"
              ADD CONSTRAINT "EncounterChanges_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES event."EncounterCompetitions"(id) ON UPDATE CASCADE ON DELETE SET NULL;
          
          
          --
          -- TOC entry 3366 (class 2606 OID 359959)
          -- Name: EncounterCompetitions EncounterCompetitions_awayTeamId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."EncounterCompetitions"
              ADD CONSTRAINT "EncounterCompetitions_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES public."Teams"(id) ON UPDATE CASCADE;
          
          
          --
          -- TOC entry 3367 (class 2606 OID 359964)
          -- Name: EncounterCompetitions EncounterCompetitions_drawId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."EncounterCompetitions"
              ADD CONSTRAINT "EncounterCompetitions_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES event."DrawCompetitions"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3368 (class 2606 OID 359969)
          -- Name: EncounterCompetitions EncounterCompetitions_homeTeamId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."EncounterCompetitions"
              ADD CONSTRAINT "EncounterCompetitions_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES public."Teams"(id) ON UPDATE CASCADE;
          
          
          --
          -- TOC entry 3369 (class 2606 OID 359974)
          -- Name: Entries Entries_player1Id_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."Entries"
              ADD CONSTRAINT "Entries_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE SET NULL;
          
          
          --
          -- TOC entry 3370 (class 2606 OID 359979)
          -- Name: Entries Entries_player2Id_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."Entries"
              ADD CONSTRAINT "Entries_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE SET NULL;
          
          
          --
          -- TOC entry 3371 (class 2606 OID 359984)
          -- Name: Entries Entries_teamId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."Entries"
              ADD CONSTRAINT "Entries_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public."Teams"(id) ON UPDATE CASCADE ON DELETE SET NULL;
          
          
          --
          -- TOC entry 3372 (class 2606 OID 359989)
          -- Name: GamePlayers GamePlayers_gameId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."GamePlayers"
              ADD CONSTRAINT "GamePlayers_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES event."Games"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3373 (class 2606 OID 359994)
          -- Name: GamePlayers GamePlayers_playerId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."GamePlayers"
              ADD CONSTRAINT "GamePlayers_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3374 (class 2606 OID 359999)
          -- Name: Games Games_courtId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."Games"
              ADD CONSTRAINT "Games_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES event."Courts"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3375 (class 2606 OID 360004)
          -- Name: LocationEventTournaments LocationEventTournaments_eventId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."LocationEventTournaments"
              ADD CONSTRAINT "LocationEventTournaments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES event."EventTournaments"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3376 (class 2606 OID 360009)
          -- Name: LocationEventTournaments LocationEventTournaments_locationId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."LocationEventTournaments"
              ADD CONSTRAINT "LocationEventTournaments_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES event."Locations"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3377 (class 2606 OID 360014)
          -- Name: Locations Locations_clubId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."Locations"
              ADD CONSTRAINT "Locations_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public."Clubs"(id) ON UPDATE CASCADE;
          
          
          --
          -- TOC entry 3378 (class 2606 OID 360019)
          -- Name: Standings Standings_entryId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."Standings"
              ADD CONSTRAINT "Standings_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES event."Entries"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3379 (class 2606 OID 360024)
          -- Name: SubEventCompetitions SubEventCompetitions_eventId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."SubEventCompetitions"
              ADD CONSTRAINT "SubEventCompetitions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES event."EventCompetitions"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3380 (class 2606 OID 360029)
          -- Name: SubEventTournaments SubEventTournaments_eventId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."SubEventTournaments"
              ADD CONSTRAINT "SubEventTournaments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES event."EventTournaments"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3381 (class 2606 OID 360034)
          -- Name: TeamLocationCompetitions TeamLocationCompetitions_locationId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."TeamLocationCompetitions"
              ADD CONSTRAINT "TeamLocationCompetitions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES event."Locations"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3382 (class 2606 OID 360039)
          -- Name: TeamLocationCompetitions TeamLocationCompetitions_teamId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
          --
          
          ALTER TABLE ONLY event."TeamLocationCompetitions"
              ADD CONSTRAINT "TeamLocationCompetitions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public."Teams"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3383 (class 2606 OID 360044)
          -- Name: ClubPlayerMemberships ClubPlayerMemberships_clubId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."ClubPlayerMemberships"
              ADD CONSTRAINT "ClubPlayerMemberships_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public."Clubs"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3384 (class 2606 OID 360049)
          -- Name: ClubPlayerMemberships ClubPlayerMemberships_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."ClubPlayerMemberships"
              ADD CONSTRAINT "ClubPlayerMemberships_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3385 (class 2606 OID 360054)
          -- Name: Comments Comments_clubId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."Comments"
              ADD CONSTRAINT "Comments_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public."Clubs"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3386 (class 2606 OID 360059)
          -- Name: Comments Comments_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."Comments"
              ADD CONSTRAINT "Comments_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3387 (class 2606 OID 360064)
          -- Name: RequestLinks RequestLinks_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."RequestLinks"
              ADD CONSTRAINT "RequestLinks_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE SET NULL;
          
          
          --
          -- TOC entry 3388 (class 2606 OID 360069)
          -- Name: TeamPlayerMemberships TeamPlayerMemberships_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."TeamPlayerMemberships"
              ADD CONSTRAINT "TeamPlayerMemberships_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3389 (class 2606 OID 360074)
          -- Name: TeamPlayerMemberships TeamPlayerMemberships_teamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."TeamPlayerMemberships"
              ADD CONSTRAINT "TeamPlayerMemberships_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public."Teams"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3390 (class 2606 OID 360079)
          -- Name: Teams Teams_captainId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."Teams"
              ADD CONSTRAINT "Teams_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE SET NULL;
          
          
          --
          -- TOC entry 3391 (class 2606 OID 360084)
          -- Name: Teams Teams_clubId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          
          ALTER TABLE ONLY public."Teams"
              ADD CONSTRAINT "Teams_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public."Clubs"(id) ON UPDATE CASCADE ON DELETE SET NULL;
          
          
          --
          -- TOC entry 3392 (class 2606 OID 360089)
          -- Name: RankingGroupSubEventCompetitionMemberships GroupSubEventCompetitions_groupId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingGroupSubEventCompetitionMemberships"
              ADD CONSTRAINT "GroupSubEventCompetitions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES ranking."RankingGroups"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3393 (class 2606 OID 360094)
          -- Name: RankingGroupSubEventCompetitionMemberships GroupSubEventCompetitions_subEventId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingGroupSubEventCompetitionMemberships"
              ADD CONSTRAINT "GroupSubEventCompetitions_subEventId_fkey" FOREIGN KEY ("subEventId") REFERENCES event."SubEventCompetitions"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3394 (class 2606 OID 360099)
          -- Name: RankingGroupSubEventTournamentMemberships GroupSubEventTournaments_groupId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingGroupSubEventTournamentMemberships"
              ADD CONSTRAINT "GroupSubEventTournaments_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES ranking."RankingGroups"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3395 (class 2606 OID 360104)
          -- Name: RankingGroupSubEventTournamentMemberships GroupSubEventTournaments_subEventId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingGroupSubEventTournamentMemberships"
              ADD CONSTRAINT "GroupSubEventTournaments_subEventId_fkey" FOREIGN KEY ("subEventId") REFERENCES event."SubEventTournaments"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3396 (class 2606 OID 360109)
          -- Name: RankingSystemRankingGroupMemberships GroupSystemMemberships_groupId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingSystemRankingGroupMemberships"
              ADD CONSTRAINT "GroupSystemMemberships_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES ranking."RankingGroups"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3397 (class 2606 OID 360114)
          -- Name: RankingSystemRankingGroupMemberships GroupSystemMemberships_systemId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingSystemRankingGroupMemberships"
              ADD CONSTRAINT "GroupSystemMemberships_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES ranking."RankingSystems"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3398 (class 2606 OID 360119)
          -- Name: RankingLastPlaces LastPlaces_playerId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingLastPlaces"
              ADD CONSTRAINT "LastPlaces_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3399 (class 2606 OID 360124)
          -- Name: RankingLastPlaces LastPlaces_systemId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingLastPlaces"
              ADD CONSTRAINT "LastPlaces_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES ranking."RankingSystems"(id) ON UPDATE CASCADE ON DELETE SET NULL;
          
          
          --
          -- TOC entry 3400 (class 2606 OID 360129)
          -- Name: RankingPlaces Places_playerId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingPlaces"
              ADD CONSTRAINT "Places_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3401 (class 2606 OID 360134)
          -- Name: RankingPlaces Places_systemId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingPlaces"
              ADD CONSTRAINT "Places_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES ranking."RankingSystems"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3402 (class 2606 OID 360139)
          -- Name: RankingPoints Points_gameId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingPoints"
              ADD CONSTRAINT "Points_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES event."Games"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3403 (class 2606 OID 360144)
          -- Name: RankingPoints Points_playerId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingPoints"
              ADD CONSTRAINT "Points_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3404 (class 2606 OID 360149)
          -- Name: RankingPoints Points_systemId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
          --
          
          ALTER TABLE ONLY ranking."RankingPoints"
              ADD CONSTRAINT "Points_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES ranking."RankingSystems"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3405 (class 2606 OID 360154)
          -- Name: PlayerClaimMemberships PlayerClaimMemberships_claimId_fkey; Type: FK CONSTRAINT; Schema: security; Owner: -
          --
          
          ALTER TABLE ONLY security."PlayerClaimMemberships"
              ADD CONSTRAINT "PlayerClaimMemberships_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES security."Claims"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3406 (class 2606 OID 360159)
          -- Name: PlayerClaimMemberships PlayerClaimMemberships_userId_fkey; Type: FK CONSTRAINT; Schema: security; Owner: -
          --
          
          ALTER TABLE ONLY security."PlayerClaimMemberships"
              ADD CONSTRAINT "PlayerClaimMemberships_userId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3407 (class 2606 OID 360164)
          -- Name: PlayerRoleMemberships PlayerRoleMemberships_roleId_fkey; Type: FK CONSTRAINT; Schema: security; Owner: -
          --
          
          ALTER TABLE ONLY security."PlayerRoleMemberships"
              ADD CONSTRAINT "PlayerRoleMemberships_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES security."Roles"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3408 (class 2606 OID 360169)
          -- Name: PlayerRoleMemberships PlayerRoleMemberships_userId_fkey; Type: FK CONSTRAINT; Schema: security; Owner: -
          --
          
          ALTER TABLE ONLY security."PlayerRoleMemberships"
              ADD CONSTRAINT "PlayerRoleMemberships_userId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3409 (class 2606 OID 360174)
          -- Name: RoleClaimMemberships RoleClaimMemberships_claimId_fkey; Type: FK CONSTRAINT; Schema: security; Owner: -
          --
          
          ALTER TABLE ONLY security."RoleClaimMemberships"
              ADD CONSTRAINT "RoleClaimMemberships_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES security."Claims"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3410 (class 2606 OID 360179)
          -- Name: RoleClaimMemberships RoleClaimMemberships_roleId_fkey; Type: FK CONSTRAINT; Schema: security; Owner: -
          --
          
          ALTER TABLE ONLY security."RoleClaimMemberships"
              ADD CONSTRAINT "RoleClaimMemberships_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES security."Roles"(id) ON UPDATE CASCADE ON DELETE CASCADE;
          
          
          --
          -- TOC entry 3411 (class 2606 OID 360184)
          -- Name: Roles Roles_clubId_fkey; Type: FK CONSTRAINT; Schema: security; Owner: -
          --
          
          ALTER TABLE ONLY security."Roles"
              ADD CONSTRAINT "Roles_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public."Clubs"(id) ON UPDATE CASCADE;
          
          
          -- Completed on 2022-05-31 18:48:07
          
          --
          -- PostgreSQL database dump complete
          --
          
          
            `,
          { transaction: t }
        );
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        try {
          console.warn('Just delete the DB');
        } catch (err) {
          console.error('We errored with', err);
          t.rollback();
        }
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
