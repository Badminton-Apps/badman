import path from "path";

/**
 * The season module from @badman/utils, so the seeders use the same season
 * rules as the application (spec 039, US2 scenario 5).
 *
 * The seeders are not a workspace package, so they load the built package by
 * path: build @badman/utils first (`pnpm turbo run build --filter=@badman/utils`).
 * The path is resolved from this file's compiled location, utils/dist.
 */
type SeasonModule = Pick<
  typeof import("../../../packages/utils/dist"),
  "enrollmentSeason" | "competitionSeasonWindow" | "isInCompetitionSeason"
>;

 
const seasonModule: SeasonModule = require(
  path.resolve(__dirname, "../../../../packages/utils/dist")
);

export const { enrollmentSeason, competitionSeasonWindow, isInCompetitionSeason } = seasonModule;
