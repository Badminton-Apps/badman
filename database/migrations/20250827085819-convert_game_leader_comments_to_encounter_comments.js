"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (t) => {
      // 1. Query all game leader comments, organized by linkId with latest first
      const gameLeaderComments = await queryInterface.sequelize.query(
        `
        SELECT c.*, 
               ROW_NUMBER() OVER (PARTITION BY c."linkId" ORDER BY c."createdAt" DESC) as rn
        FROM public."Comments" c
        WHERE c."linkType" = 'game_leader_comment'
        ORDER BY c."linkId", c."createdAt" DESC
      `,
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction: t,
        }
      );

      // 2. Get only the most recent comment per linkId (encounter)
      const latestComments = gameLeaderComments.filter((comment) => comment.rn === 1);

      // 3. Update encounters with the latest comment message
      for (const comment of latestComments) {
        await queryInterface.sequelize.query(
          `
          UPDATE event."EncounterCompetitions" 
          SET "gameLeaderComment" = :message
          WHERE id = :encounterId
        `,
          {
            replacements: {
              message: comment.message,
              encounterId: comment.linkId,
            },
            transaction: t,
          }
        );
      }

      // 4. Delete all game leader comments after conversion
      if (gameLeaderComments.length > 0) {
        const commentIds = gameLeaderComments.map((c) => c.id);
        await queryInterface.sequelize.query(
          `
          DELETE FROM public."Comments" 
          WHERE id IN (:commentIds)
        `,
          {
            replacements: { commentIds },
            transaction: t,
          }
        );
      }
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (t) => {
      // 1. Query encounters that have game leader comments
      const encountersWithComments = await queryInterface.sequelize.query(
        `
        SELECT ec.id as "encounterId", 
               ec."gameLeaderComment" as message,
               ec."gameLeaderId",
               p."clubId"
        FROM event."EncounterCompetitions" ec
        LEFT JOIN public."Players" p ON ec."gameLeaderId" = p.id
        WHERE ec."gameLeaderComment" IS NOT NULL 
          AND ec."gameLeaderComment" != ''
      `,
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction: t,
        }
      );

      // 2. Create comment records from encounter comments
      for (const encounter of encountersWithComments) {
        await queryInterface.sequelize.query(
          `
          INSERT INTO public."Comments" (
            id, message, "linkId", "linkType", "playerId", "clubId", 
            "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), 
            :message, 
            :encounterId, 
            'game_leader_comment',
            :gameLeaderId,
            :clubId,
            NOW(),
            NOW()
          )
        `,
          {
            replacements: {
              message: encounter.message,
              encounterId: encounter.encounterId,
              gameLeaderId: encounter.gameLeaderId,
              clubId: encounter.clubId,
            },
            transaction: t,
          }
        );
      }

      // 3. Clear the game leader comments from encounters
      await queryInterface.sequelize.query(
        `
        UPDATE event."EncounterCompetitions" 
        SET "gameLeaderComment" = NULL
        WHERE "gameLeaderComment" IS NOT NULL
      `,
        { transaction: t }
      );
    });
  },
};
