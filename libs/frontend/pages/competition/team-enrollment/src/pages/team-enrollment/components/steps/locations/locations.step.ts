import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from "@angular/core";
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { Location } from "@badman/frontend-models";
import { TranslatePipe } from "@ngx-translate/core";
import { take } from "rxjs/operators";
import { v4 as uuidv4 } from "uuid";
import { LOCATIONS } from "../../../../../forms";
import { TeamEnrollmentDataService } from "../../../service/team-enrollment.service";
import { LocationAvailibilityForm, LocationComponent, LocationForm } from "./components";

@Component({
  selector: "badman-locations-step",
  imports: [
    TranslatePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressBarModule,
    LocationComponent,
  ],
  templateUrl: "./locations.step.html",
  styleUrls: ["./locations.step.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationsStepComponent {
  private readonly dialog = inject(MatDialog);
  private readonly dataService = inject(TeamEnrollmentDataService);
  private readonly formBuilder = inject(FormBuilder);

  loaded = this.dataService.state.loadedLocations;

  formGroup = input.required<FormGroup>();
  locationForm = computed(() => this.formGroup().get(LOCATIONS) as FormArray<LocationForm>);

  club = this.dataService.state.club;

  constructor() {
    // set initial controls
    effect(() => {
      // get club
      const club = this.club();

      // wait for locations to be loaded, and also reload when anything changes
      if (!this.loaded() || !club?.id) {
        return;
      }

      // use the state but don't update effect when it changes
      untracked(() => {
        this.locationForm().clear();
        for (const location of club?.locations ?? []) {
          const group = this.formBuilder.group({
            id: this.formBuilder.control(location.id),
            name: this.formBuilder.control(location.name),
            address: this.formBuilder.control(location.address),
            street: this.formBuilder.control(location.street),
            streetNumber: this.formBuilder.control(location.streetNumber),
            postalcode: this.formBuilder.control(location.postalcode),
            city: this.formBuilder.control(location.city),
            state: this.formBuilder.control(location.state),
            phone: this.formBuilder.control(location.phone),
            fax: this.formBuilder.control(location.fax),
            availabilities: this.formBuilder.array([] as LocationAvailibilityForm[]),
          }) as LocationForm;

          const availabilities = location.availabilities ?? [{}];

          for (const availibilty of availabilities) {
            const availibyForm = this.formBuilder.group({
              id: this.formBuilder.control(availibilty?.id),
              season: this.formBuilder.control(availibilty?.season),
              days: this.formBuilder.array(
                availibilty?.days?.map((day) =>
                  this.formBuilder.group({
                    day: this.formBuilder.control(day.day),
                    startTime: this.formBuilder.control(day.startTime),
                    endTime: this.formBuilder.control(day.endTime),
                    courts: this.formBuilder.control(day.courts),
                  })
                ) ?? []
              ),
              exceptions: this.formBuilder.array(
                availibilty?.exceptions?.map((exception) =>
                  this.formBuilder.group({
                    start: this.formBuilder.control(exception.start),
                    end: this.formBuilder.control(exception.end),
                    courts: this.formBuilder.control(exception.courts),
                  })
                ) ?? []
              ),
            }) as LocationAvailibilityForm;

            (group.get("availabilities") as FormArray).push(availibyForm);
          }

          this.locationForm().push(group as LocationForm);
        }
      });
    });
  }

  addLocation() {
    import("@badman/frontend-club").then((m) => {
      const dialogRef = this.dialog.open(m.LocationDialogComponent, {
        data: {
          id: uuidv4(),
          club: this.club(),
          onCreate: "close",
          showavailabilities: false,
        },
        autoFocus: false,
      });

      dialogRef.afterClosed().subscribe((location?: Location) => {
        if (!location?.name) {
          return;
        }

        this.locationForm().push(
          this.formBuilder.group({
            id: this.formBuilder.control(location?.id),
            name: this.formBuilder.control(location?.name),
            address: this.formBuilder.control(location?.address),
            street: this.formBuilder.control(location?.street),
            streetNumber: this.formBuilder.control(location?.streetNumber),
            postalcode: this.formBuilder.control(location?.postalcode),
            city: this.formBuilder.control(location?.city),
            state: this.formBuilder.control(location?.state),
            phone: this.formBuilder.control(location?.phone),
            fax: this.formBuilder.control(location?.fax),
            availabilities: this.formBuilder.array([] as LocationAvailibilityForm[]),
          }) as LocationForm
        );
      });
    });
  }

  removeLocation(index: number) {
    this.locationForm().removeAt(index);
  }

  editLocation(index: number) {
    const control = this.locationForm().at(index) as FormGroup;

    import("@badman/frontend-club").then((m) => {
      const dialogRef = this.dialog.open(m.LocationDialogComponent, {
        data: {
          location: control.value,
          club: this.club(),
          onUpdate: "close",
          showavailabilities: false,
        },
        autoFocus: false,
      });

      dialogRef
        .afterClosed()
        .pipe(take(1))
        .subscribe((newLocation?: Location) => {
          control.patchValue({
            id: newLocation?.id,
            name: newLocation?.name,
            address: newLocation?.address,
            street: newLocation?.street,
            streetNumber: newLocation?.streetNumber,
            postalcode: newLocation?.postalcode,
            city: newLocation?.city,
            state: newLocation?.state,
            phone: newLocation?.phone,
            fax: newLocation?.fax,
          });
        });
    });
  }
}
