import {
  Component,
  Injector,
  Input,
  OnInit,
  PLATFORM_ID,
  Signal,
  TransferState,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Apollo, gql } from 'apollo-angular';
import { MatDialog } from '@angular/material/dialog';
import { Team } from '@badman/frontend-models';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

@Component({
  selector: 'badman-competition-enrollments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './competition-enrollments.component.html',
  styleUrls: ['./competition-enrollments.component.scss'],
})
export class CompetitionEnrollmentsComponent implements OnInit {
  // injects
  apollo = inject(Apollo);
  injector = inject(Injector);
  stateTransfer = inject(TransferState);
  platformId = inject(PLATFORM_ID);
  dialog = inject(MatDialog);

  // signals
  teams?: Signal<Team[] | undefined>;

  // Inputs
  @Input({ required: true }) eventId?: string;
  @Input() season?: number;

  ngOnInit(): void {
    this._setTeams();
  }

  private _setTeams(): void {
    this.teams = toSignal(
      this.apollo
        .watchQuery<{ teams: Team[] }>({
          query: gql`
            query EventEntries($eventCompetitionId: ID!) {
              eventCompetition(id: $eventCompetitionId) {
                subEventCompetitions {
                  id
                }
              }
            }
          `,
          variables: {
            eventCompetitionId: this.eventId,
          },
        })
        .valueChanges.pipe(map((result) => result.data.teams))
    );
  }
}
