import { Injectable, Logger } from "@nestjs/common";
import { Page } from "puppeteer";
import { Transaction } from "sequelize";
import { EncounterCompetition, Game } from "@badman/backend-database";
import { getPage, acceptCookies, signIn } from "@badman/backend-pupeteer";
import { SubEventTypeEnum } from "@badman/utils";
import {
  GameAssemblyService,
  GameDataService,
  FormMappingService,
  ToernooiFormService,
  ToernooiNavigationService,
  ToernooiPlayerService,
  ToernooiScoreService,
} from "./services";

export interface BrowserConfig {
  headless: boolean;
  username: string;
  password: string;
  hangBeforeBrowserCleanup: boolean;
}

@Injectable()
export class EnterScoresBrowserService {
  private readonly logger = new Logger(EnterScoresBrowserService.name);
  private page: Page | null = null;

  constructor(
    private readonly gameAssemblyService: GameAssemblyService,
    private readonly gameDataService: GameDataService,
    private readonly formMappingService: FormMappingService,
    private readonly toernooiFormService: ToernooiFormService,
    private readonly toernooiNavigationService: ToernooiNavigationService,
    private readonly toernooiPlayerService: ToernooiPlayerService,
    private readonly toernooiScoreService: ToernooiScoreService
  ) {}

  async initializeBrowser(config: BrowserConfig): Promise<Page> {
    this.page = await getPage(config.headless, [
      "--disable-features=PasswordManagerEnabled,AutofillKeyBoardAccessoryView,AutofillEnableAccountWalletStorage",
      "--disable-save-password-bubble",
      "--disable-credentials-enable-service",
      "--disable-credential-saving",
      "--password-store=basic",
      "--no-default-browser-check",
    ]);

    if (!this.page) {
      throw new Error("Failed to create browser page");
    }

    // Increase default timeout to 30 seconds to handle slow network conditions
    this.page.setDefaultTimeout(30000);
    await this.page.setViewport({ width: 1691, height: 1337 });

    return this.page;
  }

  async acceptCookies(): Promise<void> {
    if (!this.page) throw new Error("Browser not initialized");

    try {
      await acceptCookies({ page: this.page, timeout: 20000 }, { logger: this.logger });
    } catch (error: any) {
      const isTimeoutError =
        error?.message?.includes("timeout") ||
        error?.message?.includes("Navigation timeout") ||
        error?.name === "TimeoutError";

      if (isTimeoutError) {
        this.logger.warn(
          "❌ Cookie acceptance timeout (continuing anyway):",
          error?.message || error
        );
        // Don't throw timeout errors - continue with the process
      } else {
        this.logger.error("❌ Cookie acceptance failed:", error?.message || error);

        // Check if this is a critical error that should stop the job
        if (error?.name === "CookieAcceptanceError") {
          throw new Error(
            `Failed to accept cookies: ${error?.message}. This may indicate the website is down or has changed.`
          );
        }

        // For other non-timeout errors, re-throw to maintain existing behavior
        throw error;
      }
    }
  }

  async signIn(username: string, password: string): Promise<void> {
    if (!this.page) throw new Error("Browser not initialized");

    try {
      await signIn(
        { page: this.page, timeout: 20000 },
        { username, password, logger: this.logger }
      );
    } catch (error: any) {
      const isTimeoutError =
        error?.message?.includes("timeout") ||
        error?.message?.includes("Navigation timeout") ||
        error?.name === "TimeoutError";

      if (isTimeoutError) {
        const profileMenu = await this.page.waitForSelector("#profileMenu", { timeout: 5000 });
        if (!profileMenu) {
          throw new Error("Sign in timeout and user not signed in");
        }
      }
    }
  }

  async enterEditMode(encounter: EncounterCompetition): Promise<void> {
    if (!this.page) throw new Error("Browser not initialized");

    await this.toernooiNavigationService.navigateToMatchEditPage(this.page, encounter);
  }

  async clearFields(): Promise<void> {
    if (!this.page) throw new Error("Browser not initialized");

    await this.toernooiFormService.clearAllFields(this.page);
  }

