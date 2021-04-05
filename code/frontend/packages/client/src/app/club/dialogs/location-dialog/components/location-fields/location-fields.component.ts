import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnInit,
  Input,
  Output,
} from '@angular/core';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { Club, Location } from 'app/_shared';
import { debounceTime, skip, tap } from 'rxjs/operators';
import PlaceResult = google.maps.places.PlaceResult;
import { Location as GmLocation } from '@angular-material-extensions/google-maps-autocomplete';

@Component({
  selector: 'app-location-fields',
  templateUrl: './location-fields.component.html',
  styleUrls: ['./location-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationFieldsComponent implements OnInit {
  @Input()
  location: Location = {} as Location;

  @Input()
  club: Club;

  @Output() onLocationUpdate = new EventEmitter<Location>();

  locationForm: FormGroup;
  adressForm: FormControl;

  ngOnInit() {
    const nameControl = new FormControl(
      this.location.name,
      Validators.required
    );

    const phoneControl = new FormControl(this.location.phone);
    const faxControl = new FormControl(this.location.fax);
    const addressControl = new FormControl(this.location.address);
    const cityControl = new FormControl(this.location.city);
    const postalcodeControl = new FormControl(this.location.postalcode);
    const stateControl = new FormControl(this.location.state);
    const streetControl = new FormControl(this.location.street);
    const streetNumberControl = new FormControl(this.location.streetNumber);

    this.locationForm = new FormGroup({
      name: nameControl,
      phone: phoneControl,
      fax: faxControl,
      address: addressControl,
      city: cityControl,
      postalcode: postalcodeControl,
      state: stateControl,
      street: streetControl,
      streetNumber: streetNumberControl,
    });
    this.locationForm.valueChanges.pipe(debounceTime(600)).subscribe((e) => {
      if (this.locationForm.valid) {
        this.onLocationUpdate.next({ id: this.location?.id, ...e });
      }
    });

    this.adressForm = new FormControl({
      streetName: this.location.street,
      streetNumber: this.location.streetNumber,
      postalCode: this.location.postalcode,
      locality: {
        long: this.location.city,
      },
    });

    this.adressForm.valueChanges.subscribe((r) => {
      this.locationForm.patchValue({
        ...this.locationForm.value,
        name: r.name,
        city: r.sublocality,
        address: r.displayAddress,
        postalcode: r.postalCode,
        state: r.state?.long,
        street: r.streetName,
        streetNumber: r.streetNumber,
      });
    });
  }
}
