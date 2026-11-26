"use strict";

const { randomUUID } = require("crypto");

/**
 * Removes permission claims that nothing checks any more, merges two claims that
 * exist twice, and moves the teams export onto its own claim (BAD-393).
 *
 * Claims are matched on (name, category, type), never on id: long-lived databases
 * have hand-inserted rows with their own ids.
 *
 * - UNUSED: no backend or frontend code checks these. Their role and player
 *   assignments are deleted with them. `add:ranking` was only checked by the
 *   frontend; the ranking-system mutations check `edit:ranking`.
 * - DUPLICATES: the same permission string under two categories. Both rows grant
 *   exactly the same permission, so assignments move to the kept row.
 * - ENSURED: the claim admin checks `edit:claims` (not the unused `add:claims`),
 *   but no earlier migration creates it, so fresh databases lack it. It is
 *   created where it is missing. No assignments are copied to it: `add:claims`
 *   grants nothing, and `edit:claims` lets its holder assign any claim.
 * - The teams export now checks `export-teams:competition` (like the exceptions
 *   and locations exports). Every player who holds the global `edit:competition`
 *   claim gets it too, so nobody loses access.
 *
 * down() puts the claim rows back (with new ids) but cannot restore deleted
 * assignments, split merged assignments, take back the export grants, or remove
 * `edit:claims` (it may have existed before).
 */
const UNUSED = [
  { name: "add-any:role", category: "club", type: "global", description: "Add any role to club" },
  { name: "add:location", category: "club", type: "club", description: "Adds location to club" },
  { name: "add:role", category: "club", type: "club", description: "Adds role to club" },
  { name: "add:team", category: "club", type: "team", description: "Adds competition team to club" },
  { name: "edit-any:role", category: "club", type: "global", description: "Edits any role of club" },
  { name: "enlist:team", category: "club", type: "team", description: "Enlists competition team" },
  { name: "remove-any:role", category: "club", type: "global", description: "edits any role of club" },
  { name: "remove:location", category: "club", type: "club", description: "Remove location to club" },
  { name: "remove:player", category: "club", type: "club", description: "Removes player to club" },
  { name: "remove:role", category: "club", type: "club", description: "Delete a role from a club" },
  { name: "add:tournament", category: "competitions", type: "club", description: "Add any tournament" },
  { name: "export-planner:competition", category: "competitions", type: "global", description: "Export planner data for competition" },
  { name: "import:competition", category: "competitions", type: "global", description: "Import an competition" },
  { name: "link:player", category: "player", type: "global", description: "Can link players to login" },
  { name: "membership:club", category: "player", type: "global", description: "Can change the club membership of a player" },
  { name: "merge:player", category: "player", type: "global", description: "Can merge players" },
  { name: "status:competition", category: "player", type: "global", description: "Can change competition status" },
  { name: "subscription:player", category: "player", type: "global", description: "Can change the subscription (login) of player" },
  { name: "add:ranking", category: "ranking", type: "global", description: "Add ranking system" },
  { name: "calculate:ranking", category: "ranking", type: "global", description: "Simulate ranking" },
  { name: "delete:ranking", category: "ranking", type: "global", description: "Delete ranking system" },
  { name: "edit:player-ranking", category: "ranking", type: "global", description: "Edit player ranking" },
  { name: "make-primary:ranking", category: "ranking", type: "global", description: "Make ranking system primary" },
  { name: "view:ranking", category: "ranking", type: "global", description: "View ranking system" },
  { name: "change:rules", category: "rules", type: "global", description: "Allow chaning ruless" },
  { name: "add:claims", category: "security", type: "global", description: "Edit claims" },
  { name: "edit:state", category: "state", type: "global", description: "Edit state" },
  { name: "delete-any:team", category: "team", type: "global", description: "Allows the deletion of a team" },
  { name: "enlist-any-event:team", category: "team", type: "global", description: "Enlist team in any event" },
  { name: "enlist-any:team", category: "team", type: "global", description: "Enlist any team in to competition" },
  { name: "view-any:enrollment-tournament", category: "tournament", type: "global", description: "View any enrollment" },
  { name: "view:enrollment-tournament", category: "tournament", type: "club", description: "View any enrollment" },
  { name: "view:enrollment-tournament", category: "tournament", type: "tournament", description: "View any enrollment" },
  { name: "delete:tournament", category: "tournaments", type: "club", description: "Delete tournament" },
  { name: "edit:tournament", category: "tournaments", type: "club", description: "Edit tournament" },
];

const DUPLICATES = [
  {
    name: "change-any:encounter",
    type: "global",
    keepCategory: "encounter",
    dropCategory: "club",
    description: "Change any encounter date or rescheduling-window settings",
    dropDescription: "Change the date/time of any encounter",
  },
  {
    name: "edit:ranking",
    type: "global",
    keepCategory: "ranking",
    dropCategory: "player",
    description: "Edit ranking systems and players' rankings",
    dropDescription: "Can change ranking of player",
  },
];

const ENSURED = [
  { name: "edit:claims", category: "security", type: "global", description: "Edit global claims" },
];

