import { AsyncPipe, isPlatformServer } from '@angular/common';
import { Component, PLATFORM_ID, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Apollo, gql } from 'apollo-angular';
import { EMPTY } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

@Component({
  selector: 'badman-test',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss'],
})
export class UserComponent {
  private readonly apollo = inject(Apollo);
  private readonly platformId = inject(PLATFORM_ID);

  someData$ = this.apollo
    .query<{
      me: {
        id: string;
        firstName: string;
        lastName: string;
      };
    }>({
      query: gql`
        query {
          me {
            id
            firstName
            lastName
          }
        }
      `,
      variables: {
        isServer: isPlatformServer(this.platformId),
      },
    })
    .pipe(
      tap((result) => console.log(result.networkStatus)),
      catchError((err) => {
        console.error(err);
        return EMPTY;
      }),
      map((result) => result.data.me),
    );

  data = toSignal(this.someData$);
}
