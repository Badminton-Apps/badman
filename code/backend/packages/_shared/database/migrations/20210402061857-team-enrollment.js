'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const adminClaims = [
      [
        '8c38a508-7f33-407f-ab44-56e029c829d4',
        'add:competition',
        'Add an competition',
        'competitions'
      ],
      [
        'a12e9ce5-a3a3-4175-9e08-c18a3a78bf00',
        'edit:competition',
        'Edit an competition',
        'competitions'
      ],
      [
        '60bbef73-6178-4a55-9705-519f9498e33d',
        'delete:competition',
        'Delete an competition',
        'competitions'
      ],
      [
        '99c4f768-d4aa-4c26-a317-4caf89088c40',
        'import:competition',
        'Import an competition',
        'competitions'
      ],
      [
        '2d3cd882-228f-4894-810a-919af34832e0',
        'add-any:tournament',
        'Add any tournament',
        'tournaments'
      ],
      [
        '7a5ca972-ab4d-4b3e-b933-8b484bf991c0',
        'edit-any:tournament',
        'Edit any tournament',
        'tournaments'
      ],
      [
        'f3f2407e-c266-443c-9c10-e48e68925951',
        'delete-any:tournament',
        'Delete any tournament',
        'tournaments'
      ],
      [
        'b68d1014-c6d7-4fbe-8d57-356a5286b922',
        'view:ranking',
        'View ranking system',
        'ranking'
      ],
      [
        '4cf1254b-1414-48c7-ba16-3625794e8de2',
        'add:ranking',
        'Add ranking system',
        'ranking'
      ],
      [
        '329fa806-3dae-4919-8e37-58116cbfe302',
        'edit:ranking',
        'Edit ranking system',
        'ranking'
      ],
      [
        'b5466909-fd64-4b2d-bcf7-edc89f814782',
        'delete:ranking',
        'Delete ranking system',
        'ranking'
      ],
      [
        'c702c0dc-e477-46ed-8fcd-779d0a6d75a6',
        'calculate:ranking',
        'Simulate ranking',
        'ranking'
      ],
      [
        'ab6b364c-bdc2-43b4-a73e-7624d1e732d2',
        'make-primary:ranking',
        'Make ranking system primary',
        'ranking'
      ],
      [
        '79df8b06-e2db-4664-ba39-e90c7e1a457e',
        'edit:claims',
        'Edit global claims',
        'security'
      ],
      [
        '7c6f5d2b-b47e-4611-8fe8-409c0080fd48',
        'link:player',
        'Can link players to login',
        'player'
      ],
      [
        'f3c6e715-86ba-484a-b2ee-40bdc9938ac4',
        'add:club',
        'Create new club',
        'clubs'
      ],
      [
        '35c1c77a-0a1a-4e4b-8d13-54b69650db8a',
        'edit-any:club',
        'Edit any club',
        'clubs'
      ]
    ];

    const clubClaims = [
      [
        '7a5e530e-0e6c-4af1-a255-b8b229e8bc95',
        'edit:club',
        'Change anything of a club (removing this can potentially remove all access to edit screen)',
        'club'
      ],
      [
        '98f38b69-c7b7-4bbe-912d-c8b987b1272c',
        'add:player',
        'Add players to club',
        'club'
      ],
      [
        '27ca4c44-f0e8-4d2d-b67b-ff240fa82dab',
        'remove:player',
        'Remove players to club',
        'club'
      ],
      [
        '19c3bd15-83da-49a5-a887-c53ef9833360',
        'add:location',
        'Add location to club',
        'club'
      ],
      [
        'a0963d53-5bac-4f24-837b-af5b779042be',
        'remove:location',
        'Remove location to club',
        'club'
      ],
      [
        '34b3538b-1615-4197-9eb7-bc7b6559e95d',
        'add:role',
        'Creates new roles for club',
        'club'
      ],
      [
        'b26ef599-f903-4fee-b98b-334cbd4692e4',
        'edit:role',
        'Edit roles for club',
        'club'
      ],
      [
        '96daa082-0abb-4b09-b7da-c8d241356784',
        'view:tournament',
        'View an tournament',
        'tournaments'
      ],
      [
        '6591e322-09fd-4855-a064-ccd0e88d29d6',
        'add:tournament',
        'Add an tournament',
        'tournaments'
      ],
      [
        'a04049b7-d485-41c4-9a2c-a5e8cd997be9',
        'edit:tournament',
        'Edit an tournament',
        'tournaments'
      ],
      [
        '9aaa8806-938e-4e43-a6d3-aa1c324049b9',
        'delete:tournament',
        'Delete an tournament',
        'tournaments'
      ]
    ];

    const teamClaims = [
      [
        'cb84c616-6a8b-4e59-abe6-f62b9b527290',
        'edit:team',
        'Edit competition teams',
        'team'
      ],
      [
        '613ad7a8-ab0d-4ed7-8085-783677f991a7',
        'add:team',
        'Add compeition teams',
        'team'
      ],
      [
        '3dc66f9c-085c-42af-aeb9-0755cb317ace',
        'enter:results',
        'Enter results for a team',
        'team'
      ],
      [
        '607f538d-bf34-4ba4-998c-5e1ba1767593',
        'enlist:team',
        'Enlist a team in to competitoin',
        'team'
      ]
    ];

    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.sequelize.query(
        `BEGIN;
        CREATE TYPE event."enum_DrawTournaments_type" AS ENUM ('KO', 'POULE', 'QUALIFICATION');
        ALTER TYPE event."enum_DrawTournaments_type" OWNER TO ranking;
        CREATE TYPE event."enum_EventCompetitions_type" AS ENUM ('PROV', 'LIGA', 'NATIONAL');
        ALTER TYPE event."enum_EventCompetitions_type" OWNER TO ranking;
        CREATE TYPE event."enum_SubEventCompetitions_eventType" AS ENUM ('M', 'F', 'MX', 'MINIBAD');
        ALTER TYPE event."enum_SubEventCompetitions_eventType" OWNER TO ranking;
        CREATE TYPE event."enum_SubEventTournaments_eventType" AS ENUM ('M', 'F', 'MX', 'MINIBAD');
        ALTER TYPE event."enum_SubEventTournaments_eventType" OWNER TO ranking;
        CREATE TYPE event."enum_SubEventTournaments_gameType" AS ENUM ('S', 'D', 'MX');
        ALTER TYPE event."enum_SubEventTournaments_gameType" OWNER TO ranking;
        ALTER TYPE import."enum_Files_type"
        ADD VALUE 'TOURNAMENT'
        AFTER 'TOERNAMENT';
        ALTER TABLE event."Games" DROP CONSTRAINT "Games_drawId_fkey";
        ALTER TABLE public."Teams" DROP CONSTRAINT "Teams_SubEventId_fkey";
        ALTER TABLE ranking."GroupSystems" DROP CONSTRAINT "GroupSystems_GroupId_fkey";
        ALTER TABLE ranking."GroupSystems" DROP CONSTRAINT "GroupSystems_SystemId_fkey";
        CREATE TYPE public."enum_Teams_preferredDay" AS ENUM (
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday'
        );
        ALTER TYPE public."enum_Teams_preferredDay" OWNER TO ranking;
        CREATE SCHEMA IF NOT EXISTS security;
        CREATE TYPE security."enum_Claims_type" AS ENUM ('global', 'club', 'team');
        ALTER TYPE security."enum_Claims_type" OWNER TO ranking;
        CREATE TABLE event."EventCompetitions" (
            id character varying(255) COLLATE pg_catalog."default" NOT NULL,
            name character varying(255) COLLATE pg_catalog."default",
            "startYear" integer,
            type event."enum_EventCompetitions_type",
            "uniCode" character varying(255) COLLATE pg_catalog."default",
            "allowEnlisting" boolean DEFAULT false,
            "createdAt" timestamp with time zone NOT NULL,
            "updatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "EventCompetitions_pkey" PRIMARY KEY (id),
            CONSTRAINT "EventCompetitions_name_startYear_type_key" UNIQUE (name, "startYear", type)
        ) TABLESPACE pg_default;
        ALTER TABLE event."EventCompetitions" OWNER to ranking;
        CREATE TABLE event."EventTournaments" (
            id character varying(255) COLLATE pg_catalog."default" NOT NULL,
            "tournamentNumber" character varying(255) COLLATE pg_catalog."default",
            name character varying(255) COLLATE pg_catalog."default",
            "firstDay" timestamp with time zone,
            dates character varying(255) COLLATE pg_catalog."default",
            "allowEnlisting" boolean DEFAULT false,
            "uniCode" character varying(255) COLLATE pg_catalog."default",
            "createdAt" timestamp with time zone NOT NULL,
            "updatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "EventTournaments_pkey" PRIMARY KEY (id),
            CONSTRAINT "EventTournaments_name_firstDay_key" UNIQUE (name, "firstDay")
        ) TABLESPACE pg_default;
        ALTER TABLE event."EventTournaments" OWNER to ranking;
        CREATE TABLE event."SubEventCompetitions" (
            id character varying(255) COLLATE pg_catalog."default" NOT NULL,
            name character varying(255) COLLATE pg_catalog."default",
            "eventType" event."enum_SubEventCompetitions_eventType",
            level integer,
            "maxLevel" integer,
            "minBaseIndex" integer,
            "maxBaseIndex" integer,
            "eventId" character varying(255) COLLATE pg_catalog."default",
            "createdAt" timestamp with time zone NOT NULL,
            "updatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "SubEventCompetitions_pkey" PRIMARY KEY (id),
            CONSTRAINT "SubEventCompetitions_name_eventType_eventId_key" UNIQUE (name, "eventType", "eventId"),
            CONSTRAINT "SubEventCompetitions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES event."EventCompetitions" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
        ) TABLESPACE pg_default;
        ALTER TABLE event."SubEventCompetitions" OWNER to ranking;
        CREATE TABLE event."SubEventTournaments" (
            id character varying(255) COLLATE pg_catalog."default" NOT NULL,
            name character varying(255) COLLATE pg_catalog."default",
            "eventType" event."enum_SubEventTournaments_eventType",
            "gameType" event."enum_SubEventTournaments_gameType",
            level integer,
            "internalId" integer,
            "eventId" character varying(255) COLLATE pg_catalog."default",
            "createdAt" timestamp with time zone NOT NULL,
            "updatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "SubEventTournaments_pkey" PRIMARY KEY (id),
            CONSTRAINT "SubEventTournaments_name_eventType_gameType_internalId_even_key" UNIQUE (
                name,
                "eventType",
                "gameType",
                "internalId",
                "eventId"
            ),
            CONSTRAINT "SubEventTournaments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES event."EventTournaments" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
        ) TABLESPACE pg_default;
        ALTER TABLE event."SubEventTournaments" OWNER to ranking;
        CREATE TABLE event."DrawCompetitions" (
            id character varying(255) COLLATE pg_catalog."default" NOT NULL,
            name character varying(255) COLLATE pg_catalog."default",
            size integer,
            "subeventId" character varying(255) COLLATE pg_catalog."default",
            "createdAt" timestamp with time zone NOT NULL,
            "updatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "DrawCompetitions_pkey" PRIMARY KEY (id),
            CONSTRAINT "DrawCompetitions_name_subeventId_key" UNIQUE (name, "subeventId"),
            CONSTRAINT "DrawCompetitions_subeventId_fkey" FOREIGN KEY ("subeventId") REFERENCES event."SubEventCompetitions" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
        ) TABLESPACE pg_default;
        ALTER TABLE event."DrawCompetitions" OWNER to ranking;
        CREATE TABLE event."DrawTournaments" (
            id character varying(255) COLLATE pg_catalog."default" NOT NULL,
            name character varying(255) COLLATE pg_catalog."default",
            type event."enum_DrawTournaments_type",
            size integer,
            "internalId" integer,
            "subeventId" character varying(255) COLLATE pg_catalog."default",
            "createdAt" timestamp with time zone NOT NULL,
            "updatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "DrawTournaments_pkey" PRIMARY KEY (id),
            CONSTRAINT "DrawTournaments_name_type_internalId_subeventId_key" UNIQUE (name, type, "internalId", "subeventId"),
            CONSTRAINT "DrawTournaments_subeventId_fkey" FOREIGN KEY ("subeventId") REFERENCES event."SubEventTournaments" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
        ) TABLESPACE pg_default;
        ALTER TABLE event."DrawTournaments" OWNER to ranking;
        CREATE TABLE event."EncounterCompetitions" (
            id character varying(255) COLLATE pg_catalog."default" NOT NULL,
            date timestamp with time zone,
            "drawId" character varying(255) COLLATE pg_catalog."default",
            "homeTeamId" character varying(255) COLLATE pg_catalog."default",
            "awayTeamId" character varying(255) COLLATE pg_catalog."default",
            "createdAt" timestamp with time zone NOT NULL,
            "updatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "EncounterCompetitions_pkey" PRIMARY KEY (id),
            CONSTRAINT "EncounterCompetitions_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES public."Teams" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE NO ACTION,
            CONSTRAINT "EncounterCompetitions_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES event."DrawCompetitions" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT "EncounterCompetitions_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES public."Teams" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE NO ACTION
        ) TABLESPACE pg_default;
        ALTER TABLE event."EncounterCompetitions" OWNER to ranking;
        CREATE INDEX game_players_player_id ON event."GamePlayers" USING btree (
            "playerId" COLLATE pg_catalog."default" ASC NULLS LAST
        ) TABLESPACE pg_default;
        CREATE INDEX game_players_game_id ON event."GamePlayers" USING btree (
            "gameId" COLLATE pg_catalog."default" ASC NULLS LAST
        ) TABLESPACE pg_default;
        ALTER TABLE event."Games" DROP COLUMN "drawId";
        ALTER TABLE event."Games"
        ADD COLUMN "linkId" character varying(255) COLLATE pg_catalog."default";
        ALTER TABLE event."Games"
        ADD COLUMN "linkType" character varying(255) COLLATE pg_catalog."default";
        CREATE INDEX game_parent_index ON event."Games" USING btree (
            "linkId" COLLATE pg_catalog."default" ASC NULLS LAST,
            "linkType" COLLATE pg_catalog."default" ASC NULLS LAST
        ) TABLESPACE pg_default;
        CREATE TABLE event."LocationEventCompetitions" (
            "eventId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
            "locationId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
            CONSTRAINT "LocationEventCompetitions_pkey" PRIMARY KEY ("eventId", "locationId"),
            CONSTRAINT "LocationEventCompetitions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES event."EventCompetitions" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT "LocationEventCompetitions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES event."Locations" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
        ) TABLESPACE pg_default;
        ALTER TABLE event."LocationEventCompetitions" OWNER to ranking;
        CREATE TABLE event."LocationEventTournaments" (
            "eventId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
            "locationId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
            CONSTRAINT "LocationEventTournaments_pkey" PRIMARY KEY ("eventId", "locationId"),
            CONSTRAINT "LocationEventTournaments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES event."EventTournaments" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT "LocationEventTournaments_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES event."Locations" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
        ) TABLESPACE pg_default;
        ALTER TABLE event."LocationEventTournaments" OWNER to ranking;
        ALTER TABLE event."Locations"
        ALTER COLUMN postalcode
        SET STORAGE PLAIN;
        ALTER TABLE event."Locations"
        ADD COLUMN street character varying(255) COLLATE pg_catalog."default";
        ALTER TABLE event."Locations"
        ADD COLUMN "streetNumber" character varying(255) COLLATE pg_catalog."default";
        ALTER TABLE event."Locations"
        ADD COLUMN "clubId" character varying(255) COLLATE pg_catalog."default";
        ALTER TABLE event."Locations"
        ADD CONSTRAINT "Locations_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public."Clubs" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE NO ACTION;
        CREATE INDEX locations_club_id ON event."Locations" USING btree (
            "clubId" COLLATE pg_catalog."default" ASC NULLS LAST
        ) TABLESPACE pg_default;
        CREATE TABLE event."TeamSubEventMemberships" (
            "subEventId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
            "teamId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
            "createdAt" timestamp with time zone NOT NULL,
            "updatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "TeamSubEventMemberships_pkey" PRIMARY KEY ("subEventId", "teamId"),
            CONSTRAINT "TeamSubEventMemberships_subEventId_fkey" FOREIGN KEY ("subEventId") REFERENCES event."SubEventCompetitions" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT "TeamSubEventMemberships_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public."Teams" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
        ) TABLESPACE pg_default;
        ALTER TABLE event."TeamSubEventMemberships" OWNER to ranking;
        ALTER TABLE import."Files" DROP COLUMN "toernamentNumber";
        ALTER TABLE import."Files"
        ADD COLUMN "tournamentNumber" integer;
        CREATE INDEX player_club_index ON public."ClubMemberships" USING btree (
            "playerId" COLLATE pg_catalog."default" ASC NULLS LAST,
            "clubId" COLLATE pg_catalog."default" ASC NULLS LAST
        ) TABLESPACE pg_default;
        ALTER TABLE public."Clubs"
        ALTER COLUMN name
        SET NOT NULL;
        ALTER TABLE public."Players" DROP COLUMN token;
        ALTER TABLE public."Players"
        ADD COLUMN "competitionPlayer" boolean DEFAULT false;
        ALTER TABLE public."Players"
        ADD COLUMN phone character varying(255) COLLATE pg_catalog."default";
        ALTER TABLE public."Players"
        ADD COLUMN sub character varying(255) COLLATE pg_catalog."default";
        ALTER TABLE public."RequestLinks" DROP COLUMN email;
        CREATE INDEX request_links__player_id ON public."RequestLinks" USING btree (
            "PlayerId" COLLATE pg_catalog."default" ASC NULLS LAST
        ) TABLESPACE pg_default;
        CREATE TABLE public."TeamPlayerMemberships" (
            "playerId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
            "teamId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
            "end" timestamp with time zone,
            base boolean NOT NULL DEFAULT false,
            start timestamp with time zone NOT NULL,
            id character varying(255) COLLATE pg_catalog."default" NOT NULL,
            "createdAt" timestamp with time zone NOT NULL,
            "updatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "TeamPlayerMemberships_pkey" PRIMARY KEY (id),
            CONSTRAINT "TeamPlayerMemberships_playerId_teamId_start_key" UNIQUE ("playerId", "teamId", start),
            CONSTRAINT "TeamPlayerMemberships_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT "TeamPlayerMemberships_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public."Teams" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
        ) TABLESPACE pg_default;
        ALTER TABLE public."TeamPlayerMemberships" OWNER to ranking;
        CREATE INDEX player_team_index ON public."TeamPlayerMemberships" USING btree (
            "playerId" COLLATE pg_catalog."default" ASC NULLS LAST,
            "teamId" COLLATE pg_catalog."default" ASC NULLS LAST
        ) TABLESPACE pg_default;
        ALTER TABLE public."Teams" DROP COLUMN "SubEventId";
        ALTER TABLE public."Teams"
        ADD COLUMN active boolean DEFAULT true;
        ALTER TABLE public."Teams"
        ADD COLUMN "captainId" character varying(255) COLLATE pg_catalog."default";
        ALTER TABLE public."Teams"
        ADD COLUMN "clubId" character varying(255) COLLATE pg_catalog."default";
        ALTER TABLE public."Teams"
        ADD COLUMN "teamNumber" integer;
        ALTER TABLE public."Teams"
        ADD COLUMN "preferredDay" "enum_Teams_preferredDay";
        ALTER TABLE public."Teams"
        ADD COLUMN "preferredTime" time without time zone;
        ALTER TABLE public."Teams"
        ADD COLUMN type character varying(255) COLLATE pg_catalog."default";
        ALTER TABLE public."Teams"
        ADD CONSTRAINT "Teams_name_ClubId_teamNumber_key" UNIQUE (name, "ClubId", "teamNumber");
        ALTER TABLE public."Teams"
        ADD CONSTRAINT "Teams_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES public."Players" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE
        SET NULL;
        ALTER TABLE public."Teams"
        ADD CONSTRAINT "Teams_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public."Clubs" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE
        SET NULL;
        CREATE TABLE ranking."GroupSubEventCompetitions" (
            "subEventId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
            "groupId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
            CONSTRAINT "GroupSubEventCompetitions_pkey" PRIMARY KEY ("subEventId", "groupId"),
            CONSTRAINT "GroupSubEventCompetitions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES ranking."Groups" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT "GroupSubEventCompetitions_subEventId_fkey" FOREIGN KEY ("subEventId") REFERENCES event."SubEventCompetitions" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
        ) TABLESPACE pg_default;
        ALTER TABLE ranking."GroupSubEventCompetitions" OWNER to ranking;
        CREATE TABLE ranking."GroupSubEventTournaments" (
            "subEventId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
            "groupId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
            CONSTRAINT "GroupSubEventTournaments_pkey" PRIMARY KEY ("subEventId", "groupId"),
            CONSTRAINT "GroupSubEventTournaments_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES ranking."Groups" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT "GroupSubEventTournaments_subEventId_fkey" FOREIGN KEY ("subEventId") REFERENCES event."SubEventTournaments" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
        ) TABLESPACE pg_default;
        ALTER TABLE ranking."GroupSubEventTournaments" OWNER to ranking;
        ALTER TABLE ranking."GroupSystems" DROP COLUMN "GroupId";
        ALTER TABLE ranking."GroupSystems" DROP COLUMN "SystemId";
        ALTER TABLE ranking."GroupSystems"
        ADD COLUMN "groupId" character varying(255) COLLATE pg_catalog."default" NOT NULL;
        ALTER TABLE ranking."GroupSystems"
        ADD COLUMN "systemId" character varying(255) COLLATE pg_catalog."default" NOT NULL;
        ALTER TABLE ranking."GroupSystems"
        ADD CONSTRAINT "GroupSystems_pkey" PRIMARY KEY ("systemId", "groupId");
        ALTER TABLE ranking."GroupSystems"
        ADD CONSTRAINT "GroupSystems_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES ranking."Groups" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
        ALTER TABLE ranking."GroupSystems"
        ADD CONSTRAINT "GroupSystems_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES ranking."Systems" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
        CREATE INDEX ranking_index ON ranking."Places" USING btree (
            "PlayerId" COLLATE pg_catalog."default" ASC NULLS LAST,
            "SystemId" COLLATE pg_catalog."default" ASC NULLS LAST
        ) TABLESPACE pg_default;
        CREATE INDEX point_system_index ON ranking."Points" USING btree (
            "SystemId" COLLATE pg_catalog."default" ASC NULLS LAST,
            "PlayerId" COLLATE pg_catalog."default" ASC NULLS LAST
        ) TABLESPACE pg_default;
        CREATE SCHEMA IF NOT EXISTS security;
        CREATE TABLE security."Roles" (
            id character varying(255) COLLATE pg_catalog."default" NOT NULL,
            name character varying(255) COLLATE pg_catalog."default",
            description character varying(255) COLLATE pg_catalog."default",
            "clubId" character varying(255) COLLATE pg_catalog."default",
            "createdAt" timestamp with time zone NOT NULL,
            "updatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "Roles_pkey" PRIMARY KEY (id),
            CONSTRAINT "Roles_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public."Clubs" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE NO ACTION
        ) TABLESPACE pg_default;
        ALTER TABLE security."Roles" OWNER to ranking;
        CREATE INDEX roles_description ON security."Roles" USING btree (
            description COLLATE pg_catalog."default" ASC NULLS LAST
        ) TABLESPACE pg_default;
        CREATE INDEX roles_name ON security."Roles" USING btree (name COLLATE pg_catalog."default" ASC NULLS LAST) TABLESPACE pg_default;
        CREATE TABLE security."Claims" (
            id character varying(255) COLLATE pg_catalog."default" NOT NULL,
            name character varying(255) COLLATE pg_catalog."default",
            description character varying(255) COLLATE pg_catalog."default",
            category character varying(255) COLLATE pg_catalog."default",
            type security."enum_Claims_type",
            "createdAt" timestamp with time zone NOT NULL,
            "updatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "Claims_pkey" PRIMARY KEY (id),
            CONSTRAINT "Claims_name_category_key" UNIQUE (name, category)
        ) TABLESPACE pg_default;
        ALTER TABLE security."Claims" OWNER to ranking;
        CREATE INDEX claims_description ON security."Claims" USING btree (
            description COLLATE pg_catalog."default" ASC NULLS LAST
        ) TABLESPACE pg_default;
        CREATE INDEX claims_name ON security."Claims" USING btree (name COLLATE pg_catalog."default" ASC NULLS LAST) TABLESPACE pg_default;
        CREATE TABLE security."PlayerClaimMemberships" (
            "userId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
            "claimId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
            "createdAt" timestamp with time zone NOT NULL,
            "updatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "PlayerClaimMemberships_pkey" PRIMARY KEY ("userId", "claimId"),
            CONSTRAINT "PlayerClaimMemberships_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES security."Claims" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT "PlayerClaimMemberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."Players" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
        ) TABLESPACE pg_default;
        ALTER TABLE security."PlayerClaimMemberships" OWNER to ranking;
        CREATE TABLE security."PlayerRoleMemberships" (
            "userId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
            "roleId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
            "createdAt" timestamp with time zone NOT NULL,
            "updatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "PlayerRoleMemberships_pkey" PRIMARY KEY ("userId", "roleId"),
            CONSTRAINT "PlayerRoleMemberships_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES security."Roles" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT "PlayerRoleMemberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."Players" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
        ) TABLESPACE pg_default;
        ALTER TABLE security."PlayerRoleMemberships" OWNER to ranking;
        CREATE TABLE security."RoleClaimMemberships" (
            "roleId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
            "claimId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
            "createdAt" timestamp with time zone NOT NULL,
            "updatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "RoleClaimMemberships_pkey" PRIMARY KEY ("roleId", "claimId"),
            CONSTRAINT "RoleClaimMemberships_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES security."Claims" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT "RoleClaimMemberships_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES security."Roles" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
        ) TABLESPACE pg_default;
        ALTER TABLE security."RoleClaimMemberships" OWNER to ranking;
        DROP TABLE import."Draws" CASCADE;
        DROP TABLE import."SubEvents" CASCADE;
        DROP TABLE public."ClubLocations" CASCADE;
        DROP TABLE public."TeamMemberships" CASCADE;
        DROP TABLE ranking."GroupSubEvents" CASCADE;
        DROP TABLE event."Draws" CASCADE;
        DROP TABLE event."SubEvents" CASCADE;
        DROP TABLE event."Events" CASCADE;
        DROP TYPE IF EXISTS event."enum_Draws_type";
        DROP TYPE IF EXISTS event."enum_Events_type";
        DROP TYPE IF EXISTS event."enum_SubEvents_eventType";
        DROP TYPE IF EXISTS event."enum_SubEvents_gameType";
        DROP TYPE IF EXISTS event."enum_SubEvents_levelType";
        DROP TYPE IF EXISTS import."enum_Draws_type";
        DROP TYPE IF EXISTS import."enum_SubEvents_eventType";
        DROP TYPE IF EXISTS import."enum_SubEvents_gameType";
        DROP TYPE IF EXISTS import."enum_SubEvents_levelType";
        END;`,
        { transaction: t }
      );

      const dbAdminClaims = await queryInterface.bulkInsert(
        { tableName: 'Claims', schema: 'security' },
        adminClaims.map(claimName => {
          return {
            id: claimName[0],
            name: claimName[1],
            description: claimName[2],
            category: claimName[3],
            updatedAt: new Date(),
            createdAt: new Date(),
            type: 'global'
          };
        }),
        {
          transaction: t,
          ignoreDuplicates: true,
          returning: ['id']
        }
      );

      await queryInterface.bulkInsert(
        { tableName: 'Claims', schema: 'security' },
        clubClaims.map(claimName => {
          return {
            id: claimName[0],
            name: claimName[1],
            description: claimName[2],
            category: claimName[3],
            createdAt: new Date(),
            updatedAt: new Date(),
            type: 'club'
          };
        }),
        {
          transaction: t,
          ignoreDuplicates: true
        }
      );

      await queryInterface.bulkInsert(
        { tableName: 'Claims', schema: 'security' },
        teamClaims.map(claimName => {
          return {
            id: claimName[0],
            name: claimName[1],
            description: claimName[2],
            category: claimName[3],
            createdAt: new Date(),
            updatedAt: new Date(),
            type: 'team'
          };
        }),
        {
          transaction: t,
          ignoreDuplicates: true
        }
      );

      const player = await queryInterface.bulkInsert(
        { tableName: 'Players', schema: 'public' },
        [
          {
            id: '90fcc155-3952-4f58-85af-f90794165c89',
            gender: 'M',
            firstName: 'Glenn',
            lastName: 'Latomme',
            memberId: '50104197',
            sub: 'auth0|5e81ca9e8755df0c7f7452ea',
            updatedAt: new Date(),
            createdAt: new Date()
          }
        ],
        {
          transaction: t,
          ignoreDuplicates: true,
          returning: ['id']
        }
      );

      await queryInterface.bulkInsert(
        { tableName: 'PlayerClaimMemberships', schema: 'security' },
        dbAdminClaims.map(r => {
          return {
            claimId: r.id,
            userId: player[0].id,
            updatedAt: new Date(),
            createdAt: new Date()
          };
        }),
        {
          transaction: t,
          ignoreDuplicates: true
        }
      );
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      `BEGIN;
    CREATE TYPE event."enum_Draws_type" AS ENUM ('KO', 'POULE', 'QUALIFICATION');
    ALTER TYPE event."enum_Draws_type" OWNER TO ranking;
    CREATE TYPE event."enum_Events_type" AS ENUM ('COMPETITION', 'TOERNAMENT');
    ALTER TYPE event."enum_Events_type" OWNER TO ranking;
    CREATE TYPE event."enum_SubEvents_eventType" AS ENUM ('M', 'F', 'MX', 'MINIBAD');
    ALTER TYPE event."enum_SubEvents_eventType" OWNER TO ranking;
    CREATE TYPE event."enum_SubEvents_gameType" AS ENUM ('S', 'D', 'MX');
    ALTER TYPE event."enum_SubEvents_gameType" OWNER TO ranking;
    CREATE TYPE event."enum_SubEvents_levelType" AS ENUM ('PROV', 'LIGA', 'NATIONAAL');
    ALTER TYPE event."enum_SubEvents_levelType" OWNER TO ranking;
    CREATE TYPE import."enum_Draws_type" AS ENUM ('KO', 'POULE', 'QUALIFICATION');
    ALTER TYPE import."enum_Draws_type" OWNER TO ranking;
    ALTER TYPE import."enum_Files_type"
    ADD VALUE 'TOERNAMENT'
    AFTER 'TOURNAMENT';
    CREATE TYPE import."enum_SubEvents_eventType" AS ENUM ('M', 'F', 'MX', 'MINIBAD');
    ALTER TYPE import."enum_SubEvents_eventType" OWNER TO ranking;
    CREATE TYPE import."enum_SubEvents_gameType" AS ENUM ('S', 'D', 'MX');
    ALTER TYPE import."enum_SubEvents_gameType" OWNER TO ranking;
    CREATE TYPE import."enum_SubEvents_levelType" AS ENUM ('PROV', 'LIGA', 'NATIONAAL');
    ALTER TYPE import."enum_SubEvents_levelType" OWNER TO ranking;
    DROP TABLE event."DrawCompetitions" CASCADE;
    DROP TABLE event."DrawTournaments" CASCADE;
    CREATE TABLE event."Draws" (
        id character varying(255) COLLATE pg_catalog."default" NOT NULL,
        name character varying(255) COLLATE pg_catalog."default",
        type event."enum_Draws_type",
        size integer,
        "internalId" integer,
        "createdAt" timestamp with time zone NOT NULL,
        "updatedAt" timestamp with time zone NOT NULL,
        "SubEventId" character varying(255) COLLATE pg_catalog."default",
        CONSTRAINT "Draws_pkey" PRIMARY KEY (id),
        CONSTRAINT "Draws_name_type_internalId_SubEventId_key" UNIQUE (name, type, "internalId", "SubEventId"),
        CONSTRAINT "Draws_SubEventId_fkey" FOREIGN KEY ("SubEventId") REFERENCES event."SubEvents" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE
        SET NULL
    ) TABLESPACE pg_default;
    ALTER TABLE event."Draws" OWNER to ranking;
    CREATE INDEX draws_name ON event."Draws" USING btree (name COLLATE pg_catalog."default" ASC NULLS LAST) TABLESPACE pg_default;
    DROP TABLE event."EncounterCompetitions" CASCADE;
    DROP TABLE event."EventCompetitions" CASCADE;
    DROP TABLE event."EventTournaments" CASCADE;
    CREATE TABLE event."Events" (
        id character varying(255) COLLATE pg_catalog."default" NOT NULL,
        "toernamentNumber" integer,
        "firstDay" timestamp with time zone,
        dates character varying(255) COLLATE pg_catalog."default",
        name character varying(255) COLLATE pg_catalog."default",
        type event."enum_Events_type",
        "uniCode" character varying(255) COLLATE pg_catalog."default",
        "createdAt" timestamp with time zone NOT NULL,
        "updatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "Events_pkey" PRIMARY KEY (id),
        CONSTRAINT "Events_name_firstDay_key" UNIQUE (name, "firstDay")
    ) TABLESPACE pg_default;
    ALTER TABLE event."Events" OWNER to ranking;
    DROP INDEX event.game_players_player_id;
    DROP INDEX event.game_players_game_id;
    ALTER TABLE event."Games" DROP COLUMN "linkId";
    ALTER TABLE event."Games" DROP COLUMN "linkType";
    ALTER TABLE event."Games"
    ADD COLUMN "drawId" character varying(255) COLLATE pg_catalog."default";
    ALTER TABLE event."Games"
    ADD CONSTRAINT "Games_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES event."Draws" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE
    SET NULL;
    DROP INDEX event.game_parent_index;
    DROP TABLE event."LocationEventCompetitions" CASCADE;
    DROP TABLE event."LocationEventTournaments" CASCADE;
    ALTER TABLE event."Locations" DROP COLUMN street;
    ALTER TABLE event."Locations" DROP COLUMN "streetNumber";
    ALTER TABLE event."Locations" DROP COLUMN "clubId";
    ALTER TABLE event."Locations"
    ALTER COLUMN postalcode TYPE character varying(255) COLLATE pg_catalog."default";
    ALTER TABLE event."Locations"
    ALTER COLUMN postalcode
    SET STORAGE EXTENDED;
    ALTER TABLE event."Locations" DROP CONSTRAINT "Locations_clubId_fkey";
    DROP INDEX event.locations_club_id;
    DROP TABLE event."SubEventCompetitions" CASCADE;
    DROP TABLE event."SubEventTournaments" CASCADE;
    CREATE TABLE event."SubEvents" (
        id character varying(255) COLLATE pg_catalog."default" NOT NULL,
        name character varying(255) COLLATE pg_catalog."default",
        "eventType" event."enum_SubEvents_eventType",
        "levelType" event."enum_SubEvents_levelType",
        level integer,
        "EventId" character varying(255) COLLATE pg_catalog."default",
        "internalId" integer,
        "gameType" event."enum_SubEvents_gameType",
        "createdAt" timestamp with time zone NOT NULL,
        "updatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "SubEvents_pkey" PRIMARY KEY (id),
        CONSTRAINT "SubEvents_name_eventType_gameType_levelType_internalId_Even_key" UNIQUE (
            name,
            "eventType",
            "gameType",
            "levelType",
            "internalId",
            "EventId"
        ),
        CONSTRAINT "SubEvents_EventId_fkey" FOREIGN KEY ("EventId") REFERENCES event."Events" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
    ) TABLESPACE pg_default;
    ALTER TABLE event."SubEvents" OWNER to ranking;
    CREATE INDEX sub_events_name ON event."SubEvents" USING btree (name COLLATE pg_catalog."default" ASC NULLS LAST) TABLESPACE pg_default;
    DROP TABLE event."TeamSubEventMemberships" CASCADE;
    DROP TYPE event."enum_DrawTournaments_type";
    DROP TYPE event."enum_EventCompetitions_type";
    DROP TYPE event."enum_SubEventCompetitions_eventType";
    DROP TYPE event."enum_SubEventTournaments_eventType";
    DROP TYPE event."enum_SubEventTournaments_gameType";
    CREATE TABLE import."Draws" (
        id character varying(255) COLLATE pg_catalog."default" NOT NULL,
        name character varying(255) COLLATE pg_catalog."default",
        type import."enum_Draws_type",
        size integer,
        "internalId" integer,
        "createdAt" timestamp with time zone NOT NULL,
        "updatedAt" timestamp with time zone NOT NULL,
        "SubEventId" character varying(255) COLLATE pg_catalog."default",
        CONSTRAINT "Draws_pkey" PRIMARY KEY (id),
        CONSTRAINT "Draws_name_type_internalId_SubEventId_key" UNIQUE (name, type, "internalId", "SubEventId"),
        CONSTRAINT "Draws_SubEventId_fkey" FOREIGN KEY ("SubEventId") REFERENCES import."SubEvents" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE
        SET NULL
    ) TABLESPACE pg_default;
    ALTER TABLE import."Draws" OWNER to ranking;
    CREATE INDEX draws_name ON import."Draws" USING btree (name COLLATE pg_catalog."default" ASC NULLS LAST) TABLESPACE pg_default;
    ALTER TABLE import."Files" DROP COLUMN "tournamentNumber";
    ALTER TABLE import."Files"
    ADD COLUMN "toernamentNumber" character varying(255) COLLATE pg_catalog."default";
    CREATE TABLE import."SubEvents" (
        id character varying(255) COLLATE pg_catalog."default" NOT NULL,
        "createdAt" timestamp with time zone NOT NULL,
        "updatedAt" timestamp with time zone NOT NULL,
        name character varying(255) COLLATE pg_catalog."default",
        "internalId" integer,
        "eventType" import."enum_SubEvents_eventType",
        "gameType" import."enum_SubEvents_gameType",
        "levelType" import."enum_SubEvents_levelType",
        level integer,
        "FileId" character varying(255) COLLATE pg_catalog."default",
        CONSTRAINT "SubEvents_pkey" PRIMARY KEY (id),
        CONSTRAINT "SubEvents_name_eventType_gameType_levelType_internalId_File_key" UNIQUE (
            name,
            "eventType",
            "gameType",
            "levelType",
            "internalId",
            "FileId"
        ),
        CONSTRAINT "SubEvents_FileId_fkey" FOREIGN KEY ("FileId") REFERENCES import."Files" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
    ) TABLESPACE pg_default;
    ALTER TABLE import."SubEvents" OWNER to ranking;
    CREATE INDEX sub_events_name ON import."SubEvents" USING btree (name COLLATE pg_catalog."default" ASC NULLS LAST) TABLESPACE pg_default;
    CREATE TABLE public."ClubLocations" (
        "createdAt" timestamp with time zone NOT NULL,
        "updatedAt" timestamp with time zone NOT NULL,
        "locationId" character varying(255) COLLATE pg_catalog."default",
        "clubId" character varying(255) COLLATE pg_catalog."default",
        CONSTRAINT "ClubLocations_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public."Clubs" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE
        SET NULL,
            CONSTRAINT "ClubLocations_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES event."Locations" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE
        SET NULL
    ) TABLESPACE pg_default;
    ALTER TABLE public."ClubLocations" OWNER to ranking;
    DROP INDEX public.player_club_index;
    ALTER TABLE public."Clubs"
    ALTER COLUMN name DROP NOT NULL;
    ALTER TABLE public."Players" DROP COLUMN "competitionPlayer";
    ALTER TABLE public."Players" DROP COLUMN phone;
    ALTER TABLE public."Players" DROP COLUMN sub;
    ALTER TABLE public."Players"
    ADD COLUMN token character varying(255) COLLATE pg_catalog."default";
    ALTER TABLE public."RequestLinks"
    ADD COLUMN email character varying(255) COLLATE pg_catalog."default";
    DROP INDEX public.request_links__player_id;
    CREATE TABLE public."SequelizeMeta" (
        name character varying(255) COLLATE pg_catalog."default" NOT NULL,
        CONSTRAINT "SequelizeMeta_pkey" PRIMARY KEY (name)
    ) TABLESPACE pg_default;
    ALTER TABLE public."SequelizeMeta" OWNER to ranking;
    CREATE TABLE public."TeamMemberships" (
        start timestamp with time zone NOT NULL,
        "end" timestamp with time zone,
        "playerId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
        "teamId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
        "createdAt" timestamp with time zone NOT NULL,
        "updatedAt" timestamp with time zone NOT NULL,
        id character varying(255) COLLATE pg_catalog."default" NOT NULL,
        CONSTRAINT "TeamMemberships_pkey" PRIMARY KEY (id),
        CONSTRAINT "TeamMemberships_playerId_teamId_start_key" UNIQUE ("playerId", "teamId", start),
        CONSTRAINT "TeamMemberships_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public."Players" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "TeamMemberships_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public."Teams" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
    ) TABLESPACE pg_default;
    ALTER TABLE public."TeamMemberships" OWNER to ranking;
    DROP TABLE public."TeamPlayerMemberships" CASCADE;
    ALTER TABLE public."Teams" DROP COLUMN active;
    ALTER TABLE public."Teams" DROP COLUMN "captainId";
    ALTER TABLE public."Teams" DROP COLUMN "clubId";
    ALTER TABLE public."Teams" DROP COLUMN "teamNumber";
    ALTER TABLE public."Teams" DROP COLUMN "preferredDay";
    ALTER TABLE public."Teams" DROP COLUMN "preferredTime";
    ALTER TABLE public."Teams" DROP COLUMN type;
    ALTER TABLE public."Teams"
    ADD COLUMN "SubEventId" character varying(255) COLLATE pg_catalog."default";
    ALTER TABLE public."Teams"
    ADD CONSTRAINT "Teams_name_ClubId_key" UNIQUE (name, "ClubId");
    ALTER TABLE public."Teams" DROP CONSTRAINT "Teams_captainId_fkey";
    ALTER TABLE public."Teams" DROP CONSTRAINT "Teams_clubId_fkey";
    ALTER TABLE public."Teams"
    ADD CONSTRAINT "Teams_SubEventId_fkey" FOREIGN KEY ("SubEventId") REFERENCES public."SubEvents" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE
    SET NULL;
    DROP TYPE public."enum_Teams_preferredDay";
    DROP TABLE ranking."GroupSubEventCompetitions" CASCADE;
    DROP TABLE ranking."GroupSubEventTournaments" CASCADE;
    CREATE TABLE ranking."GroupSubEvents" (
        "SubEventId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
        "GroupId" character varying(255) COLLATE pg_catalog."default" NOT NULL,
        CONSTRAINT "GroupSubEvents_pkey" PRIMARY KEY ("SubEventId", "GroupId"),
        CONSTRAINT "GroupSubEvents_GroupId_fkey" FOREIGN KEY ("GroupId") REFERENCES ranking."Groups" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "GroupSubEvents_SubEventId_fkey" FOREIGN KEY ("SubEventId") REFERENCES event."SubEvents" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
    ) TABLESPACE pg_default;
    ALTER TABLE ranking."GroupSubEvents" OWNER to ranking;
    ALTER TABLE ranking."GroupSystems" DROP COLUMN "groupId";
    ALTER TABLE ranking."GroupSystems" DROP COLUMN "systemId";
    ALTER TABLE ranking."GroupSystems"
    ADD COLUMN "GroupId" character varying(255) COLLATE pg_catalog."default" NOT NULL;
    ALTER TABLE ranking."GroupSystems"
    ADD COLUMN "SystemId" character varying(255) COLLATE pg_catalog."default" NOT NULL;
    ALTER TABLE ranking."GroupSystems"
    ADD CONSTRAINT "GroupSystems_pkey" PRIMARY KEY ("SystemId", "GroupId");
    ALTER TABLE ranking."GroupSystems" DROP CONSTRAINT "GroupSystems_groupId_fkey";
    ALTER TABLE ranking."GroupSystems" DROP CONSTRAINT "GroupSystems_systemId_fkey";
    ALTER TABLE ranking."GroupSystems"
    ADD CONSTRAINT "GroupSystems_GroupId_fkey" FOREIGN KEY ("GroupId") REFERENCES ranking."Groups" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
    ALTER TABLE ranking."GroupSystems"
    ADD CONSTRAINT "GroupSystems_SystemId_fkey" FOREIGN KEY ("SystemId") REFERENCES ranking."Systems" (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
    DROP INDEX ranking.ranking_index;
    DROP INDEX ranking.point_system_index;
    DROP TABLE security."Claims" CASCADE;
    DROP TABLE security."PlayerClaimMemberships" CASCADE;
    DROP TABLE security."PlayerRoleMemberships" CASCADE;
    DROP TABLE security."RoleClaimMemberships" CASCADE;
    DROP TABLE security."Roles" CASCADE;
    DROP TYPE security."enum_Claims_type";
    END;`,
      { transaction: t }
    );
  }
};