const MEMBERSHIP_TABLES = ['security."RoleClaimMemberships"', 'security."PlayerClaimMemberships"'];
const MEMBER_COLUMN = {
  'security."RoleClaimMemberships"': '"roleId"',
  'security."PlayerClaimMemberships"': '"playerId"',
};

async function claimIds(queryInterface, claim, transaction) {
  const rows = await queryInterface.sequelize.query(
    `SELECT id FROM security."Claims" WHERE name = :name AND category = :category AND type = :type`,
    { replacements: claim, type: queryInterface.sequelize.QueryTypes.SELECT, transaction }
  );
  return rows.map((r) => r.id);
}

async function deleteClaims(queryInterface, ids, transaction) {
  if (ids.length === 0) return;
  for (const table of MEMBERSHIP_TABLES) {
    await queryInterface.sequelize.query(`DELETE FROM ${table} WHERE "claimId" IN (:ids)`, {
      replacements: { ids },
      transaction,
    });
  }
  await queryInterface.sequelize.query(`DELETE FROM security."Claims" WHERE id IN (:ids)`, {
    replacements: { ids },
    transaction,
  });
}

async function copyMemberships(queryInterface, fromId, toId, transaction) {
  for (const table of MEMBERSHIP_TABLES) {
    const member = MEMBER_COLUMN[table];
    await queryInterface.sequelize.query(
      `INSERT INTO ${table} (${member}, "claimId", "createdAt", "updatedAt")
       SELECT ${member}, :toId, NOW(), NOW() FROM ${table} WHERE "claimId" = :fromId
       ON CONFLICT DO NOTHING`,
      { replacements: { fromId, toId }, transaction }
    );
  }
}

async function insertClaim(queryInterface, claim, transaction) {
  const existing = await claimIds(queryInterface, claim, transaction);
  if (existing.length > 0) return;
  await queryInterface.bulkInsert(
    { tableName: "Claims", schema: "security" },
    [{ id: randomUUID(), ...claim, createdAt: new Date(), updatedAt: new Date() }],
    { transaction }
  );
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      for (const claim of UNUSED) {
        const { name, category, type } = claim;
        await deleteClaims(queryInterface, await claimIds(queryInterface, { name, category, type }, t), t);
      }

      // Guarded on the name only, like 20260910120000-add_change_job_claim.js:
      // long-lived databases may have a hand-inserted row under another category.
      for (const claim of ENSURED) {
        const [existing] = await queryInterface.sequelize.query(
          `SELECT id FROM security."Claims" WHERE name = :name LIMIT 1`,
          { replacements: { name: claim.name }, type: queryInterface.sequelize.QueryTypes.SELECT, transaction: t }
        );
        if (!existing) {
          await insertClaim(queryInterface, claim, t);
        }
      }

      for (const dup of DUPLICATES) {
        const [keepId] = await claimIds(
          queryInterface,
          { name: dup.name, category: dup.keepCategory, type: dup.type },
          t
        );
        const [dropId] = await claimIds(
          queryInterface,
          { name: dup.name, category: dup.dropCategory, type: dup.type },
          t
        );

        if (keepId && dropId) {
          await copyMemberships(queryInterface, dropId, keepId, t);
          await deleteClaims(queryInterface, [dropId], t);
        } else if (dropId) {
          await queryInterface.sequelize.query(
            `UPDATE security."Claims" SET category = :category WHERE id = :id`,
            { replacements: { category: dup.keepCategory, id: dropId }, transaction: t }
          );
        }

        await queryInterface.sequelize.query(
          `UPDATE security."Claims" SET description = :description, "updatedAt" = NOW()
           WHERE name = :name AND category = :category AND type = :type`,
          {
            replacements: {
              description: dup.description,
              name: dup.name,
              category: dup.keepCategory,
              type: dup.type,
            },
            transaction: t,
          }
        );
      }

      const [exportTeamsId] = await claimIds(
        queryInterface,
        { name: "export-teams:competition", category: "competitions", type: "global" },
        t
      );
      const [editCompetitionId] = await claimIds(
        queryInterface,
        { name: "edit:competition", category: "competitions", type: "global" },
        t
      );
      if (exportTeamsId && editCompetitionId) {
        await queryInterface.sequelize.query(
          `INSERT INTO security."PlayerClaimMemberships" ("playerId", "claimId", "createdAt", "updatedAt")
           SELECT "playerId", :exportTeamsId, NOW(), NOW()
           FROM security."PlayerClaimMemberships" WHERE "claimId" = :editCompetitionId
           ON CONFLICT DO NOTHING`,
          { replacements: { exportTeamsId, editCompetitionId }, transaction: t }
        );
      }
    });
  },

  down: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      for (const claim of UNUSED) {
        await insertClaim(queryInterface, claim, t);
      }
      // ENSURED claims stay: they may have existed before this migration.
      for (const dup of DUPLICATES) {
        await insertClaim(
          queryInterface,
          { name: dup.name, category: dup.dropCategory, type: dup.type, description: dup.dropDescription },
          t
        );
      }
    });
  },
};
