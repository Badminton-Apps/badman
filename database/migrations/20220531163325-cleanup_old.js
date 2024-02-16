/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        const [meta] = await queryInterface.sequelize.query(
          `SELECT EXISTS (
            SELECT FROM 
                pg_tables
            WHERE 
                schemaname = 'public' AND 
                tablename  = 'SequelizeMeta'
            );`,
          { transaction: t },
        );

        // Check if meta exsists This means we come from an old version of the database,
        if (meta[0].exists) {
          await queryInterface.sequelize.query(`truncate table "SequelizeMeta";`, {
            transaction: t,
          });

          // do some magic for the old database
          // TODO :P
        }

        await queryInterface.sequelize.query(
          `
                --
                -- PostgreSQL database dump
                --
                
                -- Dumped from database version 13.2
                -- Dumped by pg_dump version 14.1
                
                -- Started on 2022-06-04 19:11:57
                
                SET statement_timeout = 0;
                SET lock_timeout = 0;
                SET idle_in_transaction_session_timeout = 0;
                SET client_encoding = 'UTF8';
                SET standard_conforming_strings = on;
                SELECT pg_catalog.set_config('search_path', '', false);
                SET check_function_bodies = false;
                SET xmloption = content;
                SET client_min_messages = warning;
                SET row_security = off;
                
                --
                -- TOC entry 5 (class 2615 OID 360213)
                -- Name: event; Type: SCHEMA; Schema: -; Owner: -
                --
                
                CREATE SCHEMA event;
                
                
                --
                -- TOC entry 10 (class 2615 OID 360214)
                -- Name: import; Type: SCHEMA; Schema: -; Owner: -
                --
                
                CREATE SCHEMA import;
                
                
                --
                -- TOC entry 7 (class 2615 OID 360215)
                -- Name: job; Type: SCHEMA; Schema: -; Owner: -
                --
                
                CREATE SCHEMA job;
                
                
                --
                -- TOC entry 6 (class 2615 OID 360216)
                -- Name: ranking; Type: SCHEMA; Schema: -; Owner: -
                --
                
                CREATE SCHEMA ranking;
                
                
                --
                -- TOC entry 11 (class 2615 OID 360217)
                -- Name: security; Type: SCHEMA; Schema: -; Owner: -
                --
                
                CREATE SCHEMA security;
                
                
                --
                -- TOC entry 2 (class 3079 OID 360218)
                -- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
                --
                
                CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
                
                
                --
                -- TOC entry 707 (class 1247 OID 360256)
                -- Name: enum_DrawCompetitions_type; Type: TYPE; Schema: event; Owner: -
                --
                
                CREATE TYPE event."enum_DrawCompetitions_type" AS ENUM (
                    'KO',
                    'POULE',
                    'QUALIFICATION'
                );
                
                
                --
                -- TOC entry 710 (class 1247 OID 360264)
                -- Name: enum_DrawTournaments_type; Type: TYPE; Schema: event; Owner: -
                --
                
                CREATE TYPE event."enum_DrawTournaments_type" AS ENUM (
                    'KO',
                    'POULE',
                    'QUALIFICATION'
                );
                
                
                --
                -- TOC entry 713 (class 1247 OID 360272)
                -- Name: enum_EncounterChangeDates_availabilityAway; Type: TYPE; Schema: event; Owner: -
                --
                
                CREATE TYPE event."enum_EncounterChangeDates_availabilityAway" AS ENUM (
                    'POSSIBLE',
                    'NOT_POSSIBLE'
                );
                
                
                --
                -- TOC entry 716 (class 1247 OID 360278)
                -- Name: enum_EncounterChangeDates_availabilityHome; Type: TYPE; Schema: event; Owner: -
                --
                
                CREATE TYPE event."enum_EncounterChangeDates_availabilityHome" AS ENUM (
                    'POSSIBLE',
                    'NOT_POSSIBLE'
                );
                
                
                --
                -- TOC entry 719 (class 1247 OID 360284)
                -- Name: enum_EventCompetitions_type; Type: TYPE; Schema: event; Owner: -
                --
                
                CREATE TYPE event."enum_EventCompetitions_type" AS ENUM (
                    'PROV',
                    'LIGA',
                    'NATIONAL'
                );
                
                
                --
                -- TOC entry 722 (class 1247 OID 360292)
                -- Name: enum_EventCompetitions_usedRankingUnit; Type: TYPE; Schema: event; Owner: -
                --
                
                CREATE TYPE event."enum_EventCompetitions_usedRankingUnit" AS ENUM (
                    'months',
                    'weeks',
                    'days'
                );
                
                
                --
                -- TOC entry 725 (class 1247 OID 360300)
                -- Name: enum_EventTournaments_usedRankingUnit; Type: TYPE; Schema: event; Owner: -
                --
                
                CREATE TYPE event."enum_EventTournaments_usedRankingUnit" AS ENUM (
                    'months',
                    'weeks',
                    'days'
                );
                
                
                --
                -- TOC entry 728 (class 1247 OID 360308)
                -- Name: enum_Games_gameType; Type: TYPE; Schema: event; Owner: -
                --
                
                CREATE TYPE event."enum_Games_gameType" AS ENUM (
                    'S',
                    'D',
                    'MX'
                );
                
                
                --
                -- TOC entry 731 (class 1247 OID 360316)
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
                -- TOC entry 734 (class 1247 OID 360328)
                -- Name: enum_SubEventCompetitions_eventType; Type: TYPE; Schema: event; Owner: -
                --
                
                CREATE TYPE event."enum_SubEventCompetitions_eventType" AS ENUM (
                    'M',
                    'F',
                    'MX',
                    'MINIBAD'
                );
                
                
                --
                -- TOC entry 737 (class 1247 OID 360338)
                -- Name: enum_SubEventTournaments_eventType; Type: TYPE; Schema: event; Owner: -
                --
                
                CREATE TYPE event."enum_SubEventTournaments_eventType" AS ENUM (
                    'M',
                    'F',
                    'MX',
                    'MINIBAD'
                );
                
                
                --
                -- TOC entry 740 (class 1247 OID 360348)
                -- Name: enum_SubEventTournaments_gameType; Type: TYPE; Schema: event; Owner: -
                --
                
                CREATE TYPE event."enum_SubEventTournaments_gameType" AS ENUM (
                    'S',
                    'D',
                    'MX'
                );
                
                
                --
                -- TOC entry 743 (class 1247 OID 360356)
                -- Name: enum_Files_type; Type: TYPE; Schema: import; Owner: -
                --
                
                CREATE TYPE import."enum_Files_type" AS ENUM (
                    'COMPETITION_CP',
                    'COMPETITION_XML',
                    'TOERNAMENT',
                    'TOURNAMENT'
                );
                
                
                --
                -- TOC entry 746 (class 1247 OID 360366)
                -- Name: enum_Clubs_useForTeamName; Type: TYPE; Schema: public; Owner: -
                --
                
                CREATE TYPE public."enum_Clubs_useForTeamName" AS ENUM (
                    'name',
                    'fullName',
                    'abbreviation'
                );
                
                
                --
                -- TOC entry 749 (class 1247 OID 360374)
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
                -- TOC entry 752 (class 1247 OID 360390)
                -- Name: enum_Systems_calculationIntervalUnit; Type: TYPE; Schema: ranking; Owner: -
                --
                
                CREATE TYPE ranking."enum_Systems_calculationIntervalUnit" AS ENUM (
                    'months',
                    'weeks',
                    'days'
                );
                
                
                --
                -- TOC entry 755 (class 1247 OID 360398)
                -- Name: enum_Systems_inactivityUnit; Type: TYPE; Schema: ranking; Owner: -
                --
                
                CREATE TYPE ranking."enum_Systems_inactivityUnit" AS ENUM (
                    'months',
                    'weeks',
                    'days'
                );
                
                
                --
                -- TOC entry 758 (class 1247 OID 360406)
                -- Name: enum_Systems_periodUnit; Type: TYPE; Schema: ranking; Owner: -
                --
                
                CREATE TYPE ranking."enum_Systems_periodUnit" AS ENUM (
                    'months',
                    'weeks',
                    'days'
                );
                
                
                --
                -- TOC entry 761 (class 1247 OID 360414)
                -- Name: enum_Systems_rankingSystem; Type: TYPE; Schema: ranking; Owner: -
                --
                
                CREATE TYPE ranking."enum_Systems_rankingSystem" AS ENUM (
                    'BVL',
                    'ORIGINAL',
                    'LFBB',
                    'VISUAL'
                );
                
                
                --
                -- TOC entry 764 (class 1247 OID 360424)
                -- Name: enum_Systems_startingType; Type: TYPE; Schema: ranking; Owner: -
                --
                
                CREATE TYPE ranking."enum_Systems_startingType" AS ENUM (
                    'formula',
                    'tableLFBB',
                    'tableBVL'
                );
                
                
                --
                -- TOC entry 767 (class 1247 OID 360432)
                -- Name: enum_Systems_updateIntervalUnit; Type: TYPE; Schema: ranking; Owner: -
                --
                
                CREATE TYPE ranking."enum_Systems_updateIntervalUnit" AS ENUM (
                    'months',
                    'weeks',
                    'days'
                );
                
                
                --
                -- TOC entry 770 (class 1247 OID 360440)
                -- Name: enum_Claims_type; Type: TYPE; Schema: security; Owner: -
                --
                
                CREATE TYPE security."enum_Claims_type" AS ENUM (
                    'GLOBAL',
                    'CLUB',
                    'TEAM'
                );
                
                
                --
                -- TOC entry 773 (class 1247 OID 360448)
                -- Name: enum_Roles_type; Type: TYPE; Schema: security; Owner: -
                --
                
                CREATE TYPE security."enum_Roles_type" AS ENUM (
                    'GLOBAL',
                    'CLUB',
                    'TEAM'
                );
                
                
                SET default_table_access_method = heap;
                
                --
                -- TOC entry 206 (class 1259 OID 360455)
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
                -- TOC entry 207 (class 1259 OID 360461)
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
                -- TOC entry 208 (class 1259 OID 360467)
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
                -- TOC entry 209 (class 1259 OID 360473)
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
                -- TOC entry 210 (class 1259 OID 360479)
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
                -- TOC entry 211 (class 1259 OID 360485)
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
                -- TOC entry 212 (class 1259 OID 360491)
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
                -- TOC entry 213 (class 1259 OID 360497)
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
                -- TOC entry 214 (class 1259 OID 360503)
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
                -- TOC entry 215 (class 1259 OID 360513)
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
                -- TOC entry 216 (class 1259 OID 360522)
                -- Name: GamePlayers; Type: TABLE; Schema: event; Owner: -
                --
                
                CREATE TABLE event."GamePlayers" (
                    team integer,
                    player integer,
                    "playerId" character varying(255) NOT NULL,
                    "gameId" character varying(255) NOT NULL
                );
                
                
                --
                -- TOC entry 217 (class 1259 OID 360528)
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
                -- TOC entry 218 (class 1259 OID 360534)
                -- Name: LocationEventTournaments; Type: TABLE; Schema: event; Owner: -
                --
                
                CREATE TABLE event."LocationEventTournaments" (
                    "eventId" character varying(255) NOT NULL,
                    "locationId" character varying(255) NOT NULL
                );
                
                
                --
                -- TOC entry 219 (class 1259 OID 360540)
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
                -- TOC entry 220 (class 1259 OID 360546)
                -- Name: Standings; Type: TABLE; Schema: event; Owner: -
                --
                
                CREATE TABLE event."Standings" (
                    id character varying(255) NOT NULL,
                    "entryId" character varying(255),
                    "position" integer,
                    points integer,
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
                -- TOC entry 221 (class 1259 OID 360552)
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
                -- TOC entry 222 (class 1259 OID 360558)
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
                -- TOC entry 223 (class 1259 OID 360564)
                -- Name: TeamLocationCompetitions; Type: TABLE; Schema: event; Owner: -
                --
                
                CREATE TABLE event."TeamLocationCompetitions" (
                    "teamId" character varying(255),
                    "locationId" character varying(255)
                );
                
                
                --
                -- TOC entry 224 (class 1259 OID 360570)
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
                -- TOC entry 225 (class 1259 OID 360577)
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
                -- TOC entry 226 (class 1259 OID 360583)
                -- Name: ClubMemberships; Type: TABLE; Schema: public; Owner: -
                --
                
                CREATE TABLE public."ClubMemberships" (
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
                -- TOC entry 227 (class 1259 OID 360590)
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
                -- TOC entry 228 (class 1259 OID 360597)
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
                -- TOC entry 229 (class 1259 OID 360603)
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
                -- TOC entry 230 (class 1259 OID 360610)
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
                -- TOC entry 232 (class 1259 OID 360619)
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
                -- TOC entry 233 (class 1259 OID 360626)
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
                -- TOC entry 234 (class 1259 OID 360633)
                -- Name: socket_io_attachments; Type: TABLE; Schema: public; Owner: -
                --
                
                CREATE TABLE public.socket_io_attachments (
                    id bigint NOT NULL,
                    created_at timestamp with time zone DEFAULT now(),
                    payload bytea
                );
                
                
                --
                -- TOC entry 235 (class 1259 OID 360640)
                -- Name: socket_io_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
                --
                
                CREATE SEQUENCE public.socket_io_attachments_id_seq
                    START WITH 1
                    INCREMENT BY 1
                    NO MINVALUE
                    NO MAXVALUE
                    CACHE 1;
                
                
                --
                -- TOC entry 3534 (class 0 OID 0)
                -- Dependencies: 235
                -- Name: socket_io_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
                --
                
                ALTER SEQUENCE public.socket_io_attachments_id_seq OWNED BY public.socket_io_attachments.id;
                
                
                --
                -- TOC entry 236 (class 1259 OID 360642)
                -- Name: GroupSubEventCompetitions; Type: TABLE; Schema: ranking; Owner: -
                --
                
                CREATE TABLE ranking."GroupSubEventCompetitions" (
                    "subEventId" character varying(255) NOT NULL,
                    "groupId" character varying(255) NOT NULL
                );
                
                
                --
                -- TOC entry 237 (class 1259 OID 360648)
                -- Name: GroupSubEventTournaments; Type: TABLE; Schema: ranking; Owner: -
                --
                
                CREATE TABLE ranking."GroupSubEventTournaments" (
                    "subEventId" character varying(255) NOT NULL,
                    "groupId" character varying(255) NOT NULL
                );
                
                
                --
                -- TOC entry 238 (class 1259 OID 360654)
                -- Name: GroupSystems; Type: TABLE; Schema: ranking; Owner: -
                --
                
                CREATE TABLE ranking."GroupSystems" (
                    "groupId" character varying(255) NOT NULL,
                    "systemId" character varying(255) NOT NULL
                );
                
                
                --
                -- TOC entry 239 (class 1259 OID 360660)
                -- Name: Groups; Type: TABLE; Schema: ranking; Owner: -
                --
                
                CREATE TABLE ranking."Groups" (
                    id character varying(255) NOT NULL,
                    "createdAt" timestamp with time zone NOT NULL,
                    "updatedAt" timestamp with time zone NOT NULL,
                    name character varying(255)
                );
                
                
                --
                -- TOC entry 240 (class 1259 OID 360666)
                -- Name: LastPlaces; Type: TABLE; Schema: ranking; Owner: -
                --
                
                CREATE TABLE ranking."LastPlaces" (
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
                -- TOC entry 241 (class 1259 OID 360672)
                -- Name: Places; Type: TABLE; Schema: ranking; Owner: -
                --
                
                CREATE TABLE ranking."Places" (
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
                    "SystemId" character varying(255),
                    "createdAt" timestamp with time zone NOT NULL,
                    "updatedAt" timestamp with time zone NOT NULL,
                    "updatePossible" boolean,
                    gender character varying(255)
                );
                
                
                --
                -- TOC entry 242 (class 1259 OID 360681)
                -- Name: Points; Type: TABLE; Schema: ranking; Owner: -
                --
                
                CREATE TABLE ranking."Points" (
                    id character varying(255) NOT NULL,
                    points integer,
                    "rankingDate" timestamp with time zone,
                    "differenceInLevel" integer,
                    "playerId" character varying(255),
                    "GameId" character varying(255),
                    "SystemId" character varying(255),
                    "createdAt" timestamp with time zone NOT NULL,
                    "updatedAt" timestamp with time zone NOT NULL
                );
                
                
                --
                -- TOC entry 243 (class 1259 OID 360687)
                -- Name: Systems; Type: TABLE; Schema: ranking; Owner: -
                --
                
                CREATE TABLE ranking."Systems" (
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
                -- TOC entry 244 (class 1259 OID 360699)
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
                -- TOC entry 245 (class 1259 OID 360705)
                -- Name: PlayerClaimMemberships; Type: TABLE; Schema: security; Owner: -
                --
                
                CREATE TABLE security."PlayerClaimMemberships" (
                    "playerId" character varying(255) NOT NULL,
                    "claimId" character varying(255) NOT NULL,
                    "createdAt" timestamp with time zone NOT NULL,
                    "updatedAt" timestamp with time zone NOT NULL
                );
                
                
                --
                -- TOC entry 246 (class 1259 OID 360711)
                -- Name: PlayerRoleMemberships; Type: TABLE; Schema: security; Owner: -
                --
                
                CREATE TABLE security."PlayerRoleMemberships" (
                    "playerId" character varying(255) NOT NULL,
                    "roleId" character varying(255) NOT NULL,
                    "createdAt" timestamp with time zone NOT NULL,
                    "updatedAt" timestamp with time zone NOT NULL
                );
                
                
                --
                -- TOC entry 247 (class 1259 OID 360717)
                -- Name: RoleClaimMemberships; Type: TABLE; Schema: security; Owner: -
                --
                
                CREATE TABLE security."RoleClaimMemberships" (
                    "roleId" character varying(255) NOT NULL,
                    "claimId" character varying(255) NOT NULL,
                    "createdAt" timestamp with time zone NOT NULL,
                    "updatedAt" timestamp with time zone NOT NULL
                );
                
                
                --
                -- TOC entry 248 (class 1259 OID 360723)
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
                -- TOC entry 3180 (class 2604 OID 360729)
                -- Name: socket_io_attachments id; Type: DEFAULT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public.socket_io_attachments ALTER COLUMN id SET DEFAULT nextval('public.socket_io_attachments_id_seq'::regclass);
                
                
                --
                -- TOC entry 3191 (class 2606 OID 360767)
                -- Name: Availabilities Availabilities_pkey; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."Availabilities"
                    ADD CONSTRAINT "Availabilities_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3195 (class 2606 OID 360769)
                -- Name: Courts Courts_name_locationId_key; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."Courts"
                    ADD CONSTRAINT "Courts_name_locationId_key" UNIQUE (name, "locationId");
                
                
                --
                -- TOC entry 3197 (class 2606 OID 360771)
                -- Name: Courts Courts_pkey; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."Courts"
                    ADD CONSTRAINT "Courts_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3199 (class 2606 OID 360773)
                -- Name: DrawCompetitions DrawCompetitions_pkey; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."DrawCompetitions"
                    ADD CONSTRAINT "DrawCompetitions_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3201 (class 2606 OID 360775)
                -- Name: DrawCompetitions DrawCompetitions_unique_constraint; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."DrawCompetitions"
                    ADD CONSTRAINT "DrawCompetitions_unique_constraint" UNIQUE (name, "visualCode", "subeventId", type);
                
                
                --
                -- TOC entry 3203 (class 2606 OID 360777)
                -- Name: DrawTournaments DrawTournaments_pkey; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."DrawTournaments"
                    ADD CONSTRAINT "DrawTournaments_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3205 (class 2606 OID 360779)
                -- Name: DrawTournaments DrawTournaments_unique_constraint; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."DrawTournaments"
                    ADD CONSTRAINT "DrawTournaments_unique_constraint" UNIQUE (name, type, "visualCode", "subeventId");
                
                
                --
                -- TOC entry 3207 (class 2606 OID 360781)
                -- Name: EncounterChangeDates EncounterChangeDates_pkey; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."EncounterChangeDates"
                    ADD CONSTRAINT "EncounterChangeDates_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3209 (class 2606 OID 360783)
                -- Name: EncounterChanges EncounterChanges_pkey; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."EncounterChanges"
                    ADD CONSTRAINT "EncounterChanges_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3211 (class 2606 OID 360785)
                -- Name: EncounterCompetitions EncounterCompetitions_pkey; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."EncounterCompetitions"
                    ADD CONSTRAINT "EncounterCompetitions_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3213 (class 2606 OID 360787)
                -- Name: Entries Entries_pkey; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."Entries"
                    ADD CONSTRAINT "Entries_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3215 (class 2606 OID 360789)
                -- Name: EventCompetitions EventCompetitions_pkey; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."EventCompetitions"
                    ADD CONSTRAINT "EventCompetitions_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3217 (class 2606 OID 360791)
                -- Name: EventCompetitions EventCompetitions_slug_key; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."EventCompetitions"
                    ADD CONSTRAINT "EventCompetitions_slug_key" UNIQUE (slug);
                
                
                --
                -- TOC entry 3219 (class 2606 OID 360793)
                -- Name: EventCompetitions EventCompetitions_unique_constraint; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."EventCompetitions"
                    ADD CONSTRAINT "EventCompetitions_unique_constraint" UNIQUE (name, "startYear", type, "visualCode");
                
                
                --
                -- TOC entry 3221 (class 2606 OID 360795)
                -- Name: EventTournaments EventTournaments_pkey; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."EventTournaments"
                    ADD CONSTRAINT "EventTournaments_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3223 (class 2606 OID 360797)
                -- Name: EventTournaments EventTournaments_slug_key; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."EventTournaments"
                    ADD CONSTRAINT "EventTournaments_slug_key" UNIQUE (slug);
                
                
                --
                -- TOC entry 3225 (class 2606 OID 360799)
                -- Name: EventTournaments EventTournaments_unique_constraint; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."EventTournaments"
                    ADD CONSTRAINT "EventTournaments_unique_constraint" UNIQUE (name, "firstDay", "visualCode");
                
                
                --
                -- TOC entry 3227 (class 2606 OID 360801)
                -- Name: GamePlayers GamePlayers_pkey; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."GamePlayers"
                    ADD CONSTRAINT "GamePlayers_pkey" PRIMARY KEY ("playerId", "gameId");
                
                
                --
                -- TOC entry 3231 (class 2606 OID 360812)
                -- Name: Games Games_pkey; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."Games"
                    ADD CONSTRAINT "Games_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3234 (class 2606 OID 360816)
                -- Name: LocationEventTournaments LocationEventTournaments_pkey; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."LocationEventTournaments"
                    ADD CONSTRAINT "LocationEventTournaments_pkey" PRIMARY KEY ("eventId", "locationId");
                
                
                --
                -- TOC entry 3236 (class 2606 OID 360818)
                -- Name: Locations Locations_pkey; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."Locations"
                    ADD CONSTRAINT "Locations_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3239 (class 2606 OID 360827)
                -- Name: Standings Standings_pkey; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."Standings"
                    ADD CONSTRAINT "Standings_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3241 (class 2606 OID 360844)
                -- Name: SubEventCompetitions SubEventCompetitions_pkey; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."SubEventCompetitions"
                    ADD CONSTRAINT "SubEventCompetitions_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3243 (class 2606 OID 360846)
                -- Name: SubEventCompetitions SubEventCompetitions_unique_constraint; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."SubEventCompetitions"
                    ADD CONSTRAINT "SubEventCompetitions_unique_constraint" UNIQUE (name, "eventType", "visualCode", "eventId");
                
                
                --
                -- TOC entry 3245 (class 2606 OID 360848)
                -- Name: SubEventTournaments SubEventTournaments_pkey; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."SubEventTournaments"
                    ADD CONSTRAINT "SubEventTournaments_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3247 (class 2606 OID 360850)
                -- Name: SubEventTournaments SubEventTournaments_unique_constraint; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."SubEventTournaments"
                    ADD CONSTRAINT "SubEventTournaments_unique_constraint" UNIQUE (name, "eventType", "gameType", "visualCode", "eventId");
                
                
                --
                -- TOC entry 3193 (class 2606 OID 360852)
                -- Name: Availabilities availability_unique_constraint; Type: CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."Availabilities"
                    ADD CONSTRAINT availability_unique_constraint UNIQUE (year, "locationId");
                
                
                --
                -- TOC entry 3249 (class 2606 OID 360859)
                -- Name: Files Files_name_type_firstDay_key; Type: CONSTRAINT; Schema: import; Owner: -
                --
                
                ALTER TABLE ONLY import."Files"
                    ADD CONSTRAINT "Files_name_type_firstDay_key" UNIQUE (name, type, "firstDay");
                
                
                --
                -- TOC entry 3251 (class 2606 OID 360861)
                -- Name: Files Files_pkey; Type: CONSTRAINT; Schema: import; Owner: -
                --
                
                ALTER TABLE ONLY import."Files"
                    ADD CONSTRAINT "Files_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3253 (class 2606 OID 360863)
                -- Name: Crons Crons_pkey; Type: CONSTRAINT; Schema: job; Owner: -
                --
                
                ALTER TABLE ONLY job."Crons"
                    ADD CONSTRAINT "Crons_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3255 (class 2606 OID 360865)
                -- Name: ClubMemberships ClubMemberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."ClubMemberships"
                    ADD CONSTRAINT "ClubMemberships_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3257 (class 2606 OID 360867)
                -- Name: ClubMemberships ClubMemberships_playerId_clubId_start_key; Type: CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."ClubMemberships"
                    ADD CONSTRAINT "ClubMemberships_playerId_clubId_start_key" UNIQUE ("playerId", "clubId", start);
                
                
                --
                -- TOC entry 3260 (class 2606 OID 360869)
                -- Name: Clubs Clubs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."Clubs"
                    ADD CONSTRAINT "Clubs_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3262 (class 2606 OID 360871)
                -- Name: Clubs Clubs_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."Clubs"
                    ADD CONSTRAINT "Clubs_slug_key" UNIQUE (slug);
                
                
                --
                -- TOC entry 3267 (class 2606 OID 360873)
                -- Name: Comments Comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."Comments"
                    ADD CONSTRAINT "Comments_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3270 (class 2606 OID 360885)
                -- Name: Players Players_firstName_lastName_memberId_key; Type: CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."Players"
                    ADD CONSTRAINT "Players_firstName_lastName_memberId_key" UNIQUE ("firstName", "lastName", "memberId");
                
                
                --
                -- TOC entry 3272 (class 2606 OID 360888)
                -- Name: Players Players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."Players"
                    ADD CONSTRAINT "Players_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3274 (class 2606 OID 360890)
                -- Name: Players Players_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."Players"
                    ADD CONSTRAINT "Players_slug_key" UNIQUE (slug);
                
                
                --
                -- TOC entry 3281 (class 2606 OID 360892)
                -- Name: RequestLinks RequestLinks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."RequestLinks"
                    ADD CONSTRAINT "RequestLinks_pkey" PRIMARY KEY (id);
                
                
                
                --
                -- TOC entry 3286 (class 2606 OID 360896)
                -- Name: TeamPlayerMemberships TeamPlayerMemberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."TeamPlayerMemberships"
                    ADD CONSTRAINT "TeamPlayerMemberships_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3288 (class 2606 OID 360898)
                -- Name: TeamPlayerMemberships TeamPlayerMemberships_playerId_teamId_start_key; Type: CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."TeamPlayerMemberships"
                    ADD CONSTRAINT "TeamPlayerMemberships_playerId_teamId_start_key" UNIQUE ("playerId", "teamId", start);
                
                
                --
                -- TOC entry 3291 (class 2606 OID 360900)
                -- Name: Teams Teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."Teams"
                    ADD CONSTRAINT "Teams_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3293 (class 2606 OID 360902)
                -- Name: Teams Teams_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."Teams"
                    ADD CONSTRAINT "Teams_slug_key" UNIQUE (slug);
                
                
                --
                -- TOC entry 3264 (class 2606 OID 360904)
                -- Name: Clubs club_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."Clubs"
                    ADD CONSTRAINT club_number_unique UNIQUE (name, "clubId");
                
                
                --
                -- TOC entry 3298 (class 2606 OID 360906)
                -- Name: socket_io_attachments socket_io_attachments_id_key; Type: CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public.socket_io_attachments
                    ADD CONSTRAINT socket_io_attachments_id_key UNIQUE (id);
                
                
                --
                -- TOC entry 3296 (class 2606 OID 360908)
                -- Name: Teams teams_unique_constraint; Type: CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."Teams"
                    ADD CONSTRAINT teams_unique_constraint UNIQUE (name, "clubId", "teamNumber");
                
                
                --
                -- TOC entry 3300 (class 2606 OID 360910)
                -- Name: GroupSubEventCompetitions GroupSubEventCompetitions_pkey; Type: CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."GroupSubEventCompetitions"
                    ADD CONSTRAINT "GroupSubEventCompetitions_pkey" PRIMARY KEY ("subEventId", "groupId");
                
                
                --
                -- TOC entry 3302 (class 2606 OID 360912)
                -- Name: GroupSubEventTournaments GroupSubEventTournaments_pkey; Type: CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."GroupSubEventTournaments"
                    ADD CONSTRAINT "GroupSubEventTournaments_pkey" PRIMARY KEY ("subEventId", "groupId");
                
                
                --
                -- TOC entry 3304 (class 2606 OID 360914)
                -- Name: GroupSystems GroupSystems_pkey; Type: CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."GroupSystems"
                    ADD CONSTRAINT "GroupSystems_pkey" PRIMARY KEY ("systemId", "groupId");
                
                
                --
                -- TOC entry 3306 (class 2606 OID 360916)
                -- Name: Groups Groups_name_key; Type: CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."Groups"
                    ADD CONSTRAINT "Groups_name_key" UNIQUE (name);
                
                
                --
                -- TOC entry 3308 (class 2606 OID 360918)
                -- Name: Groups Groups_pkey; Type: CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."Groups"
                    ADD CONSTRAINT "Groups_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3310 (class 2606 OID 360920)
                -- Name: LastPlaces LastPlaces_pkey; Type: CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."LastPlaces"
                    ADD CONSTRAINT "LastPlaces_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3315 (class 2606 OID 360922)
                -- Name: Places Places_pkey; Type: CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."Places"
                    ADD CONSTRAINT "Places_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3317 (class 2606 OID 360939)
                -- Name: Places Places_rankingDate_PlayerId_SystemId_key; Type: CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."Places"
                    ADD CONSTRAINT "Places_rankingDate_PlayerId_SystemId_key" UNIQUE ("rankingDate", "playerId", "SystemId");
                
                
                --
                -- TOC entry 3322 (class 2606 OID 360941)
                -- Name: Points Points_pkey; Type: CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."Points"
                    ADD CONSTRAINT "Points_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3328 (class 2606 OID 360953)
                -- Name: Systems Systems_name_key; Type: CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."Systems"
                    ADD CONSTRAINT "Systems_name_key" UNIQUE (name);
                
                
                --
                -- TOC entry 3330 (class 2606 OID 360955)
                -- Name: Systems Systems_pkey; Type: CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."Systems"
                    ADD CONSTRAINT "Systems_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3313 (class 2606 OID 360957)
                -- Name: LastPlaces lastPlaces_unique_constraint; Type: CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."LastPlaces"
                    ADD CONSTRAINT "lastPlaces_unique_constraint" UNIQUE ("playerId", "systemId");
                
                
                --
                -- TOC entry 3332 (class 2606 OID 360959)
                -- Name: Claims Claims_name_category_key; Type: CONSTRAINT; Schema: security; Owner: -
                --
                
                ALTER TABLE ONLY security."Claims"
                    ADD CONSTRAINT "Claims_name_category_key" UNIQUE (name, category);
                
                
                --
                -- TOC entry 3334 (class 2606 OID 360961)
                -- Name: Claims Claims_pkey; Type: CONSTRAINT; Schema: security; Owner: -
                --
                
                ALTER TABLE ONLY security."Claims"
                    ADD CONSTRAINT "Claims_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3338 (class 2606 OID 360963)
                -- Name: PlayerClaimMemberships PlayerClaimMemberships_pkey; Type: CONSTRAINT; Schema: security; Owner: -
                --
                
                ALTER TABLE ONLY security."PlayerClaimMemberships"
                    ADD CONSTRAINT "PlayerClaimMemberships_pkey" PRIMARY KEY ("playerId", "claimId");
                
                
                --
                -- TOC entry 3340 (class 2606 OID 360965)
                -- Name: PlayerRoleMemberships PlayerRoleMemberships_pkey; Type: CONSTRAINT; Schema: security; Owner: -
                --
                
                ALTER TABLE ONLY security."PlayerRoleMemberships"
                    ADD CONSTRAINT "PlayerRoleMemberships_pkey" PRIMARY KEY ("playerId", "roleId");
                
                
                --
                -- TOC entry 3342 (class 2606 OID 360967)
                -- Name: RoleClaimMemberships RoleClaimMemberships_pkey; Type: CONSTRAINT; Schema: security; Owner: -
                --
                
                ALTER TABLE ONLY security."RoleClaimMemberships"
                    ADD CONSTRAINT "RoleClaimMemberships_pkey" PRIMARY KEY ("roleId", "claimId");
                
                
                --
                -- TOC entry 3344 (class 2606 OID 360969)
                -- Name: Roles Roles_pkey; Type: CONSTRAINT; Schema: security; Owner: -
                --
                
                ALTER TABLE ONLY security."Roles"
                    ADD CONSTRAINT "Roles_pkey" PRIMARY KEY (id);
                
                
                --
                -- TOC entry 3232 (class 1259 OID 360970)
                -- Name: game_parent_index; Type: INDEX; Schema: event; Owner: -
                --
                
                CREATE INDEX game_parent_index ON event."Games" USING btree ("linkId", "linkType");
                
                
                --
                -- TOC entry 3228 (class 1259 OID 360971)
                -- Name: game_players_game_id; Type: INDEX; Schema: event; Owner: -
                --
                
                CREATE INDEX game_players_game_id ON event."GamePlayers" USING btree ("gameId");
                
                
                --
                -- TOC entry 3229 (class 1259 OID 360972)
                -- Name: game_players_player_id; Type: INDEX; Schema: event; Owner: -
                --
                
                CREATE INDEX game_players_player_id ON event."GamePlayers" USING btree ("playerId");
                
                
                --
                -- TOC entry 3237 (class 1259 OID 360973)
                -- Name: locations_club_id; Type: INDEX; Schema: event; Owner: -
                --
                
                CREATE INDEX locations_club_id ON event."Locations" USING btree ("clubId");
                
                
                --
                -- TOC entry 3265 (class 1259 OID 360974)
                -- Name: clubs_name; Type: INDEX; Schema: public; Owner: -
                --
                
                CREATE INDEX clubs_name ON public."Clubs" USING btree (name);
                
                
                --
                -- TOC entry 3268 (class 1259 OID 360975)
                -- Name: comment_index; Type: INDEX; Schema: public; Owner: -
                --
                
                CREATE INDEX comment_index ON public."Comments" USING btree ("linkId", "linkType", "clubId");
                
                
                --
                -- TOC entry 3258 (class 1259 OID 360976)
                -- Name: player_club_index; Type: INDEX; Schema: public; Owner: -
                --
                
                CREATE INDEX player_club_index ON public."ClubMemberships" USING btree ("playerId", "clubId");
                
                
                --
                -- TOC entry 3289 (class 1259 OID 360977)
                -- Name: player_team_index; Type: INDEX; Schema: public; Owner: -
                --
                
                CREATE INDEX player_team_index ON public."TeamPlayerMemberships" USING btree ("playerId", "teamId");
                
                
                --
                -- TOC entry 3275 (class 1259 OID 360978)
                -- Name: players_first_name; Type: INDEX; Schema: public; Owner: -
                --
                
                CREATE INDEX players_first_name ON public."Players" USING btree ("firstName");
                
                
                --
                -- TOC entry 3276 (class 1259 OID 360979)
                -- Name: players_id; Type: INDEX; Schema: public; Owner: -
                --
                
                CREATE UNIQUE INDEX players_id ON public."Players" USING btree (id);
                
                
                --
                -- TOC entry 3277 (class 1259 OID 360980)
                -- Name: players_last_name; Type: INDEX; Schema: public; Owner: -
                --
                
                CREATE INDEX players_last_name ON public."Players" USING btree ("lastName");
                
                
                --
                -- TOC entry 3278 (class 1259 OID 360981)
                -- Name: players_member_id; Type: INDEX; Schema: public; Owner: -
                --
                
                CREATE INDEX players_member_id ON public."Players" USING btree ("memberId");
                
                
                --
                -- TOC entry 3279 (class 1259 OID 360982)
                -- Name: players_slug; Type: INDEX; Schema: public; Owner: -
                --
                
                CREATE UNIQUE INDEX players_slug ON public."Players" USING btree (slug);
                
                
                --
                -- TOC entry 3282 (class 1259 OID 360983)
                -- Name: request_links__player_id; Type: INDEX; Schema: public; Owner: -
                --
                
                CREATE INDEX request_links__player_id ON public."RequestLinks" USING btree ("playerId");
                
                
                --
                -- TOC entry 3294 (class 1259 OID 360984)
                -- Name: teams_club_index; Type: INDEX; Schema: public; Owner: -
                --
                
                CREATE INDEX teams_club_index ON public."Teams" USING btree ("clubId");
                
                
                --
                -- TOC entry 3311 (class 1259 OID 360985)
                -- Name: lastPlaces_ranking_index; Type: INDEX; Schema: ranking; Owner: -
                --
                
                CREATE UNIQUE INDEX "lastPlaces_ranking_index" ON ranking."LastPlaces" USING btree ("playerId", "systemId");
                
                
                --
                -- TOC entry 3318 (class 1259 OID 360986)
                -- Name: places_date_index; Type: INDEX; Schema: ranking; Owner: -
                --
                
                CREATE INDEX places_date_index ON ranking."Places" USING brin ("rankingDate");
                
                
                --
                -- TOC entry 3319 (class 1259 OID 360987)
                -- Name: places_system_index; Type: INDEX; Schema: ranking; Owner: -
                --
                
                CREATE UNIQUE INDEX places_system_index ON ranking."Places" USING btree ("playerId", "SystemId", "rankingDate");
                
                
                --
                -- TOC entry 3323 (class 1259 OID 360988)
                -- Name: point_game_system_index; Type: INDEX; Schema: ranking; Owner: -
                --
                
                CREATE INDEX point_game_system_index ON ranking."Points" USING btree ("GameId", "SystemId");
                
                
                --
                -- TOC entry 3324 (class 1259 OID 360989)
                -- Name: point_player_system_index; Type: INDEX; Schema: ranking; Owner: -
                --
                
                CREATE UNIQUE INDEX point_player_system_index ON ranking."Points" USING btree ("playerId", "GameId", "SystemId");
                
                
                --
                -- TOC entry 3325 (class 1259 OID 360990)
                -- Name: point_system_index; Type: INDEX; Schema: ranking; Owner: -
                --
                
                CREATE INDEX point_system_index ON ranking."Points" USING btree ("SystemId", "playerId");
                
                
                --
                -- TOC entry 3326 (class 1259 OID 360991)
                -- Name: points_date_index; Type: INDEX; Schema: ranking; Owner: -
                --
                
                CREATE INDEX points_date_index ON ranking."Points" USING brin ("rankingDate");
                
                
                --
                -- TOC entry 3320 (class 1259 OID 360992)
                -- Name: ranking_index; Type: INDEX; Schema: ranking; Owner: -
                --
                
                CREATE INDEX ranking_index ON ranking."Places" USING btree ("playerId", "SystemId");
                
                
                --
                -- TOC entry 3335 (class 1259 OID 360993)
                -- Name: claims_description; Type: INDEX; Schema: security; Owner: -
                --
                
                CREATE INDEX claims_description ON security."Claims" USING btree (description);
                
                
                --
                -- TOC entry 3336 (class 1259 OID 360994)
                -- Name: claims_name; Type: INDEX; Schema: security; Owner: -
                --
                
                CREATE INDEX claims_name ON security."Claims" USING btree (name);
                
                
                --
                -- TOC entry 3345 (class 1259 OID 360995)
                -- Name: roles_description; Type: INDEX; Schema: security; Owner: -
                --
                
                CREATE INDEX roles_description ON security."Roles" USING btree (description);
                
                
                --
                -- TOC entry 3346 (class 1259 OID 360996)
                -- Name: roles_name; Type: INDEX; Schema: security; Owner: -
                --
                
                CREATE INDEX roles_name ON security."Roles" USING btree (name);
                
                
                --
                -- TOC entry 3347 (class 2606 OID 360997)
                -- Name: Availabilities Availabilities_locationId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."Availabilities"
                    ADD CONSTRAINT "Availabilities_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES event."Locations"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3348 (class 2606 OID 361002)
                -- Name: Courts Courts_locationId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."Courts"
                    ADD CONSTRAINT "Courts_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES event."Locations"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3349 (class 2606 OID 361007)
                -- Name: DrawCompetitions DrawCompetitions_subeventId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."DrawCompetitions"
                    ADD CONSTRAINT "DrawCompetitions_subeventId_fkey" FOREIGN KEY ("subeventId") REFERENCES event."SubEventCompetitions"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3350 (class 2606 OID 361012)
                -- Name: DrawTournaments DrawTournaments_subeventId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."DrawTournaments"
                    ADD CONSTRAINT "DrawTournaments_subeventId_fkey" FOREIGN KEY ("subeventId") REFERENCES event."SubEventTournaments"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3351 (class 2606 OID 361017)
                -- Name: EncounterChangeDates EncounterChangeDates_encounterChangeId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."EncounterChangeDates"
                    ADD CONSTRAINT "EncounterChangeDates_encounterChangeId_fkey" FOREIGN KEY ("encounterChangeId") REFERENCES event."EncounterChanges"(id) ON UPDATE CASCADE ON DELETE SET NULL;
                
                
                --
                -- TOC entry 3352 (class 2606 OID 361022)
                -- Name: EncounterChanges EncounterChanges_encounterId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."EncounterChanges"
                    ADD CONSTRAINT "EncounterChanges_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES event."EncounterCompetitions"(id) ON UPDATE CASCADE ON DELETE SET NULL;
                
                
                --
                -- TOC entry 3353 (class 2606 OID 361027)
                -- Name: EncounterCompetitions EncounterCompetitions_awayTeamId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."EncounterCompetitions"
                    ADD CONSTRAINT "EncounterCompetitions_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES public."Teams"(id) ON UPDATE CASCADE;
                
                
                --
                -- TOC entry 3354 (class 2606 OID 361032)
                -- Name: EncounterCompetitions EncounterCompetitions_drawId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."EncounterCompetitions"
                    ADD CONSTRAINT "EncounterCompetitions_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES event."DrawCompetitions"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3355 (class 2606 OID 361037)
                -- Name: EncounterCompetitions EncounterCompetitions_homeTeamId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."EncounterCompetitions"
                    ADD CONSTRAINT "EncounterCompetitions_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES public."Teams"(id) ON UPDATE CASCADE;
                
                
                --
                -- TOC entry 3356 (class 2606 OID 361042)
                -- Name: Entries Entries_player1Id_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."Entries"
                    ADD CONSTRAINT "Entries_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE SET NULL;
                
                
                --
                -- TOC entry 3357 (class 2606 OID 361047)
                -- Name: Entries Entries_player2Id_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."Entries"
                    ADD CONSTRAINT "Entries_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE SET NULL;
                
                
                --
                -- TOC entry 3358 (class 2606 OID 361052)
                -- Name: Entries Entries_teamId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."Entries"
                    ADD CONSTRAINT "Entries_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public."Teams"(id) ON UPDATE CASCADE ON DELETE SET NULL;
                
                
                --
                -- TOC entry 3359 (class 2606 OID 361057)
                -- Name: GamePlayers GamePlayers_gameId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."GamePlayers"
                    ADD CONSTRAINT "GamePlayers_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES event."Games"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3360 (class 2606 OID 361062)
                -- Name: GamePlayers GamePlayers_playerId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."GamePlayers"
                    ADD CONSTRAINT "GamePlayers_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3361 (class 2606 OID 361067)
                -- Name: Games Games_courtId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."Games"
                    ADD CONSTRAINT "Games_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES event."Courts"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3362 (class 2606 OID 361072)
                -- Name: LocationEventTournaments LocationEventTournaments_eventId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."LocationEventTournaments"
                    ADD CONSTRAINT "LocationEventTournaments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES event."EventTournaments"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3363 (class 2606 OID 361077)
                -- Name: LocationEventTournaments LocationEventTournaments_locationId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."LocationEventTournaments"
                    ADD CONSTRAINT "LocationEventTournaments_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES event."Locations"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3364 (class 2606 OID 361082)
                -- Name: Locations Locations_clubId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."Locations"
                    ADD CONSTRAINT "Locations_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public."Clubs"(id) ON UPDATE CASCADE;
                
                
                --
                -- TOC entry 3365 (class 2606 OID 361087)
                -- Name: Standings Standings_entryId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."Standings"
                    ADD CONSTRAINT "Standings_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES event."Entries"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3366 (class 2606 OID 361092)
                -- Name: SubEventCompetitions SubEventCompetitions_eventId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."SubEventCompetitions"
                    ADD CONSTRAINT "SubEventCompetitions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES event."EventCompetitions"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3367 (class 2606 OID 361097)
                -- Name: SubEventTournaments SubEventTournaments_eventId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."SubEventTournaments"
                    ADD CONSTRAINT "SubEventTournaments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES event."EventTournaments"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3368 (class 2606 OID 361102)
                -- Name: TeamLocationCompetitions TeamLocationCompetitions_locationId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."TeamLocationCompetitions"
                    ADD CONSTRAINT "TeamLocationCompetitions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES event."Locations"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3369 (class 2606 OID 361107)
                -- Name: TeamLocationCompetitions TeamLocationCompetitions_teamId_fkey; Type: FK CONSTRAINT; Schema: event; Owner: -
                --
                
                ALTER TABLE ONLY event."TeamLocationCompetitions"
                    ADD CONSTRAINT "TeamLocationCompetitions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public."Teams"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3370 (class 2606 OID 361112)
                -- Name: ClubMemberships ClubMemberships_clubId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."ClubMemberships"
                    ADD CONSTRAINT "ClubMemberships_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public."Clubs"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3371 (class 2606 OID 361117)
                -- Name: ClubMemberships ClubMemberships_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."ClubMemberships"
                    ADD CONSTRAINT "ClubMemberships_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3372 (class 2606 OID 361122)
                -- Name: Comments Comments_clubId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."Comments"
                    ADD CONSTRAINT "Comments_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public."Clubs"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3373 (class 2606 OID 361127)
                -- Name: Comments Comments_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."Comments"
                    ADD CONSTRAINT "Comments_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3374 (class 2606 OID 361132)
                -- Name: RequestLinks RequestLinks_PlayerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."RequestLinks"
                    ADD CONSTRAINT "RequestLinks_PlayerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE SET NULL;
                
                
                --
                -- TOC entry 3375 (class 2606 OID 361137)
                -- Name: TeamPlayerMemberships TeamPlayerMemberships_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."TeamPlayerMemberships"
                    ADD CONSTRAINT "TeamPlayerMemberships_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3376 (class 2606 OID 361142)
                -- Name: TeamPlayerMemberships TeamPlayerMemberships_teamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."TeamPlayerMemberships"
                    ADD CONSTRAINT "TeamPlayerMemberships_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public."Teams"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3377 (class 2606 OID 361147)
                -- Name: Teams Teams_captainId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."Teams"
                    ADD CONSTRAINT "Teams_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE SET NULL;
                
                
                --
                -- TOC entry 3378 (class 2606 OID 361152)
                -- Name: Teams Teams_clubId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
                --
                
                ALTER TABLE ONLY public."Teams"
                    ADD CONSTRAINT "Teams_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public."Clubs"(id) ON UPDATE CASCADE ON DELETE SET NULL;
                
                
                --
                -- TOC entry 3379 (class 2606 OID 361157)
                -- Name: GroupSubEventCompetitions GroupSubEventCompetitions_groupId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."GroupSubEventCompetitions"
                    ADD CONSTRAINT "GroupSubEventCompetitions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES ranking."Groups"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3380 (class 2606 OID 361162)
                -- Name: GroupSubEventCompetitions GroupSubEventCompetitions_subEventId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."GroupSubEventCompetitions"
                    ADD CONSTRAINT "GroupSubEventCompetitions_subEventId_fkey" FOREIGN KEY ("subEventId") REFERENCES event."SubEventCompetitions"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3381 (class 2606 OID 361167)
                -- Name: GroupSubEventTournaments GroupSubEventTournaments_groupId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."GroupSubEventTournaments"
                    ADD CONSTRAINT "GroupSubEventTournaments_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES ranking."Groups"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3382 (class 2606 OID 361172)
                -- Name: GroupSubEventTournaments GroupSubEventTournaments_subEventId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."GroupSubEventTournaments"
                    ADD CONSTRAINT "GroupSubEventTournaments_subEventId_fkey" FOREIGN KEY ("subEventId") REFERENCES event."SubEventTournaments"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3383 (class 2606 OID 361177)
                -- Name: GroupSystems GroupSystems_groupId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."GroupSystems"
                    ADD CONSTRAINT "GroupSystems_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES ranking."Groups"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3384 (class 2606 OID 361182)
                -- Name: GroupSystems GroupSystems_systemId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."GroupSystems"
                    ADD CONSTRAINT "GroupSystems_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES ranking."Systems"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3385 (class 2606 OID 361187)
                -- Name: LastPlaces LastPlaces_playerId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."LastPlaces"
                    ADD CONSTRAINT "LastPlaces_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3386 (class 2606 OID 361192)
                -- Name: LastPlaces LastPlaces_systemId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."LastPlaces"
                    ADD CONSTRAINT "LastPlaces_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES ranking."Systems"(id) ON UPDATE CASCADE ON DELETE SET NULL;
                
                
                --
                -- TOC entry 3387 (class 2606 OID 361197)
                -- Name: Places Places_PlayerId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."Places"
                    ADD CONSTRAINT "Places_PlayerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3388 (class 2606 OID 361202)
                -- Name: Places Places_SystemId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."Places"
                    ADD CONSTRAINT "Places_SystemId_fkey" FOREIGN KEY ("SystemId") REFERENCES ranking."Systems"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3389 (class 2606 OID 361207)
                -- Name: Points Points_GameId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."Points"
                    ADD CONSTRAINT "Points_GameId_fkey" FOREIGN KEY ("GameId") REFERENCES event."Games"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3390 (class 2606 OID 361212)
                -- Name: Points Points_PlayerId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."Points"
                    ADD CONSTRAINT "Points_PlayerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3391 (class 2606 OID 361217)
                -- Name: Points Points_SystemId_fkey; Type: FK CONSTRAINT; Schema: ranking; Owner: -
                --
                
                ALTER TABLE ONLY ranking."Points"
                    ADD CONSTRAINT "Points_SystemId_fkey" FOREIGN KEY ("SystemId") REFERENCES ranking."Systems"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3392 (class 2606 OID 361222)
                -- Name: PlayerClaimMemberships PlayerClaimMemberships_claimId_fkey; Type: FK CONSTRAINT; Schema: security; Owner: -
                --
                
                ALTER TABLE ONLY security."PlayerClaimMemberships"
                    ADD CONSTRAINT "PlayerClaimMemberships_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES security."Claims"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3393 (class 2606 OID 361227)
                -- Name: PlayerClaimMemberships PlayerClaimMemberships_userId_fkey; Type: FK CONSTRAINT; Schema: security; Owner: -
                --
                
                ALTER TABLE ONLY security."PlayerClaimMemberships"
                    ADD CONSTRAINT "PlayerClaimMemberships_userId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3394 (class 2606 OID 361232)
                -- Name: PlayerRoleMemberships PlayerRoleMemberships_roleId_fkey; Type: FK CONSTRAINT; Schema: security; Owner: -
                --
                
                ALTER TABLE ONLY security."PlayerRoleMemberships"
                    ADD CONSTRAINT "PlayerRoleMemberships_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES security."Roles"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3395 (class 2606 OID 361237)
                -- Name: PlayerRoleMemberships PlayerRoleMemberships_userId_fkey; Type: FK CONSTRAINT; Schema: security; Owner: -
                --
                
                ALTER TABLE ONLY security."PlayerRoleMemberships"
                    ADD CONSTRAINT "PlayerRoleMemberships_userId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3396 (class 2606 OID 361242)
                -- Name: RoleClaimMemberships RoleClaimMemberships_claimId_fkey; Type: FK CONSTRAINT; Schema: security; Owner: -
                --
                
                ALTER TABLE ONLY security."RoleClaimMemberships"
                    ADD CONSTRAINT "RoleClaimMemberships_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES security."Claims"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3397 (class 2606 OID 361247)
                -- Name: RoleClaimMemberships RoleClaimMemberships_roleId_fkey; Type: FK CONSTRAINT; Schema: security; Owner: -
                --
                
                ALTER TABLE ONLY security."RoleClaimMemberships"
                    ADD CONSTRAINT "RoleClaimMemberships_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES security."Roles"(id) ON UPDATE CASCADE ON DELETE CASCADE;
                
                
                --
                -- TOC entry 3398 (class 2606 OID 361252)
                -- Name: Roles Roles_clubId_fkey; Type: FK CONSTRAINT; Schema: security; Owner: -
                --
                
                ALTER TABLE ONLY security."Roles"
                    ADD CONSTRAINT "Roles_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public."Clubs"(id) ON UPDATE CASCADE;
                
                
                -- Completed on 2022-06-04 19:11:57
                
                --
                -- PostgreSQL database dump complete
                --
                
                
                  `,
          { transaction: t },
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
        console.warn('Just delete the DB');
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
