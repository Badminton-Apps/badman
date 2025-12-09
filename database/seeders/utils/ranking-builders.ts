import { SeederContext } from "./seeder-context";
import { withErrorHandling } from "./error-handler";

/**
 * Find or get the primary ranking system
 */
async function findOrGetPrimaryRankingSystem(ctx: SeederContext): Promise<{ id: string }> {
  const systems = await ctx.query<{ id: string }>(
    `SELECT id FROM ranking."RankingSystems" WHERE "primary" = true LIMIT 1`
  );

  if (systems && systems.length > 0) {
    return systems[0];
  }

  throw new Error("No primary ranking system found. Please create a ranking system first.");
}

/**
 * Generate random ranking values (between 1 and 20 for test data)
 */
function generateRankingValues(options?: { single?: number; double?: number; mix?: number }): {
  single: number;
  double: number;
  mix: number;
} {
  return {
    single: options?.single ?? Math.floor(Math.random() * 20) + 1,
    double: options?.double ?? Math.floor(Math.random() * 20) + 1,
    mix: options?.mix ?? Math.floor(Math.random() * 20) + 1,
  };
}

/**
 * Create a ranking place for a player
 */
async function createRankingPlace(
  ctx: SeederContext,
  playerId: string,
  systemId: string,
  options: {
    single?: number;
    double?: number;
    mix?: number;
    rankingDate?: Date;
  } = {}
): Promise<void> {
  const { rankingDate = new Date() } = options;
  const { single, double, mix } = generateRankingValues(options);

  await ctx.rawQuery(
    `INSERT INTO ranking."RankingPlaces" 
     ("playerId", "systemId", "rankingDate", single, double, mix, "singleInactive", "mixInactive", "doubleInactive", "updatePossible", "createdAt", "updatedAt")
     VALUES (:playerId, :systemId, :rankingDate, :single, :double, :mix, false, false, false, true, NOW(), NOW())
     ON CONFLICT ("playerId", "systemId", "rankingDate") 
     DO UPDATE SET single = :single, double = :double, mix = :mix, "updatedAt" = NOW()`,
    {
      playerId,
      systemId,
      rankingDate,
      single,
      double,
      mix,
    }
  );
}

/**
 * Create a ranking last place for a player (the latest ranking)
 */
async function createRankingLastPlace(
  ctx: SeederContext,
  playerId: string,
  systemId: string,
  options: {
    single?: number;
    double?: number;
    mix?: number;
  } = {}
): Promise<void> {
  const { single, double, mix } = generateRankingValues(options);

  await ctx.rawQuery(
    `INSERT INTO ranking."RankingLastPlaces" 
     ("playerId", "systemId", single, double, mix, "singleInactive", "mixInactive", "doubleInactive", "createdAt", "updatedAt")
     VALUES (:playerId, :systemId, :single, :double, :mix, false, false, false, NOW(), NOW())
     ON CONFLICT ("playerId", "systemId") 
     DO UPDATE SET single = :single, double = :double, mix = :mix, "updatedAt" = NOW()`,
    {
      playerId,
      systemId,
      single,
      double,
      mix,
    }
  );
}

/**
 * Add ranking to a player (both RankingPlace and RankingLastPlace)
 */
async function addRankingToPlayer(
  ctx: SeederContext,
  playerId: string,
  options: {
    systemId?: string;
    single?: number;
    double?: number;
    mix?: number;
    rankingDate?: Date;
  } = {}
): Promise<void> {
  // Get or find primary ranking system
  let systemId = options.systemId;
  if (!systemId) {
    const system = await findOrGetPrimaryRankingSystem(ctx);
    systemId = system.id;
  }

  // Create both ranking place and last place
  await createRankingPlace(ctx, playerId, systemId, {
    single: options.single,
    double: options.double,
    mix: options.mix,
    rankingDate: options.rankingDate,
  });

  await createRankingLastPlace(ctx, playerId, systemId, {
    single: options.single,
    double: options.double,
    mix: options.mix,
  });
}

// Wrap with error handling
const findOrGetPrimaryRankingSystemWithErrorHandling = withErrorHandling(
  findOrGetPrimaryRankingSystem,
  "finding primary ranking system"
);
const createRankingPlaceWithErrorHandling = withErrorHandling(
  createRankingPlace,
  "creating ranking place"
);
const createRankingLastPlaceWithErrorHandling = withErrorHandling(
  createRankingLastPlace,
  "creating ranking last place"
);
const addRankingToPlayerWithErrorHandling = withErrorHandling(
  addRankingToPlayer,
  "adding ranking to player"
);

export {
  findOrGetPrimaryRankingSystemWithErrorHandling as findOrGetPrimaryRankingSystem,
  createRankingPlaceWithErrorHandling as createRankingPlace,
  createRankingLastPlaceWithErrorHandling as createRankingLastPlace,
  addRankingToPlayerWithErrorHandling as addRankingToPlayer,
};
