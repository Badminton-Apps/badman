import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { merge, Observable, ReplaySubject } from 'rxjs';
import {
  debounceTime,
  filter,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';

type SearchType = { id: string; name: string; slug: string };

@Component({
  selector: 'badman-search-box',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,

    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
  ],
  templateUrl: './search-box.component.html',
  styleUrls: ['./search-box.component.scss'],
})
export class SearchBoxComponent implements OnInit {
  @Input()
  label = 'all.search.placeholder';

  formControl!: FormControl;
  filteredOptions$!: Observable<
    (SearchType & {
      __typename: string;
    })[]
  >;
  clear$: ReplaySubject<
    (SearchType & {
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
          search: SearchType[];
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
      (SearchType & {
        __typename: string;
      })[]
    >;
  }

  selectedPlayer(event: MatAutocompleteSelectedEvent) {
    this.formControl.setValue(null);
    this.clear$.next([]);

    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.router.onSameUrlNavigation = 'reload';
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
