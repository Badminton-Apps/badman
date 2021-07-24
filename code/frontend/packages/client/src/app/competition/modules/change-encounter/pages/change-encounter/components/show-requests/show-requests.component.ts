import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { CompetitionEncounter, EncounterChange } from 'app/_shared';
import { EncounterService } from 'app/_shared/services/encounter/encounter.service';
import { iif, Observable, of } from 'rxjs';
import { filter, switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-show-requests',
  templateUrl: './show-requests.component.html',
  styleUrls: ['./show-requests.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowRequestsComponent implements OnInit {
  @Input()
  formGroup: FormGroup;

  @Input()
  dependsOn: string = 'encounter';

  requests$: Observable<EncounterChange>;

  constructor(private encounterService: EncounterService) {}

  async ngOnInit() {
    const previous = this.formGroup.get(this.dependsOn);

    if (previous) {
      this.requests$ = previous.valueChanges.pipe(
        filter((value) => value !== null),
        switchMap((encounter: CompetitionEncounter) =>
          iif(
            () => encounter.encounterChange?.id != null,
            this.encounterService.getRequests(encounter.encounterChange?.id),
            of(new EncounterChange())
          )
        )
      );
    } else {
      console.warn('Dependency not found', previous);
    }
  }
}
