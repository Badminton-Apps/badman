import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  AbstractControlOptions,
  FormControl,
  FormGroup,
  ValidatorFn,
} from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { DocumentNode, FragmentDefinitionNode } from 'graphql';
import {
  debounceTime,
  filter,
  lastValueFrom,
  map,
  Observable,
  switchMap,
  tap,
} from 'rxjs';
import { Player } from '@badman/frontend-models';
import { PlayerService } from '../../../services';

@Component({
  selector: 'badman-select-player',
  templateUrl: './select-player.component.html',
  styleUrls: ['./select-player.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectPlayerComponent implements OnInit, OnDestroy {
  @Input()
  label?: string;

  @Input()
  controlName = 'player';

  @Input()
  formGroup!: FormGroup;

  @Input()
  dependsOn?: string;

  @Input()
  validators?: ValidatorFn | ValidatorFn[] | AbstractControlOptions | null;

  formControl!: FormControl;
  filteredOptions$!: Observable<Player[]>;

  /**
   * Extra where queries for the player
   */
  @Input()
  where?: { [key: string]: unknown };

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
  @Input()
  fragment?: DocumentNode;

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
    if (!this.formGroup) {
      throw Error(`FormGroup is required`);
    }

    if (this.formGroup.get(this.controlName) === null) {
      this.formControl = new FormControl(null, this.validators);
      this.formGroup.addControl(this.controlName, this.formControl);
    } else {
      this.formControl = this.formGroup.get(this.controlName) as FormControl;
    }

    if (this.dependsOn) {
      const previous = this.formGroup.get(this.dependsOn);
      if (!previous) {
        console.error(`Dependency ${this.dependsOn} not found`, previous);
        throw Error(`Dependency ${this.dependsOn} not found`);
      }
    }

    this.setQuery();

    this.loadInitialPlayer().then(() => {
      this.filteredOptions$ = this.formControl.valueChanges.pipe(
        filter((x) => !!x),
        filter((x) => typeof x === 'string'),
        filter((x) => x?.length > 3),
        debounceTime(600),
        switchMap((query) => {
          this.where = {
            ...this.where,
            ...PlayerService.playerSearchWhere({ query }),
          };

          return this.apollo.query<{ players: { rows: Player[] } }>({
            query: this.query,
            variables: {
              where: this.where,
            },
          });
        }),
        // Distinct by id
        map((result) =>
          result?.data?.players?.rows?.filter(
            (value, index, self) =>
              self.findIndex((m) => m.id === value.id) === index
          )
        ),
        map((players) => players?.map((p) => new Player(p)))
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
          })
        );
        this.formControl.setValue(new Player(player?.data?.players?.rows[0]));
      } else if (this.formControl.value instanceof Player) {
        this.formControl.setValue(this.formControl.value);
      }
    }
  }

  ngOnDestroy() {
    this.formGroup.removeControl(this.controlName);
  }

  @Input()
  displayFn(user: Player): string {
    return user && user.fullName;
  }

  private setQuery() {
    const names = this.fragment?.definitions?.map((d) => {
      if (d.kind === 'FragmentDefinition') {
        return (d as FragmentDefinitionNode).name.value;
      }
      return;
    });

    if (names) {
      this.query = gql`
        ${this.defaultUserInfoFragment}
        ${this.fragment}
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
}
