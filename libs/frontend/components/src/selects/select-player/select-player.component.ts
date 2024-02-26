import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnInit, input } from '@angular/core';
import {
  AbstractControlOptions,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidatorFn,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Player } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { DocumentNode, FragmentDefinitionNode } from 'graphql';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { Observable, debounceTime, filter, lastValueFrom, map, switchMap, takeUntil } from 'rxjs';

@Component({
  selector: 'badman-select-player',
  templateUrl: './select-player.component.html',
  styleUrls: ['./select-player.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatSelectModule,
  ],
})
export class SelectPlayerComponent implements OnInit {
  private destroy$ = injectDestroy();

  label = input<string | undefined>();

  controlName = input('player');

  formGroup = input.required<FormGroup>();

  dependsOn = input<string>();

  validators = input<ValidatorFn | ValidatorFn[] | AbstractControlOptions | null | undefined>();

  formControl!: FormControl;
  filteredOptions$!: Observable<Player[]>;

  /**
   * Extra where queries for the player
   */
  where = input<{
    [key: string]: unknown;
  }>({});

  /**
   * Allows to extend the query with a fragemnt, the root must be of type Player
   *
   * ```typescript
   *  fragment AddGameInfo on Player {
   *     club {
   *       id
   *       name
   *     }
   *   }
   * ```
   */
  fragment = input<DocumentNode | undefined>();

  query!: DocumentNode;
  defaultUserInfoFragment = gql`
    fragment PlayerInfo on Player {
      id
      fullName
      memberId
    }
  `;

  constructor(private apollo: Apollo) {}

  ngOnInit(): void {
    if (!this.formGroup()) {
      throw Error(`FormGroup is required`);
    }

    if (this.formGroup().get(this.controlName()) === null) {
      this.formControl = new FormControl(null, this.validators());
      this.formGroup().addControl(this.controlName(), this.formControl);
    } else {
      this.formControl = this.formGroup().get(this.controlName()) as FormControl;
    }

    if (this.dependsOn() != undefined) {
      const previous = this.formGroup().get(this.dependsOn() ?? '');
      if (!previous) {
        console.error(`Dependency ${this.dependsOn()} not found`, previous);
        throw Error(`Dependency ${this.dependsOn()} not found`);
      }
    }

    this.setQuery();

    this.loadInitialPlayer().then(() => {
      this.filteredOptions$ = this.formControl.valueChanges.pipe(
        takeUntil(this.destroy$),
        filter((x) => !!x),
        filter((x) => typeof x === 'string'),
        filter((x) => x?.length > 3),
        debounceTime(600),
        switchMap((query) => {
          return this.apollo.query<{ players: { rows: Player[] } }>({
            query: this.query,
            variables: {
              where: {
                ...this.where(),
                ...this._playerSearchWhere({ query }),
              },
            },
          });
        }),
        // Distinct by id
        map((result) =>
          result?.data?.players?.rows?.filter(
            (value, index, self) => self.findIndex((m) => m.id === value.id) === index,
          ),
        ),
        map((players) => players?.map((p) => new Player(p))),
      );
    });
  }

  private async loadInitialPlayer() {
    if (this.formControl.value) {
      if (typeof this.formControl.value === 'string') {
        const player = await lastValueFrom(
          this.apollo.query<{ players: { rows: Player[] } }>({
            query: this.query,
            variables: {
              where: { id: this.formControl.value },
            },
          }),
        );
        this.formControl.setValue(new Player(player?.data?.players?.rows[0]));
      } else if (this.formControl.value instanceof Player) {
        this.formControl.setValue(this.formControl.value);
      }
    }
  }

  @Input()
  displayFn(user: Player): string {
    return user && user.fullName;
  }

  private setQuery() {
    const names = this.fragment()?.definitions?.map((d) => {
      if (d.kind === 'FragmentDefinition') {
        return (d as FragmentDefinitionNode).name.value;
      }
      return;
    });

    if (names) {
      this.query = gql`
        ${this.defaultUserInfoFragment}
        ${this.fragment()}
        query Players($where: JSONObject) {
          players(where: $where) {
            rows {
              ...PlayerInfo
              ...${names.join('\n...')}
            }
          }
        }
      `;
    } else {
      this.query = gql`
        ${this.defaultUserInfoFragment}
        query Players($where: JSONObject) {
          players(where: $where) {
            row {
              ...PlayerInfo
            }
          }
        }
      `;
    }
  }

  private _playerSearchWhere(args?: { query?: string; where?: { [key: string]: unknown } }) {
    const parts = args?.query
      ?.toLowerCase()
      .replace(/[;\\\\/:*?"<>|&',]/, ' ')
      .split(' ');
    const queries: unknown[] = [];
    if (!parts) {
      return;
    }
    for (const part of parts) {
      queries.push({
        $or: [
          { firstName: { $iLike: `%${part}%` } },
          { lastName: { $iLike: `%${part}%` } },
          { memberId: { $iLike: `%${part}%` } },
        ],
      });
    }

    return {
      $and: queries,
      ...args?.where,
    };
  }
}
