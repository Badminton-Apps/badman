import { Component, inject } from "@angular/core";
import { FormControl } from "@angular/forms";
import { Title } from "@angular/platform-browser";
import { TranslatePipe } from "@ngx-translate/core";
import { ClubViewComponent } from "./components";

@Component({
  templateUrl: "./team-enrollments.component.html",
  styleUrls: ["./team-enrollments.component.scss"],
  imports: [TranslatePipe, ClubViewComponent],
})
export class TeamEnrollmentsComponent {
  private _title = inject(Title);
  eventControl: FormControl = new FormControl();
  yearControl: FormControl = new FormControl();

  constructor() {
    this._title.setTitle("Team Enrollments");
  }
}
