import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Input, Output } from '@angular/core';
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
    const nameControl = new FormControl(this.location.name, Validators.required);

    const addressControl = new FormControl(this.location.address);
    const phoneControl = new FormControl(this.location.phone);
    const faxControl = new FormControl(this.location.fax);
    const cityControl = new FormControl(this.location.city);
    const postalcodeControl = new FormControl(this.location.postalcode);
    const stateControl = new FormControl(this.location.state);
    const streetControl = new FormControl(this.location.street);
    const streetNumberControl = new FormControl(this.location.streetNumber);

    this.locationForm = new FormGroup({
      address: addressControl,
      name: nameControl,
      phone: phoneControl,
      fax: faxControl,
      city: cityControl,
      postalcode: postalcodeControl,
      state: stateControl,
      street: streetControl,
      streetNumber: streetNumberControl,
    });
    this.locationForm.valueChanges.pipe(debounceTime(600)).subscribe((e) => {
    if (!this.location?.id) {
        if (this.locationForm.valid) {
          this.onLocationUpdate.next({ id: this.location?.id, ...e });
        }
      } else {
        // always update if valid id
        this.onLocationUpdate.next({ id: this.location?.id, ...e });
      }
    });
  }

  syncAutoComplete($event: google.maps.places.PlaceResult) {
    const city =
      $event.address_components.find((r) => r.types.includes('sublocality'))?.long_name ??
      $event.address_components.find((r) => r.types.includes('locality'))?.long_name;

    const postalcode = +$event.address_components.find((r) => r.types.includes('postal_code'))?.long_name;
    const state = $event.address_components.find((r) => r.types.includes('administrative_area_level_2'))?.long_name;
    const street = $event.address_components.find((r) => r.types.includes('route'))?.long_name;
    const streetNumber = $event.address_components.find((r) => r.types.includes('street_number'))?.long_name;

    this.locationForm.patchValue({
      address: this.locationForm.value.address,
      name: $event.name,
      city: city,
      postalcode: postalcode,
      state: state,
      street: street,
      streetNumber: streetNumber,
    });
  }
}
