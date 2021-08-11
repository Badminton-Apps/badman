import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup } from '@angular/forms';
import { Availability, Comment, CompetitionEncounter, EncounterChange, EncounterChangeDate } from 'app/_shared';
import { EncounterService } from 'app/_shared/services/encounter/encounter.service';
import { iif, Observable, of } from 'rxjs';
import { filter, switchMap, tap } from 'rxjs/operators';
import * as moment from 'moment';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

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

  formGroupRequest: FormGroup;
  previous: AbstractControl;
  dateControls = new FormArray([]);

  encounter: CompetitionEncounter;
  home: boolean;
  running: boolean = false;

  requests$: Observable<EncounterChange>;
  @ViewChild('confirm', { static: true }) confirmDialog: TemplateRef<any>;

  constructor(
    private _encounterService: EncounterService,
    private _dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private _cd: ChangeDetectorRef,
    private _translate: TranslateService
  ) {}

  async ngOnInit() {
    this.previous = this.formGroup.get(this.dependsOn);

    if (this.previous) {
      this.requests$ = this.previous.valueChanges.pipe(
        tap((encounter) => {
          this.encounter = encounter;
          this.running = false;

          if (encounter == null) {
            this._cd.detectChanges();
          } else {
            this.home = this.formGroup.get('team').value?.id == encounter?.home?.id;
          }
        }),
        filter((value) => value !== null),
        switchMap((encounter: CompetitionEncounter) =>
          iif(
            () => encounter?.encounterChange?.id != null,
            this._encounterService.getRequests(encounter.encounterChange?.id),
            of(new EncounterChange())
          )
        ),
        tap((encounterChange) => {
          this.dateControls = new FormArray([]);

          const homeComment = new FormControl(encounterChange?.homeComment?.message);
          const awayComment = new FormControl(encounterChange?.awayComment?.message);

          if (this.home) {
            awayComment.disable();
          } else {
            homeComment.disable();
          }

          this.formGroupRequest = new FormGroup({
            id: new FormControl(encounterChange?.id),
            dates: this.dateControls,
            homeComment,
            awayComment,
          });

          encounterChange?.dates.map((r) => this._addDateControl(r));
          // Set initial
          this._updateSelected();

          // Add subscription
          this.dateControls.valueChanges.subscribe(() => this._updateSelected());
        })
      );
    } else {
      console.warn(`Dependency ${this.dependsOn} not found`, this.previous);
    }
  }

  addDate() {
    var lastDate = this.encounter.date;
    var dates = this.dateControls.value;
    if (dates && dates.length > 0) {
      lastDate = dates.sort((a, b) => b.date.getTime() - a.date.getTime())[0].date;
    }

    const newDate = new EncounterChangeDate({
      date: moment(lastDate).add(1, 'week').toDate(),
    });

    if (this.home) {
      newDate.availabilityHome = Availability.POSSIBLE;
    } else {
      newDate.availabilityAway = Availability.POSSIBLE;
    }

    this._addDateControl(newDate);
  }

  async save() {
    if (this.running) {
      return;
    }
    this.running = true;
    const change = new EncounterChange();
    change.encounter = this.encounter;
    change.homeComment = new Comment({ message: this.formGroupRequest.get('homeComment')?.value });
    change.awayComment = new Comment({ message: this.formGroupRequest.get('awayComment')?.value });
    const dates: EncounterChangeDate[] = this.formGroupRequest.get('dates')?.value?.map(
      (d) =>
        new EncounterChangeDate({
          availabilityAway: d?.availabilityAway,
          availabilityHome: d?.availabilityHome,
          selected: d?.selected,
          date: d?.date,
        })
    );
    const ids = dates.map((o) => o.date.getTime());
    change.dates = dates.filter(({ date }, index) => !ids.includes(date.getTime(), index + 1));
    change.accepted = change.dates.some((r) => r.selected == true);

    if (!change.dates || change.dates.length == 0) {
      this._snackBar.open('Please select at least one date.', 'OK', { duration: 4000 });
      this.running = false;
      return;
    }

    const success = async () => {
      try {
        await this._encounterService.addEncounterChange(change, this.home).toPromise();
        const teamControl = this.formGroup.get('team');
        teamControl.setValue(teamControl.value);
        this.formGroup.get(this.dependsOn).setValue(null);
        this._snackBar.open(await this._translate.instant('competition.change-encounter.requested'), 'OK', {
          duration: 4000,
        });
      } catch (error) {
        console.error(error);
        this._snackBar.open(await this._translate.instant('competition.change-encounter.requested-failed'), 'OK', {
          duration: 4000,
        });
      } finally {
        this.running = false;
        this._cd.detectChanges();
      }
    };

    if (change.accepted) {
      const dialog = this._dialog.open(this.confirmDialog);
      dialog.afterClosed().subscribe(async (confirmed) => {
        if (confirmed) {
          await success();
        }
      });
    } else {
      await success();
    }
  }

  private _updateSelected() {
    const selected = this.dateControls.getRawValue().find((r) => r.selected == true);

    for (const control of this.dateControls.controls) {
      control.get('selected').disable({ emitEvent: false });

      if (
        (selected == null || selected?.date == control.get('date').value) &&
        control.get('availabilityHome').value == Availability.POSSIBLE &&
        control.get('availabilityAway').value == Availability.POSSIBLE
      ) {
        control.get('selected').enable({ emitEvent: false });
      }
    }
  }

  private _addDateControl(dateChange: EncounterChangeDate) {
    const id = new FormControl(dateChange?.id);
    const availabilityHome = new FormControl(dateChange.availabilityHome);
    const availabilityAway = new FormControl(dateChange.availabilityAway);
    const selectedControl = new FormControl(false);

    if (this.home) {
      availabilityAway.disable();
    } else {
      availabilityHome.disable();
    }

    const dateControl = new FormGroup({
      id,
      date: new FormControl(dateChange.date),
      availabilityHome,
      availabilityAway,
      selected: selectedControl,
    });

    this.dateControls.push(dateControl);
  }
}
