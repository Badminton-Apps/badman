import { Injectable, Logger } from "@nestjs/common";
import { Page } from "puppeteer";
import { SubEventTypeEnum } from "@badman/utils";

export interface FormHeaderConfig {
  [SubEventTypeEnum.M]: string[];
  [SubEventTypeEnum.F]: string[];
  [SubEventTypeEnum.MX]: string[];
}

@Injectable()
export class FormMappingService {
  private readonly logger = new Logger(FormMappingService.name);

  private readonly TEAM_FORM_HEADERS: FormHeaderConfig = {
    [SubEventTypeEnum.M]: [
      "HD1",
      "HD2",
      "HD3",
      "HD4", // Doubles headers
      "HE1",
      "HE2",
      "HE3",
      "HE4", // Singles headers
    ],
    [SubEventTypeEnum.F]: [
      "DD1",
      "DD2",
      "DD3",
      "DD4", // Doubles headers
      "DE1",
      "DE2",
      "DE3",
      "DE4", // Singles headers
    ],
    [SubEventTypeEnum.MX]: [
      "HD",
      "DD",
      "HE1",
      "DE1", // Mixed headers
      "HE2",
      "DE2",
      "GD1",
      "GD2",
    ],
  };

  private readonly ASSEMBLY_POSITION_ORDER: Partial<{ [key in SubEventTypeEnum]: string[] }> = {
    [SubEventTypeEnum.M]: [
      "double1",
      "double2",
      "double3",
      "double4",
      "single1",
      "single2",
      "single3",
      "single4",
    ],
    [SubEventTypeEnum.F]: [
      "double1",
      "double2",
      "double3",
      "double4",
      "single1",
      "single2",
      "single3",
      "single4",
    ],
    [SubEventTypeEnum.MX]: [
      "double1",
      "double2",
      "single1",
      "single3",
      "single2",
      "single4",
      "double3",
      "double4",
    ],
  };

  getHeaderForAssemblyPosition(
    teamType: SubEventTypeEnum,
    assemblyPosition: string
  ): string | null {
    const positionOrder = this.ASSEMBLY_POSITION_ORDER[teamType];
    const formHeaders = this.TEAM_FORM_HEADERS[teamType];

    if (!positionOrder || !formHeaders) {
      return null;
    }

    const positionIndex = positionOrder.indexOf(assemblyPosition);
    if (positionIndex === -1) {
      return null;
    }

    return formHeaders[positionIndex] || null;
  }

  async findGameRowByAssemblyPosition(
    page: Page,
    teamType: SubEventTypeEnum,
    assemblyPosition: string
  ): Promise<string | null> {
    try {
      const expectedHeader = this.getHeaderForAssemblyPosition(teamType, assemblyPosition);
      if (!expectedHeader) {
        return null;
      }

      // Find matching rows with the expected header
      const matchingRows = await page.$$eval(
        "tr",
        (rows, headerText) => {
          const results: { matchId: string; rowIndex: number }[] = [];
          const allHeaders: string[] = [];

          rows.forEach((row, index) => {
            const headerCells = Array.from(row.querySelectorAll("th"));

            if (headerCells.length > 0) {
              headerCells.forEach((cell) => {
                const text = cell.textContent?.trim();
                if (text) allHeaders.push(text);
              });
            }

            for (const headerCell of headerCells) {
              if (headerCell.textContent?.trim() === headerText) {
                const matchInputs = row.querySelectorAll('select[id^="match_"]');
                if (matchInputs.length > 0) {
                  const firstInput = matchInputs[0] as HTMLSelectElement;
                  const match = firstInput.id.match(/^match_(.+)_(t1p1|t1p2|t2p1|t2p2)$/);
                  if (match) {
                    results.push({ matchId: match[1], rowIndex: index });
                  }
                }
                break;
              }
            }
          });

          return { results, allHeaders: [...new Set(allHeaders)] };
        },
        expectedHeader
      );

      if (matchingRows.results.length === 0) {
        return null;
      }

      const selectedRow = matchingRows.results[0];

      // Verify that this row is empty
      const isEmpty = await this.isGameRowEmpty(page, selectedRow.matchId);
      if (!isEmpty) {
        return null;
      }

      return selectedRow.matchId;
    } catch (error) {
      return null;
    }
  }

  private async isGameRowEmpty(page: Page, matchId: string): Promise<boolean> {
    try {
      const playerPositions = ["t1p1", "t1p2", "t2p1", "t2p2"];
      const nonEmptySelectors: string[] = [];

      for (const position of playerPositions) {
        const selectorId = `match_${matchId}_${position}`;
        const selector = await page.$(`#${selectorId}`);

        if (selector) {
          const selectedValue = await page.evaluate((el) => {
            const select = el as HTMLSelectElement;
            return select.value;
          }, selector);

          if (selectedValue && selectedValue !== "0") {
            nonEmptySelectors.push(`${selectorId}="${selectedValue}"`);
          }
        }
      }

      if (nonEmptySelectors.length > 0) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}
