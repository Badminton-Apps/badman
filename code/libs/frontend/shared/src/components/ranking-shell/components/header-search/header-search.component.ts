import { Component, Input, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { merge, Observable, ReplaySubject } from 'rxjs';
import {
  debounceTime,
  filter,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';
import {
  Club,
  EventCompetition,
  Player,
  EventTournament,
} from '@badman/frontend-models';

@Component({
  selector: 'badman-header-search',
  templateUrl: './header-search.component.html',
  styleUrls: ['./header-search.component.scss'],
})
export class HeaderSearchComponent implements OnInit {
  @Input()
  label = 'search.placeholder';

  formControl!: FormControl;
  filteredOptions$!: Observable<
    ((Player | Club | EventCompetition | EventTournament) & {
      __typename: string;
    })[]
  >;
  clear$: ReplaySubject<
    ((Player | Club | EventCompetition | EventTournament) & {
      __typename: string;
    })[]
  > = new ReplaySubject(0);

  constructor(private apollo: Apollo, private router: Router) {}

  ngOnInit() {
    this.formControl = new FormControl();
    const search$ = this.formControl.valueChanges.pipe(
      startWith(''),
      filter((x) => !!x),
      filter((x) => typeof x === 'string'),
      filter((x) => x?.length > 1),
      debounceTime(600),
      switchMap((query) =>
        this.apollo.query<{
          search: (Player | Club | EventCompetition | EventTournament)[];
        }>({
          query: gql`
            query Search($query: String!) {
              search(query: $query) {
                ... on Club {
                  id
                  name
                  slug
                  abbreviation
                }
                ... on EventTournament {
                  id
                  name
                  slug
                }
                ... on EventCompetition {
                  id
                  name
                  slug
                }
                ... on Player {
                  id
                  fullName
                  memberId
                  slug
                }
              }
            }
          `,
          variables: { query },
        })
      ),
      // Distinct by id
      map((result) =>
        result?.data?.search?.filter(
          (value, index, self) =>
            self.findIndex((m) => m?.id === value?.id) === index
        )
      )
    );

    this.filteredOptions$ = merge(search$, this.clear$) as Observable<
      ((Player | Club | EventCompetition | EventTournament) & {
        __typename: string;
      })[]
    >;
  }

  selectedPlayer(event: MatAutocompleteSelectedEvent) {
    this.formControl.setValue(null);
    switch (event.option.value.__typename) {
      case 'Player':
        this.router.navigate(['/player', event.option.value.slug]);
        break;
      case 'EventCompetition':
        this.router.navigate(['/competition', event.option.value.slug]);
        break;
      case 'EventTournament':
        this.router.navigate(['/tournament', event.option.value.slug]);
        break;
      case 'Club':
        this.router.navigate(['/club', event.option.value.slug]);
        break;
    }
  }
}
