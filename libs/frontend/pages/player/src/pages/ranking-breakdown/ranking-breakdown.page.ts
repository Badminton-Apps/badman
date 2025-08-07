import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Signal,
} from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { MatOptionModule } from "@angular/material/core";
import { MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatSelectModule } from "@angular/material/select";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { RankingSystemService } from "@badman/frontend-graphql";
import { Player, RankingSystem } from "@badman/frontend-models";
import { SeoService } from "@badman/frontend-seo";
import { TranslatePipe } from "@ngx-translate/core";
import moment from "moment";
import { injectDestroy } from "ngxtension/inject-destroy";
import { injectParams } from "ngxtension/inject-params";
import { injectQueryParams } from "ngxtension/inject-query-params";
import { injectRouteData } from "ngxtension/inject-route-data";
import { takeUntil } from "rxjs/operators";
import { BreadcrumbService } from "xng-breadcrumb";
import { ListGamesComponent, PeriodSelectionComponent } from "./components";
import { RankingEvolutionComponent } from "./components/ranking-evolution";
import { RankingBreakdownService } from "./services/ranking-breakdown.service";
import { Ranking } from "@badman/utils";

@Component({
  templateUrl: "./ranking-breakdown.page.html",
  styleUrls: ["./ranking-breakdown.page.scss"],
  imports: [
    ReactiveFormsModule,
    RouterModule,
    TranslatePipe,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatDialogModule,
    MatProgressBarModule,
    ListGamesComponent,
    PeriodSelectionComponent,
    RankingEvolutionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankingBreakdownPageComponent {
  // Dependencies
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private breadcrumbService = inject(BreadcrumbService);
  private seoService = inject(SeoService);
  private destroy$ = injectDestroy();
  systemService = inject(RankingSystemService);
  private readonly breakdownService = inject(RankingBreakdownService);

  // route
  filter = this.breakdownService.filter;

  // Computed
  player = injectRouteData<Player>("player");
  id = injectParams("id");
  type = injectParams("type") as Signal<Ranking>;
  system = computed(() => this.systemService.system() as RankingSystem);

  // specific computed value so the effect only triggers when the end date changes
  periodEndRoute = injectQueryParams("end");
  includedIgnored = injectQueryParams("includedIgnored");
  includedUpgrade = injectQueryParams("includedUpgrade");
  includedDowngrade = injectQueryParams("includedDowngrade");
  includeOutOfScopeUpgrade = injectQueryParams("includeOutOfScopeUpgrade");
  includeOutOfScopeDowngrade = injectQueryParams("includeOutOfScopeDowngrade");
  includeOutOfScopeWonGames = injectQueryParams("includeOutOfScopeWonGames");

  // Games
  constructor() {
    this.seoService.update({
      title: `Ranking breakdown ${this.player()?.fullName}`,
      description: `Ranking breakdown ${this.player()?.fullName}`,
      type: "website",
      keywords: ["ranking", "breakdown", "player", "badminton"],
    });
    this.breadcrumbService.set("player/:id", `${this.player()?.fullName}`);
    this.breakdownService.state.reset();

    effect(() => {
      this._loadFilter();
    });

    this.filter.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this._updateUrl();
    });
  }

  private _loadFilter() {
    const end = this.periodEndRoute() ?? null;

    // Default we take next update interval, if no end is given
    const endPeriod =
      (end ?? null) == null
        ? moment(this.systemService.system()?.calculationLastUpdate)
        : moment(end);
    const startPeriod = endPeriod
      .clone()
      .subtract(this.systemService.system()?.periodAmount, this.systemService.system()?.periodUnit);
    const gamePeriod = startPeriod
      .clone()
      .subtract(
        this.systemService.system()?.updateIntervalAmount,
        this.systemService.system()?.updateIntervalUnit
      );

    const nextPeriod = startPeriod
      .clone()
      .add(
        this.systemService.system()?.calculationIntervalAmount,
        this.systemService.system()?.calculationIntervalUnit
      );

    this.breakdownService.filter.patchValue({
      systemId: this.system().id,
      playerId: this.player()?.id,
      gameType: this.type(),
      start: startPeriod,
      end: endPeriod,
      game: gamePeriod,
      next: nextPeriod,
      includedIgnored: this.includedIgnored() === "true",
      includedUpgrade: (this.includedUpgrade() ?? "true") === "true",
      includedDowngrade: (this.includedDowngrade() ?? "true") === "true",
      includeOutOfScopeUpgrade: this.includeOutOfScopeUpgrade() === "true",
      includeOutOfScopeDowngrade: this.includeOutOfScopeDowngrade() === "true",
      includeOutOfScopeWonGames: this.includeOutOfScopeWonGames() === "true",
    });
  }

  private _updateUrl() {
    const systemLastUpdate = moment(this.systemService.system()?.calculationLastUpdate);

    const queryParams: { [key: string]: string | boolean | null | undefined } = {
      includedIgnored: this.breakdownService.filter.value.includedIgnored ? true : undefined,
      includedUpgrade: this.breakdownService.filter.value.includedUpgrade ? undefined : false,
      includedDowngrade: this.breakdownService.filter.value.includedDowngrade ? undefined : false,
      includeOutOfScopeUpgrade: this.breakdownService.filter.value.includeOutOfScopeUpgrade
        ? true
        : undefined,
      includeOutOfScopeDowngrade: this.breakdownService.filter.value.includeOutOfScopeDowngrade
        ? true
        : undefined,
      includeOutOfScopeWonGames: this.breakdownService.filter.value.includeOutOfScopeWonGames
        ? true
        : undefined,
      end: systemLastUpdate.isSame(this.breakdownService.filter.value.end, "day")
        ? null
        : this.breakdownService.filter.value.end?.format("YYYY-MM-DD"),
    };

    const url =
      this.breakdownService.filter.value.gameType !== this.type()
        ? ["..", this.breakdownService.filter.value.gameType]
        : [];

    // check if the current url is the same as the new url
    // if so, don't navigate
    const currentUrl = this.router.url;
    const newUrl = this.router
      .createUrlTree(url, {
        relativeTo: this.route,
        queryParams,
        queryParamsHandling: "merge",
      })
      .toString();

    if (currentUrl == newUrl) {
      return;
    }

    this.router.navigate(url, {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: "merge",
    });
  }
}
