import { animate, AUTO_STYLE, state, style, transition, trigger } from '@angular/animations';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { CompetitionEncounter, EVENTS, Game, ListenTopic } from 'app/_shared';
import { lastValueFrom, map } from 'rxjs';
import { GAME_INFO } from '../../fragments';

const DEFAULT_DURATION = 300;

@Component({
  selector: 'app-competition-encounter',
  templateUrl: './competition-encounter.component.html',
  styleUrls: ['./competition-encounter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('collapse', [
      state('false', style({ height: AUTO_STYLE, visibility: AUTO_STYLE })),
      state('true', style({ height: '0', visibility: 'hidden' })),
      transition('false => true', animate(DEFAULT_DURATION + 'ms ease-in')),
      transition('true => false', animate(DEFAULT_DURATION + 'ms ease-out')),
    ]),

    trigger('icon-rotation', [
      state('false', style({ transform: 'rotate(180deg)' })),
      state('true', style({ transform: 'rotate(0)' })),
      transition('false => true', animate(DEFAULT_DURATION + 'ms ease-in')),
      transition('true => false', animate(DEFAULT_DURATION + 'ms ease-out')),
    ]),
  ],
})
export class CompetitionEncounterComponent {
  @Input() encounter!: CompetitionEncounter;

  collapsed = true;

  constructor(private apollo: Apollo, private changeDetect: ChangeDetectorRef) {}

  async toggleCollapse() {
    // If we are expanding, we need to fetch the full encounter (for 1 time)
    if (this.collapsed && (this.encounter.games?.length ?? 0) === 0) {
      this.encounter.games = await lastValueFrom(this._getFullEncounter());
      this.encounter.games?.sort((a, b) => a.order! - b.order!);
    }

    this.collapsed = !this.collapsed;
    this.changeDetect.detectChanges();
  }

  private _getFullEncounter() {
    return this.apollo
      .query<{ competitionEncounter: CompetitionEncounter }>({
        query: gql`
          ${GAME_INFO}
          query GetGamesEncoutner($competitionEncounterId: ID!) {
            competitionEncounter(id: $competitionEncounterId) {
              id
              games {
                ...GameInfo
              }
            }
          }
        `,
        variables: { competitionEncounterId: this.encounter.id },
      })
      .pipe(map((result) => result?.data?.competitionEncounter?.games?.map((game) => new Game(game))));
  }

}
