/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // select comments wher linkType is home_comment or away_comment

        const comments = await queryInterface.sequelize.query(
          `SELECT * FROM "Comments" WHERE "linkType" = 'home_comment' OR "linkType" = 'away_comment'`,
          { type: sequelize.QueryTypes.SELECT, transaction: t },
        );

        console.log(`Found ${comments?.length} comments`);

        const encounterChanges = await queryInterface.sequelize.query(
          `SELECT * FROM "event"."EncounterChanges" where id in ('${comments
            ?.map((comment) => comment.linkId)
            .join("','")}')`,
          { type: sequelize.QueryTypes.SELECT, transaction: t },
        );

        console.log(`Found ${encounterChanges?.length} encounter changes`);

        // update the comments to use the encounterId instead of the encounterChangeId
        for (const comment of comments?.filter((c) => c.linkType === 'home_comment')) {
          const encounter = encounterChanges.find((encounter) => encounter.id === comment.linkId);
          if (encounter) {
            await queryInterface.sequelize.query(
              `UPDATE "Comments" SET "linkId" = '${encounter.id}', "linkType" = 'home_comment_change' WHERE id = '${comment.id}'`,
              { transaction: t },
            );
          }
        }
        // update the comments to use the encounterId instead of the encounterChangeId
        for (const comment of comments?.filter((c) => c.linkType === 'away_comment')) {
          const encounter = encounterChanges.find((encounter) => encounter.id === comment.linkId);
          if (encounter) {
            await queryInterface.sequelize.query(
              `UPDATE "Comments" SET "linkId" = '${encounter.id}', "linkType" = 'away_comment_change' WHERE id = '${comment.id}'`,
              { transaction: t },
            );
          }
        }
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        const comments = await queryInterface.sequelize.query(
          `SELECT * FROM "Comments" WHERE "linkType" = 'home_comment_change' OR "linkType" = 'away_comment_change'`,
          { type: sequelize.QueryTypes.SELECT, transaction: t },
        );

        console.log(`Found ${comments?.length} comments`);

        const encounters = await queryInterface.sequelize.query(
          `SELECT * FROM "event"."EncounterCompetitions" where id in ('${comments
            ?.map((comment) => comment.linkId)
            .join("','")}')`,
          { type: sequelize.QueryTypes.SELECT, transaction: t },
        );

        console.log(`Found ${encounters?.length} encounters`);

        if (encounters?.length === 0) {
          return;
        }

        const encounterChanges = await queryInterface.sequelize.query(
          `SELECT * FROM "event"."EncounterChanges" where "encounterId" in ('${encounters
            ?.map((encounter) => encounter.id)
            .join("','")}')`,
          { type: sequelize.QueryTypes.SELECT, transaction: t },
        );

        console.log(`Found ${encounterChanges?.length} encounter changes`);

        // update the comments to use the encounterChangeId instead of the encounterId
        for (const comment of comments?.filter((c) => c.linkType === 'home_comment_change')) {
          const encounterChange = encounterChanges.find(
            (encounter) => encounter.encounterId === comment.linkId,
          );
          if (encounterChange) {
            await queryInterface.sequelize.query(
              `UPDATE "Comments" SET "linkId" = '${encounterChange.id}', "linkType" = 'home_comment' WHERE id = '${comment.id}'`,
              { transaction: t },
            );
          }
        }
        // update the comments to use the encounterChangeId instead of the encounterId
        for (const comment of comments?.filter((c) => c.linkType === 'away_comment_change')) {
          const encounterChange = encounterChanges.find(
            (encounter) => encounter.encounterId === comment.linkId,
          );
          if (encounterChange) {
            await queryInterface.sequelize.query(
              `UPDATE "Comments" SET "linkId" = '${encounterChange.id}', "linkType" = 'away_comment' WHERE id = '${comment.id}'`,
              { transaction: t },
            );
          }
        }
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
