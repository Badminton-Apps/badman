import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, input, HostListener } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { DEVICE } from '@badman/frontend-utils';
import { TranslatePipe } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, ReplaySubject, merge } from 'rxjs';
import { debounceTime, filter, map, startWith, switchMap } from 'rxjs/operators';

type SearchType = { id: string; name: string; slug: string };

@Component({
    selector: 'badman-search-box',
    imports: [
        CommonModule,
        TranslatePipe,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatAutocompleteModule,
        ReactiveFormsModule,
    ],
    templateUrl: './search-box.component.html',
    styleUrls: ['./search-box.component.scss']
})
export class SearchBoxComponent implements OnInit {
  private readonly apollo = inject(Apollo);
  private readonly router = inject(Router);
  readonly isMobile = inject(DEVICE);

  label = input('all.search.placeholder');

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

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === 'k') {
      event.preventDefault();
      const inputElement = document.querySelector('input[type="text"]');
      if (inputElement) {
        (inputElement as HTMLElement).focus();
      }
    }
  }

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
          fetchPolicy: 'network-only',
          query: gql`
            query Search($query: String!) {
              search(query: $query) {
                ... on Club {
                  id
                  name
                  slug
                  clubId
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
        }),
      ),
      // Distinct by id
      map((result) =>
        result?.data?.search?.filter(
          (value, index, self) => self.findIndex((m) => m?.id === value?.id) === index,
        ),
      ),
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

    switch (event.option.value.__typename) {
      case 'Player':
        this._navigate(['/player', event.option.value.slug ?? event.option.value.id]);
        break;
      case 'EventCompetition':
        this._navigate(['/competition', event.option.value.slug ?? event.option.value.id]);
        break;
      case 'EventTournament':
        this._navigate(['/tournament', event.option.value.slug ?? event.option.value.id]);
        break;
      case 'Club':
        this._navigate(['/club', event.option.value.slug ?? event.option.value.id]);
        break;
    }
  }

  private _navigate(urlToNavigateTo: string[]) {
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(urlToNavigateTo);
    });
  }
}
