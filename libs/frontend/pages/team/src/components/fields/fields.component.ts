import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, input } from "@angular/core";
import { FormGroup, FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatOptionModule } from "@angular/material/core";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { RouterModule } from "@angular/router";
import { HasClaimComponent, PlayerSearchComponent } from "@badman/frontend-components";
import { Location, Player, Role } from "@badman/frontend-models";
import { SubEventType } from "@badman/utils";
import { TranslatePipe } from "@ngx-translate/core";
import { Apollo, gql } from "apollo-angular";
import { Observable } from "rxjs";
import { map, startWith, switchMap } from "rxjs/operators";

@Component({
  selector: "badman-team-fields",
  templateUrl: "./fields.component.html",
  styleUrls: ["./fields.component.scss"],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslatePipe,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatOptionModule,
    HasClaimComponent,
    MatSelectModule,
    HasClaimComponent,
    PlayerSearchComponent,
    RouterModule,
  ],
})
export class TeamFieldComponent implements OnInit {
  private readonly apollo = inject(Apollo);

  teamNumbers = input<
    | {
        [key in SubEventType]: number[];
      }
    | undefined
  >();

  locations = input<Location[]>();

  options?: number[];

  group = input.required<FormGroup>();

  captainNotInRoles$?: Observable<boolean>;

  ngOnInit(): void {
    if (!this.group()) {
      throw new Error("No group provided");
    }

    this.group().get("teamNumber")?.disable();
    if (this.group().value.id) {
      this.group().get("type")?.disable();
    }

    this.group()
      .get("type")
      ?.valueChanges.pipe(startWith(this.group().get("type")?.value))
      .subscribe((type) => {
        if (!this.teamNumbers()) {
          return;
        }

        if (type) {
          const numbersForType = this.teamNumbers()?.[type as SubEventType] ?? [];

          if (numbersForType.length === 0) {
            this.group()?.get("teamNumber")?.setValue(1);
            this.group()?.get("teamNumber")?.enable();
            this.options = [1];
            return;
          }

          // find max number
          const max = Math.max(...numbersForType);

          // if the teamnumber is not set, set it to max + 1
          if (!this.group()?.get("teamNumber")?.value) {
            this.group()
              ?.get("teamNumber")
              ?.setValue(max + 1);
          }

          // options should be all up to max + 1
          this.options = Array.from({ length: max + 1 }, (_, i) => i + 1);

          this.group()?.get("teamNumber")?.enable();
        }
      });

    this.captainNotInRoles$ = this.group().controls["captainId"].valueChanges.pipe(
      startWith(this.group().controls["captainId"].value),
      switchMap(() =>
        this.apollo.query<{
          roles: {
            id: string;
            name: string;
            players: Player[];
          }[];
        }>({
          query: gql`
            query GetClubRoles($where: JSONObject) {
              roles(where: $where) {
                id
                name
                players {
                  slug
                  id
                  firstName
                  lastName
                }
              }
            }
          `,
          variables: {
            where: {
              name: "Team captains",
              linkId: this.group()?.get("clubId")?.value,
              linkType: "club",
            },
          },
        })
      ),
      map((result) => result.data.roles?.map((role) => new Role(role))),
      map((roles) => {
        if (!roles) {
          return true;
        }

        return !roles.some((role) =>
          role.players?.some((player) => player.id === this.group()?.get("captainId")?.value)
        );
      })
    );
  }

  async onCaptainSelect(player: Partial<Player>) {
    this.group()?.patchValue({
      captainId: player.id,
      email: player.email,
      phone: player.phone,
    });
  }
}
