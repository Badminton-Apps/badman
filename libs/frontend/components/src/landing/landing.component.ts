import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit,
} from '@angular/core';
import { AuthenticateService, LoggedinUser } from '@badman/frontend-auth';
import { VERSION_INFO } from '@badman/frontend-html-injects';
import { Team } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, switchMap } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { UpcomingGamesComponent } from '../games';
import { RankingTableComponent } from '../ranking-table';
import { BetaComponent, ProfileOverviewComponent } from './components';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'badman-landing',
  standalone: true,
  imports: [
    CommonModule,
    BetaComponent,

    TranslateModule,
    MatIconModule,

    ProfileOverviewComponent,
    UpcomingGamesComponent,
    RankingTableComponent,
  ],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent implements OnInit {
  user$?: Observable<LoggedinUser>;
  teams$?: Observable<Team[]>;

  constructor(
    @Inject(VERSION_INFO)
    public versionInfo: {
      beta: boolean;
      version: string;
    },
    private authenticateService: AuthenticateService,
    private apollo: Apollo
  ) {}

  ngOnInit() {
    this.user$ = this.authenticateService.user$;
    this.teams$ = this.user$.pipe(
      filter((user) => user.loggedIn),
      filter((user) => !!user.id),
      switchMap((user) =>
        this.apollo
          .query<{ player: { teams: Partial<Team>[] } }>({
            query: gql`
              query ClubsAndTeams($playerId: ID!) {
                player(id: $playerId) {
                  id
                  teams {
                    id
                    clubId
                  }
                }
              }
            `,
            variables: {
              playerId: user.id,
            },
          })
          .pipe(
            map((result) => result.data.player.teams?.map((t) => new Team(t)))
          )
      )
    );
  }
}
