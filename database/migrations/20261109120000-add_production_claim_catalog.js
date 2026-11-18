"use strict";

/**
 * Production claim catalog (security."Claims", exported 2026-11-09).
 *
 * Most club, team and global claims were inserted by hand on long-lived databases
 * before claims were seeded through migrations. A database built from migrations
 * only therefore lacked them, so permission checks and role screens could not be
 * used locally. This migration inserts every production claim that is missing.
 *
 * - `Claims` is unique on (name, category, type). A claim that already exists
 *   under that key (in production, or inserted by an earlier migration) is skipped
 *   with ON CONFLICT DO NOTHING, so on production and staging this is a no-op.
 * - The ids are generated for this migration and differ from the production ids on
 *   purpose: `down` deletes by id, and must never remove a row this migration did
 *   not create.
 * - Names, descriptions and categories are copied from production as-is (typos
 *   included), so a fresh database matches production.
 */
const claims = [
  { id: "3dd0665c-5d23-4057-a10c-2c04afa3edb9", name: "add-any:role", description: "Add any role to club", category: "club", type: "global" },
  { id: "c3bfc060-941a-4bd0-b342-24705ab4ab1c", name: "add:club", description: "Create new club", category: "club", type: "global" },
  { id: "97808500-98cb-4700-8678-46e916fa9f8c", name: "change-any:encounter", description: "Change the date/time of any encounter", category: "club", type: "global" },
  { id: "43af3c45-fb3f-47f8-b765-b0df850e224e", name: "edit-any:club", description: "Edit any club", category: "club", type: "global" },
  { id: "20d591b9-49aa-4a00-b72b-4ffe2daab347", name: "edit-any:role", description: "Edits any role of club", category: "club", type: "global" },
  { id: "16870832-33a9-45e7-99c5-0068d0f1ad0a", name: "remove-any:role", description: "edits any role of club", category: "club", type: "global" },
  { id: "06d87f99-1683-4889-85db-a51711acad33", name: "remove:club", description: "Delete a club", category: "club", type: "global" },
  { id: "b41078a7-6031-4640-9da0-6f9f6f50bf4f", name: "add:competition", description: "Add an competition", category: "competitions", type: "global" },
  { id: "b6a827db-7acb-4a5d-a827-f2a022550a8e", name: "delete:competition", description: "Delete an competition", category: "competitions", type: "global" },
  { id: "ddd91c5c-2d12-4cca-86c8-998742d5128f", name: "edit:competition", description: "Edit an competition", category: "competitions", type: "global" },
  { id: "93042bbe-654b-4266-8eb2-df1c25b2b2ab", name: "export-exceptions:competition", description: "Export exceptions data for competition", category: "competitions", type: "global" },
  { id: "cab1c8a4-38f9-495f-a21a-99ac804a05d9", name: "export-locations:competition", description: "Export locations data for competition", category: "competitions", type: "global" },
  { id: "e61d9733-bd41-481e-89d3-42d5b9527aac", name: "export-planner:competition", description: "Export planner data for competition", category: "competitions", type: "global" },
  { id: "93b1797a-8fe9-4f2f-aa1e-56b171d267dc", name: "export-teams:competition", description: "Export teams data for competition", category: "competitions", type: "global" },
  { id: "836b979e-42c5-42af-af03-751221397f92", name: "import:competition", description: "Import an competition", category: "competitions", type: "global" },
  { id: "f8f7b2de-d724-4ab0-9c8d-3e95bcb6b80f", name: "sync:competition", description: "Sync Competition", category: "competitions", type: "global" },
  { id: "1e7ca172-a24d-4943-bdde-48a8c39b676e", name: "view-any:enrollment-competition", description: "View any enrollment", category: "competitions", type: "global" },
  { id: "2f92d53b-f40c-4f62-b2c1-018158f634ac", name: "change-any:encounter", description: "Change any encounter date or rescheduling-window settings", category: "encounter", type: "global" },
  { id: "8a49cb57-acdd-4efb-86b3-c3c22839e703", name: "change:enrollment", description: "Change enrollment settings", category: "enrollment", type: "global" },
  { id: "688a2b19-c198-4669-978f-de4273ed133e", name: "add:faq", description: "Adds FAQ", category: "faq", type: "global" },
  { id: "4ee18876-5b4d-4db9-82c4-4a73f5d19eb2", name: "edit:faq", description: "Edits FAQ", category: "faq", type: "global" },
  { id: "027b9700-ab08-44ed-a77c-1cf1dbf04bdc", name: "change:job", description: "Start stop jobs", category: "job", type: "global" },
  { id: "59637f56-f394-4bba-a627-f53934e46c56", name: "add:player", description: "Manually add player", category: "player", type: "global" },
  { id: "e7b5cdbb-99cf-474c-a9f6-5622f37caaf6", name: "delete:player", description: "Can delete players", category: "player", type: "global" },
  { id: "ab744254-67a8-4d02-a30a-69653889672e", name: "details-any:player", description: "Can view (GPDR) details of any player", category: "player", type: "global" },
  { id: "f1341610-697e-40b2-8f62-7e082633b00e", name: "edit-any:player", description: "Can edit any player", category: "player", type: "global" },
  { id: "89536b7c-561c-4432-aa97-76c2e8f992a6", name: "edit:ranking", description: "Can change ranking of player", category: "player", type: "global" },
  { id: "d06feddd-327c-4a17-9a9e-e7a45b2fc672", name: "link:player", description: "Can link players to login", category: "player", type: "global" },
  { id: "f732b18d-d57a-4e31-bc71-e349a97eca94", name: "membership:club", description: "Can change the club membership of a player", category: "player", type: "global" },
  { id: "57758964-9fc4-45c0-b48c-91f29b456fe3", name: "merge:player", description: "Can merge players", category: "player", type: "global" },
  { id: "8803bc7e-c0a2-4c40-85a2-2bc82f534d92", name: "status:competition", description: "Can change competition status", category: "player", type: "global" },
  { id: "f1db2eff-4eff-4892-a7f9-285308d1a0fa", name: "subscription:player", description: "Can change the subscription (login) of player", category: "player", type: "global" },
  { id: "a59a64b0-23a3-4b94-be23-d0316c3fd19c", name: "re-sync:points", description: "Allow re-syncing points", category: "points", type: "global" },
  { id: "1f6eff80-853c-44f3-b2c3-e7161131f44b", name: "add:ranking", description: "Add ranking system", category: "ranking", type: "global" },
  { id: "636b0e88-13d2-47ed-a50d-7a3ee12ebcbc", name: "calculate:ranking", description: "Simulate ranking", category: "ranking", type: "global" },
  { id: "27274655-73a0-43a0-a158-99418eea9172", name: "delete:ranking", description: "Delete ranking system", category: "ranking", type: "global" },
  { id: "63534419-fd64-4451-9dd1-2938c53559b1", name: "edit:player-ranking", description: "Edit player ranking", category: "ranking", type: "global" },
  { id: "f8eeb6ce-9c68-43c8-8b78-b67a98c3daf3", name: "edit:ranking", description: "Edit ranking system", category: "ranking", type: "global" },
  { id: "cd58020a-5866-4b1c-a62f-753631778f67", name: "make-primary:ranking", description: "Make ranking system primary", category: "ranking", type: "global" },
  { id: "ebfa7d94-11da-438a-bd69-7fecc65dba32", name: "view:ranking", description: "View ranking system", category: "ranking", type: "global" },
  { id: "bd2f1693-7699-4982-87da-a08e56e2b2ab", name: "add:event", description: "Add subevent(s) to ranking group", category: "ranking-group", type: "global" },
  { id: "cc134be9-0115-4eaa-a2d0-cf6bb696f4fe", name: "remove:event", description: "Remove subevent(s) to ranking group", category: "ranking-group", type: "global" },
  { id: "10cefa29-c6a0-4edc-83fc-4c086deb21a1", name: "change:rules", description: "Allow chaning ruless", category: "rules", type: "global" },
  { id: "9da965d0-f8dd-429f-920a-20fedf9c3038", name: "add:claims", description: "Edit claims", category: "security", type: "global" },
  { id: "75597141-86e5-4432-a80b-1a13d1edad26", name: "edit:claims", description: "Edit global claims", category: "security", type: "global" },
  { id: "2c2da692-6ecc-4a8e-8153-688a459daaeb", name: "edit:state", description: "Edit state", category: "state", type: "global" },
  { id: "77e93926-7024-4922-95c0-72c36c443ac6", name: "edit:system-settings", description: "Edit system settings", category: "system", type: "global" },
  { id: "8047d6db-8ecb-4ac8-b7c5-dd7733a2b427", name: "change-base:team", description: "Can change base players", category: "team", type: "global" },
  { id: "552ae409-51f2-4a1a-b301-85e46fc56959", name: "delete-any:team", description: "Allows the deletion of a team", category: "team", type: "global" },
  { id: "49796e53-d94c-4e9e-a3b5-86d25ba537d6", name: "details-any:team", description: "Can view (GPDR) details of any team", category: "team", type: "global" },
  { id: "f13d85ad-08b4-46a7-9a54-6964d66dbadb", name: "enlist-any-event:team", description: "Enlist team in any event", category: "team", type: "global" },
  { id: "5094d8a6-f132-45fe-9d06-dc24f562b42d", name: "enlist-any:team", description: "Enlist any team in to competition", category: "team", type: "global" },
  { id: "8600e223-3bf5-4c45-a5d3-f32f32c61473", name: "view-any:enrollment-tournament", description: "View any enrollment", category: "tournament", type: "global" },
  { id: "c84121d9-85df-4f26-948d-d8168ed83df5", name: "delete-any:tournament", description: "Delete tournament", category: "tournaments", type: "global" },
  { id: "6dbc4ab7-6721-48c1-8093-7eb07f56d36c", name: "edit-any:tournament", description: "Edit any tournament", category: "tournaments", type: "global" },
  { id: "7368566a-41ba-41a0-81af-ad93212cccd6", name: "sync:tournament", description: "Sync Tournaments", category: "tournaments", type: "global" },
  { id: "597eb952-7b6c-4755-879d-e2ee62687446", name: "change:transfer", description: "Allow accepting transfers", category: "transfer", type: "global" },
  { id: "389068df-0121-4b54-8cc2-ced46ef14347", name: "add:location", description: "Adds location to club", category: "club", type: "club" },
  { id: "d2d47de2-3771-45cb-b472-7ec09647ba1e", name: "add:player", description: "Adds player to club", category: "club", type: "club" },
  { id: "f7557c7c-cd9e-4efb-ba94-8f4d4fd70851", name: "add:role", description: "Adds role to club", category: "club", type: "club" },
  { id: "18853d77-f400-459d-8bf5-0209ee78b8de", name: "edit:club", description: "Edit club", category: "club", type: "club" },
  { id: "85c01487-6517-4324-8f52-4453084697e1", name: "edit:location", description: "Edit a location", category: "club", type: "club" },
  { id: "df5b5334-836e-4452-89f8-c3e2e2bb4081", name: "edit:role", description: "Edits role of club", category: "club", type: "club" },
  { id: "4de3184e-64a2-45a3-9d97-f816f5d47169", name: "remove:location", description: "Remove location to club", category: "club", type: "club" },
  { id: "970af97f-8eb6-404b-a335-083b6e6c975f", name: "remove:player", description: "Removes player to club", category: "club", type: "club" },
  { id: "c10fd1cc-d240-421d-8c5f-407b62aa6dba", name: "remove:role", description: "Delete a role from a club", category: "club", type: "club" },
  { id: "a04d6267-4c2b-4e1a-a9dd-c8a4ae48e5c9", name: "add:tournament", description: "Add any tournament", category: "competitions", type: "club" },
  { id: "4ebb8dc3-09b4-4bae-8b82-a686f25998d6", name: "view:enrollment-competition", description: "View any enrollment", category: "competitions", type: "club" },
  { id: "1dff1804-010a-4cc4-8b8e-7914e4d1fb48", name: "details:player", description: "Can view (GPDR) details of a player for this club", category: "player", type: "club" },
  { id: "bd725eb8-2494-4ddd-8244-aac70858eff5", name: "details:team", description: "Can view (GPDR) details of a team for this club", category: "team", type: "club" },
  { id: "0193637b-4389-41b5-91bf-132fc17171fd", name: "view:enrollment-tournament", description: "View any enrollment", category: "tournament", type: "club" },
  { id: "66180074-2ba9-4b90-b1a9-4446415a3f59", name: "delete:tournament", description: "Delete tournament", category: "tournaments", type: "club" },
  { id: "9b9e0644-a637-47e5-b7ed-7a0d185c5555", name: "edit:tournament", description: "Edit tournament", category: "tournaments", type: "club" },
  { id: "f268c713-906f-47a1-bd81-8e88a8291e0c", name: "add:team", description: "Adds competition team to club", category: "club", type: "team" },
  { id: "977b2d42-1968-4eca-a22f-d0d9f8cddb66", name: "change:encounter", description: "Change the date/time of a encounter", category: "club", type: "team" },
  { id: "de2867e8-f5b2-491a-a4f4-41eab215a091", name: "edit:team", description: "Edit competition team", category: "club", type: "team" },
  { id: "db5b4425-f574-47b1-aabc-cb9756acf477", name: "enlist:team", description: "Enlists competition team", category: "club", type: "team" },
  { id: "3586a0db-68ef-4d85-8097-6ddae68b9260", name: "enter:results", description: "Enters competition results", category: "club", type: "team" },
  { id: "d6710f2b-a4ce-42ac-ab52-c0482c67369b", name: "view:enrollment-competition", description: "View any enrollment", category: "competitions", type: "competition" },
  { id: "ebf58280-dfae-4d28-a59c-c4bf27c72b72", name: "view:enrollment-tournament", description: "View any enrollment", category: "tournament", type: "tournament" },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      for (const claim of claims) {
        await queryInterface.sequelize.query(
          `INSERT INTO security."Claims" (id, name, description, category, type, "createdAt", "updatedAt")
           VALUES (:id, :name, :description, :category, :type, NOW(), NOW())
           ON CONFLICT DO NOTHING`,
          { replacements: claim, transaction: t }
        );
      }
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // Only rows this migration created carry these ids; claims that already
      // existed were skipped in `up` and are left alone.
      await queryInterface.bulkDelete(
        { tableName: "Claims", schema: "security" },
        { id: { [Sequelize.Op.in]: claims.map((claim) => claim.id) } },
        { transaction: t }
      );
    });
  },
};
