import { Injectable, NotFoundException } from "@nestjs/common";
import {
  EventCompetition,
  RankingLastPlace,
  RankingSystem,
  SubEventCompetition,
} from "@badman/backend-database";
import { SubEventTypeEnum } from "@badman/utils";

const HEADERS = [
  "Naam",
  "Geslacht",
  "Gem. enkel",
  "Aantal enkel",
  "Gem. dubbel",
  "Aantal dubbel",
  "Gem. gemengd",
  "Aantal gemengd",
] as const;

type ExportResult = {
  headers: typeof HEADERS;
  rows: (string | number | undefined | null)[][];
  eventName: string;
};

type GenderAvg = {
  gender: "M" | "F";
  single?: number;
  singleCount?: number;
  double?: number;
  doubleCount?: number;
  mix?: number;
  mixCount?: number;
};

@Injectable()
export class AvgLevelService {
  async getAvgLevel(eventId: string): Promise<ExportResult> {
    const event = await EventCompetition.findByPk(eventId);
    if (!event) {
      throw new NotFoundException(`EventCompetition ${eventId} not found`);
    }

    const subEvents = await event.getSubEventCompetitions({
      order: [
        ["eventType", "ASC"],
        ["level", "ASC"],
      ],
    });

    const primarySystem = await RankingSystem.findOne({ where: { primary: true } });
    if (!primarySystem) {
      throw new NotFoundException("Primary ranking system not found");
    }

    const rows: (string | number | undefined | null)[][] = [];

    for (const subEvent of subEvents) {
      const averages = await this._calcAverages(subEvent, primarySystem.id);
      for (const avg of averages) {
        rows.push([
          `${subEvent.name} - ${subEvent.eventType}`,
          avg.gender,
          avg.single ?? "",
          avg.singleCount ?? "",
          avg.double ?? "",
          avg.doubleCount ?? "",
          avg.mix ?? "",
          avg.mixCount ?? "",
        ]);
      }
    }

    return { headers: HEADERS, rows, eventName: event.name };
  }

  private async _calcAverages(
    subEvent: SubEventCompetition,
    systemId: string
  ): Promise<GenderAvg[]> {
    const draws = await subEvent.getDrawCompetitions();
    const encounters = (await Promise.all(draws.map((d) => d.getEncounterCompetitions()))).flat();
    const games = (await Promise.all(encounters.map((e) => e.getGames()))).flat();
    const players = (await Promise.all(games.map((g) => g.getPlayers()))).flat();

    const uniqueMale = new Set(players.filter((p) => p.gender === "M").map((p) => p.id));
    const uniqueFemale = new Set(players.filter((p) => p.gender === "F").map((p) => p.id));

    const buildCountMap = (ids: Set<string>): Map<string, number> => {
      const map = new Map<string, number>();
      ids.forEach((id) => map.set(id, players.filter((p) => p.id === id).length));
      return map;
    };

    const calcForGender = async (gender: "M" | "F", ids: Set<string>): Promise<GenderAvg> => {
      const countMap = buildCountMap(ids);
      const places = await RankingLastPlace.findAll({ where: { systemId, playerId: [...ids] } });
      return { gender, ...this._weightedAvg(places, countMap) };
    };

    switch (subEvent.eventType) {
      case SubEventTypeEnum.M:
        return [await calcForGender("M", uniqueMale)];
      case SubEventTypeEnum.F:
        return [await calcForGender("F", uniqueFemale)];
      case SubEventTypeEnum.MX:
      default:
        return Promise.all([calcForGender("M", uniqueMale), calcForGender("F", uniqueFemale)]);
    }
  }

  private _weightedAvg(places: RankingLastPlace[], countMap: Map<string, number>) {
    let singleSum = 0,
      singleCount = 0;
    let doubleSum = 0,
      doubleCount = 0;
    let mixSum = 0,
      mixCount = 0;

    for (const place of places) {
      if (!place.playerId) continue;
      const weight = countMap.get(place.playerId) ?? 0;
      if (place.single) {
        singleSum += place.single * weight;
        singleCount += weight;
      }
      if (place.double) {
        doubleSum += place.double * weight;
        doubleCount += weight;
      }
      if (place.mix) {
        mixSum += place.mix * weight;
        mixCount += weight;
      }
    }

    return {
      single: singleCount ? singleSum / singleCount : undefined,
      singleCount: singleCount || undefined,
      double: doubleCount ? doubleSum / doubleCount : undefined,
      doubleCount: doubleCount || undefined,
      mix: mixCount ? mixSum / mixCount : undefined,
      mixCount: mixCount || undefined,
    };
  }
}
