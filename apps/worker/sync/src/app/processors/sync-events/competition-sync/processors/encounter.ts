import { EncounterCompetition, EventCompetition, Game } from "@badman/backend-database";
import { VisualService, XmlTeamMatch, XmlTournament } from "@badman/backend-visual";
import { GameLinkType, runParallel } from "@badman/utils";
import { Logger } from "@nestjs/common";
import { isAfter, isEqual } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { Op } from "sequelize";
import { StepOptions, StepProcessor } from "../../../../processing";
import { DrawStepData } from "./draw";
import { EntryStepData } from "./entry";

export interface EncounterStepData {
  encounter: EncounterCompetition;
  internalId: number;
}

export interface EncounterStepOptions {
  newGames?: boolean;
}

export class CompetitionSyncEncounterProcessor extends StepProcessor {
  public event?: EventCompetition;
  public draws?: DrawStepData[];
  public entries?: EntryStepData[];
  private _dbEncounters: EncounterStepData[] = [];
  private encounterOptions: EncounterStepOptions;

  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly visualService: VisualService,
    options?: StepOptions & EncounterStepOptions
  ) {
    if (!options) {
      options = {};
    }
    options.logger = options.logger || new Logger(CompetitionSyncEncounterProcessor.name);
    super(options);

    this.encounterOptions = options || {};
  }

  public async process(): Promise<EncounterStepData[]> {
    await runParallel(this.draws?.map((e) => this._processEncounters(e)) ?? []);
    return this._dbEncounters;
  }

  private async _processEncounters({ draw, internalId }: DrawStepData) {
    if (!this.event?.season) {
      throw new Error("No event");
    }

    const encounters = await draw.getEncounterCompetitions({
      transaction: this.transaction,
    });

    const canChange = isAfter(new Date(), new Date(`${this.event.season}-08-01`));

    const visualMatches = (await this.visualService.getGames(
      this.visualTournament.Code,
      internalId,
      !canChange
    )) as XmlTeamMatch[];

    for (const xmlTeamMatch of visualMatches) {
      if (!xmlTeamMatch?.Team1?.Name || !xmlTeamMatch?.Team2?.Name) {
        continue;
      }

      let matchDate = null;
      if (xmlTeamMatch.MatchTime) {
        matchDate = fromZonedTime(xmlTeamMatch.MatchTime, "Europe/Brussels");
      }

      const dbEncounters = encounters.filter((r) => r.visualCode === `${xmlTeamMatch.Code}`);
      let dbEncounter: EncounterCompetition | null = null;

      if (dbEncounters.length === 1) {
        dbEncounter = dbEncounters[0];
      } else if (dbEncounters.length > 1) {
        // We have multiple encounters with the same visual code
        const [first, ...rest] = dbEncounters;
        dbEncounter = first;

        this.logger.warn("Having multiple? Removing old");
        await this._destroyEncounters(rest);
      }

      const team1 = this.entries?.find((e) => e.xmlTeamName == xmlTeamMatch?.Team1?.Name)?.entry
        ?.team;
      const team2 = this.entries?.find((e) => e.xmlTeamName == xmlTeamMatch?.Team2?.Name)?.entry
        ?.team;

      if (!team1) {
        this.logger.warn(`Team ${xmlTeamMatch?.Team1?.Name} not found`);
      }

      if (!team2) {
        this.logger.warn(`Team ${xmlTeamMatch?.Team2?.Name} not found`);
      }

      if (!dbEncounter) {
        // Match by teams + draw + date. Two encounters for the same pair in a
        // 3x/4x draw have different MatchTimes, so the date is a natural unique
        // key and no in-memory exclusion is needed.
        // If toornoi has no MatchTime yet (unscheduled), fall back to the first
        // unmatched encounter for that pair.
        dbEncounter =
          encounters.find((e) => {
            if (e.homeTeamId !== team1?.id || e.awayTeamId !== team2?.id || e.drawId !== draw.id) {
              return false;
            }

            if (matchDate != null) {
              const matches = e.date != null && isEqual(e.date, matchDate);
              this.logger.debug(
                `[${xmlTeamMatch.Code}] date check: toornoi=${matchDate.toISOString()} db=${e.date != null ? new Date(e.date).toISOString() : "null"} match=${matches} (enc ${e.id})`
              );
              return matches;
            }

            // No MatchTime from toornoi — fall back to first unconsumed row for this pair
            const unconsumed = !this._dbEncounters.some((d) => d.encounter.id === e.id);
            this.logger.debug(
              `[${xmlTeamMatch.Code}] no matchTime — fallback to unconsumed enc ${e.id}: ${unconsumed}`
            );
            return unconsumed;
          }) || null;

        if (!dbEncounter) {
          this.logger.log(
            `[${xmlTeamMatch.Code}] no DB match found — creating new encounter (${team1?.id} vs ${team2?.id}, date=${matchDate?.toISOString() ?? "null"})`
          );
          dbEncounter = await new EncounterCompetition({
            drawId: draw.id,
            visualCode: xmlTeamMatch.Code,
            date: matchDate,
            homeTeamId: team1?.id,
            awayTeamId: team2?.id,
          }).save({ transaction: this.transaction });
        } else {
          this.logger.debug(
            `[${xmlTeamMatch.Code}] matched existing enc ${dbEncounter.id} — updating visualCode`
          );
          dbEncounter.visualCode = xmlTeamMatch.Code;
          await dbEncounter.save({ transaction: this.transaction });
        }
      }

      // Update date if needed
      if (dbEncounter.date !== matchDate) {
        dbEncounter.date = matchDate;
        await dbEncounter.save({ transaction: this.transaction });
      }

      // VisualService normalises Sets.Set to an array; pick the first set's
      // score (matches the previous "single-set only" behaviour).
      const firstSet = xmlTeamMatch.Sets?.Set?.[0];
      if (firstSet) {
        dbEncounter.homeScore = firstSet.Team1;
        dbEncounter.awayScore = firstSet.Team2;
      }

      dbEncounter.homeTeamId = team1?.id;
      dbEncounter.awayTeamId = team2?.id;
      await dbEncounter.save({ transaction: this.transaction });

      this._dbEncounters.push({
        encounter: dbEncounter,
        internalId: parseInt(xmlTeamMatch.Code, 10),
      });
    }

    // Remove draw that are not in the xml
    const removedEncounters = encounters.filter((e) => e.visualCode == null);
    // remove wrong encounters
    for (const encounter of encounters) {
      if (!this._dbEncounters.find((e) => e.encounter.id === encounter.id)) {
        this.logger.log(`Enocunter existed but was removed`);
        removedEncounters.push(encounter);
      }
    }

    await this._destroyEncounters(removedEncounters);
  }

  private async _destroyEncounters(encounter: EncounterCompetition[]) {
    if (encounter.length === 0) {
      return;
    }

    // Protect encounters that have ANY game with locally-entered data:
    //   - set scores filled (normal match played locally), OR
    //   - a winner marked (walkover / retirement entered locally, no sets)
    // These must survive a sync that would otherwise orphan the encounter.
    const scoredLinkIds = (
      await Game.findAll({
        where: {
          linkType: GameLinkType.COMPETITION,
          linkId: { [Op.in]: encounter.map((e) => e.id) },
          [Op.or]: [
            { set1Team1: { [Op.ne]: null } },
            { set1Team2: { [Op.ne]: null } },
            { winner: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: 0 }] } },
          ],
        },
        attributes: ["linkId"],
        transaction: this.transaction,
      })
    ).map((g) => g.linkId);

    const protectedIds = new Set(scoredLinkIds);
    const safeToDestroy = encounter.filter((e) => !protectedIds.has(e.id));

    if (protectedIds.size > 0) {
      this.logger.warn(
        `Skipping destroy for ${protectedIds.size} encounter(s) with locally-scored games: ${Array.from(protectedIds).join(", ")}`
      );
    }

    if (safeToDestroy.length === 0) {
      return;
    }

    await Game.destroy({
      where: {
        linkType: GameLinkType.COMPETITION,
        linkId: {
          [Op.in]: safeToDestroy.map((e) => e.id),
        },
      },
      transaction: this.transaction,
    });

    await EncounterCompetition.destroy({
      where: {
        id: {
          [Op.in]: safeToDestroy.map((e) => e.id),
        },
      },
      transaction: this.transaction,
    });

    // remove from db encounters
    this._dbEncounters = this._dbEncounters.filter(
      (e) => !safeToDestroy.find((r) => r.id === e.encounter.id)
    );
  }
}