  async enterGames(encounter: EncounterCompetition, transaction: Transaction): Promise<void> {
    if (!this.page) throw new Error("Browser not initialized");

    const { games, assemblies } = encounter;
    const teamType: SubEventTypeEnum = encounter.home?.type as SubEventTypeEnum;

    if (!teamType) {
      this.logger.error("No teamType found for encounter, cannot process games");
      return;
    }

    // Match games to assembly positions
    const gameAssemblyMap = this.gameAssemblyService.matchGamesToAssembly(
      games,
      assemblies,
      teamType,
      encounter
    );

    // Get ordered positions for processing
    const orderedPositions = this.gameAssemblyService.getAssemblyPositionsInOrder(teamType);

    // Process each game in the correct order
    for (const assemblyPosition of orderedPositions) {
      const gameEntry = Array.from(gameAssemblyMap.entries()).find(
        ([game, data]) => data.assemblyPosition === assemblyPosition
      );

      if (!gameEntry) {
        continue;
      }

      const [game] = gameEntry;
      await this.processGame(game, teamType, assemblyPosition, transaction);
    }

    // Validate and refill any empty player inputs
    const processedGames = Array.from(gameAssemblyMap.keys());
    await this.toernooiFormService.validateAndRefillPlayerInputs(this.page, processedGames);
  }

  private async processGame(
    game: Game,
    teamType: SubEventTypeEnum,
    assemblyPosition: string,
    transaction: Transaction
  ): Promise<void> {
    // Find the correct form row for this assembly position
    const matchId = await this.formMappingService.findGameRowByAssemblyPosition(
      this.page!,
      teamType,
      assemblyPosition
    );

    if (!matchId) {
      throw new Error(`Could not find empty game row for assembly position ${assemblyPosition}`);
    }

    // Update game's visual code and save to database
    await this.gameDataService.saveGameVisualCode(game, matchId, transaction);

    // Fix player order for MX doubles if needed
    await this.gameDataService.fixMixedDoublesPlayerOrder(
      game,
      teamType,
      assemblyPosition,
      transaction
    );

    // Select players for this game
    await this.selectPlayersForGame(game, matchId);

    // Enter scores for this game
    await this.enterScoresForGame(game, matchId);

    // Enter winner if available
    if (this.gameDataService.hasValidWinner(game)) {
      await this.toernooiScoreService.selectWinner(this.page!, matchId, game.winner);
    }
  }

  private async selectPlayersForGame(game: Game, matchId: string): Promise<void> {
    const players = this.gameDataService.getPlayersForGame(game);

    for (const [position, player] of Object.entries(players)) {
      if (player && player.memberId) {
        await this.toernooiPlayerService.selectPlayer(
          this.page!,
          player.memberId,
          position as "t1p1" | "t1p2" | "t2p1" | "t2p2",
          matchId
        );
      }
    }
  }

  private async enterScoresForGame(game: Game, matchId: string): Promise<void> {
    const scores = this.gameDataService.getGameScores(game);

    for (const { set, scores: scoreString } of scores) {
      await this.toernooiScoreService.enterScores(this.page!, set, scoreString, matchId);
    }
  }

  async enterGameLeader(gameLeaderName: string): Promise<void> {
    if (!this.page) throw new Error("Browser not initialized");

    await this.toernooiFormService.enterGameLeader(this.page, gameLeaderName);
  }

  async enterShuttle(shuttle: string): Promise<void> {
    if (!this.page) throw new Error("Browser not initialized");

    await this.toernooiFormService.enterShuttle(this.page, shuttle);
  }

  async enterStartHour(startHour: string): Promise<void> {
    if (!this.page) throw new Error("Browser not initialized");

    await this.toernooiFormService.enterStartHour(this.page, startHour);
  }

  async enterEndHour(endHour: string): Promise<void> {
    if (!this.page) throw new Error("Browser not initialized");

    await this.toernooiFormService.enterEndHour(this.page, endHour);
  }

  async enableInputValidation(): Promise<void> {
    if (!this.page) throw new Error("Browser not initialized");

    await this.toernooiFormService.enableInputValidation(this.page);
  }

  async validateRowMessages(): Promise<void> {
    if (!this.page) throw new Error("Browser not initialized");

    await this.toernooiFormService.validateRowMessages(this.page);
  }

  async clickSaveButton(): Promise<void> {
    if (!this.page) throw new Error("Browser not initialized");

    await this.toernooiNavigationService.clickSaveButton(this.page);
  }

  async cleanup(hangBeforeBrowserCleanup: boolean): Promise<void> {
    try {
      if (!hangBeforeBrowserCleanup && this.page) {
        this.logger.log("Closing page...");
        await this.page.close();
        this.logger.log("Page cleanup completed");
        this.page = null;
      }
    } catch (error) {
      this.logger.error("Error during page cleanup:", error?.message || error);
    }
  }

  getCurrentPage(): Page | null {
    return this.page;
  }
}
