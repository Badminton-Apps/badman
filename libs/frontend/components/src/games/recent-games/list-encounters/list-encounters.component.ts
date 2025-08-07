import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  OnInit,
  PLATFORM_ID,
  TransferState,
  effect,
  inject,
  input,
  signal,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatListModule } from "@angular/material/list";
import { RouterModule } from "@angular/router";
import { EncounterCompetition, Game, GamePlayer, Team } from "@badman/frontend-models";
import { transferState } from "@badman/frontend-utils";
import { GameType, gameLabel } from "@badman/utils";
import { TranslatePipe } from "@ngx-translate/core";
import { Apollo, gql } from "apollo-angular";
import moment from "moment";
import { MomentModule } from "ngx-moment";
import { injectDestroy } from "ngxtension/inject-destroy";
import { map, takeUntil } from "rxjs";
import { LoadingBlockComponent } from "../../../loading-block";

@Component({
  imports: [
    CommonModule,
    RouterModule,
    TranslatePipe,
    MomentModule,
    MatButtonModule,
    MatListModule,
    LoadingBlockComponent,
  ],
  selector: "badman-list-encounters",
  templateUrl: "./list-encounters.component.html",
  styleUrls: ["./list-encounters.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListEncountersComponent implements OnInit, OnChanges {
  private apollo = inject(Apollo);
  private stateTransfer = inject(TransferState);
  private platformId = inject(PLATFORM_ID);
  private destroy$ = injectDestroy();

  clubId = input<string>();
  teams = input<Team | Team[]>();

  teamids = signal<string[]>([]);
  recentEncounters = signal<EncounterCompetition[]>([]);

  constructor() {
    effect(() => {
      this._loadRecentEncounterForTeams();
    });
  }

  ngOnInit(): void {
    this._setIds();
  }

  ngOnChanges(): void {
    this._setIds();
  }

  private _setIds() {
    const teamids: string[] = [];

    if (this.teams() instanceof Team) {
      teamids.push((this.teams() as Team).id);
    }

    if (this.teams() instanceof Array) {
      teamids.push(...(this.teams() as Team[]).map((t) => t.id ?? ""));
    }

    this.teamids.set(teamids);
  }

  getPlayer(game: Game, player: number, team: number) {
    return game.players?.find((p) => p.player === player && p.team === team);
  }

  getGameLabel(game: Game, encounter: EncounterCompetition) {
    // if game type is M the first 4 games are doubles male, the next 4 are singles male
    // if game type is F the first 4 games are doubles female, the next 4 are singles female
    // if the gametype is MX then first is doubles male, second doubles female, next 2 are singles male, next 2 singles female, next 2 are doubles mixed

    if (!game || !encounter.drawCompetition?.subEventCompetition?.eventType) {
      return null;
    }

    const gameType = encounter.drawCompetition?.subEventCompetition?.eventType;
    const gameNumber = game.order ?? 0;

    return gameLabel(gameType, gameNumber) as string[];
  }

  getRanking(player: GamePlayer, game: Game) {
    if (!game.gameType) return null;

    switch (game.gameType) {
      case GameType.S:
        return player?.single;
      case GameType.D:
        return player?.double;
      case GameType.MX:
        return player?.mix;
    }
  }

  private _loadRecentEncounterForTeams() {
    this.apollo
      .query<{
        encounterCompetitions: {
          rows: Partial<EncounterCompetition>[];
        };
      }>({
        query: gql`
          query RecentGames($where: JSONObject, $take: Int, $order: [SortOrderType!]) {
            encounterCompetitions(where: $where, order: $order, take: $take) {
              rows {
                id
                date
                home {
                  id
                  name
                }
                away {
                  id
                  name
                }
                homeScore
                awayScore
                drawCompetition {
                  id
                  subEventCompetition {
                    id
                    eventType
                    eventId
                  }
                }
              }
            }
          }
        `,
        variables: {
          where: {
            date: {
              $lte: moment().format("YYYY-MM-DD"),
            },
            $or: [
              {
                homeTeamId: this.teamids(),
              },
              {
                awayTeamId: this.teamids(),
              },
            ],
          },
          order: [
            {
              direction: "desc",
              field: "date",
            },
          ],
          take: 10,
        },
      })
      .pipe(
        takeUntil(this.destroy$),
        transferState(
          `recentKey-${this.teamids().join(",") ?? this.clubId()}`,
          this.stateTransfer,
          this.platformId
        ),
        map((result) => {
          return (
            result?.data.encounterCompetitions.rows?.map(
              (encounter) => new EncounterCompetition(encounter)
            ) ?? []
          );
        })
      )
      .subscribe((encounters) => {
        this.recentEncounters.set(encounters);
      });
  }
}
