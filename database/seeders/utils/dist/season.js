"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInCompetitionSeason = exports.competitionSeasonWindow = exports.enrollmentSeason = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const seasonModule = require(path_1.default.resolve(__dirname, "../../../../packages/utils/dist"));
(exports.enrollmentSeason = seasonModule.enrollmentSeason),
  (exports.competitionSeasonWindow = seasonModule.competitionSeasonWindow),
  (exports.isInCompetitionSeason = seasonModule.isInCompetitionSeason);
